/* §4.7 / §18 — the sky.

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
import type { Color } from 'three/webgpu';
import { RADIUS } from './terrain';

/* Inside the far plane at every altitude on the curve, and far enough
   outside the ground disc that no star can be mistaken for one. */
const SPHERE = 200;

/* Where the sky starts. The ground is a disc of radius RADIUS carried with
   the camera, so what lies past its edge is not more ground — it is sky,
   and the angle it begins at is the angle the horizon arc is drawn at.
   Both ends of that meet: the fog takes the ground out as the arc arrives
   and the stars come in from the same line, so there is no dark band
   between the two and no hard cut at eye level. Written as a sine because
   that is what a direction's y component already is.

   It is also why the stars are drawn over a band and not a hemisphere: at
   the hero the camera is 26 up and the arc is half a radian below level. */
const DIP = -0.55;

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
   trade. The ink the same measurement freed went to the ground. */
const ALPHA = 0.30;

type Palette = {
  paper: UniformNode<'color', Color>;
  lead: UniformNode<'color', Color>;
  contrast: UniformNode<'float', number>;
};

export function buildStars(palette: Palette, time: UniformNode<'float', number>) {
  const count = 8_000 * (innerWidth >= 1024 ? 1 : 0.5);

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
  material.colorNode = select(accent, palette.lead, palette.paper).mul(palette.contrast);

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

  /* The horizon, from the camera's own altitude: the arc sits at
     -y / sqrt(y² + RADIUS²) below level, and that is where the sky begins.
     Faded over 0.09 rather than cut, because a hard edge on a starfield is
     a line and this is supposed to be the absence of one. */
  const camY = cameraPosition.y;
  const horizon = camY.div(sqrt(camY.mul(camY).add(RADIUS * RADIUS))).negate();
  const above = smoothstep(horizon, horizon.add(0.09), dir.y);

  material.opacityNode = brightness.mul(twinkle).mul(above).mul(ALPHA);

  const stars = new Sprite(material);
  stars.count = count;
  // Same as the field and the ground (§15): the bounding sphere an
  // instanced sprite computes is the unit quad at the origin.
  stars.frustumCulled = false;
  // Behind everything. Nothing in this world writes depth, so the order is
  // the only thing saying the sky is at the back.
  stars.renderOrder = 0;

  return { stars, count };
}
