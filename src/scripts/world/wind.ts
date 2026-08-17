/* §0.2 — the wind, and it is **numbers rather than code**.

   §0.2 asks for one vector field that everything which moves reads: "grass
   bends, trees sway at the canopy, motes drift with it, the cloud deck
   advects along it. One field so they agree — vegetation leaning one way
   while cloud shadows move the other is the kind of wrongness nobody can
   name and everybody feels."

   The tempting shape for that is one function every layer calls. It is the
   wrong shape here, for the same reason `sun.ts` is a direction rather than
   a lighting model: the four readers do not want the same quantity. The
   blades want a *bend vector* at a point, the deck wants the
   **displacement** that vector integrates to, and the water wants a
   direction per wave with the phase speeds it was already tuned at (§26).
   A single node function would be reshaped at three of the four call sites
   and the agreement would be a comment anyway.

   So what is shared is the field's constants, and each layer's use of them
   is one line. This module imports nothing, which is what lets Node read the
   numbers in the report out of the shipped file — and `windAt` is the
   canonical statement of the field, in JS, so "what direction is the wind at
   (x, z) at t" has one answer that is not a shader.

   **The wind is a prevailing direction, a gust wave along it, and a slow
   wander of the direction itself.** Nothing here is a simulation: §0.2 is
   explicit that this is a sine of position and time. */

const DEG = Math.PI / 180;

/* ── Where it blows ─────────────────────────────────────────────────────
   Chosen against the opening pose rather than by taste. §22's search left
   the camera on a heading of 30°, so its view axis is (-0.50, -0.87) in the
   ground plane; this is within two degrees of perpendicular to that, which
   is what makes a gust *sweep across* the frame instead of running away down
   it. A gust travelling along the view axis is a brightness change with no
   direction in it.

   It is 20° off the key light's own bearing (`sun.ts`, (-0.64, 0.77) in the
   ground plane), which is deliberate: at 0° the lit face of a leaning blade
   is the face turning away from the light as it leans, and the whole field
   dims in unison as a gust passes. Off-axis, a gust rolls the light across
   the grass instead. */
const DIR_X = -0.87;
const DIR_Z = 0.5;
const LEN = Math.hypot(DIR_X, DIR_Z);

/** Unit vector the wind blows *toward*, in the ground plane. */
export const WIND = { x: DIR_X / LEN, z: DIR_Z / LEN } as const;

/** Its left normal, which is the axis the direction wander is keyed to. */
export const WIND_PERP = { x: -WIND.z, z: WIND.x } as const;

export const WIND_BEARING = Math.atan2(WIND.z, WIND.x);

/* ── The gust ───────────────────────────────────────────────────────────
   One travelling wave of strength along the wind, so the grass leans in
   bands that move downwind rather than breathing in unison — which is the
   whole difference between wind and a pulse.

   **The frequency is the number that matters and the band is §26's.** What
   a hard band edge sees is `speed / wavelength`, not speed, and the water
   was held between 0.03 and 0.07 Hz against the cloud deck's 0.02 because
   anything faster reads as a crawl in a quantised world. 9 units/s over 120
   is 0.075 Hz — a gust every 13 seconds, at the top of that band, because
   the grass is the one thing here whose whole job is to show the wind.

   Strength never reaches zero: BASE − AMP is 0.24, so the grass is always
   leaning a little and the gust is a swell in it rather than an on-off. */
export const GUST_LENGTH = 120;
export const GUST_SPEED = 9;
export const GUST_BASE = 0.62;
export const GUST_AMP = 0.38;

/** Cycles a second the gust wave presents to a band edge: 0.075. */
export const GUST_HZ = GUST_SPEED / GUST_LENGTH;

/* ── The wander ─────────────────────────────────────────────────────────
   The direction itself, drifting. Keyed across the wind rather than along
   it, so at any instant the field has a slight shear in it — grass a
   hundred units away leans a few degrees off grass here, which is what
   stops a thousand instances reading as one rigid object. Nine degrees is
   under the width of a blade's own random yaw and over what a still frame
   reads as parallel. */
export const WANDER = 9 * DEG;
export const WANDER_LENGTH = 340;
export const WANDER_PERIOD = 26;

/* ── The flutter ────────────────────────────────────────────────────────
   Per-blade, and the only term with a phase that is not a function of
   position: a stand of grass in which every blade is in step is a fabric.
   **The rate is measured, not chosen.** §26's instrument — the worst 12×12
   block of luma between two frames one sixtieth of a second apart, with the
   cloud deck as the control — put the first pass at 0.4 Hz at **4.24** levels
   a frame over a shore where the deck alone is 1.06 and §26's water took the
   same frame to 1.80. A blade is a hard edge over contrasting ground, so it
   will always move a block more than a band edge sliding across a lake does;
   what it may not do is be the fastest thing in a world whose water had to be
   slowed down to belong in it. At 0.28 Hz it is **1.53** with the deck and
   1.93 for the whole frame — the grass adds half a level to what was already
   moving, and the water is still the busiest surface in the world. */
export const FLUTTER_HZ = 0.28;
export const FLUTTER_AMP = 0.3;

/* ── What the cloud deck does with it ───────────────────────────────────
   §23 advected the deck along (1, 0.4) at 0.005 noise units a second on each
   axis, which is 3.34 world units a second at its 620-unit noise scale. The
   magnitude is kept to the digit — it was set against the deck's own feature
   size and §23 measured the frame cost of it — and only the direction moves,
   onto the wind. It is a *displacement* rather than a velocity, which is why
   the deck reads the direction here and not `windAt`: advecting a noise field
   by a gust wave would shear the clouds rather than move them. */
export const DECK_DRIFT = 3.34;

/** A unit vector `offset` degrees off the wind, which is how the water's
    four wave directions are stated (§26 tuned their speeds, not their
    bearings). */
export function windDir(offset: number) {
  const a = WIND_BEARING + offset * DEG;
  return { x: Math.cos(a), z: Math.sin(a) } as const;
}

/** The field itself: the direction and strength of the wind at a point and a
    time. The shaders build this same expression from the constants above —
    two lines each, at the three places §0.2 lists — and this is the
    statement of what those lines are. */
export function windAt(x: number, z: number, t: number) {
  const along = x * WIND.x + z * WIND.z;
  const across = x * WIND_PERP.x + z * WIND_PERP.z;
  const gust = Math.sin(((along - t * GUST_SPEED) / GUST_LENGTH) * Math.PI * 2);
  const wander =
    WANDER * Math.sin((across / WANDER_LENGTH - t / WANDER_PERIOD) * Math.PI * 2);
  const strength = GUST_BASE + GUST_AMP * gust;
  const c = Math.cos(wander);
  const s = Math.sin(wander);
  return {
    x: (WIND.x * c + WIND_PERP.x * s) * strength,
    z: (WIND.z * c + WIND_PERP.z * s) * strength,
  };
}
