/* §4.10 — the custom cursor.

   A dot that stands in for the pointer, a ring that opens over a project,
   and the accent over a link. Three states and nothing else.

   Two gates, and both are absolute: `(pointer: fine)` and motion. On a
   touch device this module builds nothing and touches no DOM — the element
   is created here rather than shipped in the markup for that reason, so a
   phone never carries an inert node or a rule that hides its cursor. Under
   motion off it is not initialised either: a dot that eases toward the
   pointer is motion the reader did not ask for, and the native cursor is
   already the accessible answer.

   Hiding the native cursor is the part that breaks sites, so it happens as
   late as possible and never over a text field. The root attribute that
   hides it goes on at the first pointer move — not at load, where the
   pointer may never move and the page would simply have no cursor — and
   global.css hands the I-beam back for input, textarea, select and
   contenteditable, where this dot is not a substitute for a caret. */

import gsap from 'gsap';
import { motionOff, onMotionChange } from './motion';

const FINE = matchMedia('(pointer: fine)');

/* Ordered by which wins when they nest, which they do: every link on the
   page below the hero is inside a project. */
const FIELD = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const LINK = 'a[href], button, [role="button"], summary, label';
const ROW = '.project';

/* The follow is short on purpose. The native cursor is gone while this is
   up, so the dot *is* the pointer and lag is aim error, not style — the
   ring's opening is where the softness lives instead. */
const FOLLOW = 0.15;

const root = document.documentElement;

let el: HTMLElement | null = null;
let xTo: gsap.QuickToFunc | null = null;
let yTo: gsap.QuickToFunc | null = null;

/* A hybrid — laptop with a touchscreen, tablet with a trackpad — matches
   `(pointer: fine)` and still gets pointermove from a finger. Driving the
   dot from a touch leaves it stranded wherever the last tap was. */
const mouse = (ev: PointerEvent) => ev.pointerType !== 'touch';

function move(ev: PointerEvent) {
  if (!el || !xTo || !yTo || !mouse(ev)) return;

  if (el.dataset.shown === undefined) {
    el.dataset.shown = '';
    root.dataset.cursor = '';
    /* Second argument to a quickTo is its start value: the dot appears
       where the pointer is rather than flying in from the last place it
       was, which after a trip out of the window is the far edge. */
    xTo(ev.clientX, ev.clientX);
    yTo(ev.clientY, ev.clientY);
    return;
  }

  xTo(ev.clientX);
  yTo(ev.clientY);
}

function state(ev: PointerEvent) {
  if (!el || !mouse(ev)) return;
  const t = ev.target;
  if (!(t instanceof Element)) return;

  el.dataset.state = t.closest(FIELD)
    ? 'field'
    : t.closest(LINK)
      ? 'link'
      : t.closest(ROW)
        ? 'row'
        : 'default';
}

/* Out of the window entirely — over browser chrome, another window, or an
   iframe, all of which stop sending us moves and would leave the dot
   parked. The native cursor is drawn by whatever it is over now, so
   `data-cursor` can stay: it only ever applies to this document. */
function hide() {
  if (el) delete el.dataset.shown;
}

function init() {
  if (el || motionOff() || !FINE.matches) return;

  el = document.createElement('div');
  el.className = 'cursor';
  el.setAttribute('aria-hidden', 'true');
  el.append(
    Object.assign(document.createElement('i'), { className: 'dot' }),
    Object.assign(document.createElement('i'), { className: 'ring' }),
  );
  document.body.append(el);

  // quickTo, not a set() per move: one tween per axis, retargeted, rather
  // than a write on every event with nothing between the samples.
  xTo = gsap.quickTo(el, 'x', { duration: FOLLOW, ease: 'power3' });
  yTo = gsap.quickTo(el, 'y', { duration: FOLLOW, ease: 'power3' });

  addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerover', state, { passive: true });
  document.addEventListener('pointerleave', hide, { passive: true });
}

function destroy() {
  if (!el) return;
  removeEventListener('pointermove', move);
  document.removeEventListener('pointerover', state);
  document.removeEventListener('pointerleave', hide);
  gsap.killTweensOf(el);
  el.remove();
  el = null;
  xTo = yTo = null;
  // Last, and unconditionally: the native cursor has to come back even if
  // the element was already gone.
  delete root.dataset.cursor;
}

/* Both directions, like every other module here. Turning motion off takes
   the cursor away mid-session; turning it back on builds a new one, which
   is not replaying an entrance — there is no entrance, only a dot that is
   either following the pointer or absent. */
onMotionChange((off) => (off ? destroy() : init()));

/* A mouse plugged into a tablet, or a laptop lid closed onto a dock, moves
   this query after load. */
FINE.addEventListener('change', () => (FINE.matches ? init() : destroy()));

init();
