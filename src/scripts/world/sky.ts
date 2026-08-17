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
     key light. §0.2 asks for exactly this and names the tokens.
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
import type { Palette } from './palette';
import { SUN } from './sun';

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

export function gradient(dir: Node<'vec3'>, palette: Palette) {
  const band = exp(dir.y.abs().div(BAND_SPAN).negate());
  const toward = dir.dot(vec3(SUN.x, SUN.y, SUN.z)).max(0);
  const base = mix(palette.void, palette.rule, band.mul(BAND));
  return mix(base, palette.lead, band.mul(toward.pow(GLOW_POW)).mul(GLOW));
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

export const haze = (toEye: Node<'vec3'>, palette: Palette) =>
  mix(palette.void, gradient(toEye.negate(), palette), HAZE);

/* ── The clouds ────────────────────────────────────────────────────────
   High enough that the cruise pose (190) is well under the deck and the
   ridges (up to 128) never touch it, low enough that a climb goes through
   it rather than to it. */
const DECK = 620;

/* One noise unit is 620 world units, three octaves, so the smallest feature
   is about 155 — a cloud is a thing you fly past rather than a texture. */
const SCALE = 620;
const OCTAVES = 3;
const DRIFT = 0.005;

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
    ).div(SCALE).add(vec2(time.mul(DRIFT), time.mul(DRIFT * 0.4)));

    const n = mx_fractal_noise_float(q, OCTAVES, 2, 0.5, 1);
    const cover = smoothstep(COVER_LO, COVER_HI, n);

    If(cover.greaterThan(0), () => {
      const banded = cover.mul(STEPS).ceil().div(STEPS).clamp(0, 1);
      const toward = mx_fractal_noise_float(
        q.add(vec2(SUN.x, SUN.z).mul(LIFT)),
        OCTAVES, 2, 0.5, 1,
      );
      const lit = smoothstep(0, 0.3, n.sub(toward)).mul(cover);
      const body = mix(palette.rule, palette.paper, lit.mul(STEPS).round().div(STEPS));
      out.assign(mix(out, body, banded.mul(fade).mul(ALPHA)));
    });
  });

  return out;
}

export function buildSky(palette: Palette, time: UniformNode<'float', number>) {
  const material = new MeshBasicNodeMaterial({ side: BackSide, fog: false });
  material.positionNode = positionLocal.add(cameraPosition);

  material.colorNode = Fn(() => {
    const dir = positionWorld.sub(cameraPosition).normalize();
    return clouded(dir, palette, time);
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
