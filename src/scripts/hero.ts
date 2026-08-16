/* §4.2 — the hero reveal.

   The heading splits into lines and each line rises out of a clip; the sub
   follows as one block. Lines, not characters: a per-character split is the
   version that reads as gibberish to a screen reader, and there is nothing
   a character stagger says here that a line stagger does not.

   SplitText names the split element from its own text and hides the spans
   it generates, so assistive tech still gets the whole sentence. Two things
   that has to be true for: the text must *be* a sentence — hence the space
   before the <br> in index.astro, since <br> contributes nothing to
   textContent — and the element must be one ARIA lets you name, which is
   why only the heading is split and the sub is moved by a wrapper. */

import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { onMotionChange } from './motion';
import { AT, introPlaying, onIntroStart } from './intro';

gsap.registerPlugin(SplitText);

/* The reveal is the middle beat of §4.1's intro and has no life outside it:
   it runs when the intro runs, once a session, and on every load after that
   the hero is simply the words, painted out of the HTML. So the split runs
   late — after fonts are ready, which is where intro.ts starts — and the
   lines are measured on the face they will actually be set in rather than
   on the fallback, with autoSplit left to catch the resize case. */

/* lazy: false is what keeps the ordering real. GSAP batches the first write
   of a from-tween to the start of the next tick, so without it the start
   values are still unwritten when intro.ts uncovers the page — measured as
   `transform: none` at that point — and the hero is one dropped frame away
   from painting its final position before the reveal has begun. The delays
   do not change that: `from` renders its start state on creation, however
   far off its own start is. */
const RISE = { yPercent: 100, lazy: false, ease: 'power4.out' } as const;

let split: SplitText | null = null;
let sub: gsap.core.Tween | null = null;

function start() {
  split = SplitText.create('.hero h1', {
    type: 'lines',
    mask: 'lines',
    linesClass: 'reveal-line',
    // Line breaks move on resize. autoSplit re-splits and carries the
    // animation's elapsed time across, so a resize mid-reveal continues
    // rather than restarting. It also covers the font swap, though
    // starting after fonts.ready means that case should not arise.
    autoSplit: true,
    onSplit: (self) => {
      /* GSAP masks with `overflow: clip`, which clips both axes. The hero
         is set at wdth 125 and is meant to bleed past the right edge —
         .hero clips that at the section — so only the axis the reveal
         travels on may clip here. `visible clip` is a pair CSS leaves
         alone: visible degrades to auto next to hidden or scroll, but not
         next to clip. */
      for (const mask of self.masks) {
        (mask as HTMLElement).style.overflow = 'visible clip';
      }
      return gsap.from(self.lines, {
        ...RISE,
        duration: 0.9,
        stagger: 0.1,
        delay: AT.hero,
      });
    },
  });

  sub = gsap.from('.hero .sub > span', {
    ...RISE,
    duration: 0.6,
    delay: AT.sub,
    ease: 'power2.out',
  });
}

/* Reduced motion means the final state, not a faster one. revert() undoes
   the from-tween — for a `from`, that is its end state — and puts the
   original markup and aria back. */
function finish() {
  split?.revert();
  sub?.revert();
  split = sub = null;
}

if (introPlaying) onIntroStart(start);

/* One direction only. Switching motion back on mid-session must not replay
   an entrance the reader has already sat through; the hero is not the log
   band, it has somewhere to arrive and it has arrived. */
onMotionChange((off) => {
  if (off) finish();
});
