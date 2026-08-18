/* §4.6 — the site is one document, so a "page" is a scroll range.
   This keeps the address bar honest about which range you are in, and
   makes in-page links behave like navigation without ever leaving `/`.

   replaceState only. pushState on scroll would add an entry per section
   crossed and make the back button useless. */

import { jumpTo, jumpToTop } from './motion';

const sections = Array.from(
  document.querySelectorAll<HTMLElement>('[data-path]'),
);

const order = new Map(sections.map((s, i) => [s, i]));
const byPath = new Map<string, HTMLElement>();
for (const s of sections) byPath.set(s.dataset.path!, s);

const norm = (p: string) => p.replace(/\/+$/, '') || '/';

/* The subscriber list this used to keep is gone with §21. It existed so
   the render layer could ask which range of the page the reader was in
   without measuring the document a second time; the world is not driven by
   scroll position any more (§0.3), so there is nobody to tell. */
let current: string | null = null;
function setPath(path: string) {
  if (path === current) return;
  current = path;
  /* The query survives. `?doc` is §0.1's own opt-out and `?world` is §21's
     interim way in; a bare pathname here silently drops whichever one the
     reader arrived with, on the first scroll, and the next reload lands in
     the other mode. */
  history.replaceState(history.state, '', path + location.search);
}

/* A 10vh band across the middle of the viewport. Sections tile the page
   and every one is taller than the band, so at most one straddles it. */
const active = new Set<HTMLElement>();

function sync() {
  if (active.size === 0) return; // in a gap: keep the last known section
  const deepest = Array.from(active).sort(
    (a, b) => order.get(a)! - order.get(b)!,
  )[active.size - 1];
  setPath(deepest.dataset.path!);
}

const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) active.add(e.target as HTMLElement);
    else active.delete(e.target as HTMLElement);
  }
  sync();
}, { rootMargin: '-45% 0px -45% 0px' });
for (const s of sections) io.observe(s);

function goTo(el: HTMLElement | null) {
  if (!el) {
    jumpToTop();
    return;
  }
  jumpTo(el);
  // preventDefault below costs us the focus move a real hash link performs.
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

/* Links to `/` resolve against the *displayed* path, which is now
   /projects/… mid-page. Without this, the header nav would reload.
   This one pushes: it is a deliberate navigation, not a scroll, so back
   should return you. The observer's replaceState then rewrites the
   pushed entry to the range you actually landed in. */
addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const a = (event.target as Element | null)?.closest?.('a[href]');
  if (!(a instanceof HTMLAnchorElement)) return;
  if (a.target && a.target !== '_self') return;
  if (a.hasAttribute('download')) return;

  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || norm(url.pathname) !== '/') return;

  /* **A link that changes the query is changing the mode, not the range**
     (§33). Every path on this site normalises to `/`, so without this the
     handler below swallows `/?world` and `/?doc` as well: it calls
     preventDefault, pushes the new address and scrolls the document it is
     already in. The address bar then says `?world` on a page that is still
     document mode — and it cannot be otherwise, because the mode is
     decided in a head script and a pushState does not run one.
     Measured: the header's way back into the world changed the URL and
     nothing else, in the same document, three navigations in a row. */
  if (url.search && url.search !== location.search) return;

  event.preventDefault();
  history.pushState(null, '', url.pathname + (url.search || location.search) + url.hash);
  current = null;
  goTo(url.hash ? document.getElementById(url.hash.slice(1)) : null);
  requestAnimationFrame(() => requestAnimationFrame(sync));
});

addEventListener('popstate', () => {
  const el =
    byPath.get(norm(location.pathname)) ??
    (location.hash ? document.getElementById(location.hash.slice(1)) : null);
  if (el) {
    current = el.dataset.path ?? null;
    jumpTo(el);
  }
});

export {};
