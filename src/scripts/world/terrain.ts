/* §0.2 — the landscape, and this is the step that decides whether any of
   this works.

   §16–§20 built a terrain that was correct, measured and boring: five
   Gaussians on a disc carried with the camera, radius 42, seen from a fixed
   descent. This is the other thing entirely. The field is in `height.ts`,
   the sampling is in `chunk.ts`, the vertex layout is in `grid.ts`, and
   what is left here is the part that needs a GPU: which squares of ground
   exist at what resolution, when they are asked for, when they are let go,
   and how they are lit.

   ── Why a quadtree and not concentric rings ────────────────────────────
   §22 offers both. Rings are cheaper — one ring of twelve chunks covers
   what forty-six quadtree leaves do — and they do not work, for a reason
   that is worth writing down because it is not obvious until it is
   arithmetic. A ring hierarchy needs level L's block to exactly fill the
   hole in level L+1's, which means each level's origin has to be a multiple
   of the next level's chunk size; propagate that down four levels and the
   finest level can only re-centre every 32 chunks. Every published
   implementation absorbs the leftover with L-shaped trim strips. A quadtree
   has no alignment condition at all — children tile their parent by
   construction — and its leaves are keyed by their own coordinates, so a
   chunk is generated once and never invalidated by anything a neighbour
   does.

   The cost of a leaf is a draw call, and frustum culling takes most of them
   back: a chunk is a bounded square whose height range the worker already
   knows, so it gets a bounding sphere without a read-back. Measured at the
   opening pose: 160 chunks alive, 154 of them the current leaf set, 43
   actually drawn.

   ── The light, since §23 ───────────────────────────────────────────────
   §22 left a two-stop ramp here as a stand-in — enough to read the shape of
   the ground and not a look. What replaces it is the whole of §0.2's
   shading model: three bands with a hard terminator, a rim in --leader, a
   shadow the worker marched against the field, and a fog that arrives at
   the sky rather than at --void. §24's altitude clamp reads `height()` on
   the main thread exactly as the LOD criterion below already does — two
   callers, one field, and neither of them a copy of it. */

import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicNodeMaterial,
  Sphere,
  Vector3,
  type Camera,
} from 'three/webgpu';
import { attribute, cameraPosition, float, fwidth, mix, normalWorld, positionWorld, smoothstep, vec3 } from 'three/tsl';
import { fog } from './fog';
import { height } from './height';
import { SEG, VERTEX_COUNT, buildIndices, type ChunkSpec } from './grid';
import type { ChunkData } from './chunk';
import type { Palette } from './palette';
import { gradient } from './sky';
import { SUN } from './sun';

/* ── The LOD, in five numbers ───────────────────────────────────────────
   Chunk sizes are 96, 192, 384 and 768 units, each with SEG quads a side,
   so sample spacing runs 2, 4, 8, 16. A 5x5 block of the coarsest is what
   floats around the camera, which puts ground under every direction out to
   at least 1,536 units — past where the fog has taken it to --void, which
   is the only distance that matters.

   SPLIT is the whole quality/cost dial: a cell subdivides while the camera
   is within SPLIT of its own width. At 1.5 the lowest of the three measured
   stops is 154 leaves and 769k triangles, of which 56 draw calls and 286k
   triangles survive the frustum. Below about 2, two adjacent leaves can
   differ by more than one level — a problem for stitching and not for
   skirts, which is half of why `grid.ts` uses skirts. */
const BASE = 96;
const LEVELS = 4;
const SPLIT = 1.5;
const ROOTS = 5;

/* Deep enough to cover the height two levels disagree by, which is the
   amplitude of the octaves the coarser one dropped and is therefore
   proportional to its spacing. Capped, because at the coarsest level three
   spacings is 48 units of apron to cover about ten. */
const SKIRT = 3;
const SKIRT_MAX = 24;

/* A chunk that has stopped being wanted is kept this long before it is
   disposed. It is not a cache: it is what stands in for its own children
   while they are being generated, so the ground never has a hole in it
   where the camera is heading. */
const RETIRE = 4000;

/* ── The bands ──────────────────────────────────────────────────────────
   §0.2: "a slope lit at 0.6 and one lit at 0.45 land in the same band, so
   terrain reads as broad shapes with hard edges rather than as gradients."
   Two edges, three bands: --rule below TERMINATOR, --dim between, --paper
   above LIT. **Both are above flat ground**, which is the placement three
   others were measured against. At the sun's 32° a level surface is at
   `N·L` 0.52, so open country is --rule and it takes 14° of tilt toward the
   light to reach --dim and 38° to reach --paper: the landscape is night,
   and what the light finds is the slopes that face it. An edge *at* 0.52
   turns the detail layer into two-tone camouflage, and putting flat ground
   in the middle band instead paints the whole foreground --dim and leaves
   no relief in it at all.

   Nothing here is smoothstepped over a fixed width. The edges are one
   *pixel* wide, taken from `fwidth` of the lighting term, which is the only
   way a hard edge stays hard at the far ridge and stays un-aliased at the
   near one: a fixed width in lighting units is a fat gradient on a slope
   facing the camera and a stair-stepped line on one at a grazing angle. */
const TERMINATOR = 0.64;
const LIT = 0.90;
const EDGE = 0.8;
const RAMP = 0.30;

/* A quarter-band under the terminator for ground the marched shadow says is
   occluded, so a shadowed slope that would have been lit is not merely the
   same colour as one that faces away — it is darker than either. --void is
   the floor of the world and the shadow band leans toward it. */
const CAST = 0.45;

/* ── The rim ────────────────────────────────────────────────────────────
   §0.2 calls this the single most important part of the look, and it is the
   part that is not a lighting model: a rim in --leader on every crest, so a
   banded landscape is a set of shapes with edges rather than a set of flat
   regions. Two terms multiplied.

   **Grazing**, because a crest seen from anywhere is a surface turning away
   from the eye — the fresnel term is what finds ridgelines without knowing
   where they are. RIM_IN is 0.60, which is 53° off square, so it is an
   edge rather than a sheen on every slope.

   **Backlit**, because a rim is light coming past the far side. It peaks at
   the terminator and fades into the lit band, which is what puts the line
   exactly where the shape turns over rather than everywhere it is dark. */
const RIM_IN = 0.60;
const RIM_OUT = 0.96;
const RIM_BACK = 0.64;
const RIM = 0.85;

/* What the rim keeps through fog. A rim that fogs like the surface it is on
   is gone by 600 units and §0.2 asks for ridgelines legible *at distance*,
   which is the one thing this whole term exists for; a rim that ignores fog
   is a violet horizon of floating lines. A third of it survives, so a range
   at 900 units still has its top edge drawn. */
const RIM_FLOOR = 0.34;

/* How much of the sky the ground fades into. Not all of it: a range at
   twelve hundred units is *darker* than the sky behind it, on any night
   anybody has stood outside on, and fading the ground the whole way to the
   horizon band takes the last two ranges of depth out of the frame — it
   was measured as a violet wash with a rim light in it. At 0.75 the far
   ground still arrives at the sky's own colour rather than at --void (§22's
   bug), and the horizon is a soft dark line under a lit band rather than a
   hard one under nothing. */
const HAZE = 0.75;

type Chunk = {
  key: string;
  level: number;
  ix: number;
  iz: number;
  size: number;
  mesh: Mesh | null;
  requested: boolean;
  idle: number;
};

const keyOf = (level: number, ix: number, iz: number) => `${level}:${ix}:${iz}`;

export function buildTerrain(palette: Palette) {
  const group = new Group();
  const indices = buildIndices();

  const material = new MeshBasicNodeMaterial();

  /* Lit by hand rather than through a lighting model, and at §23 that is
     no longer only a bundle argument. A quantised N·L with a baked cast
     shadow is not something a light node computes and then gets banded —
     the banding *is* the model, and every term below feeds the same scalar
     that the two edges cut. BasicNodeLibrary stays (§21). */
  const sun = vec3(SUN.x, SUN.y, SUN.z);
  const facing = normalWorld.dot(sun);
  const cast = attribute<'float'>('shadow', 'float');
  const lum = facing.max(0).mul(mix(float(1).sub(CAST), 1, cast));

  /* One pixel of edge, wherever the edge lands. */
  const edge = fwidth(lum).mul(EDGE).max(0.001);
  const step = (at: number) => smoothstep(float(at).sub(edge), float(at).add(edge), lum);
  /* Each band leans a little toward the next one across its own width.
     Bands alone make every region of open country a single flat fill, and a
     foreground that is one colour is not reading as a broad shape — it is
     not reading at all. RAMP is how far into the next token a band gets by
     its own top edge: at 0.25 the terraces keep three quarters of their
     step and the ground inside one has a gradient across it.

     Confined to the band on purpose. The first attempt mixed the whole
     smooth ramp back in under the bands, and because flat ground sits high
     inside the shadow band that pulled the entire foreground most of the
     way to --dim — the flat lavender wash the band placement above exists
     to avoid. */
  const inside = (from: number, to: number) => smoothstep(from, to, lum).mul(RAMP);
  const surface = mix(
    mix(
      mix(palette.rule, palette.dim, inside(0, TERMINATOR)),
      mix(palette.dim, palette.paper, inside(TERMINATOR, LIT)),
      step(TERMINATOR),
    ),
    mix(palette.paper, palette.lead, inside(LIT, 1)),
    step(LIT),
  );

  const toEye = cameraPosition.sub(positionWorld).normalize();
  const grazing = float(1).sub(normalWorld.dot(toEye).max(0));
  const backlit = smoothstep(RIM_BACK, 0, facing);
  const rim = smoothstep(RIM_IN, RIM_OUT, grazing).mul(backlit).mul(RIM);

  /* Fog on an opaque surface is a mix toward the sky, not the multiply the
     additive layers use — and **not toward --void**, which is what §22 did.
     A ridge at 1,200 units has to arrive at the colour of the sky directly
     behind it or the horizon band the sky draws is a line the ground is cut
     out of. Same direction the sky dome shades by, so the two agree at
     every pixel of the join. */
  const depth = fog(positionWorld);
  const haze = mix(palette.void, gradient(toEye.negate(), palette), HAZE);
  const lit = mix(haze, surface, depth);
  material.colorNode = mix(lit, palette.lead, rim.mul(depth.max(RIM_FLOOR)));

  const chunks = new Map<string, Chunk>();
  const wanted = new Map<string, Chunk>();
  const shown = new Set<string>();
  let holes = 0;
  let worstHoles = 0;

  /* ── The workers ─────────────────────────────────────────────────────
     One fewer than the machine has, capped at three: past that the queue is
     never the thing that is behind. */
  const size = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 4) - 1));
  const workers: Worker[] = [];
  const busy: (string | null)[] = [];
  for (let i = 0; i < size; i++) {
    const worker = new Worker(new URL('./terrain-worker.ts', import.meta.url), { type: 'module' });
    const slot = i;
    worker.onmessage = (event: MessageEvent<ChunkData & { key: string; ms: number }>) => {
      busy[slot] = null;
      receive(event.data);
    };
    workers.push(worker);
    busy.push(null);
  }

  const stats = {
    alive: 0,
    pending: 0,
    generated: 0,
    genMs: 0,
    genWorst: 0,
    attachMs: 0,
    attachWorst: 0,
    holes: 0,
    worstHoles: 0,
  };

  function receive(data: ChunkData & { key: string; ms: number }) {
    stats.generated++;
    stats.genMs += data.ms;
    stats.genWorst = Math.max(stats.genWorst, data.ms);

    const chunk = chunks.get(data.key);
    if (!chunk) return;
    chunk.requested = false;

    const started = performance.now();
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(data.position, 3));
    geometry.setAttribute('normal', new BufferAttribute(data.normal, 3));
    geometry.setAttribute('shadow', new BufferAttribute(data.shadow, 1));
    // Its own copy — see grid.ts on why this is not one shared buffer.
    geometry.setIndex(new BufferAttribute(indices.slice(), 1));
    /* Set rather than computed. computeBoundingSphere reads the whole
       position buffer back on the main thread, and the worker already knows
       the only part of it that is not a constant. */
    const half = chunk.size / 2;
    geometry.boundingSphere = new Sphere(
      new Vector3(half, (data.min + data.max) / 2, half),
      Math.hypot(half, half, (data.max - data.min) / 2),
    );

    const mesh = new Mesh(geometry, material);
    mesh.position.set(chunk.ix * chunk.size, 0, chunk.iz * chunk.size);
    mesh.visible = false;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    chunk.mesh = mesh;
    group.add(mesh);

    const ms = performance.now() - started;
    stats.attachMs += ms;
    stats.attachWorst = Math.max(stats.attachWorst, ms);
  }

  function retire(chunk: Chunk) {
    if (chunk.mesh) {
      group.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
    }
    chunks.delete(chunk.key);
  }

  function ensure(level: number, ix: number, iz: number): Chunk {
    const k = keyOf(level, ix, iz);
    let chunk = chunks.get(k);
    if (!chunk) {
      chunk = { key: k, level, ix, iz, size: BASE * 2 ** level, mesh: null, requested: false, idle: 0 };
      chunks.set(k, chunk);
    }
    chunk.idle = 0;
    return chunk;
  }

  /* ── Which squares exist ─────────────────────────────────────────────
     Distance is to the cell's own rectangle, in three dimensions, with the
     vertical leg measured from the ground under the camera rather than from
     zero. Measured from zero, the opening pose at 190 over ground at -6 is
     190 away from everything, the finest level needs 144, and it never
     appears at all — the criterion has to be about how far away the *ground*
     is, and the only honest answer to that is the height field. It is the
     one place in this file the main thread samples it; §24's clamp is the
     other caller and samples the same function the same way. */
  function collect(cx: number, cy: number, cz: number) {
    wanted.clear();
    const dy = Math.max(cy - height(cx, cz), 0);

    const walk = (level: number, ix: number, iz: number) => {
      const size = BASE * 2 ** level;
      const x = ix * size;
      const z = iz * size;
      const dx = Math.max(x - cx, cx - (x + size), 0);
      const dz = Math.max(z - cz, cz - (z + size), 0);
      if (level > 0 && Math.hypot(dx, dz, dy) < SPLIT * size) {
        for (let j = 0; j < 2; j++) {
          for (let i = 0; i < 2; i++) walk(level - 1, ix * 2 + i, iz * 2 + j);
        }
        return;
      }
      const chunk = ensure(level, ix, iz);
      wanted.set(chunk.key, chunk);
    };

    const root = BASE * 2 ** (LEVELS - 1);
    const rx = Math.floor(cx / root);
    const rz = Math.floor(cz / root);
    const span = (ROOTS - 1) / 2;
    for (let j = -span; j <= span; j++) {
      for (let i = -span; i <= span; i++) walk(LEVELS - 1, rx + i, rz + j);
    }
  }

  const near = (chunk: Chunk, cx: number, cy: number, cz: number) => {
    const x = chunk.ix * chunk.size;
    const z = chunk.iz * chunk.size;
    return Math.hypot(
      Math.max(x - cx, cx - (x + chunk.size), 0),
      Math.max(z - cz, cz - (z + chunk.size), 0),
      cy,
    );
  };

  /* Coarse first, then nearest. On the opening load that is what puts
     ground under the whole frame in the fewest chunks; after it, a coarse
     ancestor is what a not-yet-generated leaf is standing on, so it is still
     the one that unblocks the most. */
  const queue: Chunk[] = [];
  function dispatch(cx: number, cy: number, cz: number) {
    let free = 0;
    for (const slot of busy) if (slot === null) free++;
    if (!free) return;

    queue.length = 0;
    for (const chunk of wanted.values()) {
      if (!chunk.mesh && !chunk.requested) queue.push(chunk);
    }
    if (!queue.length) return;

    queue.sort((a, b) => {
      if (a.level !== b.level) return b.level - a.level;
      return near(a, cx, cy, cz) - near(b, cx, cy, cz);
    });

    for (const chunk of queue) {
      const slot = busy.indexOf(null);
      if (slot < 0) break;
      const spec: ChunkSpec = {
        x: chunk.ix * chunk.size,
        z: chunk.iz * chunk.size,
        size: chunk.size,
        drop: Math.min((SKIRT * chunk.size) / SEG, SKIRT_MAX),
      };
      chunk.requested = true;
      busy[slot] = chunk.key;
      workers[slot]!.postMessage({ key: chunk.key, spec });
    }
  }

  /* ── What is drawn ───────────────────────────────────────────────────
     A leaf that is not generated yet is stood in for by the nearest
     ancestor that is — which is exactly the chunk it was subdivided out of,
     still alive on its retirement clock. The ancestor covers its whole
     quarter, so every one of its other descendants has to be hidden with
     it or the two would overlap and z-fight over the part they share. */
  function resolve() {
    shown.clear();
    holes = 0;
    for (const leaf of wanted.values()) {
      let level = leaf.level;
      let ix = leaf.ix;
      let iz = leaf.iz;
      let covered = false;
      while (level < LEVELS) {
        const found = chunks.get(keyOf(level, ix, iz));
        if (found?.mesh) {
          shown.add(found.key);
          found.idle = 0;
          covered = true;
          break;
        }
        level++;
        ix >>= 1;
        iz >>= 1;
      }
      // A leaf with no generated ancestor is a square of sky where the
      // ground should be. The only honest test of the retirement clock is
      // to count them while flying.
      if (!covered) holes++;
    }

    for (const k of [...shown]) {
      const [l, x, z] = k.split(':');
      let level = Number(l) + 1;
      let ix = Number(x) >> 1;
      let iz = Number(z) >> 1;
      while (level < LEVELS) {
        if (shown.has(keyOf(level, ix, iz))) {
          shown.delete(k);
          break;
        }
        level++;
        ix >>= 1;
        iz >>= 1;
      }
    }
  }

  function update(camera: Camera, dt: number) {
    const p = camera.position;
    collect(p.x, p.y, p.z);
    dispatch(p.x, p.y, p.z);
    resolve();

    let pending = 0;
    for (const chunk of chunks.values()) {
      const live = wanted.has(chunk.key) || shown.has(chunk.key);
      if (chunk.mesh) chunk.mesh.visible = shown.has(chunk.key);
      else if (chunk.requested) pending++;
      if (live) chunk.idle = 0;
      else {
        chunk.idle += dt * 1000;
        // A chunk that was requested and then left behind still has a
        // worker on it; dropping the record would strand the reply.
        if (chunk.idle > RETIRE && !chunk.requested) retire(chunk);
      }
    }
    stats.alive = chunks.size;
    stats.pending = pending;
    stats.holes = holes;
    worstHoles = Math.max(worstHoles, holes);
    stats.worstHoles = worstHoles;
  }

  function dispose() {
    for (const chunk of [...chunks.values()]) retire(chunk);
    for (const worker of workers) worker.terminate();
    material.dispose();
  }

  return {
    group,
    update,
    dispose,
    stats,
    /** For the harness — the same field the workers sample and §24 clamps
        the camera against. */
    height,
    counts: () => ({
      alive: chunks.size,
      shown: shown.size,
      wanted: wanted.size,
      holes,
      triangles: shown.size * (SEG * SEG * 2 + SEG * 4 * 2),
      vertices: shown.size * VERTEX_COUNT,
    }),
  };
}
