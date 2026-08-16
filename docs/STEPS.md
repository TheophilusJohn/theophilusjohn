# Build steps

One step per session. Start with: `Do step N from docs/STEPS.md.`

Every step ends with: `npm run build` passing, a commit, and a report of
what was measured. If a step can't be completed as written, **stop and say
so** rather than substituting an approach.

Steps 1–15 are done. The site is live. **Update this line at the end of
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

*Done.* The section became a stage to have something worth pinning: the
headline across the top, the lead and the writeup in two columns under it,
one screen tall. A pin holds it while the writeup drifts through the frame
and a rule between the columns fills in `--leader`. Measured at 1512×804:
pin start 780.6, section top −0.4 on both sides of it and constant for the
whole pin, document height 6410 throughout — no jump, no reflow.

The 900px rule is a floor, not the test. A section taller than the viewport
traps its own last paragraph behind the fold exactly the way a phone does,
so the stage is measured and it is all four sections or none — pinning
whichever ones happen to fit reads as a glitch. Measured: all four pin at
1280×800 and above, including 1366×768; below that (1200×800, 1024×768,
1280×720) nothing pins and every section falls back to the stacked reveal,
which is also the whole of the behaviour under 900px. The binding section is
always Homonoia, the longest writeup.

Pins add scroll distance above every section after them, so §7's deep links
re-jump once the page is its final height (measured: `/#philoi`,
`/#basis` and `/projects/enargeia` all land exactly on their pin start).

**Decided here:** `lagSmoothing(0)` from §8 is back on at GSAP's defaults.
Off, a backgrounded tab hands Lenis and every scrub tween the whole elapsed
gap in one tick on return, which is invisible on a marquee and a jump under
a pin. The bands lose nothing they had — they pause off-screen, so their
phase already drifts from the clock that seeded it.

### 12. Page-load intro
Once per session, gated on `sessionStorage`. Under 1400ms. Skipped entirely
under reduced motion. Start on `document.fonts.ready` with an 800ms timeout
fallback — never block content on font load.

**Done when:** CLS under 0.1; second visit in the same session shows no intro.

*Done.* The three beats of §4.1 in one place: bands up already drifting
(0→0.5s), the hero masking up line by line (0.15→1.15s), the header last
(0.8→1.25s). Measured end to end at 1512×804, first load of a session:
**1156ms**, CLS **0**, zero `layout-shift` entries. Second load in the same
session: `data-intro` never appears, the hero is never split, LCP **96ms**
on the plain `h1` — which is also §10's leftover closed. The hold is not a
default any more; it is armed only on a load that is going to use it, so
every other load paints out of the HTML and never waits on the bundle.

`document.fonts.ready` gates the start, with the 800ms fallback measured
from navigation start rather than from the module — a bundle that lands at
900ms has already spent the whole allowance getting there and starts with
no wait. Measured with `fonts.ready` stubbed to never resolve: start at
**805ms**, LCP 840ms.

The head script arms a 2s release in case the bundle never arrives at all;
intro.ts disarms it synchronously at import, so nothing but a real failure
reaches it. Measured with the module scripts pointed at a 404: hold off at
**2039ms**, everything visible, and the session flag left unset so the next
navigation still gets its intro. That flag is written by intro.ts when the
sequence really starts, not by the head script that reads it, for exactly
that reason.

Motion off mid-flight lands everything on its final state and reverts the
split — measured at 539ms into the sequence, and at 337ms during the hold
(fonts stalled), where the hold comes off early and the queued start finds
the door shut rather than replaying.

### 13. Custom cursor
Only on `(pointer: fine)`. `quickTo()`, not per-frame `set()`. Not
initialised at all under reduced motion.

**Done when:** touch devices unaffected; native cursor never hidden over
text inputs without a visible substitute.

*Done.* A paper dot, a ring that opens over a project, `--leader` over a
link. The spec says amber over links; §2 moved the accent off amber to
lavender, and §5 already names a live link as one of the two things
`--leader` is allowed to mean, so it is the same rule, not an exception.

Both gates hold before anything is built: the element is created in
cursor.ts rather than shipped in the markup, so a touch device carries no
node, no listener and no rule that could hide its cursor, and under
`[data-motion="off"]` there is nothing to tear down because nothing was
made. Measured: with `(pointer: fine)` stubbed false and the module
re-imported, it builds nothing; the motion toggle removes the element and
the root attribute together and rebuilds on the way back, in both
directions, mid-session.

The native cursor goes only from the first real mouse move — before that
the pointer may never have entered the window, and the page would simply
have no cursor at all — and comes back over `input`, `textarea`, `select`
and `contenteditable`, where a dot says nothing about where a caret would
land and the dot is hidden to match. Measured on an injected field:
`cursor: auto` on the input, `none` on the body, the link and the toggles.

**Trap, measured:** a component's own `cursor` beats a global rule. Astro
compiles scoped styles with its own attribute on every selector, so
`button { cursor: pointer }` inside Toggles.astro outranks
`html[data-cursor] *` and the native hand stayed under the dot. The hide
rule is `!important` for the same reason the motion block is: it is one
decision about the whole page and no component may opt out of it.

Non-touch pointer events are filtered by `pointerType`, so a finger on a
hybrid cannot strand the dot where the last tap was; leaving the window
hides it, and the first move back teleports rather than flying in, using
quickTo's start argument.

Follow: `quickTo` per axis, `power3`, 0.15s. GSAP's `power3` is quartic, so
one 60fps frame closes 37.6% of the gap — a steady trail of **22.2px** at
800px/s and **55.4px** at 2000px/s, settling to within 1px **150ms** after
the pointer stops, which is where clicks happen. Those come from GSAP's own
ease function rather than from a live sweep: Chrome reported the tab
`hidden` for the whole session (occluded window, `hasFocus()` true and rAF
never firing), and per the trap in CLAUDE.md a timing read in that state is
frozen rather than wrong in a visible way. **Not yet observed live.**

Cost: **+505 bytes** gzipped of JS (55.1KB total, desktop) and +347 bytes
of CSS. The module ships on mobile and never runs there.

### 14. Budget and accessibility pass
Lighthouse accessibility 100. Keyboard reach and visible focus on everything.
Usable at 360px with motion off.

**Report:** measured JS gzipped, LCP, CLS, draw calls.

*Done.* Lighthouse 12.8.2, headless, against `astro preview` of the real
build. Accessibility **100** on both profiles — mobile 360×640 and the
desktop preset — and axe-core direct on the page reports **0 violations**
in all four states (default and high contrast, motion on and off), on the
JS-off markup of `/`, `/projects/enargeia/` and `/404.html` as well.

| | mobile 360×640, 4G | desktop 1350×940 |
|---|---|---|
| Accessibility | 100 | 100 |
| Performance | 99 | 100 |
| LCP | 2.0s | 0.4s |
| CLS | 0 (0 shift entries) | 0 (0 shift entries) |
| TBT | 0ms | 0ms |

Homepage JS **55,139 bytes gzipped (53.8KB)** — three chunks, unchanged by
this step, and the same on both profiles since nothing is conditionally
loaded yet. That is 45% of the mobile budget and 21% of the desktop one.
CSS 1,946 gzipped (+18 bytes here), document 6,633. **Draw calls: 0** —
there is no WebGL context on the site until §15.

**The one thing that failed was one token.** `--dim` at `#4A4470` is
2.07:1 on `--void`, and every one of the 100 axe violations was that
colour: the whole primary nav, both section headings, the period, the
stack, the metric labels, the footer, and the log bands. §5 calls `--dim`
texture that carries nothing said elsewhere, which was true of the bands
and of nothing else it had been put on. Lifted to `#8780B2` — same hue and
saturation, lightness only, **5.07:1** — and the high-contrast value with
it, from 5.65:1 to **7.42:1**, because a toggle that moves contrast by half
a point looks broken. The bands are legible now rather than a grey blur;
that is the visible cost of the fix and it is the whole of it.

Keyboard, walked with real `Tab` presses in a foreground headless browser
rather than scripted `.focus()`: **13 focusables, all reachable in DOM
order, all with a ring** (`solid 2px --leader`, 3px offset, 7.65:1 on
`--void`), all scrolled fully into view when focused — including the three
`Live` links inside **pinned** sections, where the pin and the browser's
focus scroll could have fought. The 14th Tab leaves the document, so
nothing traps. Skip link: first Tab reveals it at 16,16; Enter lands focus
on `main#main` with no ring, and the next Tab is the first link in the
content. Both toggles operate on Enter and Space and move attribute,
`aria-pressed`, storage and tokens together.

At **360px with motion off**: zero horizontal overflow, document 6,115px,
no pins, everything readable. Tap targets were the gap — the toggles were
44px from §13 and everything else was 13–18px tall, under WCAG 2.2's 24px
minimum. The nav links, the wordmark and each project's `Live`/`Source`
now grow their box to 44px under the same 640px breakpoint the toggles
already use; the ink does not move. `Resume (PDF)` and the footer pair are
inline in a sentence and keep the exception.

**Two things left open, both Theo's call, neither introduced here:**

1. `/theo-john-resume.pdf` does not exist. The header nav and the about
   section both link to it and both 404. Nothing to write there for you.
2. At 360px the hero overflows the gutter by ~34px and cuts *Theophilus*
   to *Theophilu*. `--t-hero` resolves to 64.8px there (18vw, above the
   4rem floor) against 320px of content width. The bleed is deliberate
   everywhere else — at 1512px the word lands exactly on the right edge —
   but at phone width it eats a letter of the name. Fixing it means
   changing the curve, not the floor: the floor never binds. `clamp(3.5rem,
   16vw, 16rem)` fits (57.6px, 315px of ink) at the cost of ~14px off the
   desktop hero. Left alone, because the type scale is the design.

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

*Done.* One `Renderer` on a `WebGPUBackend`, built detached and prepended to
`body` only once there is a frame in it, then never touched again. Three
pinned at **0.185.1**. Measured across the whole page top to bottom and
back: same renderer object, **1 canvas, 0 inserts, 0 removals, 0 context
losses**, and the composited frame never blanks. §4.6 already made this
free — there is no navigation to survive — so what had to be proved instead
is that the state is a function of *position*: `/projects/philoi` loaded
directly lands on Philoi's uniforms with no transition, because the first
section this module is told about is applied with `gsap.set` and only later
ones tween.

**The field is the cluster.** Five attractors are Homonoia's five nodes;
each particle is one message, emitted at its sender and consumed at the node
it is addressed to, `--leader` if that node is the elected one and `--rule`
if not — the accent means *elected* here in the same sense §5 already fixed.
A section sets how the cluster behaves rather than what it looks like:
`leaderMix` is the share of traffic addressed to the leader, `nodes` how
many are participating, plus speed, pull, swirl, jitter, spread. Under
Homonoia `leaderMix` is 1.0 and the **term ends every 3.4s** — measured 4
changes in 12s, never re-electing the incumbent — and the whole field
redirects mid-flight. Philoi is two emitters converging on one; Basis is
three nodes near-still; Enargeia routes almost nothing to a leader and lets
the noise term carry it. `onSection` is a new export from url-sync, so
"which range is this" is still computed once and the URL and the field read
the same answer.

**Two tiers, not three, and that was the budget's call.** The static WebGL 2
tier was built and measured — the same five nodes with the journey as a
quadratic Bézier in the vertex shader, since that backend has no compute
pass — and does not ship. `three/webgpu` is a single module, so no bundler
can split the two backends into separate chunks: carrying both costs every
desktop load **23.1KB gzipped** and puts the page at **272.4 KiB** against a
hard 260. WebGPU only is **249.5 KiB**. §4.7 says the site is complete at
the bottom tier, so a browser without WebGPU now gets the document, which is
the whole site. Not naming `WebGPURenderer` is what does it — that class is
the WebGL fallback's only importer. `BasicNodeLibrary` over the standard one
is a further **8.0KB**, and keeps the lights §4.4 will need.

| | gzipped | budget |
|---|---|---|
| Mobile / no-WebGPU (eager only) | **55,872** (54.6 KiB) | 120 KiB |
| Desktop (eager + scene chunk) | **255,508** (249.5 KiB) | 260 KiB, 10.5 KiB spare |
| — scene chunk alone | 199,636 | |
| CSS 1,989 · document 6,625 | | |

**Draw calls: 2.** One instanced sprite of 120,000 (240,000 triangles) and
the renderer's own output blit. 1 scene object, 2 geometries, 2 textures,
120 fps on an M-series GPU (vsync). Points are not an option: WebGPU only
supports 1px point primitives, so sized particles are a `Sprite` with
`count`, which also means `frustumCulled = false` — the bounding sphere it
computes is the unit quad at the origin and would cull the entire field.

**Brightness is measured, not chosen.** §4.7 says text is measured against
the busiest frame the scene can produce, and additive blending has no
ceiling: the first working version peaked at **pure white** under Homonoia.
The bound, stated so it can be checked: the brightest **12×12 average** the
field draws anywhere on the page never exceeds `--void-lift`. A glyph-sized
local mean because that is the background a piece of text actually sits on,
and `--void-lift` because the palette already names that level "raised". At
that bound, walked over all six sections with the document peeled away:

| | worst 12×12 | `--paper` | `--muted` | `--dim` |
|---|---|---|---|---|
| glyph scale (the bound) | 0.01160 = `--void-lift` | 14.42 | 5.93 | **4.68** |
| single brightest pixel | 0.02050 | 12.60 | 5.19 | 4.09 |

Per section the worst runs 0.0098–0.0116, so no section is the loud one.
Getting there took three structural fixes, not just a lower alpha: messages
launch *toward* their receiver rather than from rest (five nodes each wore a
cloud before that); the tangential force is signed per particle, which fans
a route into a braid instead of one saturated tube; and particles fade over
the last 2.6 units of the journey, where a funnel would otherwise converge
on a point. Brightness is expressed as **total ink over the particle count**,
so halving the count below 1024px is a quality setting and not a change to
the page. High contrast takes the field to **0.45×** — it sits under every
word, so the toggle has to move the busiest frame, and only downward.

**Everything else, measured.** Canvas inserted at **128ms**, first frame at
129ms; LCP **76ms**, CLS **0**, zero shift entries. Lighthouse 12.8.2 against
`astro preview` of the real build: desktop **accessibility 100, performance
100**, LCP 0.6s, CLS 0, TBT 0ms with the scene chunk loaded; mobile 360×640
**100 / 99**, LCP 2.0s, and the chunk never requested. axe-core **0
violations** in all four states with the canvas present. 13 focusables,
unchanged — the canvas is `aria-hidden`, `pointer-events: none` and carries
no node the keyboard can reach. DPR capped at 1.5 (verified 1→1, 2→1.5,
3→1.5). Motion off: **0 frames rendered**, canvas kept, two screenshots 2s
apart byte-identical, and the still frame is the field run forward 8s rather
than five dots at five nodes. Backgrounded: **0 frames**, resumes on return.
Both reasons to pause are held separately, or a tab backgrounded with motion
off wakes up running.

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
