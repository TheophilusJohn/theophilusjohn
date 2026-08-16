/* §4.1 — the page-load intro.

   Three beats, in the order the page reads: the log bands come up already
   drifting, the display type masks up line by line, the header follows
   last. The whole sequence is 1.25s of the 1400ms budget.

   It is a set piece, not a loading screen. Two rules follow from that and
   they shape everything below:

   1. Once per session. Nobody sits through it twice, so a reader who has
      already seen it gets the page painted straight out of the HTML — no
      hold, no reveal, nothing waiting on this bundle.
   2. Content wins. The hold that keeps the final state from flashing ahead
      of the sequence is armed before first paint and released on a timeout
      whether or not this module ever arrives. If it lands too late to
      matter, the intro is dropped rather than replayed over content the
      reader is already looking at.

   The hero's own beat lives in hero.ts, which registers here. Everything
   else the sequence touches — bands, header — belongs to no module, so it
   is animated from selectors here. The bands especially: log-band.ts ships
   in the LogBand component's own script tag, a separate module graph, and
   nothing guarantees it has evaluated by the time this starts. */

import gsap from 'gsap';
import { onMotionChange } from './motion';

const root = document.documentElement;

/* The sequence, as seconds from its own start. hero.ts reads `hero` and
   `sub` off this so the table is legible in one place rather than spread
   across two files as bare delays.

     bands  0.00 →0.50
     hero   0.15 →1.15   (0.9 + 0.1 stagger over two lines)
     sub    0.55 →1.15
     head   0.80 →1.25   (0.4 + 0.05 stagger over two children)  */
export const AT = { bands: 0, hero: 0.15, sub: 0.55, head: 0.8 } as const;

/* Hard ceiling on the font wait, measured from navigation start rather
   than from here — `performance.now()` in a module is time since the
   document started. A bundle that lands at 900ms has already spent the
   whole allowance getting here and starts with no wait at all. */
const FONTS_BY = 800;

/* Claimed synchronously, at import, before anything can await. The head
   script in index.astro left `pending` on the root and armed a timeout to
   release the hold if this module never arrives; moving the attribute off
   `pending` here is what disarms it. Without that there is a window where
   the hold lifts underneath a sequence that is still waiting on fonts, and
   the hero paints its final position and then rises out of it. */
export const introPlaying = root.dataset.intro === 'pending';
if (introPlaying) root.dataset.intro = 'held';

const beats: Array<() => void> = [];

export function onIntroStart(fn: () => void) {
  beats.push(fn);
}

/* Every module in this graph has evaluated before the first await resolves,
   so registration cannot lose a race with the start. */
const fontsReady = () =>
  new Promise<void>((resolve) => {
    const fallback = setTimeout(resolve, Math.max(0, FONTS_BY - performance.now()));
    document.fonts.ready.then(() => {
      clearTimeout(fallback);
      resolve();
    });
  });

let bands: gsap.core.Tween | null = null;
let head: gsap.core.Tween | null = null;
let settled = false;

/* The only thing that uncovers the page, and it runs after the from-tweens
   have written their start values — see the note on `lazy` below. */
const uncover = () => {
  delete root.dataset.intro;
};

function start() {
  if (settled) return;
  settled = true;

  /* Marked here rather than in the head script that reads it: a first load
     slow enough that the hold timed out never showed an intro, and should
     still get one on the next navigation in the session. */
  try {
    sessionStorage.setItem('tj:intro', 'seen');
  } catch {}

  /* lazy: false on all of these, for the reason spelled out in hero.ts —
     GSAP defers a from-tween's first write to the next tick, and the hold
     comes off on the line after this one. Deferred, the uncovered frame is
     the one before the start values land. */
  bands = gsap.from('.log-band', {
    opacity: 0,
    duration: 0.5,
    ease: 'none',
    lazy: false,
  });

  head = gsap.from('.site-head > *', {
    opacity: 0,
    y: -8,
    duration: 0.4,
    delay: AT.head,
    stagger: 0.05,
    ease: 'power2.out',
    lazy: false,
  });

  for (const fn of beats) fn();

  uncover();
}

/* Switching motion off mid-sequence — or during the hold, before there is
   a sequence — abandons it at its final state, which for a from-tween is
   what revert() gives. `settled` first, so a start still queued behind the
   font wait finds the door shut rather than replaying the entrance. */
onMotionChange((off) => {
  if (off) {
    settled = true;
    bands?.revert();
    head?.revert();
    bands = head = null;
    uncover();
  }
});

if (introPlaying) fontsReady().then(start);
