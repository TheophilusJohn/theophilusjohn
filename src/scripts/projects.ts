/* §4.3 — the project sections.

   Two behaviours, and the first one is the whole of it on a phone: the
   section reveals as it arrives, stacked. Above 900px the section is a
   stage — headline across the top, lead and writeup below — and it pins
   at the top of the viewport while the writeup drifts through the frame
   and the rail fills, then releases.

   The width breakpoint is not the whole test. A section taller than the
   viewport cannot be held still — the part below the fold is unreachable
   for as long as the pin lasts, which is the mobile failure the 900px
   rule exists to avoid, and a short laptop screen reproduces it at full
   width. So the stage is measured, not assumed.

   All four or none. Pinning whichever sections happen to fit reads as a
   glitch rather than a decision: the writeups are different lengths, so
   on a 700px-tall screen the first project holds and the rest scroll
   past, for no reason the reader can see. */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motionOff, onMotionChange, jumpTo, jumpBy } from './motion';

const STAGE = matchMedia('(min-width: 900px)');

const sections = Array.from(document.querySelectorAll<HTMLElement>('.project'))
  .map((el) => ({
    el,
    blocks: Array.from(el.querySelectorAll<HTMLElement>(':scope > .head, :scope > .lead, :scope > .prose')),
    prose: el.querySelector<HTMLElement>('.prose')!,
    fill: el.querySelector<HTMLElement>('.rail > span')!,
  }))
  .filter((s) => s.prose && s.fill);

/* ── The stacked reveal ──────────────────────────────────────────────── */

let entrances: gsap.core.Tween[] = [];

function reveal() {
  for (const s of sections) {
    const tween = gsap.from(s.blocks, {
      opacity: 0,
      y: 24,
      duration: 0.7,
      stagger: 0.08,
      ease: 'power2.out',
      // The start state has to be on the elements before the next tick for
      // the same reason as the hero: these blocks hold the section's links,
      // and a block that paints its final position first has already given
      // the reveal away.
      lazy: false,
      scrollTrigger: { trigger: s.el, start: 'top 75%', once: true },
    });

    /* Tab reaches a link before any scroll trigger does — the focus lands,
       the page scrolls under Lenis rather than through it, and the trigger
       may not have fired. Arriving by keyboard finishes the reveal itself
       rather than leaving focus on something invisible. */
    s.el.addEventListener('focusin', () => tween.progress(1), { once: true });
    entrances.push(tween);
  }
}

/* revert() on a from-tween is its end state, which is the design. Killing
   the triggers with it means a section still below the fold is simply
   already there when it arrives. */
function settle() {
  for (const tween of entrances) {
    tween.scrollTrigger?.kill();
    tween.revert();
  }
  entrances = [];
}

/* ── The pins ────────────────────────────────────────────────────────── */

let pins: ScrollTrigger[] = [];

function pin() {
  if (pins.length || motionOff() || !STAGE.matches) return;

  // Nothing is pinned at this point, so these are natural layout heights
  // rather than pinned ones.
  const fits = sections.every(
    (s) => Math.ceil(s.el.getBoundingClientRect().height) <= innerHeight,
  );
  if (!fits) return;

  for (const s of sections) {
    const tl = gsap.timeline({ defaults: { ease: 'none', duration: 1, lazy: false } });
    tl.fromTo(s.fill, { scaleY: 0 }, { scaleY: 1 }, 0)
      // Percent of the writeup's own height, so it advances by the same
      // fraction of itself on every screen. The entrance tween's `y` on
      // this element is a different channel of the same transform and the
      // two compose; only one of them may own the percent.
      .fromTo(s.prose, { yPercent: 4 }, { yPercent: -4 }, 0);

    pins.push(
      ScrollTrigger.create({
        animation: tl,
        trigger: s.el,
        start: 'top top',
        end: '+=60%',
        pin: true,
        anticipatePin: 1,
        scrub: 1,
      }),
    );
  }

  if (pins.length) ScrollTrigger.refresh();
}

function unpin() {
  if (!pins.length) return;
  for (const trigger of pins) trigger.kill(true);
  pins = [];
  /* kill() takes the scrubbed timeline with it, which leaves whatever it
     last wrote sitting inline. Clear it rather than reverting a timeline
     that no longer exists: an empty rail and an undrifted writeup are the
     resting state anyway, and the entrance tween still owns `y`. */
  gsap.set(
    sections.flatMap((s) => [s.fill, s.prose]),
    { clearProps: 'transform' },
  );
  ScrollTrigger.refresh();
}

/* ── Wiring ──────────────────────────────────────────────────────────── */

/* A pin is scroll distance. Creating or releasing four of them adds or
   takes away most of two screens above whatever the reader is looking at,
   which slides the page under them for a reason they did not ask for.
   Measure something on screen across the change and put it back.

   A section that is pinned at the time reads as top: 0 and lands at its
   own top afterwards, which is the right answer for it too: it is the
   thing being held, so it is the thing to still be looking at. */
const anchors = Array.from(document.querySelectorAll<HTMLElement>('[data-path]'));

function keepingPlace(change: () => void) {
  const ref = anchors.filter((el) => el.getBoundingClientRect().top <= 0).pop();
  const before = ref?.getBoundingClientRect().top ?? 0;
  change();
  if (ref) jumpBy(ref.getBoundingClientRect().top - before);
}

let resizing = 0;
addEventListener('resize', () => {
  clearTimeout(resizing);
  // Both halves of the decision — the breakpoint and whether the sections
  // still fit — are answers to the same question, so re-ask it whole.
  resizing = window.setTimeout(() => {
    keepingPlace(() => {
      unpin();
      pin();
    });
  }, 250);
});

/* One direction. Turning motion off releases the pins and settles the
   reveals; turning it back on restores pinning, but does not replay an
   entrance for a section the reader has already scrolled through. */
onMotionChange((off) => {
  if (off) {
    keepingPlace(unpin);
    settle();
  } else {
    keepingPlace(pin);
  }
});

if (!motionOff()) {
  reveal();
  pin();

  /* Every pin adds its own scroll distance above the sections after it, so
     a #hash the browser resolved before this module ran points somewhere
     else now. §7's deep links land at the right section only if we go back
     to it once the page is its final height. */
  if (pins.length && location.hash) {
    const el = document.getElementById(location.hash.slice(1));
    if (el) jumpTo(el);
  }
}
