/* §0.4 / §32 — content at a station.

   The writeup arrives over the scene, in document mode's own register, and
   the register is not reproduced here: every element in the column is
   **cloned out of the document underneath**, scoped styles and all. §29
   proved that path and it is the only one that cannot drift — a retyped
   headline is a second copy of the content and of the type ramp, and the
   two would part company on the first edit to a `.mdx` file.

   What this file adds to those clones is three things and no words:

   - **the three states** (§4.8's landmark states, §0.4's "what does not
     change"): distant is nothing at all, approaching resolves the machine
     ID and the headline, arrived opens the writeup. They are not a state
     machine — they are `bandAt()`'s own weight, which is already 0 across
     the travel, a smoothstep over the last 700 scroll units of the
     approach, 1 across the dwell and a ramp back out over the climb away.
     Two ranges of that one number are the two blocks' opacity;
   - **the column's own travel**, which is the answer to the thing that
     measures wrong: the writeup at 45ch is 715 to 1,150 units tall and the
     frame is ~700, so a station's reading does not fit the screen it is
     read on. It is not a second scroll position — the dwell is 600 scroll
     units in which the camera holds one pose, and those units move the
     column instead. One authority, one gesture, and the dwell stops being
     dead scroll;
   - **the URL**, in both directions.

   `replaceState`, never push, for §4.6's reason: the route crosses four
   stations and a reader who scrolls it twice would have sixteen entries
   behind them. What makes the back button *work* is the other direction —
   a popstate resolves to a station and jumps the route to it, which is
   what a deep link does on load. */

import { DWELL, STATIONS, bandAt, stops } from './route';

/* Where in a station's band each block resolves. The name leads, because
   §0.3's route table says the ID and the headline resolve *as you close*;
   the writeup reaches 1 exactly at the settle keyframe, which is what
   "arrived" means. */
const NAME_IN = [0.10, 0.55];
const OPEN_IN = [0.62, 1.0];

/* Closing is a fade rather than a cut, and it is the same exponential
   everything else in the world eases on. Short: this one is a reader's
   own click, not a movement of the world. */
const SHUT_TAU = 0.16;

/* The band weight at which the address bar changes hands. Well clear of
   both ramps, so nothing flaps, and it *leads* the writeup — which is
   what §17 measured document mode's own threshold doing. */
const PATH_AT = 0.5;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const ramp = (v: number, [a, b]: number[]) => smoothstep(clamp01((v - a!) / (b! - a!)));

/* An id would be a second copy of one the document already owns, and two
   elements with the same id is the one clone bug that is invisible until
   something asks for it by name. Inline styles go for a related reason:
   `projects.ts` leaves GSAP's own opacity and transform on `.headline` and
   the beats, and a clone taken mid-pin would arrive at opacity 0. */
function strip(el: HTMLElement): HTMLElement {
  el.removeAttribute('id');
  el.removeAttribute('style');
  for (const child of el.querySelectorAll<HTMLElement>('[id], [style]')) {
    child.removeAttribute('id');
    child.removeAttribute('style');
  }
  return el;
}

/* Scrolling away from a station hides the only content a reader can reach
   in world mode, and a `Live` link they had tabbed to is inside it. Focus
   does not move on its own when its element becomes invisible — it stays,
   and Tab then resumes from a node that is not on screen. Drop it first. */
function hide(el: HTMLElement, out: boolean) {
  if (out === el.hasAttribute('data-out')) return;
  if (out && el.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
  el.toggleAttribute('data-out', out);
}

const lift = (from: Element, sel: string): HTMLElement | null => {
  const src = from.querySelector<HTMLElement>(sel);
  return src ? strip(src.cloneNode(true) as HTMLElement) : null;
};

/* The one clone that is not a clone: the document's headline is an `<h3>`
   under the page's `<h1>` and the "Work" `<h2>`, and neither of those is in
   the accessibility tree in world mode — the document is `visibility:
   hidden` behind the canvas. So the level moves up to where it actually
   sits. Everything that carries the type — the class and Astro's own scope
   attribute — is copied, so it is the document's headline in every respect
   a reader can see. */
function headlineOf(section: Element, id: string): HTMLElement {
  const src = section.querySelector<HTMLElement>('.headline')!;
  const h = document.createElement('h2');
  for (const attr of Array.from(src.attributes)) {
    if (attr.name === 'id' || attr.name === 'style') continue;
    h.setAttribute(attr.name, attr.value);
  }
  h.id = id;
  h.innerHTML = src.innerHTML;
  return h;
}

type Panel = {
  slug: string;
  el: HTMLElement;
  col: HTMLElement;
  stack: HTMLElement;
  name: HTMLElement;
  body: HTMLElement;
  act: HTMLButtonElement;
  /** The reader's own decision, and it resets when they leave. */
  shut: boolean;
  /** Eased toward `shut`, so closing is a fade. */
  k: number;
  /** How far past the frame the column runs, measured rather than assumed. */
  over: number;
};

/** A URL, as much of one as this needs. It is a value rather than a read of
    `location` because *when* it is read matters — see `world.ts`. */
export type Where = { hash: string; path: string };

const slugOf = ({ hash, path }: Where): string | null => {
  const named = hash.replace(/^#/, '');
  if (named && stops.some((s) => s.slug === named)) return named;
  const slug = /^\/projects\/([^/]+)\/?$/.exec(path)?.[1];
  return slug && stops.some((s) => s.slug === slug) ? slug : null;
};

/** Where on the route a URL points, or 0 for the arrival. Both the load and
    the back button resolve through this. */
export function entryAt(where: Where = { hash: location.hash, path: location.pathname }): number {
  const slug = slugOf(where);
  return slug ? stops.find((s) => s.slug === slug)!.y : 0;
}

export function buildStation(jump: (y: number) => void) {
  const root = document.createElement('div');
  root.className = 'stations';

  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  root.append(scrim);

  const panels: Panel[] = [];

  for (const station of STATIONS) {
    const section = document.getElementById(station.slug);
    // The document is what the world is a shell around. Without it there is
    // no content to show and a station is scenery — which is the correct
    // failure, not a reason to invent copy.
    if (!section) continue;

    /* A named `section`, which is `role="region"` — a landmark. The
       document's own `<main>` is behind an opaque canvas and out of the
       accessibility tree, so without this the whole of what a reader can
       actually reach in world mode sits outside every landmark. Measured:
       three axe `region` violations against document mode's zero. */
    const el = document.createElement('section');
    el.className = 'station';
    el.setAttribute('aria-labelledby', `world-${station.slug}-h`);

    const col = document.createElement('div');
    col.className = 'col';
    const stack = document.createElement('div');
    stack.className = 'stack';

    const name = document.createElement('div');
    name.className = 'name';
    const row = document.createElement('div');
    row.className = 'row';
    const top = lift(section, ':scope > .top');
    if (top) row.append(top);
    name.append(row, headlineOf(section, `world-${station.slug}-h`));

    const body = document.createElement('div');
    body.className = 'body';
    body.id = `world-${station.slug}`;
    for (const sel of ['.summary', '.stats', '.links', '.prose']) {
      const part = lift(section, sel);
      if (part) body.append(part);
    }

    stack.append(name, body);
    col.append(stack);

    const act = document.createElement('button');
    act.type = 'button';
    act.className = 'act';
    act.setAttribute('aria-controls', body.id);
    act.setAttribute('aria-expanded', 'true');
    act.textContent = 'Close';
    row.append(act);

    el.append(col);
    root.append(el);

    const panel: Panel = { slug: station.slug, el, col, stack, name, body, act, shut: false, k: 0, over: 0 };
    act.addEventListener('click', () => {
      panel.shut = !panel.shut;
      act.textContent = panel.shut ? 'Read' : 'Close';
      act.setAttribute('aria-expanded', String(!panel.shut));
    });
    panels.push(panel);
  }

  /* How far the column runs past the frame it is read in. Measured on the
     stack rather than on the column, because the column is the frame: it is
     inset to it and centres its content, so its own height says nothing
     about the content's. Measured on entry and on the two things that
     change the answer — the viewport, and the fonts arriving (§17's trap:
     anything measured at import is measured in the fallback face). */
  function measure(panel: Panel) {
    const cs = getComputedStyle(panel.col);
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    panel.over = Math.max(0, Math.round(panel.stack.offsetHeight + pad - innerHeight));
    panel.el.toggleAttribute('data-tall', panel.over > 0);
  }

  let here = -1;
  let shownPath: string | null = null;

  /* Written once each, not once a frame: a custom property is a style
     invalidation, and five of them on every frame of a flight is work for
     nothing when the number has not moved a thousandth. */
  const wrote = new WeakMap<HTMLElement, Record<string, number>>();
  function put(el: HTMLElement, prop: string, v: number) {
    let last = wrote.get(el);
    if (!last) wrote.set(el, (last = {}));
    if (Math.abs((last[prop] ?? Number.NaN) - v) < 0.002) return;
    last[prop] = v;
    el.style.setProperty(prop, v.toFixed(3));
  }

  function setPath(path: string) {
    if (path === shownPath) return;
    shownPath = path;
    /* The query rides along, always. `?world` is how a reader got here and
       `?doc` is §0.1's opt-out; a bare pathname drops whichever one they
       arrived with and the next reload lands in the other mode. */
    history.replaceState(history.state, '', path + location.search);
  }

  function update(y: number | null, dt: number) {
    const band = y === null ? { station: -1, weight: 0 } : bandAt(y);
    const i = band.weight > 0 ? band.station : -1;

    if (i !== here) {
      if (here >= 0) {
        const left = panels[here]!;
        left.el.removeAttribute('data-here');
        // Leaving and coming back re-opens: a dismissal is about this
        // arrival, not about the project.
        left.shut = false;
        left.k = 0;
        left.act.textContent = 'Close';
        left.act.setAttribute('aria-expanded', 'true');
        // Cleared so the next measure sees the whole column rather than
        // whatever this arrival happened to leave hidden.
        left.body.removeAttribute('data-out');
        left.act.removeAttribute('data-out');
      }
      here = i;
      if (here >= 0) {
        panels[here]!.el.setAttribute('data-here', '');
        measure(panels[here]!);
      }
    }

    setPath(i >= 0 && band.weight >= PATH_AT ? `/projects/${panels[i]!.slug}` : '/');

    if (here < 0) {
      put(scrim, 'opacity', 0);
      return;
    }

    const panel = panels[here]!;
    panel.k += ((panel.shut ? 1 : 0) - panel.k) * (1 - Math.exp(-dt / SHUT_TAU));

    const named = ramp(band.weight, NAME_IN);
    const open = ramp(band.weight, OPEN_IN);
    const shown = open * (1 - panel.k);

    put(panel.name, '--in', named);
    put(panel.body, '--in', shown);
    put(panel.act, '--in', open);
    /* The scrim is §17's and it is the reading half of the frame held
       still — so it is up whenever there is type in front of it, and it is
       up further when there is more. Half for a resolving headline, all of
       it for an open writeup. */
    put(scrim, 'opacity', Math.max(named * 0.5, shown));

    // Out of the tab order and out of the tree when it is not on screen,
    // rather than transparent and still focusable behind an opaque canvas.
    hide(panel.body, shown < 0.004);
    hide(panel.act, open < 0.004);

    /* The dwell, spent as reading. One scroll unit is one pixel of column
       unless the column is longer than the dwell, in which case the whole
       of it still arrives by the end — a reader who scrolls off a station
       has finished it either way. */
    const at = stops[here]!.y;
    const rate = Math.max(1, panel.over / DWELL);
    const off = Math.min(Math.max(((y ?? 0) - at) * rate, 0), panel.over);
    put(panel.col, '--up', -off * (1 - panel.k));
  }

  addEventListener('resize', () => {
    if (here >= 0) measure(panels[here]!);
  });
  document.fonts.ready.then(() => {
    for (const panel of panels) if (panel.el.hasAttribute('data-here')) measure(panel);
  });

  /* The other direction, and the whole of what makes the back button mean
     something here: the address bar is written by the route, so an entry in
     the stack *is* a place on it. Our own writes are replaceState and never
     reach this. */
  addEventListener('popstate', () => jump(entryAt()));

  return {
    root,
    update,
    /** `Esc` closes an open writeup before it leaves the world (§33 owns the
        control it leaves to). Returns whether there was one to close. */
    dismiss(): boolean {
      const panel = here >= 0 ? panels[here]! : null;
      if (!panel || panel.shut || panel.body.hasAttribute('data-out')) return false;
      panel.act.click();
      return true;
    },
  };
}
