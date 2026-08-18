/* §0.2 / §37 — the other ten landmarks, as boxes and where they stand.

   The stadium, the datacenter hall, the dish array, the turbines, the torii
   gate, the court, the bridge, the lighthouse, the standing stones and the
   wreck. "Findable, never on the route, carrying no writeup and no machine
   ID. Distinct enough in silhouette from the four stations that nobody flies
   to one expecting content."

   **The eighth module with no three and no DOM in it**, after `height.ts`,
   `route.ts`, `cover.ts`'s family, `scenes.ts`, `solid.ts` and `city.ts`. It
   imports the field and `cover.ts`'s hash and nothing else, so Node runs the
   `.ts` directly and every number in the §37 report — the counts, the
   heights, the spans, the clearances — is this file's own output.

   ── Ten silhouettes, and that is the constraint ────────────────────────
   §0.2's rule for this set is not about detail, it is about **telling them
   apart from a station**. A reader in free flight sees a shape on a ridge
   and decides, before arriving, whether there is anything to read there. So
   what each of these is authored for is its outline against the sky at three
   hundred units, and the two ways a landmark can fail are equally bad: a box
   with lit parts on it reads as a station, and a shape too small to resolve
   reads as nothing at all.

   Two things carry that. **Scale**: everything here is 17 to 136 units tall
   against `scenes.ts`'s 40–70 and `city.ts`'s 180–320, so a landmark is
   never the biggest thing in a frame that has a station or a city in it —
   and the court is at true basketball-court size, thirty units of deck in a
   world where a tower is three hundred and twenty.
   And **light**: what is lit here wears `--mint` and never `--leader` —
   see below, because it is the load-bearing decision of the step.

   ── A landmark's pad is zero ───────────────────────────────────────────
   `city.ts`'s convention rather than `scenes.ts`'s, for all ten and for the
   same reason: half of these are spread over hundreds of units (the array is
   310 long, the turbines 480, the bridge 280) and a slab under one of those
   is a mesa. So **every part carries a world height** and whether a landmark
   stands level or follows the ground is its own business — `levelAt` for the
   four that are built on a floor, the ground under each footing for the six
   that are not.

   ── The proxy is the geometry, minus what moves ────────────────────────
   §35's convention and §36's application of it, and it is what makes the
   audit exact: every box below is pushed to both lists in one call, so a
   landmark cannot acquire §35's placement bug, and "the closest approach to
   a proxy and to a drawn box are the same number" holds by construction.

   The one deliberate omission is the fifteen **turbine blades** — Basis's
   struts for the second time, one reason further on. A blade's place is a
   function of the clock, a proxy in the spatial hash is not, and a rotor
   whose collision lags its geometry by half a turn is §0.3's "bouncing off
   nothing" arriving on a schedule. The tower under it is solid, and the
   tower is what a reader can fly into. */

import { hash3 } from './cover';
import { LANDMARK_SITES, WATER, height } from './height';
import type { Built, Part, Signal, Solid } from './scenes';

const DEG = Math.PI / 180;

/** A landmark is a `Built` that also has lights on it. `built.ts` reads the
    two lists exactly as it reads a scene's — the lamps go into the same
    additive layer the four scenes' messages travel in, which is what holds
    everything built in the world at two draw calls. */
export type Landmark = Built & { signals: Signal[] };

type Out = { parts: Part[]; proxy: Solid[]; signals: Signal[] };

type Site = { slug: string; x: number; z: number };
const siteOf = (slug: string): Site => {
  const s = LANDMARK_SITES.find((l) => l.slug === slug)!;
  return { slug, x: s.x, z: s.z };
};

/* Local to world, for an offset. The same double application §36 needed and
   for the same reason: an instance's yaw turns the box about its own centre
   and does not move it, so `built.ts`'s shader turns the box and this turns
   the place it stands. Both off the same angle, in one call each. */
function turn(u: number, v: number, deg: number): [number, number] {
  const r = deg * DEG;
  return [u * Math.cos(r) + v * Math.sin(r), v * Math.cos(r) - u * Math.sin(r)];
}

/** The yaw that points a part's **local +z** along a world bearing. Five of
    these are sited by a direction the terrain chose — the array's contour,
    the crest, the span, the approach, the fall — and writing that as a
    bearing and converting once is the only way those five cannot disagree
    with the shader about which way round the box goes.

    `turn` and `built.ts`'s `rot` both send local +z to `(sin θ, cos θ)`, so
    the bearing a part faces is `90 − θ` and this is that read backwards. It
    was `90 + θ` on the first build, which is the same number at 90° and
    wrong everywhere else — the dish array came back running **122° off the
    contour** it was sited on and the turbines across their own crest rather
    than along it. Neither is visible in a count or a clearance; what catches
    it is measuring the bearing between two placed parts against the bearing
    that was asked for. */
const yawFor = (bearing: number) => 90 - bearing;

/** The highest ground over a footprint, plus a lift: `scenes.ts`'s `padOf`,
    kept local because a landmark's parts carry world heights and there is no
    pad for it to be. The four that use it are the four built on a floor. */
function levelAt(site: Site, half: number, lift = 1.2): number {
  let top = -Infinity;
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      top = Math.max(top, height(site.x + (i * half) / 2, site.z + (j * half) / 2));
    }
  }
  return top + lift;
}

/** The lowest ground under one box's footprint, so a footing is buried on the
    high corner rather than standing on a stilt on the low one. §36's, and the
    six landmarks that follow the ground all call it. */
function underAt(site: Site, ox: number, oz: number, w: number, d: number, yaw: number): number {
  let low = Infinity;
  for (const su of [-1, 1]) {
    for (const sv of [-1, 1]) {
      const [cx, cz] = turn(su * w, sv * d, yaw);
      low = Math.min(low, height(site.x + ox + cx, site.z + oz + cz));
    }
  }
  return low;
}

/** One box, from the ground up, into both lists at once. There is no way to
    ask for a box that is drawn and not solid: see the header. */
function block(
  out: Out,
  ox: number, oz: number, from: number, to: number,
  w: number, d: number, yaw: number,
): void {
  out.parts.push({ x: ox, y: (from + to) / 2, z: oz, w, h: (to - from) / 2, d, yaw, kind: 0, a: 0, b: 0 });
  out.proxy.push({ x: ox, y: (from + to) / 2, z: oz, w, h: (to - from) / 2, d, yaw, ride: false });
}

/** A lamp: **a signal that does not travel.** `from` and `to` are the same
    point, the arc is zero and the span is the whole cycle, so §34's billboard
    resolves to a fixed dot with no state in it — the fourth use of
    `stands.ts`'s construction and not one new draw call.

    `rate` is 0 for a lamp that is simply on. The lighthouse is the exception
    and it is the only one: a rate with a short span is a light that comes
    round, which is what a turning beam looks like from anywhere it can be
    seen from.

    **A lamp has to be in air.** The additive layer does not write depth but
    it does *test* it (§15's rule for additive particles), so a billboard at
    the centre of the box that is meant to be emitting it is drawn and then
    discarded — measured, the lighthouse's beacon and the stadium's four
    floodlights produced **no change at all in an 80-pixel window over nine
    seconds** of their own cycle, which reads as a light that does not work
    rather than as a light that is hidden. All three lit landmarks were
    authored that way on the first build. The fix is geometric, not a render
    order: put the lamp where a lamp is, in the open, and where the housing
    would enclose it — the lighthouse — make the housing four mullions and a
    roof so the light is seen *through* it. */
function lamp(out: Out, ox: number, y: number, oz: number, size: number, far = 520, rate = 0, span = 1): void {
  out.signals.push({
    from: [ox, y, oz], to: [ox, y, oz],
    rate, phase: 0.5, arc: 0, span, group: LAMP_GROUP, node: -1, size, far,
  });
}

/** The group a lamp reads its flow from. `built.ts` clamps the index to the
    four scene clocks, so 4 lands on Basis's — which never leaves 1, and a
    lamp is a thing that is on. It is also what the tint selects on. */
export const LAMP_GROUP = 4;

/* ── The stadium ────────────────────────────────────────────────────────
   §0.2: "A bowl with floodlights, lit, empty, and a figure on a plinth
   outside it. No crest and no wordmark — the silhouette does the work."

   Sited on the flattest ground in the world outside everything already
   standing: **5.3 units of relief over the 86 the bowl covers**. A bowl is
   the one shape here that cannot follow the ground — a ring of stands whose
   rim rises and falls is a quarry — so it is built on a floor and the low
   side is buried, which is `scenes.ts`'s slab argument at four times the
   footprint.

   Fourteen segments and two tiers, because a bowl is a ring seen from
   outside and a rake seen from inside, and two rings of boxes at two radii
   and two heights is both at once. The segments **overlap**: at 14 round a
   54-unit inner radius the chords are 24.2 apart and the boxes 24 across, so
   the ring closes and there is no way in except over the rim. That is what a
   stadium is, and it is also what makes the proxy exact.

   The figure is 19 units and stands 96 off the rim, which is the whole of
   §0.2's "no crest and no wordmark": it is the only thing in this world that
   is a person, and it is outside the building rather than on it. */
const ST_SEGMENTS = 14;

function stadium(): Landmark {
  const site = siteOf('stadium');
  const out: Out = { parts: [], proxy: [], signals: [] };
  const F = levelAt(site, 86);

  // The pitch, and it is empty. Two units proud of the floor, so the bowl
  // reads as looking down into something rather than as a hole.
  block(out, 0, 0, F - 9, F + 0.6, 40, 26, 0);

  for (let k = 0; k < ST_SEGMENTS; k++) {
    const a = (k / ST_SEGMENTS) * Math.PI * 2;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    for (const [ra, rb, half, deep, tall] of [[54, 44, 12, 9, 11], [68, 58, 15, 11, 26]] as const) {
      /* The segment's long axis is the **ellipse's** own tangent, not the
         circle's: a bowl 136 by 116 has a tangent up to 7° off the
         perpendicular to its radius, and at 14 segments that is the
         difference between a ring that closes and a ring with fourteen gaps
         in it. Taken off the parametric derivative, so it is the shape's
         answer rather than an approximation of it. */
      const tangent = Math.atan2(rb * cos, -ra * sin) / DEG;
      block(out, ra * cos, rb * sin, F - 10, F + tall, half, deep, -tangent);
    }
  }

  /* Four floodlight masts, on the diagonals so none of them stands in front
     of a stand. 52 units, which is twice the rim and four conifers. */
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const ox = 74 * Math.cos(a);
    const oz = 64 * Math.sin(a);
    block(out, ox, oz, underAt(site, ox, oz, 1.7, 1.7, 0) - 5, F + 52, 1.7, 1.7, 0);
    block(out, ox, oz, F + 52, F + 55.5, 6.2, 2.2, -(a / DEG + 90));
    // Under the head and seven units inboard of the shaft, which is the only
    // place on a 3.4-wide mast that a five-unit billboard is in open air.
    lamp(out, 67 * Math.cos(a), F + 50.5, 58 * Math.sin(a), 5.0, 900);
  }

  // The figure on its plinth, outside.
  {
    const [ox, oz] = [0, -96];
    const g = underAt(site, ox, oz, 5, 5, 0) - 4;
    block(out, ox, oz, g, F + 7, 5, 5, 0);
    block(out, ox, oz, F + 7, F + 16, 1.7, 1.7, 0);
    block(out, ox, oz, F + 16, F + 19.5, 1.9, 1.9, 0);
  }

  return { slug: 'stadium', site: { x: site.x, z: site.z }, pad: 0, parts: out.parts, proxy: out.proxy, signals: out.signals };
}

/* ── The datacenter hall ────────────────────────────────────────────────
   §0.2: "Long, low, lit racks visible through it. The only landmark that is
   literally the subject of the site."

   **Visible through it** is the whole specification, and it is what stops
   this being a box: the long sides are ten columns rather than two walls, so
   the racks inside are read against the far side of the hall from any angle
   that is not down the ends. A hall you can see into is also a hall you can
   fly into — the columns are 21 units apart and the interior is 14.5 high
   against a camera of four — which is the second thing it is for. There are
   three places in this world a reader can be *inside* something, and this is
   one of them; Delhi's arch and the torii are the others, and both are gaps
   rather than rooms.

   Twelve racks in two rows, each with a lamp on it. That is 12 of the 19
   lights in the whole step, and they are the reason the hall reads as
   running rather than as abandoned — which is the one thing this landmark
   has to say, being the only one that is the subject of the site. */
const DC_YAW = 24;

function datacenter(): Landmark {
  const site = siteOf('datacenter');
  const out: Out = { parts: [], proxy: [], signals: [] };
  const F = levelAt(site, 78);
  const y = DC_YAW;

  block(out, 0, 0, F - 16, F + 0.5, 60, 22, y);      // the floor
  block(out, 0, 0, F + 15, F + 17.5, 62, 24, y);     // the roof
  for (const s of [-1, 1]) {
    const [ox, oz] = turn(s * 60, 0, y);
    block(out, ox, oz, F + 0.5, F + 15, 1.4, 22, y);  // the two ends
  }
  for (const c of [-48, -24, 0, 24, 48]) {
    for (const s of [-1, 1]) {
      const [ox, oz] = turn(c, s * 21, y);
      block(out, ox, oz, F + 0.5, F + 15, 1.5, 1.5, y);
    }
  }
  /* Two rows of six, and **the aisle between them is 15 units** — which is
     the number the hall is designed around rather than a leftover. A camera
     is eight across (§35), so a four-unit aisle is a hall you can see into
     and not one you can fly down, and the difference between those two is
     the whole of what this landmark is for. The columns stand at ±21 with
     nothing at z = 0, so the length of the aisle is clear of them too. */
  for (const c of [-45, -27, -9, 9, 27, 45]) {
    for (const s of [-1, 1]) {
      const [ox, oz] = turn(c, s * 13, y);
      block(out, ox, oz, F + 0.5, F + 11, 3.5, 5.5, y);
      lamp(out, ox, F + 11.6, oz, 3.0, 620);
    }
  }

  return { slug: 'datacenter', site: { x: site.x, z: site.z }, pad: 0, parts: out.parts, proxy: out.proxy, signals: out.signals };
}

/* ── The dish array ─────────────────────────────────────────────────────
   §0.2: "Six or eight radio telescopes on a hillside, all pointed the same
   way. Machines listening and agreeing on what they heard."

   **All pointed the same way is the content**, so the site is chosen for the
   steadiness of its gradient rather than for its steepness: the search scores
   how far the ground's own gradient drifts across the array as well as how
   steep it is, and the first pass — which weighed only the drift — picked a
   0.107 rise, which is a field. What it wants is a hillside a reader can see
   six machines standing on *the same slope*, and the array runs along the
   contour so all six stand at about one height.

   A dish cannot tilt: nothing in this world has a pitch, only a yaw (§34).
   So the dish face is **four slats stepping up and back**, which is a tilted
   plane made of boxes — and because every dish's step is the same offset in
   the same local frame, the shared pointing is exactly the thing the
   construction cannot get wrong. Widths 22, 36, 36, 22, so the outline is a
   disc rather than a billboard. */
const DA_COUNT = 6;
const DA_PITCH = 62;
/** The uphill bearing at the site, measured over the array's own 200 units
    rather than at the centre point: a single gradient here is the detail
    layer's 0.9-unit bump as much as it is the hill. */
const DA_UPHILL = 61;

function dishes(): Landmark {
  const site = siteOf('dishes');
  const out: Out = { parts: [], proxy: [], signals: [] };
  const yaw = yawFor(DA_UPHILL);

  for (let k = 0; k < DA_COUNT; k++) {
    const t = (k - (DA_COUNT - 1) / 2) * DA_PITCH;
    // Along the contour, which is across the fall line.
    const [ox, oz] = turn(t, 0, yaw);
    const g = underAt(site, ox, oz, 5, 5, yaw) - 7;
    block(out, ox, oz, g, g + 20, 5, 5, yaw);          // the pedestal
    block(out, ox, oz, g + 20, g + 30, 2.4, 7, yaw);   // the mount
    const face: [number, number, number][] = [[-9, 26.5, 11], [-3, 29.7, 18], [3, 32.9, 18], [9, 36.1, 11]];
    for (const [dz, at, half] of face) {
      const [px, pz] = turn(t, dz, yaw);
      block(out, px, pz, g + at - 1.7, g + at + 1.7, half, 3.2, yaw);
    }
  }

  return { slug: 'dishes', site: { x: site.x, z: site.z }, pad: 0, parts: out.parts, proxy: out.proxy, signals: out.signals };
}

/* ── The turbines ───────────────────────────────────────────────────────
   §0.2: "On a ridge, and they turn with the gust wave §27 already built.
   Free motion."

   **On the crest**, which is not what the first search asked for: scoring
   "the ground is higher at both ends" rewards a *saddle*, and the site it
   picked sat four units below the flank beside it. A crest is above the
   ground either side of it and holds its own height along itself, and the
   site that is: 65.3 at the middle against flanks of 45.7 and 35.4, running
   54 to 68 over the 480 the five stand on.

   **The gust wave is the rate, not a shake.** `wind.ts`'s strength at a point
   is `GUST_BASE + GUST_AMP·sin(2π(along − t·GUST_SPEED)/GUST_LENGTH)`, and a
   rotor that turns *with* it has that as its angular rate — so what the
   shader carries is the rate's integral, `SPIN_GUST·cos` of the same phase,
   added to a steady term. Two things follow and both are the point: a gust
   travelling along the ridge reaches the five turbines at different times, so
   they are never in step and nothing had to be jittered to make that true;
   and the rate can be checked, which is what `spinHz` below is for. */
const WT_COUNT = 5;
/** **96 rather than 120, and the gust is why.** `wind.ts`'s wave is 120 units
    long, so a row on a 120 pitch puts all five turbines at the same phase of
    it — five rotors turning in step, which is the one thing a wind farm never
    looks like and is exactly the failure the gust term was added to avoid.
    At 96 the spacing is 0.8 of a wavelength and the five sit a fifth of a
    cycle apart, measured 0.797 along the wind. */
const WT_PITCH = 96;
/** The crest holds from −200 to +280 of the site and falls away outside it
    (measured at 40-unit steps against both flanks), so the row is centred on
    the middle of what it stands on rather than on the search's own point. */
const WT_ALONG = 40;
/** The crest's bearing, searched at four units over ±200. */
const WT_CREST = 145;
/** Nacelles face the wind, which is `wind.ts`'s prevailing direction and has
    nothing to do with the crest — the two bearings are 15° apart here, and
    that is the field's arithmetic rather than an arrangement. */
export const WT_BLADES = 3;
export const WT_RADIUS = 20;
export const WT_LENGTH = 17;
/** Turns a second, steady. */
export const SPIN_HZ = 0.055;
/** The gust's contribution, in turns. The rate it produces is
    `SPIN_HZ + 2π·SPIN_GUST·GUST_HZ·sin(φ)`, so this has to stay under
    `SPIN_HZ / (2π·GUST_HZ)` = 0.117 or the rotor turns backwards at the
    bottom of a gust — which is the one thing a turbine may not do. */
export const SPIN_GUST = 0.055;

function turbines(): Landmark {
  const site = siteOf('turbines');
  const out: Out = { parts: [], proxy: [], signals: [] };
  const along = yawFor(WT_CREST);

  for (let k = 0; k < WT_COUNT; k++) {
    const t = (k - (WT_COUNT - 1) / 2) * WT_PITCH + WT_ALONG;
    const [ox, oz] = turn(0, t, along);
    const g = underAt(site, ox, oz, 4.4, 4.4, 0) - 9;
    block(out, ox, oz, g, g + 49, 4.4, 4.4, 0);
    block(out, ox, oz, g + 49, g + 97, 2.9, 2.9, 0);
    /* The nacelle, and the hub 7.5 in front of it. `WIND_YAW` is a constant
       rather than a call: `wind.ts` is numbers, and one bearing converted
       once is the whole of what this needs from it. */
    block(out, ox, oz, g + 97, g + 102, 3.0, 7.0, WIND_YAW);
    const [hx, hz] = turn(0, 8.5, WIND_YAW);
    for (let b = 0; b < WT_BLADES; b++) {
      out.parts.push({
        x: ox + hx, y: g + 99.5, z: oz + hz,
        w: 1.9, h: WT_LENGTH, d: 0.7,
        yaw: WIND_YAW, kind: 5, a: b / WT_BLADES, b: WT_RADIUS,
      });
    }
  }

  return { slug: 'turbines', site: { x: site.x, z: site.z }, pad: 0, parts: out.parts, proxy: out.proxy, signals: out.signals };
}

/* `wind.ts`'s prevailing direction as a yaw, so a nacelle faces it. The wind
   blows toward (-0.87, 0.5); a part's local +z points along `yawFor` of that
   bearing, and a rotor faces into the wind rather than downwind. */
const WIND_YAW = yawFor((Math.atan2(0.5, -0.87) / DEG) + 180);

/* ── The torii gate ─────────────────────────────────────────────────────
   §0.2: "On a peak. Pure silhouette, and it reads as a threshold rather than
   a building."

   The highest point left in the world once everything else is placed: **87.9
   units**, against a field whose highest ground is 128. Ten boxes, and the
   only landmark with no floor and no lit part — what it is is an outline.

   It is turned so its opening faces the origin, which is not decoration: a
   threshold read edge-on is two posts. The approach bearing is 104°, so the
   gate's width stands across it, and a reader who flies at this from
   anywhere near the route's own quarter of the world arrives through it
   rather than past it. The opening is **29 wide and 24 tall** against a
   camera of four — Delhi's arch again, one landmark over. */
function torii(): Landmark {
  const site = siteOf('torii');
  const out: Out = { parts: [], proxy: [], signals: [] };
  const approach = Math.atan2(-site.z, -site.x) / DEG;
  const yaw = yawFor(approach);
  const g = levelAt(site, 40, 0) - 8;

  for (const s of [-1, 1]) {
    const [ox, oz] = turn(s * 17, 0, yaw);
    block(out, ox, oz, g, g + 8, 3.4, 3.4, yaw);       // the base stone
    block(out, ox, oz, g + 8, g + 40, 2.4, 2.4, yaw);  // the pillar
  }
  block(out, 0, 0, g + 32, g + 36, 23, 1.6, yaw);      // nuki, the tie beam
  block(out, 0, 0, g + 36, g + 40, 1.6, 1.6, yaw);     // gakuzuka, the strut
  block(out, 0, 0, g + 40, g + 43, 25, 2.0, yaw);      // shimaki
  block(out, 0, 0, g + 43, g + 46.5, 27, 2.4, yaw);    // kasagi, the top lintel
  /* The upturned ends, as a step rather than a curve. A curve here would be
     six more boxes for a shape nobody reads at 300 units, which is the only
     distance this is seen from. */
  for (const s of [-1, 1]) {
    const [ox, oz] = turn(s * 25.5, 0, yaw);
    block(out, ox, oz, g + 46.5, g + 49, 3, 2.4, yaw);
  }

  return { slug: 'torii', site: { x: site.x, z: site.z }, pad: 0, parts: out.parts, proxy: out.proxy, signals: out.signals };
}

/* ── The court ──────────────────────────────────────────────────────────
   §0.2: "One, lit, netted, on a plateau where it has no business being. The
   smallest thing in the world."

   **It is at true scale and that is the joke.** The deck is 30 by 16.4 and
   the rim is 3.05 above it, which is a basketball court; everything else in
   this world is in the register §0.2 calls oversized, and a city tower is
   twenty times this whole landmark's height. Nothing else here would survive
   being real size and this is the one thing that has to be.

   The plateau is searched for the same way: a small flat top with the ground
   falling away from it. **3.9 units of relief over the 26 the deck covers**,
   standing 13 above the mean of what is inside 200 units of it.

   No fence. The first build had twelve posts and four rails at 0.3 units
   across, which is §34's aliasing lesson at a tenth of the size — two edges
   in one pixel from anywhere, and what came back was a grey haze round the
   deck. What is netted is the two hoops. */
function court(): Landmark {
  const site = siteOf('court');
  const out: Out = { parts: [], proxy: [], signals: [] };
  const F = levelAt(site, 26, 0.4);

  block(out, 0, 0, F - 5, F + 0.35, 15, 8.2, 0);       // the deck
  block(out, 0, 0, F + 0.35, F + 0.5, 14, 7.4, 0);     // the playing surface

  for (const s of [-1, 1]) {
    block(out, s * 13.5, 0, F + 0.5, F + 3.7, 0.4, 0.4, 0);        // the post
    block(out, s * 13.2, 0, F + 3.05, F + 3.7, 0.3, 1.8, 0);       // the backboard
    block(out, s * 12.4, 0, F + 3.0, F + 3.12, 0.7, 0.7, 0);       // the rim
  }
  /* The two lamp posts stand off the deck, on their own ground: a post
     rooted in a slab it is beside is the one thing in this landmark that
     would be visible at true scale and wrong. */
  for (const s of [-1, 1]) {
    const oz = s * 10;
    block(out, 0, oz, underAt(site, 0, oz, 0.6, 0.6, 0) - 3, F + 11, 0.6, 0.6, 0);
    block(out, 0, oz, F + 11, F + 12, 1.4, 1.2, 0);
    lamp(out, 0, F + 10.7, s * 8.2, 1.6, 320);
  }

  return { slug: 'court', site: { x: site.x, z: site.z }, pad: 0, parts: out.parts, proxy: out.proxy, signals: out.signals };
}

/* ── The bridge ─────────────────────────────────────────────────────────
   §0.2: "Across a valley. Infrastructure that connects, and a line to
   follow."

   The valley is searched rather than the ground: what the rule looks for is
   a low line with abutments squarely on both sides of it and the ground
   still rising beyond both, which is what tells a crossing from a col. The
   one it found is **280 across and 41 deep** — abutments at 60.9 and 60.2,
   which is a 0.7-unit difference over 280 and is why the deck is level, and
   a floor at 19.4.

   Six piers, so it is a viaduct rather than an arch: an arch springs from
   low on the valley sides and this valley is wide and shallow, so an arch
   would have four units of rise and read as a bent deck. The piers are 47
   apart and 9 to 14 across, which leaves 33 units of gap — you fly *under*
   it as well as along it, and that is the second half of "a line to follow".

   Each pier stands on the ground under its own footprint, which is the only
   part of this that is not level: the gorge floor is not flat and six piers
   cut to one length would be six piers of which four float. */
const BR_BEARING = 90;
const BR_HALF = 140;
const BR_DECK = 64.5;
const BR_PIERS = [-117, -70, -23, 23, 70, 117];

function bridge(): Landmark {
  const site = siteOf('bridge');
  const out: Out = { parts: [], proxy: [], signals: [] };
  const yaw = yawFor(BR_BEARING);

  block(out, 0, 0, BR_DECK - 3.2, BR_DECK, 9, BR_HALF, yaw);
  for (const s of [-1, 1]) {
    const [ox, oz] = turn(s * 9.6, 0, yaw);
    block(out, ox, oz, BR_DECK, BR_DECK + 1.8, 1.2, BR_HALF, yaw);
  }
  for (const t of BR_PIERS) {
    const [ox, oz] = turn(0, t, yaw);
    const g = underAt(site, ox, oz, 4.5, 7, yaw) - 8;
    block(out, ox, oz, g, BR_DECK - 5.6, 4.5, 7, yaw);
    block(out, ox, oz, BR_DECK - 5.6, BR_DECK - 3.2, 6.5, 9, yaw);
  }
  for (const s of [-1, 1]) {
    const [ox, oz] = turn(0, s * (BR_HALF + 8), yaw);
    const g = underAt(site, ox, oz, 11, 10, yaw) - 12;
    block(out, ox, oz, g, BR_DECK, 11, 10, yaw);
  }

  return { slug: 'bridge', site: { x: site.x, z: site.z }, pad: 0, parts: out.parts, proxy: out.proxy, signals: out.signals };
}

/* ── The lighthouse ─────────────────────────────────────────────────────
   §0.2: "On a lake, one turning light, visible from further than it should
   be."

   It stands on a rock that is **0.7 units proud of the water line**, in the
   middle of a body of which **91% of the ground inside 150 units is under
   `WATER`** — which is the whole of the siting rule and it is the field's
   answer rather than a placed island.

   **The turning light is a rate, not a beam.** A beam is a second geometry
   with a pitch this world does not have, and from anywhere it can be seen
   from — which is across a lake — what a turning light *is* is a flash: the
   lamp is a signal with a nine-second cycle alive for a fifth of it. And the
   "further than it should be" is a number since §37 rather than a claim:
   every other light in this world is gone by 320 to 900 units and this one
   carries to **2,600**, which is most of the way across the world. */
const LH_ROTATE = 9;

function lighthouse(): Landmark {
  const site = siteOf('lighthouse');
  const out: Out = { parts: [], proxy: [], signals: [] };
  // Measured from the water plane rather than from the ground: what this
  // stands in is a lake, and the rock under it is 0.7 units of it.
  const base = WATER + 4.5;

  block(out, 0, 0, WATER - 16, base, 13, 13, 0);          // the rock
  const drums: [number, number, number][] = [[0, 12.5, 8.0], [12.5, 23.5, 6.8], [23.5, 33.5, 5.8], [33.5, 41.5, 5.0]];
  for (const [from, to, half] of drums) block(out, 0, 0, base + from, base + to, half, half, 0);
  block(out, 0, 0, base + 41.5, base + 44, 7.2, 7.2, 0);  // the gallery
  /* The lantern is four mullions rather than a wall, so the beacon inside it
     is seen. It is the datacenter's argument at a fortieth of the size. */
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    block(out, sx * 3.9, sz * 3.9, base + 44, base + 50.5, 0.7, 0.7, 0);
  }
  block(out, 0, 0, base + 50.5, base + 54.5, 5.6, 5.6, 0);// the roof
  block(out, 15, 11, base, base + 10, 6, 5, 18);          // the keeper's shed
  block(out, 15, 11, base + 10, base + 11.5, 6.8, 5.8, 18);

  lamp(out, 0, base + 47, 0, 6.0, 2600, 1 / LH_ROTATE, 0.24);

  return { slug: 'lighthouse', site: { x: site.x, z: site.z }, pad: 0, parts: out.parts, proxy: out.proxy, signals: out.signals };
}

/* ── The standing stones ────────────────────────────────────────────────
   §0.2: "Five standing stones. A Raft cluster as a monument. Legible only to
   someone who knows what five nodes means."

   The five stand on `height.ts`'s **own ring formula** — `i/5·2π − π/2`, which
   is `clusterNode`'s — at a thirtieth of Homonoia's radius. That is the whole
   of the joke and it is the only thing this landmark has to get right: the
   monument and the running cluster are the same five places, read at two
   scales, and a reader who has been to Homonoia has seen this arrangement
   before. Nothing here is lit and nothing moves; a Raft cluster with no term
   in it is a ruin, which is what a monument to one would be.

   Open ground, proud of what surrounds it: 7.3 units of relief over its 60,
   standing 2 above the mean of everything inside 420. */
const SS_NODES = 5;
const SS_RING = 30;

function stones(): Landmark {
  const site = siteOf('stones');
  const out: Out = { parts: [], proxy: [], signals: [] };

  for (let i = 0; i < SS_NODES; i++) {
    const a = (i / SS_NODES) * Math.PI * 2 - Math.PI / 2;
    const ox = Math.cos(a) * SS_RING;
    const oz = Math.sin(a) * SS_RING;
    const yaw = -(a / DEG) + (hash3(i, 3, 7) - 0.5) * 26;
    const g = underAt(site, ox, oz, 4.2, 3.4, yaw) - 5;
    const tall = 19 + 7 * hash3(i, 5, 11);
    block(out, ox, oz, g, g + 6.2, 4.2, 3.4, yaw);
    block(out, ox, oz, g + 6.2, g + tall, 2.8, 2.2, yaw);
    /* A cap, offset, so the tops are not five identical rectangles. What
       makes a stone read as a stone rather than as a post is that its
       outline has a corner its shading does not explain (§28's boulder). */
    const [cx, cz] = turn((hash3(i, 7, 13) - 0.5) * 2.4, (hash3(i, 9, 17) - 0.5) * 2, yaw);
    block(out, ox + cx, oz + cz, g + tall, g + tall + 2.6, 2.4, 1.9, yaw);
  }

  return { slug: 'stones', site: { x: site.x, z: site.z }, pad: 0, parts: out.parts, proxy: out.proxy, signals: out.signals };
}

/* ── The wreck ──────────────────────────────────────────────────────────
   §0.2: "A collapsed tower or a dry dock. A world with a past does not read
   as generated."

   Both, as it turns out, because the siting rule found a dry one: a floor
   between `WATER` and `WATER + 5` in a basin whose surroundings stand 22
   above it and with **no standing water inside 200 units**. So the tower has
   fallen into a lake bed that has since gone dry, which is a longer past
   than a broken building on a hill.

   Three boxes of stump, offset as they rise so the break is ragged, and then
   the shaft **lying on the ground in five segments** running 130 units from
   the foot of it. The segments taper the way a tower does and each carries a
   few degrees of its own yaw — a fallen tower whose sections are collinear is
   a pipe, and what says "this fell" is that the pieces have rolled apart. */
function wreck(): Landmark {
  const site = siteOf('wreck');
  const out: Out = { parts: [], proxy: [], signals: [] };
  const g = levelAt(site, 40, 0) - 14;
  const fall = 40;

  block(out, 0, 0, g, g + 12, 16, 16, 0);
  block(out, 0, 0, g + 12, g + 31, 11, 11, 0);
  block(out, 1.5, 0.5, g + 31, g + 43, 8.5, 9.5, 6);
  block(out, 3.5, 1.5, g + 43, g + 50, 5, 8, -9);

  const seg: [number, number][] = [[30, 7.5], [56, 6.6], [82, 5.6], [107, 4.6], [130, 3.6]];
  for (const [t, half] of seg) {
    const yaw = yawFor(fall + (hash3(Math.round(t), 1, 3) - 0.5) * 14);
    const [ox, oz] = turn(0, t, yawFor(fall));
    const gr = underAt(site, ox, oz, half, 12, yaw) - 3;
    block(out, ox, oz, gr, gr + half * 2 + 3, half, 12, yaw);
  }
  // Rubble, and it is what makes the ground under a fall read as debris
  // rather than as a lawn with a pipe on it.
  for (let k = 0; k < 4; k++) {
    const a = hash3(k, 11, 5) * Math.PI * 2;
    const r = 22 + hash3(k, 13, 7) * 46;
    const ox = Math.cos(a) * r;
    const oz = Math.sin(a) * r;
    const half = 3 + hash3(k, 17, 19) * 2.6;
    const gr = underAt(site, ox, oz, half, half, 0) - 2;
    block(out, ox, oz, gr, gr + half * 1.5, half, half * 0.8, hash3(k, 19, 23) * 90);
  }

  return { slug: 'wreck', site: { x: site.x, z: site.z }, pad: 0, parts: out.parts, proxy: out.proxy, signals: out.signals };
}

export const LANDMARKS: Landmark[] = [
  stadium(), datacenter(), dishes(), turbines(), torii(),
  court(), bridge(), lighthouse(), stones(), wreck(),
];
export const landmarkOf = (slug: string): Landmark => LANDMARKS.find((l) => l.slug === slug)!;
