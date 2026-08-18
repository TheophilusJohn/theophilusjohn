/* §0.2 — what *stands* on the ground, as a pure function of (x, z).

   `cover.ts` answers "does anything grow at (x, z)" and hands back one
   density that both the terrain tint and the blade disc read. This is the
   other half of the same question: given that something grows there, what is
   standing up in it. Two species, and §0.2 names both — **conifers** ("pines
   and low scrub, high country", decided at §24 and not open) and **stone**
   ("scattered stone on slopes and scree at the foot of cliffs does more for
   scale than trees do, because it reads at every distance").

   Its own module rather than more of `cover.ts` because the two are read by
   different people. A ground density is one number per vertex and the worker
   bakes it; a stand is a *list of objects with sizes*, and what reads it is
   an instance buffer on the main thread and — for the conifers only — the
   shadow the worker already marches. Nothing here imports three, for the
   same reason nothing in `height.ts`, `cover.ts`, `sun.ts` or `wind.ts` does:
   `chunk.ts` runs it in the worker, `stands.ts` runs it on the main thread,
   and Node runs it to report on it.

   ── The grid ───────────────────────────────────────────────────────────
   Everything here is keyed to a **world-fixed cell**, which is the whole of
   how §0.2's rule is kept: "no storage, no seeds carried between chunks, no
   lists". Conifer 1 of cell (i, j) is the same tree, the same height, at the
   same angle, whether it is being asked for by the main thread to be drawn
   or by a worker three levels away deciding how dark the ground under it is.
   That is not tidiness — the shadow is baked in one place and the tree is
   drawn in another, and a disagreement between them is a pool of shade with
   nothing standing in it. */

import { coverAt, hash3, paved, ramp } from './cover';
import { CLUSTER_SITE, SWELL_REACH, WATER, height, landform, rangeMask, noise2, uplift } from './height';

/* One cell is sixteen units and holds up to two of each. At full density
   that is a conifer every eleven units, which is a stand rather than a
   plantation, and it is the number both fills are budgeted against: the
   worker walks about ninety of these to bake the shade over a level-0 chunk,
   and the main thread's grid is 76 cells a side, so a diagonal crossing at
   boost turns over 24 cells a frame against a budget of 128. */
export const CELL = 16;
export const TREES = 2;
export const ROCKS = 2;

/* ── What the field is asked at ─────────────────────────────────────────
   `chunk.ts`'s COARSE, to the unit, and stated again here rather than
   imported because `chunk.ts` imports *this*. Two reasons it is the coarse
   field rather than the drawn one, and they point the same way: it is the
   surface the shadow is marched over (§23), and it is about 60% of a full
   evaluation — which is what makes the worker able to afford asking about
   a hundred and fifty cells a chunk.

   SPAN is a forward difference rather than a central one. Four samples to
   decide whether a tree stands somewhere is three too many, and every term
   below is a soft ramp over it. */
export const SPACING = 16;
const SPAN = 8;

/* ── Where conifers are ─────────────────────────────────────────────────
   **The treeline is the point of this species.** §28's own test is that
   altitude is readable from the cover alone — that you can see, from above,
   where the forest stops — so the altitude window is the one term here that
   is a look rather than a plausibility. `cover.ts` thins grass from 34 and
   ends it at 88; conifers end at 58, which is inside the range mask's own
   country and leaves the crests and everything over them bare. Measured
   against the field's distribution (§26's lattice), 40–60 is 8.3% of the
   world and everything over 60 is 2.7%, so a treeline at 58 is a line the
   ranges stand out of rather than a line in open country nobody flies past.

   Slope is more tolerant than grass's (0.38 → 0.95): a conifer holds ground
   at 46° that will not hold a meadow, which is what puts trees on the sides
   of the valleys and not only in the bottoms. */
const TREE_FULL = 30;
const TREE_NONE = 58;
const TREE_SLOPE_FULL = 0.45;
const TREE_SLOPE_NONE = 1.05;

/* Clear of the water plane by more than `cover.ts`'s 0.4, because a cell is
   twelve units across and a tree is placed anywhere inside it: the density
   is decided at the centre and the shoreline is not flat. The per-tree test
   in `conifer` below is what actually keeps them dry; this is the term that
   stops the density from being wasted on a cell that is mostly lake. */
const TREE_WET = 2.5;

/* Less than grass loses to the range mask (0.55). Conifers *are* the high
   country here — what takes them off a summit is the altitude window above,
   not the mask. */
const TREE_MASK_THIN = 0.45;

/* ── Clumping ───────────────────────────────────────────────────────────
   A forest is bigger than a meadow, so this is 190 units where `cover.ts`
   clumps at 76 — and thresholded the same way, because the whole point is
   that a forest has an edge. The offsets share no lattice with the terrain's
   octaves or with the meadow noise, so a stand of conifers is not the same
   shape as the grass under it.

   It is also the **early-out**: one noise, no field sample, and the worker
   rejects about two thirds of the cells it has to consider before paying
   for any of them. That is most of what makes baking the shade affordable. */
const TREE_CLUMP = 190;
const TREE_CLUMP_LOW = -0.06;
const TREE_CLUMP_HIGH = 0.34;
const TREE_CLUMP_OFF_X = -1180.5;
const TREE_CLUMP_OFF_Z = 377.2;

/* Rejection rather than a scale, for `cover.ts`'s reason: thin forest is
   scattered trees, not a stand of small ones. */
const TREE_KEEP = 0.55;

/* 5.5 to 12.5 units. §24's camera floor is six units over the ground, so the
   tallest of these is a thing the reader flies *through* rather than over,
   which is the one honest way a landscape says how big it is. */
const TREE_H_MIN = 5.5;
export const TREE_H_MAX = 12.5;

/* The canopy's base radius as a fraction of the tree's own height: 1.0 to
   3.8 units at these heights, which is a conifer rather than a broadleaf.
   It is a fraction rather than a length so that one scale in the shader
   carries the whole instance — see `stands.ts`. */
const TREE_W_MIN = 0.19;
export const TREE_W_MAX = 0.30;

/* Where the canopy's mass is and how wide, in units of the tree's own height
   and its own width. **Exported because the shadow is baked somewhere else:**
   `chunk.ts` projects this sphere onto the ground and the geometry in
   `stands.ts` is built around it, and the two have to be the same tree. */
export const CANOPY_Y = 0.55;
export const CANOPY_R = 0.82;

/* ── Where stone is ─────────────────────────────────────────────────────
   The complement of a meadow, and it is a slope band rather than a
   threshold: nothing collects on flat ground and nothing stays on a cliff
   face, so scree lives in between — 15° to 39° for the full amount, gone by
   62°. Which is where the foot of a cliff is, without anything here having
   to know what a cliff is.

   Then two terms that put stone where growth is not. Altitude, because above
   the treeline there is nothing else left; and the ground cover itself,
   subtracted — `coverAt` is already the answer to "is this a meadow", and a
   boulder field in a meadow is a different landscape. */
const ROCK_SLOPE_IN = 0.26;
const ROCK_SLOPE_FULL = 0.80;
const ROCK_SLOPE_HIGH = 1.35;
const ROCK_SLOPE_OUT = 1.95;
const ROCK_BASE = 0.16;
const ROCK_ALT_LOW = 34;
const ROCK_ALT_HIGH = 78;
const ROCK_ALT_GAIN = 0.5;
const ROCK_COVER_THIN = 0.6;

const ROCK_CLUMP = 95;
const ROCK_CLUMP_LOW = -0.20;
const ROCK_CLUMP_HIGH = 0.34;
const ROCK_CLUMP_OFF_X = 2044.9;
const ROCK_CLUMP_OFF_Z = -1377.6;
const ROCK_KEEP = 0.4;

/* 0.75 to 4 units on the long axis, squared so the big ones are rare, and
   the three axes are hashed apart — a boulder is not a sphere and a scree
   field of spheres reads as gravel rendered large. */
const ROCK_MIN = 0.75;
const ROCK_MAX = 4;
const ROCK_WIDE = 0.6;
const ROCK_WIDE_RANGE = 0.55;
/* Flatter than it is wide, always. A boulder as tall as it is broad is a
   crystal — measured on the first build, and a slope of them read as a
   scatter of floating diamonds rather than as stone. */
const ROCK_TALL = 0.3;
const ROCK_TALL_RANGE = 0.34;

/** The ground a scatter cell stands on: three numbers, three field samples,
    and both densities below are functions of them. Kept apart from the
    densities because the worker wants only one of the two and the main
    thread wants both, and neither should pay for the field twice. */
export type Ground = { h: number; slope: number; mask: number };

/* `h` is passed in wherever the caller has already taken it, which both of
   them have: the second early-out below is one field sample, and re-sampling
   it here would give the cheap rejection back. */
export function groundAt(x: number, z: number, h = height(x, z, SPACING)): Ground {
  const hx = height(x + SPAN, z, SPACING);
  const hz = height(x, z + SPAN, SPACING);
  return {
    h,
    slope: Math.hypot(hx - h, hz - h) / SPAN,
    mask: rangeMask(landform(x, z, SPACING), uplift(x, z)),
  };
}

/** The conifer clump alone: one noise and no field sample. Asked first
    everywhere, because two thirds of the cells anyone considers are outside
    a forest and this is what makes them free. */
export function treeClump(x: number, z: number): number {
  /* The bare disc is folded in *here* rather than into `treeDensity`, and
     that is the point: `chunk.ts` bakes the shade under a conifer in a
     worker and `stands.ts` draws the conifer on the main thread, and they
     agree only because both ask the same function the same question. A
     factor either of them could forget to apply is a pool of shade with
     nothing standing in it. This one they cannot forget — it is inside the
     number they both already read. */
  const bare = ramp(BARE_IN, BARE_OUT, Math.hypot(x - CLUSTER_SITE.x, z - CLUSTER_SITE.z));
  return bare * paved(x, z) * ramp(
    TREE_CLUMP_LOW,
    TREE_CLUMP_HIGH,
    noise2((x + TREE_CLUMP_OFF_X) / TREE_CLUMP, (z + TREE_CLUMP_OFF_Z) / TREE_CLUMP),
  );
}

export function rockClump(x: number, z: number): number {
  return paved(x, z) * ramp(
    ROCK_CLUMP_LOW,
    ROCK_CLUMP_HIGH,
    noise2((x + ROCK_CLUMP_OFF_X) / ROCK_CLUMP, (z + ROCK_CLUMP_OFF_Z) / ROCK_CLUMP),
  );
}

/** The altitude window and the water margin off **one** field sample, which
    is the second early-out and the one that pays: it takes the two fifths of
    the world that is lake or summit for a third of what the full question
    costs, and the caller keeps the height it sampled. */
export function treeBand(h: number): number {
  if (h < WATER + TREE_WET) return 0;
  return ramp(TREE_NONE, TREE_FULL, h);
}

/** How many of a cell's conifer slots are filled, 0..1. `clump` is
    `treeClump` at the same point, which the caller already asked for. */
/* ── The massif's own ground is bare (§34) ──────────────────────────────
   Nothing grows inside the swell's footprint, and it is a performance
   decision written as a placement rule because that is the only place it can
   be written *once*.

   §34 moves the ground under Homonoia by up to thirty units when a term
   ends, and what stands on it has to move with it. Done in the shader — a
   gated lift in `stands.ts`'s vertex stage — it cost **0.22 ms a frame at
   every pose in the world**, measured at the Enargeia settle a kilometre
   away, which is more than the whole landscape and more than the four scenes
   put together. What it bought: **twelve conifers**, ten of which move more
   than three units, and **no ground cover at all** — `coverAt` is already
   zero over the entire 306-unit disc, so the grass never needed it.

   Twelve trees are not worth a fifth of a millisecond everywhere. Taking
   them out is free, it is a pure function of (x, z) so the worker and the
   main thread still agree about where a tree is and how dark the ground
   under it is, and it is the picture the massif already had: §28's own test
   is that the treeline is readable from above, and the cluster's five
   summits stand at 41 to 105 against a treeline of 58. The disc is 282 to
   398 units, ramped, so there is no edge to see — and nothing to see it in.

   The other three readers of the swell stay: the terrain is the ground, the
   camera's floor is a guarantee, and `built.ts`'s masts are the thing the
   term is about. */
const BARE_IN = SWELL_REACH * 0.92;
const BARE_OUT = SWELL_REACH * 1.3;

export function treeDensity(g: Ground, clump: number): number {
  let d = treeBand(g.h) * ramp(TREE_SLOPE_NONE, TREE_SLOPE_FULL, g.slope);
  if (d <= 0) return 0;
  d *= 1 - TREE_MASK_THIN * Math.min(Math.max(g.mask, 0), 1);
  return Math.min(d * clump, 1);
}



export function rockDensity(g: Ground, clump: number, x: number, z: number): number {
  if (g.h < WATER) return 0;
  const held = ramp(ROCK_SLOPE_IN, ROCK_SLOPE_FULL, g.slope) * ramp(ROCK_SLOPE_OUT, ROCK_SLOPE_HIGH, g.slope);
  const bare = ramp(ROCK_ALT_LOW, ROCK_ALT_HIGH, g.h);
  let d = ROCK_BASE + (1 - ROCK_BASE) * held + ROCK_ALT_GAIN * bare;
  d *= 1 - ROCK_COVER_THIN * coverAt(g.h, g.slope, g.mask, x, z);
  return Math.min(d * clump, 1);
}

/* ── One object ─────────────────────────────────────────────────────────
   `hash3` is `cover.ts`'s integer mix, and the reason it is a hash rather
   than a random is the reason this whole file is a pure function: conifer 1
   of cell (i, j) has to come back the same after a flight to the other side
   of the world, in whichever of the three workers happens to ask, and in
   whatever order the cells around the camera are filled.

   Rocks take a key range of their own rather than sharing the trees', so
   that a cell which holds both does not place a boulder at the foot of every
   tree. */
const TREE_KEY = 0;
const ROCK_KEY = 64;

/** Conifer `k` of cell (ci, cj) into `out` — x, z, height, width, yaw and
    a stiffness — or false where there is none.

    The water test is here rather than at the cell, and it is the one place
    this file touches the field per *object*: a twelve-unit cell on a
    shoreline is half lake, and a conifer standing in one is the sort of
    thing nothing else in the pipeline can take back. It asks the coarse
    field, which is what the worker can afford and therefore what both ends
    must ask — `stands.ts` samples the drawn surface too, but only to stand
    the tree on it, never to decide whether it is there. */
export function conifer(
  ci: number,
  cj: number,
  k: number,
  density: number,
  out: Float32Array,
): boolean {
  const p = TREE_KEY + k * 8;
  if (hash3(ci, cj, p) * TREE_KEEP >= density) return false;
  const x = (ci + hash3(ci, cj, p + 1)) * CELL;
  const z = (cj + hash3(ci, cj, p + 2)) * CELL;
  if (height(x, z, SPACING) < WATER + TREE_WET) return false;
  out[0] = x;
  out[1] = z;
  out[2] = TREE_H_MIN + (TREE_H_MAX - TREE_H_MIN) * hash3(ci, cj, p + 3);
  out[3] = TREE_W_MIN + (TREE_W_MAX - TREE_W_MIN) * hash3(ci, cj, p + 4);
  out[4] = hash3(ci, cj, p + 5) * Math.PI * 2;
  out[5] = hash3(ci, cj, p + 6);
  return true;
}

/** Boulder `k` of cell (ci, cj) into `out` — x, z, three half-axes and a
    yaw. No field sample: a boulder casts nothing into the baked shadow (see
    `chunk.ts` — three units of shadow on an eight-unit lattice is nothing),
    so nothing but `stands.ts` ever asks, and `stands.ts` has the drawn
    height in its hand already. */
export function boulder(
  ci: number,
  cj: number,
  k: number,
  density: number,
  out: Float32Array,
): boolean {
  const p = ROCK_KEY + k * 8;
  if (hash3(ci, cj, p) * ROCK_KEEP >= density) return false;
  const size = ROCK_MIN + (ROCK_MAX - ROCK_MIN) * hash3(ci, cj, p + 3) ** 2;
  out[0] = (ci + hash3(ci, cj, p + 1)) * CELL;
  out[1] = (cj + hash3(ci, cj, p + 2)) * CELL;
  out[2] = size * (ROCK_WIDE + ROCK_WIDE_RANGE * hash3(ci, cj, p + 4));
  out[3] = size * (ROCK_TALL + ROCK_TALL_RANGE * hash3(ci, cj, p + 5));
  out[4] = size * (ROCK_WIDE + ROCK_WIDE_RANGE * hash3(ci, cj, p + 6));
  out[5] = hash3(ci, cj, p + 7) * Math.PI * 2;
  return true;
}
