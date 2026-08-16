# Build steps

One step per session. Start with: `Do step N from docs/STEPS.md.`

Every step ends with: `npm run build` passing, a commit, and a report of
what was measured. If a step can't be completed as written, **stop and say
so** rather than substituting an approach.

Steps 1–10 are done. The site is live. **Update this line at the end of
every step** — a stale marker in the file each session opens with is worse
than no marker.

---

## Document mode

### 5. Self-host fonts
**Scope:** fonts only. No layout changes.

- **Archivo, variable, with the `wdth` axis.** Used at 110 (body) and 125
  (hero). A static instance is not acceptable — verify the axis exists in
  the file you produce.
- IBM Plex Mono, weight 400 only.
- Subset Latin + punctuation, output woff2 to `public/fonts/`.
- `@font-face` with `font-display: swap`. Preload Archivo only, not the mono.
- Don't change `--font-display` or `--font-mono` — they already name these.

**Done when:** no requests to `fonts.googleapis.com` or `fonts.gstatic.com`;
the `h1` on `/` visibly wider at 125 than at 110; total woff2 under 100KB.
**Report:** file sizes, `wdth` axis range.
**Stop if:** you can't find a source with the width axis. Ask, don't substitute.

### 6. Write the four writeups
**Scope:** MDX bodies only. No code.

Four beats each, in order: **constraint** (what was actually hard — not
"I wanted to learn X"), **decisions** (two or three, each with the rejected
alternative and why), **result** (quantified — no adjective doing a number's
job), **what I'd change** (specific and honest).

First person, past tense, plain verbs. Enargeia first — it leads.

**This step is Theo writing, not you.** Your job is to interview, push for
specifics, and flag where a claim needs a number. Do not invent metrics.

**Done when:** all four have real content in all four sections, and every
`metrics` entry in frontmatter is a real measured figure.

### 7. Collapse to one page
**Do this before any motion work.** Every step after this builds on the page
structure — collapsing later means doing the motion work twice.

All content moves to `/`: hero, four projects, about. No `<ClientRouter />`,
no route changes, no View Transitions.

Deep links must still work, via the History API rather than routes:
- Scrolling a project section past a threshold → `history.replaceState` to
  `/projects/enargeia`. **`replaceState`, not `push`** — pushing on scroll
  floods the back stack and kills the back button.
- Loading `/projects/enargeia` directly lands at that section without
  animating from the top.
- `popstate` moves to the matching section.

Keep `getStaticPaths` emitting a real page per project, so those URLs resolve
on Cloudflare, stay crawlable, and work with JS off.

**Done when:** all content reachable by scrolling `/`; each project URL loads
directly and lands in the right place; back button behaves after scrolling
the whole page; `npm run build` still emits the four project pages.

### 8. Lenis + ScrollTrigger wiring, log band drift
```js
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```
Log band content comes from Homonoia's simulation output shape — real term
numbers, real state transitions. Not lorem, not decorative binary.

**Done when:** drift stops entirely under `[data-motion="off"]`.

### 9. Both toggles, verified
Already scaffolded in `src/components/Toggles.astro`. Audit rather than rebuild.

**Done when:** state survives refresh; no flash on load; contrast mode hits
7:1 on `--muted` and 4.5:1 on `--dim` against `--void` (measure, don't
eyeball); `[data-motion="off"]` set from OS preference when no stored value.

### 10. Hero type reveal
GSAP SplitText, masked line reveal out of an `overflow: hidden` clip.

**Done when:** VoiceOver reads the hero as a sentence, not character
fragments. Test it, don't assume SplitText handles it.

*Done.* Lines, not characters. The `h1` splits and each line rises out of
its mask; the sub is not display type, so it rises as one block from a
wrapper — which also keeps SplitText's `aria-label` off a `<p>`, where ARIA
prohibits it. Masks clip on the travel axis only (`visible clip`) so the
hero still bleeds right. Held pre-paint by `data-hero` off the head script,
uncovered by the module. **Left for step 12:** the hold moves LCP behind
the JS bundle, and the reveal is not yet gated on `sessionStorage` or
`document.fonts.ready`.

### 11. Pinned project sections
`pin: true`, `scrub: 1`, `anticipatePin: 1`. Disable pinning below 900px —
falls back to a stacked reveal.

**Done when:** no jump at pin start; scroll never traps on mobile.

### 12. Page-load intro
Once per session, gated on `sessionStorage`. Under 1400ms. Skipped entirely
under reduced motion. Start on `document.fonts.ready` with an 800ms timeout
fallback — never block content on font load.

**Done when:** CLS under 0.1; second visit in the same session shows no intro.

### 13. Custom cursor
Only on `(pointer: fine)`. `quickTo()`, not per-frame `set()`. Not
initialised at all under reduced motion.

**Done when:** touch devices unaffected; native cursor never hidden over
text inputs without a visible substitute.

### 14. Budget and accessibility pass
Lighthouse accessibility 100. Keyboard reach and visible focus on everything.
Usable at 360px with motion off.

**Report:** measured JS gzipped, LCP, CLS, draw calls.

---

## ▲ Ship here.

Steps 1–14 are a complete portfolio. Everything below is a second project
layered on a finished one. Do not begin 15 until 14 is deployed and verified
in production.

---

## World mode

### 15. Persistent scene
One `WebGPURenderer`, mounted once, never unmounted. Survives View
Transitions — mount outside the transition root or `transition:persist`.
Compute-driven particle field, state driven by the section in view.

Three tiers: full compute → reduced static shader → no canvas. Site complete
at the bottom tier.

**Done when:** navigating between all four projects never resets or flashes
the canvas.

### 16. The laptop
Primitives only — no GLTF, no loader, no Draco. Geometry inside the scene
from 15, not a new canvas. Terminal on the screen via `CanvasTexture`,
updated at ~8fps. Log lines duplicated into a visually-hidden `<pre>` for
screen readers.

**Done when:** particles depth-test correctly against the lid; a focusable
DOM element over the laptop routes to Homonoia by keyboard.

### 17. Depth and camera spline
`CatmullRomCurve3`. Scroll maps to distance along it, driven by the same
Lenis instance — one scroll authority.

### 18. Landmarks
Four structures, one per project, in `order`. Three states: distant
(silhouette), approaching (label + machine ID resolve), arrived (writeup
opens in DOM). Laptop is landmark one.

**Design work not yet done:** what the four structures actually *are*.
Ask before modelling.

### 19. Mode switch and URL sync
Arriving at a landmark pushes its route. Loading that route in world mode
flies the camera there. Both directions.

**Done when:** deep links work, browser back works, `Esc` returns to path,
mode switch reachable by keyboard from anywhere.

### 20. Free flight
Unlocks at the fourth landmark or via a control. Bounded volume. Always-
visible return-to-path control.

### 21. Performance pass
Instancing, LOD, frustum culling. 60fps on integrated graphics.
**Report:** draw calls, frame time, particle count.
