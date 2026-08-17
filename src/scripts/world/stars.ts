/* §4.7 / §18 — the stars. The rest of the sky is `sky.ts` (§23).

   Stars are the only thing in this world that does not mean anything, and
   that is deliberate: everything else is a measurement, and a world where
   every element is load-bearing reads as a diagram again.

   Third instanced buffer, 8,000 points at effective infinity. "In view
   space so they never parallax" is the requirement and the sphere is
   centred on the camera rather than on the origin, which is the same thing
   and keeps the other half right: a star must not move when the camera
   translates, and must sweep when it turns. Centred on the world it would
   parallax over a 22-unit descent; locked to the screen it would not turn
   with the pointer. Adding cameraPosition in the shader is both, and costs
   no per-frame work on the CPU. */

import { AdditiveBlending, PointsNodeMaterial, Sprite } from 'three/webgpu';
import {
  cameraPosition,
  cos,
  float,
  hash,
  instanceIndex,
  mix,
  select,
  sin,
  smoothstep,
  sqrt,
  vec2,
  vec3,
} from 'three/tsl';
import type UniformNode from 'three/src/nodes/core/UniformNode.js';
import type { Palette } from './palette';

/* Inside the far plane, and **beyond every chunk of ground** — §22 moved it
   from 200, where it sat while the world was empty. Stars are transparent
   and depth-test against the opaque terrain drawn before them, so a sphere
   inside the terrain's reach puts stars *in front of* a mountain 900 units
   out. At 2,500 the test is the sky being behind the world, which is what
   it should have been measuring all along. */
const SPHERE = 2500;

/* Where the sky starts. §18 took this from the angle the horizon arc was
   drawn at, §21 had nothing to take it from at all and left it at level,
   and §23 gives it the thing it was always standing in for: there is a
   horizon band in `sky.ts` now, and this is the height at which the stars
   come out of it. FADE is deliberately wider than the band's own span —
   stars *inside* a lit horizon are a pinboard behind a glow, and the last
   of them should appear a little above it rather than at its edge. */
const DIP = -0.1;
const FADE = 0.2;

/* Per-star, not total ink (§15's convention, and the one place it does not
   apply). Halving the count on a small viewport has to mean fewer stars
   rather than brighter ones: a star is a point source, so what the
   brightness bound sees is the single brightest 12x12 with one star in it,
   and that number does not move with the count. The power law below takes
   the great majority far under this.

   **The sky is its own budget and it does not share with the ground.**
   Measured per element with this at 0: the `period` and machine-ID lines
   that sit high in a section have *no* field or ground behind them, and
   every element the ground binds has no stars over it — 196 paired
   elements and nothing mixes the two enough to bind either. So the two
   solve apart, and this one is deliberately left under its own ceiling.
   §18 measured 1.24x of headroom here and did not spend it: stars are the
   only thing in this world that means nothing (§4.7), and buying more of
   them by putting a --dim label at exactly the AA floor is the wrong
   trade. The ink the same measurement freed went to the ground.

   **All of which is now a record of a constraint that has gone (§21).**
   There is no text over the world any more — it lives in a panel (§0.4) —
   so the ceiling this number was solved under does not apply to it. Left
   exactly where §18 put it through §23, which put a lit gradient under the
   stars rather than changing what a star is: the sky, the ground and this
   are three separate measurements and §36 re-solves all three together. */
const ALPHA = 0.30;

/* **The contrast multiplier is gone (§21).** It was a legibility measure:
   §4.7 measures text against the busiest frame the scene can produce, so
   the high-contrast toggle had to move that frame *down*, and every layer
   carried a factor for it. There is no text over the world now, so a
   toggle about reading text has nothing to say to it. What high contrast
   still does here is what it does everywhere — it moves the tokens, and
   both of these are read from the tokens on every change. §36 decides
   whether a world needs more than that. */
export function buildStars(palette: Palette, time: UniformNode<'float', number>) {
  // One tier (§0.1): the world does not load below 1024px at all, so the
  // halved count §18 carried for the 768-1024 band has nothing to serve.
  const count = 8_000;

  const si = float(instanceIndex);
  const rnd = (n: number) => hash(si.mul(6).add(n));

  /* Uniform over the band by Archimedes: equal slices of y are equal areas
     of a sphere, so drawing y flat needs no rejection and no acos. */
  const y = rnd(0).mul(1 - DIP).add(DIP);
  const ring = sqrt(float(1).sub(y.mul(y)).max(0));
  const a = rnd(1).mul(Math.PI * 2);
  const dir = vec3(ring.mul(cos(a)), y, ring.mul(sin(a)));

  const material = new PointsNodeMaterial({
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    sizeAttenuation: false,
  });
  material.sizeNode = vec2(1.6);
  material.positionNode = cameraPosition.add(dir.mul(SPHERE));

  /* --paper at low alpha for most, and one in forty in --leader, so the sky
     belongs to the palette without being violet. Both are uniforms for the
     same reason the field's are (§16): the palette moves under high
     contrast, and a scene that read it once at mount behaves differently
     depending on whether the toggle was set before the load or after it. */
  const accent = rnd(2).lessThan(0.025);
  material.colorNode = select(accent, palette.lead, palette.paper);

  /* A few bright and most barely there, which is a power law and not a
     range: at 3.2 the median star is at 0.11 of the brightest and a
     twentieth of them are over half. A uniform draw here is a pinboard. */
  const brightness = rnd(3).pow(3.2);

  /* Periods spread 4–14s with an independent phase, so the sky is never
     uniformly still and never visibly twinkling in unison. Off the
     unscaled clock: a section that speeds the traffic up must not speed up
     the sky, which is at effective infinity and belongs to no section. */
  const period = rnd(4).mul(10).add(4);
  const phase = sin(time.div(period).mul(Math.PI * 2).add(rnd(5).mul(Math.PI * 2)));
  const twinkle = mix(0.40, 1.0, phase.mul(0.5).add(0.5));

  const above = smoothstep(0, FADE, dir.y);

  material.opacityNode = brightness.mul(twinkle).mul(above).mul(ALPHA);

  const stars = new Sprite(material);
  stars.count = count;
  // Same as the field and the ground (§15): the bounding sphere an
  // instanced sprite computes is the unit quad at the origin.
  stars.frustumCulled = false;
  /* Transparent, so they are drawn after both opaque layers whatever this
     says — and they depth-test against both, which is what puts a star
     behind a mountain (§22) and in front of the dome at 2,550 (§23). */
  stars.renderOrder = 0;

  return { stars, count };
}
