/* §0.2 — one chunk of ground, as arrays.

   Pure like `height.ts` and for the same reason: this is what runs in the
   worker, and a worker that reached anything in three would pull the whole
   renderer into a second bundle. Nothing here knows what a BufferGeometry
   is — `terrain.ts` wraps the arrays it gets back, and `grid.ts` is the
   layout both ends read. */

import { height } from './height';
import { SEG, SHADOW_SEG, VERTEX_COUNT, type ChunkSpec } from './grid';
import { SUN } from './sun';

export type ChunkData = {
  position: Float32Array;
  normal: Float32Array;
  /** How much of the key light reaches each vertex, 0..1. */
  shadow: Float32Array;
  /** Height bounds, so `terrain.ts` can set a bounding sphere without
      reading the buffer back on the main thread. */
  min: number;
  max: number;
};

/* ── Shadow, marched against the field ─────────────────────────────────
   §0.2 wants shadows and says hard-edged ones suit a banded look. A shadow
   map does not fit this terrain: the chunks a map would have to cover are
   thousands of units of ground streaming in and out, at four resolutions,
   and the map would have to be re-rendered every time one arrived.

   The key light does not move, so the occlusion is a **property of the
   field**, and the field is right here. March toward the sun and ask
   whether anything stands in the way. It costs generation time rather than
   frame time, which is the trade this world can afford — and it is exact
   at any distance rather than at whatever the map's resolution was.

   The march is a pure function of (x, z), sampled on a lattice that is a
   subset of the coarsest chunk's, so two levels meeting at a seam agree
   about the shadow at the points they share. */

/* Above the highest ground the field produces (128 over a 3,000-unit
   square, plus the cluster's 36), so a ray that has climbed past this
   cannot be occluded by anything and the loop can stop. */
const CEILING = 170;

/* Geometric steps: 10 units at the vertex, ×1.35, which reaches 743 in
   eleven — past where a ray from the lowest ground clears CEILING at 13.9°
   of elevation. Far steps are cheap because `height`'s Nyquist term drops
   the octaves under them.

   **The march is against the landforms, not the ground.** COARSE is a
   floor on the sample spacing, so everything under about 64 units is not in
   the field being marched, and the ray starts 10 units out rather than at
   the vertex. Both are the same decision from two directions: a 7-unit
   detail bump under a 13.9° light throws a 30-unit shadow, and a landscape
   whose every pebble does that is not lit, it is speckled — measured, and
   the near ground came back as a --dim wash with hard black islands in it.
   Ridges shadow valleys; nothing smaller casts. The rest of the relief is
   already in `N·L`, which is the term that does not need a march. */
const STEP0 = 10;
const GROWTH = 1.35;
const STEPS = 14;
const COARSE = 16;

/* ── How wide a normal is ──────────────────────────────────────────────
   §22 differenced the height over one sample either side, which is the
   exact normal of the surface as sampled. §23 bands the light, and an exact
   normal is the wrong input to a hard threshold: the detail layer puts a
   0.9-unit bump every 14 units, which is 23° of tilt, and 23° of tilt at
   this sun elevation crosses *any* band edge. Measured, the near ground
   came back as two-tone camouflage — noise where §0.2 asks for broad
   shapes.

   So the normal is differenced over two samples either side instead of one.
   It is scale-relative, so it smooths four units of ground at level 0 and
   sixty-four at level 3 — the same LOD ladder the geometry already climbs —
   and it costs 8% more samples for the wider apron. The geometry keeps
   every octave it had; what changes is only what the light is asked
   about. */
const SPAN = 2;

/* Two samples was not enough of it. A band edge finds anything the normal
   can wobble across, and the detail layer's finest octave is 14 units — to
   smooth *that* out of a level-0 chunk the differencing would have to span
   seven samples either side, which is 53% more of the expensive loop.

   So the shading normal is a **mix of two gradients**: the surface's own,
   differenced over SPAN, and the landform's, differenced over the coarse
   lattice the shadow march already samples (16 units at level 0, and
   already low-passed by being taken at COARSE spacing). A third of the fine
   gradient is enough to keep a crest crisp; the rest is the shape of the
   ground. The lattice costs one ring of padding — 225 samples against
   2,809 — because the march needed the same heights anyway. */
const LANDFORM = 0.34;

/* A penumbra, and it is the one place this is not a hard shadow. Depth of
   penetration is divided by the distance to the occluder, so a ridge across
   the valley has a soft edge and the rock at your feet has a sharp one —
   which is what a real one does, and what keeps a 8-unit shadow lattice
   from reading as 8-unit stairs. */
const SOFT = 6;
const SPREAD = 0.03;

export function sunlight(x: number, z: number, y: number): number {
  let s = 0;
  let step = STEP0;
  let deepest = 0;

  for (let i = 0; i < STEPS; i++) {
    s += step;
    const py = y + SUN.y * s;
    if (py > CEILING) break;
    const pen = height(x + SUN.x * s, z + SUN.z * s, Math.max(step, COARSE)) - py;
    if (pen > 0) {
      const soft = pen / (1 + s * SPREAD);
      if (soft > deepest) deepest = soft;
      if (deepest >= SOFT) return 0;
    }
    step *= GROWTH;
  }

  return 1 - Math.min(deepest / SOFT, 1);
}

export function buildChunk(spec: ChunkSpec): ChunkData {
  const { x, z, size, drop } = spec;
  const spacing = size / SEG;
  const w = SEG + 1;

  /* SPAN vertices of padding on every side, sampled from the same field, so
     the central differences below are exact at the chunk's own edge. Two
     chunks of the same level therefore agree on the normal along their
     shared edge as well as on the height — the seam is invisible rather
     than merely closed. */
  const pw = SEG + 1 + SPAN * 2;
  const H = new Float32Array(pw * pw);
  for (let j = -SPAN; j <= SEG + SPAN; j++) {
    const wz = z + j * spacing;
    for (let i = -SPAN; i <= SEG + SPAN; i++) {
      H[(j + SPAN) * pw + (i + SPAN)] = height(x + i * spacing, wz, spacing);
    }
  }

  /* The shadow lattice, coarser than the vertices and interpolated onto
     them. SHADOW_SEG divides SEG, so every fourth vertex sits exactly on a
     lattice point and the interpolation is only doing work between them —
     a shadow edge is tens of units across at this sun elevation, so
     resolving it at 8 units of ground and softening the rest is the whole
     of what a march this expensive can afford. */
  const ss = size / SHADOW_SEG;
  const sw = SHADOW_SEG + 3;
  const S = new Float32Array(sw * sw);
  const C = new Float32Array(sw * sw);
  const cs = Math.max(ss, COARSE);
  for (let j = -1; j <= SHADOW_SEG + 1; j++) {
    const wz = z + j * ss;
    for (let i = -1; i <= SHADOW_SEG + 1; i++) {
      const wx = x + i * ss;
      /* The landform height at this lattice point, which two things read.
         One ring of padding, so the differences at the chunk's own edge are
         as exact as the fine ones are. */
      const c = height(wx, wz, cs);
      C[(j + 1) * sw + (i + 1)] = c;
      /* From that coarse surface, which is also the one being marched: a
         vertex sitting in a detail dip is *below* the field the ray travels
         over, and starting there would shadow every hollow in the world. */
      S[(j + 1) * sw + (i + 1)] = sunlight(wx, wz, c);
    }
  }

  const position = new Float32Array(VERTEX_COUNT * 3);
  const normal = new Float32Array(VERTEX_COUNT * 3);
  const shadow = new Float32Array(VERTEX_COUNT);

  let min = Infinity;
  let max = -Infinity;
  const inv = 1 / (2 * SPAN * spacing);
  const cinv = 1 / (2 * ss);
  const per = SHADOW_SEG / SEG;

  /* Smoothstepped rather than linear, which is not a nicety. A bilinear
     patch is only C0 across a cell boundary, and a *hard band edge* drawn
     over that discontinuity comes back as axis-aligned rectangles a few
     units across — measured on the massif's mid slope. Fading the
     interpolant makes the lattice C1 and the edges follow the ground. */
  const ease = (t: number) => t * t * (3 - 2 * t);

  for (let j = 0; j <= SEG; j++) {
    const sj = j * per;
    const j0 = Math.min(Math.floor(sj), SHADOW_SEG - 1);
    const tj = ease(sj - j0);
    for (let i = 0; i <= SEG; i++) {
      const p = (j + SPAN) * pw + (i + SPAN);
      const y = H[p]!;
      if (y < min) min = y;
      if (y > max) max = y;

      const v = (j * w + i) * 3;
      /* Local to the chunk's own corner. A world-space buffer would be
         hundreds of thousands of units from the origin after a long flight
         and would quantise visibly in a float32; the mesh carries the
         offset in its matrix, which is a float64 on the CPU. */
      position[v] = i * spacing;
      position[v + 1] = y;
      position[v + 2] = j * spacing;

      const si = i * per;
      const i0 = Math.min(Math.floor(si), SHADOW_SEG - 1);
      const ti = ease(si - i0);
      const at = (G: Float32Array) => {
        const a = G[(j0 + 1) * sw + i0 + 1]!;
        const b = G[(j0 + 1) * sw + i0 + 2]!;
        const c = G[(j0 + 2) * sw + i0 + 1]!;
        const d = G[(j0 + 2) * sw + i0 + 2]!;
        return (a + (b - a) * ti) * (1 - tj) + (c + (d - c) * ti) * tj;
      };
      shadow[j * w + i] = at(S);

      /* The shading normal, and it is **not** the surface's own. See LANDFORM
         above: the fine gradient is differenced over SPAN samples and then
         mixed a third of the way into the landform gradient off the coarse
         lattice, which is what stops a hard band edge from finding the
         detail layer. Nothing else reads a normal, so there is one
         attribute and it is this one. */
      const cx = ((C[(j0 + 1) * sw + i0 + 2]! - C[(j0 + 1) * sw + i0]!) * (1 - tj)
        + (C[(j0 + 2) * sw + i0 + 2]! - C[(j0 + 2) * sw + i0]!) * tj) * cinv;
      const cz = ((C[(j0 + 2) * sw + i0 + 1]! - C[j0 * sw + i0 + 1]!) * (1 - ti)
        + (C[(j0 + 2) * sw + i0 + 2]! - C[j0 * sw + i0 + 2]!) * ti) * cinv;

      const dx = (H[p + SPAN]! - H[p - SPAN]!) * inv * LANDFORM + cx * (1 - LANDFORM);
      const dz = (H[p + pw * SPAN]! - H[p - pw * SPAN]!) * inv * LANDFORM + cz * (1 - LANDFORM);
      const len = Math.hypot(dx, 1, dz);
      normal[v] = -dx / len;
      normal[v + 1] = 1 / len;
      normal[v + 2] = -dz / len;
    }
  }

  /* The apron. One depth for the whole chunk rather than per vertex, so its
     bottom edge is a straight line — a skirt that followed the terrain
     would be the same shape as the crack it is covering. It carries the
     surface's normal, so on the rare frame an apron is visible it shades
     as the ground above it rather than as a wall. */
  let o = w * w;
  const hang = (surface: number) => {
    const s = surface * 3;
    const d = o * 3;
    position[d] = position[s]!;
    position[d + 1] = position[s + 1]! - drop;
    position[d + 2] = position[s + 2]!;
    normal[d] = normal[s]!;
    normal[d + 1] = normal[s + 1]!;
    normal[d + 2] = normal[s + 2]!;
    shadow[o] = shadow[surface]!;
    o++;
  };
  for (let k = 0; k <= SEG; k++) hang(k);
  for (let k = 0; k <= SEG; k++) hang(SEG * w + k);
  for (let k = 0; k <= SEG; k++) hang(k * w);
  for (let k = 0; k <= SEG; k++) hang(k * w + SEG);

  return { position, normal, shadow, min: min - drop, max };
}
