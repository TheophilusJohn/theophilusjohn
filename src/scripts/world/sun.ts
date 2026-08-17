/* §0.2 — the key light, and it is one number that two halves of the world
   have to agree on.

   The material bands the ground by `N·L` and the worker bakes what the
   ground shadows from itself; both are the same direction, and a direction
   that lived in `terrain.ts` could not be imported by `chunk.ts` without
   pulling three into the worker. So it is here, in a module that imports
   nothing, for the same reason `height.ts` and `grid.ts` are.

   Off to one side and **32° up**, which is a number §23 had to raise and is
   worth the paragraph. §22 set it at 13.9° for the shadows — a 100-unit
   peak throwing 400 units of them — and under a smooth ramp that was only
   ever flattering. Band the light and it stops working, because at 13.9°
   flat ground sits at `N·L` 0.24 and the whole range gentle terrain can
   reach is 0 to 0.56: *every* threshold is then within a few degrees of
   flat, and the ground comes back as two-tone camouflage that changes band
   on the detail layer. At 32° flat ground is 0.52 and a slope has to tilt
   14° to leave its band, which is more than anything under a ridge does.

   The trade is shadows 1.6× the height of what casts them rather than 4×,
   and they are still the thing that says a valley is under a range. From
   behind the opening heading (§22's search), so the first thing anybody
   sees is lit rather than in silhouette. */

const x = -0.62;
const y = 0.608;
const z = 0.75;
const len = Math.hypot(x, y, z);

/** Direction *toward* the light, normalised. */
export const SUN = { x: x / len, y: y / len, z: z / len } as const;
