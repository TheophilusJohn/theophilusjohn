/* §0.2 — the height field.

   **Ridged multifractal over fBm**, which is the construction §0 asks for
   by name and the reason this reads as a landscape where §16–§20's five
   Gaussians did not. Two layers with different jobs:

   - an fBm at continental wavelength, which is the *landform*: where the
     ground is high and where it is low, and — through a mask taken off its
     own value — where there are ranges at all. Without it a ridged field
     is uniform mountains to the horizon in every direction, which is a
     texture rather than a place.
   - a ridged multifractal at range wavelength, which is the *relief*.
     `1 - |n|` folds the noise at zero so the maxima become creases rather
     than domes, squaring sharpens the crease into a crest, and Musgrave's
     weight term feeds each octave through the last so detail collects on
     the ridges and the valleys stay smooth. That last part is the whole
     difference between this and an fBm with a fold in it.

   **No three, no DOM, no imports.** This is the part of the render layer
   that can be checked without a GPU: Node imports the .ts directly, so the
   numbers in the §22 report are this function's own output rather than a
   re-derivation of it. `chunk.ts` runs it in a worker and §24's altitude
   clamp runs it on the main thread; both have to be the same function,
   and the only way to guarantee that is for there to be one.

   Everything is a pure function of (x, z) and the sample spacing. Nothing
   is cached, nothing is seeded at runtime, and the same coordinate gives
   the same height in the worker, in Node and at any LOD. */

/* ── Noise ──────────────────────────────────────────────────────────────
   Gradient noise, quintic interpolation, 16 gradients from an integer
   hash. Not simplex: the patent argument is spent but the corner-and-fade
   form is the one whose derivative behaves, and §23's shading normal
   differences it. A gradient *table* rather than an angle per corner — trig at four
   corners of every octave of every vertex is most of the cost of the
   generator, and sixteen directions is enough that the repeat never shows
   under nine octaves. */
const GRAD = new Float32Array(32);
for (let i = 0; i < 16; i++) {
  const a = (i * Math.PI) / 8;
  GRAD[i * 2] = Math.cos(a);
  GRAD[i * 2 + 1] = Math.sin(a);
}

function corner(ix: number, iy: number, dx: number, dy: number): number {
  let h = Math.imul(ix, 0x1657_1a2b) ^ Math.imul(iy, 0x2f7d_9b3f);
  h = Math.imul(h ^ (h >>> 13), 0x4bf5_1a3d);
  const g = ((h ^ (h >>> 16)) & 15) * 2;
  return GRAD[g]! * dx + GRAD[g + 1]! * dy;
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/* Roughly -1..1. Gradient noise on unit vectors peaks near 0.71 in 2D, so
   the 1.4 is the usual normalisation and not a taste value. */
export function noise2(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fade(fx);
  const v = fade(fy);
  const a = corner(ix, iy, fx, fy);
  const b = corner(ix + 1, iy, fx - 1, fy);
  const c = corner(ix, iy + 1, fx, fy - 1);
  const d = corner(ix + 1, iy + 1, fx - 1, fy - 1);
  const top = a + u * (b - a);
  const bot = c + u * (d - c);
  return (top + v * (bot - top)) * 1.4;
}

/* Per-octave offsets, so the two layers and their octaves do not share the
   lattice and line their features up on it. Fixed, because the field has to
   be identical in the worker, in Node and across reloads. */
const OFF_X = [0, 137.31, -61.09, 302.77, 88.41, -244.13, 19.87, 411.63, -155.2];
const OFF_Z = [0, -73.55, 218.02, 44.19, -329.6, 127.44, -12.35, 260.81, 93.7];

/* ── Nyquist ────────────────────────────────────────────────────────────
   An octave whose wavelength is under about four samples is not detail at
   that LOD, it is aliasing: the coarse ring would sample it at a different
   phase every time the camera moved and the far ground would crawl. Fading
   it out over 2–4 samples per wavelength rather than cutting it is what
   keeps a level's terrain from stepping when the band closes.

   It also *is* the LOD: a level-4 chunk drops five of the nine octaves, so
   it costs about half a level-0 chunk to generate as well as a sixteenth as
   many vertices. Both fall out of one term.

   The cost is that two levels disagree about height by the amplitude of the
   octaves between them, which is what the skirts in `chunk.ts` are for. */
function band(wavelength: number, spacing: number): number {
  if (spacing <= 0) return 1;
  const s = wavelength / spacing;
  if (s >= 4) return 1;
  if (s <= 2) return 0;
  const t = (s - 2) / 2;
  return t * t * (3 - 2 * t);
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/* Sum of 0.5^i, so both layers come back in a known range whatever the
   octave count and whatever the band term drops. Normalising by the *full*
   sum rather than by the octaves that survived is deliberate: a coarse
   chunk should be a smoother version of the same terrain, not a rescaled
   one that meets the fine chunk at a different height. */
const norm = (octaves: number) => 2 - Math.pow(0.5, octaves - 1);

function fbm(x: number, z: number, freq: number, octaves: number, spacing: number): number {
  let sum = 0;
  let amp = 1;
  let f = freq;
  for (let i = 0; i < octaves; i++) {
    const w = band(1 / f, spacing);
    if (w <= 0) break;
    sum += amp * w * noise2(x * f + OFF_X[i]!, z * f + OFF_Z[i]!);
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm(octaves);
}

/* Musgrave's ridged multifractal. `weight` is the whole construction: each
   octave is multiplied by the last octave's value, so a flat valley
   suppresses everything above it and a crest lets the fine octaves through.
   Clamped at 1 or the cascade runs away. Returns 0..1. */
const RIDGE_GAIN = 2.4;

function ridged(x: number, z: number, freq: number, octaves: number, spacing: number): number {
  let sum = 0;
  let amp = 1;
  let f = freq;
  let weight = 1;
  for (let i = 0; i < octaves; i++) {
    const w = band(1 / f, spacing);
    if (w <= 0) break;
    let n = 1 - Math.abs(noise2(x * f + OFF_X[i]!, z * f + OFF_Z[i]!));
    n *= n;
    n *= weight;
    weight = Math.min(1, n * RIDGE_GAIN);
    sum += amp * w * n;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm(octaves);
}

/* ── Scale ──────────────────────────────────────────────────────────────
   One unit is about a metre and these are the numbers the whole world is
   read against, so they are here rather than in the renderer.

   RANGE_WAVELENGTH is the distance between one ridge system and the next,
   and it is what sets the pace of the flight: 8.4 seconds of travel at the
   camera's cruise, so a minute in one direction crosses seven of them.
   CONTINENT_WAVELENGTH is three times it, so a range belongs to a highland
   rather than standing on its own.

   The amplitudes are what the opening pose is composed against. Over a
   3,000-unit square the field runs -22.4 to 128.1 with a mean of 15.6 and
   38% of it inside one 16-unit bucket at the bottom — mountains standing in
   open country, rather than mountains everywhere. */
export const RANGE_WAVELENGTH = 380;
export const CONTINENT_WAVELENGTH = 1150;

const RANGE_OCTAVES = 7;
const CONTINENT_OCTAVES = 4;

/* A third layer, small and everywhere. The two above leave valley floors
   perfectly smooth — the range mask is near zero there by design, so the
   only thing under it is a continental fBm whose finest octave is 144 units
   across. Ground with no relief under 144 units does not read as ground: it
   reads as fog, or as a hole in the frame where the light is. This is the
   texture that says the flat part is a floor. It is outside the mask on
   purpose, and its finest octave is 14 units, which is still seven samples
   at level 0. */
const DETAIL_WAVELENGTH = 110;
const DETAIL_OCTAVES = 4;
const DETAIL_AMP = 7;

const CONTINENT_AMP = 40;
const RANGE_AMP = 76;

/* Where there are mountains at all. Taken off the continental value, so
   ranges follow the highlands and the low ground between them is open —
   the alternative is ridges edge to edge, which is a texture. */
const RANGE_MASK_LOW = -0.10;
const RANGE_MASK_HIGH = 0.42;

/* ── The cluster, as a modulation layer ────────────────────────────────
   §0.2: "the traffic heightfield from §16 does not disappear — it becomes
   a *layer* on the procedural base, raising ground where message density is
   high." So `h(p)` comes back as five Gaussians on a ring, and it is a
   *term* rather than the terrain.

   It does two things, and the second is what stops it being five lumps
   again. It raises the ground under the cluster, and it opens the range
   mask there — so what the traffic builds is a massif with crests of the
   same terrain everywhere else has, not a dome sitting on a plain.

   ── The massif is the half that does not move (§34) ─────────────────────
   Until §34 this term read `shares` and §16's note said the election would
   drive it. Two things were wrong with that and both are measured.

   **The clamp ate the shares.** At σ=160 against a 120-unit ring the five
   Gaussians overlap so heavily that the sum is over 1.4 everywhere inside
   the massif whatever the shares are: `uplift` came back **1.400 at all
   five nodes for `[1,0,0,0,0]` exactly as for equal shares**, so the ground
   heights under the cluster were 51.3 / 41.4 / 85.1 / 105.3 / 88.8 either
   way. Whatever the simulation did to the shares, the ground could not
   have answered.

   **And it should not be the massif that moves.** The massif is the
   biggest thing in §22's opening frame — the world's front door — and a
   term that ends every few seconds may not re-cut the horizon a reader is
   arriving at from three kilometres away. So the shape stays put and what
   answers the election is `swell` below: a *deviation*, one narrow summit
   per node, zero-mean by construction, so a term changes which of the five
   summits is the high one and leaves the mountain they stand on alone. */
export const CLUSTER_SITE = { x: -520, z: -900 };
export const CLUSTER_NODES = 5;
export const CLUSTER_RING = 120;
const CLUSTER_SIGMA = 160;
export const CLUSTER_REACH = CLUSTER_RING + CLUSTER_SIGMA * 3;
const CLUSTER_AMP = 26;

/** Where node `i` stands, on the ring the massif is built around. §34's
    scene puts a pylon on each of these and `swell` raises the one holding
    the term, so there is one answer to "where is node i" and the ground and
    the structure read it. */
export function clusterNode(i: number): { x: number; z: number } {
  const a = (i / CLUSTER_NODES) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CLUSTER_SITE.x + Math.cos(a) * CLUSTER_RING,
    z: CLUSTER_SITE.z + Math.sin(a) * CLUSTER_RING,
  };
}

/* 0 at the edge of reach, 1.4 across the middle of it. Shares-independent
   now, so this is the same number in the worker, on the main thread, in
   Node and at every LOD — which is what lets §34 leave the whole of chunk
   generation alone. */
export function uplift(x: number, z: number): number {
  let sum = 0;
  for (let i = 0; i < CLUSTER_NODES; i++) {
    const n = clusterNode(i);
    const dx = x - n.x;
    const dz = z - n.z;
    sum += Math.exp(-(dx * dx + dz * dz) / (2 * CLUSTER_SIGMA * CLUSTER_SIGMA));
  }
  return Math.min(sum, 1.4);
}

/* ── The swell, which is the election (§34) ─────────────────────────────
   The one thing on this site that could not be built by someone who had
   not implemented Raft (§4.7): a term ends and the landscape rearranges
   because a distributed system elected a different leader.

   **It is not part of `height()` and that is the load-bearing decision.**
   Everything the workers bake — the surface, its normals, the marched
   shadow, the cover density, and `scatter.ts`'s answer to where a conifer
   stands — is a pure function of (x, z) and has to stay one: a term that
   changed it would mean regenerating every chunk within 600 units on every
   election, and a placement that changed would put a baked pool of shade
   where no tree is standing. So the field the worker sees never moves, and
   the deviation is carried on the main thread instead: `terrain.ts` adds it
   as a vertex term with its own analytic normal, `blades.ts` and
   `stands.ts` lift what stands on it by the same number, and §24's floor
   adds it so the camera cannot be swallowed by a rising summit.

   **Zero-mean, so the massif does not pump.** The weights are a
   distribution — they sum to 1 — and each node's Gaussian is scaled by how
   far its own share is from an equal one. Five equal shares is therefore
   exactly zero everywhere, which is both what an idle cluster looks like
   and what the worker has baked.

   σ is a *third* of the massif's, because these have to read as five
   summits where the massif reads as one mountain: at 62 units against a
   120-unit ring, a node's own summit is 1.00 of the term and its nearest
   neighbour's contribution 0.08. */
export const SWELL_SIGMA = 62;
export const SWELL_AMP = 78;
/** Past this the term is under a twentieth of a unit and is not evaluated —
    the gate `terrain.ts` and the two scattered layers branch on. */
export const SWELL_REACH = CLUSTER_RING + SWELL_SIGMA * 3;

/** The live distribution. Written by `consensus.ts` through `setShares`,
    read here and nowhere else, and equal in every worker for ever — a
    worker never imports the simulation, so its copy of this file is the
    baseline by construction rather than by discipline. */
export const shares = new Float32Array(CLUSTER_NODES).fill(1 / CLUSTER_NODES);

export function setShares(next: ArrayLike<number>): void {
  for (let i = 0; i < CLUSTER_NODES; i++) shares[i] = next[i] ?? 0;
}

/** How far the ground at (x, z) is from where the worker baked it. */
export function swell(x: number, z: number): number {
  const dx0 = x - CLUSTER_SITE.x;
  const dz0 = z - CLUSTER_SITE.z;
  if (dx0 * dx0 + dz0 * dz0 > SWELL_REACH * SWELL_REACH) return 0;
  let sum = 0;
  for (let i = 0; i < CLUSTER_NODES; i++) {
    const n = clusterNode(i);
    const dx = x - n.x;
    const dz = z - n.z;
    sum += (shares[i]! - 1 / CLUSTER_NODES) *
      Math.exp(-(dx * dx + dz * dz) / (2 * SWELL_SIGMA * SWELL_SIGMA));
  }
  return sum * SWELL_AMP;
}

/* ── The water level (§26) ──────────────────────────────────────────────
   A single number, because §0.2's water is a global level and a plane drawn
   where the ground is under it. It lives with the field rather than with the
   surface that draws it, for the same reason `SUN` lives on its own: the
   worker has to be able to ask how near water is (§27's placement density)
   without importing anything that has seen a GPU.

   Chosen off the field's own distribution, measured in Node over the bounded
   world (radius 3,200, 20-unit lattice, 80,381 samples). At -8 the water is
   11.9% of the world in 128 separate bodies, twelve of them over 200 units
   across, and the largest is 0.51 km² — 13% of the total, so it is lakes
   rather than a sea with islands in it. Two units either way is a different
   world: -12 leaves 4.4% and a scatter of ponds, -4 floods 26.7% and the
   largest body is a quarter of it. Mean depth is 3.7 units and the deepest
   is 16.6, which is what §24's six-unit floor lets the camera fly under. */
export const WATER = -8;

/* `spacing` is the distance between samples at the LOD asking. 0 means
   "every octave", which is what §24's clamp and any measurement want. It is
   also why the clamp keeps six units of clearance rather than one: the mesh
   under the camera is a level-0 chunk sampling at 2, so it is not this. */
/* The continental layer on its own, and the mask taken off it. Both are
   exported for §27: where there are mountains at all is one of the four
   things ground cover's density is a function of (§0.2), and a second
   implementation of the mask would be a second answer to "is this sheltered
   country". `height` calls them itself, so there is one expression and no
   sample is taken twice. */
export function landform(x: number, z: number, spacing = 0): number {
  return fbm(x, z, 1 / CONTINENT_WAVELENGTH, CONTINENT_OCTAVES, spacing);
}

export function rangeMask(land: number, u: number): number {
  return smoothstep(RANGE_MASK_LOW, RANGE_MASK_HIGH, land) * (1 - u) + u;
}

export function height(x: number, z: number, spacing = 0): number {
  const land = landform(x, z, spacing);
  const relief = ridged(x, z, 1 / RANGE_WAVELENGTH, RANGE_OCTAVES, spacing);
  const detail = fbm(x, z, 1 / DETAIL_WAVELENGTH, DETAIL_OCTAVES, spacing);
  const u = uplift(x, z);
  const mask = rangeMask(land, u);
  return land * CONTINENT_AMP + relief * mask * RANGE_AMP + detail * DETAIL_AMP + u * CLUSTER_AMP;
}
