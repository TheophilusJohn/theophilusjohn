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

   ── What is deliberately not here ──────────────────────────────────────
   §23 replaces the material outright with banded light, a rim in --leader
   and a sky that has a horizon in it. What is below is a two-stop ramp and
   a fog mix — enough to read the shape of the ground, which is what §22 has
   to be judged on, and not a look. §24 owns the altitude clamp, which will
   read `height()` on the main thread exactly as the LOD criterion below
   already does. */

import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicNodeMaterial,
  Sphere,
  Vector3,
  type Camera,
  type Color,
} from 'three/webgpu';
import { mix, normalWorld, positionWorld, vec3 } from 'three/tsl';
import type UniformNode from 'three/src/nodes/core/UniformNode.js';
import { fog } from './fog';
import { height } from './height';
import { SEG, VERTEX_COUNT, buildIndices, type ChunkSpec } from './grid';
import type { ChunkData } from './chunk';

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

/* One key light, and §0.2 is explicit that it matters more than any light
   in the project so far because it is the thing that will make the bands at
   §23. Low and off to one side so ridges catch it along their length; from
   behind the camera's opening heading, so the first thing anybody sees is
   lit rather than in silhouette. */
const SUN = new Vector3(-0.62, 0.24, 0.75).normalize();

/* Where --dim sits on the ramp. High, because most of a landscape is not
   facing the key light and the half of the range below this is where nearly
   all of the frame lives. */
const MID = 0.62;

export type TerrainPalette = {
  shadow: UniformNode<'color', Color>;
  mid: UniformNode<'color', Color>;
  lit: UniformNode<'color', Color>;
  void: UniformNode<'color', Color>;
};

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

export function buildTerrain(palette: TerrainPalette) {
  const group = new Group();
  const indices = buildIndices();

  const material = new MeshBasicNodeMaterial();
  /* Lit by hand rather than through a lighting model. BasicNodeLibrary
     registers no mesh node materials (§21), and a two-stop ramp needs
     nothing a light node would give it. §23 is where that stops being
     true. */
  const key = normalWorld.dot(vec3(SUN.x, SUN.y, SUN.z)).max(0);
  const sky = normalWorld.y.mul(0.5).add(0.5);
  const lum = key.mul(1.15).add(sky.mul(0.05)).clamp(0, 1).pow(1.9);
  const surface = mix(
    mix(palette.shadow, palette.mid, lum.div(MID).clamp(0, 1)),
    palette.lit,
    lum.sub(MID).div(1 - MID).clamp(0, 1),
  );
  /* Fog on an opaque surface is a mix toward --void, not the multiply the
     additive layers use: --void is under every pixel and the ground has to
     arrive at it rather than at nothing. */
  material.colorNode = mix(palette.void, surface, fog(positionWorld));

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
     one place the main thread samples it, and §24's clamp will sample the
     same function the same way. */
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
    /** For §24 and for the harness — the same field the workers sample. */
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
