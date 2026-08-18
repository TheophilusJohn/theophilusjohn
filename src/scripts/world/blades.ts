/* §0.2 — ground cover, and it is the thing that makes the ground read as
   ground rather than as a shaded surface.

   **Instanced blades on a camera-relative disc, not per chunk**, which is
   §16's construction for the old particle floor. That one failed because it
   was trying to *be* the ground; this one stands on ground that already
   exists, and the difference is everything. Within sixty units — see the
   grid below for why that is half what §0.2 asks for — and past that the
   terrain's own tint carries the same density, because `chunk.ts` bakes it
   onto every vertex. That is what makes the edge of this disc not an edge in
   the frame.

   ── Why the disc is filled on the CPU ──────────────────────────────────
   A blade has to stand *on* the ground, and the ground is `height.ts` — a
   nine-octave field in JavaScript that no shader can call. There is no
   version of this where the placement is free: either the field is copied
   into a shader, which is a second answer to what the terrain is, or the
   heights are sampled here. So they are sampled here, and the whole design
   of this file is about how few samples that takes.

   **A world-anchored grid of cells, toroidally mapped into one buffer.**
   Cell (i, j) is a fixed square of the world and its blades are a pure
   function of (i, j) (§0.2: "no storage, no seeds carried between chunks"),
   so a slot only has to be refilled when the cell it should hold *changes* —
   which at cruise is one column of the grid every 3 units of travel, not
   28,800 blades a frame. Each frame walks the slots from wherever it stopped
   last, refills the ones whose cell has moved, and stops at BUDGET so the
   worst frame is bounded rather than the average being low.

   A stale slot needs no special case: it holds blades at their old cell's
   real world position, which is by definition outside the disc, so the fade
   below scales them to nothing. Nothing wrong is ever drawn while the grid
   catches up — the cover fades in over about half a second after a jump.

   ── What it costs to place one cell ────────────────────────────────────
   Five field samples for the height and its gradient, one `landform` and one
   `uplift` for the range mask, then — only where something grows — one
   coarse sample, one shadow march and one `height()` per blade that
   survives. Cells with no cover stop after the mask, which is about half of
   them (§27 measures 55% of dry ground with any cover at all). Both
   expensive parts are shared rather than reimplemented: the density is
   `cover.ts`'s `coverAt`, which the worker also calls, and the shadow is
   `chunk.ts`'s own `sunlight` — the grass in a valley under a ridge has to
   be in the shadow the ground is in, or it reads as a decal. */

import {
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  BufferAttribute,
  Mesh,
  MeshBasicNodeMaterial,
  type Camera,
} from 'three/webgpu';
import {
  attribute,
  cameraPosition,
  cos,
  float,
  mix,
  positionLocal,
  positionWorld,
  sin,
  smoothstep,
  vec2,
  vec3,
} from 'three/tsl';
import type UniformNode from 'three/src/nodes/core/UniformNode.js';
import { CAST, bands } from './band';
import { COARSE, sunlight } from './chunk';
import { coverAt, hash3 } from './cover';
import { fog } from './fog';
import { height, landform, rangeMask, uplift } from './height';
import type { Palette } from './palette';
import { haze } from './sky';
import { SUN } from './sun';
import {
  FLUTTER_AMP,
  FLUTTER_HZ,
  GUST_AMP,
  GUST_BASE,
  GUST_LENGTH,
  GUST_SPEED,
  WANDER,
  WANDER_LENGTH,
  WANDER_PERIOD,
  WIND,
  WIND_PERP,
} from './wind';

/* ── The grid ───────────────────────────────────────────────────────────
   40 cells of 3 units is 120 across, so the disc reaches 60 in every
   direction and REACH is inside it in the corners as well as on the axes.

   **§0.2 says 120 units and this is 60, which is a measurement rather than a
   cut.** At 120 the same instance budget put 113 tufts inside the nearest 25
   units and two thousand of them past 100 — where a blade is four pixels
   tall and a dozen of them fall inside one, which is a tint that costs a
   draw. The near ground is what the disc is for (§0.2: "the thing that makes
   the ground read as ground"), the ground beyond it already carries the same
   density as a tint on the surface, and spending the instances inside 60
   units is six times the cover where the reader is actually looking. The
   spec's number was written for a layer that had no tint under it.

   **An instance is a tuft of three blades, not one blade**, and that is a
   measurement rather than a flourish. Single blades at this density came back
   as a field of one-pixel streaks — grass reads as rain when the thing
   drawn is thinner than it is long and there is space around it. Three
   blades leaning out of one root is what a stand of scrub looks like from six
   units up, and it costs a third as much on the CPU per blade: the expensive
   part of placing one is the field sample under its root, and a tuft has one
   root. */
const CELL = 3;
const GRID = 40;
const PER = 6;
const COUNT = GRID * GRID * PER;

/* Where the three blades of a tuft stand, in units of the tuft's own height:
   an offset from the root, a yaw of their own, and a share of its height.
   Fixed rather than hashed — the tuft's yaw turns all three, so what repeats
   is a shape at every angle rather than a pattern. */
const TUFT = [
  { x: 0, z: 0, yaw: 0, scale: 1 },
  { x: 0.26, z: 0.15, yaw: 0.85, scale: 0.78 },
  { x: -0.2, z: 0.22, yaw: -0.62, scale: 0.62 },
] as const;

/* Where a blade shrinks into the ground rather than being clipped out of the
   frame — §28's rule, arrived at early because the disc has an edge whatever
   is standing on it. 46 to 58 is a quarter of a second of cruise, and at 58 a
   half-unit blade is eight pixels tall against a tuft spacing of forty, so
   what fades out is scattered texture rather than a surface. */
const REACH = 58;
const REACH_IN = 46;

/* ── Standing on the drawn ground, not on the field ────────────────────
   A blade's base is `height(x, z, SAMPLE)` less SINK. SAMPLE is the level-0
   sample spacing, because the mesh under the camera is a level-0 chunk and
   that is the surface the reader sees; SINK covers what is left, which is the
   geomorph (§25 measures the drawn level-0 surface 0.09 units from the field
   on average) and the plane a triangle draws between two samples. A buried
   base is invisible and a floating one is a blade standing on air at a
   distance of six units, which is where this world's camera floor puts the
   eye. */
const SAMPLE = 2;
const SINK = 0.22;

/* Half the span the ground's gradient is differenced over, which is
   `chunk.ts`'s coarse lattice at level 0 to the unit. Both the density and
   the light a blade is drawn by come off that gradient, so the two ends of
   §27 are asking the field the same question. */
const LAND = 8;

/* Grass, low scrub, moss on the rock — §0.2's words, and none of them is a
   metre tall. At 0.34 to 0.72 units a blade is 4 pixels at the fade edge and
   about 60 at the closest the camera floor allows, which is the range over
   which it reads as cover rather than as an object.

   WIDTH is the half-width of the tallest blade's base, so a blade is about
   four times as long as it is wide. Thinner is more like grass and reads as
   rain: what a one-pixel line does at this distance is streak. */
const H_MIN = 0.30;
const H_MAX = 0.62;
const WIDTH = 0.10;

/* Density into blades: at KEEP and above every blade in the cell stands, and
   under it they are dropped in proportion. It is a *rejection* rather than a
   scale so that thin cover reads as scattered tufts, which is what thin
   cover is — scaling instead would give a uniform field of small grass. */
const KEEP = 0.45;

/* How far the tip leans at full strength, as a fraction of the blade's own
   height. §0.2: amplitude by height above the ground, so a trunk is still
   and a canopy is not — on a blade that is the square of the height along
   it, which is the shape a cantilever bends in. */
const BEND = 0.42;
const STIFF_LOW = 0.65;
const STIFF_RANGE = 0.7;

/* ── What a blade is lit by ─────────────────────────────────────────────
   **The ground it stands on, not its own facing.** The first build lit a
   blade by `N·L` of its own near-vertical face and banded that absolutely,
   and the result is in the §27 report: white streaks on lavender, a field of
   sparks rather than ground cover. A blade is one or two pixels wide, so what
   the eye reads is not its shading — it is whether the ground has texture on
   it, and texture that is four bands away from what it sits on is rain.

   So the cell carries the *ground's* lighting term (the same `N·L` and the
   same marched shadow the terrain is banded by) and the blade's own facing
   only modulates it, between 0.72 and 1.28 of it. That is enough for a stand
   of grass to catch the light on one side and lose it on the other — and the
   modulation is what crosses a band edge, so the sparkle is the ground's own
   terminator moving through the grass rather than a second light. */
const OWN_LOW = 0.72;
const OWN_HIGH = 1.28;
/* The blade's own N·L runs 0 to 0.837 — the horizontal part of a 32° key
   light — so this is what normalises it before the mix above. */
const OWN_MAX = 0.837;

/* How far toward the one-step-lighter palette a blade is drawn. The ground
   is at 0.25 of it (`terrain.ts`) and the growth standing on it has to be
   further, or there is nothing to see; a full step is `--rule` to `--dim`,
   which is the largest step in the palette and reads as chalk. */
const TINT = 0.6;

/* Cells refilled per frame. At cruise a column crossing is 80 of them and at
   boost a diagonal one is 160, so this is not a rate limit in flight — it is
   the bound on the frame after a jump, where the whole grid is stale. A
   diagonal crossing at boost is 80 cells, so 96 is not a rate limit in
   flight; it is what caps the frame after a jump, and 1,600 cells at 96 is
   seventeen frames of fading in. */
const BUDGET = 96;

const TAU = Math.PI * 2;

export function buildBlades(palette: Palette, time: UniformNode<'float', number>) {
  const geometry = tuft();

  const iPos = new Float32Array(COUNT * 3);
  /* Height, the two halves of the blade's own yaw — precomputed because a
     sine per vertex to unpack an angle that never changes is the sort of
     thing that adds up at 128,000 vertices — and its flutter phase. */
  const iAim = new Float32Array(COUNT * 4);
  /* The *ground's* lighting term at this blade's cell, which is what makes
     cover read as cover rather than as sparks. See OWN_LOW above. */
  const iLum = new Float32Array(COUNT);
  const aPos = new InstancedBufferAttribute(iPos, 3);
  const aAim = new InstancedBufferAttribute(iAim, 4);
  const aLum = new InstancedBufferAttribute(iLum, 1);
  geometry.setAttribute('iPos', aPos);
  geometry.setAttribute('iAim', aAim);
  geometry.setAttribute('iLum', aLum);
  geometry.instanceCount = COUNT;

  const material = new MeshBasicNodeMaterial({ side: DoubleSide, fog: false });

  const pos = attribute<'vec3'>('iPos', 'vec3');
  const aim = attribute<'vec4'>('iAim', 'vec4');
  const lit = attribute<'float'>('iLum', 'float');

  /* ── The wind, as `wind.ts` states it ────────────────────────────────
     A gust wave travelling along the prevailing direction, a slow wander of
     the direction keyed across it, and a per-blade flutter. Three lines of
     the same arithmetic `windAt` is written in, off the same constants —
     which is what "one field so they agree" means here: the cloud deck
     advects along `WIND` and the water's four waves are bearings off it, so
     nothing in the frame leans against anything else in it. */
  const ground = vec2(pos.x, pos.z);
  const along = ground.dot(vec2(WIND.x, WIND.z));
  const across = ground.dot(vec2(WIND_PERP.x, WIND_PERP.z));
  const gust = sin(along.sub(time.mul(GUST_SPEED)).div(GUST_LENGTH).mul(TAU));
  const wander = sin(
    across.div(WANDER_LENGTH).sub(time.div(WANDER_PERIOD)).mul(TAU),
  ).mul(WANDER);
  const flutter = sin(time.mul(FLUTTER_HZ * TAU).add(aim.w.mul(TAU))).mul(FLUTTER_AMP);
  /* Stiffness off the same per-tuft number as the flutter phase. Two uses of
     one random correlate, and it does not show: what it buys is that a stand
     of grass is not one shape repeated at one angle, which is the difference
     between grass and hatching. */
  const strength = float(GUST_BASE)
    .add(gust.mul(GUST_AMP))
    .add(flutter)
    .mul(aim.w.mul(STIFF_RANGE).add(STIFF_LOW));
  const lean = vec3(WIND.x, 0, WIND.z)
    .mul(cos(wander))
    .add(vec3(WIND_PERP.x, 0, WIND_PERP.z).mul(sin(wander)))
    .mul(strength.mul(BEND));

  /* ── One blade of the tuft ───────────────────────────────────────────
     The geometry carries where this blade stands inside its tuft, which way
     it is turned and how much of the tuft's height it gets; the instance
     carries the tuft's own yaw. Both rotations are 2D and the composition is
     one complex multiply, which is why the yaw is stored as its cosine and
     sine rather than as an angle. */
  const off = attribute<'vec2'>('bOff', 'vec2');
  const turn = attribute<'vec2'>('bTurn', 'vec2');
  const scale = attribute<'float'>('bScale', 'float');
  const c = aim.y;
  const s = aim.z;
  const spin = (v: typeof off) => vec2(v.x.mul(c).sub(v.y.mul(s)), v.x.mul(s).add(v.y.mul(c)));
  const turned = spin(turn);
  const root = spin(off);

  const up = positionLocal.y.mul(scale);
  const h = aim.x;
  const sideways = vec3(turned.x, 0, turned.y);
  /* Every term is scaled by the tuft's height, width included — which is
     what makes a rejected tuft (height 0) nine degenerate triangles rather
     than a set of dashes lying on the ground. */
  const shape = vec3(root.x, up, root.y)
    .add(lean.mul(up.mul(up)))
    .add(sideways.mul(positionLocal.x.mul(WIDTH / H_MAX)));

  /* Scaled to nothing rather than clipped or switched off, so a tuft leaving
     the disc sinks into the ground over twelve units of travel. The distance
     is to the instance rather than to the vertex: every vertex of one tuft
     has to agree about how big it is. */
  /* **No swell here** (§34). The ground under Homonoia moves with the term
     and grass would have to move with it — except that `coverAt` is zero
     over the whole of the swell's 306-unit footprint, so there is no grass
     there to move. `scatter.ts` says the rest of it: the conifers went the
     same way, and it cost 0.22 ms a frame to find that out. */
  const shrink = smoothstep(REACH, REACH_IN, pos.sub(cameraPosition).length());
  material.positionNode = pos.add(shape.mul(h.mul(shrink)));

  /* The face normal, from the blade's own tangent: the derivative of the
     shape above along its length, crossed with the way it is turned. A bent
     blade therefore catches the light differently from a straight one, which
     is most of what makes a gust visible in a quantised world. */
  const tangent = vec3(0, 1, 0).add(lean.mul(up.mul(2)));
  const normal = sideways.cross(tangent).normalize();

  const toEye = cameraPosition.sub(positionWorld).normalize();
  /* Two-sided, because a blade is one triangle strip with no inside. The
     normal is turned toward the eye rather than the material carrying two
     shaders, and the sign is exact at every angle that is not exactly
     grazing. */
  const facing = normal.mul(normal.dot(toEye).sign());
  const own = facing.dot(vec3(SUN.x, SUN.y, SUN.z)).max(0).div(OWN_MAX).min(1);
  const lum = lit.mul(mix(float(OWN_LOW), float(OWN_HIGH), own));

  /* **One step lighter than the ground it stands on** (§0.2), through the
     same `band.ts` the terrain uses — so a blade's terminator is the ground's
     terminator and the two cannot drift apart. */
  const body = mix(bands(lum, palette, 0), bands(lum, palette, 1), TINT);

  const depth = fog(positionWorld);
  material.colorNode = mix(haze(toEye, palette), body, depth);

  const mesh = new Mesh(geometry, material);
  // Instance positions are world coordinates and the geometry's own bounds
  // are one blade at the origin, so there is nothing here to cull against.
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  mesh.visible = false;

  /* ── The fill ────────────────────────────────────────────────────────
     Which world cell each slot currently holds. The sentinel cannot be a
     real cell coordinate, so the first pass over the grid refills
     everything. */
  const heldX = new Int32Array(GRID * GRID).fill(0x7fff_ffff);
  const heldZ = new Int32Array(GRID * GRID).fill(0x7fff_ffff);
  let cursor = 0;

  const stats = { cells: 0, marches: 0, ms: 0, worst: 0, worstCells: 0, stale: GRID * GRID };

  const PROBE = REACH * 0.7;
  const PROBES = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

  function reachable(x: number, y: number, z: number) {
    if (y - height(x, z) < REACH) return true;
    for (const [ox, oz] of PROBES) {
      const dx = ox * PROBE * Math.SQRT1_2;
      const dz = oz * PROBE * Math.SQRT1_2;
      if (Math.hypot(dx, dz, y - height(x + dx, z + dz)) < REACH) return true;
    }
    return false;
  }

  function place(slot: number, ci: number, cj: number) {
    const cx = (ci + 0.5) * CELL;
    const cz = (cj + 0.5) * CELL;

    /* Central differences over sixteen units, which is not a taste: it is
       exactly the span `chunk.ts` differences its *landform* gradient over at
       level 0, and both the density and the light below have to be the
       terrain's own answers rather than near ones. A gradient over the
       detail layer would strip cover off half of every meadow in stripes and
       band the grass differently from the ground under it. */
    const h = height(cx, cz, SAMPLE);
    const gx = (height(cx + LAND, cz, SAMPLE) - height(cx - LAND, cz, SAMPLE)) / (2 * LAND);
    const gz = (height(cx, cz + LAND, SAMPLE) - height(cx, cz - LAND, SAMPLE)) / (2 * LAND);
    const mask = rangeMask(landform(cx, cz, SAMPLE), uplift(cx, cz));
    const density = coverAt(h, Math.hypot(gx, gz), mask, cx, cz);

    let ground = 0;
    if (density > 0) {
      // The same march `chunk.ts` bakes into the ground, from the same coarse
      // surface: grass in a valley under a ridge is in the shadow the ground
      // is in, or it reads as a decal.
      const shade = sunlight(cx, cz, height(cx, cz, COARSE));
      stats.marches++;
      const len = Math.hypot(gx, 1, gz);
      const facing = (-gx * SUN.x + SUN.y - gz * SUN.z) / len;
      ground = Math.max(facing, 0) * (1 - CAST + CAST * shade);
    }

    for (let k = 0; k < PER; k++) {
      const o = slot * PER + k;
      const p = k * 8;
      if (density <= 0 || hash3(ci, cj, p) * KEEP >= density) {
        // A height of zero is a blade with no length: three degenerate
        // triangles, which is cheaper than any branch and needs no second
        // instance count.
        iAim[o * 4] = 0;
        continue;
      }
      const x = (ci + hash3(ci, cj, p + 1)) * CELL;
      const z = (cj + hash3(ci, cj, p + 2)) * CELL;
      const yaw = hash3(ci, cj, p + 3) * Math.PI;
      iPos[o * 3] = x;
      iPos[o * 3 + 1] = height(x, z, SAMPLE) - SINK;
      iPos[o * 3 + 2] = z;
      iAim[o * 4] = H_MIN + (H_MAX - H_MIN) * hash3(ci, cj, p + 4);
      iAim[o * 4 + 1] = Math.cos(yaw);
      iAim[o * 4 + 2] = Math.sin(yaw);
      iAim[o * 4 + 3] = hash3(ci, cj, p + 5);
      iLum[o] = ground;
    }
  }

  /* Five samples of the field a frame, and they decide whether there is any
     point in the rest of this file: at the cruise pose the camera is 190
     units over the ground and the nearest blade is 190 away, so the whole
     disc is past REACH and the draw call is not made at all.

     The ground under the camera is not enough on its own. A camera 130 units
     over a valley floor with a ridge rising beside it has blades within
     fifty units of it, and a gate that could not see them would take ten
     thousand of them off the frame in one frame — which is the pop the fade
     exists to avoid, arriving by the back door. So the four diagonals are
     probed as well, at 0.7 of the reach, and any of the five inside it is
     enough. */
  function update(camera: Camera, all = false) {
    const p = camera.position;
    const visible = reachable(p.x, p.y, p.z);
    mesh.visible = visible;
    if (!visible) return;

    const started = performance.now();
    const i0 = Math.round(p.x / CELL) - GRID / 2;
    const j0 = Math.round(p.z / CELL) - GRID / 2;
    const budget = all ? GRID * GRID : BUDGET;

    let filled = 0;
    let stale = 0;
    let lo = COUNT;
    let hi = 0;
    for (let n = 0; n < GRID * GRID; n++) {
      const slot = (cursor + n) % (GRID * GRID);
      const si = slot % GRID;
      const sj = (slot - si) / GRID;
      // The cell this slot stands for: the one inside the grid's current
      // square whose coordinate is congruent to the slot's, which is what
      // makes the mapping toroidal and the fill a ring.
      const ci = i0 + (((si - i0) % GRID) + GRID) % GRID;
      const cj = j0 + (((sj - j0) % GRID) + GRID) % GRID;
      if (heldX[slot] === ci && heldZ[slot] === cj) continue;
      if (filled >= budget) {
        stale++;
        continue;
      }
      place(slot, ci, cj);
      heldX[slot] = ci;
      heldZ[slot] = cj;
      filled++;
      lo = Math.min(lo, slot * PER);
      hi = Math.max(hi, slot * PER + PER);
      if (filled >= budget) cursor = (slot + 1) % (GRID * GRID);
    }

    if (filled) {
      /* One range covering everything touched rather than one per cell: a
         column of cells is contiguous in the buffer and a row is strided by
         the whole grid, so merging is either exact or the whole buffer, and
         the whole buffer is 800KB — a tenth of a millisecond of writeBuffer
         against 80 calls of it. */
      const span = hi - lo;
      aPos.addUpdateRange(lo * 3, span * 3);
      aAim.addUpdateRange(lo * 4, span * 4);
      aLum.addUpdateRange(lo, span);
      aPos.needsUpdate = true;
      aAim.needsUpdate = true;
      aLum.needsUpdate = true;
    }

    const ms = performance.now() - started;
    stats.cells += filled;
    stats.ms += ms;
    if (ms > stats.worst) {
      stats.worst = ms;
      stats.worstCells = filled;
    }
    stats.stale = stale;
  }

  return {
    mesh,
    /** Fill the whole grid in one call — the pre-first-frame pass in
        `scene.ts`, and what a harness drains with. */
    settle: (camera: Camera) => update(camera, true),
    update,
    stats,
    count: COUNT,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

/* One tuft: three blades of five vertices and three triangles each, in a unit
   space where y runs 0 at the root to 1 at the tip and x is ±1 across the
   base. Two segments rather than one because the bend is a curve and a single
   quad leaning over is a plank; three would be smoother and is not visible at
   five pixels. */
function tuft() {
  const shape = [
    [-1, 0], [1, 0], [-0.55, 0.5], [0.55, 0.5], [0, 1],
  ];
  const tris = [0, 1, 2, 1, 3, 2, 2, 3, 4];
  const n = shape.length;

  const position = new Float32Array(TUFT.length * n * 3);
  const off = new Float32Array(TUFT.length * n * 2);
  const turn = new Float32Array(TUFT.length * n * 2);
  const scale = new Float32Array(TUFT.length * n);
  const index = new Uint16Array(TUFT.length * tris.length);

  TUFT.forEach((blade, b) => {
    for (let i = 0; i < n; i++) {
      const v = b * n + i;
      position[v * 3] = shape[i]![0]!;
      position[v * 3 + 1] = shape[i]![1]!;
      off[v * 2] = blade.x;
      off[v * 2 + 1] = blade.z;
      turn[v * 2] = Math.cos(blade.yaw);
      turn[v * 2 + 1] = Math.sin(blade.yaw);
      scale[v] = blade.scale;
    }
    for (let i = 0; i < tris.length; i++) index[b * tris.length + i] = b * n + tris[i]!;
  });

  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('bOff', new BufferAttribute(off, 2));
  geometry.setAttribute('bTurn', new BufferAttribute(turn, 2));
  geometry.setAttribute('bScale', new BufferAttribute(scale, 1));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
}
