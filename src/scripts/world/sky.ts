/* §0.2 — atmosphere, and the sky is a place in the frame rather than a
   backdrop behind one.

   §18 built a starfield on a --void clear colour and §21 kept it, with a
   note that the fade was from *level* rather than from a horizon it could
   see — there was no ground, so there was no horizon to derive. §22 put a
   landscape under it and the note came due: distant ground that fades to
   --void against a sky that is also --void has no horizon at all, and every
   ridge past 900 units simply stops existing.

   So this file is the horizon. Three things, in one material:

   - **The gradient.** --void at the zenith, lifting through --void-lift
     into a band at the horizon, with a broad glow in --leader around the
     key light. §0.2 asks for exactly this and names the tokens. **Since §40
     that is the night one of two** — at day it runs the other way, from
     --rule at the horizon up to --muted at the zenith, banded, with the
     glow toward --void instead of the accent. See `gradient()`; the two are
     different constructions rather than one with different numbers, which
     is §4.9's whole claim about this appearance.
   - **The clouds.** Banded, and a real layer rather than a texture on a
     dome: each pixel intersects its own view ray with a plane at cloud
     altitude, so the deck parallaxes when you fly, recedes to a line at the
     horizon and passes overhead when you climb. No geometry, no second
     draw call, and nothing to keep in step with the camera on the CPU.
   - **What the ground fades into.** `gradient()` is exported because
     `terrain.ts` fogs toward it: a mountain at 1,200 units has to arrive at
     the colour of the sky *behind it*, not at the colour of the zenith.
     That single change is most of why there is a horizon in the frame.

   Drawn after the ground and depth-tested against it, so the whole of this
   runs only on pixels that are actually sky. The sphere is centred on the
   camera in the shader, the way the stars are (§18), which is why it can be
   frustum-culled off and never touched from the loop. */

import { BackSide, Mesh, MeshBasicNodeMaterial, SphereGeometry } from 'three/webgpu';
import {
  Fn,
  If,
  cameraPosition,
  exp,
  float,
  fwidth,
  mix,
  mx_fractal_noise_float,
  positionLocal,
  positionWorld,
  select,
  smoothstep,
  vec2,
  vec3,
} from 'three/tsl';
import type Node from 'three/src/nodes/core/Node.js';
import type UniformNode from 'three/src/nodes/core/UniformNode.js';
import { murk } from './fog';
import type { Palette } from './palette';
import { SUN } from './sun';
import { DECK_DRIFT, WIND } from './wind';

/* Inside the far plane (2,600) and outside the last chunk of ground
   (1,536), so the depth test between sky and terrain is the honest one at
   every altitude. */
const RADIUS = 2550;

/* ── The gradient ──────────────────────────────────────────────────────
   BAND_SPAN is in units of sin(elevation), so 0.17 is a band about ten
   degrees deep either side of level — wide enough to sit a range in and
   narrow enough that the top half of the frame is still night.

   It decays *both* ways rather than being clipped at the horizon: below
   level is where the far ground is, and ground fading into a hard edge
   would draw the horizon as a line even where there is a mountain on it. */
const BAND_SPAN = 0.15;
const BAND = 0.9;

/* The glow around the key light, which is the one thing in the sky that
   says where the light in the landscape comes from. Narrow in angle (the
   power) and confined to the band, so it is a place on the horizon rather
   than a wash. */
const GLOW_POW = 6;
const GLOW = 0.35;

/* ── The gradient at day (§40) ─────────────────────────────────────────
   **Not the night sky lightened — the same sky at noon, solved from the
   other end** (§4.9). At night the zenith is `--void` and a *band* lifts
   out of it at the horizon; at day the horizon is `--void` and the sky
   darkens all the way up to `--muted`. So the two are not one expression
   with different numbers in it, and this is the only place in the world
   where §39's token set has to be read upside down as well as inverted.

   **`--muted` is the zenith and it is not a decision about violet.** Read
   against the light page it is 6.49:1, which puts it at a relative
   luminance of 0.099 — a deep blue sky at altitude measures about 0.11, so
   the token lands where a real zenith does without anything being invented
   for it.

   **`--rule` is the horizon in both appearances, and that is §22's bug
   caught in a mirror.** The horizon was drafted as `--void` — it is the
   palest token in the light set and the obvious other end of the ramp — and
   built that way it is a white-out: `--void` is the clear colour and what
   `haze()` starts from, so a sky painted in it at the horizon is exactly the
   hole §22 found when the *zenith* was --void and the far ground faded into
   it. Measured on the built frame, the bottom third had no horizon in it at
   all. --rule is 0.705 against --void's 0.918 — pale, and a value of its own.
   So night lifts from --void at the zenith *to* --rule at the horizon, day
   deepens from --rule at the horizon *to* --muted at the zenith, and the one
   token neither of them ever wears is --void.

   **What the ladder could not do is the bands.** The obvious construction
   is `band.ts`'s: quantise into four *tokens*. It does not work here,
   because the light set is a text palette and has a hole in the middle of
   it — --void 0.918, --void-lift 0.845, --rule 0.705, then --dim 0.140 and
   --muted 0.099, with nothing at all between 0.705 and 0.14. Three pale
   tones and three ink tones is exactly what a page wants and exactly what a
   sky does not. So the bands are cut into the *ramp* between two tokens
   rather than being tokens themselves, which keeps every colour in the
   frame a token's own value or a mix of two (`interior` below has done the
   same since §30). The night sky never met the hole because it lives
   entirely at the dark end: --void to --rule is 0.0068 to 0.0225. */

/* Four, where the ground has three. The sky is the one surface in the world
   whose ramp covers the whole frame rather than one landform, so a band is
   still a broad region at four; at three the step between the top two is a
   third of the range and reads as a seam across the sky. RAMP and EDGE are
   `band.ts`'s own numbers, and deliberately: a hard edge one pixel wide with
   a gradient inside the band is what everything else in this world is cut
   with, and a sky quantised on a different rule would be the one banded
   surface that does not belong to the set. */
const DAY_STEPS = 4;
const DAY_RAMP = 0.30;
const DAY_EDGE = 0.8;

/* The glow around the sun, and at day it goes toward `--void` where at night
   it goes toward `--leader`. It has to: the accent is 2.23:1 on the light
   page, so a glow painted in it near a pale horizon is a *dark* patch where
   the sun is. Toward --void is both the correct direction — forward
   scattering washes the sky out, and this is the one place --void is still
   a colour something can be — and the only one the palette offers, since
   there is nothing paler in it.

   Not gated on the horizon band, unlike the night glow: a day sun stands at
   an elevation rather than sitting on the horizon, so the glow is a place in
   the sky and the band would cut it in half. It shares GLOW_POW with the
   night glow, which is a correction twice over — drafted at a power of 3 and
   0.55 it washed a third of the sphere back to the page colour and took the
   bands with it, and at any other power the two appearances would need two
   `pow` chains where the frame only ever wants one. */
const DAY_GLOW = 0.40;

/** `s`, which is already the ramp times `n`, cut into `n` terraces: flat
    inside a band apart from a RAMP of gradient, then a single pixel of edge
    into the next one. It takes `s` pre-scaled and `edge` ready-made because
    the caller needs both for other things. `band.ts` does
    this to a lighting term with four tokens; here it is done to a ramp, and
    the reason the edge is taken from `fwidth` is the same one — a fixed
    width in the input's own units is a fat gradient where the sky is
    changing slowly and a stair-step where it is changing fast. Continuous
    at the seam by construction: the band's own ramp has reached RAMP by the
    time the edge carries the remaining 1 − RAMP. */
function terrace(s: Node<'float'>, edge: Node<'float'>, n: number) {
  const at = s.floor();
  const into = s.fract();
  const step = smoothstep(float(1).sub(edge), float(1), into);
  return at.add(into.mul(DAY_RAMP)).add(step.mul(1 - DAY_RAMP)).div(n);
}

/* **Two constructions and a real branch between them, which is a
   measurement rather than a preference.** Written as one `mix` of both ends
   — the obvious shape, since `palette.day` is a uniform — it cost every
   *night* frame +0.051 to +0.076ms at DPR 1.5 over six poses, against whole
   frames of 1.22 to 1.34: a fortieth of the frame paid by the appearance
   that does not use it, and paid on every pixel of sky, ground and water
   alike, since all three fog toward this. Sharing what the two ends have in
   common (one dot with the sun, one `pow` of it feeding both glows) did not
   move it.

   `If` needs a shader stack, so the whole of this is inside an `Fn` — one
   per call site rather than one memoised for all three, because the three
   call sites are three different materials and each compiles its own shader
   anyway. Branched it is **+0.022 to +0.045** over the same six poses: half
   of what the mix cost, and not nothing, which is the honest way to put it.
   The rest is the call and the branch themselves.

   The condition is a **uniform**, which is the most spatially coherent
   condition there is — every pixel in the frame takes the same side of it —
   and that is also why `fwidth` may sit inside the branch. A derivative
   wants uniform control flow, and a compiler that could not prove this one
   uniform would be a shader that fails at mount, which in world-first is a
   page that never leaves the curtain. It compiles, it runs, and hoisting it
   out measured no different, so it lives with the code that needs it. */
export function gradient(dir: Node<'vec3'>, palette: Palette) {
  return Fn(() => {
    const out = vec3(0).toVar();
    const toward = dir.dot(vec3(SUN.x, SUN.y, SUN.z)).max(0);
    const glow = toward.pow(GLOW_POW);

    /* Clamped at the horizon rather than mirrored through it, unlike the
       night band. Below level is where the far ground is and where the sky
       under the world's edge is, and both want the horizon's own pale — a
       day sky that goes back to deep blue underneath draws a second horizon
       in the bottom of the frame the moment the camera is high enough to see
       past the last chunk.

       `sqrt` and not a general `pow`: what the exponent buys is how fast the
       sky deepens off the horizon, a real one loses most of its haze in the
       first thirty degrees and then changes very little, so anything under 1
       is right and the question is only which. At 0.5 the four band edges
       land at 3.6°, 14.5° and 34.2° of elevation, which puts three of them
       inside the ~30° of sky a route pose can see; the drafted 0.65 put two
       there. More bands in the frame is what §4.9 asks for, and one
       instruction is cheaper than three. */
    If(palette.day.greaterThan(0.5), () => {
      const s = dir.y.max(0).sqrt().mul(DAY_STEPS);
      const edge = fwidth(s).mul(DAY_EDGE).max(0.001);
      const up = terrace(s, edge, DAY_STEPS);
      out.assign(mix(
        mix(palette.rule, palette.muted, up),
        palette.void,
        glow.mul(DAY_GLOW),
      ));
    }).Else(() => {
      const band = exp(dir.y.abs().div(BAND_SPAN).negate());
      out.assign(mix(
        mix(palette.void, palette.rule, band.mul(BAND)),
        palette.lead,
        band.mul(glow).mul(GLOW),
      ));
    });

    return out;
  })();
}

/* ── What an opaque surface fades into ──────────────────────────────────
   Here rather than in `terrain.ts`, where it was written at §23, because
   §26 puts a second opaque surface in the world and the two have to arrive
   at the same colour: a lake and the ridge behind it that fogged toward
   different things would draw each other's outline on the horizon.

   Not the whole way to the sky. A range at twelve hundred units is *darker*
   than the sky behind it, on any night anybody has stood outside on, and
   fading the ground the whole way to the horizon band takes the last two
   ranges of depth out of the frame — it was measured as a violet wash with
   a rim light in it. At 0.75 the far ground still arrives at the sky's own
   colour rather than at --void (§22's bug), and the horizon is a soft dark
   line under a lit band rather than a hard one under nothing. */
const HAZE = 0.75;

/* ── The inside of a cloud (§30) ───────────────────────────────────────
   What everything fades into while `murk` is up. Between `--void-lift` and
   `--rule`, which is the deck's own body colour taken down a little: the
   inside of a cloud is the same material as the outside of one and it has
   no light of its own, so it is darker than the face the key light reaches
   and lighter than the ground under it. Not `--void` — that is the clear
   colour and the fog target already, and a cloud interior painted in it is
   the world switching off rather than closing in. */
const INTERIOR = 0.5;
export const interior = (palette: Palette) => mix(palette.lift, palette.rule, INTERIOR);

export const haze = (toEye: Node<'vec3'>, palette: Palette) =>
  mix(
    mix(palette.void, gradient(toEye.negate(), palette), HAZE),
    interior(palette),
    murk,
  );

/* ── The clouds ────────────────────────────────────────────────────────
   High enough that the cruise pose (190) is well under the deck and the
   ridges (up to 128) never touch it, low enough that a climb goes through
   it rather than to it. */
const DECK = 620;

/* One noise unit is 620 world units, three octaves, so the smallest feature
   is about 155 — a cloud is a thing you fly past rather than a texture. */
const SCALE = 620;
const OCTAVES = 3;

/* **Since §27 the deck advects along the wind**, which is what §0.2 asks of
   it: "the cloud deck advects along it. One field so they agree." The rate is
   unchanged — §23's 0.005 noise units a second on each axis of (1, 0.4) is
   3.34 world units a second at this scale, and it was set against the deck's
   own feature size — so what moved is the direction only, onto `wind.ts`'s. */
const DRIFT = DECK_DRIFT / SCALE;

/* Coverage, and the pair is what "banded volume" means here: the noise is
   thresholded into a shape rather than faded into one, and then quantised
   into STEPS opacities so the shape has terraces in it instead of a
   gradient. Cel clouds are drawn as flat regions with hard edges; this is
   that, from a field. */
const COVER_LO = 0.10;
const COVER_HI = 0.42;
const STEPS = 3;
const ALPHA = 0.8;

/* The lit edge. A second sample displaced toward the light says whether
   the deck thins out that way — if it does, this is the face the light
   reaches, and it goes to --paper against a body in --rule. It is one more
   noise evaluation for the only thing that makes a flat plane read as
   volume. */
const LIFT = 0.16;

/* Past this the deck is edge-on and a pixel covers kilometres of it, which
   is aliasing rather than cloud. Faded out from half of it. */
const REACH = 4000;

/* **Both noises are behind a branch, and that is a measurement rather than
   a habit.** The dome is drawn over every pixel of sky in the frame, and at
   altitude that is most of it: unbranched, two four-octave fractal noises
   came to 1.43 ms of a 16.6 ms frame with the ground hidden — five times
   the cost of the landscape. The first branch skips both where the deck is
   faded out, which is the whole lower half of the sky and everything past
   REACH; the second skips the lit sample where the first says there is no
   cloud here, which is most of what is left. Fragment branching pays when
   the branch is spatially coherent, and a cloud deck is nothing but. */
function clouded(dir: Node<'vec3'>, palette: Palette, time: UniformNode<'float', number>) {
  const out = gradient(dir, palette).toVar();

  /* Where this view ray meets the deck. Negative behind the camera,
     enormous near grazing; the clamp keeps the sample coordinates in a
     range float32 can still resolve and the fade takes the alpha to zero
     long before it matters.

     Two fades, and the second is the one that was measured. Distance takes
     the deck out before a pixel covers kilometres of it; *grazing* takes it
     out before that, because within a few degrees of level the ray runs
     along the plane rather than through it, and the result is a band of
     horizontal streaks sitting exactly where the horizon is. */
  const t = float(DECK).sub(cameraPosition.y).div(dir.y);
  const tc = t.clamp(0, REACH);
  const fade = smoothstep(REACH, REACH * 0.4, tc)
    .mul(smoothstep(0.04, 0.18, dir.y))
    .mul(select(t.greaterThan(0), float(1), float(0)));

  If(fade.greaterThan(0.001), () => {
    const q = vec2(
      cameraPosition.x.add(dir.x.mul(tc)),
      cameraPosition.z.add(dir.z.mul(tc)),
    ).div(SCALE).add(vec2(WIND.x, WIND.z).mul(time.mul(DRIFT)));

    const n = mx_fractal_noise_float(q, OCTAVES, 2, 0.5, 1);
    const cover = smoothstep(COVER_LO, COVER_HI, n);

    If(cover.greaterThan(0), () => {
      const banded = cover.mul(STEPS).ceil().div(STEPS).clamp(0, 1);
      const toward = mx_fractal_noise_float(
        q.add(vec2(SUN.x, SUN.z).mul(LIFT)),
        OCTAVES, 2, 0.5, 1,
      );
      const lit = smoothstep(0, 0.3, n.sub(toward)).mul(cover);
      /* **The deck stays and re-tints, and the re-tint is one token (§40).**
         The body is `--rule` in both appearances and it needs no thought:
         inverted it is a mid tone at 0.705, which is darker than the sky
         above thirty degrees and lighter than it at the horizon, and both
         of those are what a cloud looks like from where they are. The lit
         face cannot come with it — `--paper` inverted is the darkest ink in
         the set, so the night construction ported straight over paints the
         *sunward* face of every cloud near-black. It is `--void` at day: the
         palest thing the palette has, which is what the top of a cumulus is
         at noon, and the same direction the night pair runs in. */
      const face = mix(palette.paper, palette.void, palette.day);
      const body = mix(palette.rule, face, lit.mul(STEPS).round().div(STEPS));
      out.assign(mix(out, body, banded.mul(fade).mul(ALPHA)));
    });
  });

  return out;
}

export function buildSky(palette: Palette, time: UniformNode<'float', number>) {
  const material = new MeshBasicNodeMaterial({ side: BackSide, fog: false });
  material.positionNode = positionLocal.add(cameraPosition);

  /* The dome takes the murk too, and it has to: the deck is drawn on rays
     that reach it from below, so a camera inside a form at 300 units still
     has a perfectly clear night sky over it unless something says
     otherwise. Mixed after `clouded` rather than inside it, so what goes is
     the whole sky and not just the part with cloud on it. */
  material.colorNode = Fn(() => {
    const dir = positionWorld.sub(cameraPosition).normalize();
    return mix(clouded(dir, palette, time), interior(palette), murk);
  })();

  const mesh = new Mesh(new SphereGeometry(RADIUS, 48, 32), material);
  // Centred on the camera in the shader, so its own bounds are a lie.
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  /* After the ground and, since §26, after the water. It is opaque and it is
     the furthest thing in the world, so drawing it last is what keeps its
     per-pixel cost — two fractal noises — off every pixel a mountain or a
     lake already covers. */
  mesh.renderOrder = 2;

  return { mesh, material };
}
