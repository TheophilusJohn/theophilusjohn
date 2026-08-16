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
gsap.ticker.lagSmoothing(0);

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

export function jumpToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true });
  else scrollTo(0, 0);
}

if (!last) start();
