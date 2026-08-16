/* §4.6 — one scroll authority.

   Lenis owns the scroll position, ScrollTrigger reads it, and both run
   off gsap.ticker so the page has a single rAF loop rather than two
   that drift apart. Lenis scrolls the real window, so ScrollTrigger
   needs no scrollerProxy — the three lines below are the whole wiring.

   Motion off means Lenis is not constructed at all. Smoothing is
   interpolation between the position you asked for and the one you get,
   which is exactly the motion the toggle exists to remove; a shorter
   duration would still be that motion, only faster. Native scroll takes
   over and ScrollTrigger keeps working against it unchanged. */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger);

/* §8 turned lag smoothing off; §11 turns it back on at GSAP's defaults.
   With it off, a tab that was in the background applies the whole elapsed
   wall-clock gap in one tick on return — Lenis gets that gap as a single
   delta and snaps to its target, and every scrub tween resolves in the
   same frame. On a looping marquee that is invisible, which is why it
   stood; under a pinned section it is a jump on the first frame back.
   The bands lose nothing real: they pause off-screen anyway, so their
   phase already drifts from the clock it was seeded with. */
gsap.ticker.lagSmoothing(500, 33);

const root = document.documentElement;

export const motionOff = () => root.dataset.motion === 'off';

let lenis: Lenis | null = null;

const drive = (time: number) => lenis?.raf(time * 1000);

function start() {
  if (lenis) return;
  lenis = new Lenis({ autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(drive);
}

function stop() {
  if (!lenis) return;
  gsap.ticker.remove(drive);
  lenis.destroy();
  lenis = null;
  // destroy() drops the html.lenis rules, which changes nothing about
  // layout here — but any trigger measured while it was up should be
  // re-read rather than trusted.
  ScrollTrigger.refresh();
}

/* Anything animating off the motion state registers here instead of
   reading the attribute once at init. The toggle has to work in both
   directions mid-session (§5), not only on reload. */
const listeners = new Set<(off: boolean) => void>();
let last = motionOff();

export function onMotionChange(fn: (off: boolean) => void) {
  listeners.add(fn);
}

new MutationObserver(() => {
  const off = motionOff();
  if (off === last) return;
  last = off;
  off ? stop() : start();
  for (const fn of listeners) fn(off);
}).observe(root, { attributeFilter: ['data-motion'] });

/* One authority means programmatic jumps go through it too. A native
   scrollIntoView() moves the document under Lenis, which then eases
   back from its own stale position and undoes the jump. */
export function jumpTo(el: Element) {
  if (lenis) lenis.scrollTo(el as HTMLElement, { immediate: true });
  else el.scrollIntoView();
}

/* For correcting the document under the reader when its height changes
   beneath them — §11 adds and removes pin distance mid-page. */
export function jumpBy(delta: number) {
  if (!delta) return;
  if (lenis) lenis.scrollTo(scrollY + delta, { immediate: true });
  else scrollBy(0, delta);
}

export function jumpToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true });
  else scrollTo(0, 0);
}

if (!last) start();
