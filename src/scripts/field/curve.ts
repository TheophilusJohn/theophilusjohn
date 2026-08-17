/* §4.7 / §18 — the flight path, as arithmetic.

   Separated from camera.ts because it is data and a lerp with no three, no
   DOM and no state: the pose at a scroll position is a pure function of
   that position and the layout, which is exactly what §4.7 requires of the
   whole scene and the only part of it that can be checked without a GPU.

   Camera y, how far back it stands on +z, and how far it is looking down.
   The three are not independent: the cluster is a ring at altitude 9 with
   the massif under it, and at 50° of field of view there is only ±25° to
   put it in. Every pose below was checked against that — the steep ones
   have to stand close or the cluster leaves the top of the frame, and by
   project four it is overhead and on its way out, which is what being down
   among the ridges looks like.

   **§20 re-tuned them against the surface**, which is what §18 could not
   do: it chose these when the ground was haze that never resolved, so
   there was nothing to compose against. The measurement that moved them is
   the angle between the view axis and the ground under the cluster. At
   §18's distances that ran 11 to 18 degrees *below* the axis at every stop
   but the hero, which is the bottom third of the frame — so the landform
   was cropped by the fold and the near flank filled what was left.
   Standing further back closes that angle: `dist` is up 2 to 4 units at
   every project, and the ring now spans 17 to 33% of the frame width with
   its centre 69 to 72% of the way down it, measured by projecting the five
   node positions rather than by looking.

   The hero goes the other way, and against the letter of §20. It says
   pull back and up in case the ring does not fit at alt 26; measured, the
   ring was 17% of the frame and never came near an edge, so what it needed
   was not room but somewhere to be that is not behind the display type.
   Alt 30 with `dist` 12 drops it clear of the name — further from the
   cluster than before (24.0 units against 21.4, because at the top of the
   flight altitude is the longer leg) while looking down the same 58°. */

export type Pose = { alt: number; dist: number; pitch: number; exposure: number };
export type Key = { y: number; pose: Pose };
export type Range = { start: number; end: number };

/* ── Exposure ────────────────────────────────────────────────────────────
   The fourth channel, and the one §20 exists for. §19 shipped a single
   number for the whole page, and a single number has to clear the tightest
   text anywhere on it: a 10px --dim metric label at Homonoia's beat 2 could
   take 1.72x of it while Enargeia's beat 3 could take 596x. Every stop
   inherited the ceiling of the worst one, so the hero and the bottom of the
   descent — the two frames with the least text over the world — were as
   dark as the frame with the most.

   Every value here is measured rather than chosen. The harness computes
   what the surface may spend inside each text element's own box at each
   stop; a keyframe takes the tightest of those, at 0.85 rather than at 1.0.
   The margin is not caution: the binding element and the brightest patch of
   ground both move continuously, so a scroll position between two
   keyframes can exceed a ceiling that both of them clear. It is checked on
   the interpolated path, at the stops and between them.

   Four of the fourteen stops have no ground behind any of their text and
   no measured ceiling at all. Those are capped by taste at 0.70, which is
   where the landform is lit and the sky still reads as night.

   The profile that comes out is not smooth and it is not supposed to be:
   it is low where the massif is tall and near the words (Homonoia, Philoi)
   and high where the landscape is flat or the frame is nearly empty. It
   varies **3.8x** end to end, and the frame it produces varies **1.7x** —
   because the exposure is largely cancelling the distance, which is the
   opposite of a pump. Measured every 100px down the page: the scene's mean
   changes by at most 1.12x per 100px and 1.27x per screen, against 1.05x
   for a Homonoia election at a standstill. */

/* §4.7's table. The rows name where each section starts. */
export const HERO: Pose = { alt: 30.0, dist: 12.0, pitch: 58, exposure: 0.70 };

export const ENTER: Pose[] = [
  { alt: 18.0, dist: 17.0, pitch: 36, exposure: 0.70 }, // project 1 — peaks resolving
  { alt: 12.0, dist: 19.0, pitch: 21, exposure: 0.215 }, // project 2 — among the ridges
  { alt: 8.0, dist: 18.0, pitch: 13, exposure: 0.195 }, // project 3
  { alt: 5.5, dist: 16.0, pitch: 8, exposure: 0.70 }, // project 4 — traffic passing overhead
];

/* The one keyframe the table does not have, and the reason it is needed:
   every other row descends toward the row after it, so a project's beats
   inherit the descent for free — a pin is 69% of the span to the next
   project, which lands beat 3 most of the way to the next row. The fourth
   row has `about` after it and `about` climbs, which would have project
   four rising through its own writeup. The bottom of the flight is its
   last beat instead, and §4.7's "~5°" is the pair. */
export const LOWEST: Pose = { alt: 4.2, dist: 15.5, pitch: 5, exposure: 0.29 };

/* Pulling back out. Keyed at the bottom of the document rather than at
   /about's own top: the about section starts below the last scroll
   position the page has — 11,113 against a maximum of 10,755 at 1512x804 —
   so a keyframe there is one the reader can never reach. What is left is
   the stretch after the last pin releases, which is also exactly where the
   about section rises into frame. */
export const ABOUT: Pose = { alt: 12.0, dist: 18.0, pitch: 28, exposure: 0.18 };

/* Keyframes in document coordinates. Pins are worth most of nine screens
   (§17), so this is not a rounding correction: keyed to a fraction of the
   page instead, the whole descent moves when four sections decide whether
   they pin. */
export function keyframes(projects: Range[], max: number): Key[] {
  const raw: Key[] = [{ y: 0, pose: HERO }];
  projects.forEach((r, i) =>
    // A fifth project would arrive at the fourth's pose rather than at one
    // this file does not have.
    raw.push({ y: r.start, pose: ENTER[Math.min(i, ENTER.length - 1)] }),
  );
  if (projects.length) raw.push({ y: projects[projects.length - 1].end, pose: LOWEST });
  raw.push({ y: max, pose: ABOUT });

  /* Clamped into the document and kept strictly increasing. A keyframe the
     reader cannot scroll to is not a keyframe — it collapses onto the end
     of the page and the pose it carried is what the page ends on, which is
     the right answer for `about` and for a fallback layout short enough
     that the projects do not tile. */
  const keys: Key[] = [];
  for (const k of raw) {
    const y = Math.min(Math.max(k.y, 0), max);
    if (keys.length && y <= keys[keys.length - 1].y) keys[keys.length - 1] = { y, pose: k.pose };
    else keys.push({ y, pose: k.pose });
  }
  return keys;
}

/* Smoothstep between keyframes rather than a straight line. The segments
   are wildly different lengths — 781px from the hero to the first project
   against 2,573px between projects — so linear would plunge over the hero
   and drift everywhere after it. Zero velocity at each keyframe also means
   the camera *arrives* at a section rather than passing through the
   altitude the section is named for. */
export function poseAt(keys: Key[], y: number): Pose {
  if (keys.length === 1) return keys[0].pose;
  let i = 0;
  while (i < keys.length - 2 && y >= keys[i + 1].y) i++;
  const a = keys[i], b = keys[i + 1];
  const span = b.y - a.y;
  const t = span <= 0 ? 1 : Math.min(Math.max((y - a.y) / span, 0), 1);
  const s = t * t * (3 - 2 * t);
  return {
    alt: a.pose.alt + (b.pose.alt - a.pose.alt) * s,
    dist: a.pose.dist + (b.pose.dist - a.pose.dist) * s,
    pitch: a.pose.pitch + (b.pose.pitch - a.pose.pitch) * s,
    exposure: a.pose.exposure + (b.pose.exposure - a.pose.exposure) * s,
  };
}
