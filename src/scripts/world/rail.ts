/* §0.3 — where you are on the route.

   Document mode has two indicators and this replaces one of them. The
   browser's own scrollbar reports position in the page and is gone in world
   mode, because `html[data-world]` is `overflow: hidden` and there is no
   document scroll to report; §4.3's per-section `.rail` reports progress
   through a pin and is behind the canvas with the rest of the document. So
   a reader in the world has no idea how far along they are or how much is
   left, which is a thing every page tells you without being asked.

   **It is the document's rail, at the scrollbar's edge.** 1px, `--rule`
   track, `--leader` fill from the top, inset from top and bottom — the same
   four declarations `ProjectSection.astro` uses, so it reads as the same
   object rather than as a new piece of chrome. It is on the *right* because
   that is where the thing it stands in for was; the document's own rail is
   on the left of its column, and putting this one there would have it
   growing out of the reading column instead of standing where a scrollbar
   stands.

   **It reports and does nothing else.** No drag, no click-to-jump, no
   pointer events at all. A scrollbar you can grab is a second way to move
   the camera, and §31 is explicit that the gesture is the only one.

   **Position is the route's own damped position**, `at / LENGTH` — not the
   gesture's, so the rail agrees with the frame rather than with where the
   reader has asked to go.

   One custom property a frame on the root, guarded at half a thousandth,
   which over a 672px track is a third of a pixel. The fill is a `scaleY`
   off it and the four marks never move at all: they are placed once, in
   percent, at build. Nothing here reads layout. */

import { LENGTH, bandAt, stops } from './route';

/* Below what a frame can resolve: 0.0005 of a ~672px track is 0.34px. */
const STEP = 0.0005;

export function buildRail() {
  const root = document.createElement('div');
  root.className = 'route';
  /* Out of the accessibility tree, like the scrollbar it stands in for.
     Route position is navigation state rather than content, so §0.6's rule
     that every fact exists in document mode is not in play — the document
     reports the same thing with a scrollbar. */
  root.setAttribute('aria-hidden', 'true');

  const fill = document.createElement('span');
  fill.className = 'fill';
  root.append(fill);

  /* Static, and placed in percent rather than pixels so a resize needs no
     measurement — which is the whole reason this layer can promise never to
     lay out. */
  const marks = stops.map((stop) => {
    const mark = document.createElement('i');
    mark.className = 'stop';
    mark.style.top = `${((stop.y / LENGTH) * 100).toFixed(3)}%`;
    root.append(mark);
    return mark;
  });

  let wrote = -1;
  let lit = -2;

  /** `y` is null while §35 has the stick. */
  function update(y: number | null) {
    /* Hidden with the stick out, for the reason the writeup is (§32): off
       the route there is no route position, and a progress rail over a free
       flight would be reporting one that has not moved since the reader
       left it. The route picks up where it was when the stick comes back,
       so the number is not wrong — it is just not about them any more, and
       an indicator that quietly stops meaning what it says is worse than
       one that goes away. */
    root.toggleAttribute('data-off', y === null);
    if (y === null) return;

    const at = y / LENGTH;
    if (Math.abs(at - wrote) >= STEP) {
      wrote = at;
      root.style.setProperty('--at', at.toFixed(4));
    }

    /* --leader on the mark you are at, which is exactly what §5 allows it
       to mean. It is a wider tick as well as a brighter one, because the
       fill runs past the mark at a station and colour alone would be one
       accent on top of another. */
    const band = bandAt(y);
    const live = band.weight > 0 ? band.station : -1;
    if (live === lit) return;
    if (lit >= 0) marks[lit]!.removeAttribute('data-live');
    lit = live;
    if (live >= 0) marks[live]!.setAttribute('data-live', '');
  }

  return { root, update };
}
