/* §0.3 / §31 — the route, as arithmetic.

   Scroll is the site. This module is the whole of what that means: a pose is
   a pure function of a scroll position and one arrival clock, and it lives
   in a file with no three and no DOM in it — `curve.ts`'s discipline from
   §18, which is why that module was written the way it was. It imports
   `height.ts` and nothing else, so Node runs the `.ts` directly and every
   number in the §31 report is this file's own output rather than a
   re-derivation of it.

   **The four stations are searched, not chosen.** Level ground a scene can
   stand on, proud of what is around it, the next one visible from the last
   one's climb-away, and no leg doubling back — §22 found the opening pose
   that way and §29 sited its slab that way. Homonoia is the exception and it
   is not an exception to the method: `height.ts`'s cluster term already
   raises a massif at CLUSTER_SITE, that massif is the biggest thing in the
   opening frame, and moving it to suit the route would cost the world its
   front door. So Homonoia is where the field puts it and the other three are
   searched around it.

   **The framing is §29's**, and it is a rule rather than four poses: stand
   off far enough that the scene is a quarter of the frame's width, aim at
   0.4 of its height, and turn 17° off the bearing to it. That puts the
   subject at 67% of the frame with the reading half clear — measured out of
   this file at every station below. The scene's own size is the one number
   §34 gets to change per station.

   **The settle is not the end of the movement**, which is §29's fourth
   constraint and the thing this step is judged on. A camera that reaches its
   pose and stops dead reads as the scroll running out. What happens instead
   is the last few units of travel: an exponential creep from the settle to a
   rest pose a little closer in, on a clock rather than on scroll, so the
   flight is still arriving for ten seconds after the reader has stopped
   scrolling. The subject is re-aimed as it creeps, so the near ground slides
   and the composition holds. */

import { CLUSTER_SITE, height } from './height';

const DEG = Math.PI / 180;

export type Pose = { x: number; y: number; z: number; yaw: number; pitch: number };

export type Station = {
  slug: string;
  /** Where §34 builds. The pose below frames this point. */
  site: { x: number; z: number };
  /** The field's own answer at the site, so nothing re-samples it per frame. */
  ground: number;
  /** What §34 will stand there: half its width and its height, in units.
      These two numbers are the only tuning the framing rule takes. */
  radius: number;
  tall: number;
  /** Where the camera stands. Searched: the bearing is off the one the
      reader arrives on, chosen for what stands *behind* the subject, and the
      height is whatever clears the ground between here and there — the
      cluster ring is a crest with a bowl inside it, so a settle at eye level
      would frame the rim and nothing in it. */
  stand: { x: number; y: number; z: number };
};

/* Searched against `height.ts` in Node. Sites: level to 8.5–13.8 units over
   their own pad, standing 7.4 to 28.9 proud of a 130-unit ring, all dry, all
   inside the 2,600 bound (968 / 1,039 / 1,077 / 2,093 from the origin), no
   leg under 536 units or over 1,289, and every next station clear of the
   ground by 34 to 44 units from the one before it. */
export const STATIONS: Station[] = [
  { slug: 'enargeia', site: { x: 12, z: -967 }, ground: 46.0, radius: 24, tall: 46, stand: { x: 3, y: 62, z: -835 } },
  { slug: 'homonoia', site: { x: -520, z: -900 }, ground: 57.2, radius: 90, tall: 70, stand: { x: -327, y: 109, z: -1359 } },
  { slug: 'philoi', site: { x: -1040, z: 280 }, ground: 42.5, radius: 22, tall: 40, stand: { x: -991, y: 57, z: 169 } },
  { slug: 'basis', site: { x: -1640, z: 1300 }, ground: 19.7, radius: 26, tall: 44, stand: { x: -1508, y: 35, z: 1243 } },
];

/* §22's opening pose, unchanged and not this module's to move. The route
   starts where the world already opens. */
export const START: Pose = { x: -60, y: 190, z: 60, yaw: 30, pitch: -9 };

/* §29's 17°, which is the composition: at 0° the subject is behind the
   paragraph and at 30° it is at the edge of the frame. */
const YAW_OFFSET = 17;
/* Aim a little above the middle of the scene, so its base sits under the
   axis and the horizon runs behind it rather than through it. */
const AIM = 0.4;

/* ── Scroll ─────────────────────────────────────────────────────────────
   The route's length is not chosen either: travel is paced at one scroll
   unit per world unit, so a long leg takes longer to fly than a short one,
   and the fixed spans are what a settle costs. 11,538 units at these
   numbers, against the document's own 10,755 at 1512×804 — one page, and
   the reader is doing to it what they do to a page. */
const PACE = 1.0;
const MIN_TRAVEL = 1100; // a short leg still gets a flight
const LEAD_IN = 500;     // the opening pose holds before the route leaves it
const SETTLE_IN = 700;   // approach → settle
/** The settle holds, and **this is the pin**. §32 spends every one of these
    units: the camera does not move at all through them, and the reader's own
    scroll walks the beats and then the column, exactly as `projects.ts` walks
    document mode's three beats through a 220% pin. 600 was enough when the
    beats played on the approach and the dwell only had the column to carry;
    it is not enough to hold four beats *and* the column, so it is 1,500 —
    which is still less per station than the document's own 1,769. */
export const DWELL = 1500;
const CLIMB_OUT = 500;   // settle → the climb away
/* The last one, which turns rather than travels. It swings 155° to look back
   at the massif, and at CLIMB_OUT's 500 units that is 46.5° of yaw per 100
   scroll units — more than double the worst anywhere else on the route
   (21.9 on the leg into Homonoia) and a visible whip. 1,200 puts it at 19.4,
   inside the envelope the rest of the route already sets.

   Worth writing down beside it: **§31's speed cap cannot catch this.**
   `fastest()` measures the distance between two poses, and a keyframe that
   turns 155° while moving 262 units is barely constrained by it — the cap
   is a bound on translation, not on apparent motion. */
const FINAL_OUT = 1200;

/* How far back the approach stands, and how high the travel flies. The
   approach is on the settle's own view axis, so closing on a station
   resolves the composition rather than swinging into it. */
const APPROACH_BACK = 2.5;   // × the stand-off
const APPROACH_SHARE = 0.55; // but never more than this of the leg
const APPROACH_UP = 70;
const CRUISE_UP = 110;       // over the highest ground on the leg
const DEPART_UP = 150;
const DEPART_ON = 220;       // past the station, toward the next one

/* ── The residual, which is §0.3's fourth constraint ────────────────────
   A few last units of travel after the type is up, and both numbers are
   what makes it read as arriving rather than as drifting: it is *toward*
   the subject, so it is the end of an approach, and it decays, so nothing
   is still moving a minute later. Its rate at the settle is 3.1 units a
   second, which is 7% of cruise. */
const CREEP_IN = 14;   // units closer to the subject
const CREEP_DOWN = 3;  // and a little lower
export const ARRIVE_TAU = 4.5;  // seconds; the driver runs this clock

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const smoothstep = (t: number) => t * t * (3 - 2 * t);

/* Shortest way round, so a turn from 350° to 10° is 20° rather than 340°. */
function mixAngle(a: number, b: number, t: number): number {
  const turn = ((b - a + 540) % 360) - 180;
  return a + turn * t;
}

/* The framing rule. Everything about how a station is composed is here, and
   it is read twice: once to build the settle keyframe and once a frame while
   the camera creeps, so the subject holds its place as the ground slides. */
export function aimAt(from: { x: number; y: number; z: number }, s: Station): Pose {
  const dx = s.site.x - from.x;
  const dz = s.site.z - from.z;
  const flat = Math.hypot(dx, dz);
  const bearing = Math.atan2(-dx, -dz) / DEG;
  const rise = s.ground + s.tall * AIM - from.y;
  return {
    x: from.x, y: from.y, z: from.z,
    yaw: bearing + YAW_OFFSET,
    pitch: Math.atan2(rise, flat) / DEG,
  };
}

/** How far back the settle stands: the distance at which the scene is a
    quarter of the frame's width at 60° and 16:10, which is §29's 118 units
    for a subject 21 across. */
export function standOff(s: Station, aspect = 1.6): number {
  const half = Math.atan(Math.tan(30 * DEG) * aspect);
  return s.radius / Math.tan(half * 0.24);
}

export const settleOf = (s: Station): Pose => aimAt(s.stand, s);

/* The pose the creep ends at: the same framing rule, from a point a few
   units along the view axis and a little lower. */
export function restOf(s: Station): Pose {
  const p = settleOf(s);
  const dx = s.site.x - p.x, dz = s.site.z - p.z;
  const flat = Math.hypot(dx, dz);
  return aimAt({
    x: p.x + (dx / flat) * CREEP_IN,
    y: p.y - CREEP_DOWN,
    z: p.z + (dz / flat) * CREEP_IN,
  }, s);
}

/* ── The keyframes ──────────────────────────────────────────────────────
   Built once, at module load, because the whole thing is a function of the
   field and four sites and none of it depends on the window. */
type Key = { y: number; pose: Pose };
/* Where a station's settle sits in the key list, so the band around it is a
   lookup rather than a search: the key before it, the settle, the end of the
   dwell, and the key after. */
type Band = { approach: number; settle: number; hold: number; after: number };

/* The highest ground on a leg, which is what the cruise keyframe stands
   over. The camera's own floor would lift it anyway (§24) — flying the
   route *into* a ridge and being pushed out of it is the failure that
   would read as the route not knowing where it is going. */
function ridge(a: { x: number; z: number }, b: { x: number; z: number }): number {
  const steps = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 40));
  let top = -Infinity;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    top = Math.max(top, height(a.x + (b.x - a.x) * f, a.z + (b.z - a.z) * f));
  }
  return top;
}

function build() {
  /* The opening pose is the first stretch. §0.3's 0% row is a beat — arrival,
     high over the landscape, with a station in the frame — and a route that
     leaves on the first wheel notch never has one.

     It drifts rather than holding, and that is the difference between a beat
     and a dead zone: a mouse wheel is a hundred pixels a notch, so five
     notches into a *held* opening nothing has moved and the only honest
     reading of that is that scrolling is broken. Twelve units along the view
     axis and four down is 0.3% of the route and it is unmistakably motion. */
  const keys: Key[] = [
    { y: 0, pose: START },
    {
      y: LEAD_IN,
      pose: {
        ...START,
        x: START.x - Math.sin(START.yaw * DEG) * 12,
        y: START.y - 4,
        z: START.z - Math.cos(START.yaw * DEG) * 12,
      },
    },
  ];
  const bands: Band[] = [];
  const stops: { slug: string; y: number }[] = [];
  let y = LEAD_IN;

  STATIONS.forEach((s, i) => {
    const settle = settleOf(s);
    const from = keys[keys.length - 1]!.pose;
    const leg = Math.hypot(s.site.x - from.x, s.site.z - from.z);
    /* Travel is paced at one scroll unit per world unit, with a floor: the
       leg from Enargeia to the massif is 527 units and at pace alone it
       would be flown in a fifth of the scroll the leg after it takes. */
    const travel = Math.max(leg * PACE, MIN_TRAVEL);

    /* Where the approach stands: back along the settle's *own view axis*
       rather than along the bearing to the site, so the subject is already
       at 67% of the frame while the reader is still closing on it. */
    const back = Math.min(standOff(s) * APPROACH_BACK, leg * APPROACH_SHARE);
    const ax = settle.x + Math.sin(settle.yaw * DEG) * back;
    const az = settle.z + Math.cos(settle.yaw * DEG) * back;
    const approach = aimAt(
      { x: ax, y: Math.max(height(ax, az), s.ground) + APPROACH_UP, z: az },
      s,
    );

    // Half the leg is spent reaching the cruise key and half closing on the
    // approach, so a settle is always the bottom of a descent.
    const mx = (from.x + ax) / 2, mz = (from.z + az) / 2;
    const cruise = aimAt(
      { x: mx, y: ridge(from, { x: ax, z: az }) + CRUISE_UP, z: mz },
      s,
    );

    keys.push({ y: (y += travel / 2), pose: cruise });
    keys.push({ y: (y += travel / 2), pose: approach });
    const approachAt = keys.length - 1;
    keys.push({ y: (y += SETTLE_IN), pose: settle });
    stops.push({ slug: s.slug, y });
    keys.push({ y: (y += DWELL), pose: settle });
    bands.push({ approach: approachAt, settle: approachAt + 1, hold: approachAt + 2, after: approachAt + 3 });

    /* **Every station climbs away, including the last one**, and that is a
       §32 correction to this step. Without it `bands[3].after` indexes past
       the end of the key list, so `bandAt` holds the last station's weight
       at 1.00 to the final scroll unit — the writeup never ramps out — and
       `LENGTH` *is* the end of the dwell, so every overshoot lands there:
       one flick anywhere in the approach flies the whole arrival at the cap
       and parks on the tail of the reading. Measured, that is the whole of
       "Basis arrives faster and ends abruptly"; the ramps themselves are
       identical at all four (0.06 / 0.20 / 0.39 / 0.61 / 0.80 / 0.94 / 1.00
       over the last 600 units) and the approach is not the fastest of the
       four either.

       The last one has no next station to aim at, so it turns back at the
       massif — the biggest thing in the world and what §22's opening frame
       is composed against — and the route ends looking across the ground it
       crossed, with Philoi about 8° off the view axis. §35 hangs the offer
       of the stick on this key. */
    const toward = STATIONS[i + 1]?.site ?? CLUSTER_SITE;
    const on = Math.hypot(toward.x - s.site.x, toward.z - s.site.z);
    const px = settle.x + ((toward.x - s.site.x) / on) * DEPART_ON;
    const pz = settle.z + ((toward.z - s.site.z) / on) * DEPART_ON;
    keys.push({
      y: (y += STATIONS[i + 1] ? CLIMB_OUT : FINAL_OUT),
      pose: {
        x: px, y: Math.max(height(px, pz), s.ground) + DEPART_UP, z: pz,
        yaw: Math.atan2(-(toward.x - px), -(toward.z - pz)) / DEG,
        pitch: -8,
      },
    });
  });

  return { keys, bands, length: y, stops };
}

const { keys: KEYS, bands: BANDS, length: LENGTH, stops: STOPS } = build();
export { LENGTH };
/** Where each settle sits on the route, for §32's deep links. */
export const stops = STOPS;
/** Read by the report and by nothing on the page. */
export const keyframes = () => KEYS.map((k) => ({ y: k.y, pose: k.pose }));

/* ── The pose ───────────────────────────────────────────────────────────
   Smoothstepped between keyframes, exactly as §18 did it: the segments are
   different lengths by a factor of five, so linear would plunge over the
   short ones, and zero velocity at each key is what makes the camera
   *arrive* at a station rather than pass through the pose it is named for. */
function between(y: number): Pose {
  let i = 0;
  while (i < KEYS.length - 2 && y >= KEYS[i + 1]!.y) i++;
  const a = KEYS[i]!, b = KEYS[i + 1]!;
  const span = b.y - a.y;
  const s = smoothstep(span <= 0 ? 1 : clamp((y - a.y) / span, 0, 1));
  return {
    x: a.pose.x + (b.pose.x - a.pose.x) * s,
    y: a.pose.y + (b.pose.y - a.pose.y) * s,
    z: a.pose.z + (b.pose.z - a.pose.z) * s,
    yaw: mixAngle(a.pose.yaw, b.pose.yaw, s),
    pitch: a.pose.pitch + (b.pose.pitch - a.pose.pitch) * s,
  };
}

/* How much of the frame belongs to a station: 1 across its dwell, ramping
   away over the approach and the climb out. It is what stops the creep from
   being a jump when the reader scrolls off a settle — the offset is scaled
   by this *and* by the arrival clock, so both ends of it are continuous. */
export function bandAt(y: number): { station: number; weight: number } {
  for (let i = 0; i < BANDS.length; i++) {
    const b = BANDS[i]!;
    const settle = KEYS[b.settle]!, hold = KEYS[b.hold]!;
    if (y >= settle.y && y <= hold.y) return { station: i, weight: 1 };
    const approach = KEYS[b.approach]!;
    if (y > approach.y && y < settle.y)
      return { station: i, weight: smoothstep((y - approach.y) / (settle.y - approach.y)) };
    const after = KEYS[b.after];
    if (after && y > hold.y && y < after.y)
      return { station: i, weight: 1 - smoothstep((y - hold.y) / (after.y - hold.y)) };
  }
  return { station: -1, weight: 0 };
}

/**
 * The pose at a scroll position. `arrive` is the driver's arrival clock:
 * 0 the moment a settle is reached, approaching 1 while the reader stays
 * there, and decaying again when they leave. It is the only input here that
 * is not scroll, and it is the whole of §0.3's fourth constraint.
 */
export function poseAt(y: number, arrive = 0): Pose {
  const p = between(clamp(y, 0, LENGTH));
  const band = bandAt(clamp(y, 0, LENGTH));
  const k = band.weight * clamp(arrive, 0, 1);
  if (k <= 0) return p;

  const s = STATIONS[band.station]!;
  const rest = restOf(s);
  const settle = settleOf(s);
  const moved = {
    x: p.x + (rest.x - settle.x) * k,
    y: p.y + (rest.y - settle.y) * k,
    z: p.z + (rest.z - settle.z) * k,
  };
  const aimed = aimAt(moved, s);
  return {
    ...moved,
    yaw: mixAngle(p.yaw, aimed.yaw, k),
    pitch: p.pitch + (aimed.pitch - p.pitch) * k,
  };
}

/** Is the reader at a settle? The driver's arrival clock runs toward 1 here
    and toward 0 everywhere else. */
export const atSettle = (y: number) => bandAt(clamp(y, 0, LENGTH)).weight >= 1;

/** The scroll position of the settle nearest a point, which is how a reader
    who has been flying rejoins the route where they are rather than at the
    top of it (§0.3). */
export function nearest(x: number, z: number): number {
  let best = 0, at = 0;
  STATIONS.forEach((s, i) => {
    const d = Math.hypot(x - s.site.x, z - s.site.z);
    if (i === 0 || d < best) { best = d; at = STOPS[i]!.y; }
  });
  return at;
}
