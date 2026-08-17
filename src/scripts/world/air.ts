/* §0.2 — how much is in the air at (x, z), as a pure function of it.

   The third placement module, and the same rule as the other two: `cover.ts`
   answers "does anything grow here", `scatter.ts` answers "does anything
   stand here", and this answers "is there anything in the air over here".
   It imports nothing that has seen a GPU, so Node runs the shipped file and
   the numbers in the §30 report are this function's own output rather than a
   re-derivation of it.

   It is six lines and it is its own module for exactly that reason. The
   alternative was to leave it inside `motes.ts`, where it would have been
   just as correct and completely unmeasurable — §0.2's density rule for the
   motes ("denser over water and vegetation, sparse on bare rock") is a claim
   about the world, and a claim about the world that can only be evaluated
   inside a WebGPU material is a claim nobody can check.

   Unlike the other two it takes the cover density rather than computing one:
   the caller has already asked `cover.ts` and the answer is most of this. */

import { WATER } from './height';

/* ── The floor ──────────────────────────────────────────────────────────
   Not zero, and that is the decision. A bare crest at night still has air
   over it, and a layer that switches off over rock draws the treeline a
   second time in a colour nothing else in the world wears. */
export const AIR = 0.06;

/* Growth is the largest term: §27 measures 55% of dry ground carrying cover
   with a mean of 0.24, so this puts a meadow at about four times a scree
   slope and leaves the summits at the floor. */
export const GROWTH = 1.05;

/* Water is the largest single one, because it is the one place §0.2 names
   twice — "denser over water and vegetation" — and because a lake is the
   only surface in this world with nothing growing on it (`cover.ts` refuses
   under WATER) and therefore the only place the growth term cannot reach. */
export const WET = 1.25;

/* How far under the water plane the ground has to be before a cell counts
   as a lake. Four units, so a shore is a ramp rather than an edge and the
   air thickens as you come down to the water. */
export const WET_DEEP = 4;

/** How much is in the air over ground at height `h` carrying `cover` of
    growth, 0..1 before the per-mote rejection. */
export function airAt(h: number, cover: number): number {
  const lake = Math.min(Math.max((WATER - h) / WET_DEEP, 0), 1);
  return AIR + GROWTH * cover + WET * lake;
}

/** Where the air starts over ground at `h`: the water surface over a lake
    and the ground itself everywhere else. Nothing else in the world needs
    this — the blades refuse to grow under water and the stone is tested
    against it, where a mote is the one thing that is *more* likely there. */
export const airBase = (h: number) => Math.max(h, WATER);
