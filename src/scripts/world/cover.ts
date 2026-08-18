/* §0.2 — where things grow, as a pure function of (x, z).

   This is the placement rule §27, §28 and §30 all stand on, and §0.2 is
   explicit that it is not negotiable: "everything scattered on this terrain
   is placed by a function of (x, z) and nothing else. No storage, no seeds
   carried between chunks, no lists." Chunks are generated in three workers
   in whatever order they are asked for and cached by coordinate for the life
   of the page (§22); anything stateful would make two chunks disagree about
   what stands on their shared edge, and there is no frame in which that
   disagreement is not a visible seam.

   Pure like `height.ts` and `wind.ts`, and for the same reason: it runs in
   the worker (through `chunk.ts`, which bakes the density onto the ground so
   the terrain is tinted where growth is at *every* distance) and on the main
   thread (through `blades.ts`, which stands instances up in the near field).
   Both callers reach the same density through `coverAt`, and they differ only
   in how they sampled the field to ask — the worker off the coarse lattice it
   already built, the disc off its own three samples. Nothing here imports
   three, so Node runs it and the numbers in the §27 report are this
   function's own output.

   §0.2 lists the four inputs and they are all already computed: altitude
   (a treeline, and nothing above it), slope (nothing on anything steeper
   than it could hold), the range mask (sparse on high ground, dense in
   sheltered country) and water proximity (denser near it). Then a
   low-frequency noise for clumping, because uniform scatter is the tell that
   something was placed by a computer. */

import { CITY_SITES, WATER, height, landform, noise2, rangeMask, uplift } from './height';

/* ── Altitude ───────────────────────────────────────────────────────────
   The field runs -24.6 to 126.2 inside the bounded world with a mean of 11.2
   and 40% of it under zero (§24, measured in Node), so 34 is a little above
   the open country everything grows in and 88 leaves the top of every range
   bare. It is not a treeline yet — §28 puts conifers under one — but it is
   the same curve, and ground cover has to stop before the rock does or the
   summits read as lawn. */
const ALT_FULL = 34;
const ALT_NONE = 88;

/* ── Slope ──────────────────────────────────────────────────────────────
   Gradient magnitude, so 0.38 is 21° and 0.95 is 44°. Scree and cliff faces
   come back bare, which is what makes the crests read as rock rather than as
   ground that happens to be lit differently. */
const SLOPE_FULL = 0.38;
const SLOPE_NONE = 0.95;

/* ── Water ──────────────────────────────────────────────────────────────
   Nothing under the surface, and half again as much within nine units above
   it — which is `height.ts`'s own water level rather than a second number,
   and the reason `WATER` lives with the field (§26). The margin over the
   level is because the *drawn* ground is up to half a unit from the field
   under LOD (§25), and a blade whose base is under the water plane is a
   blade growing out of a lake. */
const WET = 9;
const WET_GAIN = 0.5;
const MARGIN = 0.4;

/* How much of its density high country loses. Not all of it: a mask of 1 is
   the middle of a range, and moss on rock is the thing that keeps a summit
   from reading as a different material from the valley. */
const MASK_THIN = 0.55;

/* ── Clumping ───────────────────────────────────────────────────────────
   Two scales. The long one decides where there is cover at all and is
   thresholded rather than faded, so ground cover has edges — a meadow ends.
   The short one varies the density inside a patch, which is what stops the
   edge from being the only structure in it. Both are `height.ts`'s own noise
   at offsets nothing else uses, so the pattern shares no lattice with the
   terrain and cannot line its features up on it. */
const CLUMP = 76;
const CLUMP_LOW = -0.16;
const CLUMP_HIGH = 0.42;
const PATCH = 21;
const PATCH_FLOOR = 0.55;

const CLUMP_OFF_X = 813.7;
const CLUMP_OFF_Z = -502.4;
const PATCH_OFF_X = -271.1;
const PATCH_OFF_Z = 640.3;

/* Exported since §28: `scatter.ts` ramps six terms of its own over the same
   inputs, and two copies of a smoothstep between two named ends is two
   places for one of them to acquire a different clamp. */
export const ramp = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/* ── Paved ground (§36) ─────────────────────────────────────────────────
   Nothing grows in a street. The two cities are the first thing in this
   world that *replaces* the ground rather than standing on it, and the
   failure without this is not subtle: a 16-unit scatter cell inside a tight
   grid of towers puts conifers through the walls, and a blade disc under a
   downtown reads as a ruin.

   It is one disc per city with a ramp, exactly as §34's massif is, and it is
   here rather than in `scatter.ts` because §36 needs it on *both* surfaces —
   the conifers and the stone that `scatter.ts` places, and the ground cover
   the worker bakes as a tint and `blades.ts` stands instances in. One
   expression, three readers, and the worker never has to know what a city is
   made of: `height.ts` carries the two centres for exactly that reason.

   The ramp is a third of the reach wide, so the city's own ground is bare,
   the country around it is not, and there is no edge between them to see. */
const PAVED_OUT = 1.34;

export function paved(x: number, z: number): number {
  let f = 1;
  for (const c of CITY_SITES) {
    const d = Math.hypot(x - c.x, z - c.z);
    if (d < c.reach * PAVED_OUT) f *= ramp(c.reach, c.reach * PAVED_OUT, d);
    if (f <= 0) return 0;
  }
  return f;
}

/* How much cover the ground at (x, z) supports, 0..1, given what the caller
   already knows about the field there. `h` is the surface height, `slope` the
   magnitude of its gradient, `mask` the range mask — the two ends of §27 pass
   their own samples of those, which is the point of the split: the worker's
   are differenced off the coarse lattice it built for the shadow march and
   the disc's are its own, and neither has to re-derive the other's. */
export function coverAt(h: number, slope: number, mask: number, x: number, z: number): number {
  if (h < WATER + MARGIN) return 0;

  let d = ramp(ALT_NONE, ALT_FULL, h) * ramp(SLOPE_NONE, SLOPE_FULL, slope);
  if (d <= 0) return 0;

  d *= 1 - MASK_THIN * Math.min(Math.max(mask, 0), 1);
  d *= 1 + WET_GAIN * ramp(WATER + WET, WATER + MARGIN, h);

  const clump = ramp(
    CLUMP_LOW,
    CLUMP_HIGH,
    noise2((x + CLUMP_OFF_X) / CLUMP, (z + CLUMP_OFF_Z) / CLUMP),
  );
  if (clump <= 0) return 0;
  const patch =
    PATCH_FLOOR +
    (1 - PATCH_FLOOR) *
      (noise2((x + PATCH_OFF_X) / PATCH, (z + PATCH_OFF_Z) / PATCH) * 0.5 + 0.5);

  return Math.min(d * clump * patch, 1) * paved(x, z);
}

/* The same density, sampling the field itself: `blades.ts` uses this because
   it wants the gradient anyway, and the harness uses it because a density
   that can only be evaluated inside a worker cannot be reported on. Forward
   differences over SPAN rather than central ones — four samples to place a
   tuft of grass is three too many, and the term it feeds is a soft ramp. */
const SPAN = 4;

export function cover(x: number, z: number, spacing = 0): number {
  const h = height(x, z, spacing);
  const hx = height(x + SPAN, z, spacing);
  const hz = height(x, z + SPAN, spacing);
  const slope = Math.hypot(hx - h, hz - h) / SPAN;
  const mask = rangeMask(landform(x, z, spacing), uplift(x, z));
  return coverAt(h, slope, mask, x, z);
}

/* ── The jitter ─────────────────────────────────────────────────────────
   An integer hash rather than a random, for the rule at the top of this
   file: the third blade of cell (i, j) has to be in the same place, at the
   same angle, at the same size, whenever anything asks — this frame, after a
   flight to the other side of the world and back, or in whatever order the
   cells around the camera happen to be filled. Same mix as `height.ts`'s
   corner hash, which is where the constants come from. */
export function hash3(i: number, j: number, k: number): number {
  let h = Math.imul(i, 0x1657_1a2b) ^ Math.imul(j, 0x2f7d_9b3f) ^ Math.imul(k + 1, 0x6b43_a9f1);
  h = Math.imul(h ^ (h >>> 13), 0x4bf5_1a3d);
  h ^= h >>> 16;
  return (h >>> 8) / 0x100_0000;
}
