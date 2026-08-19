/* Drift for the §2 log bands.

   The track holds the trace twice, so translating it -50% lands copy two
   exactly where copy one started and the loop has no seam. Duration is
   derived from the measured track width rather than fixed, so a band with
   longer lines drifts at the same px/s as a short one instead of racing it.

   Paused off-screen: three infinite tweens ticking behind the fold is
   three transforms a frame for nothing. */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { inWorld, onModeChange } from './mode';
import { motionOff, onMotionChange } from './motion';

const SPEED = 45; // px per second

const applies: Array<() => void> = [];

for (const band of document.querySelectorAll<HTMLElement>('.log-band')) {
  const track = band.firstElementChild;
  if (!(track instanceof HTMLElement)) continue;

  const rtl = band.dataset.drift === 'right';
  const tween = gsap.fromTo(
    track,
    /* x: 0 is load-bearing. GSAP reads the element's current transform when
       it attaches, and the CSS start offset (see below) is a matrix it can
       only express as a pixel x — which it then adds to xPercent, doubling
       the offset the moment the tween takes over. Pinning x to 0 leaves
       xPercent as the only thing moving the track. */
    { xPercent: rtl ? -50 : 0, x: 0 },
    { xPercent: rtl ? 0 : -50, ease: 'none', repeat: -1, duration: 1, paused: true },
  );

  let onScreen = false;
  /* **And not in world mode** (§44). The bands are behind an opaque canvas
     on a document that is `inert` and `visibility: hidden`, so this is
     three infinite tweens writing a transform a frame at 45px/s for
     nobody. `onScreen` cannot catch it: ScrollTrigger reports them active,
     because the document is laid out exactly as it always was and only
     hidden — being invisible is not being off screen. */
  const apply = () => {
    if (onScreen && !motionOff() && !inWorld()) tween.play();
    else tween.pause();
  };
  applies.push(apply);

  /* Measured, not assumed: the width is whatever the mono renders to, and
     it changes once when the self-hosted face swaps in over the fallback. */
  let seeded = false;
  const measure = () => {
    const copy = track.scrollWidth / 2;
    if (copy <= 0) return;
    const duration = copy / SPEED;

    /* The band is already drifting-in-place at --phase, painted from CSS
       since the first frame (see the head script in index.astro). Read that
       back rather than re-deriving it: the tween has to attach at exactly
       the position on screen, and a second clock read would not match.
       Any phase in [0,1) maps inside the -50%..0 window, so no seam.

       Seeded once. Re-phasing on the font swap would jerk the band sideways
       mid-load — and a jerk under [data-motion="off"] is motion. Carry
       progress across the duration change instead; changing duration on a
       tween does not preserve it. */
    const phase = seeded
      ? tween.progress()
      : parseFloat(getComputedStyle(band).getPropertyValue('--phase')) || 0;
    tween.duration(duration);
    tween.progress(phase);
    seeded = true;
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

/* And the same both ways for the mode: the adapter-refused load is a real
   document and its bands should drift. */
onModeChange(() => {
  for (const apply of applies) apply();
});
