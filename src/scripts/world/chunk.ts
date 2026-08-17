/* §0.2 — one chunk of ground, as arrays.

   Pure like `height.ts` and for the same reason: this is what runs in the
   worker, and a worker that reached anything in three would pull the whole
   renderer into a second bundle. Nothing here knows what a BufferGeometry
   is — `terrain.ts` wraps the arrays it gets back, and `grid.ts` is the
   layout both ends read. */

import { coverAt } from './cover';
import { height, landform, rangeMask, uplift } from './height';
import { SEG, SHADOW_SEG, VERTEX_COUNT, type ChunkSpec } from './grid';
import {
  CANOPY_R,
  CANOPY_Y,
  CELL,
  SPACING,
  TREES,
  TREE_H_MAX,
  TREE_W_MAX,
  conifer,
  groundAt,
  treeBand,
  treeClump,
  treeDensity,
} from './scatter';
import { SUN } from './sun';

export type ChunkData = {
  position: Float32Array;
  normal: Float32Array;
  /** How much of the key light reaches each vertex, 0..1. */
  shadow: Float32Array;
  /* §27 — how much ground cover this ground supports, 0..1, off the same
     lattice as the shadow. It is here rather than only under the blade disc
     because the disc reaches 60 units and the ground reaches 1,536: the
     tint is what carries growth past the blades, and it is the reason the
     edge of the disc is not an edge in the frame. */
  cover: Float32Array;
  /* §25 — where this vertex would be, and what it would be lit by, on the
     parent's surface. Stored as the difference from its own value, so a
     root chunk with no parent is the zeroed array these are allocated as
     and the shader's `+ delta * weight` needs no branch. All three, because
     a chunk that morphs its position and keeps its shading pops in the two
     terms the eye is most sensitive to: the shadow is the one that reads as
     the ground darkening and resolving. */
  morphY: Float32Array;
  morphNormal: Float32Array;
  morphShadow: Float32Array;
  morphCover: Float32Array;
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
/* Exported since §27: the blade disc marches this same function on the main
   thread and has to start from the same surface, or the grass in a valley is
   lit while the ground it stands in is not. */
export const COARSE = 16;

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

/* ── What stands on the ground, in the ground's own shadow (§28) ────────
   §0.2: "a tree with no shadow reads as a decal. The worker already marches
   the field; a scattered object is a bump on it, and the cheapest honest
   answer is a disc of occlusion under each one baked into the vertex
   attribute the ground already carries." So it is exactly that — the
   conifers of `scatter.ts` projected onto the shadow lattice and multiplied
   into the term the march produced. No second attribute, no second pass on
   the GPU, and it morphs like the rest of the shadow because it *is* the
   rest of the shadow.

   **Only the conifers, and only at the finest level**, which is two
   decisions and one of them was measured the hard way. A boulder is four
   units tall and throws six units of shadow at this sun's 32°, against a
   lattice that is eight units at level 0 and sixty-four at level 3 — so a
   rock's shade would be baked into nothing at every level there is. A
   conifer's ellipse is fifteen units across, which two lattice points
   resolve at level 0 and one does at level 1.

   The first build baked level 1 as well, and what came back is the reason
   not to: **shade outruns the thing casting it**. `stands.ts` fades a tree
   out at 590 units and a level-1 chunk reaches 576, so the far ridges came
   back covered in soft dark ellipses with nothing standing in them — which
   reads as holes cut in the ground, and is worse in every frame than the
   error in the other direction. Level 0 reaches 288 and is fully morphed in
   by 158, so what is left is trees past that distance whose pool of shade
   has not arrived yet, at a distance where the pool would be a dozen pixels.
   It cost 20% of a level-1 chunk's generation as well.

   None of which is a seam. §25's morph is what carries a chunk from its
   parent's surface to its own, so a level-0 chunk is *born* showing the
   level-1 surface, which has no stands in it, and the shade of a forest
   fades in over the chunk's life at exactly the rate its geometry does.

   The projection is a sphere's shadow on flat ground: an ellipse, offset
   downsun from the trunk by the canopy's height times cot(elevation), a
   semi-minor axis of the canopy radius and a semi-major of that over
   sin(elevation). Combined by max rather than by product, so a stand of
   conifers is ground in shade rather than ground in the dark. */
const OBJECT_SS = 8;
const OCCLUSION = 0.7;

const SUN_XZ = Math.hypot(SUN.x, SUN.z);
const SHADE_X = -SUN.x / SUN_XZ;
const SHADE_Z = -SUN.z / SUN_XZ;
/** How far downsun a shadow runs per unit of height: cot(32°). */
const SHADE_RUN = SUN_XZ / SUN.y;
/** How much longer than wide a sphere's shadow is: 1/sin(32°). */
const SHADE_LONG = 1 / SUN.y;

/* How far outside the lattice a tree can stand and still darken it — and it
   is **not the same on all four sides**, because a shadow only ever runs one
   way. The tallest conifer's ellipse is offset 11.0 units downsun and is 7.4
   by 7.9 half-extents, so upsun of the lattice a tree matters from 14 units
   out and downsun of it from under one. Asking symmetrically would be a
   quarter more cells for no shade at all. */
const SHADE_RISE = TREE_H_MAX * CANOPY_Y * SHADE_RUN;
const SHADE_R = CANOPY_R * TREE_W_MAX * TREE_H_MAX;
const SHADE_BX = Math.abs(SHADE_X) * SHADE_R * SHADE_LONG + Math.abs(SHADE_Z) * SHADE_R;
const SHADE_BZ = Math.abs(SHADE_Z) * SHADE_R * SHADE_LONG + Math.abs(SHADE_X) * SHADE_R;
const MARGIN_X0 = SHADE_X * SHADE_RISE + SHADE_BX;
const MARGIN_X1 = SHADE_BX - SHADE_X * SHADE_RISE;
const MARGIN_Z0 = SHADE_Z * SHADE_RISE + SHADE_BZ;
const MARGIN_Z1 = SHADE_BZ - SHADE_Z * SHADE_RISE;

/* Smoothstepped rather than linear, which is not a nicety. A bilinear patch
   is only C0 across a cell boundary, and a *hard band edge* drawn over that
   discontinuity comes back as axis-aligned rectangles a few units across —
   measured on the massif's mid slope. Fading the interpolant makes the
   lattice C1 and the edges follow the ground. */
const ease = (t: number) => t * t * (3 - 2 * t);

/* How much of the key light the conifers standing near this lattice take off
   it, one value per lattice point. **Splatted rather than gathered**, and
   that is the whole of why it is affordable: a gather would ask every
   lattice point which cells could shadow it and pay for each of those cells
   once per point, where this walks each cell once and touches the handful of
   points its trees darken. The cell walk is the cost, the projection is not.

   Two early-outs stand in front of the field, and between them they reject
   nine cells in ten before anything expensive happens: the clump noise, which
   is one call and no sample at all, and then the altitude window off a single
   coarse height. */
const scratch = new Float32Array(6);

function occlusion(x0: number, z0: number, ss: number, lw: number, lh: number): Float32Array {
  const O = new Float32Array(lw * lh);
  const x1 = x0 + (lw - 1) * ss;
  const z1 = z0 + (lh - 1) * ss;
  const ci0 = Math.floor((x0 - MARGIN_X0) / CELL);
  const ci1 = Math.floor((x1 + MARGIN_X1) / CELL);
  const cj0 = Math.floor((z0 - MARGIN_Z0) / CELL);
  const cj1 = Math.floor((z1 + MARGIN_Z1) / CELL);

  for (let cj = cj0; cj <= cj1; cj++) {
    for (let ci = ci0; ci <= ci1; ci++) {
      const cx = (ci + 0.5) * CELL;
      const cz = (cj + 0.5) * CELL;
      const clump = treeClump(cx, cz);
      if (clump <= 0) continue;
      // One sample for the altitude window and the water margin, then the
      // other two only where a conifer is still possible.
      const h = height(cx, cz, SPACING);
      if (treeBand(h) <= 0) continue;
      const density = treeDensity(groundAt(cx, cz, h), clump);
      if (density <= 0) continue;

      for (let k = 0; k < TREES; k++) {
        if (!conifer(ci, cj, k, density, scratch)) continue;
        const tall = scratch[2]!;
        const r = CANOPY_R * scratch[3]! * tall;
        // The ellipse: the canopy's own sphere, projected downsun.
        const rise = CANOPY_Y * tall * SHADE_RUN;
        const ex = scratch[0]! + SHADE_X * rise;
        const ez = scratch[1]! + SHADE_Z * rise;
        const a = r * SHADE_LONG;
        const bx = Math.abs(SHADE_X) * a + Math.abs(SHADE_Z) * r;
        const bz = Math.abs(SHADE_Z) * a + Math.abs(SHADE_X) * r;

        const i0 = Math.max(Math.ceil((ex - bx - x0) / ss), 1);
        const i1 = Math.min(Math.floor((ex + bx - x0) / ss), lw - 2);
        const j0 = Math.max(Math.ceil((ez - bz - z0) / ss), 1);
        const j1 = Math.min(Math.floor((ez + bz - z0) / ss), lh - 2);

        for (let j = j0; j <= j1; j++) {
          const dz = z0 + j * ss - ez;
          for (let i = i0; i <= i1; i++) {
            const dx = x0 + i * ss - ex;
            const u = (dx * SHADE_X + dz * SHADE_Z) / a;
            const v = (dz * SHADE_X - dx * SHADE_Z) / r;
            const q = 1 - (u * u + v * v);
            if (q <= 0) continue;
            const o = OCCLUSION * ease(q);
            const at = j * lw + i;
            if (o > O[at]!) O[at] = o;
          }
        }
      }
    }
  }
  return O;
}

/** One level's surface over a square block of its own grid: the heights, the
    shading normals and the marched shadow, with nothing about where the
    numbers are going. */
type Surface = {
  y: Float32Array;
  normal: Float32Array;
  shadow: Float32Array;
  cover: Float32Array;
  min: number;
  max: number;
};

/* ── A patch of one level's surface ─────────────────────────────────────
   The whole of a chunk is `buildSurface(corner, size, 0, 0, SEG)`, and §25's
   morph target is the *parent's* level over the quarter of it this chunk
   covers: same function, coarser size, offset into the parent's grid. It is
   one function rather than two so that the target is the parent's own
   arithmetic and not a re-derivation of it — a morph that lands on
   something the parent would not have drawn is a pop with extra steps.

   (ox, oz) is the level's grid origin, `size` its chunk size, and the block
   runs from grid index (i0, j0) for n quads a side. */
function buildSurface(ox: number, oz: number, size: number, i0: number, j0: number, n: number): Surface {
  const spacing = size / SEG;
  const w = n + 1;

  /* SPAN vertices of padding on every side, sampled from the same field, so
     the central differences below are exact at the block's own edge. Two
     chunks of the same level therefore agree on the normal along their
     shared edge as well as on the height — the seam is invisible rather
     than merely closed. */
  const pw = w + SPAN * 2;
  const H = new Float32Array(pw * pw);
  for (let j = -SPAN; j <= n + SPAN; j++) {
    const wz = oz + (j0 + j) * spacing;
    for (let i = -SPAN; i <= n + SPAN; i++) {
      H[(j + SPAN) * pw + (i + SPAN)] = height(ox + (i0 + i) * spacing, wz, spacing);
    }
  }

  /* The shadow lattice, coarser than the vertices and interpolated onto
     them. SHADOW_SEG divides SEG, so every fourth vertex sits exactly on a
     lattice point and the interpolation is only doing work between them —
     a shadow edge is tens of units across at this sun elevation, so
     resolving it at 8 units of ground and softening the rest is the whole
     of what a march this expensive can afford.

     Clamped at the top edge so the last row of vertices interpolates inside
     the last cell rather than off the end of the lattice. Both ends of the
     morph go through the same clamp, so a parent patch agrees with the
     parent's own chunk about it. */
  const ss = size / SHADOW_SEG;
  const cs = Math.max(ss, COARSE);
  const per = SHADOW_SEG / SEG;
  const cell = (index: number) => Math.min(Math.floor(index * per), SHADOW_SEG - 1);

  /* Padding around the cells the block touches: one ring because the
     landform gradient differences across a whole cell either side, and — since
     §27 — a second on the high side, because the *cover* at an interpolated
     lattice point needs that gradient at the point above it as well. The
     extra ring is heights only. Nothing marches or grows there, which is why
     the loop below has an interior test on it rather than filling
     everything: only [1, l-2] is ever read by the interpolation, and the
     shadow march is the most expensive thing in this file. */
  const lx = cell(i0) - 1;
  const lz = cell(j0) - 1;
  const lw = cell(i0 + n) + 3 - lx;
  const lh = cell(j0 + n) + 3 - lz;
  const S = new Float32Array(lw * lh);
  const C = new Float32Array(lw * lh);
  const V = new Float32Array(lw * lh);
  for (let j = 0; j < lh; j++) {
    const wz = oz + (lz + j) * ss;
    for (let i = 0; i < lw; i++) {
      const wx = ox + (lx + i) * ss;
      // The landform height at this lattice point, which three things read.
      C[j * lw + i] = height(wx, wz, cs);
    }
  }
  const O = ss <= OBJECT_SS ? occlusion(ox + lx * ss, oz + lz * ss, ss, lw, lh) : null;

  const cinv = 1 / (2 * ss);
  for (let j = 1; j < lh - 1; j++) {
    const wz = oz + (lz + j) * ss;
    for (let i = 1; i < lw - 1; i++) {
      const wx = ox + (lx + i) * ss;
      const at = j * lw + i;
      const c = C[at]!;
      /* From that coarse surface, which is also the one being marched: a
         vertex sitting in a detail dip is *below* the field the ray travels
         over, and starting there would shadow every hollow in the world. */
      S[at] = O ? sunlight(wx, wz, c) * (1 - O[at]!) : sunlight(wx, wz, c);
      /* §27 — the density, off the *landform* gradient rather than the
         surface's own, for the same reason the shading normal is (LANDFORM
         above): a 14-unit detail bump is 23° of tilt and would strip the
         cover off half of a meadow in stripes. `cover.ts` owns what the
         number means; this is only where the field is sampled. */
      const slope = Math.hypot(C[at + 1]! - C[at - 1]!, C[at + lw]! - C[at - lw]!) * cinv;
      V[at] = coverAt(c, slope, rangeMask(landform(wx, wz, cs), uplift(wx, wz)), wx, wz);
    }
  }

  const y = new Float32Array(w * w);
  const normal = new Float32Array(w * w * 3);
  const shadow = new Float32Array(w * w);
  const cover = new Float32Array(w * w);

  let min = Infinity;
  let max = -Infinity;
  const inv = 1 / (2 * SPAN * spacing);

  for (let j = 0; j <= n; j++) {
    const gj = cell(j0 + j);
    const cj = gj - lz;
    const tj = ease((j0 + j) * per - gj);
    for (let i = 0; i <= n; i++) {
      const p = (j + SPAN) * pw + (i + SPAN);
      const h = H[p]!;
      if (h < min) min = h;
      if (h > max) max = h;
      y[j * w + i] = h;

      const gi = cell(i0 + i);
      const ci = gi - lx;
      const ti = ease((i0 + i) * per - gi);
      const at = (G: Float32Array) => {
        const a = G[cj * lw + ci]!;
        const b = G[cj * lw + ci + 1]!;
        const c = G[(cj + 1) * lw + ci]!;
        const d = G[(cj + 1) * lw + ci + 1]!;
        return (a + (b - a) * ti) * (1 - tj) + (c + (d - c) * ti) * tj;
      };
      shadow[j * w + i] = at(S);
      cover[j * w + i] = at(V);

      /* The shading normal, and it is **not** the surface's own. See LANDFORM
         above: the fine gradient is differenced over SPAN samples and then
         mixed a third of the way into the landform gradient off the coarse
         lattice, which is what stops a hard band edge from finding the
         detail layer. Nothing else reads a normal, so there is one
         attribute and it is this one. */
      const cx = ((C[cj * lw + ci + 1]! - C[cj * lw + ci - 1]!) * (1 - tj)
        + (C[(cj + 1) * lw + ci + 1]! - C[(cj + 1) * lw + ci - 1]!) * tj) * cinv;
      const cz = ((C[(cj + 1) * lw + ci]! - C[(cj - 1) * lw + ci]!) * (1 - ti)
        + (C[(cj + 1) * lw + ci + 1]! - C[(cj - 1) * lw + ci + 1]!) * ti) * cinv;

      const dx = (H[p + SPAN]! - H[p - SPAN]!) * inv * LANDFORM + cx * (1 - LANDFORM);
      const dz = (H[p + pw * SPAN]! - H[p - pw * SPAN]!) * inv * LANDFORM + cz * (1 - LANDFORM);
      const len = Math.hypot(dx, 1, dz);
      const v = (j * w + i) * 3;
      normal[v] = -dx / len;
      normal[v + 1] = 1 / len;
      normal[v + 2] = -dz / len;
    }
  }

  return { y, normal, shadow, cover, min, max };
}

export function buildChunk(spec: ChunkSpec): ChunkData {
  const { x, z, size, drop, quadrant } = spec;
  const spacing = size / SEG;
  const w = SEG + 1;

  const base = buildSurface(x, z, size, 0, 0, SEG);

  const position = new Float32Array(VERTEX_COUNT * 3);
  const normal = new Float32Array(VERTEX_COUNT * 3);
  const shadow = new Float32Array(VERTEX_COUNT);
  const cover = new Float32Array(VERTEX_COUNT);
  const morphY = new Float32Array(VERTEX_COUNT);
  const morphNormal = new Float32Array(VERTEX_COUNT * 3);
  const morphShadow = new Float32Array(VERTEX_COUNT);
  const morphCover = new Float32Array(VERTEX_COUNT);

  normal.set(base.normal);
  shadow.set(base.shadow);
  cover.set(base.cover);
  for (let j = 0; j <= SEG; j++) {
    for (let i = 0; i <= SEG; i++) {
      const v = (j * w + i) * 3;
      /* Local to the chunk's own corner. A world-space buffer would be
         hundreds of thousands of units from the origin after a long flight
         and would quantise visibly in a float32; the mesh carries the
         offset in its matrix, which is a float64 on the CPU. */
      position[v] = i * spacing;
      position[v + 1] = base.y[j * w + i]!;
      position[v + 2] = j * spacing;
    }
  }

  /* ── The morph target ──────────────────────────────────────────────────
     Every vertex of a chunk lies on the parent's *drawn* surface, not just
     near it: at even indices it is a parent vertex, at odd ones it is the
     midpoint of a parent edge — and the diagonal of `grid.ts`'s
     triangulation is self-similar under a halving, so the child's diagonal
     lies along the parent's wherever the two cross. So the target is the
     average of at most two parent vertices, which is exactly what the
     parent's rasteriser interpolates there, for all three attributes.

     A chunk fully morphed is therefore its parent, to the bit — which is
     what makes the swap at the split distance a no-op rather than a small
     pop. */
  let swing = 0;
  if (quadrant) {
    const half = SEG / 2;
    const pw = half + 1;
    const parent = buildSurface(
      x - quadrant.x * size,
      z - quadrant.z * size,
      size * 2,
      quadrant.x * half,
      quadrant.z * half,
      half,
    );

    for (let j = 0; j <= SEG; j++) {
      for (let i = 0; i <= SEG; i++) {
        const odd = i & 1;
        const oddj = j & 1;
        let a: number;
        let b: number;
        if (odd && oddj) {
          // The centre of a parent cell, which is the midpoint of its
          // diagonal edge and not of its corners.
          a = ((j - 1) / 2) * pw + (i + 1) / 2;
          b = ((j + 1) / 2) * pw + (i - 1) / 2;
        } else if (odd) {
          a = (j / 2) * pw + (i - 1) / 2;
          b = (j / 2) * pw + (i + 1) / 2;
        } else if (oddj) {
          a = ((j - 1) / 2) * pw + i / 2;
          b = ((j + 1) / 2) * pw + i / 2;
        } else {
          a = (j / 2) * pw + i / 2;
          b = a;
        }

        const s = j * w + i;
        const dy = (parent.y[a]! + parent.y[b]!) * 0.5 - base.y[s]!;
        morphY[s] = dy;
        if (Math.abs(dy) > swing) swing = Math.abs(dy);
        morphShadow[s] = (parent.shadow[a]! + parent.shadow[b]!) * 0.5 - base.shadow[s]!;
        morphCover[s] = (parent.cover[a]! + parent.cover[b]!) * 0.5 - base.cover[s]!;
        for (let k = 0; k < 3; k++) {
          morphNormal[s * 3 + k] =
            (parent.normal[a * 3 + k]! + parent.normal[b * 3 + k]!) * 0.5 - base.normal[s * 3 + k]!;
        }
      }
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
    cover[o] = cover[surface]!;
    // The apron's morph is its edge's, so it hangs from the edge wherever
    // the morph has put it rather than from where it started.
    morphY[o] = morphY[surface]!;
    morphNormal[d] = morphNormal[s]!;
    morphNormal[d + 1] = morphNormal[s + 1]!;
    morphNormal[d + 2] = morphNormal[s + 2]!;
    morphShadow[o] = morphShadow[surface]!;
    morphCover[o] = morphCover[surface]!;
    o++;
  };
  for (let k = 0; k <= SEG; k++) hang(k);
  for (let k = 0; k <= SEG; k++) hang(SEG * w + k);
  for (let k = 0; k <= SEG; k++) hang(k * w);
  for (let k = 0; k <= SEG; k++) hang(k * w + SEG);

  /* Widened by the morph, because the bounding sphere has to hold the chunk
     at every weight it will be drawn at and not only at its own. */
  return {
    position,
    normal,
    shadow,
    cover,
    morphY,
    morphNormal,
    morphShadow,
    morphCover,
    min: base.min - drop - swing,
    max: base.max + swing,
  };
}
