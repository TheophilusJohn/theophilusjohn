/* §0.3 / §31 — the reader's position on the route.

   Scroll is the site, and in world mode there is no document to scroll: the
   canvas is opaque over it and Lenis is stopped (`holdScroll`, §21), because
   a document moving under the world is a second scroll position nobody can
   see. So the gesture is read directly — wheel, keys, touch — and turned
   into one number, which is what `route.ts` takes.

   That is not a smaller thing than a scrollbar; it is the same thing without
   a second source of truth. §29 proved the path: the probe accumulated wheel
   delta into a 0..1 progress and damped it, and the gesture is what the
   question was about.

   **Damped, and §18's constant.** An exponential approach at 0.22s, so a
   flick is flown rather than cut and a wheel notch is a movement rather than
   a step. A jump is not damped at all — §32's deep links and §35's rejoin
   both move the reader by most of the route in one frame, and easing that
   would fly the camera in from a pose nobody was at. */

import { ARRIVE_TAU, DWELL, LENGTH, atSettle, poseAt, stops } from './route';

/* Roughly a wheel notch on a mouse, and the browser's own line height when
   a wheel reports lines rather than pixels. */
const LINE = 16;
const KEY_STEP = 180;
const PAGE = () => innerHeight * 0.85;

const TAU = 0.22;

/* **The route has a top speed, and it is in units per second rather than in
   pixels.** Scroll is not paced by the reader's hand the way a document is:
   a trackpad flick is 3,000 pixels in a third of a second, and at one scroll
   unit per world unit that is a camera doing 4,169 units a second — measured,
   over the leg into Philoi, against a cruise of 45 and a boost of 180. What
   comes back is not fast travel, it is a smear.

   So the damped step is measured *as a pose* and scaled back if it would
   outrun this, which is the same construction as §24's soft bounds: nothing
   is stopped and nothing is refused, the world just has a speed. Three times
   boost, so a reader who throws the whole route past in one gesture watches
   it fly for a few seconds afterwards rather than arriving nowhere. */
const MAX_SPEED = 420;

/* A bound on how far the gesture may get *ahead* of the flight was tried
   here and taken out again: it holds the catch-up to a few seconds, and it
   does that by throwing away scroll the reader made. A reader who scrolls a
   page and finds they are not where they scrolled to has been lied to, and
   that is a worse failure than a long fly-past — which is, after all, the
   world showing itself. The target is always where the gesture put it. */

/* The arrival clock is the other half of what this module holds, and it is
   §0.3's fourth constraint: a settle is not a stop, it is the last few units
   of an approach. The clock runs toward 1 while the reader is at a settle
   and back toward 0 when they leave, and `route.ts` scales the creep by it.
   It is here rather than there because it is the one input to a pose that is
   not scroll, and `route.ts` may not hold state. */

/* ── The settle, at the end of a gesture ────────────────────────────────
   A reader who stops just short of a station rests just short of it: the
   headline half up, the numbers arriving, the camera still on the approach.
   Nothing is wrong with that frame and it is not the one the station was
   composed for. So the end of a gesture near a settle finishes the arrival.

   **Document mode does not do this**, and the model is worth naming
   precisely because it is not a snap: `projects.ts` pins each section for
   220% of the viewport, so most of the page's scroll length *is* a beat and
   wherever a reader stops they have stopped inside one. The world has no
   pins — a settle is a keyframe with 2,300 units of travel either side — so
   the same guarantee has to be made a different way.

   Four rules, and every one of them exists to keep this from becoming the
   route driving instead of the reader:

   - **only at the end of a gesture.** Never mid-scroll, and the test is the
     gesture's own rate rather than the flight's. Taking the *flight's* rate
     instead would fire the snap only once the damped chase had already
     coasted to a stop, and the reader would watch the camera settle and then
     move again — two motions where there should be one. Fired at gesture
     end, the retarget merges into the flight already running;
   - **only within reach of a settle.** Outside the window the reader rests
     where they left it, because pulling someone out of the middle of a
     1,500-unit travel leg is exactly the thing this must not be;
   - **forward only.** A reader scrolling *up* through the window is leaving,
     and snapping them forward would reverse them under their own hand;
   - **never inside the dwell.** Those 600 units are the reading (§32), the
     wheel is moving text through them, and a snap back to the top of the
     column would undo the reader's own scroll. The window stops at the
     dwell's first unit.

   It retargets `want` rather than running a second motion beside it, so the
   ease, the speed cap and the interruption are the ones that already exist:
   any input moves `want` again on the same frame and the chase redirects
   with nothing to unwind. And it only ever moves the reader **forward**, by
   at most CAPTURE — it can add a little to a gesture and can never leave
   someone short of where they scrolled to, which is the failure §31 took a
   whole mechanism out over. */

/* How near a settle the gesture has to have ended. Half of SETTLE_IN's 700,
   which is not a round number so much as a readable state: at the far edge
   of the window the band weight is 0.5, so the machine ID and the headline
   are fully up and the metric strip is a third in. The reader is plainly at
   the station and the snap finishes an arrival rather than starting one. It
   is 10–15% of the 2,300 to 3,367 units between one settle and the next. */
const CAPTURE = 350;

/* When the gesture is over. Both gates have to pass, and each catches what
   the other cannot: the silence is a floor — longer than the gap between
   notches at four a second, so deliberate reading is never interrupted —
   and the rate scales the wait with how hard the gesture was, because a
   3,000-unit-a-second flick needs 0.42s of quiet to decay under the
   threshold where a 480-a-second one needs 0.35. Below 90 units a second is
   slower than one wheel notch every 1.3 seconds, which is not scrolling. */
const GESTURE_END = 0.35;
const GESTURE_STOP = 90;
const GESTURE_TAU = 0.12;

/** The dwell start to settle into, or null for "rest where you are". */
function capture(y: number): number | null {
  for (const stop of stops) {
    if (y >= stop.y) continue; // at or past the settle: the dwell is the reading
    return stop.y - y <= CAPTURE ? stop.y : null;
  }
  return null;
}

/* ── Resistance at a station ────────────────────────────────────────────
   The dwell is the reading (§32), and once it is finished the next notch
   departs. So one flick can carry a reader through a whole station: in,
   past the writeup, and away, without ever coming to rest at it.

   **One wall per direction, and it is the far end of the reading in that
   direction.** Going down, forward movement stops at the bottom of the
   column; going up, backward movement stops at the top — the dwell's first
   unit, which is the arrival frame. Symmetric, because arriving from below
   and arriving from above are the same act seen twice, and a reader who has
   read the whole thing in reverse has read it. Nothing is walled on the way
   *in*: that is what the settle is for.

   **The release condition is the end of the arriving gesture**, and that is
   the idea: what separates *carried past* from *leaving* is not how hard the
   reader scrolled but whether they have stopped since arriving. A flick that
   carries you through a station is one continuous gesture that began before
   it; a departure is a new gesture, started after. The friction lifts after
   `GESTURE_END`'s 0.35s of silence, so a reader who pauses at all never
   meets it.

   **And a trackpad never goes silent, which is what was wrong.** macOS emits
   `wheel` events through the entire inertial tail at the display's rate, so
   after a flick the gaps stay at a frame and `idle` never reaches 0.35 for
   one to two seconds. The 1.5-second backstop — there for a scrub that never
   ends — was therefore firing on *every* flick, mid-tail, and the remaining
   momentum carried the reader straight out. The 0.35s condition never got to
   run at all. A synthetic harness cannot show this: `Input.dispatchMouseEvent`
   has no inertia, so every flick it makes ends when the script stops.

   **The fix is to tell momentum from a gesture by its shape.** Safari and
   Chrome do not expose the phases AppKit knows about, so the signal has to
   come out of the stream itself, and there is a clean one: momentum decays.
   Six consecutive events whose magnitude does not grow is a coasting tail —
   deliberate scrolling is noisy and does not produce that run — and the
   backstop counts only time in which the reader is *pushing*. Momentum can
   no longer buy a release; only a sustained gesture can, and when the tail
   finally stops, the 0.35s of silence does what it was always meant to. */
const HOLD = 1.5;

/* Consecutive non-growing events that mean the fingers have left the glass.
   Six is ~100ms at a 60Hz event rate — long enough that noise in a
   deliberate scroll does not reach it, short enough to catch the tail
   before the backstop could. The 6% tolerance is for the jitter in an
   otherwise monotone decay. */
const COAST_RUN = 6;
const COAST_SLACK = 1.06;

/** Which dwell a position is inside, or −1. */
const dwellAt = (y: number) => stops.findIndex((s) => y >= s.y && y <= s.y + DWELL);

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/* World units per scroll unit, at its worst anywhere in the step being
   considered. Two things make the *local* rate the wrong measure and both
   were flown: across a keyframe the chord between the ends is short while
   the path between them turns, and *at* a keyframe the rate is zero — the
   route arrives and leaves at rest, by construction — so a cap taken there
   permits any step at all. Sampled over the whole candidate step it can only
   be conservative, and it converges, because a smaller step is sampled over
   a shorter span. */
function fastest(from: number, step: number): number {
  let rate = 0;
  for (let i = 0; i <= 4; i++) {
    const y = from + (step * i) / 4;
    const a = poseAt(y, 0);
    const b = poseAt(y + 1, 0);
    rate = Math.max(rate, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
  }
  return rate;
}

/**
 * @param resume  What to do with a wheel event that arrives while §35 has
 *   the stick. §0.3: the route stays available from inside free flight and
 *   scrolling picks it back up at the nearest station. It is the **wheel**
 *   and not every input: the arrows and space are camera.ts's movement keys
 *   while flying, and a touch drag is its look control, so either of those
 *   would resume the route out from under a reader who was steering with it.
 *   A wheel means nothing at all in free flight, which is what makes it the
 *   unambiguous one.
 */
export function buildScroll(target: HTMLElement, resume: () => void = () => {}) {
  let want = 0;
  let at = 0;
  let arrive = 0;
  let live = true;

  /* The gesture, as three numbers: how long since anything arrived, how
     much arrived this frame, and a damped rate built from the two. */
  let idle = 0;
  let pending = 0;
  let input = 0;
  /* Tested once per gesture rather than once per frame, and cleared by any
     input — which is also the whole of "a new wheel event cancels it". */
  let latched = false;
  let forward = true;

  /* The friction at a station, keyed to the arrival rather than to the
     station: `station` is which dwell the *camera* is in, and everything
     below resets the moment that changes. `reads` is how many scroll units
     of each station's dwell the column actually occupies — `station.ts`
     measures it and tells us, because it is a fact about a font and a
     viewport and this module has never seen either. Until it does, the
     whole dwell counts as reading and nothing is resisted. */
  let station = -1;
  let held = 0;
  let released = false;
  /** The decay run, and the last event's size that feeds it. */
  let falling = 0;
  let last = 0;
  const reads: number[] = stops.map(() => DWELL);
  const readEnd = (i: number) => stops[i]!.y + reads[i]!;

  /** Where a step is allowed to end. One wall per direction, at the far end
      of the reading: the bottom of the column going down, the dwell's first
      unit going up. A step that would not cross one is untouched. */
  function hold(at0: number, to: number): number {
    for (let k = 0; k < stops.length; k++) {
      const top = stops[k]!.y;
      const bottom = readEnd(k);
      if (to > at0) {
        if (at0 <= bottom && to > bottom) return bottom;
      } else if (at0 >= top && to < top) return top;
    }
    return to;
  }

  const move = (raw: number) => {
    if (!live || raw === 0) return;

    /* Is this a hand or a tail? Tracked on every event, before anything
       else looks at it, because the answer decides whether the backstop is
       allowed to count this frame at all. */
    const size = Math.abs(raw);
    falling = last > 0 && size <= last * COAST_SLACK ? falling + 1 : 0;
    last = size;

    const to = released ? want + raw : hold(want, want + raw);
    if (to !== want) want = clamp(to, 0, LENGTH);

    /* The bookkeeping is on the *raw* delta either way. Absorbed input is
       still a gesture: the settle must not fire underneath it, and the rate
       estimate has to see a reader who is plainly still scrolling. */
    pending += size;
    forward = raw > 0;
    idle = 0;
    latched = false;
  };

  /* Passive: nothing here needs to cancel the event. Lenis is stopped and
     the root is `overflow: hidden`, so there is no scroll to prevent — and a
     non-passive wheel listener on the window is a cost paid on every event
     for a preventDefault that would do nothing. */
  addEventListener('wheel', (event) => {
    // The route is not live under the stick, and a wheel there is the reader
    // asking for it back rather than an event to drop (§35).
    if (!live) { resume(); return; }
    const scale = event.deltaMode === 1 ? LINE : event.deltaMode === 2 ? innerHeight : 1;
    move(event.deltaY * scale);
  }, { passive: true });

  /* The keys a page answers to. They are read here rather than in camera.ts
     because on the route they mean scroll; camera.ts ignores its own
     movement keys until the stick is handed over (§35). */
  addEventListener('keydown', (event) => {
    if (!live || event.metaKey || event.ctrlKey || event.altKey) return;
    switch (event.code) {
      case 'ArrowDown': move(KEY_STEP); break;
      case 'ArrowUp': move(-KEY_STEP); break;
      case 'PageDown': move(PAGE()); break;
      case 'PageUp': move(-PAGE()); break;
      case 'Space': move(event.shiftKey ? -PAGE() : PAGE()); break;
      case 'Home': jump(0); break;
      case 'End': jump(LENGTH); break;
      default: return;
    }
    event.preventDefault();
  });

  /* A touchscreen laptop is inside §0.1's tier, and drag-to-scroll is what
     the gesture means there. The look control (§24) is a pointer drag, so
     these two would fight — they do not, because camera.ts ignores the
     pointer until the stick is handed over. */
  let touch = 0;
  target.addEventListener('touchstart', (event) => {
    touch = event.touches[0]?.clientY ?? 0;
  }, { passive: true });
  target.addEventListener('touchmove', (event) => {
    const y = event.touches[0]?.clientY ?? 0;
    move((touch - y) * 1.6);
    touch = y;
  }, { passive: true });

  /* A deep link, the back button and §35's rejoin all land exactly on a
     settle, which is the one position the window excludes — so none of them
     can be followed by a snap. The gesture state is cleared anyway, so that
     a reader who arrives by URL and then scrolls is treated as having made
     their first gesture rather than as having ended one. */
  function jump(y: number) {
    want = clamp(y, 0, LENGTH);
    at = want;
    arrive = 0;
    idle = 0;
    pending = 0;
    input = 0;
    latched = false;
    forward = true;
    // A jump is an arrival, so the friction starts over — and a deep link
    // lands at a dwell's first unit, which is the top of the reading rather
    // than the bottom, so nothing is resisted until the reader has scrolled
    // the column anyway.
    station = -1;
    held = 0;
    released = false;
    falling = 0;
    last = 0;
  }

  function update(dt: number) {
    idle += dt;

    /* Keyed to the camera rather than to the gesture: `at` is where the
       reader actually is, so the clock cannot be started by a flick that
       has not landed yet. */
    const inside = dwellAt(at);
    if (inside !== station) {
      station = inside;
      held = 0;
      released = false;
    }
    if (station >= 0 && !released) {
      /* The backstop counts only time the reader is **pushing**: input
         arriving, and not the decaying tail of a gesture that is already
         over. That is the whole of the trackpad fix — momentum keeps the
         gaps at a frame for a second or more, so a timer over *any* input
         released every flick. */
      if (idle < 0.12 && falling < COAST_RUN) held += dt;
      else if (idle > 0.2) held = 0;
      if (idle >= GESTURE_END || held >= HOLD) released = true;
    }
    // A gesture that is over cannot leave a decay run behind it for the
    // next one to inherit.
    if (idle >= GESTURE_END) { falling = 0; last = 0; }

    const raw = dt > 0 ? pending / dt : 0;
    pending = 0;
    input += (raw - input) * (1 - Math.exp(-dt / GESTURE_TAU));

    if (live && !latched && forward && idle >= GESTURE_END && input < GESTURE_STOP) {
      const to = capture(want);
      if (to !== null) want = to;
      // Latched either way: nothing can change the answer until an input
      // does, and an input clears this.
      latched = true;
    }

    const step = (want - at) * (1 - Math.exp(-dt / TAU));
    if (step !== 0 && dt > 0) {
      const rate = fastest(at, step);
      const most = rate > 0 ? (MAX_SPEED * dt) / rate : Infinity;
      at += Math.sign(step) * Math.min(Math.abs(step), most);
      /* **The chase has to land, not merely approach.** An exponential
         never arrives, so a reader eased *up* to a settle sits a
         vanishing fraction below it for ever — and everything that asks
         "are we at the station" asks with `>=`. `atSettle` stays false, so
         §29's residual creep never runs; the dwell never registers, so the
         friction below never arms. Neither shows up as a wrong number, only
         as a beat that quietly does not happen. A hundredth of a scroll
         unit is five thousandths of a world unit — far under anything that
         can be seen — so close it. */
      if (Math.abs(want - at) < 0.01) at = want;
    }
    /* One clock, toward 1 at a settle and toward 0 anywhere else, so the
       creep fades in and out rather than switching. */
    const to = atSettle(at) ? 1 : 0;
    arrive += (to - arrive) * (1 - Math.exp(-dt / ARRIVE_TAU));
    return { y: at, arrive };
  }

  return {
    update,
    jump,
    /** §35 hands the stick over; while it holds one, the gesture is not the
        route's any more — except for the wheel, which asks for it back. */
    hold(on: boolean) { live = !on; },
    /** How much of a station's dwell its column actually occupies, in
        scroll units — the one thing the friction needs and this module
        cannot know. `station.ts` measures the column and calls this on
        arrival, on resize and on `fonts.ready`. */
    reading(i: number, units: number) {
      if (i >= 0 && i < reads.length) reads[i] = clamp(units, 0, DWELL);
    },
    at: () => at,
    want: () => want,
    arrive: () => arrive,
  };
}
