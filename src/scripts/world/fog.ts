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

import { cameraPosition, exp, vec3 } from 'three/tsl';

export const FOG = 0.0011;
export const LAYER = 0.35;

const FLOOR = 20;
const VALLEY = 60;
const EXTRA = 0.35;
const DEEPEST = 2.5;

export const fog = (world: any) => {
  const d = world.sub(cameraPosition);
  const dist = vec3(d.x, d.y.mul(LAYER), d.z).length();
  const thick = exp(world.y.sub(FLOOR).div(VALLEY).negate()).clamp(0, DEEPEST).mul(EXTRA).add(1);
  return exp(dist.mul(FOG).mul(thick).pow(2).negate());
};
