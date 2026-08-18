/* §33 / SPEC §0.1 — the gate in front of the world, and the loader behind it.

   The flip happened here. Until §33 this module asked "did the URL say
   `?world`" and the answer was almost always no; now the head script in
   Base.astro has already decided what site this load is, before first
   paint, and written it on the root. What is left for this file is the
   half of the decision that cannot be made synchronously and the honest
   progress state §0.1 asks for in front of it.

   **Two tiers, not three**, still. §15 asked for a reduced WebGL 2 tier
   between compute and nothing, and it was built and measured; it does not
   ship. `three/webgpu` is a single module, so a bundler cannot split the
   two backends into separate chunks, and carrying both costs every world
   load 23.1KB gzipped for a backend that cannot run a compute pass anyway.
   §0.1 says the browser that would have had it gets the document, which is
   the whole site.

   **Decided once, at load.** §15's gate re-asked on resize, because a scene
   behind a document could arrive at any time without disturbing anything.
   A mode cannot: dragging a window past 1024px must not teleport a reader
   who is reading into a landscape they did not ask for.

   **Nothing here is destructive.** The document is painted, in the DOM and
   one attribute away for the whole of this file. Every failure path — no
   adapter, a manifest that 404s, a renderer that throws — ends at the same
   place, which is §0.1's bottom tier reached late rather than a broken
   page. */

import { holdScroll, releaseScroll } from './motion';

declare global {
  interface Window {
    /** Set by the head script. The one way out, and it is shared rather
        than reimplemented so there is a single definition of what leaving
        means — see Base.astro. */
    __leaveWorld?: () => void;
    /** Kicked off by the head script so it overlaps the entry chunk. */
    __worldManifest?: Promise<{ url: string; bytes: number } | null>;
  }
}

const root = document.documentElement;

/* **Read here, and that is the whole point of reading it here.** §32 drops
   a reader at the station their URL names, and the URL stops naming it
   almost immediately: `url-sync` rewrites the path to whatever section of
   the *document* its observer finds in the middle of the viewport, and
   `projects.ts` moves the document twice — once at import against the
   fallback font and again on `document.fonts.ready`. The world mounts
   somewhere in the middle of all that, behind an adapter request and a
   dynamic import, so by the time it can ask, `/projects/philoi` has become
   whichever section the correction happened to be passing. Measured: a
   deep link to Philoi landing at Homonoia.

   This module is imported synchronously, before the observer's first
   callback, so this is the address the reader actually arrived at. */
const arrived = { hash: location.hash, path: location.pathname };

/* ── The bar ────────────────────────────────────────────────────────────
   Three phases, and the split between them is the one arbitrary number in
   this file: a percentage that spans three different kinds of work has to
   weight them somehow. These are measured — a cold desktop load spends
   roughly ten parts fetching to one starting to three generating — and
   they are constants rather than a fit, so the bar is slower than reality
   in one place and faster in another and never *invented* anywhere. What
   moves inside each phase is a count of real things.

   Nothing interpolates over time. A phase that is done in 4ms flicks past;
   a warm cache jumps straight to FETCH, because the bytes really were
   free. */
const FETCH = 0.70;
const START = 0.80;

const bar = document.querySelector<HTMLElement>('.curtain-bar');
const pct = document.querySelector<HTMLElement>('.curtain-read > b');
const say = document.querySelector<HTMLElement>('.curtain-read > span');

let shown = -1;
function report(at: number, what: string) {
  const whole = Math.max(0, Math.min(100, Math.round(at * 100)));
  if (whole !== shown) {
    shown = whole;
    bar?.style.setProperty('--at', String(whole / 100));
    bar?.setAttribute('aria-valuenow', String(whole));
    if (pct) pct.textContent = whole + '%';
  }
  if (say && say.textContent !== what) say.textContent = what;
  // The phase is the useful half and a bare percentage does not carry it.
  // Not a live region: this changes fifty times on a slow load, and a
  // reader who wants it can reach the bar.
  bar?.setAttribute('aria-valuetext', whole + '%, ' + what);
}

/* Every way out of the world's own load, and there is only one place it
   can go. The stored mode is not touched: a machine that cannot run the
   world has not expressed a preference about it, and writing one here
   would keep a reader in the document after they replaced the laptop. */
function fallBack(why: string, error?: unknown) {
  console.warn('world: not mounted —', why, error ?? '');
  delete root.dataset.mode;
  for (const el of document.querySelectorAll('.site-head, main, .site-foot, .skip')) {
    (el as HTMLElement).inert = false;
  }
  releaseScroll();
}

/* Not `navigator.gpu` on its own. The property exists in browsers that
   cannot hand out an adapter — a machine with no supported GPU, a blocked
   driver, a headless run — and a renderer built on that promise fails after
   the bundle has already been paid for. Asking for the adapter is the only
   honest question, and its answer is the whole tier decision. The head
   script could not ask it: there is no await before first paint. */
async function capable(): Promise<boolean> {
  if (!navigator.gpu) return false;
  try {
    return Boolean(await navigator.gpu.requestAdapter());
  } catch {
    return false;
  }
}

const KiB = (n: number) => Math.round(n / 1024) + ' KiB';

/* ── The download, counted ──────────────────────────────────────────────
   The world is one chunk and `import()` will not tell you how far through
   it is, so the bytes are read here and the import is left to find them in
   the cache. That is the whole trick and it has one condition, which is
   that hashed assets are served immutable — `public/_headers` is where
   that is asserted, and the second request is measured rather than assumed
   (see the report).

   The bar counts **decoded** bytes, because that is what a stream hands
   back; the label names the **wire** figure, because that is what a reader
   on a slow connection is actually waiting for. Neither is derived from
   the other. A build whose manifest is stale — a deploy landing between the
   HTML and this fetch — misses and returns, and the import below downloads
   it the ordinary way with the bar sitting still. */
async function stream(): Promise<void> {
  const manifest = await window.__worldManifest;
  if (!manifest?.url || !manifest.bytes) return;

  const res = await fetch(manifest.url, { credentials: 'same-origin' });
  if (!res.ok || !res.body) return;

  const wire = Number(res.headers.get('content-length')) || 0;
  const label = 'fetching renderer' + (wire ? ' · ' + KiB(wire) : '');
  const reader = res.body.getReader();
  let read = 0;
  report(0, label);
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    read += value.byteLength;
    report(FETCH * Math.min(1, read / manifest.bytes), label);
  }
}

async function boot() {
  /* Held before anything is awaited. The curtain is opaque from the first
     painted frame, and Lenis moves the window itself — a flick during the
     download would scroll a document nobody can see, and on the fallback
     path the reader would arrive in the middle of it. */
  holdScroll();
  report(0, 'starting');

  if (!(await capable())) return fallBack('no adapter');

  try {
    await stream();
  } catch (error) {
    // A failed stream is a slower load, not a failed one.
    console.warn('world: stream skipped', error);
  }

  try {
    report(FETCH, 'starting gpu');
    const { mount } = await import('./world/scene');
    await mount(arrived, (at, what) => report(START + (1 - START) * at, what));
  } catch (error) {
    return fallBack('mount failed', error);
  }
}

/* Everything above is on one condition, and it was answered before paint:
   the capability gate, the URL and the stored mode are all in the head
   script in Base.astro, which is where they have to be — the curtain, the
   escape control and the intro's decision not to arm all depend on the
   answer being on the root in the same frame the browser paints. */
if (root.dataset.mode === 'world') boot();

export {};
