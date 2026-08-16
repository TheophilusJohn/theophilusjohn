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
   among the ridges looks like. */

export type Pose = { alt: number; dist: number; pitch: number };
export type Key = { y: number; pose: Pose };
export type Range = { start: number; end: number };

/* §4.7's table. The rows name where each section starts. */
export const HERO: Pose = { alt: 26.0, dist: 13.0, pitch: 58 };

export const ENTER: Pose[] = [
  { alt: 18.0, dist: 14.0, pitch: 36 }, // project 1 — peaks resolving
  { alt: 12.0, dist: 15.0, pitch: 21 }, // project 2 — among the ridges
  { alt: 8.0, dist: 15.0, pitch: 13 }, // project 3
  { alt: 5.5, dist: 15.0, pitch: 8 }, // project 4 — traffic passing overhead
];

/* The one keyframe the table does not have, and the reason it is needed:
   every other row descends toward the row after it, so a project's beats
   inherit the descent for free — a pin is 69% of the span to the next
   project, which lands beat 3 most of the way to the next row. The fourth
   row has `about` after it and `about` climbs, which would have project
   four rising through its own writeup. The bottom of the flight is its
   last beat instead, and §4.7's "~5°" is the pair. */
export const LOWEST: Pose = { alt: 4.2, dist: 14.5, pitch: 5 };

/* Pulling back out. Keyed at the bottom of the document rather than at
   /about's own top: the about section starts below the last scroll
   position the page has — 11,113 against a maximum of 10,755 at 1512x804 —
   so a keyframe there is one the reader can never reach. What is left is
   the stretch after the last pin releases, which is also exactly where the
   about section rises into frame. */
export const ABOUT: Pose = { alt: 12.0, dist: 18.0, pitch: 28 };

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
  };
}
