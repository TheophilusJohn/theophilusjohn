/* Drift for the §2 log bands.

   The track holds the trace twice, so translating it -50% lands copy two
   exactly where copy one started and the loop has no seam. Duration is
   derived from the measured track width rather than fixed, so a band with
   longer lines drifts at the same px/s as a short one instead of racing it.

   Paused off-screen: three infinite tweens ticking behind the fold is
   three transforms a frame for nothing. */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motionOff, onMotionChange } from './motion';

const SPEED = 45; // px per second

const applies: Array<() => void> = [];

for (const band of document.querySelectorAll<HTMLElement>('.log-band')) {
  const track = band.firstElementChild;
  if (!(track instanceof HTMLElement)) continue;

  const rtl = band.dataset.drift === 'right';
  const tween = gsap.fromTo(
    track,
    { xPercent: rtl ? -50 : 0 },
    { xPercent: rtl ? 0 : -50, ease: 'none', repeat: -1, duration: 1, paused: true },
  );

  let onScreen = false;
  const apply = () => {
    if (onScreen && !motionOff()) tween.play();
    else tween.pause();
  };
  applies.push(apply);

  /* Measured, not assumed: the width is whatever the mono renders to, and
     it changes once when the self-hosted face swaps in over the fallback. */
  const measure = () => {
    const copy = track.scrollWidth / 2;
    if (copy > 0) tween.duration(copy / SPEED);
  };
  new ResizeObserver(measure).observe(track);
  measure();

  ScrollTrigger.create({
    trigger: band,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      onScreen = self.isActive;
      apply();
    },
    onRefresh: (self) => {
      onScreen = self.isActive;
      apply();
    },
  });
}

/* An infinite marquee has no final state to skip to, so switching motion
   off stops it where it stands rather than seeking it anywhere. */
onMotionChange(() => {
  for (const apply of applies) apply();
});
