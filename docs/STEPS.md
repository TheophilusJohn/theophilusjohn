# Build steps

One step per session. Start with: `Do step N from docs/STEPS.md.`

Every step ends with: `npm run build` passing, a commit, and a report of
what was measured. If a step can't be completed as written, **stop and say
so** rather than substituting an approach.

Steps 1–17 are done. The site is live. **Update this line at the end of
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

**Superseded in part by §17:** the stage is three beats now, so what gets
measured against `innerHeight` is the tallest beat rather than the whole
section. All-or-none stands; the numbers above were the two-column stage's.

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

Steps 1–14 are the portfolio, and they stand entirely on their own: every
fact, every writeup, every link, reachable by scrolling one page with no
GPU involved. Everything below this line is world mode — a second project
layered on a finished one, and atmosphere rather than information.

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

### 16. Terrain
**The step that changes the site more than 8–14 combined.** Do it, ship it,
and look at it before committing to the rest. See SPEC §4.7.

Analytic heightfield first — node peaks and route ridges, closed-form off
the uniforms already in `scene.ts`, evaluated in the vertex shader. No
storage, no warm-up. Particle ground on a camera-relative grid, radial
density falling as `1/r`, 200k at the compute tier and halved below 1024px.
Horizon arc in `--rule`, one pixel, the only non-particle geometry there is.

The election is the point: under Homonoia the amplitudes retarget every
3.4s and the landscape redistributes over ~2s of eased transition. Tween
the amplitudes, never snap them.

**Done when:** the ground is visibly the cluster — raising `leaderMix` grows
ridges toward one summit — and a term ending rearranges it without a jump.
**Report:** ms/frame with `info.autoReset = false`, ground count, draw calls.

*Done.* **The pentagon had to lie down first.** It was upright and facing
the camera because the world was a volume with nothing in it; a cluster
standing over a landscape is a ring on the ground plane, so the same five
nodes — same 5.3 units to a side, same spacing the simulation was tuned
against — turned through 90° and went up to altitude 9, with the terrain
rising underneath them. The swirl axis went with it: taken against the view
axis, half the traffic now curved down through the floor, so it is taken
against world up and the routes braid across the ground instead.

`h(p)` is five peaks and ten ridges, unrolled over constant geometry before
the shader is built, so the endpoints, directions and segment lengths are
numbers in it and only the amplitudes are uniforms. Three taps per ground
point — the height, and two more 0.9 units out for the slope the scree
jitter rides on. No storage, no warm-up, identical on the first frame and
the thousandth.

**The amplitudes are the cluster, not a shape.** `shares()` runs the compute
pass's own routing rule over the whole population on the CPU: each
participating node emits an equal share, `leaderMix` of it to the leader and
the rest to its neighbour, and nobody addresses themselves. Peaks are what a
node receives, ridges are what a route carries, and they sum to 1 — so a
section cannot raise the whole world by accident, and `PEAK`/`RIDGE` are the
only scale. Under Homonoia that is 0.80 on the leader and 0.20 on the node
it writes to: one mountain. Under Enargeia it is five hills between 0.13 and
0.28: a range. [Corrected at §17 — this line said "under the hero", and the
hero has never been the flat one: `shares(5, 0.35, 0)` is 0.41/0.20/0.13/
0.13/0.13.] Ground belonging to the elected node is `--leader`, weighted
by height so the plains stay `--rule` rather than taking an accent from a
share of nearly nothing — the same rule §2 fixes and the traffic above it
already follows.

**The election, measured.** 12 seconds at Homonoia, sampled every frame:
**4 term changes** (3.4s term), the summit moving 1→0→3→0, and the largest
single-frame amplitude step anywhere in it is **0.0129** — about what a 2s
eased tween covers in 16ms. It flows; it never snaps. Deep-linked to
`/projects/homonoia` the amplitudes are **0.8 0.2 0 0 0 on the first ready
frame**, sum 1.00, because the first section the module hears about lands
with `gsap.set`. The landscape is a function of position, not of how long
the page has been open.

| | 1512×804 | 1000×800 |
|---|---|---|
| ground | 300,000 | 150,000 |
| field | 120,000 | 60,000 |
| draw calls | **4** | 4 |
| triangles | 840,001 | 420,001 |
| render pass | **2.50 ms** (2.39–2.95) | 1.12 ms |

Draw calls are ground, the horizon arc, the field, and the renderer's blit.
ms/frame is a batch of 20 renders between two `queue.onSubmittedWorkDone()`
with the site's own loop stopped — `renderer.info`'s timestamp queries were
tried first and are in CLAUDE.md as a trap, not as a number. At DPR 1.5
(framebuffer 2268×1206) the same frame is **2.32 ms**, no worse than at DPR
1: 420k instanced quads of 1.4–2 px are vertex-bound, not fill-bound. The
compute pass is untouched from §15.

**Count was the wrong knob; radius was the right one.** §4.7's 200,000 said
to measure it. At the disc radius the world started with (92) the massif was
an island in an empty plain and the ground never read as a surface at all —
the visible wedge of a camera-relative disc is about a quarter of it, and
spread over that much ground the points are further apart than the eye can
join. Radius 42 puts the same points on a quarter of the area. 300,000 is
what closed the rest of the gap, and it costs 1.6 ms of the 2.50.

**Brightness: the bound holds, and it moved the whole layer.** Sampled 16
frames per section 350 ms apart, document peeled away, brightest 12×12 mean
in relative luminance:

| | worst 12×12 | vs `--void-lift` | `--paper` | `--muted` | `--dim` |
|---|---|---|---|---|---|
| hero / about / basis / enargeia | 0.0076–0.0095 | 0.65–0.82× | | | |
| philoi | 0.01064 | 0.92× | | | |
| **homonoia** (binds) | **0.01154** | **0.994×** | 14.43 | 5.94 | **4.68** |
| homonoia, high contrast | 0.00791 | 0.68× | 15.34 | 6.31 | 7.28¹ |

¹ against high contrast's own `--dim`, `#A5A0C5`.

The busiest frame is mid-election, where two mountains are up and 120k
messages are redirecting at once. Total ink is now **88 for the field and
6,800 for the ground** — the field's 696 was tuned when the cluster filled
the frame at 9 units away and it is 18.5 units away now, so the same ink
landed 5× over the bound in a third of the area.

**One thing that failed here was §15's, and it was invisible until the
ground arrived.** The scene read `--leader` and `--rule` once at mount and
scaled by 0.45 for high contrast — so a page *toggled* into high contrast
got the darker palette dimmed, and a page *loaded* in it got the brighter
one (high contrast lifts `--rule` from `#2A2640` to `#4A4470`, 2.6× the
luminance) dimmed by the same number. Measured on the loaded path: **0.92×
against 0.90× normal**, i.e. the legibility toggle was not moving the
busiest frame at all. Both tokens are uniforms now, re-read on every change,
so the two paths are the same page, and the factor is 0.20, measured to land
the loudest section at 0.68×. A frozen frame repaints on the change, because
a palette that moved makes it stale rather than still.

**Everything else, checked.** Motion off: canvas kept, two frames 2s apart
**byte-identical**, and the still frame has the landscape in it. Resize
1512×804 → 1000×700: framebuffer follows, counts do not (the scene never
reinitialises). 900px: ground 150k, field 60k. 360px: no canvas at all.
Bundle **54.6 KiB eager / 251.6 KiB desktop** against 120 and 260 — the
terrain, the arc and `LineBasicNodeMaterial` cost **2.1 KiB gzipped**, and
8.4 KiB of the desktop budget is left.

**Left for §18, deliberately:** the camera is one fixed pose (25° down, 18.5
units back) and not the altitude curve — §18 owns that, and the ground's
distance falloff here is a stand-in for the fog it owns too. The ground disc
is camera-relative per §4.7, so it *slides* over the terrain when the camera
moves; nothing moves yet, and whether that reads as texture swimming is a
question for the first session where the camera does.

### 17. The three-beat stage, the scrim, re-scoped brightness
**The step that makes room for the world.** §16 shipped a terrain that is
correct, measured and invisible, and only half of that was brightness — the
other half is that every viewport is full of words. See SPEC §4.3.

One pinned section becomes a scrubbed timeline through three beats: machine
ID and headline; headline demoted to a mono label plus the metric strip;
then the writeup in a ~45ch column on the left, behind a scrim. `end:
'+=220%'`, beats at roughly 0–35 / 35–65 / 65–100%. Cross-fade and a short
vertical translate between them, masked like §4.2 — never a hard cut under
a scrub. The headline is the only thing that persists across all three.

The scrim is a horizontal gradient, `--void` at 92% to transparent by ~60%
of the viewport width. No edge, no border, no radius.

Brightness stops being one number for the whole frame: `--void-lift` inside
the scrim, 2× behind beats 1–2 and the header, no ceiling elsewhere. Sample
**per region**. Re-solve the ink — §16's figures were fitted to the global
bound and do not scale. Give the hero a dominant peak (~0.45 on one node)
while you are in there; the even five-hill preset is the flattest thing
`h(p)` can draw and it is the first screen anyone sees.

Two consequences of a page that is ~3× longer: the URL sync threshold moves
to beat 1's arrival, and deep links land at beat 1. The fit rule from §11
now measures the tallest **beat**, not the section — verify 1280×720, which
failed the old rule.

**Done when:** beats 1 and 2 leave most of the viewport to the world; the
scrubbed transitions blend rather than cut; deep links and the address bar
still agree; nothing pins that cannot hold its own tail on screen.
**Report:** per-region 12×12 worst case against each bound, pin lengths and
document height before/after, the viewports that pin.

*Done.* The stage is three beats, layered rather than stacked, and the page
went from **4,909px to 11,559px** at 1512×804 — the tripling §4.3 says is
the price of a world. Pin `+=220%` (1,769px each), `scrub: 1`,
`anticipatePin: 1`, section top constant at 0.1 for the whole pin and
document height constant throughout: no jump, no reflow.

**The headline is two elements, and that is the one place the spec could
not be taken literally.** It has to cross a size *and* a typeface between
beat 1 and beat 2, and one element cannot do that under a scrub without a
hard cut somewhere in the middle, which §4.3 forbids. So the `<h3>` stays
the heading and a mono `<p aria-hidden>` carries the label, cross-fading in
place. Assistive tech sees exactly one heading at every beat; the label is
`display: none` entirely outside the beats, so no stacked layout has the
text twice. Measured: **0 visible labels** at 360×640, at 1280×720 and with
motion off.

**Linear on the cross-fades, and that is a requirement rather than the
scrub convention.** `power2.in` leaving against `power2.out` arriving holds
*both* beats at 0.88 through the middle of the handover — a double exposure
of the headline over its own label — and swapping the pair dips the sum to
0.25, which is a blink. With `ease: 'none'` the opacity sum is **1.000 at
every sample** across both handovers.

**The fit rule was being answered with the wrong fonts.** `document.fonts.
status` is `"loading"` when this module runs, so every height it measured
belonged to the fallback face, and nothing ever re-asked. At 1366×768 that
was the difference between pinning and not — Archivo needs 784px of the
768 available for the fallback's answer. The decision now runs again on
`document.fonts.ready` (no timeout guard, unlike §12: this gates an
enhancement, not content). Measured, tallest beat vs viewport:

| | 1512×804 | 1366×768 | 1280×800 | 1200×800 | 1024×768 | 1280×720 | 1152×720 |
|---|---|---|---|---|---|---|---|
| homonoia needs | 784 | 784 | 784 | 784 | 784 | 760 | 760 |
| pins | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |

§11 pinned at 1280×800 and above; the beats add **1200×800 and 1024×768**.
**1280×720 still does not fit** — 760 against 720 — so it keeps the stacked
fallback. §4.3 asked for it to be verified, not for it to pass, and closing
40px means widening the 45ch column, which spends the room this step exists
to make. Homonoia binds at every width, as it did at §11. While pinned, the
last line of the writeup clears the fold by **32px** at 768 and **58px** at
804; nothing lands below it.

**Two bugs, both from the same fact: a pinned element reports `top: 0` for
the entire length of its pin.** At `+=60%` that was under a screen of
error, at `+=220%` it is nine tenths of a section.
- `jumpTo` on a pinned section resolves to the scroll position it was
  given, so the deep-link re-jump was a no-op. Measured:
  `/projects/homonoia` arriving at **beat 2**. It asks the trigger for its
  start now. All four deep links land at beat 1: `/#philoi`, `/#basis`,
  `/projects/enargeia`, `/projects/homonoia` — each at its pin start with
  the headline at opacity 1.
- `keepingPlace` read the same frozen 0, so the motion toggle and the
  resize path lost the reader's position inside the pin. Both go through
  one `offsetOf()` that uses the trigger's start while pinned. Round trips
  now **hold the beat**: motion off at beat 2 → on again lands at beat 2,
  and 1512×804 → 1200×720 → back does too. Previously both returned to
  beat 1, and a resize was measured 1003px short.

**The URL threshold needed no change.** §4.3 predicted the address bar
would lag; measured, it leads — the `-45%` band hands over ~500px *before*
the pin starts, which is beat 1 arriving rather than the section's
midpoint. Left alone.

**Brightness: the bound is local now, and the arithmetic behind it was
wrong in the revision.** The harness measures every text element on the
page against the brightest 12×12 the scene draws *inside that element's own
box* — **197 elements** over 14 stops, document peeled, scrim kept where
beat 3 needs it. Two corrections fell out of it:

- **`2× --void-lift` was never available.** It puts `--dim` at **4.1:1**,
  under AA. `--dim` tolerates **1.21×** and no more, and it is on screen at
  every scroll position on this page — header nav, the period row, metric
  labels, log bands. Per-stop headroom ran 1.50× to 2.06× and *every* stop
  was bound by the same 10px `--dim`, which is also why the ink is still
  one uniform and not a function of the beat.
- **Ink scales the scene's contribution, not the backdrop.** `--void` is
  under every pixel and does not move. Solving on totals understated the
  headroom by about half; a first pass shipped 1.45× on that arithmetic and
  the re-measure caught it.

Solved: field ink **88 → 221**, ground **5,800 → 14,500**, both **2.5×** and
keeping §16's balance. The binding element is Philoi's `stack` line at beat
2 — backdrop 0.01329 = `--void` 0.00680 + scene 0.00649, against 0.00650
allowed at 4.55:1. Re-run after the change: **scale by 1.002×**, i.e. at
the ceiling. **0 of 197 elements fail** in either contrast mode.

Where the local bound does pay is exactly where §4.3 said it would, and the
page cannot spend it: beats 1 and 3 have only `--paper` display type in
front of the scene and measure **23× to 223×** of headroom, against 1.1× at
beat 2. Spending that is a scroll-varying alpha, which is a mechanism and
not a number — noted for §18, which changes what is in frame anyway.

High contrast still moves the busiest frame down and only down: scene
contribution **0.00196 against 0.00649**, 0.30×, and 18× of headroom.

The scrim is solid to 60% of its own width — 539px against the 524px the
45ch column ends at, because the bound applies where the text is and the
first version left the column's right third sitting in the fade.

**Everything else, checked.** axe-core **0 violations** in all four states
at 1512×804 and at 360×640 — eight runs. **13 focusables**, unchanged from
§14, all reachable, all ringed, and the 14th Tab leaves the document. A
`Live` link inside a transparent beat takes its own beat's scroll position
on focus and is fully opaque **1,020ms** later, which is `scrub: 1` catching
up; it is on screen the whole time. LCP **76ms** desktop / **60ms** mobile,
CLS **0** with **zero shift entries** on both, despite `decide()` now running
twice per load. 360px: no beats, no horizontal overflow. Bundle **55.1 KiB
eager / 252.0 KiB desktop** against 120 and 260, 8.0 KiB spare; CSS 3,001
(+1,012 for the stage and the scrim), document 6,169. Draw calls and
ms/frame are §16's — no scene object was added or removed, and the scrim is
CSS.

**The hero preset, and a correction to §16's report.** §16 recorded the hero
as "five hills between 0.13 and 0.28"; those are Enargeia's numbers.
`shares(5, 0.35, 0)` is **0.41 / 0.20 / 0.13 / 0.13 / 0.13** — the hero has
had a dominant peak since §15 and the first screen was never the flat one.
So §4.3's premise for this change was wrong and only the smaller half of it
survived: the peak goes to **0.47** (`leaderMix` 0.45) so dominance is not
something you have to measure to see, and the hero gets a **slow term**
where it had none — `elect: 11`, against Homonoia's 3.4, so a reader who
stays sees the world rearrange once and it never competes with the section
that owns the election.

**Left for §18:** the camera is still §16's fixed pose, so the terrain sits
low in every frame and the hero is mostly covered by its own display type.
The altitude curve is what puts a reader inside the landscape the beats
have now made room for, and it changes what is in frame enough that the ink
above is a solve against *this* camera.

### 18. Starfield, fog, camera altitude curve
8k stars in view space so they never parallax, power-law brightness, slow
per-star opacity phases spread 4–14s. Exponential-squared fog to `--void`,
tuned so the far ground fades where the horizon arc sits; stars exempt.

Scroll is altitude, per the table in SPEC §4.7 — high and looking down at
the hero, lowest and near-level at project four, rising again at about.
Altitude reads **beat** position, not section position (§4.3): visibly
lower at beat 3 than at beat 1 of the same project, so the landscape
resolves as the writeup arrives. Same Lenis instance, damped, plus a couple
of degrees of eased pointer parallax. Parallax off under reduced motion.

**Done when:** scrolling the page top to bottom reads as a descent and a
climb; the camera is still a pure function of scroll position.

### 19. The laptop
Primitives only — no GLTF, no loader, no Draco. Geometry inside the scene
from 15, not a new canvas. Terminal on the screen via `CanvasTexture`,
updated at ~8fps. Log lines duplicated into a visually-hidden `<pre>` for
screen readers.

Landmark one, and it **stands on the ground** — which is why it moved
behind the terrain rather than in front of it.

**Done when:** particles depth-test correctly against the lid; the laptop
sits on `h(x, z)` rather than floating; a focusable DOM element over it
routes to Homonoia by keyboard.

### 20. Landmarks 2–4
Three more structures, one per remaining project, standing on the ground in
`order`. Three states: distant (silhouette), approaching (label + machine
ID resolve), arrived (writeup opens in the panel). LOD: silhouette at
distance, detail only on approach.

**Design work not yet done:** what the three structures actually *are*.
Ask before modelling.

### 21. Mode switch and scroll ↔ camera sync
Visible persistent control, choice in `localStorage`. Arriving at a landmark
replaces its route; loading that route flies the camera there. The writeup
panel and its backing — the only place text lives in world mode, and the
reason the brightness bound can lift outside it (SPEC §4.7).

**Done when:** deep links work, browser back works, `Esc` returns to path,
mode switch reachable by keyboard from anywhere, and switching modes at
Philoi lands at Philoi rather than at the start of the curve.

### 22. Free flight, bounds, altitude clamp
Unlocks at the fourth landmark or via a control. Bounded volume, camera
clamped above `h(x, z)` — a floor it may not go under, not collision.
Always-visible return-to-path control.

### 23. Accumulation texture
Only if the budget allows, and only once 16–22 are measured with everything
in place. 512×512 `r32uint`, `atomicAdd` one per particle per frame in the
existing compute pass, decayed 2% per frame, sampled into `h` at low
amplitude. It lags the simulation, so a leader change leaves the old
mountain subsiding for a few seconds after the traffic has left it.

**If it does not fit, the world is complete without it.** Cut it before
cutting the election.

### 24. Performance pass
Instancing, LOD, frustum culling, 60fps on integrated graphics.
**Report:** ms/frame, draw calls, particle counts per buffer.
