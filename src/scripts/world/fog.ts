/* §4.7 / §18 — fog, and it is not atmosphere for its own sake.

   **Nothing imports this between §21 and §22.** The strip took the ground,
   the mist and the traffic with it and left the sky, which is exempt from
   fog by construction, so there is currently nothing in the world for this
   to fade. It is kept rather than deleted because §0.5 keeps it by name and
   because the one finding in it — the squashed vertical axis — is the thing
   that makes the tuning hold at more than one altitude, and §22 makes
   altitude unbounded where §18 had 22 units of it. It costs nothing in the
   bundle: an unimported module is not in the graph.

   Two of the constants below are pinned to a world that no longer exists.
   FOG 0.043 was solved against a ground disc of RADIUS 42 carried with the
   camera, which was the only fixed distance there was; a chunked terrain
   extending past the horizon has a different one. Re-tune at §22 and keep
   LAYER's argument, which is about what an atmosphere *is* rather than
   about how far away the ground was.

   Without it every point in a particle world is the same brightness at
   every depth and the volume flattens back into the diagram §16 exists to
   escape. It is also what hides the far clip, so the ground has no visible
   end, and what stops the last few units of the disc's radius piling into
   a bright band across the frame.

   Exponential-squared, to --void. Nothing here mixes toward a colour: the
   canvas is cleared to --void and every material over it is additive, so
   fading a contribution to zero *is* fading it to --void. One multiply on
   opacity.

   Tuned against the horizon arc, because that is the only fixed distance
   in the world: the ground disc is RADIUS units across and carried with
   the camera, so `exp(-(42k)²)` is what the ground has left where the arc
   is drawn. At 0.043 that is 0.03 — gone by the arc, as §4.7 asks, so the
   line is confirming a limit the ground has already faded into rather than
   cutting one.

   **The vertical axis is squashed, and it is the difference between a
   tuning that holds and one that only holds at the altitude it was set
   at.** Scroll is altitude now (§18): the same camera stands 26 units up
   over the hero and 4 down among the ridges. On plain radial distance the
   ground directly under the hero camera is 26 units away and comes back at
   0.29, so the whole first screen — the one everybody sees — goes into the
   haze while the low stops stay lit. Measured before this term: the hero
   was at half the light §17 shipped and philoi at 1.5x of it.

   Weighting dy at 0.35 says the fog is a layer over the ground and thin
   through its own thickness, which is both what an atmosphere is and what
   makes §4.7's sentence true at every altitude rather than at one of them:
   the arc sits at RADIUS horizontally whatever the altitude, so that is
   where the ground fades, and climbing out of the layer costs almost
   nothing. Near ground stays lit under a high camera and the far ground
   still goes; the depth gradient is 20x either way.

   Stars are exempt. They are at effective infinity and behind the fog by
   construction; running this on them would delete the sky. */

import { cameraPosition, exp, vec3 } from 'three/tsl';

export const FOG = 0.043;
export const LAYER = 0.35;

export const fog = (world: any) => {
  const d = world.sub(cameraPosition);
  return exp(vec3(d.x, d.y.mul(LAYER), d.z).length().mul(FOG).pow(2).negate());
};
