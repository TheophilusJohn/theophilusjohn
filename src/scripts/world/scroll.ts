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

import { ARRIVE_TAU, LENGTH, atSettle, poseAt } from './route';

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

export function buildScroll(target: HTMLElement) {
  let want = 0;
  let at = 0;
  let arrive = 0;
  let live = true;

  const move = (delta: number) => {
    if (!live) return;
    want = clamp(want + delta, 0, LENGTH);
  };

  /* Passive: nothing here needs to cancel the event. Lenis is stopped and
     the root is `overflow: hidden`, so there is no scroll to prevent — and a
     non-passive wheel listener on the window is a cost paid on every event
     for a preventDefault that would do nothing. */
  addEventListener('wheel', (event) => {
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

  function jump(y: number) {
    want = clamp(y, 0, LENGTH);
    at = want;
    arrive = 0;
  }

  function update(dt: number) {
    const step = (want - at) * (1 - Math.exp(-dt / TAU));
    if (step !== 0 && dt > 0) {
      const rate = fastest(at, step);
      const most = rate > 0 ? (MAX_SPEED * dt) / rate : Infinity;
      at += Math.sign(step) * Math.min(Math.abs(step), most);
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
        route's any more. */
    hold(on: boolean) { live = !on; },
    at: () => at,
    want: () => want,
    arrive: () => arrive,
  };
}
