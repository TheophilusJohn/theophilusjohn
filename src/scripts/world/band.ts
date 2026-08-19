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
   placement three others were measured against (§23) — and, since §41, the
   placement *both* appearances use. At the sun's 32° a level surface is at
   `N·L` 0.530, so open country is the low band and what the light finds is
   the slopes that face it. **7.8° of tilt toward the light reaches the middle
   band and 32.2° the top** (§23 recorded 14° and 38°; computed in the sun's
   own vertical plane, where `N·L = sin(32° + t)`, they are these). An edge
   *at* 0.53 turns the detail layer into two-tone camouflage, and putting flat
   ground in the middle band instead paints the whole foreground `--dim` and
   leaves no relief in it at all.

   **Measured on the shipped generator's own arrays** — `buildChunk` over a
   spread of level-0 squares, 214,511 dry vertices, `litness` off the `normal`
   and `shadow` it returns — these two edges put **88.89% / 11.07% / 0.04%** of
   the ground in the three bands. */
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
const night = (palette: Palette, step: -1 | 0 | 1): [Token, Token, Token, Token] =>
  step === 0
    ? [palette.rule, palette.dim, palette.paper, palette.lead]
    : step === 1
      ? [palette.dim, palette.muted, palette.paper, palette.lead]
      : [palette.lift, palette.rule, palette.dim, palette.paper];

/* ── The same ladder at day, and it is only the rungs (§41) ─────────────
   SPEC §4.9 expects §23 to be re-solved from scratch here — a higher sun, new
   band edges, possibly a different band count. Measured, none of that is what
   changes. **A ladder is a list of tokens in ascending lightness, and the two
   token sets do not order the same way.** The dark set climbs
   `--rule` 0.0225 → `--dim` 0.238 → `--paper` 0.838; the light set climbs
   `--dim` 0.140 → `--rule` 0.705 → `--void-lift` 0.845. So `--rule` and
   `--dim` change places, `--paper` gives its rung to `--void-lift` — because
   in the light set `--paper` is the darkest ink rather than the brightest
   surface, and the palest a surface may be is `--void-lift`, `--void` being
   the clear colour (§22) — and `--leader` keeps the top rung it has always
   had, since the accent is the one token §39 did not invert.

   Everything else is §23's and stays: the term is `N·L` with the marched
   shadow in it, the two edges are 0.64 and 0.90, the ramp is 0.30 and the
   sun is 32° up. **Both edges are above flat ground in both appearances**, so
   the sentence §23 wrote is still the sentence — open country is the low band
   and what the light finds is the slopes that face it — and only the values
   the two sides land on have swapped ends. Flat ground is `--dim` → `--rule`
   at 0.296 under a horizon sky of 0.705, where at night it is `--rule` →
   `--dim` at 0.082 under a horizon band of 0.0225.

   **What was measured and rejected is the complement.** Writing the day term
   as `1 − lum` — banding the missing light rather than the light — is the
   tidier idea and it is wrong in the frame rather than on the ground. Over
   the whole terrain it looks right (the same shares either way, 88.9% of dry
   land in the bulk band); over the *pixels a reader sees* it collapses,
   because §22 sited the opening pose downsun and the visible faces are
   therefore the lit ones. Measured on the built frame at the arrival, the
   night terminator cuts the visible ground **42.7% / 57.2%** and the
   complement at the same edge cuts it **99.5% / 0.5%** — the whole landscape
   in one band, 0.70 to 0.75 of relative luminance, which is what it looked
   like. The lesson is the instrument: a band edge is placed against the
   distribution of the term over the *frame*, not over the world.

   **±1 cannot be symmetric at day, and that is the light set's own hole
   said again** (§40 found it in the sky). §0.2 asks growth to be one step
   lighter; at day there is no rung above `--rule` but `--void-lift` and
   `--void`, and the ground's own top rung is already `--void-lift`. So growth
   goes one rung *down* instead — which is what cover at noon does anyway, and
   the reason a meadow reads against bare ground at all — and a stand of pines
   goes two, so a treeline is still a mass with an edge: 0.012 to 0.099
   against open country at 0.296. */
const day = (palette: Palette, step: -1 | 0 | 1): [Token, Token, Token, Token] =>
  step === 0
    ? [palette.dim, palette.rule, palette.lift, palette.lead]
    : step === 1
      ? [palette.muted, palette.dim, palette.lift, palette.lead]
      : [palette.paper, palette.muted, palette.rule, palette.lift];

/* Mixed rather than branched, which is the difference between this and
   `sky.ts`'s gradient. There the two appearances are two *constructions* and
   a `mix` evaluates both — two fractal-noise chains on every sky pixel — so
   §40 measured the branch and took it. Here the construction below is one
   construction and all that differs is four colours: four lerps a pixel,
   nothing evaluated twice, and `palette.day` is 0 or 1 exactly. */
const steps = (palette: Palette, step: -1 | 0 | 1): [Token, Token, Token, Token] => {
  const n = night(palette, step);
  const d = day(palette, step);
  return [
    mix(n[0], d[0], palette.day),
    mix(n[1], d[1], palette.day),
    mix(n[2], d[2], palette.day),
    mix(n[3], d[3], palette.day),
  ];
};

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
