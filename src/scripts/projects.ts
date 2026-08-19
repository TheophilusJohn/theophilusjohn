/* §4.3 — the project sections.

   Two behaviours, and the first one is the whole of it on a phone: the
   section reveals as it arrives, stacked. Above 900px the section is a
   stage of three beats — the headline alone, then a mono label over the
   summary and the numbers, then the writeup in a 45ch column — and it pins
   while a scrubbed timeline moves through them.

   Two of the three beats are a line and four numbers. That was built to
   leave room for a world underneath, and **§21 took the world out from
   under it** (§0): the beats are document mode's structure now and nothing
   is behind them. The scrim went with the scene it was darkening, and so
   did `ranges()` and `onLayout`, which existed only to hang a camera curve
   on where the pins put the beats.

   The stage stays exactly as it is, and not out of sentiment. Fewer words
   per screen is a better read at 45ch than at 62, the cross-faded handover
   is the section's one piece of motion, and none of that was ever an
   argument about the world — it was the argument §17 used to buy room for
   one. What it bought is spent; what it built stands.

   The width breakpoint is not the whole test. Content taller than the
   viewport cannot be held still — the part below the fold is unreachable
   for as long as the pin lasts, which is the mobile failure the 900px rule
   exists to avoid, and a short laptop screen reproduces it at full width.
   What gets measured is the tallest single beat, not the section: the
   beats are layered, so the section is only ever as tall as the worst of
   them, and at 45ch that is shorter than the two-column stage this
   replaced.

   All four or none. Pinning whichever sections happen to fit reads as a
   glitch rather than a decision: the writeups are different lengths, so
   on a 700px-tall screen the first project holds and the rest scroll
   past, for no reason the reader can see. */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motionOff, onMotionChange, jumpTo, jumpBy } from './motion';

const STAGE = matchMedia('(min-width: 900px)');

/* §4.3. The pin runs 220% of the viewport and the beats take roughly a
   third of it each, with the transitions straddling the boundaries — so
   beat 1 holds alone for the first 30% and beat 3 for the last 30%, and
   nothing is ever mid-fade for longer than a fifth of a screen. */
const PIN = '+=220%';
const HAND_OVER = [0.3, 0.6];
const CROSS = 0.1;

/* Percent of the element's own height. Small: the beats cross-fade, and a
   long travel under a scrub turns the blend into two things sliding past
   each other. */
const RISE = 12;

const sections = Array.from(document.querySelectorAll<HTMLElement>('.project'))
  .map((el) => ({
    el,
    top: el.querySelector<HTMLElement>(':scope > .top')!,
    stage: el.querySelector<HTMLElement>(':scope > .stage')!,
    blocks: Array.from(el.querySelectorAll<HTMLElement>(':scope > .top, .headline, .beat')),
    headline: el.querySelector<HTMLElement>('.headline')!,
    label: el.querySelector<HTMLElement>('.label')!,
    b2: el.querySelector<HTMLElement>('.b2')!,
    b3: el.querySelector<HTMLElement>('.b3')!,
    fill: el.querySelector<HTMLElement>('.rail > span')!,
  }))
  .filter((s) => s.stage && s.b3 && s.fill);

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

/* ── The beats ───────────────────────────────────────────────────────── */

let pins: ScrollTrigger[] = [];
let focusHandlers: Array<() => void> = [];

/* The tallest beat against the viewport, measured with the stage layout
   applied — the beats are layered, so the stage row is already the worst
   of them and the section is `top + stage + padding`. Measuring the
   stacked layout instead would answer a question about a page that is not
   the one being pinned: 45ch of prose is taller than the same words at
   62ch, and the old two-column stage was taller than either. */
function fits() {
  for (const s of sections) s.el.dataset.beats = '';
  const ok = sections.every((s) => {
    const cs = getComputedStyle(s.el);
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    /* **Offset geometry, not client rects: a transform is not layout.**
       `reveal()`'s entrance holds `y: 24` on `.top` until its trigger
       fires, and a client rect reports that — so the same page measured
       24px shorter with the entrance pending than with it settled, and
       whether it was pending depended on which call to `decide()` this
       was. That is the whole of the load/resize disagreement: a fresh load
       at 850 measured 837 and pinned, a resize into 850 measured 861 and
       did not, and the section that pinned was 11px taller than the
       viewport it was pinned in — which is the failure this rule exists to
       prevent, arriving through the rule itself. `offsetTop`/`offsetHeight`
       ignore transforms and both elements' offset parent is the section,
       which is `position: relative` under `data-beats`. */
    const content = s.stage.offsetTop + s.stage.offsetHeight - s.top.offsetTop;
    return Math.ceil(content + pad) <= innerHeight;
  });
  if (!ok) for (const s of sections) delete s.el.dataset.beats;
  return ok;
}

function pin() {
  if (pins.length || motionOff() || !STAGE.matches || !fits()) return;

  for (const s of sections) {
    const tl = gsap.timeline({ defaults: { duration: CROSS, lazy: false } });

    /* Out goes up and in comes from below, every time, so three beats read
       as one column of content moving through the frame rather than three
       screens taking turns.

       Linear on both halves, and that is a cross-fade requirement rather
       than the scrub convention: eased opacity does not sum to 1 across
       the handover. power2.in leaving against power2.out arriving leaves
       both beats at 0.88 in the middle of it — a double exposure of the
       headline over its own label — and swapping the pair dips to 0.25,
       which is a blink. Measured, both.

       fromTo throughout: the timeline is scrubbed
       and can be entered at any progress — a deep link lands mid-pin —
       so no tween may infer its start from whatever happens to be on the
       element when it first renders.

       x: 0 and y: 0 are pinned in the from-vars because GSAP absorbs an
       element's existing CSS transform as pixels on attach and then
       stacks its own percent on top. Nothing here has one today; the rule
       costs nothing and the failure it prevents is a silent doubling. */
    const out = (el: HTMLElement, at: number) =>
      tl.fromTo(
        el,
        { opacity: 1, yPercent: 0, x: 0, y: 0 },
        { opacity: 0, yPercent: -RISE, ease: 'none' },
        at,
      );
    const enter = (el: HTMLElement, at: number) =>
      tl.fromTo(
        el,
        { opacity: 0, yPercent: RISE, x: 0, y: 0 },
        { opacity: 1, yPercent: 0, ease: 'none' },
        at,
      );

    /* Beat 1 → 2. The headline is the only continuity between the beats,
       so it hands over to its own smaller self rather than clearing the
       frame first. */
    out(s.headline, HAND_OVER[0]);
    enter(s.label, HAND_OVER[0]);
    enter(s.b2, HAND_OVER[0]);

    // Beat 2 → 3. The label stays; it is the headline now.
    out(s.b2, HAND_OVER[1]);
    enter(s.b3, HAND_OVER[1]);

    tl.fromTo(s.fill, { scaleY: 0 }, { scaleY: 1, duration: 1, ease: 'none' }, 0);

    pins.push(
      ScrollTrigger.create({
        animation: tl,
        trigger: s.el,
        start: 'top top',
        end: PIN,
        pin: true,
        anticipatePin: 1,
        scrub: 1,
      }),
    );
  }

  /* A beat is a scroll position, so the only way to show one is to be at
     it. Everything stays in the DOM and in the tab order at every beat —
     visibility: hidden would take the writeup out of the accessibility
     tree for most of the section, and §4.8 is explicit that every fact is
     reachable in document mode — which means Tab can land on a link that
     is currently transparent. Take the reader to the beat that holds it
     rather than leaving focus on something they cannot see. */
  for (const [i, s] of sections.entries()) {
    const trigger = pins[i];
    const handler = (event: FocusEvent) => {
      const beat = (event.target as Element | null)?.closest?.('.b2, .b3');
      if (!beat) return;
      const at = beat.classList.contains('b3') ? HAND_OVER[1] + CROSS : HAND_OVER[0] + CROSS;
      const y = trigger.start + (trigger.end - trigger.start) * at;
      // After the browser's own scroll-into-view on focus, which measured
      // the element inside the pin spacer and landed somewhere else.
      requestAnimationFrame(() => jumpBy(y - scrollY));
    };
    s.el.addEventListener('focusin', handler);
    focusHandlers.push(() => s.el.removeEventListener('focusin', handler));
  }

  if (pins.length) ScrollTrigger.refresh();
}

function unpin() {
  if (!pins.length) return;
  for (const trigger of pins) trigger.kill(true);
  pins = [];
  for (const off of focusHandlers) off();
  focusHandlers = [];
  /* kill() takes the scrubbed timeline with it, which leaves whatever it
     last wrote sitting inline. Clear it rather than reverting a timeline
     that no longer exists: the stacked layout is the resting state anyway,
     and the entrance tween still owns `y`. Dropping data-beats with it is
     what puts the beats back in document order. */
  gsap.set(
    sections.flatMap((s) => [s.headline, s.label, s.b2, s.b3, s.fill]),
    { clearProps: 'transform,opacity' },
  );
  for (const s of sections) delete s.el.dataset.beats;
  ScrollTrigger.refresh();
}

/* ── Wiring ──────────────────────────────────────────────────────────── */

/* A pin is scroll distance. Creating or releasing four of them adds or
   takes away most of nine screens above whatever the reader is looking at,
   which slides the page under them for a reason they did not ask for.
   Measure something on screen across the change and put it back.

   A section that is pinned at the time reads as top: 0 and lands at its
   own top afterwards, which is the right answer for it too: it is the
   thing being held, so it is the thing to still be looking at.

   The tolerance is what makes that second sentence true. A pinned section
   measures at ±0.1 rather than 0, so a strict `<= 0` drops it half the
   time and keeps the place of the section *before* it instead — and the
   error is the whole of the pin. It was under a screen when a pin was
   +60%; at +220% it measured as an 825px jump on the motion toggle. */
const anchors = Array.from(document.querySelectorAll<HTMLElement>('[data-path]'));

/* Where a section's top is relative to the viewport's, negative once you
   are past it. `getBoundingClientRect().top` is that number — until the
   section is pinned, when it is frozen at 0 for the entire length of the
   pin and says nothing at all about how far into it the reader is. At
   +220% that is nine tenths of a section of silence. Inside a pin the
   trigger's own start is the honest answer, and it has the same sign and
   the same meaning, so callers do not need to know which case they got. */
function offsetOf(el: HTMLElement) {
  const i = sections.findIndex((s) => s.el === el);
  const trigger = i >= 0 ? pins[i] : undefined;
  if (trigger && scrollY >= trigger.start && scrollY <= trigger.end) {
    return trigger.start - scrollY;
  }
  return el.getBoundingClientRect().top;
}

function keepingPlace(change: () => void) {
  const ref = anchors.filter((el) => offsetOf(el) <= 1).pop();
  const before = ref ? offsetOf(ref) : 0;
  change();
  if (!ref) return;
  /* Twice, and the second pass is not belt and braces. One correction
     assumes the page is at its final height when the reference is
     re-measured, and on the resize path it is not: pinning re-lays every
     section above the reference as well as adding its own distance, so the
     first answer is short. Measured on a 1200x720 -> 1512x804 resize, it
     was short by exactly one pin — 1003px — and converges on the next
     pass. It stops as soon as it has stopped moving. */
  for (let i = 0; i < 3; i++) {
    const delta = offsetOf(ref) - before;
    if (Math.abs(delta) < 1) break;
    jumpBy(delta);
  }
}

/* Captured at import, and that is the fix rather than a convenience.
   `url-sync`'s observer fires on the first frame and its `replaceState`
   writes a bare path, which **drops the fragment** — so by the time the
   re-jump below can finally be right (on `fonts.ready`, when the pins are
   measured in the face the page renders with) `location.hash` is empty and
   the correction returns early. Measured at §32: `/?doc#philoi` landing at
   Homonoia, one project short, because the import-time pass had not
   pinned yet and the fonts-ready pass had no hash left to act on. */
const landed = location.hash;

/* Every pin adds its own scroll distance above the sections after it, so a
   #hash the browser resolved before this ran points somewhere else now.
   §4.6's deep links land at the right section only if we go back to it once
   the page is its final height — and a section's top is its pin start,
   which is beat 1. Nothing to correct when the beats are not running:
   the page is the height the browser already resolved against. */
function rejump() {
  if (!pins.length || !landed) return;
  const el = document.getElementById(landed.slice(1));
  if (!el) return;
  /* Not jumpTo: if the reader is already somewhere inside this section's
     pin, the element is fixed at top 0 and both scrollIntoView and Lenis
     resolve it to the scroll position they were given — the jump becomes a
     no-op and the deep link lands wherever the last correction happened to
     leave it. Measured: /projects/homonoia arriving at beat 2. The trigger
     knows where the section starts; ask it. */
  const i = sections.findIndex((s) => s.el === el);
  if (i >= 0 && pins[i]) jumpBy(pins[i].start - scrollY);
  else jumpTo(el);
}

/* The whole decision, in one place, because every input to it can change
   after load: the viewport, the motion toggle, and the fonts. Pinning and
   the stacked reveal are alternatives and never both — they would be
   writing opacity on the same three elements at once — so whichever one
   this lands on, the other is cleared. */
function decide() {
  if (motionOff()) return;
  keepingPlace(() => {
    unpin();
    pin();
  });
  if (pins.length) settle();
  else if (!entrances.length) reveal();
}

let resizing = 0;
addEventListener('resize', () => {
  clearTimeout(resizing);
  // Both halves of the decision — the breakpoint and whether the beats
  // still fit — are answers to the same question, so re-ask it whole.
  resizing = window.setTimeout(decide, 250);
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

decide();
rejump();

/* The fit rule is a measurement, and at import there is nothing correct to
   measure: `document.fonts.status` is "loading" when this module runs, so
   every height it can read belongs to the fallback face. That is not a
   rounding error — measured at 1366x768, Archivo sets the binding writeup
   at 760px against 768 of viewport and the fallback overshoots it, so the
   page decided not to pin on metrics it was never going to render with,
   and nothing later re-asked. §12 waits on this same event for the same
   reason. No timeout guard here, unlike §12: this gates an enhancement and
   not content, so the worst case of `fonts.ready` never settling is the
   answer already on screen. */
document.fonts.ready.then(() => {
  decide();
  rejump();
});
