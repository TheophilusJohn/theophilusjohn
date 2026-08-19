/* §4.7 / §18 / §22 — fog, and it is not atmosphere for its own sake.

   Without it every depth in the world is the same brightness and the volume
   flattens back into the diagram §16 exists to escape. It is also what
   hides the far clip, so the ground has no visible end: past about 1,300
   units the terrain is --void whether it is there or not, which is what
   lets §22 stop generating it at 1,536 and lets the camera's far plane sit
   at 2,600 without anything popping at either edge.

   Exponential-squared. Additive layers multiply their opacity by this and
   fading a contribution to zero *is* fading it to --void, since the canvas
   is cleared to it. The ground is opaque and does not: it mixes toward
   --void, because --void is under every pixel and a surface has to arrive
   at it rather than at nothing (§19).

   **FOG is re-tuned at §22 and this is the second world it has been set
   against.** §18 solved 0.043 against a ground disc of RADIUS 42 carried
   with the camera — the only fixed distance that world had. A procedural
   terrain has real ones: ridges 380 units apart, a horizon that has to hold
   three or four ranges of depth, and chunks out to 1,536. 0.0015 leaves the
   ground 0.91 of its light at 200 units, 0.57 at 500, 0.16 at 900, 0.022 at
   1,300 and 0.005 where the ground runs out.

   **The vertical axis is squashed, and it is the difference between a
   tuning that holds and one that only holds at the altitude it was set
   at.** §18 found this when scroll became altitude over a 22-unit descent;
   §22 makes altitude unbounded, so it matters more rather than less. On
   plain radial distance the ground directly under a camera cruising at 150
   is 150 units away and goes into the haze while the same ground seen from
   40 stays lit — the horizon would close in every time the reader climbed.

   Weighting dy at 0.35 says the fog is a layer over the ground and thin
   through its own thickness, which is both what an atmosphere is and what
   makes the distance above a *horizontal* one at any altitude. Near ground
   stays lit under a high camera and the far ground still goes.

   Stars are exempt. They are at effective infinity and behind the fog by
   construction; running this on them would delete the sky.

   **§23 adds the height term, and it only ever adds.** §0.2 asks for fog in
   the valleys so distance reads even in flat light, and the tempting way to
   write that is a density that *falls* with altitude — which quietly
   un-fogs the far ground, and the far ground is the only thing hiding the
   edge of the world. At 1,536 units the last chunk stops; the tuning above
   puts it at 0.005 of its light and it cannot be lifted without the ground
   visibly ending. So the peaks keep exactly the fade they had and the low
   ground gets more, which is the same picture from the other side and
   leaves the horizon where §22 measured it.

   Referenced to FLOOR rather than to zero: the field's mean is 15.6 and its
   valley floors run to −22, so 20 is the height above which ground is
   standing out of the layer rather than lying in it. */

import { cameraPosition, exp, float, mix, uniform, vec3 } from 'three/tsl';
import type Node from 'three/src/nodes/core/Node.js';
import type { Palette } from './palette';

export const FOG = 0.0011;

/* ── And it is *thinner* at day, which is the opposite of what was expected
   (§42) ────────────────────────────────────────────────────────────────
   SPEC §4.9: "aerial perspective is stronger at day, so the density probably
   rises." Measured, it has to fall, and the reason is where the target sits
   rather than anything about air. At night `haze()` arrives at 0.019, which
   is *under* every value the ground can take, so density costs nothing: a
   fogged pixel and an unfogged one are both dark and the ratio between them
   survives. At day it arrives at 0.532, which is in the middle of the
   ground's own range — so every unit of density is contrast spent, from both
   ends at once, and the landscape converges on one mid tone.

   0.70 is what the world's own edge allows rather than what the frame would
   like. §23's argument still binds: the far ground is the only thing hiding
   the last chunk at 1,536, and at this scale it keeps 4.5% of its own value
   there against the night tuning's 0.8% — still inside the horizon band, and
   0.55 was measured with the edge of the world visible in the frame.

   Applied to the whole product, so the valley term goes with it. */
const DAY = 0.70;
export const LAYER = 0.35;

const FLOOR = 20;
const VALLEY = 60;
const EXTRA = 0.35;
const DEEPEST = 2.5;

/* ── Inside a cloud (§30) ───────────────────────────────────────────────
   `clouds.ts` writes this: 0 in clear air, 1 with the camera in the middle
   of a form. It lives here rather than there because *being inside a cloud
   is a fact about how far you can see*, and that is what this file is —
   every opaque surface in the world already multiplies by `fog`, so one
   uniform in this expression dims and flattens the whole frame at once
   without a post pass, a second render target or a fifth material.

   Nothing here decides what colour the murk is; `sky.ts` owns that, because
   what a fogged surface fades *into* has been its answer since §26.

   MURK is a multiplier on the density rather than a lerp toward zero: at 8
   the ground keeps 0.46 of its light at 100 units and 0.05 at 200, so a
   ridge a valley away goes and the ground under the camera does not. A
   cloud you cannot see anything through at all is a fade to a colour, and a
   fade to a colour is not flight. */
export const murk = uniform(0);
const MURK = 8;

export const fog = (world: any, palette: Palette) => {
  const d = world.sub(cameraPosition);
  const dist = vec3(d.x, d.y.mul(LAYER), d.z).length();
  const thick = exp(world.y.sub(FLOOR).div(VALLEY).negate()).clamp(0, DEEPEST).mul(EXTRA).add(1);
  const inside = float(1).add(murk.mul(MURK - 1));
  const hour: Node<'float'> = mix(float(1), float(DAY), palette.day);
  return exp(dist.mul(FOG).mul(thick).mul(inside).mul(hour).pow(2).negate());
};
