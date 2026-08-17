/* §0.2 — how this world quantises light, in one place.

   §23 wrote this inside `terrain.ts`, where it was the only surface it
   applied to. §27 puts a second one on the ground — blades standing *in* the
   terrain's own bands, one step lighter (§0.2) — and §28 adds rocks and
   conifers to that. Four surfaces reading four copies of "where the
   terminator is" is four places for it to drift, and the whole look is that
   they agree: a blade whose band edge sat a hundredth off the ground's would
   draw a line along every slope at exactly the place the eye is already
   looking.

   So the edges, the ramp inside a band and the shadow's depth live here, and
   what a surface brings is its own `lum`. Nothing in this file knows what a
   chunk or a blade is.

   ── The bands ──────────────────────────────────────────────────────────
   §0.2: "a slope lit at 0.6 and one lit at 0.45 land in the same band, so
   terrain reads as broad shapes with hard edges rather than as gradients."
   Two edges, three bands. **Both are above flat ground**, which is the
   placement three others were measured against (§23). At the sun's 32° a
   level surface is at `N·L` 0.52, so open country is the low band and it
   takes 14° of tilt toward the light to reach the middle one and 38° to
   reach the top: the landscape is night, and what the light finds is the
   slopes that face it. An edge *at* 0.52 turns the detail layer into
   two-tone camouflage, and putting flat ground in the middle band instead
   paints the whole foreground `--dim` and leaves no relief in it at all. */
const TERMINATOR = 0.64;
const LIT = 0.90;

/* Nothing here is smoothstepped over a fixed width. The edges are one
   *pixel* wide, taken from `fwidth` of the lighting term, which is the only
   way a hard edge stays hard at the far ridge and stays un-aliased at the
   near one: a fixed width in lighting units is a fat gradient on a slope
   facing the camera and a stair-stepped line on one at a grazing angle. */
const EDGE = 0.8;

/* How far into the next token a band leans by its own top edge. Bands alone
   make every region of open country a single flat fill, and a foreground
   that is one colour is not reading as a broad shape — it is not reading at
   all. At 0.30 the terraces keep three quarters of their step and the ground
   inside one has a gradient across it.

   Confined to the band on purpose. The first attempt (§23) mixed the whole
   smooth ramp back in under the bands, and because flat ground sits high
   inside the low band that pulled the entire foreground most of the way to
   `--dim` — the flat lavender wash the band placement above exists to
   avoid. */
const RAMP = 0.30;

/* A quarter-band under the terminator for ground the marched shadow says is
   occluded, so a shadowed slope that would have been lit is not merely the
   same colour as one that faces away — it is darker than either. `--void` is
   the floor of the world and the shadow band leans toward it. */
export const CAST = 0.45;

import { float, fwidth, mix, smoothstep } from 'three/tsl';
import type Node from 'three/src/nodes/core/Node.js';
import type { Palette, Token } from './palette';

/** The lighting term every banded surface in this world cuts: `N·L` clamped
    at zero, taken down toward `--void` by however much of the key light the
    marched shadow says is missing. */
export const litness = (facing: Node<'float'>, shadow: Node<'float'>) =>
  facing.max(0).mul(mix(float(1).sub(CAST), 1, shadow));

/** Which four tokens a surface bands into. `step` 0 is the ground; 1 is one
    step lighter, which is what §0.2 asks of anything growing on it —
    `--muted` is the mid band there and this is the first thing in the world
    to use that token. The top pair does not shift: `--paper` to `--leader` is
    already the brightest thing the ground can be, and growth is not a
    reason to put more `--leader` in the frame.

    **−1 is §28's conifers, and it is the direction the other two are not.** A
    stand of pines at night is darker than the ground it stands on, and the
    whole of what makes a treeline legible from above is that it is a *mass*
    with an edge — so a conifer bands from `--void-lift` up. Not from
    `--void`: that is the clear colour, the fog target and the zenith at once,
    and a tree painted in it is a hole in the terrain rather than a tree.
    The whole ladder shifts down, unlike +1's: going up, `--paper` and
    `--leader` stay put because the top of the world is already as bright as
    it may be, and going down there is no such ceiling to hold. Rocks are
    step 0 — stone is what the ground is made of, and what has to read is the
    shape, not a second material. */
const steps = (palette: Palette, step: -1 | 0 | 1): [Token, Token, Token, Token] =>
  step === 0
    ? [palette.rule, palette.dim, palette.paper, palette.lead]
    : step === 1
      ? [palette.dim, palette.muted, palette.paper, palette.lead]
      : [palette.lift, palette.rule, palette.dim, palette.paper];

export function bands(lum: Node<'float'>, palette: Palette, step: -1 | 0 | 1 = 0) {
  const [low, mid, high, top] = steps(palette, step);
  // One pixel of edge, wherever the edge lands.
  const edge = fwidth(lum).mul(EDGE).max(0.001);
  const cut = (at: number) => smoothstep(float(at).sub(edge), float(at).add(edge), lum);
  const inside = (from: number, to: number) => smoothstep(from, to, lum).mul(RAMP);
  return mix(
    mix(
      mix(low, mid, inside(0, TERMINATOR)),
      mix(mid, high, inside(TERMINATOR, LIT)),
      cut(TERMINATOR),
    ),
    mix(high, top, inside(LIT, 1)),
    cut(LIT),
  );
}
