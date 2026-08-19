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

import { DWELL, LENGTH, STATIONS, bandAt, stops } from './route';

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
const NAME_IN = [0.10, 0.60];

/* ── The dwell is the pin ───────────────────────────────────────────────
   The beats used to play across the *approach*, so by the time the camera
   reached the settle everything was already up and the dwell had only the
   column left to spend. Document mode does not work that way: `projects.ts`
   pins a section and the reader's own scroll walks the three beats through
   the pin. The dwell is this world's pin — the camera holds one pose for
   every unit of it — so the beats belong in it.

   Arriving therefore shows the machine ID row and the headline and nothing
   else: that is the frame the reader lands on, and it is the frame §29
   judged. Each beat after it is a range of **scroll position inside the
   dwell**, in units, and scrolling back runs them backwards.

   380 units between beats with a 240-unit fade — so each beat holds alone
   for 140 before the next begins, and nothing is ever mid-fade for more
   than a fifth of the dwell. Against document mode's pin, which is 1,769px
   for three beats, this is 1,000 for three and then 500 for the column. */
const LEAD_AT = [0, 240];
const FACTS_AT = [380, 620];
const TEXT_AT = [760, 1000];
/** Where the beats end and the column starts moving. */
const COLUMN_AT = 1000;
/** What is left of the dwell for it. */
const COLUMN_SPAN = DWELL - COLUMN_AT;

const span = (p: number, [a, b]: number[]) => smoothstep(clamp01((p - a!) / (b! - a!)));

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

/* ── The arrival (§0.3's 0% row, §34) ───────────────────────────────────
   "High over the landscape, the name in `--paper`, stations visible in the
   distance." Two of those three clauses had never belonged to a step: §31
   sited the route and put Enargeia in the opening frame, §32 built the
   content *at* a station, and neither was wrong to skip this — until §34
   there was nothing in the world for the frame to contain.

   So the first 9.5% of the route carried no type at all. `bandAt(0)` is
   station −1 at weight 0 and the first non-zero weight is 1,601 units in;
   the document's own hero is behind `visibility: hidden`; a first-time
   visitor arrived at an unnamed landscape.

   **It is not a clone of the document's hero and that is deliberate.** The
   hero is `--t-hero` at 18vw, which is the right size for a page whose
   subject is the type and the wrong size for a frame whose subject is the
   landscape — it would fill it. This is `--t-2xl`, the size §29 measured as
   composed over the world and the same one every station's headline uses,
   in the column the reading already occupies. One register, two things in
   it.

   **And it leaves the way everything else on the route leaves**: a ramp off
   scroll, gone by 1,200 — four hundred units before Enargeia's machine ID
   begins to resolve, so the two are never both on screen. It rides `y`
   directly rather than a band weight because there is no band at 0; the
   arithmetic is the same shape and the cap makes it smooth without damping
   (at 12 scroll units a frame it is 1.4% of an opacity). */
const ARRIVE_OUT = [350, 1200];

/* ── The closing (§44) ──────────────────────────────────────────────────
   §4.6 says the site is one document and names three things in it — hero,
   the four projects, about — and until §44 the world had two of them.
   §0.3's promise is not a route-table row but the sentence under it: *deep
   links work in both modes and mean the same thing*. `/about` was one that
   document mode honoured and the world silently dropped, because `entryAt`
   resolved four project slugs and returned 0 for everything else — so the
   address round-tripped to the arrival and a reader who followed it landed
   somewhere that is `/`.

   Resolving it without giving it anything to point at would have been the
   worse half of the fix, so the end of the route carries the about column.
   It is the arrival's own construction played backwards — one section, one
   ramp, cloned out of the document rather than retyped (§32's rule) — and
   it lands where the document puts it: after the fourth project. It shares
   its band with the stick's offer, which is the other thing the end of the
   route is for, and the two do not contend: the column is at the left edge
   and the offer is in the opposite corner. */
const ABOUT_AT = stops[stops.length - 1]!.y + DWELL;

/* **The tail has no gap in it, and that is what shapes this.** The arrival
   gets clean air — it is gone by 1,200 and Enargeia's band does not begin
   until 1,610 — but Basis's ramp back out runs the whole climb away and
   only reaches zero at the route's last unit: 0.99 at 16,000, 0.43 at
   16,600, 0.04 at 17,000. So there is nowhere after it to stand, and the
   first build put the about column straight through Basis's own writeup —
   two different texts in one 54ch measure, which is the double exposure
   §4.3 forbids, arriving by a door nobody was watching.

   So it is a hand-over rather than a placement: the closing's ramp in is
   also what takes the last station out (see `target` below), which is the
   one construction that cannot leave both on screen. The reader reads
   Basis, climbs away from it, and the about column is what the climb
   arrives at. */
const CLOSING_IN = [ABOUT_AT + 450, LENGTH];
/** Where `#about` lands, and it is the *end* of the ramp rather than its
    start — the same rule a station follows, where the entry is the settle
    keyframe and the panel is already at weight 1 when the reader arrives.
    Landing at the start would drop them where the column is still at zero,
    which is an address pointing at the frame before the one it names. */
const ABOUT_ENTRY = CLOSING_IN[1]!;
/** The hint goes first. It is an instruction, and an instruction that is
    still on screen once the reader has obeyed it is noise. */
const HINT_OUT = [200, 800];

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
  facts: HTMLElement | null;
  text: HTMLElement | null;
  act: HTMLButtonElement;
  /** Displayed at all — kept until the damped weight reaches 0, so a panel
      is never cut off mid-fade by the reader leaving its band. */
  on: boolean;
  /** The damped band weight. Everything visible is a function of this and
      of nothing else, which is what "damp once, upstream" means. */
  fade: number;
  /** The damped reading offset, in pixels. Its own, much shorter, τ. */
  off: number;
  /** The damped position inside the dwell, in scroll units, which is what
      the beats are a function of. Damped at the fades' own τ, not the
      column's: a beat is a cross-fade and wants the lag. */
  pos: number;
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

/** Both spellings, because both exist: the document writes `/about` into
    the address bar from its own `data-path`, and every link on the site
    points at `/#about`. `/about` is also an Astro redirect, so it only
    reaches here when something rewrote the path rather than navigated. */
const isAbout = ({ hash, path }: Where): boolean =>
  hash.replace(/^#/, '') === 'about' || /^\/about\/?$/.test(path);

/** Where on the route a URL points, or 0 for the arrival. Both the load and
    the back button resolve through this. */
export function entryAt(where: Where = { hash: location.hash, path: location.pathname }): number {
  if (isAbout(where)) return ABOUT_ENTRY;
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

  /* A landmark of its own, for the reason every panel is one: `<main>` is
     behind an opaque canvas and out of the accessibility tree in world
     mode, so anything outside a labelled region is content no screen reader
     can place. And an `<h1>` rather than an `<h2>` — the document's own is
     hidden, so in world mode this is the page's heading. */
  const arrival = document.createElement('section');
  arrival.className = 'arrival';
  arrival.setAttribute('aria-labelledby', 'world-arrival-h');
  {
    const col = document.createElement('div');
    col.className = 'col';
    const name = document.createElement('h1');
    name.id = 'world-arrival-h';
    name.className = 'headline';
    name.textContent = 'Theophilus John';
    const sub = document.createElement('p');
    sub.className = 'sub';
    /* The document's own line, read rather than retyped — §32's rule for
       every other word in this file. It is the one sentence that says what
       the site is, and a reader who never leaves world mode would otherwise
       never see it. */
    sub.textContent =
      document.querySelector('.hero .sub span')?.textContent?.trim() ?? '';
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'Scroll to fly';
    col.append(name, sub, hint);
    arrival.append(col);
    root.append(arrival);
  }

  /* The about column at the end of the route (§44). A landmark of its own
     for the same reason every other panel is one — `<main>` is behind an
     opaque canvas — and an `<h2>`, because the arrival's name is the page's
     `<h1>` in world mode and this sits under it.

     Cloned, never retyped: the heading and the prose are the document's own
     nodes, so the three paragraphs and the row of links at the end cannot
     drift from `index.astro`. If the section is missing the panel is not
     built at all, which is the same failure a station has — no content is a
     reason to show nothing, not a reason to invent copy. */
  const closing = document.createElement('section');
  closing.className = 'closing';
  /* Tracked rather than asked. `closing.isConnected` is false here however
     well the panel was built: `root` is not attached to the document until
     `scene.ts` mounts it, so the question the DOM answers is about the wrong
     tree. It reads as a panel that exists and is never driven. */
  let hasClosing = false;
  {
    const about = document.getElementById('about');
    const prose = about && lift(about, '.prose');
    if (about && prose) {
      closing.setAttribute('aria-labelledby', 'world-about-h');
      const col = document.createElement('div');
      col.className = 'col';
      const head = document.createElement('h2');
      head.id = 'world-about-h';
      head.className = 'meta';
      head.textContent = about.querySelector('#about-h')?.textContent?.trim() ?? 'About';
      col.append(head, prose);
      closing.append(col);
      root.append(closing);
      hasClosing = true;
    }
  }

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
    const facts = block(section, 'facts', ['.stats', '.links']);
    // Not `.prose`: that is the cloned class inside it.
    const text = block(section, 'text', ['.prose']);
    for (const part of [lead, facts, text]) if (part) body.append(part);

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
      slug: station.slug, el, col, stack, name, body, lead, facts, text, act,
      on: false, fade: 0, off: 0, pos: 0, shut: false, k: 0, over: 0,
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
    /* What `scroll.ts` needs is where **the reading** ends, which is the
       last beat plus however far the column has to travel — not the column
       alone. Capped at the dwell, which is the case where it fills it. */
    reading(panels.indexOf(panel), Math.min(COLUMN_AT + panel.over, DWELL));
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
    panel.pos = 0;
    panel.act.textContent = 'Close';
    panel.act.setAttribute('aria-expanded', 'true');
    for (const el of [panel.body, panel.lead, panel.facts, panel.text, panel.act]) {
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
    /* The arrival, before the panels, because the scrim below takes the
       maximum over both and the first thing on the route is the name. */
    const opening = y === null ? 0 : 1 - ramp(y, ARRIVE_OUT);
    put(arrival, '--in', opening);
    put(arrival, '--hint', y === null ? 0 : 1 - ramp(y, HINT_OUT));
    hide(arrival, opening < 0.004);

    /* The other end of the route, and the same two lines. It is prose
       rather than a name, so it takes a full scrim rather than the
       arrival's half — this is the one frame on the route that is meant to
       be read rather than looked past. */
    const ending = !hasClosing || y === null ? 0 : ramp(y, CLOSING_IN);
    if (hasClosing) {
      put(closing, '--in', ending);
      hide(closing, ending < 0.004);
    }

    let lit = Math.max(0, opening * 0.5, ending);
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i]!;
      /* Scaled by what the closing has taken, which is the whole of how the
         two share a tail with no gap in it. At the end of the route the
         about column is at 1 and every station is at 0 by construction,
         whatever its own band still says. */
      const target = i === live ? band.weight * (1 - ending) : 0;

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

      /* How far into the dwell the reader has scrolled — negative on the
         approach, past the end on the climb away. The beats read it and
         `w` closes them again on the way out, so the same expression
         covers all three regions: 0 before the dwell because the beat has
         not started, its own value inside it, and `w` fading to 0 after. */
      if (i === live) panel.pos += (((y ?? 0) - stops[i]!.y) - panel.pos) * fadeK;
      const p = panel.pos;

      const named = ramp(w, NAME_IN);
      const lead = span(p, LEAD_AT) * w;
      const facts = span(p, FACTS_AT) * w;
      const text = span(p, TEXT_AT) * w;

      put(panel.name, '--in', named);
      // The wrapper carries the dismissal alone; the blocks carry the
      // arrival. Nested opacity multiplies, so the two never contend.
      put(panel.body, '--in', open);
      if (panel.lead) put(panel.lead, '--in', lead);
      if (panel.facts) put(panel.facts, '--in', facts);
      if (panel.text) put(panel.text, '--in', text);
      // The way out appears with the first thing there is to close.
      put(panel.act, '--in', lead);

      /* The scrim is §17's and it is the reading half of the frame held
         still — so it is up whenever there is type in front of it, and it
         is up further when there is more. A rung per beat. */
      lit = Math.max(lit, named * 0.45, lead * 0.6 * open, facts * 0.8 * open, text * open);

      // Out of the tab order and out of the tree when it is not on screen,
      // rather than transparent and still focusable behind an opaque canvas.
      const most = Math.max(lead, facts, text);
      hide(panel.body, open * most < 0.004);
      hide(panel.act, lead < 0.004);
      if (panel.lead) hide(panel.lead, lead < 0.004);
      if (panel.facts) hide(panel.facts, facts < 0.004);
      if (panel.text) hide(panel.text, text < 0.004);

      /* And then the column, over what the beats leave of the dwell. One
         scroll unit is one pixel unless the column is longer than that
         remainder, in which case the whole of it still arrives by the end.
         The rate is the same at every station on purpose: a wheel notch
         that moved Basis's short column at a fifth of Homonoia's speed is
         the thing that reads as broken. */
      if (i === live) {
        const rate = Math.max(1, panel.over / COLUMN_SPAN);
        const run = Math.min(Math.max(((y ?? 0) - stops[i]!.y - COLUMN_AT) * rate, 0), panel.over);
        panel.off += (run * open - panel.off) * readK;
      }
      put(panel.col, '--up', -panel.off);
    }

    put(scrim, 'opacity', lit);
    // Off the damped weight too, so the address bar follows the frame
    // rather than leading it by a fifth of a second.
    /* The closing wins when it is up: it is the last thing on the route, so
       nothing else can be live at the same time, and reading it is what the
       reader is doing there. Same threshold as a station, so the address
       changes at the same point in a fade either way. */
    setPath(
      ending >= PATH_AT
        ? '/about'
        : live >= 0 && panels[live]!.fade >= PATH_AT
          ? `/projects/${panels[live]!.slug}`
          : '/',
    );
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
