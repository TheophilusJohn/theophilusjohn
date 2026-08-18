/* §0.3 / §35 — the offer of the stick, and the way back to the route.

   §31 reversed the default: scroll is the site and free flight is what the
   last station unlocks. Two things follow from that sentence and this file
   is both of them.

   **A visible control, not a hidden key.** Until now the stick was on `F`,
   which is a mode nobody discovers by accident — the exact failure §0.3
   names about free flight itself. So it is a `<button>` in the corner, in
   `.escape`'s own language and at the opposite end of the same edge: the way
   out at the top, the way in at the bottom, and the rail between them. It is
   focusable, so a keyboard reader reaches it by Tab rather than by being
   told a letter, and `F` is gone.

   **And the choice persists**, which is the other half of §35: a returning
   visitor is not made to scroll the route again. What is stored is the
   *unlock* and not the mode — `tj:flight`, in the three-state shape
   `tj:mode` and `tj:motion` already use, absent meaning "not yet" rather
   than "no". A reader who has reached the end once opens at the arrival with
   the offer already on screen. Storing the mode instead would have opened
   the world in free flight over an empty ridge, which is §22's front door
   thrown away to save one click.

   **It is a landmark of its own** (`<nav aria-label="Flight">`), for the
   reason `.escape` and every station panel is one: `<main>` is behind an
   opaque canvas and out of the accessibility tree in world mode, so a
   control outside a landmark is a control no screen reader can place. */

import { DWELL, stops } from './route';

/* Where the offer is made: the end of the last station's dwell, which is the
   keyframe the final turn leaves from. Reaching it is "reaching the last
   station" in the only sense a reader would use — the writeup has been
   scrolled and the route is on its way out. */
const OFFER_AT = stops[stops.length - 1]!.y + DWELL;

/* Over how much of the final turn it arrives. 300 of FINAL_OUT's 1,200, so
   it is fully up well before the route ends and never appears as a pop. */
const FADE = 300;

const KEY = 'tj:flight';

/** Read once. A `try` because Safari's private mode throws on the getter,
    which would take the world down with it. */
function unlockedAlready(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function buildStick(toggle: () => void) {
  const root = document.createElement('nav');
  root.className = 'stick';
  root.setAttribute('aria-label', 'Flight');

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Fly it yourself';
  root.append(button);
  button.addEventListener('click', toggle);

  let unlocked = unlockedAlready();
  /* Once it is fully up it stays up. A reader who scrolls back into the last
     writeup would otherwise watch the offer being withdrawn, and a returning
     one starts here — which is the whole of what the stored flag buys. */
  let latch = unlocked ? 1 : 0;
  let shown = -1;
  let mode = -1;
  root.toggleAttribute('data-locked', !unlocked);

  /** `y` is the route position, or null while the reader has the stick. */
  function update(y: number | null) {
    if (y !== null && !unlocked && y >= OFFER_AT) {
      unlocked = true;
      root.removeAttribute('data-locked');
      try {
        localStorage.setItem(KEY, 'on');
      } catch {
        // A reader who cannot be remembered still gets the offer.
      }
    }
    if (!unlocked) return;

    /* Two states and one number. The label is the whole of the mode — a
       control that says what it will do next needs no second affordance —
       and the number is the ramp in. */
    const flying = y === null;
    const ramp = flying ? latch : Math.min(Math.max((y - OFFER_AT) / FADE, 0), 1);
    const on = flying ? 1 : Math.max(latch, ramp);
    if (ramp >= 1) latch = 1;
    if (on !== shown) {
      shown = on;
      root.style.setProperty('--in', on.toFixed(3));
      root.toggleAttribute('data-off', on <= 0);
    }
    const want = flying ? 1 : 0;
    if (want === mode) return;
    mode = want;
    button.textContent = flying ? 'Rejoin the route' : 'Fly it yourself';
  }

  return { root, update };
}
