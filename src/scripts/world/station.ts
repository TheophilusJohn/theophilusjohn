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
     **Damped once** (see below) and then read three times: three ranges of
     that one number are the three blocks' opacity, staggered so the column
     arrives as a cascade — the name, then the numbers, then the reading;
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

/* Where in a station's band each block resolves — three equal ramps of
   0.40, staggered by 0.25, so they overlap in pairs and the column arrives
   as one cascade rather than as three cuts. In scroll units each is 280 of
   the approach's 700 and the stagger is 175.

   The first begins at 0.10 rather than at 0, so a station merely on the
   horizon shows nothing; the last ends at **exactly 1.0**, which is the
   settle keyframe, because that is what "arrived" means and the whole
   composition is judged at that pose. The order is §0.3's route table read
   literally — the ID and the headline resolve *as you close*, then the
   numbers, then the reading. */
const NAME_IN = [0.10, 0.50];
const LEAD_IN = [0.35, 0.75];
const DETAIL_IN = [0.60, 1.0];

/* Closing is a fade rather than a cut, and it is the same exponential
   everything else in the world eases on. Short: this one is a reader's
   own click, not a movement of the world. */
const SHUT_TAU = 0.16;

/* ── Damping ────────────────────────────────────────────────────────────
   The column read the raw route position, so at a flick the fades stepped
   rather than eased — document mode does not, because Lenis smooths the
   scroll *and* GSAP's `scrub: 1` lerps the timeline toward it over about a
   second. Both halves of that are missing here: `scroll.ts` damps the
   gesture but its output is still a position, and a band weight taken
   straight off a position inherits every jitter in it.

   So the weight is damped **once, upstream**, and every derived value —
   the three ramps, the scrim, the address bar — inherits the smoothing
   rather than repeating it. Framerate-independent, like everything else
   here: `1 - exp(-dt/τ)`, never a fixed per-frame factor.

   **The two constants are deliberately far apart, and that is the point.**
   0.30s on the fades is longer than `scroll.ts`'s own 0.22, so the content
   settles *after* the camera does, which is the right order — the world
   arrives and then the words do. The reading is the opposite case: it is
   the reader's wheel moving text, and lag there is the thing that feels
   broken, so 0.09s — five frames at 60Hz, enough to take the step out of a
   35px-a-frame scrub and not enough to feel detached from the hand. */
const FADE_TAU = 0.30;
const READ_TAU = 0.09;

/* §31's rule one level up: damping must not apply to a jump. A deep link,
   the back button and §35's rejoin all move the route by thousands of units
   in a frame, and easing that fades the column in from nothing under a
   camera that is already there. The route's cap is 420 world units a second
   against a peak of 1.130 world units per scroll unit, so the largest step
   a gesture can produce is about 12 scroll units at 30Hz — 400 is two
   orders of magnitude clear of anything real. */
const JUMP = 400;

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

/** One phase of the cascade, or nothing if the project has none of its
    parts — Basis has no metrics, and an empty block would spend a third of
    the arrival on a blank. */
function block(section: Element, name: string, parts: string[]): HTMLElement | null {
  const el = document.createElement('div');
  el.className = name;
  for (const sel of parts) {
    const part = lift(section, sel);
    if (part) el.append(part);
  }
  return el.childElementCount ? el : null;
}

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
  /** The three blocks of the cascade. Either of the last two may be absent:
      Basis has no metrics, and a project with no writeup would have no
      reading. A phase with nothing in it is not built. */
  name: HTMLElement;
  body: HTMLElement;
  lead: HTMLElement | null;
  detail: HTMLElement | null;
  act: HTMLButtonElement;
  /** Displayed at all — kept until the damped weight reaches 0, so a panel
      is never cut off mid-fade by the reader leaving its band. */
  on: boolean;
  /** The damped band weight. Everything visible is a function of this and
      of nothing else, which is what "damp once, upstream" means. */
  fade: number;
  /** The damped reading offset, in pixels. Its own, much shorter, τ. */
  off: number;
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

export function buildStation(
  jump: (y: number) => void,
  /** How much of the dwell this station's column occupies, in scroll units.
      `scroll.ts` needs it to know where the reading ends and its friction
      begins, and only this module has measured the column. */
  reading: (i: number, units: number) => void = () => {},
) {
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

    /* One wrapper for the reader's own dismissal, two blocks inside it for
       the last two phases of the arrival. Opacity nests, so the dismissal
       and the arrival multiply rather than fighting over one number.

       **The order is the document's**, and the split is chosen to keep it
       that way: the lead paragraph is a phase on its own and the numbers,
       the links and the writeup are the third. An earlier arrangement put
       the metric strip in the second phase, which read well — it is §29's
       own judged frame — but only by moving the strip above the summary,
       and the two modes are meant to be the same page. */
    const body = document.createElement('div');
    body.className = 'body';
    body.id = `world-${station.slug}`;
    const lead = block(section, 'lead', ['.summary']);
    const detail = block(section, 'detail', ['.stats', '.links', '.prose']);
    if (lead) body.append(lead);
    if (detail) body.append(detail);

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

    const panel: Panel = {
      slug: station.slug, el, col, stack, name, body, lead, detail, act,
      on: false, fade: 0, off: 0, shut: false, k: 0, over: 0,
    };
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
    /* One scroll unit is one pixel unless the column is longer than the
       dwell, so the reading is `over` units of scroll — capped at the dwell,
       which is the case where it fills the whole of it. */
    reading(panels.indexOf(panel), Math.min(panel.over, DWELL));
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

  /* Leaving and coming back re-opens: a dismissal is about this arrival,
     not about the project. The `data-out` attributes go with it, so the
     next `measure()` sees the whole column rather than whatever the last
     arrival happened to leave hidden. */
  function reset(panel: Panel) {
    panel.shut = false;
    panel.k = 0;
    panel.off = 0;
    panel.act.textContent = 'Close';
    panel.act.setAttribute('aria-expanded', 'true');
    for (const el of [panel.body, panel.lead, panel.detail, panel.act]) {
      el?.removeAttribute('data-out');
    }
  }

  let from: number | null = null;

  function update(y: number | null, dt: number) {
    const band = y === null ? { station: -1, weight: 0 } : bandAt(y);
    const live = band.weight > 0 ? band.station : -1;
    here = live;

    const jumped = y === null || from === null || dt <= 0 || Math.abs(y - from) > JUMP;
    from = y;
    const fadeK = jumped ? 1 : 1 - Math.exp(-dt / FADE_TAU);
    const readK = jumped ? 1 : 1 - Math.exp(-dt / READ_TAU);
    const shutK = jumped ? 1 : 1 - Math.exp(-dt / SHUT_TAU);

    /* Every panel, every frame, not just the live one — a panel is held on
       screen until its *damped* weight reaches 0, so the reader crossing a
       band edge does not cut a fade that is still running. `put()` writes
       nothing for a panel whose numbers have not moved, so the three that
       are not on cost four comparisons each. */
    let lit = 0;
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i]!;
      const target = i === live ? band.weight : 0;

      if (target > 0 && !panel.on) {
        panel.on = true;
        panel.el.setAttribute('data-here', '');
        measure(panel);
      }
      panel.fade += (target - panel.fade) * fadeK;
      if (target === 0 && panel.fade < 0.002) panel.fade = 0;
      if (!panel.on) continue;
      if (panel.on && target === 0 && panel.fade === 0) {
        panel.on = false;
        panel.el.removeAttribute('data-here');
        reset(panel);
        continue;
      }

      const w = panel.fade;
      panel.k += ((panel.shut ? 1 : 0) - panel.k) * shutK;
      const open = 1 - panel.k;

      const named = ramp(w, NAME_IN);
      const lead = ramp(w, LEAD_IN);
      const detail = ramp(w, DETAIL_IN);

      put(panel.name, '--in', named);
      // The wrapper carries the dismissal alone; the blocks carry the
      // arrival. Nested opacity multiplies, so the two never contend.
      put(panel.body, '--in', open);
      if (panel.lead) put(panel.lead, '--in', lead);
      if (panel.detail) put(panel.detail, '--in', detail);
      // The way out appears with the first thing there is to close.
      put(panel.act, '--in', lead);

      /* The scrim is §17's and it is the reading half of the frame held
         still — so it is up whenever there is type in front of it, and it
         is up further when there is more. Three rungs for three phases. */
      lit = Math.max(lit, named * 0.45, lead * 0.7 * open, detail * open);

      // Out of the tab order and out of the tree when it is not on screen,
      // rather than transparent and still focusable behind an opaque canvas.
      hide(panel.body, open * Math.max(lead, detail) < 0.004);
      hide(panel.act, lead < 0.004);
      if (panel.lead) hide(panel.lead, lead < 0.004);
      if (panel.detail) hide(panel.detail, detail < 0.004);

      /* The dwell, spent as reading. One scroll unit is one pixel of column
         unless the column is longer than the dwell, in which case the whole
         of it still arrives by the end — a reader who scrolls off a station
         has finished it either way. The rate is the same at every station on
         purpose: a wheel notch that moved Basis's short column at a fifth of
         Homonoia's speed is the thing that reads as broken. */
      if (i === live) {
        const rate = Math.max(1, panel.over / DWELL);
        const span = Math.min(Math.max(((y ?? 0) - stops[i]!.y) * rate, 0), panel.over);
        panel.off += (span * open - panel.off) * readK;
      }
      put(panel.col, '--up', -panel.off);
    }

    put(scrim, 'opacity', lit);
    // Off the damped weight too, so the address bar follows the frame
    // rather than leading it by a fifth of a second.
    setPath(live >= 0 && panels[live]!.fade >= PATH_AT ? `/projects/${panels[live]!.slug}` : '/');
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
