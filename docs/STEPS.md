# Build steps

One step per session. Start with: `Do step N from docs/STEPS.md.`

Every step ends with: `npm run build` passing, a commit, and a report of
what was measured. If a step can't be completed as written, **stop and say
so** rather than substituting an approach.

Steps 1–29 are done. The site is live. **Update this line at the end of
every step** — a stale marker in the file each session opens with is worse
than no marker.

`/` is the document and carries no Three. The world is at `?world` until
§33 builds world-first entry, and it is a landscape you can fly over
without going through it.

**The architecture turned at 21.** SPEC §0 makes the world the site and the
document the escape hatch; the divider above step 21 records what that
replaces and where the old 21–26 went. Steps 15–20 stand as built and their
reports are still true of what they measured.

**And the landscape came alive at 24.** The divider above step 25 records
that one: SPEC §4.7's "no trees, rocks, water, clouds" is reversed, steps
25–28 and 30 are new, and everything after them shifted by five.

**Step 29 is a probe and shifted everything after it by one more.** It is
the only step in this file that does not ship: it builds the cheapest
possible version of the arrival, asks one judgement question about it, and
deletes the code. It sits where it does because §28 is the first step after
which there is something standing in the world to fly at.

**And the world became inhabited after 29.** The divider above step 31
records that one: SPEC §0.3 and §0.4 are replaced — scroll is the route and
free flight is unlocked at the end of it, and the four projects are scenes
rather than structures — the world gains twelve landmarks and two cities,
and everything built is solid. **Everything after 30 is renumbered**, and
that divider carries the mapping. A step number in an older report means the
step, not the number it had.

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

**Still true, and it is what makes §0 survivable.** From step 21 the world
loads *first*, but this line is where the thing it falls back to was
finished. Nothing below it is ever the only way to reach a fact.

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

*Done.* The page is a flight now. Ten keyframes, `alt 26 → 4.20 → 12` and
`pitch 58° → 5° → 28°`, and the two properties §4.7 asks of the whole scene
hold on the object the renderer is handed: **the descent is monotone to
y 10269 and the climb monotone after it**, and the same scroll position
reached from above and from below gives **Δ 0.000** in altitude and pitch.
Every project is visibly lower at beat 3 than at beat 1 — **3.87, 2.58,
1.61 and 1.18** units — because a pin is 69% of the span to the next
project and plain interpolation between section starts spends that much of
the descent inside it.

**The path is in `curve.ts` with no three and no DOM in it**, which is not
tidiness: a pose is a pure function of scroll position and the layout, so
it is the one part of this layer that can be checked without a GPU. The
figures above are that module's own output, run in Node against the
measured layout; the poses the renderer was actually given were then read
back off the camera and match to the hundredth of a degree.

**Two keyframes the table does not have, both forced by the page rather
than by the design.**
- **The bottom of the flight is project four's last beat, not its first.**
  Every other row descends toward the row after it, so the beats inherit
  the descent free. The fourth has `about` after it, and `about` climbs —
  keyed at basis's start it would have raised the camera through basis's
  own writeup. §4.7's "~5°" is now the pair 8° → 5°.
- **`about` is keyed at the bottom of the document, not at its own top.**
  The about section starts at **11,113px against a maximum scroll of
  10,755** at 1512×804, so a keyframe there is one no reader can reach.
  What is left is the **486px** after the last pin releases, which is also
  exactly where the about section rises into frame.

**Smoothstep per segment, not a straight line.** The segments are 781px
from the hero to the first project against 2,573px between projects, so
linear plunges over the hero and drifts everywhere after it. Zero velocity
at each keyframe also means the camera *arrives* at a section rather than
passing through the altitude the section is named for.

**Damping, and the case it must not apply to.** τ = 0.18s, measured on a
500px scroll: **50% at 122ms, 90% at 407ms, 99% at 706ms**. More than a
screen in one frame is not a scroll, it is a jump — a deep link's re-jump
once the pins are in, keepingPlace's correction, the back button — and the
lag would fly the camera in over half a second from a pose nobody was at.
Over `innerHeight` it snaps: measured, a nine-screen jump resolves in
**13ms**, one frame. All four project deep links and `/#about` render their
**first frame at the named pose exactly** — 18.00/36°, 12.00/21°, 8.00/13°,
5.50/8°, 12.00/28°.

Parallax is **±2.06° of yaw** measured at the frame edges against ±2.2°
asked for, and **zero in every direction under motion off** — five pointer
positions, one identical pose.

**Fog: the vertical axis is squashed, and that is the whole finding.**
Plain radial distance is the obvious reading of §4.7 and it does not
survive a camera that moves: at 26 units up the ground directly below is 26
units away and comes back at 0.29, so the first screen everybody sees goes
into the haze while the low stops stay lit. Measured, mean scene
contribution over the frame, against §17's **0.00020** everywhere:

| | hero | enargeia b3 | philoi b3 | about |
|---|---|---|---|---|
| radial fog | 0.00009 | 0.00015 | 0.00027 | 0.00013 |
| dy weighted 0.35 | 0.00023 | 0.00017 | 0.00027 | 0.00015 |

Weighting dy at 0.35 says the fog is a layer over the ground and thin
through its own thickness, which is what makes §4.7's tuning sentence true
at *every* altitude rather than at the one it was set at: the arc is
`RADIUS` away horizontally whatever the altitude, so 0.043 puts the ground
at **0.03 by the arc** from 26 units up and from 4. The depth gradient is
20× either way.

**Brightness: stars and ground are two budgets, not one, and the harness
proved it rather than assumed it.** Measured per element with the stars
switched off, the `period` and `#ID` lines that sit high in a section have
**literally zero** ground or field behind them — they are bound entirely by
sky — and the elements the ground binds have no stars over them. Over 196
paired elements there is no element that mixes the two enough to bind, so
they solve separately: ground and field **×2.19** to the ceiling, stars
left at **1.0** of their own 1.24× headroom. Spending decoration's budget
to put a `--dim` label at exactly the AA floor is the wrong trade, and
§4.7 is explicit about which of the two is scaffolding.

Ink: field **221 → 474**, ground **14,500 → 31,150**. Re-measured after the
change: **1.003× at 4.55:1** — at the ceiling — and **0 of 196 elements
fail**. High contrast puts the scene at **0.32×** of that and 18.1× of
headroom, so the toggle still moves the busiest frame down and only down.

**§17's hand-off is largely spent, and by the camera rather than by an
alpha.** It recorded 23× to 223× of local headroom at beats 1 and 3 and
noted a scroll-varying alpha for this step. Per-stop headroom now runs
**1.11× to 36.7×**, and the loose end of it is enargeia alone — the one
project still high enough that the ground is far. Descending is what spent
it: the stops with text now have the ground close. Not built, and there is
much less left to buy than there was.

**Everything else, checked.** **5 draw calls**, which is what §4.7 predicted
stars would make it. **2.71ms/frame** at 1512×804, DPR 1 *and* DPR 1.5
(§16: 2.50ms) — stars are 0.07ms of it, the fog is the rest, and the layer
is still vertex-bound on 428k instanced quads. Tiers hold: 60k/150k/4k
below 1024px, no canvas below 768px, no horizontal overflow at any width
tried. axe-core **0 violations** across eight states. LCP **116ms** desktop
/ **100ms** mobile, CLS **0** with zero shift entries. Bundle **55.3 KiB
eager / 253.3 KiB desktop** against 120 and 260 — **+1.14 KiB**, 6.7 KiB
spare — and `projects.ts` stays in the eager chunk with the scene chunk
importing it rather than copying it.

**Motion off is still a frozen frame** and the camera is set from the
scroll position at mount, so a deep link with motion off lands at its own
pose — `/projects/homonoia` at alt 12.00/21°, `/#about` at 12.00/28° — and
then holds it while the reader scrolls, which is what §4.7 asks for and
what the field presets have always done. Turning motion back on snaps
within one frame.

**One thing measured and left alone.** Motion off at philoi beat 2 and on
again lands in homonoia's range, not philoi's. §17 reported the round trip
holding the beat and it does — on homonoia, which is what it measured. The
same script on the §17 build returns the identical scroll positions
(4105, 2653, 4086), so this is not a §18 regression and the camera is
faithful to wherever `keepingPlace` leaves the reader. It belongs to the
pin restoration, not to the curve.

### 19. The floor becomes a surface
The reversal in SPEC §4.7: the ground is a lit mesh and the points become
the air over it. Everything else in that section stands — the heightfield,
`shares()`, the routing rule, the election, the camera curve, the fog, the
stars, the horizon arc.

- A radial grid displaced by the same `h(p)`, camera-relative like the point
  disc, denser toward the centre. Outer ring skirted below the fog cutoff so
  the surface never ends in mid-air behind the arc
- **Analytic normals**, from the closed-form gradient of `h`. The amplitudes
  tween continuously during an election and baked normals would need
  rebuilding every frame
- **The light is the leader**: a point light at the elected node in
  `--leader`, intensity tied to its own amplitude, plus a very low fill in
  `--rule` from the opposite side so the far faces are readable. Ambient
  zero. If it reads as a stage spotlight rather than as illumination, fall
  back to a fixed low directional light from behind the camera and keep the
  leader light as a rim — decide by looking
- Opaque, `depthWrite: true`, drawn before the particles. The traffic is
  occluded by terrain now, which is most of the point. If the cluster is
  mostly hidden at the lowest stop, the fix is the camera's `dist`
- The point layer stays, reduced and lifted off the surface with a wide
  random spread, so it reads as low mist rather than as ground

**Brightness re-solves from scratch.** A lit opaque surface does not
accumulate and has a maximum; §18's ink figures belong to a layer that no
longer exists in that form and do not scale. The binding case is likely a
lit slope behind a `--dim` label at beat 2.

**Done when:** the ground reads as a landform at every camera stop and a
ridge occludes traffic behind it; an election visibly re-lights the terrain
rather than only re-shaping it; every text element clears its bound,
re-solved rather than scaled; 60fps on integrated graphics; motion off is
still a single frozen frame, with the surface in it.

**Report:** ms/frame, draw calls, vertex count, the re-solved ink figures,
and one screenshot at the highest and lowest camera stops.

*Done.* The ground is a surface. **66,048 vertices and 131,584 triangles in
one draw call** — 256 rings by 256 segments plus a skirt ring, radii
quadratic in the ring index so the spacing is 0.04 units underfoot and 0.29
at the rim. Below 1024px it halves to 16,640 and 33,024. The normal is the
closed-form gradient of `h` carried out of the same unrolled loop, so an
election tweens fifteen amplitudes and the normals follow for nothing.

**6 draw calls** — surface, mist, arc, field, stars, blit — and **2.00ms per
frame** at 1512×804, against §18's 2.71ms. The surface is cheaper than the
150,000 points it replaced. It is also the first layer here that is *fill*
bound rather than vertex bound: at DPR 1.5 the whole frame goes to 2.38ms
and the surface alone from 0.470 to 0.945, while the field moves 0.810 →
0.930 and the mist 0.715 → 0.745.

**The light is the leader and it survived contact**, but three things about
it were decided by measurement and not by §4.7's paragraph.

- **Decay 1, not the physical 2.** A peak grows *toward* the node that
  earned it, so under Homonoia the light stood 2.6 units off the top of its
  own mountain and 40 off the rim — 64× across one frame. That is the stage
  set the spec warned about: the massif went to pure white, and the busiest
  frame had **0.02×** of the headroom it needed while Enargeia, whose
  landscape is flat, had **42×**.
- **Six units above the node, not at it**, which is what actually fixed the
  spread: **2000× down to about 30×** across the fourteen camera stops, and
  one exposure covers that.
- **The fill stands over the reader's shoulder.** The camera is outside the
  ring and the key is inside it, so every slope facing the reader faces away
  from the key; a fill opposite the leader lands on the same far side and
  the landscape is a silhouette at every stop. What survives of the spec's
  sentence is its reason, not its geometry.

**The material is Phong, and the reason is the budget.** Both were built and
measured: `MeshStandardNodeMaterial` costs **4.42 KiB** gzipped against
Phong's **0.86**, and there were 6.7 KiB of desktop budget. Standard would
have shipped with 1.5 KiB spare and no room for the laptop. On screen the
difference is a GGX sheen worth **4% of the mean frame and 10% of its peak**
— invisible at the exposure the brightness bound allows. §4.4 moves with it.

**Brightness, re-solved from scratch.** Surface exposure **0.185**, mist ink
**5,570** over 150,000 points where §18's ground was 31,150 over 300,000.
Measured over **196 text elements at fourteen stops**, four layers each:
**0 failing**, worst measured **4.66:1**, and the scene sits at **0.779 of
the 4.55:1 ceiling**. High contrast puts it at **0.038** — the toggle moves
the busiest frame down by 20× — with **0 failing** and 7.27:1 at worst.

The binding case is the one §4.7 predicted, and it is *moving*: a lit slope
behind a `--dim` 10px metric label at Homonoia beat 2. Homonoia's term ends
every 3.4s, so the massif walks under that column and out of it again, and a
measurement sampling less than a term never sees it. Sixteen frames over
4.8s for that reason.

**Occlusion, which §4.7 said to check before tuning anything else.** Total
field light in the frame with the surface in front of it against the same
field without it, on a stopped loop so the particles do not move between the
two: **0.7% hidden at the hero, 13.5% at Homonoia beat 1** — the tallest
massif and a camera still high enough to look across it — **and 0.1% at the
lowest stop**, where the cluster stands at altitude 9 and the camera is
nearly level under it. Noise is about ±3%. The camera's `dist` needs no
change.

**The election re-lights the terrain, measured rather than asserted.** Over
two terms at Homonoia the key travels (0, 14.6, −3.5) → (2.9, 14, 3.2) →
(4.7, 15.8, −1) and the brightest 24×24 patch of ground travels with it,
from x 776 to 856 to 960 in the frame.

**Everything else, checked.** Bundle **55.3 KiB eager / 254.9 KiB desktop**
against 120 and 260 — **+1.6 KiB** on §18, **5.1 KiB spare**. axe-core **0
violations** across eight states. Tiers hold: no canvas below 768px, halved
counts below 1024, no horizontal overflow at any width tried. Motion off is
still one frozen frame with the surface in it, and a deep link still lands
at its own pose.

**The loose end, and it grew.** §17's local headroom is back and it is
large: per stop the surface could take **1.72×** at Homonoia beat 2 and
**596×** at Enargeia beat 3, because one exposure has to serve the tightest
text on the page and most of the page has no text over the world at all. An
opaque surface makes that gap visible in a way additive points did not — the
hero and the lowest stop are dark landforms that could be three to a hundred
times brighter without touching a contrast ratio. The mechanism §17 named
(an exposure that varies with scroll) is still unbuilt and is now worth more
than it has ever been.

### 20. Exposure and scale
**Two problems in the same frame, and neither touches the lighting.** The
leader light works — each project's term is held by a different node, so the
terrain shades differently per section and scrolling between them re-lights
the world. That stays exactly as built. See SPEC §4.7.

**The exposure serves one stop and starves thirteen.** §19 measured it and
named it as the loose end: one exposure has to clear the tightest text on
the page — a 10px `--dim` metric label at Homonoia beat 2, **1.72×** — and
every other stop inherits that ceiling, out to **596×** at Enargeia beat 3.
The hero and the bottom of the descent are the two frames with the least
text over the world and they are as dark as the frame with the most.

- **Exposure varies with scroll.** `camera.ts` already evaluates a pose from
  scroll position with smoothstep between keyframes; exposure is one more
  channel on that pose. No new mechanism and no second authority for where
  on the page the reader is
- **The values are measured, not chosen.** §19's harness already computes a
  headroom per stop and then throws it away by taking the minimum. Take the
  per-stop figure instead
- **Leave a margin.** Solve to the ceiling and a scroll landing between two
  keyframes can exceed it, because the binding element and the brightest
  patch both move continuously. Target **0.85 of each stop's own ceiling**,
  and verify the interpolated path rather than only the keyframes
- It must not visibly pump. The transitions are smoothstepped over hundreds
  of pixels and the eye adapts, but check it: scroll slowly through Homonoia
  and confirm the ground does not breathe as the term ends under a label.
  If it does, the fix is fewer keyframes with wider spacing, not a faster
  tween

**The camera was tuned against invisible ground.** The massif fills two
thirds of the frame at the low stops and the cluster is not legible as a
cluster from anywhere on the curve. Not a mistake anyone made — §18 chose
`alt` and `dist` when the ground was haze that never resolved, so there was
nothing to compose against. Re-tune the curve against the surface:

- **Hero: pull back and up.** It is the one frame that should read as a map
  of the cluster. If the ring does not fit at alt 26, go higher
- **Low stops: increase `dist`.** 15 units off a cluster whose summit
  reaches 6.4 was fine when the ground was invisible. §19's occlusion figure
  (0.1% at the lowest stop) says there is room to move without hiding the
  field
- **Mid stops: the descent must still read.** Pulling back at the bottom
  must not flatten it

**And check the heightfield's shape**, never verified because for three
steps nothing could see it. The five nodes must read as **five distinct
summits**, at least from the hero. Ridges connecting them are correct — that
is what a route is — but the valleys between adjacent nodes must fall close
to zero. `SIGMA` is the peak width and `TAU` the ridge half-width: if the
peaks merge into one massif, narrow `SIGMA`; if the ridges fill the gaps,
narrow `TAU`. Change one at a time.

**Does not change:** the leader light, the fill, decay 1, the six-unit lift.
The heightfield function, `shares()`, the routing rule, the election. The
mesh, the mist, the arc, the stars, the fog. Anything in document mode above
the canvas.

**Done when:** the landform is legible at every stop, not only at the one
that binds the ceiling; no text element fails its bound anywhere on the
interpolated path; the ground does not visibly pump under a slow scroll;
five summits read as five from the hero; the massif does not fill the frame
at the low stops.
**Report:** per-stop exposure values, the worst contrast ratio on the
interpolated path (not just at stops), `SIGMA` and `TAU`, and screenshots at
the hero, one mid stop and the lowest stop.

*Done.* Exposure is the pose's fourth channel, interpolated on the same
smoothstep as altitude, distance and pitch, and it varies **3.8×** down the
page where §19 had one number for all of it.

| keyframe | y | alt | dist | pitch | exposure | §19 |
|---|---|---|---|---|---|---|
| hero | 0 | 30.0 | 12.0 | 58° | **0.700** | 0.185 |
| enargeia | 781 | 18.0 | 17.0 | 36° | **0.700** | 0.185 |
| homonoia | 3,354 | 12.0 | 19.0 | 21° | **0.215** | 0.185 |
| philoi | 5,927 | 8.0 | 18.0 | 13° | **0.195** | 0.185 |
| basis | 8,500 | 5.5 | 16.0 | 8° | **0.700** | 0.185 |
| lowest | 10,269 | 4.2 | 15.5 | 5° | **0.290** | 0.185 |
| about | 10,755 | 12.0 | 18.0 | 28° | **0.180** | 0.185 |

**The values are the harness's, not a taste call — for ten of the fourteen
stops.** It measures the surface alone at two exposures inside every text
element's own box, fits the line the fog leaves, and reports the highest
exposure that element still clears; a keyframe takes 0.85 of the tightest
one within its reach. Four stops (enargeia beats 2–3, basis beats 2–3) have
**no ground behind any of their text at all** and no measured ceiling, and
those are where the taste cap of 0.70 binds instead. Two figures the obvious
arithmetic gets wrong, both already traps in CLAUDE.md and both re-met here:
the layers do not add, so the budget comes from the combined frame and the
surface-alone figure only bounds what scaling it can *add*; and the
contribution is not proportional to the exposure, because fog mixes the
surface toward `--void` and the pixel is `void + fog·(lit·g − void)`.

**Verified on the interpolated path, and the path is where it failed.** A
first solve cleared all fourteen stops and then failed **between** two of
them — a 10px `--dim` metric label at y 3,929 at **4.34:1**, which is
exactly the case the 0.85 margin exists for and did not cover. Thirteen
midpoints are constraints now. Final: **0 of 197 elements failing at the
stops** (worst 4.64:1, scene at **0.809** of the 4.55:1 ceiling), **0 of 167
at the midpoints** (worst 4.79:1, 0.508 of it), and **0 of 197 in high
contrast** (worst 7.24:1, **0.083** — the toggle moves the busiest frame
down by 9.7×, as it must).

**Sampling could not bound Homonoia, and that is the measurement finding of
this step.** Its term ends every 3.4s and the next leader is drawn at random
from the four that are not the incumbent, so the worst frame is the worst
over five massif placements and the tweens between them. Two timed runs
disagreed by **1.7×** on the same stop's ceiling, and one of them passed a
stop the other failed at 4.22:1. The instrument that works forces the
sequence: each leader held, each transition walked, worst 12×12 over all of
it. Under that, Homonoia's ceiling is **0.25** where a lucky 20-second
sample had said 0.32 and an unlucky one 0.44. Shipped at 0.215, which is
0.73 to 0.86 of the allowance across the five positions measured.

**It does not pump, and the reason is better than the tolerance.** Measured
every 100px down the page, document peeled: the exposure varies ×3.78 and
the scene's mean over the lower half varies only **×1.74**, because the
exposure is largely cancelling the distance — it is high where the ground is
far or flat and low where a massif is close behind the words. Largest change
**×1.12 per 100px** and **×1.27 per screen**, against **×1.05** for a
Homonoia election measured at a standstill over 20s. The election moves the
frame less than the scroll does, and neither is visible.

**`SIGMA` 3.4 → 2.0, `TAU` 1.3 → 0.9, and `RIDGE` 8.0 → 5.0.** The third one
is not in the brief and it had to move: a ridge lies *on* the segment
between two summits, so narrowing `TAU` thins it without lowering the
saddle. At the old values there was no saddle anywhere — the deepest point
of every adjacent route measured **above** the lower of its two summits
(0-1: summits 3.94/2.07, route floor 4.69), which is why three steps of
work looked like one plateau. At the new ones the routes are lines across
low ground and the five stand as five, with one exception that is the
cluster's geometry rather than a constant: **nodes 3 and 4 are 2.84 units
apart in xz** where the other four sides run 4.57 to 6.51, and they read as
one twin summit at any σ wide enough to be a hill. Left alone — moving the
pentagon changes the simulation everywhere and is not this step's.

**The camera was re-tuned against the surface, and the hero went the other
way from the brief.** The measurement that moved the four project stops is
the angle between the view axis and the ground under the cluster: at §18's
distances it ran **11° to 18° below** the axis, which is the bottom third of
the frame, so the landform was half cropped and the near flank filled the
rest. `dist` is up 2 to 4 units at every project. The ring's extent, taken
by projecting the five node positions rather than off the pixels: **17% of
the frame width at the hero to 33% at basis, centred 69–72% down**.

§20 says to pull the hero back and up "if the ring does not fit the frame at
alt 26". It fits with room to spare — 17% of the width, nowhere near an
edge — so the premise is measurably wrong and the hero's problem was never
size. It is that the cluster sat directly behind *Theophilus / John*. **Alt
26 → 30 with `dist` 13 → 12** drops it clear of the name and is still a pull
back where it counts: 24.0 units from the cluster against 21.4, because at
the top of the flight altitude is the longer leg. Pitch stays at 58°.

**Everything else, checked.** §18's two properties survive the new poses:
the descent is **monotone to y 10,270** and the climb monotone after it,
read out of `curve.ts` in Node. **6 draw calls**, **2.26ms/frame** at
1512×804 DPR 1 and **2.77ms** at DPR 1.5 (§19: 2.00 / 2.38) — the surface is
0.73ms of it and still the fill-bound layer. Bundle **55.2 KiB eager /
254.8 KiB desktop** against 120 and 260, 5.2 KiB spare and 0.1 KiB *under*
§19. axe-core **0 violations across eight states**, 13 focusables unchanged.
LCP **104ms desktop / 72ms mobile**, CLS **0**, zero shift entries. Tiers
hold: halved below 1024px, no canvas below 768px, no horizontal overflow at
any width tried. Motion off is still one frozen frame and a deep link still
lands at its own pose — `/projects/homonoia` at alt 12.00/21°, `/#about` at
12.00/28°.

**One thing seen and not fixed:** the site has no `rel="icon"`, so every
load 404s on `/favicon.ico`. Pre-existing, nothing to do with this step.

---

## ▲ The world is the site.

**SPEC §0 replaces the architecture, and this is where the build order turns
with it.** Steps 15–20 are not withdrawn and nothing in their reports is
wrong. What is wrong is the frame they were built in: a world *behind* a
scrolling document. Read §0 before step 21.

**The record, because it should not be quietly deleted.** §16–§20 built a
terrain that is correct, measured and **boring**. Every symptom that was
chased across those five steps — the ground too dim to see, the camera
pinned to a 22-unit descent, five Gaussians that never read as a landscape,
an exposure solved against a 10px `--dim` metric label, a composition angle
cropped by the fold — was a consequence of sitting under body copy, not a
tuning failure. §17 spent a step making *room* for the world by tripling the
page. §20 spent a step buying back brightness the document had taken. Both
succeeded, and the ceiling they were working under is the thing §0 removes.
So the world loads first, the projects become places in it, and the document
becomes the escape hatch rather than the shell.

**The old 21–26 are gone**, and where they went:

| was | now |
|---|---|
| 21 The laptop | Absorbed into **31**, and reopened: a laptop is one candidate answer to "what are the four structures" (SPEC §8), not a settled landmark |
| 22 Landmarks 2–4 | **31** (what they are) and **32** (the three states) |
| 23 Mode switch and scroll ↔ camera sync | **30** (entry, escape, memory) and **32** (URL sync). The modes no longer share a scroll position, so there is nothing to sync |
| 24 Free flight, bounds, altitude clamp | **24**, unchanged in substance and promoted: it is the default now, not something unlocked at the fourth landmark |
| 25 Accumulation texture | **Unscheduled.** It modulates a heightfield that is about to become one layer of a procedural terrain, so it cannot be specified until 22 lands. Kept in SPEC §4.7; still cut before the election |
| 26 Performance pass | **35**, widened to brightness and accessibility, both of which re-solve in the new frame |

**The numbers in that table are the ones this file used at §21.** Two shifts
have happened since — see the top of this file and the divider above step 31.

**Step 22 is the one that decides whether this works.** If procedural
terrain at scale does not read as a landscape worth flying over, nothing
after it rescues that — and it is better to find that out at 22 than at 34.

---

## World-first

### 21. Strip
**Demolition, and it is meant to leave the site smaller.** Remove the
scroll-driven camera, the beats as the world's structure, the scrim and the
old terrain. Land on an empty world: stars, fog, and a camera you can fly.

- `curve.ts` and the scroll→pose keyframes go. So does everything in
  `camera.ts` that reads `ranges()`, `onLayout` or `scrollY`
- The terrain goes entire — the radial mesh, the mist, the horizon arc, the
  leader light and the fill, `h(p)`, `shares()`. Step 22 builds a landscape
  from a different construction and step 34 rebuilds the cluster as a place;
  neither is this file with different constants
- The traffic field goes with it, for the same reason: it is a thing you see
  *at* Homonoia now (SPEC §0.5), not the air over every screen
- **Keep** the renderer, the canvas, the tier gate, the fog (squashed
  vertical axis and all), and the starfield
- The scrim goes from `ProjectSection.astro`, `projects.ts` and
  `tokens.css`. Document mode keeps all three beats
- A minimal free-flight camera: look and move, damped. The clamp, the soft
  bounds and the return-to-path control are step 24's

**The question this step has to answer:** what does `/` serve between here
and step 33, which is where world-first entry is actually built? Every
commit deploys. Answer it in the report rather than leaving the live site
in an undecided state.

**Done when:** a document-mode load fetches no Three at all; the world is
reachable and flyable; `npm run build` passes; nothing on the document side
regresses — axe clean in all four states, deep links land, both toggles hold.
**Report:** bundle sizes both sides of the gate, draw calls, ms/frame, what
was deleted, and what `/` serves.

*Done.* **1,532 lines of measured work deleted, and the site is two things
now instead of one.** `/` serves the document — finished, and for the first
time since §15 carrying no Three at all. The world is at `?world`.

**What `/` serves, which is the question this step had to answer.** §33 owns
world-first entry and it is four steps away, so the alternative was leaving
a free-flight camera behind a scrolling document on a live site for four
commits. Instead the gate inverts *later*: `?world` opts in, everything else
gets the document, and §33 flips one condition in `world.ts` and adds the
loader, the visible control and the mode memory around it. `?doc` already
works today by being anything other than `?world`, and it is checked
explicitly so the flip is a line rather than a re-reading of a comment.

Two things had to change for a query parameter to survive at all, and both
were latent bugs against §0.1's own `?doc`: `url-sync` rewrote the address
bar to a bare pathname on the first scroll, and the project stubs redirected
to `'/#' + slug`. Either one dropped the reader into the other mode without
saying so. Measured: `/?doc` scrolled to 4,000px reads `/projects/homonoia?doc`.

**Deleted.** `curve.ts` (145 lines — ten keyframes, the smoothstep, the
exposure channel) and `terrain.ts` (632 — the radial mesh, the analytic
`h(p)` and its closed-form gradient, `shares()`, the mist, the horizon arc,
the leader light and the fill). Out of `scene.ts`: the compute simulation,
the six section presets, the election, `onSection`, `onLayout`,
`gsap.ticker`, the motion-off frozen frame. Out of the document:
`ProjectSection`'s scrim, its token, `ranges()`, and the layout-watcher list
that existed only to tell a camera curve the pins had moved. The three beats
stay, and the page is **11,559px** at 1512×804 — the same height as §17,
because the scrim was a gradient and never occupied space.

`fog.ts` is kept and nothing imports it. §0.5 keeps it by name, its one real
finding (the squashed vertical axis) is what makes a fog tuning hold at more
than one altitude, and §22 makes altitude unbounded where §18 had 22 units
of it. An unimported module is not in the graph and costs nothing.

**The strip is worth 5.1 KiB, and that is the honest surprise.** Deleting a
compute pass, a lit surface, 66,048 vertices of mesh and five lights moved
the world chunk from 199.6 to **194.6 KiB**, because the chunk is almost
entirely `three/webgpu` and this project's own code in it is a few KiB of
TSL. The document is what actually got smaller in the way that matters: it
went from *fetching 194.6 KiB of scene on every desktop load* to fetching
none.

| | gzipped | budget |
|---|---|---|
| Document mode (all of it) | **56,338** (55.0 KiB) | 120 KiB |
| World chunk | **199,303** (194.6 KiB) | 400 KiB |
| A world load, both | 255,641 (249.6 KiB) | |
| CSS 2,013 (−1,012, the scrim's) · document 6,772 | | |

**2 draw calls** — the sky and the renderer's blit — **16,001 triangles**,
and **0.108 ms/frame** at 1512×804 DPR 1 against §20's 2.26. Batches of 400
between two `queue.onSubmittedWorkDone()` with the site's loop stopped, five
runs agreeing to ±0.002. Two things it says about the baseline §22 inherits:
the same frame with the sky removed entirely is **0.103 ms**, so 8,000 stars
are 0.003 ms and the frame *is* the clear and the blit; and DPR 1.5 costs
**0.185 ms**, which is 1.71× for 2.25× the pixels. An empty world is fill
bound on its own background. There is 16.6 ms of a 60fps frame unspent.

**The camera flies, and the pose is the only instrument that can say so.**
An empty world with stars at effective infinity cannot show translation by
construction — the frame is identical before and after a hundred units of
travel — so this is read off `view.pose()` rather than off pixels, which is
the honest way round and not a workaround. W held for 1s from (0, 24, 0) at
pitch −10°: **11.07 units travelled, speed 13.85 of 14** (an exponential
approach at τ 0.22 reaches 0.989 in 1s). Released, it **coasts 3.04 units
and decays to 0.147** in the next second. A 400px drag is **100.0° of yaw**
at 0.25°/px; a 2,600px drag down clamps at **−85.0°** rather than passing
through the gimbal. Diagonal input is normalised, so two keys is not 1.41×
one.

**Nothing scrolls under the world, and `overflow: hidden` was not enough.**
Lenis reads the wheel itself and moves the window programmatically, which is
not a scroll the root can refuse — measured at **2,978px on one flick**
before `holdScroll()` existed. It is Lenis's own `stop()`, so the instance,
the ticker wiring and every ScrollTrigger stay exactly where they are for
§33 to hand back — and, since the route is scroll (SPEC §0.3), for §31 to
drive the camera from. After: 0 → 0.

**The document is hidden, not removed**, so it is still what the browser
paints, what a crawler reads, and what §32 opens the writeup out of.
`visibility: hidden` is what takes it out of the tab order and the
accessibility tree together: **0 focusables** behind the canvas, so Tab
cannot land on a link nobody can see. `Esc` leaves — it strips `?world` and
replaces the entry, landing on `/` with the document visible and no canvas.
That is a placeholder and it is here at all because §0.1 is explicit that
nobody is trapped; §33 owns the visible, persistent control.

**Gates, all four measured by whether the scene chunk is requested at all:**
`?world` at 1000px wide — no. `/` bare — no. `?world&doc` — no. `?world`
under `prefers-reduced-motion: reduce` — no, and `data-motion` is `off`.
Only `?world` at ≥1024px with an adapter and motion on fetches it. The gate
is decided once at load rather than re-asked on resize, which §15 did:
dragging a window past a breakpoint must not teleport a reader into a
landscape they did not ask for.

**The document side did not regress.** axe-core **0 violations across eight
states** — 1512×804 and 360×640, each in both contrast modes and both motion
modes. LCP **48ms** desktop and mobile, CLS 0 (one shift entry at 2.6e-5
desktop, zero mobile). `/projects/homonoia` still lands at **y 3,354**,
which is its pin start and beat 1. Four sections pin at 1512×804. In world
mode the document still paints first and the world arrives over it: **LCP
68ms, `data-world` set at 91ms**, on localhost — §33 owns the number that
matters, which is over a real connection with a cold cache.

**Left for §22, deliberately.** There is nothing in the world to fly *to*.
The starfield's horizon fade was a function of camera altitude and the
ground disc's radius; with no ground there is no angle to derive, so it
fades from level and the lower half of the frame is `--void`. §23 replaces
the sky wholesale. The DPR 1.5 cap is still in `scene.ts` and its
justification is not — it was there because the layer was out of focus
behind text, and it is the whole frame now; it stays until §38 has a
measurement to keep or drop it on.

### 22. Terrain
**The step that decides whether any of this works.** SPEC §0.2.

Ridged multifractal over fBm. Multiple octaves, so there are ranges,
foothills, valleys and detail at every scale you approach. Chunked
generation around the viewer, freed as they are left, extending far past the
horizon. LOD is not optional at this scale — concentric rings or a quadtree.
Generation off the main thread if it stalls the frame.

The cluster heightfield from §16 comes back as a **modulation layer** on the
base, raising ground where message density is high — not as the landscape.

**Done when:** the camera can fly a long time in one direction and keep
finding new ground; no hitch when new chunks arrive; it reads as a landscape
worth flying over. That last one is judged by looking, and if it fails, stop
and say so rather than tuning octaves for a session.
**Report:** ms/frame, chunk generation cost separately from render cost,
draw calls, triangle count, and screenshots from three altitudes.

*Done.* **It reads as a landscape, and that is the finding — the rest is
numbers.** Ranges standing in open country, ridge systems receding into fog,
a horizon, valley floors with texture on them. Flying is the point of it in
a way no still shows, which is the same sentence §23 will have to write
about the terminator. Judged by looking, as the step asks, and the honest
qualifier is that it is *shape* that works: the light is a two-stop ramp
that stands in until §23, and the frame is flatter than it will be once the
bands and the rim in `--leader` are on it.

**Five files, and only one of them can see a GPU.** `height.ts` is the field
and imports nothing — no three, no DOM — so Node runs the `.ts` directly and
every field number below is that function's own output. `chunk.ts` samples
it into arrays. `grid.ts` is the vertex layout the worker and the main
thread both index. `terrain-worker.ts` is nine lines. `terrain.ts` is the
only part that knows what a mesh is.

**The construction.** A continental fBm (4 octaves, λ1,150, ±40) is the
landform, and a mask taken off its own value is *where there are mountains
at all* — without it a ridged field is uniform mountains to the horizon,
which is a texture rather than a place. A ridged multifractal (7 octaves,
λ380, ×76) inside that mask is the relief: `1−|n|` folds the noise at zero
so maxima become creases, squaring sharpens the crease into a crest, and
Musgrave's weight term feeds each octave through the last so detail collects
on ridges and valleys stay smooth. A third fBm (4 octaves, λ110, ±7) runs
*outside* the mask, and it was added after looking: the mask is near zero on
a valley floor by design, so the only thing left there was a continental
octave 144 units across, and ground with no relief under 144 units does not
read as ground — it reads as fog, or as a hole in the frame where the light
is. Over a 3,000-unit square the field is **−22.4 to 128.1, mean 15.6**,
with 38% of it in one 16-unit bucket at the bottom.

**The cluster comes back as a term, and it does two things.** Five Gaussians
weighted by share (σ160 on a 120-unit ring, ×26) raise the ground *and* open
the range mask where they land, so what the traffic builds is a massif with
the same crests everywhere else has rather than a dome sitting on a plain —
which is the failure §0 names. Equal shares is what an idle cluster looks
like; §34 sites it and brings back the election with it. Note left in the
file for §34: this runs inside the worker, so a share change is a message
and a regeneration of the chunks within reach, not a uniform.

**A quadtree, and rings were tried first on paper.** Rings are far cheaper —
twelve chunks cover what forty-six quadtree leaves do — and they do not
work. A ring hierarchy needs level L's block to exactly fill the hole in
level L+1's, which forces each level's origin to be a multiple of the next
level's chunk size; propagate that down four levels and the finest level can
only re-centre **every 32 chunks**. Every published implementation absorbs
the leftover with L-shaped trim strips. A quadtree has no alignment
condition at all, and its leaves are keyed by their own coordinates, so a
chunk is generated once and nothing a neighbour does invalidates it.

Four levels, 48 quads a side, chunks of 96/192/384/768 units and therefore
spacings of 2/4/8/16; a cell splits while the camera is within 1.5 of its
own width; a 5×5 block of the coarsest floats around the camera, which puts
ground in every direction out to **at least 1,536 units** — past where the
fog has taken it to `--void`. Cracks between levels are **skirts, not
stitching**: stitching is exact and would make a chunk's geometry depend on
which levels its four neighbours happen to be, so crossing a boundary would
regenerate a ring of chunks that had not moved. A skirt is 196 of a chunk's
2,597 vertices, depends on nothing outside it, and both sides of every seam
have one.

**Render cost, at three altitudes, DPR 1 at 1512×804:**

| | leaves | tris allocated | draw calls | tris drawn | ms/frame | at DPR 1.5 |
|---|---|---|---|---|---|---|
| low, 70 | 154 | 768,768 | **56** | 285,569 | **0.302** | 0.476 |
| cruise, 190 | 136 | 678,912 | **43** | 220,673 | **0.255** | 0.425 |
| high, 520 | 76 | 379,392 | **27** | 140,801 | **0.200** | 0.376 |

§21's empty world was 2 draw calls at 0.108ms. So the whole landscape costs
**0.19ms a frame** and 54 draw calls at the worst of the three, against a
budget of 100 and a 60fps frame of 16.6. Batches of 240 between two
`queue.onSubmittedWorkDone()` with the site's loop stopped, after a warm
batch of 60. Frustum culling is doing two thirds of the work: a chunk is a
bounded square whose height range the worker already reports, so it gets a
bounding sphere without a read-back.

**Generation cost, which is the one that had to be separate.** In a worker
pool — three of them, `hardwareConcurrency − 1` capped at 3 — importing
`chunk.ts` and `height.ts` and nothing else. The opening fill is **180
chunks in 258.1ms of worker time, worst 4.3ms**; the main thread's share of
that is building the geometry and the bounding sphere, **6.3ms in total,
worst 0.2ms**.

**Under flight it is smaller than the fill.** 75 seconds held at boost, 180
units/s, level: **13,482 units travelled and 2,263 new chunks**, 5,091ms of
worker time (2.25ms mean, **worst 4.9ms**) — 2.3% of the pool. Main-thread
attach over the whole flight: **144.8ms, worst 0.3ms in any one frame**.

**No hitch, and it is measured rather than asserted:** 4,507 frames, median
gap **16.7ms**, p99 16.8, max **16.8**, and **zero frames over 25ms**. With
`document.hidden` checked false, because a backgrounded tab reports frozen
timings rather than wrong ones.

**No holes either.** A leaf whose chunk has not arrived is stood in for by
the nearest generated ancestor — the chunk it was subdivided out of, still
alive on a four-second retirement clock — and every other descendant of that
ancestor is hidden with it so the two cannot z-fight over the part they
share. Instrumented as a count of leaves with no generated ancestor: **0 at
every one-second sample of the flight, worst 5 of ~140 on a 10Hz sample**.
Chunks alive stayed between 259 and 287 the whole way, which is ~24MB of
buffers and ~17MB of the CPU copies three retains behind them.

**Bundles. The document side is byte-identical**, and that is checked by
building `HEAD` and this tree and comparing: 48,993 + 6,907 + 569 = **56,469
gzipped** either way, CSS 2,031. The world chunk went **199,321 → 202,436
(+3,115)** and the worker is a new **1,264**, so a world load is 203,700
(198.9 KiB) of a 400 KiB budget. The document chunk never names
`terrain-worker`, so it cannot be fetched in document mode — checked on all
four gates along with the scene chunk.

**Four things moved outside the terrain, all of them because there is now
ground.** The camera's far plane 1,000 → 2,600 and near 0.1 → 0.5, since
everything past 1,300 is fully fogged and the clip is invisible. The star
sphere **200 → 2,500**: stars are transparent and depth-test *after* the
opaque ground, so a sphere inside the terrain's reach draws stars in front
of a mountain 900 units out. Fog 0.043 → **0.0015**, re-solved against real
distances instead of a 42-unit disc; the squashed vertical axis from §18
survives and matters more now that altitude is unbounded. And the cruise
speed 14 → **45**, because 380 units between ridges is what a speed can
finally be relative to.

**The opening pose is a search, not a guess.** Scored over the field for
open ground under the camera, nothing within 300 units, a 125-unit range
between 380 and 900, and more ground standing behind it: (−60, 190, 60),
yaw 30°, pitch −9°. The heading lands within five degrees of the bearing to
the cluster massif a kilometre out, which is the search's coincidence rather
than a composition — §34 is what makes it deliberate.

**Document mode did not regress.** axe-core **0 violations across eight
states**, LCP 24ms desktop and 48ms mobile, CLS 3.0e-5 and 0, page height
**11,559** unchanged, `/projects/homonoia` still lands at **y 3,354**, and
`?doc` still survives a scroll to `/projects/homonoia?doc`.

**Two traps paid for in this step**, both in CLAUDE.md now. A
`/// <reference lib="webworker" />` is not scoped to its file: it merged the
worker globals into the whole project and took every `KeyboardEvent` in
camera.ts and url-sync.ts down to a bare `Event` — fourteen errors in three
files that never imported the worker. And the WebGPU backend deletes a
geometry's *index* attribute from its buffer map on dispose, so one shared
index buffer across 300 chunks would be dropped out from under all of them
by the first retirement; 30KB a chunk to not have that.

**Left for the steps that own it.** The light is §23's, and so is the sky —
the starfield still fades from level rather than from a horizon it can see.
The camera flew 2,100 units *under* the ground on the first attempt at the
flight test, which is §24 and is why that test is run level. `place()` on
the camera and the `window.__world` probe both existed for these
measurements and were taken out again.

### 23. Cel shading and atmosphere
Banded light — lit, mid, shadow, hard terminator — replacing the Phong
material outright. **Rim light on every crest in `--leader`**; it is the
single most important part of the look. Sky gradient from `--void` at the
zenith to a lighter band at the horizon, stars in the upper half, clouds as
banded volumes, height fog in the valleys. One key light. Shadows if they
hold.

The palette does not change. Brighter than §19 — bands need contrast between
them to read at all.

**Done when:** the terminator sweeps across a slope as you come round a
ridge; ridgelines are legible at distance; it is judged in motion, not in a
still.
**Report:** ms/frame with and without shadows, and a short capture rather
than a screenshot.

*Done.* **The terminator sweeps, and the rim is what the step said it
would be.** Judged in motion, on a 72-frame orbit of the massif north-west
of the opening pose (`terminator.webp`, 4.8s): the band edge crosses the
ridge at about frame 18, the lit faces come round to --paper by 36, and the
crests that turn away keep a lavender line on them the whole way. Two things
surprised me and both are below: shadows cost **nothing per frame** and 31%
of a chunk, and the *sky* turned out to be five times the cost of the
landscape until it was branched.

**The bands, and three placements were measured before this one.** `N·L`,
quantised at two edges into --rule, --dim and --paper, with the edge one
*pixel* wide — `fwidth` of the lighting term rather than a fixed width in
lighting units, which is the only way an edge stays hard on a far ridge and
un-aliased on a near one. Both edges sit **above** flat ground: at the sun's
elevation a level surface is at 0.52, the edges are at 0.64 and 0.90, and it
takes 14° of tilt toward the light to change band. The three that failed are
worth as much as the one that works — an edge *at* 0.52 turns the detail
layer into two-tone camouflage, flat ground *inside* the middle band paints
the whole foreground --dim with no relief in it, and bands with no ramp at
all make every stretch of open country a single flat fill. Each band now
leans a quarter of the way toward the next across its own width, which is
the smallest thing that puts the modelling back without softening an edge.

**The sun went from 13.9° to 32°, and that is the step's least obvious
change.** §22 set it low for the shadows, and under a smooth ramp a low sun
is only ever flattering. Band the light and it stops working: at 13.9° flat
ground is at 0.24 and the whole range gentle terrain can reach is 0 to 0.56,
so *every* threshold is within a few degrees of flat and the ground changes
band on the detail layer. The cost is shadows 1.6× the height of what casts
them rather than 4×.

**The shading normal is not the surface's own, and that is the other half of
the same problem.** A hard threshold finds whatever the normal can wobble
across, and the detail layer puts a 0.9-unit bump every 14 units — 23° of
tilt. So the normal is differenced over two samples rather than one (8% more
of the sampling loop) and then mixed a third of the way into a **landform
gradient** taken off the coarse lattice the shadow march was already
sampling. The geometry keeps every octave it had; only the light is asked a
smoother question. One more thing had to change with it: a bilinear patch is
C0 across a cell, and a hard band edge drawn over that discontinuity comes
back as axis-aligned rectangles a few units across. Easing the interpolant
fixes it in two lines.

**Rim light, in --leader, on every crest.** Grazing × backlit: a fresnel
term finds ridgelines without knowing where they are, and a gate on `N·L`
puts the line where the shape turns over rather than everywhere it is dark.
It keeps a third of itself through fog on purpose — §0.2 asks for ridgelines
legible *at distance*, and a rim that fogs like the surface it sits on is
gone by 600 units. Looking into the light from 1,600 units out, four ranges
of silhouette are drawn by nothing but this.

**Shadows hold, and they are not a shadow map.** The key light does not
move, so occlusion is a property of the field and the field is already in
the worker: march toward the sun, 14 geometric steps from 10 units out to
743, and stop when the ray clears the highest ground the field can produce.
Two decisions make it read. It marches the **landform** — a floor of 16
units on the sample spacing — because a 7-unit bump under a low light throws
a 30-unit shadow and a landscape where every pebble does that is speckled,
not lit; and it starts from the *coarse* surface, or every detail hollow
shadows itself. Sampled on a 13×13 lattice per chunk whose points are a
subset of the coarsest level's, so two levels agree where they meet, and
interpolated onto the vertices as one float attribute.

**Cost, and it is the answer to the report's own question.** ms/frame with
shadows **0.548 / 0.478 / 0.452** at the three altitudes (DPR 1, 1512×804,
240 renders between two `queue.onSubmittedWorkDone()` after a warm batch of
60); without them **0.518 / 0.472 / 0.454**. That is inside the run-to-run
noise: a baked attribute costs a fetch and a `mix`. What shadows actually
cost is **generation** — in Node, on the shipped `.ts`, a chunk is **1.10ms
and the march is 0.34 of it**, 31%, against 0.04ms for the lattice it shares
with the landform normal. §22's chunk was about half this.

**The sky was the expensive thing, and branching it was worth 5×.** The
cloud deck is a ray–plane intersection per pixel — no geometry, real
parallax, and it recedes to a line at the horizon because that is what a
plane does — but the dome covers every sky pixel in the frame, and at
altitude that is most of them. Two four-octave fractal noises came to
**1.53ms** with the ground hidden, five times the whole landscape. Putting
both behind `If(fade > 0)` and the lit sample behind `If(cover > 0)`, at
three octaves, took it to **0.31ms**. Fragment branching pays when the
branch is spatially coherent, and a cloud deck is nothing but.

| at cruise, DPR 1 | ms/frame |
|---|---|
| everything | **0.480** |
| ground + stars, no sky dome | 0.300 |
| sky dome + stars, no ground | 0.286 |
| empty (clear + blit) | 0.106 |

**Draw calls 57 / 44 / 23** at 70, 190 and 520 units of altitude, 769k /
679k / 379k triangles allocated. At DPR 1.5 the frame is 0.98 / 0.95 /
0.96ms. Against a budget of 100 calls and a 60fps frame of 16.6ms.

**No hitch, still.** 75 seconds held at boost, level: 4,500 frames, median
gap **16.7ms**, p99 18.1, max **18.9**, and **zero over 25ms**, with
`document.hidden` checked false. 1,772 new chunks in 7,996ms of worker time
(4.51ms mean, worst 9.1) — 3.6% of a three-worker pool — and the main
thread's share of them was 58.2ms in total, **worst 0.2ms in any one
frame**. Holes: zero at 70 of 75 one-second samples, worst 2 of ~140.

**Fog is two changes and one of them is a §22 bug.** The ground now fades
into **the sky's own colour in that direction** rather than into --void: a
ridge at 1,200 units arriving at the zenith colour is a horizon band the
ground is cut out of. Not all the way, though — 0.75 of it, because a range
is *darker* than the sky behind it on any night anybody has stood outside
on, and fading the whole way took the last two ranges of depth out of the
frame and left a violet wash with a rim light in it. The height term only
ever **adds**: the tempting way to write "fog in the valleys" is a density
that falls with altitude, and that quietly un-fogs the far ground, which is
the only thing hiding the edge of the world at 1,536 units.

**Bundles.** The world chunk **203,197 → 204,022** and the worker **1,265 →
1,694**, so a world load is **205,716 gzipped (200.9 KiB)** of a 400 KiB
budget — 2,016 bytes for the whole of the look. The document side is
unchanged: `motion` 49,117, `LogBand` 569 and the CSS 2,031 are
byte-identical, and the index script differs by one byte because the name of
the chunk it dynamically imports has a different hash in it. All four gates
still hold on the built site — only `?world` at ≥1024px with an adapter and
motion on fetches the scene chunk or the worker.

**Left where it is.** The DPR 1.5 cap is still in `scene.ts` and §38 still
owns whether it stays; at 0.98ms it is affordable either way now. The star
fade is finally taken from something real — there is a horizon band in
`sky.ts` and the stars come out of it — but stars, sky and ground are three
separate brightness measurements and §38 is where they are re-solved
together. And the sun is now a shared constant in `sun.ts` (the worker bakes
against it, the material shades against it), which is what §34 will have to
message when the cluster's ground moves.

### 24. Movement
Free flight as the default: pointer to look, WASD or drag to move, momentum
and damping. Altitude clamp above the terrain — a floor, not collision. Soft
bounds: fly far enough and you are turned back rather than hitting a wall.

**Done when:** the camera cannot go under the ground at any speed; a visitor
who flies into empty black can always get back.

*Done.* **The camera cannot go under the ground, and the ceiling turned out
to be the cloud deck.** All three of the things §21 left open are the same
shape — a term that reshapes the *wanted* velocity before it is damped, with
a hard clamp behind it as the guarantee — and the one number in the step
that was going to be taste was measured instead.

**The floor holds at exactly six units, in every flight that tried to break
it.** Ten held runs: level at cruise and at boost, nose down 25° and 85° at
boost, straight down on Q, forward-and-down together for 90 seconds, and
four more. Every run that descends reports a worst `y − height(x, z)` of
**6.000** — not 5.9, the clamp's own arithmetic read back out of the shipped
field on the main thread. The control is the same 90-second flight with the
clamp switched off: it ends **12,245 units under the terrain**, still flying.
What makes it a floor rather than a bounce is the pair around it — the
descent *input* is faded out over the last 24 units, and arrested downward
velocity is zeroed rather than banked, so clearing a ridge does not fire the
camera off the far side of it.

**The look-ahead is a time, not a distance**, so it is 16 units in front at
cruise and 63 at boost, sampled at four points along that leg rather than
only at the end. One sample at the end skips whatever stands between here
and there, which at boost is a whole ridge.

**The ceiling is 560 because the cloud deck is at 620.** §23's deck is a
ray–plane intersection drawn only on rays that reach it from below, so above
620 the sky loses its clouds in every direction at once — and the ground
goes with it, because the fog weights `dy` at 0.35 and a camera that high is
220 units of haze from the ground under it. Measured over the lower half of
the frame at eleven altitudes:

| altitude | 190 | 340 | 480 | 590 | 620 | 880 |
|---|---|---|---|---|---|---|
| mean luminance | 71.2 | 59.8 | 45.2 | 38.5 | 36.8 | 25.6 |
| spread (sd) | 17.8 | 24.3 | 20.4 | 20.4 | 19.8 | 11.7 |

The mean falls the whole way; what says the ground has stopped being *shape*
is the spread, and it peaks at 340 and holds near 20 to 590 before it goes.
So: soft edge 360, band 200, hard 560. **If §30 moves the deck, the ceiling
moves with it** — this is not an independent number.

**Nobody reaches either limit, and that is the construction working.** Over
the band the outward part of the input is taken away in proportion and a
drift home is added in the same, so a climb settles where they cancel:
`180(1−t) = 45t` puts boost at t = 0.8. Measured — max altitude **520.0** at
boost and **460.0** at cruise against a hard 560, and max radius **3080.0**
in every horizontal run against a hard 3200. There is no frame in which
anything stops.

**The radius is 2,600 and it is a decision about where the site is**, since
the field is infinite. What has to be inside it: Homonoia's massif, which
reaches 1,639 from the origin, and §34's four stations. Measured out of
`height.ts` in Node over the bounded disc — **80,381 samples, −24.6 to
126.2, mean 11.2, 39.9% below zero and 2.7% above sixty, 16.8 range
wavelengths across the diameter.** Mountains standing in open country, and
enough of them that the bound is not a small world.

**And it is not big enough any more (SPEC §0.2).** Two cities, four stations
and ten landmarks do not fit in 6.4km without being a theme park, so §36
raises it to 5,000. Everything measured here holds — the ceiling, the
recall, the clamp — because nothing above depends on the radius except the
sampling of the disc.

**The way back is a recall to the opening pose**, because there is no route
to return to until §31 and no chrome until §33. `R` or `Home`; any input at
all cancels it. Eased, over a duration that grows with the distance and caps
at 2.5s: from the far edge it takes **2.50s and lands on the opening pose to
0.000 units**. The floor still applies while it runs, so a recall from a
terrain-hugging profile holds clearance **6.000** the whole way home rather
than cutting a line through the ranges.

**The clamp costs 1.8µs a frame.** `height()` is **0.354µs** per call
measured in-page over 200,000 spread coordinates, and the clamp takes five;
that is 0.011% of a 16.7ms frame. **Render is unchanged**, as it should be:
**57 / 44 / 24 draw calls at 0.521 / 0.477 / 0.455 ms** at 70, 190 and 520
units (§23: 57 / 44 / 23 at 0.548 / 0.478 / 0.452), and 0.98 / 0.95 / 0.96
at DPR 1.5.

**No hitch, including in the flight §23 could not run.** Two 75-second held
boosts: level at 190, which is §23's own test, and the terrain-hugging
profile the clamp makes possible, where every chunk under the camera is at
the finest level.

| 75s at boost | frames | median | p99 | max | >25ms | chunks | gen mean/worst | holes |
|---|---|---|---|---|---|---|---|---|
| level 190 (§23's test) | 4,499 | 16.7 | 18.2 | 19.7 | **0** | 549 | 4.65 / 8.1ms | 0 |
| terrain-hugging | 4,501 | 16.7 | 18.3 | 20.5 | **0** | 632 | 5.06 / 8.0ms | worst 3 |

Main-thread attach was 23.0ms in total across the level run, **worst 0.2ms
in any one frame**. §23 generated 1,772 chunks in the same 75 seconds and
this run generated 549 — not a regression: §23's flight was unbounded and
covered 13.5km, and 75 seconds now reaches the edge at 24 and holds there.
**The world is finite, so that number cannot be reproduced and should not
be.**

**Bundle.** World chunk **204,577 + 1,694 worker = 206,271 gzipped (201.4
KiB)** of 400, up 555 bytes on §23 for the whole of the movement system. The
document side is byte-identical apart from the hash in the chunk name:
`motion` 49,117, `LogBand` 569, CSS 2,031 — **55.3 KiB**, unchanged. All
four gates verified on the built site with the probes removed.

**Two things the harness got wrong first, both worth recording.** A headed
browser loses OS focus within a fraction of a second here, and `camera.ts`
clears every held key on `blur` — which is correct, a window that loses
focus must not keep flying — so a flight driven by puppeteer's keyboard
measures 0.7 seconds of flight and 74 of coasting, and reports a beautifully
consistent clearance for a camera that is not moving. Re-asserting the key
as a synthetic event every frame fixes it and introduces the second one:
synthetic keydowns are never matched by a keyup, so `held` carries from one
run into the next, and the first ceiling test flew with W and Q still down
and measured a horizontal flight at 132 units. A dispatched `blur` between
runs is the reset.

**Left where it is.** Pointer lock is still not offered: it is a permission
prompt, a browser-drawn escape overlay and a mode with edges the reader
cannot see, and §0.6 is explicit that the world is escapable first. The
return control is a key rather than a visible affordance, the same
placeholder status `Esc` has had since §21 — **§33 owns the chrome for
both.** And one thing the flight made obvious rather than measured: at nine
units over an open valley floor the ground is a featureless fill over three
quarters of the frame. That is not the clamp; that is the case §0.2's ground
cover exists for, and it is step 27.

---

## ▲ The landscape is alive.

**SPEC §0.2 gains a subsection and §4.7 loses an exclusion, and this is
where the build order takes five more steps for it.** The list that goes is
"no trees, rocks, water, clouds, or any other landscape furniture", written
when the terrain was a background layer nobody would look closely at. It is
kept struck through in §4.7 rather than deleted: it was right for a layer
glimpsed between paragraphs and it is wrong for a world you fly through,
which is the same reversal §0 already made about everything else in that
section. Bare terrain reads as terrain at distance and as nothing up close,
because scale comes from things of known size standing on the ground.

**Decided outside this file: the vegetation is conifers.** Pines and low
scrub, high country. Not luminous, not alien. SPEC §8 held that open as the
last big creative call before the structures; it is closed.

**Everything after this shifts by five.** Entry is 30, the structures 31,
content in world 32, the guided path 33, the cluster 34, the final pass 35.
Those numbers are two shifts stale: §29 moved everything after 30 by one
more, and the divider above step 31 renumbered the rest again.

**And that is five steps of world before a single project appears in it.**
The site is a portfolio and the portfolio is currently a document behind a
query parameter. A world that is beautiful and empty is a worse outcome than
one that is adequate and inhabited, so if the choice ever comes down to one
more atmospheric layer against getting the four structures standing in it,
the structures win.

---

## Life

### 25. Geomorph
**The pop, before anything is scattered on ground that jumps.** Crossing a
split distance swaps a coarse chunk for a finer one in one frame — new
geometry, new normals, new baked shadow. In flight that reads as ground
darkening and then resolving as you approach, which is the shadow term: a
coarse chunk marches a coarse field and has less occlusion in it than the
fine chunk replacing it. **It was never measured** — §22 instrumented
*holes*, which are a bug, and a pop is a quality problem.

Each vertex carries the position it would have at its parent's resolution
and blends toward its own over the last stretch before the split distance.
The two levels are alive at once during the blend, which they already are:
the parent is retained on a four-second clock (§22). Three attributes morph,
not one — position, the shading normal and the baked shadow.

**Done when:** flying a straight line at cruise across four split distances
shows no frame where the ground changes. Capture it and step through rather
than deciding by eye — a single-frame pop is invisible in motion and obvious
in a scrub.
**Report:** the worst per-frame change across a boundary before and after,
per attribute, and ms/frame either side.

*Done.* **The pop was 8.6 units of ground in one frame and it is now 0.011,
which is a rate rather than an event.** The step's instinct that it had
never been measured was right, and the measurement is the part worth
keeping: the worst frame before is a spike in a series of zeroes, and after
it there is no series to speak of — every frame in a 700-frame flight
changes by the same hundredth of a unit and none changes by more.

**The instrument is the geometry, not the pixels.** What the reader sees is
the *drawn* surface, and the drawn surface is entirely in JS — the buffers
the worker sent, the weight `terrain.ts` wrote this frame, and `grid.ts`'s
triangulation — so the probe evaluates the same interpolation the rasteriser
does at 9,016 fixed world points and differences them frame to frame. A
pixel diff cannot do this while the camera is moving: at cruise every pixel
changes every frame, and a 0.75-unit step of the camera swamps a pop in the
mid distance. Flying at 40 units over the ground, heading 30°, stepped one
frame at a time with the chunk queue drained at each step so that what is
between two frames is the LOD and nothing else:

| worst change in one frame | height | normal | shadow |
|---|---|---|---|
| before | **8.586 units** | 19.73° | 1.0000 |
| after | **0.011 units** | 0.11° | 0.0020 |

**The distributions are the real answer.** Before: median 0.0000, forty-one
frames over 0.05 units, and the worst is isolated — `… 2.748, 0.000, 0.638,
8.586, 0.000, 0.000 …`. After: median 0.0094, maximum 0.0109, and the
neighbourhood of the worst frame is `0.0109` seven times in a row. There is
no tail. The frame a split happens on cannot be picked out of the series.

| boundary (coarser side) | before y / n / shadow | after |
|---|---|---|
| 192 — level 0↔1 | 1.172 / 19.61° / 0.047 | 0.009 / 0.06° / 0.0018 |
| 384 — level 1↔2 | 2.588 / 19.73° / 0.847 | 0.011 / 0.03° / 0.0020 |
| 768 — level 2↔3 | 8.586 / 19.16° / 1.000 | **0.000 / 0.00° / 0.0000** |

**The shadow was the worst of the three and the step named it in advance.**
A full swing from lit to occluded, 1.0000, in one frame at the coarsest
boundary — that is the "darkening and then resolving" the step describes,
and it is a whole band of colour rather than a nudge of geometry. The
outermost boundary comes back as *exactly* zero afterwards, because a root
chunk has no parent and never morphs, so its four children are born at
weight 1 holding its surface to the bit.

**Also measured undrained**, which is the flight a reader actually takes:
the same 700 frames with the workers left to arrive when they arrive. Before
4.966 units worst and 22 frames over 0.05; after 0.011 and none. A chunk
that finishes late still arrives near its birth distance, so it arrives at
weight ≈1 — the morph covers the queue as well as the split, which was not
the point of it.

**And in pixels, because the step asks for a capture rather than an eye.**
The trick is to hold the pose the frame is *drawn* from and advance only the
pose the LOD is decided from: two shots then differ by the geometry and by
nothing else. Worst 12×12 block change, luma of 255, over six consecutive
frames across the worst near-field crossing:

| | 346→7 | 347→8 | **348→9** | 349→50 | 350→1 |
|---|---|---|---|---|---|
| before | 0.00 | 0.00 | **17.20** | 0.00 | 0.00 |
| after | 0.69 | 0.97 | **0.53** | 1.16 | 0.43 |

Before, four bit-identical frames and one that moves seventeen levels. After,
the split frame is the *smallest* of the five.

**The weight is one number per chunk and the band it moves over is forced,
not chosen.** A per-vertex fade is the usual construction and it is wrong on
a quadtree: all four children are born in the same frame across the whole of
the parent's square, so a fade keyed to each vertex's own distance would
have finished at the near corner and not started at the far one — and the
far half of that square then changes in one frame, which is the thing being
fixed. So the weight is a function of the *parent's* rectangle distance,
which is the quantity the split itself is decided on, computed by the same
arithmetic in the same file. Two same-level neighbours with different
parents therefore hold different weights, and it does not open a seam: along
a shared edge both chunks agree about the ground *and* both parents agree
about it, so the two ends of the blend are equal there and the mix is the
same whatever the weight.

**MORPH is 0.55 and 0.5 is a floor with a proof under it.** The fade has to
be over by the time a chunk is replaced by its own children — they show its
unmorphed surface, so if it were still part-way to *its* parent the swap
would pop by the remainder. A chunk is replaced at half the distance it was
born at, and its rectangle is inside its parent's so its distance is never
the greater of the two: finishing by half the birth distance is exactly the
condition, at every level at once. The alternative was measured rather than
argued — at 0.8 the fade is squeezed into the outer fifth of the range, the
worst per-frame change goes from 0.008 to 0.018 units and the drawn ground
sits 0.06 units closer to the field on a level-1 chunk. Both are invisible;
only one of them is derived.

**The morph target is the parent's own arithmetic, not an approximation of
it.** `chunk.ts` now builds a surface for a block of *any* level's grid, and
a chunk is that function over its own square while its target is the same
function over the quarter of its parent it covers. Every vertex then sits
either on a parent vertex or halfway along a parent edge — and `grid.ts`'s
anti-diagonal is self-similar under a halving, so a child quad that straddles
the parent's diagonal is split along it — which makes the target the average
of at most two parent vertices for all three attributes. Checked in Node
against the parent's own chunk: **7.5e-9 units** of height, 1.9e-9 of normal,
0 of shadow. The §23 surface is untouched by the refactor: **zero difference
in every byte** of position, normal and shadow over five specs.

**What it costs to look at.** A chunk at weight 1 *is* its parent, so the
landscape spends most of each level's range part-way to the coarser one. The
number for that is how far the drawn ground is from the field itself, and it
is small: mean distance **0.04 / 0.19 / 0.45 → 0.09 / 0.30 / 0.48 units** on
96 / 192 / 384-unit chunks. What is not small is what a band edge does with
it — the opening frame differs from §24's by up to 38 luma in a 12×12 block,
because a tenth of a unit of ground at the mid distance is enough to move a
terminator. That is the trade the whole step is: the difference that used to
arrive in one frame now arrives over three seconds.

**Cost.** Draw calls and triangles are identical — **53 / 41 / 21** and
268,577 / 208,673 / 108,833 at 70, 190 and 520 units — because nothing about
which squares exist has changed. Frame cost, against the §24 build measured
by the same harness on the same machine, two runs each:

| altitude | 70 | 190 | 520 |
|---|---|---|---|
| §24, DPR 1 | 0.553 / 0.569 | 0.492 / 0.489 | 0.484 / 0.495 |
| §25, DPR 1 | 0.625 / 0.655 | 0.569 / 0.505 | 0.508 / 0.491 |
| §24, DPR 1.5 | 1.008 / 1.041 | 1.008 / 1.013 | 1.034 / 1.028 |
| §25, DPR 1.5 | 1.059 / 1.046 | 1.042 / 1.027 | 1.070 / 1.036 |

**+0.08ms at the densest stop and nothing above the noise at DPR 1.5**,
which is the shape to expect: five more floats a vertex is a vertex-bound
cost, and DPR 1.5 is where the frame is fill-bound. 0.5% of a 16.7ms frame,
against a budget of 8ms for everything §0.2 puts on the landscape.

**Generation is up 4% in the worker and 26% on a level-0 chunk.** The two are
not in conflict: the parent patch is 81 more shadow marches and 841 more
field samples against a chunk's own 225 and 2,809, and a root chunk asks for
none of it — measured in Node on one spec, 1.21ms at §23, 1.14 for a §25
root, 1.52 with a parent. Over a 75-second terrain-hugging boost the mix
comes out at **3.16–3.26 → 3.38–3.51ms mean** per chunk, worst 6.1–6.8 →
7.2–7.9.

| 75s at boost, terrain-hugging | frames | median | p99 | max | >25ms | chunks | gen mean |
|---|---|---|---|---|---|---|---|
| §24, two runs | 4,473 / 4,491 | 16.7 | 23.9 / 18.3 | 26.7 / 25.3 | 12 / 5 | 641 / 638 | 3.26 / 3.16 |
| §25, two runs | 4,488 / 4,482 | 16.7 | 18.3 / 18.6 | 25.3 / 25.3 | 8 / 9 | 648 / 641 | 3.38 / 3.51 |

Both builds end the flight at the same pose to the unit and hold clearance
**6.000** the whole way, which is §24's guarantee still standing. The
handful of frames over 25ms is this harness rather than this step: it is in
both columns and §24's own run of the same flight had none.

**Memory is where this is expensive.** Five more floats a vertex is
**109.7 → 160.4 KB a chunk**, and 180 chunks alive at the opening pose is
**19.3 → 28.2 MB** of geometry. It buys the deltas for three attributes; the
cheaper packings all trade exactness at the two ends of the blend, which is
the only property that matters.

**Bundle.** World chunk **204,820 + 2,117 worker = 206,937 gzipped (202.1
KiB)** of 400, up 666 bytes on §24 — 423 of them the worker, which is where
the parent patch lives. The document side is byte-identical apart from the
hash of the scene chunk it names.

### 26. Water
**Lakes, not rivers.** A global water level and a plane where the terrain is
below it — nearly free on a heightfield, and it fills the basins the field
already produces. Rivers need flow accumulation over the whole field or
carved channels in the generator, which is a project of its own: **not now,
and say so** rather than approximating them with noise, which reads as a
stain rather than a river.

Banded like everything else: a flat mirror of the sky gradient, `--leader`
where the key light glances off it, `--void` in shadow, one quantised
specular band rather than a smooth highlight. Still, mostly — a slow normal
perturbation, no waves. **Underwater is not a mode**: fly under and you see
the surface from below, and nothing changes about the fog or the light.

**Done when:** the valleys have bottoms, and the water level reads as one
level everywhere rather than as a plane per basin.
**Report:** ms/frame and draw calls, and the fraction of a cruise frame the
surface covers.

*Done.* **The whole step is one plane and a depth test, and it costs one
draw call, 64 triangles and nothing that can be measured in a frame.** The
terrain is opaque and drawn first, so a disc at the water level is hidden
everywhere the ground stands above it and drawn everywhere it does not:
nothing on the CPU knows where a lake is, no chunk carries a water flag, and
the shoreline is the exact intersection of two surfaces rather than a curve
anybody had to find. There is no update from the loop — the disc is centred
on the camera in the shader the way the sky sphere is.

**The level is -8 and it is a measurement, not a taste.** Over the bounded
world (radius 3,200, a 20-unit lattice, 80,381 samples, out of the shipped
`height.ts` in Node):

| level | water | bodies | over 200u across | largest | largest's share |
|---|---|---|---|---|---|
| -12 | 4.4% | 63 | 7 | 0.29 km² | 21% |
| **-8** | **11.9%** | **128** | **12** | **0.51 km²** | **13%** |
| -4 | 26.7% | 121 | 18 | 1.28 km² | 15% |
| 0 | 39.9% | 55 | 9 | 3.88 km² | 30% |

Lakes rather than a sea with islands in it: at -8 no single body is more
than an eighth of the water, twelve are big enough to fly along, and dry
islands standing inside them are 1.2% of the covered area. Mean depth is
3.67 units and the deepest point in the world is 16.6 — which §24's
six-unit floor is what lets the camera fly under.

**The fraction of a frame it covers**, measured by differencing the frame
against the same frame with the plane hidden: **7.9%** at the opening pose,
6.5% from 520 units up, 8.9% standing on a shore, and 43% / 53% looking down
a lake and flying low over one. It is *darker* than what it covers — mean
luma 48.2 against 50.8 at the opening pose, 45.7 against 67.4 on the low
pass — so it spends brightness budget rather than costing it (§38).

**Cost, on built code, against a §25 build measured by the same harness on
the same machine:**

| altitude | 70 | 190 | 520 |
|---|---|---|---|
| draw calls, §25 → §26 | 53 → 54 | 41 → 42 | 21 → 22 |
| §25, DPR 1 | 0.590 | 0.497 | 0.490 |
| §26, DPR 1 | 0.581 | 0.501 | 0.493 |
| the layer's own delta, DPR 1 | -0.008 | +0.002 | +0.005 |
| the layer's own delta, DPR 1.5 | +0.003 | +0.005 | +0.011 |

The delta is the same build with the plane hidden, which is the only
like-for-like there is. **At the poses where the water is half the frame it
is negative** — -0.024 and -0.010 at DPR 1, -0.018 and -0.009 at DPR 1.5 —
because a plane that covers a pixel takes the sky dome's two fractal noises
off it (§23), and that is why it is drawn after the ground and before the
sky rather than last.

**Nothing under it moved.** 75 seconds of terrain-hugging boost: 4,496
frames against 4,489, p99 18.2 against 18.3ms, 638 chunks either way at 3.67
against 3.54ms of generation, the same end pose to the unit and clearance
**6.000** the whole way. The worker is byte-identical — `terrain-worker` is
the same 2,117 bytes with the same hash — because water is not a thing the
generator knows about.

**The ripple had to be slowed and the reason is arithmetic.** Four
directional waves summed as *slope*, each faded out over its own reach the
way `height.ts` fades an octave; what a hard band edge sees is not the speed
but `speed / wavelength`, and the six-unit wave at 2.3 units/s was 0.38 Hz
against the longest wave's 0.03. Held between 0.03 and 0.07 Hz, with the
camera still and the clock stepped one frame at a time, the worst 12×12
block of the surface moves **2.3 levels of luma a frame against 10.8**
before — and the cloud deck, the only other thing in the frame that moves on
its own, is 1.2. Pixels moving more than eight levels: 0.003%, which is
exactly the control. Still, mostly.

**The glance is where the arithmetic puts it.** A 5.7° cone on the reflected
ray, so it lands where the view depression matches the light's 31° elevation
— 320 units out from the opening pose, 100 from a low pass — and the
ripple's 8° of deviation is what breaks it into a path rather than an arc.
Inside about 150 units it stays one slab with bites out of its edges: a
tighter cone breaks it there and reduces it to two specks at the cruise
pose, which is the view the world is flown from. It is 1.0% of the frame on
the low pass and nothing at the other four.

**One token differs from the spec, on purpose.** §0.2 says the water is
`--void` where it is not mirroring anything; it is `--void-lift`. `--void`
is the clear colour, the fog target *and* the sky at the zenith, so a lake
seen from above painted in it has no value of its own at exactly the angles
where the mirror gives it none either — it reads as a hole in the terrain
rather than as water. One step up is still the darkest thing in the frame.

**What the shoreline does under LOD is worth writing down.** It is where the
*drawn* ground crosses the plane, and §25 leaves the drawn ground 0.09 /
0.30 / 0.48 units from the field on 96 / 192 / 384-unit chunks. The
shoreline's own slope is a median of 0.081 (4.6°), so approaching a coast
slides it **1.1 units at level 0, 3.7 at level 1 and 5.9 at level 2** —
metres of shore over seconds of flight, and continuous because §25 made it
continuous. Before the geomorph it would have been a jump of the same size.

**Rivers are not here and this is the saying so.** Flow accumulation over
the field or channels carved into the generator is a project of its own, and
a ribbon of noise reads as a stain. §0.2 keeps the exclusion.

**Bundle.** World chunk **205,430 + 2,117 worker = 207,547 gzipped (202.7
KiB)** of 400, up 610 bytes on §25 and all of it in the scene chunk. The
document side is byte-identical apart from the hash of the scene chunk it
names: 55.3 KiB.

### 27. Ground cover and wind
The two together because the first is the first thing that reads the second.

**Cover:** instanced blades on a camera-relative disc, not per chunk —
exactly §16's construction for the old particle floor, which failed because
it was trying to *be* the ground and here is standing on ground that already
exists. Within about 120 units; past that it is sub-pixel and the terrain's
own colour carries it. Colour from the same three bands, one step lighter,
so it reads as growth on the surface rather than as a texture applied to it.

**Wind:** one vector field, low frequency, drifting, that everything which
moves reads — grass bends, canopies sway, motes drift, the cloud deck
advects along it. One field so they agree. Vertex animation, not simulation:
a sine of position and time, amplitude by height above the ground.

Placement follows SPEC §0.2's rule and it is not negotiable: a pure function
of `(x, z)`, no storage, no seeds carried between chunks.

**Done when:** the ground under the camera reads as ground, and nothing in
the frame leans against anything else in it.
**Report:** ms/frame with and without the disc, blade count, and the
generation cost the placement sampling adds per chunk.

*Done.* **The cover is two things, and the one that is not instanced is the
one that carries it.** The disc is 28,800 blades within sixty units of the
camera and it is one draw call; the *density* is baked onto the terrain
itself and tints the ground to the last chunk. That split is what the step's
"past that the terrain's own colour carries it" turns into once there is a
number for it: the same `cover(x, z)` decides both, so the edge of the disc
is a fade between grass on tinted ground and tinted ground, over 12 units of
a surface that is already the same colour on both sides.

**Placement is `cover.ts`, and it imports nothing that has seen a GPU.** Two
callers reach one density function — `chunk.ts` in the worker, off the
coarse lattice it already builds for the shadow march, and `blades.ts` on the
main thread, off its own five samples — so a blade and the ground under it
never disagree about whether anything grows there. Out of the shipped module
in Node, over §26's own lattice (radius 3,200, 20-unit spacing, 80,381
samples):

| height band | share of the world | mean cover | with cover at all |
|---|---|---|---|
| under the water (−8) | 11.9% | 0.000 | 0% |
| −8 to 0 | 27.9% | **0.331** | 57% |
| 0 to 20 | 32.2% | 0.244 | 57% |
| 20 to 40 | 17.0% | 0.185 | 55% |
| 40 to 60 | 8.3% | 0.114 | 49% |
| 60 to 90 | 2.3% | 0.030 | 23% |
| over 90 | 0.4% | 0.000 | 0% |

**55% of dry ground has cover on it and the mean is 0.24** — meadows and
bare rock rather than a lawn. The four inputs §0.2 names are all there and
all measurable: nothing above 90 or under the water line, half again as much
within nine units above it (0.326 against 0.197 higher up), thinner on the
range mask, and gone on anything steeper than 44°. Clumping is a 76-unit
noise thresholded rather than faded, so cover has edges: crossing the world
at five-unit steps, a run of cover has a **median length of 60 units**, p90
155, longest 470.

**What it costs the generator is nothing, and that is arithmetic rather than
luck.** The cover lattice is 169 evaluations on the same grid the shadow
march uses — and the old ring marched 196 points of which the interpolation
only ever read 169. Narrowing the march to what is read pays for the density.
Both `buildChunk`s run in Node out of the shipped files:

| chunk | §26 | §27 | |
|---|---|---|---|
| level 0, in the cluster | 1.42ms | 1.45ms | +2% |
| level 0, open country | 1.48ms | 1.48ms | 0% |
| level 1 | 1.44ms | 1.40ms | −3% |
| level 2 | 1.35ms | 1.33ms | −1% |
| level 3, a root | 0.94ms | 0.94ms | 0% |

**And the surface it generates is the same surface.** Over five specs,
position and normal are identical in every byte; the shadow differs by
**4.2e-7**, because the march now starts from the coarse height as it was
stored in a `Float32Array` rather than from the double it was computed as.
The new attribute morphs like the other three (§25) and its target is exact
to **1.9e-9** against the parent's own chunk.

**The tint is `band.ts` twice.** The band model — two edges, the ramp inside
a band, the shadow's depth — moved out of `terrain.ts` into a module of its
own, because §27 puts a second surface in those bands and §28 adds two more.
Growth is the same expression over a palette shifted one token up
(`--rule → --dim`, `--dim → --muted`, and `--paper` staying put, because
growth is not a reason to put more `--leader` in the frame), mixed by the
baked density at 0.25. **Checked: with the tint at zero and the water
hidden, this build is bit-identical to §26** — zero difference in any
channel of any pixel, at the opening pose and at a crest. The refactor
changed nothing about how the ground is lit.

A quarter of a step rather than a step, because `--rule` to `--dim` is the
largest jump in the palette and flat open country sits inside that band: at
a full step the most common surface in the world is a different colour, which
is a different landscape rather than a landscape with growth on it.

**The disc is 60 units and the step says 120.** That is a measurement. At
120 the same instance budget put **113 tufts inside the nearest 25 units and
2,069 past 100**, where a blade is four pixels tall and a dozen fall inside
one — a tint that costs a draw call. At 60 the near ground gets 516 tufts
inside 25 units, six times the cover where the reader is actually looking,
and what was given up is carried by the ground tint that did not exist when
the step was written.

**An instance is a tuft of three blades, and that is also a measurement.**
Single blades at this size came back as a field of white one-pixel streaks —
grass reads as *rain* when what is drawn is thinner than it is long with
space around it. Three blades from one root, four times as long as they are
wide, at 0.30 to 0.62 units: a stand of scrub from six units up. It is also
a third of the CPU cost per blade, because the expensive part of placing one
is the field sample under its root and a tuft has one root.

**A blade is lit by the ground it stands on.** The first build banded a
blade by `N·L` of its own near-vertical face, and at one or two pixels wide
that is not shading, it is noise: what the eye reads is whether the ground
has texture on it, and texture four bands away from what it sits on is
weather. So the cell carries the *ground's* own lighting term — the same
`N·L`, the same marched shadow, out of `chunk.ts`'s own `sunlight` — and the
blade's facing modulates it between 0.72 and 1.28 of that. The sparkle in a
stand of grass is then the ground's own terminator moving through it.

**Cost, on built code, against a §26 build measured by the same harness on
the same machine.** At the three altitudes §25 and §26 report on, the disc is
**not drawn at all** — the camera is more than 58 units over the ground, so
`mesh.visible` is false and the draw calls and triangles are identical to
§26's. What those rows measure is the tint alone:

| altitude | 70 | 190 | 520 |
|---|---|---|---|
| draw calls, §26 → §27 | 54 → 54 | 42 → 42 | 22 → 22 |
| §26, DPR 1 | 0.575 | 0.498 | 0.496 |
| §27, DPR 1 | 0.652 | 0.535 | 0.510 |
| §26 → §27, DPR 1.5 | 1.042 → 1.128 | 1.018 → 1.087 | 1.040 → 1.081 |

**+0.077ms at the densest stop for two more floats a vertex and a band
expression evaluated twice**, and about the same at DPR 1.5, which is the
shape to expect from a change that is half vertex and half fragment.

The disc's own cost is the same drained frame with the blades hidden, at
three poses low enough to draw them:

| pose | draw calls | triangles | DPR 1 | DPR 1.5 |
|---|---|---|---|---|
| a meadow, 6 units up | 50 → 51 | +86,400 | +0.052ms | +0.017ms |
| a shore, 11 units up | 54 → 55 | +86,400 | +0.034ms | +0.018ms |
| looking down, 12 up | 47 → 48 | +86,400 | +0.014ms | +0.019ms |

**One draw call and under a tenth of a millisecond**, against a budget of 8ms
for everything §0.2 puts on the landscape. 6,099 of the 9,600 tufts stand at
the meadow pose — 18,297 blades — and the rest are rejected by the density
and drawn as degenerate triangles rather than branched around.

**The fill is the part that is not free, and it is bounded rather than
low.** Placing a cell is 7.2µs: five field samples for the height and its
gradient, then — only where something grows — a shadow march and one sample
per blade. Over 75 seconds of terrain-hugging boost it filled 38,742 cells
with 19,211 marches for **0.070ms a frame**, and the worst single frame was
**2.70ms at the 96-cell budget**. The budget is what makes that a number: a
diagonal crossing at boost is 80 cells, so it is not a rate limit in flight;
it is the cap on the frame after a jump, where the whole grid is stale and
fills over seventeen frames.

| 75s at boost, terrain-hugging | frames | median | p99 | max | >25ms | chunks | gen mean |
|---|---|---|---|---|---|---|---|
| §26 | 4,491 | 16.7 | 18.3 | 25.2 | 4 | 638 | 3.67ms |
| §27 | 4,495 | 16.7 | 18.2 | 25.3 | 4 | 638 | 3.34ms |

Both end the flight at the same pose to the unit and hold clearance
**6.000** the whole way.

**Memory is where the tint is expensive.** Two more floats a vertex is
**160.4 → 180.7 KB a chunk** and **28.2 → 31.8 MB** of geometry alive at the
opening pose. The disc adds 0.8MB of instance data, uploaded as one merged
range per frame that touches it.

**The wind is numbers rather than code**, for the reason `sun.ts` is: the
four things that read it do not want the same quantity. The blades want a
bend vector, the deck wants the displacement that integrates to, the water
wants a bearing per wave at the speeds §26 tuned. So `wind.ts` imports
nothing and states the field — direction, gust, wander — and each layer's use
is one line off those constants. `windAt` is the canonical statement of it in
JS, which is what lets Node report on the shipped file:

| | direction | rate a band edge sees |
|---|---|---|
| the wind itself | bearing 150.1°, **90° off the opening view axis**, 21° off the key light | — |
| gust wave | along it | 9 units/s over 120 = **0.075 Hz**, one gust every 13.3s |
| direction wander | ±9° across it | 0.038 Hz |
| blade flutter | per blade | 0.28 Hz at 0.3 of the strength |
| cloud deck | along it, 3.34 units/s (§23's rate, to the digit) | 0.022 Hz |
| water, four waves | 8, −14, 22, −19° off it | 0.032 / 0.043 / 0.054 / 0.067 Hz |

**Everything in the frame is within 22° of one direction**, and every rate is
inside the 0.02–0.075 Hz band §26 established except the blade's own flutter.
That one is measured rather than argued, on §26's instrument — the worst
12×12 block of luma between two frames a sixtieth of a second apart, over a
shore where the deck alone is 1.06 and §26's water took the frame to 1.80.
At 0.4 Hz the grass measured **4.24**, which made it the fastest thing in a
world whose water had to be slowed down to belong in it. At 0.28 Hz it is
**1.53** with the deck and 1.93 for the whole frame: the grass adds half a
level to what was already moving.

**What it costs the brightness budget**, which §38 owns and this step only
has to report:

| pose | mean luma §26 → §27 | lower half of the frame | brightest 12×12 |
|---|---|---|---|
| the opening pose | 48.2 → 49.6 (+3.0%) | 61.0 → 63.8 (+4.7%) | 192.0 → 192.0 |
| a meadow | 69.2 → 75.9 (+9.6%) | 80.1 → 91.8 (+14.6%) | 197.4 → 197.4 |
| six units over it | 69.4 → 75.3 (+8.6%) | 82.1 → 92.4 (+12.6%) | 198.1 → 198.1 |
| a shore | 59.4 → 66.4 (+11.7%) | 64.9 → 76.6 (+17.9%) | 199.7 → 199.7 |

The ground where cover is heavy gets up to an eighth brighter and **the
brightest local average in the frame does not move at all** — it is a cloud,
and nothing here touches the deck.

**Bundle.** World chunk **207,103 + 2,407 worker = 209,510 gzipped (204.6
KiB)** of 400, up 2,727 on a like-for-like §26 build (204,691 + 2,112, both
carrying the same 20-byte measurement hook this build was measured with and
ships without). The document side is byte-identical apart from the hash of
the scene chunk it names.

### 28. Rocks and trees
Instanced meshes, three or four variants each, one draw call per variant per
chunk, placed per the same pure function. Built from primitives like
everything else here — a conifer at this distance and this palette is a
silhouette, and a silhouette is a cone and a trunk.

**They must cast into the shadow term.** A tree with no shadow reads as a
decal; the worker already marches the field (§23), so a disc of occlusion
under each one baked into the vertex attribute the ground already carries is
the cheapest honest answer. **LOD will pop the way §25 fixes** — fade by
scaling to zero over a distance band rather than switching or clipping.

**Rocks are the cheaper half and probably the better one:** scattered stone
on slopes and scree at the foot of cliffs does more for scale than trees do,
because it reads at every distance and does not need a treeline. Build them
first, and if only one of the two survives the budget it is this one.

**Done when:** altitude is readable from the ground cover alone — a treeline
you can see from above — and nothing stands on a slope it could not hold.
**Report:** ms/frame, draw calls, instances at cruise, and the per-chunk
generation cost against §23's 4.51ms.

*Done.* **Two draw calls for the whole world, not one per variant per
chunk.** The step's construction does not survive a quadtree: the same ground
is covered at four levels at once, so "the trees of this chunk" is not a set
— a tree on a boundary belongs to a level-0 leaf, to the level-1 parent
standing in for it while it generates, and to the level-2 chunk both were
subdivided out of, and it would be drawn once, three times or not at all
depending on which of them the frustum keeps. So it is §27's construction
instead: **a world-fixed grid of cells mapped toroidally into one buffer,
carried with the camera**, one mesh per species. The variants come with that
rather than against it — a conifer's height, its breadth against that height
and its yaw are three floats in the instance, so there are more shapes than
the step's three or four and fewer draws than its eight.

**Placement is `scatter.ts` and it imports nothing that has seen a GPU**, the
way `cover.ts` does, and for a sharper reason: the tree is drawn on the main
thread and **the shade under it is baked in a worker**, so the two ends have
to agree about conifer 1 of cell (i, j) to the bit or there is a pool of
shade with nothing standing in it. Out of the shipped module in Node, over
§26's own lattice (radius 3,200, 20-unit spacing, 80,381 samples):

| height band | share of the world | mean conifer | mean stone | any stone |
|---|---|---|---|---|
| under the water (−8) | 11.9% | 0.000 | 0.002 | 1% |
| −8 to 0 | 27.9% | 0.235 | 0.053 | 44% |
| 0 to 20 | 32.2% | **0.301** | 0.058 | 47% |
| 20 to 40 | 17.0% | 0.247 | 0.077 | 51% |
| 40 to 60 | 8.3% | 0.093 | 0.143 | 57% |
| 60 to 90 | 2.3% | 0.000 | 0.302 | 65% |
| over 90 | 0.4% | 0.000 | **0.380** | 63% |

**The two species are each other's complement and that is the treeline.**
Conifers peak at 0.30 in the low country and are gone by 58; stone starts at
0.05 there and is the only thing left over 90. **42% of dry ground is
forest**, in stands with edges — crossing the world at five-unit steps, a run
of forest has a median length of 125 units against a scree field's 75. The
disc holds 2,702 conifers and 1,589 boulders at the opening pose, 4,042 and
1,903 in a valley — and those are the *browser's* counts, which match Node's
to the instance, because both ends call one function.

**608 units, and 370 was the number this step was nearly shipped with.** The
first build reached 370 — six times the grass — and put **no tree at all in
the opening frame**. At 190 units up and 9° of pitch the bottom edge of the
frame is 39° below the horizon, so the nearest ground anybody can see is 246
units away horizontally and 315 along the view, which is past where a
370-unit disc has already faded everything to nothing. What a camera-relative
layer is sized against is not how far you can see; it is **where the near
edge of the frame lands**, and at cruise altitude that is most of the way to
the old reach. Stone keeps a shorter one (420) because it is an order of
magnitude smaller: a four-unit boulder is eight pixels there where a
twelve-unit conifer is fifteen at 590.

**An object's own `N·L` has to be compressed into the bands, and this is the
finding of the step.** `band.ts` puts its edges at 0.64 and 0.90 around flat
ground at 0.52 — 14° of tilt to leave the low band. A cone standing upright
has facets at every angle: its sunward face is at **0.99** and the one beside
it at 0.10, so three bands become four bands across one tree. Measured, and
not subtle: the first build's conifers came back as a field of white spikes
and its boulders as white confetti, both the brightest things in the frame.
Mapping `N·L` into a range instead — 0.05 to 0.86 for a conifer, 0.30 to 0.84
for stone — is what makes an object cross *one* edge.

**A conifer bands one step down, which is the direction §27 does not go.**
`band.ts` gains a −1 rung (`--void-lift`, `--rule`, `--dim`, `--paper`) and
the whole ladder shifts, unlike +1's: going up, `--paper` and `--leader` stay
put because the top of the world is already as bright as it may be, and going
down there is no such ceiling to hold. A pine at night is darker than the
ground it stands on, and a treeline is legible from above because the forest
is a *mass with an edge*.

**The shade is baked, and only at the finest level.** §0.2 asks for "a disc
of occlusion under each one baked into the vertex attribute the ground
already carries", so it is the conifers' canopies projected downsun as
ellipses onto §23's shadow lattice and multiplied into the term the march
produced — no second attribute, no second pass, and it morphs like the rest
of the shadow because it *is* the rest of the shadow. Splatted rather than
gathered: a gather pays for a cell once per lattice point that could see it,
where this walks each cell once and touches the handful of points its trees
darken.

Level 1 was in the first build and had to come out. A level-1 chunk reaches
576 units and the trees fade out at 590, so **the shade outran the thing
casting it**: the far ridges came back covered in soft dark ellipses with
nothing standing in them, which reads as holes cut in the ground. Level 0
reaches 288 and is fully morphed in by 158, so what is left is the error in
the other direction — a tree past that distance whose pool has not arrived —
at a distance where the pool is a dozen pixels. It is not a seam either way:
a level-0 chunk is *born* showing its parent's surface, which has no stands
in it, so a forest's shade fades in at exactly the rate its geometry does.
Rocks cast nothing at all, and that is arithmetic: a four-unit boulder throws
six units of shadow at this sun's 32° against an eight-unit lattice.

**Does it reach the frame?** The same poses on this build and on one whose
occlusion constant is zero, with the trees themselves hidden so what is left
is the ground alone:

| pose | ground pixels changed | mean drop | worst drop |
|---|---|---|---|
| in a forest, 9 units up | 3.7% | 1.7 | **75.2** |
| a treeline from 90 up | 2.3% | 6.4 | 69.2 |
| looking down from 30 | 10.7% | 2.3 | 46.4 |

**It is a band edge where the ground is near one and a shading ramp where it
is not** — the same thing the terrain's own marched shadow is, which is the
point: 75 levels of luma under a tree on a slope, two on a flat forest floor
where the whole pool sits inside the low band.

**What it costs the generator is 4%, and the two early-outs are why.** Both
`buildChunk`s run in Node out of the shipped files, over the same specs:

| chunk | §27 | §28 | |
|---|---|---|---|
| level 0, in the cluster | 1.55ms | 1.60ms | +3% |
| level 0, open country | 1.59ms | 1.65ms | **+4%** |
| level 1 | 1.54ms | 1.54ms | 0% |
| level 2 | 1.46ms | 1.46ms | 0% |
| level 3, a root | 1.03ms | 1.04ms | +1% |

A level-0 chunk walks about ninety 16-unit cells. The first is the clump
noise — one call, no field sample — and the second is the altitude window off
a single coarse height; between them they reject nine cells in ten before
anything expensive happens. The cell box is also **asymmetric**, because a
shadow only runs one way: fourteen units of margin upsun of the lattice and
under one downsun of it, which is a quarter fewer cells for no shade at all.
Against §23's 4.51ms per chunk this is still well under.

**And the surface it generates is the same surface.** Over five specs,
position, normal and cover are identical in **every byte**; only the shadow
moves, and only where a conifer stands. The new shade morphs like the rest of
it and its target is exact to **0.0** against the parent's own chunk.
Geometry per chunk is unchanged at 180.7 KB — nothing was added to a vertex.

**Cost, on built code, against a §27 build measured by the same harness in
the same session.** Two draw calls and 485,184 triangles, at every altitude
the camera can reach — unlike the blades, which are not drawn above 58 units:

| altitude | 70 | 190 | 520 |
|---|---|---|---|
| draw calls, §27 → §28 | 54 → 56 | 42 → 44 | 22 → 24 |
| triangles, §27 → §28 | 268,641 → 753,825 | 208,737 → 693,921 | 108,897 → 594,081 |
| §27 → §28, DPR 1 | 0.626 → 0.881 | 0.539 → 0.820 | 0.511 → 0.693 |
| §27 → §28, DPR 1.5 | 1.103 → 1.238 | 1.073 → 1.185 | 1.075 → 1.175 |

The layer's own cost, the same drained frame with the two meshes hidden and
shown:

| pose | draws | triangles | DPR 1 | DPR 1.5 |
|---|---|---|---|---|
| in a forest, 9 units up | 53 → 55 | +485,184 | +0.347ms | +0.123ms |
| a treeline from 90 up | 56 → 58 | +485,184 | +0.328ms | +0.121ms |
| the opening pose | 42 → 44 | +485,184 | +0.279ms | +0.095ms |
| a scree slope from 14 up | 55 → 57 | +485,184 | +0.376ms | +0.136ms |

**Under four tenths of a millisecond at DPR 1 against a budget of 8**, and
*less* at DPR 1.5 — the delta halves there, which is the shape to expect from
pure vertex work landing on a frame that is already fill-bound. It is seven
times the blade disc's cost for six times its reach and ten times its object
count. The honest caveat: **86% of the rock buffer is degenerate at any
moment**, because the two species share the trees' grid and stone reaches
420 of its 608 — one draw call's worth of vertex work that is never seen, and
the price of not sampling the field twice.

**The fill is bounded rather than low**, §27's construction and §27's numbers.
Over 75 seconds of terrain-hugging boost it filled 20,431 cells with 13,619
shadow marches for **0.15ms a frame**, worst single frame **1.30ms** at its
128-cell budget — under the blade disc's own worst of 1.50 in the same run,
because a diagonal crossing at boost is 24 of these cells against 80 of those.

| 75s at boost, terrain-hugging | frames | median | p99 | max | >25ms | chunks | gen mean |
|---|---|---|---|---|---|---|---|
| §27, run first | 4,500 | 16.7 | 17.6 | 23.5 | 0 | 643 | 3.36ms |
| §28, run second | 4,500 | 16.7 | 17.7 | 22.2 | 0 | 641 | 3.14ms |
| §28, run first | 4,505 | 16.7 | 17.6 | 50.2 | 5 | 639 | 3.66ms |
| §27, run second | 4,530 | 16.7 | 17.7 | 25.1 | 1 | 635 | 3.11ms |

**Both orders, because one order is not a measurement.** Whichever build goes
first in a session pays for the cold start and comes back 0.3–0.5ms slower
per chunk with the session's only outlying frames in it — run the control
first and §28 looks *faster* than it. Averaged over the two positions the
mix is 3.24 against 3.40ms, a 5% cost, which is what a 4% level-0 chunk works
out to over a flight that generates every level. Every run holds clearance
**6.000** and ends at the same pose to the unit.

**The wind is the gust wave and nothing else.** §0.2 asks for one field, and
the canopies read the same 0.075 Hz travelling wave the grass does, with the
same wander across it — what is per tree is *stiffness*, not phase, because a
phase offset would destroy the travelling band and a band moving downwind is
the only thing that makes a gust read as wind rather than as a pulse. Nothing
is added to the spectrum §26 and §27 measured. On §26's instrument — the
worst 12×12 block of luma between two frames a sixtieth of a second apart,
over a forest:

| layer | worst 12×12 in one frame |
|---|---|
| the cloud deck alone | 1.35 |
| with the grass | 1.81 |
| with the canopies | **1.53** |
| the whole frame | 1.68 |

A conifer is wood: the canopies add 0.18 levels where the grass adds 0.46,
which makes them the slowest-moving thing added to this world since the deck.

**What it costs the brightness budget it gives back.** §38 owns this and the
step only has to report it, but the direction is the story:

| pose | mean luma §27 → §28 | lower half | brightest 12×12 |
|---|---|---|---|
| the opening pose | 49.6 → 49.1 (−1.1%) | 63.8 → 62.7 | 192.0 → 192.0 |
| in a forest | 62.6 → 52.2 (**−16.6%**) | 84.5 → 67.8 | 214.2 → 214.2 |
| a treeline from 90 up | 69.8 → 67.7 (−3.0%) | 79.4 → 77.8 | 175.0 → 175.0 |
| a scree slope | 93.0 → 92.9 (−0.1%) | 120.2 → 119.9 | 213.8 → 213.8 |

A layer of dark silhouettes over a light landscape is the first thing in
seven steps to *lower* the mean, by a sixth of it in a forest — and the
brightest local average does not move at all in any frame, because it is a
cloud and nothing here touches the deck.

**Boulders are twenty-four faces, and eight was measured first.** An
octahedron scaled three ways is a rhombus from every angle, and a slope of
them came back as a scatter of floating crystals; what makes a lump of stone
read is that its outline has more corners than its shading has bands. Flatter
than wide, and buried — the centre sits 0.12 of a half-axis over the ground,
so about two fifths of the stone is under the surface and it lies *in* a
slope rather than on it.

**Bundle.** World chunk **210,770 + 3,254 worker = 214,024 gzipped (209.0
KiB)** of 400, up 3,743 on a §27 build in the same session (207,869 + 2,412),
of which the worker is 842 — the shade bake and the placement rule it needs.
The measurement hook both builds were driven through lives in the *entry*
script rather than in the scene chunk, so these are the shipping bytes to the
digit. The document side is **56,595 (55.2 KiB)** of 120, and the only thing
in it that moved is the hash of the scene chunk it names.

### 29. The arrival, as a throwaway
**Not a feature. A question with code attached**, and the only step in this
file whose code is deleted at the end of it.

Everything from §31 on assumes the world and the document can be one thing:
that huge Archivo in `--paper` over a cel-shaded violet landscape reads as
one design rather than as two projects stapled together. Nothing has tested
that, and §32 is where finding out is expensive — four more steps of world
would already be built around the assumption.

So: build the cheapest possible version of the arrival, look at it, and
throw it away. It sits after §28 because rocks and conifers mean there is
something standing in the world to fly at.

**What to build** — the smallest thing that answers the question.

- **One placeholder object** in the landscape, a few hundred units from the
  opening pose. A box, a monolith, anything with a silhouette. It is not the
  scene §34 designs and it should look nothing like a candidate, or the
  test becomes about the object.
- **Scroll drives the camera toward it.** A curve from the opening pose to a
  framing of the object, evaluated at scroll position, smoothstepped. §18's
  `curve.ts` is the shape of this and most of it can be lifted back.
- **The camera settles** into a fixed composition when the scroll reaches the
  station — the object framed to one side, the landscape live behind it.
- **Real type arrives**, in document mode's own register: machine ID in mono,
  the headline at display size, the metric strip, and a paragraph at the
  beats' own measure. Use Homonoia's actual content — invented copy would
  test the wrong thing.
- **A gradient scrim behind the type**, no edge, per §17's construction.

Free flight stays on a key. Everything else in the world runs unchanged.

**What not to build.** Every one of these is a real step later and none of
them is the question: not four stations, one. Not the writeup panel's
chrome, close control, or URL sync. Not the three landmark states. Not the
real structures. Not world-first entry — it lives at `?world` like everything
since §21. Not a scroll bar, a progress readout, or any affordance at all.
And **no measurement pass**: no brightness harness, no per-layer frame cost,
no flight test. This code does not ship and its numbers are worthless.

Rough is the point. If it takes more than a session it has stopped being a
probe and started being §31 built early.

**The question it answers** is one, and it is a judgement rather than a
number:

> **Does the type belong in the world?**

Sub-questions worth looking at while it is on screen, and none of them worth
building extra to answer. Does display type at `--t-hero` over a landscape
read as composed, or as a caption over a screenshot? Does the scrim look like
a gradient or like a panel with the edge blurred? Is a live world behind text
distracting while reading, or is it what makes the frame feel inhabited — try
it with the grass and clouds stilled to compare. Does the camera settling
read as arriving somewhere, or as stopping? At the settle, is the object
worth having flown to?

**The three outcomes.**

*It works.* Steps 31–38 proceed as specced and this probe's framing becomes
the reference for §31. Delete the code.

*It works, with changes.* Most likely: the type wants a different size in the
world than on the page, or the scrim wants to be stronger, or the settle
wants to be a slower ease. Write those down as constraints on §31 — that is
the probe having paid for itself.

*It does not work.* The register is wrong and the two cannot be married as
they stand. That is the valuable outcome and it is why this is happening now:
four steps of world are still unspent and the options are open — change the
document's register in world mode, change the world's palette where text
sits, put the reading somewhere that is not over the landscape, or reconsider
world-first entirely.

**Done when:** the arrival has been flown and looked at.
**Report:** which of the three, in a sentence, with two screenshots — the
station framed with type, and the same frame with the type hidden.

*Done, and the answer is the second one: **it works, with changes.*** Archivo
at `--t-2xl` in `--paper` over the landscape reads as **composed** — a
frame with a subject on the right and a column on the left — rather than as a
caption over a screenshot, and nothing about the register had to move to get
there. Four constraints came out of it, and they are what the probe was for.

**The code is deleted.** What is left is this section. The probe was one
file (`probe.ts`), a `--scrim` token brought back from §17, and four lines of
`scene.ts`; §31 and §32 rebuild all of it properly and against four stations
rather than one.

**What was built.** A 42×13×9 slab at (−450, −293), sited in Node against the
field — 500 units down the opening view axis, on dry ground flat enough to
stand on, and deliberately nothing like a candidate for §34. Wheel delta
accumulated into a 0..1 progress and damped, because Lenis is stopped and
there is no scroll *position* behind an opaque canvas — the gesture is what
the question is about. The camera lerped between two poses on a smoothstep
with a floor under it, and Homonoia's machine ID, headline, metric strip and
first paragraph **cloned out of the document underneath** rather than
retyped, scoped styles and all. `F` released it to free flight.

### The framing, which is what §31 asked for

| | |
|---|---|
| opening pose | (−60, 190, 60), yaw 30°, pitch −9° |
| station | (−390, 22, −191), yaw 47°, pitch −3° |
| the object | 42 units tall, 118 units out, 26 above the eye's own ground |
| where it lands | ~65% of the frame's width, base on the horizon line |
| the column | left, `--s-16` in, 45ch, vertically centred |
| the type | last 38% of the journey, smoothstepped |

**The yaw is 17° off the bearing to the object**, which is what puts it right
of centre with the type clear of it. That number is the composition: at 0°
the slab is behind the paragraph and at 30° it is at the edge of the frame.

### The four constraints on §31 and §32

**1. The metric strip does not fit a 45ch column.** Four metrics at
`--t-xl` wrap to two rows with a stranded fourth and uneven gaps — the
document gives the strip a full-width row and the world gives it a column.
It needs its own width outside the column, a tighter gap, or fewer than four
in world mode. It is the only thing in the frame that is visibly *laid out
wrong* rather than merely different.

**2. The display size needs no change.** §29's own question named
`--t-hero`, which does not exist; the token is `--t-2xl`, `clamp(2.5rem, 7vw,
5.5rem)`, and at 1440 that is a 100px headline over a landscape. It reads. It
was the thing most likely to fail and it did not.

**3. The scrim is right as §17 built it, and it does a second job nobody
specified.** Solid to 60% of its own 60%, no edge, no border — and over a
*lit* landscape rather than a `--void` page it is still invisible as an
object. What it also does is hold the reading half of the frame still: over
one second at the station, the mean luma behind the column changed by **0.01
levels against 0.23 in the open half**, because the two things that move —
the cloud deck at the top of the sky and the grass in the near ground — are
mostly outside the column and the scrim damps what is left. So the
sub-question answers itself: **a live world behind text is not distracting
and nothing needs stilling.** Do not build a still mode for §31.

**4. The arrival needs something after it.** The camera reaches a fixed pose
and stops dead. The damped gesture eases the approach, so it does not jolt —
but with no residual motion at the station it reads as *the scroll running
out* rather than as having arrived somewhere. A slow drift, a parallax, or a
last few units of travel after the type is up is the fix, and choosing which
is §31's.

**And the other half of the worry is answered too.** §28's conifers are what
made this frame judgeable: the mid-flight picture is a slab standing against
a massif with a treeline on it, and the station has forest across the whole
left of the frame behind the column. The world stopped being bare at 28,
which is why this probe sits after it.

**And the other half of the worry.** Separately from this probe, and worth
saying because it is the same sentence from the other side: **the world feels
bare because nothing stands in it.** Terrain, water and grass, and no object
anywhere. Steps 28, 30 and 34 are exactly that — rocks and conifers, motes
and cloud volume, and the four scenes — so the plan already answers it.
This probe is scheduled after §28 rather than before it for that reason:
there should be something in the frame that is not ground before anyone
judges whether type belongs over it.

### 30. Motes and cloud volume
The two atmospheric ones, together because they share the wind field.

**Motes:** instanced points drifting in the air near the ground, denser over
water and vegetation, sparse on bare rock, in `--mint` — the second accent
§2 has held in reserve since it came off the Vulpix. Slow, wandering, and
they must not read as dust: dust falls and drifts, these rise and hesitate.
Additive and fogged, and the one thing in this world allowed to be brighter
than the ground it is over.

**Cloud volume:** §23's deck is a ray–plane intersection and you cannot
reach it. Add a small number of billboarded, banded forms in the near field
that the camera can pass through, under the same deck — flying into one
should dim and diffuse the world for a second and come out the other side.
The single most flight-like thing in this block and the one most likely to
look bad: soft billboards in a hard-banded world is a contradiction. Try it,
look at it, **cut it if it fights the shading** and say so.

**Done when:** the air is not empty, and flying into a cloud is a thing that
happens to the frame.
**Report:** ms/frame per layer against SPEC §0.7's 8ms cruise ceiling, which
this step is the last one spending against.

*Done, and the cloud volume is kept.* **Two layers, two draw calls, 5,858
triangles and 2,253 gzipped bytes**, and between them they cost under a tenth
of a millisecond at the poses the world is composed from. The step's own
warning — "cut it if it fights the shading" — came very close to being taken,
and what saved it was finding out *why* it looked wrong rather than deciding
that it did.

**Motes are §27's construction for the third time**, and there is nothing new
in the machinery: a world-anchored grid of 676 cells at 10 units, mapped
toroidally into one buffer, refilled only where the cell has moved, 96 cells a
frame. What is new is that a mote has **no state at all** — it is a phase.
`fract(t·rate + phase)` runs a cycle in which it fades in low, rises with
pauses in it, travels downwind, and fades out; a mote that leaves the disc and
comes back is exactly where it would have been. The rise is
`f(t) = t − (A/2πk)·sin(2πkt)`, whose derivative is `1 − A·cos(2πkt)` — at
A = 0.94 and k = 3 it comes within 6% of a stop three times on the way up and
never quite stops, which is §0.2's "rise and hesitate" written as a term
rather than as an easing. The same `f` drives the downwind travel, so the
hesitation is in every axis at once.

**The density rule is `air.ts`, a third pure placement module**, and it is
its own file for one reason: §0.2's claim is about the *world* — "denser over
water and vegetation, sparse on bare rock" — and a claim that can only be
evaluated inside a WebGPU material is a claim nobody can check. Out of the
shipped module in Node over §26's lattice (radius 3,200, 20-unit spacing,
80,381 samples):

| height band | share of the world | mean cover | mean density | motes a cell of 4 |
|---|---|---|---|---|
| under the water (−8) | 11.9% | 0.000 | **0.863** | 3.27 |
| −8 to 0 | 27.9% | 0.331 | 0.407 | 1.90 |
| 0 to 20 | 32.2% | 0.244 | 0.316 | 1.72 |
| 20 to 40 | 17.0% | 0.185 | 0.255 | 1.45 |
| 40 to 60 | 8.3% | 0.115 | 0.181 | 1.03 |
| 60 to 90 | 2.3% | 0.031 | 0.092 | 0.53 |
| over 90 | 0.4% | 0.000 | **0.060** | 0.34 |

Monotone the whole way down from the water line: **water carries 5.46× the
air of bare rock over 40 units and the low vegetated country 2.27×**, world
mean 0.379. The floor is 0.06 rather than 0, because a bare crest at night
still has air over it and a layer that switches off over rock would draw the
treeline a second time in a colour nothing else in the world wears. In the
browser that is 1,340 motes at a meadow, 1,239 at a shore and 325 on a crest,
of 2,704 slots.

**`--mint` is off the shelf after twenty-eight steps**, and it is the whole
answer to what §2 was holding it for: the one thing in the world that is
neither lit by the key light nor marking state. §2's rule survives intact —
`--leader` still means *elected* — because a mote means nothing at all
except that the air is not empty.

**The one finding on the motes is a rate, and §26's instrument found it in a
single reading.** The worst 12×12 block of luma between two frames a sixtieth
of a second apart, over a meadow:

| layer | first build | shipped |
|---|---|---|
| the cloud deck alone | 1.03 | 1.86 |
| with the grass | 2.08 | 2.78 |
| **with the motes** | **10.02** | **2.72** |
| with the cloud forms | 1.03 | 1.30 |
| the whole frame | 10.32 | 4.36 |

Ten levels is four times the fastest thing in a world whose water was slowed
down to belong in it (§26), and none of it was a band edge crawling. It is
arithmetic about a **point**: at a 9-second cycle a mote rose 1.4 units a
second, which twenty units away is 0.066° a frame — one pixel, on a core four
pixels across. A dot that crosses its own width in four frames is a firefly on
fast-forward. Two changes and neither is a fudge: the cycle went to **18–34
seconds** (§0.2 says *slow*, and 0.24 units a second downwind against the gust
wave's 9 is the motes agreeing with the wind about direction and disagreeing
about speed by a factor of forty), and a **near fade** was added at 6 to 17
units — because §24's floor holds the camera 6 units over ground that motes
stand 15.6 above, so at any low pose some of them are a hand's width from the
eye, and a mote that close is thirty degrees of frame rather than a point of
light. The near fade alone took 5.51 to 2.72.

**The cloud volume was nearly cut and the reason it looked bad was a bug, not
a contradiction.** Three builds, and the first two are the report:

1. **A lobed disc that does not fit inside its own quad.** The outline is
   `r / (1 + LOBE·sin(kθ + φ))`, and coverage that reaches `EDGE·(1 + LOBE)`
   past 1 is cut off by the quad's own edge — the first build's reached 1.20
   against an inscribed radius of 1. What comes back is a set of shapes with
   three or four dead-straight sides. It reads as **cut paper**, and "soft
   billboards fighting a hard-banded world" is exactly what it looks like from
   the outside. 0.84 × 1.15 = 0.97 is the whole fix.
2. **A lit face asked as an angular sweep.** `dot(direction from the centre,
   the sun in this plane)` puts the terminator on a straight line through the
   middle of every puff, so a cluster reads as folded paper. A cloud's lit face
   is a *region*: it is the deck's own construction (`sky.ts`), a second sample
   of the same shape displaced away from the light, and the lens where the two
   overlap is a crescent with the puff's own lobed outline in it. It has to be
   displaced by a whole radius — the lens is 61% of the disc at half a radius
   and 39% at one, and at the first build's 0.42 every form came back almost
   entirely `--paper`, which is a daytime cloud in a world that is night.
3. **A body that is `--rule` disappears.** Against this sky at cloud altitude
   the two are very nearly the same value, so the shaded part of every puff
   vanished and what was left was a white lens floating with no cloud around
   it. The three tones are 0.42, 0.71 and 1 of the way to `--paper`, which is
   the deck's own spacing.

**And the decision that makes it work is that a form is never seen close up.**
A puff fades out over the same band the murk fades in, so what a reader flying
into a cloud sees is a shape ahead, then the world closing in, then the shape
behind — the billboard is what a cloud looks like from outside, the murk is
what one looks like from inside, and neither is ever asked to be the other.
The murk lives in **`fog.ts`**, because being inside a cloud is a fact about
how far you can see: one uniform multiplying the density there, one mix in
`sky.ts`'s `haze` (which every opaque surface already fogs toward), one on the
dome, one on the stars, and one on the terrain's rim — which is the term that
would otherwise still draw a violet line along a crest nothing else in the
frame can see. **No post pass, no second target, no fifth material**, and it
costs nothing measurable: the same poses on both builds with §30's two meshes
hidden come back −0.022 to +0.022ms, inside the noise.

**A transit, at cruise:** the camera stepped along a straight line through the
middle of a form at 45 units a second, reading the murk the shipped layer
writes.

| along (units) | −270 | −45 | 0 | +90 | +180 | +240 | +270 |
|---|---|---|---|---|---|---|---|
| murk | 0.000 | 0.62 | 1.000 | 1.000 | 1.000 | 0.681 | 0.213 |
| mean luma | 47.9 | | 48.2 | 75.2 | 35.2 | | |

Murk is over 0.02 for **7.8 seconds and 353 units**, and at 1.000 for 218 of
them — which at boost is 2.0 seconds. §0.2 asks for "a second"; a 300-unit
cloud crossed at cruise takes seven, and that is the cloud's size rather than
a tuning. The frame inside is not a colour: mean luma *rises* to 75 halfway
through, because what is left when the world goes is the other eight puffs of
the same form looming in the murk.

**Placement is a pure function of a cell in *cloud space*** — the world
sliding downwind at the deck's own 3.34 units a second (§27) — so the forms
advect with the deck over them and nothing is ever re-placed as they do. 25
cells, a fifth of them empty, 9 puffs each: **one draw call and 450
triangles**, rebuilt only when the camera crosses a cell, which over 75
seconds of boosted flight happened **6 times for 0.2ms in total**. Two
sizing findings came out of looking at the opening pose: the puffs have to be
big against the spread (38–72 against ±78 read as a bunch of grapes at three
hundred units; 52–98 against ±76 reads as one silhouette) and the forms need a
**far fade at 1,150** — left to fog out on their own they are still a third
opaque at seven hundred units, and the opening frame came back with nine small
grey lumps strung under the deck's own band.

**Single-sided, and that is a draw call.** The renderer draws a transparent
*double*-sided object twice — back faces, then front — so the first build cost
two draw calls and 900 triangles for a layer whose back is never toward the
eye by construction.

**Cost, on built code against a §28 build measured by the same harness in the
same session.** Every camera-relative layer is settled for the pose being
measured, which is a change to the harness and applies to both builds:

| altitude | 70 | 190 | 520 |
|---|---|---|---|
| draw calls, §28 → §30 | 56 → 58 | 44 → 45 | 23 → 24 |
| triangles, §28 → §30 | 753,825 → 759,683 | 693,921 → 694,371 | 316,833 → 317,283 |
| §28 → §30, DPR 1 | 0.900 → 0.925 | 0.833 → 0.831 | 0.613 → 0.632 |
| §28 → §30, DPR 1.5 | 1.279 → 1.283 | 1.195 → 1.227 | 1.083 → 1.104 |

The motes are the second draw call at 70 and are **not drawn at 190 or 520**,
the same way the blades are not: the layer is gated on ground within 126 units
and the cruise pose is 199 over it. Each layer's own cost, the same drained
frame with the mesh hidden and shown:

| pose | dpr | + motes | + cloud forms | motes shown |
|---|---|---|---|---|
| a meadow, 14 up | 1 | +0.024 | +0.011 | 1,340 |
| a meadow, 14 up | 1.5 | −0.011 | +0.001 | |
| a shore, 11 up | 1 | +0.016 | +0.003 | 1,239 |
| a shore, 11 up | 1.5 | −0.013 | +0.016 | |
| a crest, 22 up | 1 | +0.011 | +0.005 | 325 |
| a crest, 22 up | 1.5 | −0.012 | +0.042 | |
| the opening pose | 1 | −0.003 | +0.008 | not drawn |
| the opening pose | 1.5 | +0.003 | +0.035 | |
| standing off a form | 1.5 | +0.000 | **+0.075** | not drawn |
| inside a form | 1 | −0.001 | **+0.183** | not drawn |
| inside a form | 1.5 | +0.003 | **+0.653** | |

**Against a ceiling of 8ms this is the cheapest block in the file.** The motes
are at the instrument's floor and *negative* at DPR 1.5 at three of four
poses, which is the shape to expect from pure vertex work on a fill-bound
frame; the cloud forms are the opposite and their worst case is inside one,
where a few large quads cover the frame — 0.653ms of a budget of 8, at the one
pose where the sky dome's two fractal noises are entirely hidden behind them.

**The fill is bounded and it is the smallest of the three.** Over 75 seconds
of terrain-hugging boost the mote disc filled 10,221 cells for **0.072ms a
frame, worst single frame 1.90ms** at its 96-cell budget — against the blade
disc's 0.409 and worst 4.50 and the stand grid's 0.405 and worst 4.00 in the
same run. There are no shadow marches in it: a mote is a light, not a surface.

| 75s at boost, terrain-hugging | frames | median | p99 | max | chunks | gen mean | clearance |
|---|---|---|---|---|---|---|---|
| §30, run first | 2,251 | 33.3 | 35.0 | 35.4 | 674 | 8.62ms | 6.000 |
| §28, run second | 2,251 | 33.3 | 35.0 | 35.4 | 677 | 8.99ms | 6.000 |
| §28, run first | 2,251 | 33.3 | 34.9 | 35.3 | 674 | 8.87ms | 6.000 |
| §30, run second | 2,251 | 33.3 | 34.9 | 35.3 | 677 | 8.44ms | 6.000 |

Both orders per §28. Every run holds clearance **6.000** and ends at the same
pose to the unit, and the generator is untouched — the worker is **byte
identical** across the two builds, neither layer having anything to bake.
**The honest caveat on that table: this session's compositor presented at
30 Hz** — measured directly, an rAF median of 33.40ms with the tab foreground
— so the intervals are vsync rather than work and "frames over 25ms" is not a
number this session can produce. What is unaffected is everything timed as a
batch between two `onSubmittedWorkDone`, which is every ms/frame figure above.

**Brightness, which §38 owns and this step only reports.** §4.7's instrument,
the same poses on both builds:

| pose | mean luma §28 → §30 | lower half | brightest 12×12 |
|---|---|---|---|
| the opening pose | 49.1 → 50.4 (+2.7%) | 62.7 → 62.7 | 192.0 → 192.0 |
| a meadow | 74.6 → 74.8 (+0.3%) | 91.7 → 91.8 | 197.4 → 197.4 |
| a shore | 63.8 → 63.9 (+0.1%) | 76.1 → 76.1 | 199.7 → 199.7 |
| a crest | 49.5 → 53.4 (+7.8%) | 63.8 → 63.8 | 211.0 → 211.0 |
| standing off a form | 43.3 → 47.3 (+9.2%) | 38.8 → 41.4 | 214.7 → 214.7 |
| inside a form | 43.7 → 48.1 (+10.1%) | 40.5 → 40.0 | 213.9 → **127.2** |

**The brightest local average does not move in any frame that has a sky in
it** — it is the deck, and neither layer touches it. The motes, which §0.2
licenses to be the one thing brighter than the ground it is over, cost the
mean **0.1 to 0.3%**: a bright dot is cheap on this instrument precisely
because it is small, and a 12×12 block with a mote in it is mostly
background. The only reading that moves at all is the one where the murk
*removes* the deck, and it takes the brightest thing in the world down by 40%.

**Bundle.** World chunk **212,221 + 3,223 worker = 215,444 gzipped (210.4
KiB)** of 400, up 2,253 on a §28 build in the same session (209,968 + 3,223) —
of which the worker is **0**. The document side is **56,338 (55.0 KiB)** of
120 and the only thing in it that moved is the one byte of the scene chunk's
hash. Both builds were rebuilt with every measurement hook removed, so these
are the shipping bytes to the digit.

---

## ▲ The world is inhabited.

**SPEC §0.3 and §0.4 are replaced and §0.2 gains a subsection, and this is
where the build order turns for the third time.** Nothing §21–§29 built is
withdrawn — the terrain, the water, the cover, the stands, the shading, the
camera and the probe's findings all stand. What changes is what the world is
*for*.

**Three things go, and they are kept struck through in the SPEC rather than
deleted:**

| was | now |
|---|---|
| **Free flight is the default**, with a guided path for people who will not fly (§0.3) | **Scroll is the site and free flight is what you earn.** Scroll is what everybody does to a website without being told; free flight is a mode nobody discovers by accident. The route is the default and the last station unlocks the stick |
| Each project is **a structure** — "something built, standing in the terrain" — and what the four are is the biggest open question in the SPEC (§0.4, §8) | **Each is a scene.** Philoi is two workstations sharing one document; Homonoia is five nodes passing something between them. A structure needs explaining; a scene *is* the explanation. §8's question is answered, and what is left open there is scale |
| **No collision.** The ground is a height function and the camera is clamped above it (§4.7) | **True of terrain only.** Everything *built* is solid — oriented boxes in a spatial hash. Scattered things (trees, rocks, grass, water) are still flown through |

**And the world gains twelve landmarks and two cities** (§0.2), which is what
free flight is *for*: a visitor handed the stick in a world of four stations
and ten thousand ridges has a control with nothing to point it at. The
cities are visitable — you fly down between the towers and the towers are
solid — and the world bound goes from 2,600 to 5,000 to hold them.

**Everything after 30 is renumbered.** Motes and cloud volume keep their
number; the route is 31 and entry drops to 33, because the route is the site
and a world with no route is a demo. The old numbering, and where it went:

| was | now |
|---|---|
| 31 Entry | **33** |
| 32 The four structures | **34**, as scenes |
| 33 Content in world | **32** (the writeup at a station, the three states, URL sync) |
| 34 The guided path | **31**, promoted: it is the route, and it is the default |
| 35 The cluster at Homonoia | **Absorbed into 34.** Homonoia's scene *is* five nodes and an election, so a step of its own would build the same thing twice |
| 36 Brightness, performance, accessibility | **38**, and it re-solves for a world with cities in it |

**31 and 32 before everything else.** If the budget ever runs out, a site
with four stations and no landmarks is finished; a site with twelve
landmarks and no route is not.

---

## The projects as places

### 31. The route
**Scroll drives the camera, four stations, and the settle** (SPEC §0.3).
One scroll top to bottom, and it is a flight: arrival high over the
landscape, travel, settle into a composition, climb away, four times, and
the offer of the stick at the end.

- Position along the route is scroll position, damped, evaluated on a curve.
  §18's `curve.ts` is the shape of it and its discipline is the requirement:
  a pose is a pure function of its input, in a module with no three and no
  DOM in it
- **§29's framing is the reference** — two poses, the 17° yaw offset that
  puts the subject at 65% of frame width with the column clear of it
- **Its fourth constraint is the thing to get right.** A camera that reaches
  its pose and stops dead reads as the scroll running out rather than as
  arriving. A slow drift, a parallax, or a last few units of travel after
  the type is up; choosing which is this step's
- Free flight is not the default any more. It stays on a key until §35
  builds the unlock, and §24's camera is untouched underneath

**Done when:** one scroll carries a reader past four stations and each
settle reads as arriving somewhere.
**Report:** the four station poses, what the residual motion is and why,
ms/frame along the route.

*Done.* **The route is `route.ts` and it is arithmetic** — no three, no DOM,
`height.ts` its only import — so Node runs the shipped `.ts` and every number
below is that file's own output. `scroll.ts` is the other half: the gesture,
damped, plus the one clock that is not scroll. The camera is untouched
underneath except for the flag that decides who is holding it.

**The four stations, searched against the field** the way §22 found the
opening pose and §29 sited its slab. Level ground a scene can stand on, proud
of what is around it, the next one visible from the last one's climb-away, no
leg doubling back, and Enargeia in the opening frame — because §0.3's 0% row
says *stations visible in the distance* and a station you cannot see is a
claim rather than a place.

| | site | ground | settle pose | stand-off | level to | proud by |
|---|---|---|---|---|---|---|
| **Enargeia** | (12, −967) | 46.0 | (3, 62, −835) yaw 13.1 pitch 1.0 | 133 | 10.0 over a 55 pad | +7.4 |
| **Homonoia** | (−520, −900) | 57.2 | (−327, 109, −1359) yaw 174.2 pitch −2.7 | 497 | the massif | −18.3 |
| **Philoi** | (−1040, 280) | 42.5 | (−991, 57, 169) yaw 173.2 pitch 0.7 | 122 | 13.8 over a 50 pad | +28.9 |
| **Basis** | (−1640, 1300) | 19.7 | (−1508, 35, 1243) yaw 130.4 pitch 0.9 | 144 | 8.5 over a 50 pad | +15.2 |

Legs 1,030 / 536 / 1,289 / 1,183 units, every sightline clear of the ground by
34 to 44 units from the previous station's climb-away, radii 968 / 1,039 /
1,077 / 2,093 inside a bound of 2,600, and 4,039 units of ground end to end.
Philoi is 210 units from open water and Basis is the quietest ground of the
four, which is what §0.4 asks of it.

**Homonoia is where the field already puts it, and that was a decision.** The
chain was first searched on a copy of `height.ts` with the cluster term moved
out of the world, which gave a better-spaced route — and then a screenshot of
the opening frame settled it: **the massif at (−520, −900) is the biggest
thing in that frame**, 4.4° off the view axis at 1,064 units. §22's pose was
composed against a range at 380–900 and the massif came out behind it by
coincidence, but the coincidence is now the composition. Moving it to suit the
route would have cost the world its front door, so the route bends around it
and Enargeia stands in front of it at 492 — where the uplift is worth 1.7
units, so the knoll is its own landform rather than the massif's skirt.

**The framing is a rule, not four poses.** Stand off far enough that the scene
is a quarter of the frame's width, aim at 0.4 of its height, turn 17° off the
bearing to it. That reproduces §29's numbers exactly — a subject 21 units
across at 118 — and it puts the subject at **67% of the frame's width and 50%
of its height at all four stations**, with its base at 55–63%: §29's slot, and
the reading half clear. The two numbers §34 gets to change per station are the
scene's radius and its height; everything else follows.

**The route is 21 keyframes over 12,067 scroll units**, with the settles at
19%, 43%, 71% and 95%. (**22 over 12,567 since §32**, settles at 18.3 / 41.4
/ 68.2 / 91.2%: the last station had no climb-away, which is recorded under
§32 — the ramp-out, the overshoot and §35's own beat all wanted the key that
every other station already had.) Travel is paced at one scroll unit per world unit with
a floor of 1,100, because the leg to the massif is 536 units and at pace alone
it was flown in a fifth of the scroll the leg after it took. The opening pose
owns the first 500 so that "arrival" is a beat rather than the first wheel
notch — and it *drifts* through them rather than holding, twelve units along
the view axis, because a mouse wheel is a hundred pixels a notch and five
notches into a held opening the only honest reading is that scrolling is
broken. Between keyframes it is smoothstepped, as §18 did it. The route
never uses §24's floor: the least clearance over the ground anywhere on it is
**13.0 units** against a clamp at 6.

### The residual, which is §29's fourth constraint

**A last few units of travel, on a clock rather than on scroll.** The camera
creeps 14.3 units toward the subject and 3 down after the settle is reached —
an exponential with τ = 4.5s, so it leaves the settle at **3.15 units a
second** (7% of cruise), has covered 2.85 units after one second, 9.60 by five
and 13.32 by twelve. The aim is re-derived from the moving position, so the
subject holds its place at 67% while the near ground slides across the frame:
the parallax and the travel are the same term rather than two.

It is on a clock because the alternative does not answer the constraint. A
residual that is a pure function of scroll stops exactly when the scroll
stops, which is the failure §29 named. This one outlives the gesture by about
ten seconds — which is the reading, which is what §32 puts there.

Both ends are continuous. The creep is scaled by the arrival clock *and* by a
band weight that is 1 across the dwell and ramps to 0 at the keyframes either
side, so scrolling off a settle does not snap the pose back: with the creep
fully out, the worst step anywhere on the route is **1.130 units per scroll
unit**, the same as with it fully in.

### The route has a top speed, and finding that out took two wrong caps

Scroll is not paced by the hand the way a document is. Flown with a
continuous 1,500px/s scrub, the first build put the camera at **4,512 units a
second** against a cruise of 45 and a boost of 180 — 75 units of travel in one
16.7ms frame. That is not fast travel, it is a smear.

So the damped step is measured *as a pose* and scaled back to **420 units a
second**, which is §24's soft-bound construction again: nothing is stopped and
nothing is refused, the world simply has a speed. Two caps failed first and
both are worth writing down.

**A chord across the step is not a speed.** The first cap compared
`poseAt(at)` with `poseAt(at + step)` and divided — and a step that spans a
keyframe has the route arriving at rest and leaving in another direction, so
the two ends can be close together with sixty units of flight between them. It
measured as capped and flew at 4,512.

**The local rate is not one either**, for the mirror-image reason: *at* a
keyframe the rate is zero by construction, so a cap taken there permits any
step at all — the second build reached **15,410 units a second** in the frame
that crossed one. What works is the maximum rate sampled over the whole
candidate step, five probes, which can only be conservative and which
converges because a smaller step is sampled over a shorter span. Cost:
**0.48µs a frame** while it is binding, against the camera clamp's 1.8.

**A bound on how far the gesture may run ahead of the flight was built and
taken out.** It holds the catch-up to a few seconds and it does that by
throwing away scroll the reader made — measured, a full-route scrub ended
5,957 units short of where it had been scrolled to. A reader who scrolls a
page and is not where they scrolled to has been lied to, and that is worse
than a long fly-past. So the target is always where the gesture put it, and
the cost is the tail below.

### Flown

Two ways of reading, on the built site, the site's own loop running and the
pose read off the camera rather than off the pixels (§21).

| | frames | speed median | p95 | worst | over 25ms | least clearance | tail |
|---|---|---|---|---|---|---|---|
| a reader (600px, then 700ms) | 1,500 | 283 | 463 | 632 | 6 | 12.6 | **0.0s** |
| a scrub (1,500px/s, continuous) | 1,442 | 272 | 459 | 669 | 5 | 12.8 | **14.0s** |

Speeds in units per second over frames of 8ms or more — a shorter interval is
two rAF callbacks inside one presented frame and its speed is an artefact of
the sample. rAF median 16.4ms either way, worst 26.9. Never more than **3
chunks pending** in a frame, and the altitude clamp never fires.

**At reading pace the cap costs nothing** — the camera is where the scroll
says by the time the reader stops. The 14 seconds is what a top speed costs
when someone throws the whole route past in eight: the flight is 22 seconds of
world and the gesture asked for it in a third of that.

### ms/frame along the route

41 poses — every keyframe and the midpoint of every segment — on the same
batch-between-two-`onSubmittedWorkDone` instrument as §24–§30:

| | draws | triangles | ms DPR 1 | ms DPR 1.5 |
|---|---|---|---|---|
| median of 41 | — | — | **0.865** | 1.341 |
| worst of 41 | 61 | 783,744 | **0.984** | 1.458 |
| Enargeia's settle | 59 | 783,744 | 0.984 | 1.414 |
| Homonoia's settle | 55 | 738,816 | 0.846 | 1.413 |
| Philoi's settle | 58 | 738,816 | 0.962 | 1.430 |
| Basis's settle | 58 | 753,792 | 0.950 | 1.363 |

Draws 45–61 over the whole route against §30's 58 / 45 / 24 at three
altitudes; the settles are low enough that the blade disc and the motes are
drawn, which is where the extra draws and the extra tenth of a millisecond
are. Of a budget of 8.

**Free flight is on `F` until §35**, and the round trip is what §35 needs:
handing the stick over zeroes the velocity (the route's own delta is a
thousand units a second on a flick and inheriting it would fling the reader
across the world), the wheel moves the route by **0.0 units** while the stick
is out, and pressing it again picks the route up at the station nearest to
wherever the reader flew to and *eases* there rather than cutting. The cursor
names the mode: `grab` only while flying.

**Bundle.** World chunk **214,426 + 3,223 worker = 217,649 gzipped (212.5
KiB)** of 400, up **2,205** on §30 in the same session, of which the worker is
0 — the route bakes nothing. The document side is **56,338 (55.0 KiB)** of
120, unchanged to the byte.

### 32. Content at a station
The writeup arrives, in document mode's own register, over the scene — the
same HTML the document serves, cloned rather than retyped (§29 proved that
path). The three landmark states: distant silhouette, approaching (name and
machine ID resolve), arrived (the writeup opens). URL sync in both
directions: arriving at Enargeia pushes `/projects/enargeia`, and loading
that URL drops you there.

- **The metric strip is re-laid for a column** — §29's first constraint, and
  the only thing in that frame that was visibly laid out wrong. Its own
  width outside the 45ch column, a tighter gap, or fewer than four in world
  mode
- The scrim is §17's, unchanged, and **there is no still mode** — §29's
  third constraint measured that a live world behind text is not
  distracting

**Done when:** close the writeup and you are where you were, still on the
route; deep links and the back button both work in both modes.

*Done.* **The content layer is `station.ts` and it holds nothing of its
own.** Every element in the column is `cloneNode`d out of the document
underneath — the machine ID row, the headline, the summary, the metric
strip, the links and the writeup — so the register is not reproduced, it is
the same nodes carrying the same classes and the same Astro scope
attributes. What the module adds is three things and no words: the states,
the column's own travel, and the address bar.

**The three states are one number**, and it is `bandAt()`'s weight, which
§31 already computes: 0 across the travel, a smoothstep over the last 700
scroll units of the approach, 1 across the dwell, and a ramp back out over
the climb away. The name resolves over 0.10–0.55 of it and the writeup opens
over 0.62–1.0, reaching 1 exactly at the settle keyframe — which is what
"arrived" means. The address bar changes hands at 0.5, well clear of both
ramps. **"Distant" is the absence of the panel**: there is nothing standing
at a station until §34, so the silhouette arrives with the scene rather
than here.

**Two clones needed correcting and both were found by looking at them.**
The `<h3>` is rebuilt as an `<h2>` — the document's own `<h1>` and `<h2>`
are behind an opaque canvas and out of the accessibility tree, so the level
moves up to where it actually sits — and ids and inline styles are stripped,
because `projects.ts` leaves GSAP's `opacity: 0` on `.headline` for most of
a pin and a clone taken mid-pin arrives invisible.

### The dwell is the reading, which is what makes the writeup fit

The column is **715 to 1,150px tall against a frame of about 700**. That is
not a layout to solve: it is the writeup, at the document's own 45ch, and a
station's reading is longer than the screen it is read on.

So the dwell pays for it. The camera holds one pose for 600 scroll units at
a settle, and those units move the column instead — one scroll unit to one
pixel, and faster only if the column is longer than the dwell. There is no
second scroll position and no wheel to intercept: `scroll.ts` is still the
only gesture and `route.ts` still the only pose. Measured, how far the
column runs past the frame:

| | 1512×804 | 1440×900 | 1280×800 | 1024×768 | 1024×640 | 1024×560 |
|---|---|---|---|---|---|---|
| Enargeia | 255 | 159 | 259 | 234 | 362 | 442 |
| Homonoia | **476** | 380 | 480 | 455 | 583 | **663** |
| Philoi | 373 | 277 | 377 | 353 | 481 | 561 |
| Basis | 119 | 23 | 123 | 124 | 252 | 332 |

Homonoia binds at every width, as it does in document mode. One in six
exceeds the dwell and only at 560px of height, where the rate goes to 1.105
pixels per scroll unit and the reading still finishes before the camera
leaves.

### The metric strip, and the headline with it

§29's first constraint: four metrics at `--t-xl` wrap to two ragged rows in
a 45ch column with a stranded fourth. Fixed with the first two of the three
options it offered — **its own width outside the column** (`min(64ch,
50vw)`: 655px at 1512, 512 at 1024) laid on **two even tracks**, and the gap
in from `--s-8` to `--s-6` across and `--s-4` down. Four metrics are a
square, three leave a cell empty rather than stranding one, and nothing is
dropped. The strip ends at 719px against the subject's 824 at 1512, so it
stops short of where §34 stands.

**The headline needed the same treatment and that was not predicted.** A
`<br>` in the frontmatter is content's decision about where a headline
breaks, and a 45ch column re-breaks it: "Raft, made visible" came back as
three lines instead of two and took the column 236px further past the
frame. It takes `max-content` up to 52vw now, which honours the authored
break at all four and still stops well short of the subject.

**The close control moved, for a reason only a screenshot gives you.** It
was fixed to the frame's top-left, which is correct until the column
travels — 200 units into Homonoia's reading, the word CLOSE was sitting
inside an 88px headline. It is in the meta row now, at the column's right
edge, and it travels with the heading it belongs to. `Esc` is what covers
the scrolled case: **one escape key, two things to escape, innermost
first** — an open writeup closes, and only with nothing open does `Esc`
leave the world.

**The scrim is §17's, unchanged**, brought back as a `--scrim` token that is
`--void` at 92% written as a mix rather than as a fifth near-black. Solid to
60% of a 60vw element, no edge, no border, no radius. Its opacity is
`max(0.5 × name, writeup)`: half up while a headline is resolving over the
landscape, all the way up for an open writeup, and back to half when the
reader closes it — which is the approaching frame again, which is a good
frame. **No still mode**, per §29's third constraint.

### Both directions of the URL, and two bugs that were the same bug

`replaceState`, never push — §4.6's rule, and the route crosses four
stations, so a reader who scrolls it twice would have sixteen entries behind
them. §32's brief says "pushes"; that is the one place it is not taken
literally, and both modes now behave identically because of it. What makes
the back button *work* is the other direction: a popstate resolves to a
station and jumps the route to it, which is the same call a deep link makes
on load.

**Twelve deep links, measured, all landing:**

| | lands |
|---|---|
| `/?doc#slug`, all four | the section's pin start, headline at opacity 1.00 |
| `/projects/slug?doc`, all four | the same |
| `/projects/slug?world`, all four | that station's settle, writeup open, URL agreeing |

Back and forward inside world mode were flown too: at Basis, back → Philoi's
settle with the writeup open; forward → the arrival, no station.

**Two bugs, and they are one shape: an address read too late.**

1. **The world's entry point was read at mount**, which is behind an adapter
   request and a dynamic import — and by then `url-sync` has rewritten the
   path to whatever section of the *hidden* document its observer found in
   the middle of the viewport, while `projects.ts` moves that document twice
   (once against the fallback font, again on `fonts.ready`). Measured: a deep
   link to Philoi landing at **Homonoia**. `world.ts` captures the address at
   import now, before the observer's first callback, and hands it down.
2. **Document mode had the same failure from the other end.** `url-sync`'s
   `replaceState` writes a bare path, which drops the fragment — so by the
   time `projects.ts`'s re-jump is finally correct (on `fonts.ready`, with
   the pins measured in the face the page renders with) `location.hash` is
   empty and the correction returns early. Captured at import too.

**And underneath both of them, one that predates this step entirely.**
**Lenis clamps a scroll target to its own cached limit**, and every jump in
this codebase is made *because* the document just changed height — a pin
created, a pin released, a deep link corrected. Its ResizeObserver has not
fired yet, so the limit is the page's height *before* the change. Measured:
`/#philoi` asking for 5,927 and getting **4,105**, which is Homonoia, one
project early — and reproduced at §31's HEAD, so every document-mode deep
link past the first has landed short since the beats shipped. `jumpTo`,
`jumpBy` and `jumpToTop` re-measure first now; it is three reads on a
handful of deliberate jumps, against a correction that never arrives. §17
reported all four deep links landing at beat 1 and that report was made
before the pins were long enough for the clamp to bite.

### What it costs

**Nothing was added to the scene**, so §31's draw calls and ms/frame stand
unchanged by construction. What is added is a full-viewport DOM layer over a
WebGPU canvas, and the GPU batch instrument cannot see that — so the
measurement is Chrome's own style and layout counters over 12-second
windows at 1512×804:

| | frames | recalcs | recalc ms/frame | layouts | task ms/frame |
|---|---|---|---|---|---|
| no station in frame | 360 | 360 | 0.099 | **0** | 3.250 |
| Homonoia, writeup open | 360 | 360 | **0.084** | **0** | 3.354 |
| Homonoia, dismissed | 360 | 360 | 0.084 | **0** | 3.301 |

**One style recalc a frame and zero layouts in every configuration**, and
the recalc is *cheaper* with the layer up than without it — which is to say
it is inside the noise. The layer writes five custom properties a frame and
guards each against a change under a thousandth; it measures its own height
on arrival, on resize and on `fonts.ready`, never per frame, and that is
what keeps the layout count at zero. Total main-thread task time is
**+0.104ms a frame** with a writeup open.

**rAF cannot be reported from this session.** The compositor presented at
30 Hz with the tab genuinely foreground — median 33.3ms, p95 34.1 — in all
eight samples, open and dismissed, at all four settles. That is the tell
CLAUDE.md already records; the counters above are per-frame *work* and are
unaffected by the present rate.

**Accessibility.** axe-core clean in document mode at `/` and on a deep
link, 13 focusables and 11,559px of document — both unchanged. World mode
came back with **three `region` violations** and now has none: the
document's `<main>` is behind an opaque canvas and out of the tree, so the
station panel is a named landmark of its own (a `<section>` labelled by its
own headline). Two focusables are reachable at a station — `Close` and
`Live` — one at Basis, which has no live link. Focus is dropped rather than
left sitting on an element that has just become invisible.

**Bundle**, A/B against a §31 build in the same session at the same gzip
level. World chunk **215,985 + 3,250 worker = 219,235 gzipped (214.10
KiB)** of 400, up **1,541**, and the worker is byte-identical — the content
layer bakes nothing. Document JS **56,507 (55.18 KiB)** of 120, up **38**,
which is the two captured addresses and the Lenis re-measure. CSS 2,035 →
**2,524**.

### Three fixes, after looking at it

**1. The column read the raw route position, so at speed it stepped.**
Document mode does not, and the reason is two layers of smoothing rather
than one: Lenis eases the scroll *and* GSAP's `scrub: 1` lerps the timeline
toward wherever that lands. Here `scroll.ts` damps the gesture but its output
is still a position, and a band weight taken straight off a position
inherits every step in it.

The weight is damped **once, upstream** now, and the three ramps, the scrim
and the address bar all read the damped copy — `1 - exp(-dt/τ)`, never a
per-frame constant. **Two τ, deliberately far apart.** The fades take
**0.30s**, which is longer than `scroll.ts`'s own 0.22, so the words settle
*after* the camera does — the right order, and the one that reads as
arriving. The reading takes **0.09s**, five frames at 60Hz: it is the
reader's wheel moving text, and lag there is what feels broken, so it needs
just enough to take the step out of a 35px-a-frame scrub and no more.

A jump is exempt, which is §31's own rule one level up: a deep link, the
back button and §35's rejoin move the route by thousands of units in a
frame, and easing that fades the column in from nothing under a camera that
is already there. The route's cap is 420 world units a second against a peak
of 1.130 world units per scroll unit, so the largest step a gesture can
produce is about 12 scroll units — the threshold is 400.

Measured on built code, both builds in one browser session at a steady 16.7ms
rAF, flying the whole route three ways. The figures are the **largest and
95th-percentile single-frame change** in the first block's opacity, the last
block's, and the reading in pixels:

| | first block | last block | reading, worst | reading, p95 |
|---|---|---|---|---|
| slow (a notch, then 250ms) | 0.090 → **0.062** | 0.098 → **0.057** | 11.7 → **8.6** px | 11.5 → **8.5** |
| a reader (600px, then 700ms) | 0.127 → **0.098** | 0.151 → **0.065** | 37.7 → **30.3** | 34.0 → **18.8** |
| a scrub (1,500px/s) | 0.125 → **0.098** | 0.151 → **0.050** | 255.8 → **65.5** | 255.8 → **31.3** |

**A quarter of the screen of text moving in one frame is what the scrub was
doing**, and it is 65px now, with the 95th percentile down from 256 to 31.
The last block's worst opacity step is down 67%. The first block's is the
least improved and that is the ramp's own gain rather than the damping:
`NAME_IN` compresses 0.40 of the band onto 0–1 and a smoothstep peaks at
1.5×, so 3.75× of whatever the weight does. Ten frames for a headline at a
1,500px/s scrub is the floor worth having — a longer one would never reach
full before the station is behind the reader.

The other tell that it is easing rather than stepping is the count: at
reading pace the reading now moves on **295 frames instead of 72**, at a
median of 0.6px instead of 15.9.

**2. Three phases, not two.** The body splits into `.facts` (the metric
strip and the links) and `.read` (the summary and the writeup), each
independently banded. Three equal ramps of **0.40 of the band, staggered by
0.25**:

| | band | scroll units of the 700-unit approach |
|---|---|---|
| the name — machine ID, period, headline | **0.10 → 0.50** | 70 → 350 |
| the numbers | **0.35 → 0.75** | 245 → 525 |
| the reading | **0.60 → 1.00** | 420 → 700 |

Equal lengths and a stagger shorter than a ramp, so they overlap in pairs
and the column arrives as one cascade rather than three cuts. The first
begins at 0.10 rather than 0 so a station merely on the horizon shows
nothing, and **the last ends at exactly 1.0**, which is the settle keyframe
— the pose the whole composition is judged at. Measured on the approach into
Enargeia: at y=1930 the name is at 0.967 and the numbers at 0.176; at y=2080
the numbers are up and the reading is at 0.372; at the settle all three read
**1.000**. Leaving runs it backwards — at y=12300 on the climb out of Basis,
the name is 1.000, the numbers 0.509, the reading 0.

The wrapper keeps the reader's dismissal and the two blocks keep the
arrival, so nested opacity multiplies them rather than one number
arbitrating both. Column height is **1,168px at Homonoia before and after**
— `visibility`, never `display`, so no phase changes the layout.

**It costs one reorder: the numbers now sit above the summary.** That is
what three *contiguous* phases require, and it is not a loss — it is §29's
own judged frame, which was the machine ID, the headline at display size,
the metric strip, and then a paragraph.

**3. Basis, diagnosed before it was fixed — and it was neither hypothesis.**

- **The state ramps are identical at all four.** Measured out of `route.ts`
  in Node: 0.06 / 0.20 / 0.39 / 0.61 / 0.80 / 0.94 / 1.00 over the last 600
  scroll units at every station. They are a function of the band weight and
  of nothing else, so a shorter column cannot make them finish early.
- **The approach is not the fastest either.** Total world path from the
  previous station's hold to the settle, per scroll unit: Enargeia 0.511,
  Homonoia 0.516, Philoi **0.626**, Basis 0.563. Philoi's arrival is the
  quickest of the four.
- **What is actually different is that the last station has no climb-away.**
  `bands[3].after` indexed one past the end of the key list, so `bandAt` held
  Basis's weight at **1.00 to the final scroll unit** — the writeup never
  ramped out — and `LENGTH` *was* the end of the dwell. That second half is
  the one a reader feels: `scroll.ts` clamps `want` to `LENGTH`, so **every
  overshoot lands on the tail of the reading**. One flick anywhere in the
  approach flies the whole arrival at the 420-unit cap and parks with the
  column scrolled to its bottom and nowhere further to go. That is "arrives
  faster and ends abruptly", and it is one cause with two symptoms.

Fixed in `route.ts`, by the code path the other three already use: the last
station climbs away too. It has no next station to aim at, so it turns back
at the massif — the biggest thing in the world, and what §22's opening frame
is composed against — and the route ends at (−1408, 177, 1047) looking
across the ground it crossed, with Philoi about 8° off the view axis. §35
hangs the offer of the stick on that key. Basis's band now ramps 1.000 →
0.000 over the climb exactly as the other three do, and the route is 22
keyframes over **12,567** units with the settles at 18.3 / 41.4 / 68.2 /
91.2%. Least clearance over the ground is unchanged at **13.00 units** (at
Enargeia's settle, as before) and the peak rate is unchanged at **1.130**
world units per scroll unit.

**What was left alone, and why.** Basis's dwell is still mostly empty — its
column runs 119px past the frame against Homonoia's 476, so the reading ends
119 of 600 scroll units in. The rate could be scaled per station to spend
the whole dwell everywhere, and it is not: a wheel notch that moved Basis's
short column at a fifth of Homonoia's speed is exactly the inconsistency
that reads as broken. One scroll unit is one pixel at every station, and
what the tail of the dwell is *for* is §31's residual creep.

**Cost, re-measured against the §32 build in one session at 60Hz**, 12-second
windows at 1512×804:

| | recalcs/frame | recalc ms/frame | layouts | task ms/frame |
|---|---|---|---|---|
| no station — §32 / now | 1 / 1 | 0.073 / **0.072** | **0 / 0** | 2.210 / 2.201 |
| writeup open — §32 / now | 1 / 1 | 0.057 / **0.055** | **0 / 0** | 1.996 / 1.985 |
| dismissed — §32 / now | 1 / 1 | 0.057 / **0.050** | **0 / 0** | 2.144 / 2.117 |

**Layouts stay at zero.** Six custom properties a frame instead of five, and
a loop over four panels instead of one, cost nothing measurable — the
inactive three write nothing, because `put()` compares before it sets.

Everything else re-verified: twelve deep links land, axe clean in both modes,
back and forward, the stick, and both escapes. **Bundle** 216,279 + 3,250
worker = **214.38 KiB** (+294 on §32, worker byte-identical), document
56,508 (55.18 KiB), CSS 2,548 (+24).

### The end of a gesture settles into a station

A reader who stops just short of a station rests just short of it: the
headline half up, the numbers arriving, the camera still on the approach.
Nothing is wrong with that frame and it is not the one the station was
composed for. So the end of a gesture near a settle finishes the arrival.

**Document mode does not do this, and the model is worth naming precisely
because it is not a snap.** `projects.ts` pins each section for 220% of the
viewport, so most of the page's scroll length *is* a beat and wherever a
reader stops they have stopped inside one. The world has no pins — a settle
is a keyframe with 2,300 to 3,367 units of travel either side — so the same
guarantee has to be made a different way.

**The window is 350 scroll units, on the approach side only.** That is half
of `SETTLE_IN`, and it is not a round number so much as a readable state: at
the far edge of it the band weight is 0.5, so the machine ID and the
headline are fully up and the metric strip is a third in. The reader is
plainly at the station and the snap finishes an arrival rather than starting
one. It is 10–15% of the distance between one settle and the next, which is
what keeps it from being the route driving.

One-sided, and both symmetries were considered and rejected: from *inside*
the dwell the wheel is moving text (§32's reading) and a snap to the top of
the column would undo the reader's own scroll; from the *climb-out* a snap
back would undo a departure, which is a thing every reader does at every
station. Forward-only for the same reason — a reader scrolling *up* through
the window is leaving, and pulling them forward would reverse them under
their own hand.

**Two gates on "the gesture has ended", and each catches what the other
cannot.** A floor of **0.35s** since anything last arrived, and a damped
input rate below **90 scroll units a second**. The floor is what protects
deliberate reading; the rate scales the wait with how hard the gesture was,
because a 3,000-unit-a-second flick needs 0.42s of quiet to decay under the
threshold where a 480-a-second one needs 0.35.

**The test is the *gesture's* rate rather than the flight's**, and that is
the one real design decision here. Taking the flight's rate instead would
fire the snap only once the damped chase had already coasted to a stop, and
the reader would watch the camera settle and then move again — two motions
where there should be one. Fired at gesture end, the retarget merges into
the flight already running.

It retargets `want` rather than running a second motion beside it, so the
ease, the speed cap and the interruption are all the ones that already
exist. And it only ever moves the reader **forward**, by at most 350: it can
add a little to a gesture and can never leave anyone short of where they
scrolled to, which is the failure §31 removed a whole mechanism over.

**Flown.** Four stations, five landing offsets, three gesture speeds — a
notch every 250ms, §31's reader (600px then 700ms), and a flick. Every
figure is where the route came to rest, as an offset from the settle. The
three speeds agree to the unit everywhere, at every station, before and
after, which is the point: **a resting place is a function of the gesture's
total, not of its speed**, and the snap is what changes it.

| gesture lands at | before | after |
|---|---|---|
| −480 (outside the window) | −480 | **−480** |
| −240 | −240 | **0** |
| −120 | −120 | **0** |
| +120 (inside the dwell) | +120 | **+120** |
| +720 (past it, on the climb out) | +720 | **+720** |

**Never mid-gesture**, measured as the worst gap between `want` and the sum
of the reader's own deltas while scrolling notch by notch through the
window:

| a notch every | 200ms | 250ms | 300ms | 400ms | 600ms |
|---|---|---|---|---|---|
| `want` − deltas, mid-gesture | **0** | **0** | **0** | 240 | 240 |

So the guard covers every cadence up to 300ms and gives way at 400. That is
the boundary the 0.35s floor buys and it is the right side of it: a wheel
reader inching forward at 400ms a notch, inside the last 350 units of an
approach, is arriving, and what they get is a 240-unit assist to the place
they were going. A trackpad never reaches that gap at all — its inertia
emits events continuously — and once the reader is in the dwell nothing
snaps again.

**Interruptible, measured mid-ease.** From 300 short of Enargeia, the snap
fires at 420ms with the route 19 units in:

| | before | after |
|---|---|---|
| wheel up 360 while the snap runs | −660 | **−360** |
| wheel down 120 while the snap runs | −180 | **+120** |

The route reverses under the hand on the frame the event lands. Note what
the second column means: after the snap has fired, the reader's delta is
measured from the dwell start, because the snap *is* a move and by then they
are at the station. They get the full 360 or the full 120 they asked for,
and nothing is ever discarded.

**No effect on the three things that must not have one.** A deep link, a
popstate and §35's rejoin all land exactly on a settle, which is the one
position the window excludes — `capture()` skips any stop at or behind the
reader — and `jump()` clears the gesture state besides, so a reader who
arrives by URL is treated as having made no gesture rather than as having
ended one. With the stick out the snap is dead with the rest of the module.
Re-verified after the change: twelve deep links, axe clean in both modes,
back and forward, the stick round trip, both escapes.

**Bundle** 216,433 + 3,250 worker = **214.53 KiB** (+154, worker
byte-identical, CSS unchanged).

### A rail, friction at a station, and the document's order back

**The rail replaces the scrollbar, not §4.3's rail.** Worth being exact,
because the two are different objects: `ProjectSection.astro`'s `.rail` is
on the *left* of each section and reports progress through one pin, and it
is behind the canvas in world mode with the rest of the document. The thing
on the right that world mode actually loses is the browser's own scrollbar
— `html[data-world]` is `overflow: hidden` and there is no document scroll
to report — so a reader has no idea how far along the route they are. This
is that, drawn in `.rail`'s language: 1px, `--rule` track, `--leader` fill
from the top, inset from top and bottom. It is on the right because that is
where the thing it stands in for was.

`rail.ts`, 676px tall at 1512×804, `--s-6` in from the edge. Measured out of
the page: the fill is a `scaleY` of `at / LENGTH` — 280px of 676 at
Homonoia's settle, which is 0.4138 — and the four marks sit at **18.3 /
41.4 / 68.2 / 91.3%**, the settle percentages. They are placed once, in
percent, and never move; the live one is `--leader` and 16px against
`--dim` and 8px, which is what §5 allows the accent to mean. One custom
property a frame, guarded at 0.0005 — a third of a pixel of that track —
and **no layout, ever**: nothing in the file reads geometry.

Not interactive, and that is a decision rather than an omission: a scrollbar
you can grab is a second way to move the camera, and §31's whole
construction is that the gesture is the only one.

**Hidden with the stick out**, for the reason the writeup is: off the route
there is no route position, and a progress rail over a free flight reports
one that has not moved since the reader left it. The number is not wrong, it
has just stopped being about them, and an indicator that quietly stops
meaning what it says is worse than one that goes away.

One thing to hand to §38: the track and the marks cover each other by
accident rather than by design. `--rule` reads as a dark line over lit
ground and disappears against the sky; `--dim` marks do the opposite. So
something is always visible, and neither is *comfortably* visible over the
bright half of the frame.

### Friction at a station

The dwell's 600 units are the reading, but the column runs out before they
do — 119 pixels of it at Basis against Homonoia's 476 — and the moment it
bottoms out the next notch departs. One flick could carry a reader in, past
the writeup and away without ever coming to rest.

**The rule:** forward movement stops at the bottom of the reading of any
station whose dwell it would carry past and which the reader has not already
left. The column fills under the gesture and holds there, which is the
feedback. Backwards is never touched.

**The release condition is the end of the arriving gesture**, and that is
the whole idea: what separates *carried past* from *leaving* is not how hard
the reader scrolled but whether they have **stopped since arriving**. A
flick that carries you through a station is one continuous gesture that
began before it; a departure is a new gesture, started after. So the
friction lifts after `GESTURE_END`'s own 0.35s of silence — the same
constant the settle uses — with a **1.5-second backstop** for a gesture that
never ends, which is the only case the timer ever fires for. **What a reader
physically has to do to leave is stop scrolling for a third of a second and
then scroll**, which is what everyone does anyway; it costs a deliberate
departure nothing and costs the flick exactly one more gesture.

**Two other designs were built and measured out.**

- **Accumulated delta.** With any decay the accumulator converges to
  `rate × τ`, so it systematically favours a *fast* gesture over a
  *sustained* one — a hard flick reaches a higher figure than a deliberate
  scrub, which is exactly backwards. Measured at 2,000 units and τ = 0.6:
  bursts of 600 through 3,000 never reached it at all (3,000 delivered over
  a second peaks at 1,800), so it did nothing and the timer was carrying the
  whole mechanism. Duration is the honest signal here, magnitude is not.
- **Gating it on the settle's own 350-unit window.** It made the friction
  device-dependent: a burst of twenty wheel notches walks into the window
  and is caught from the sixth, while one trackpad event carrying the same
  distance is tested once, from outside it, and passes. Same gesture, same
  distance, two answers. Without the gate a forward gesture stops at the
  next station's reading wherever it started — the same on every device, at
  the cost of one extra gesture per station to a reader deliberately
  skipping ahead.

**One flick does not depart any station.** A flick is one event, which is
what a trackpad delivers; the harness's notch-by-notch burst tops out at a
measured **1,200 scroll units a second**, so it cannot reproduce one. As a
single event, every size tested lands exactly on the bottom of the column:

| one wheel event | Enargeia | Homonoia | Philoi | Basis |
|---|---|---|---|---|
| 1,200 units | 255 | 476 | 373 | 119 |
| 2,400 | 255 | 476 | 373 | 119 |
| 3,000 | 255 | 476 | 373 | 119 |
| **6,000** | **255** | **476** | **373** | **119** |

Those four numbers are the columns' own lengths in scroll units, so the
friction engages exactly at the bottom of the reading and not a unit before.
A 6,000-unit throw — ten times the dwell — leaves nobody.

A *burst* of notches is a scroll of a given duration, and the rule is a
duration, so this is the same table read the other way:

| burst | as seconds | leaves the dwell? |
|---|---|---|
| 600 units | 0.50s | no, at all four |
| 1,200 | 1.00s | no, at all four |
| 1,800 | 1.50s | no, at all four |
| 2,400 | 2.00s | yes — the backstop fires mid-gesture |
| 3,000 | 2.50s | yes |

Which is correct: two seconds of continuous scrolling is not a flick. The
backstop, timed: into the dwell at 93ms, released at 1.5s, out at 2,294ms.

The rest, measured: **backwards from the bottom of Basis's column, one notch
up moves −1** — free. After the gesture ends, five notches (600 units) leave
the dwell, which is the route's own dwell length and not the friction. And a
2,400-unit burst from 900 short of Homonoia rests at its column's bottom
rather than flying through, which is the ungated rule doing what it says.

### A bug the friction found: the chase never landed

`at` chases `want` on an exponential, and an exponential never arrives — so
a reader eased *up* to a settle sits a vanishing fraction below it for ever,
and everything that asks "are we at the station" asks with `>=`.
`atSettle()` stays false, so **§29's residual creep never runs**; `dwellAt()`
returns −1, so the friction never arms. Neither shows up as a wrong number,
only as a beat that quietly does not happen — and the settle added last
session made it the common case, because a snapped arrival lands on
`stop.y` exactly from below.

Closed at a hundredth of a scroll unit, which is five thousandths of a world
unit. Measured after: eased in from 300 short of Enargeia, `at` is **2300
exactly** and the arrival clock reads **0.522 and climbing** where it was
pinned at 0.

### The column is in the document's order again

The three-phase split moved the metric strip above the summary. It is back:
phase 2 is the lead paragraph, phase 3 is the numbers, the links and the
writeup, so the DOM order is the document's — headline, summary, stats,
links, prose. Same three bands and the same stagger (0.10–0.50, 0.35–0.75,
0.60–1.00), so the last still ends at exactly 1.0, which is the settle
keyframe. Measured 370 units short of Enargeia's settle, the three read
**0.968 / 0.175 / 0** — the cascade, in the new order — and at the settle
all three are up. **Column height is 1,168px at Homonoia**, the same as it
was before the split and after it: `visibility`, never `display`.

### Verified

Three speeds over the whole route on a 30 Hz session (rAF median 33.3, so
these per-frame figures are not comparable with the 60 Hz ones above):
worst single-frame change 0.109 / 0.135 / 0.189 in the first block,
0.098 / 0.131 / 0.131 in the last, and 14.8 / 31.1 / 66.6px in the reading.

**Layouts stay at zero** in all three configurations — one style recalc a
frame at 0.095 / 0.082 / 0.070ms, against 0.072 / 0.055 / 0.050 in the
previous session; the rail adds one guarded custom property and reads no
geometry. Twelve deep links land, axe is **clean in both modes** with the
rail on the page, back and forward, the stick round trip and both escapes
all unchanged.

**Bundle** 216,881 + 3,250 worker = **214.97 KiB** of 400 (+448, worker
byte-identical), CSS 2,548 → **2,662**, document 56,508 (55.18 KiB).

### The dwell becomes the pin

Five things, and the first four came out of a real browser on a trackpad
rather than out of the harness — which is the headline finding, so it goes
first.

**How the verification changed.** `page.mouse.wheel` has no inertia: every
flick the harness made ended the moment the script stopped, so `idle` always
reached `GESTURE_END` and the backstop never mattered. It passed a test the
product failed. Three changes:

- flicks are **dispatched from inside the page** at a real 60Hz cadence.
  CDP round-trips measured ~100ms here, which is six times too slow to make
  a momentum tail at all — the first attempt produced a "flick" 12.5 seconds
  long;
- with a **momentum model**: a finger phase of steady deltas, then a
  geometric decay, swept across four strengths;
- and `scratchpad/h/probe/index.html` **captures the real stream** — flick
  once in Safari and it prints the gap distribution, the decay run and
  whether any gap reaches 0.35s. The model below is what to confirm against
  it; I cannot operate a trackpad.

### 1. The friction was releasing on every flick

**Reproduced.** The modelled flick: **125 events over 1,991ms, gaps median
0ms, max 37.7ms, and zero gaps at or over 350ms.** So `idle` never reaches
`GESTURE_END` for the whole two seconds of a flick, the 0.35s condition can
never fire inside one, and the **1.5-second backstop was the only condition
left** — firing mid-tail, with the rest of the momentum carrying the reader
out. Exactly the mechanism suspected.

Swept at Basis, whose reading is the shortest and whose wall is therefore
nearest the settle:

| flick | units | tail | before | after |
|---|---|---|---|---|
| gentle 90 / 0.955 | 3,517 | 2.0s | +1119 | +1119 |
| firm 180 / 0.970 | 9,041 | 3.3s | +1192 | +1119 |
| hard 250 / 0.980 | 16,721 | 5.1s | **+1875, gone** | **+1119** |
| throw 400 / 0.985 | 33,428 | 7.2s | **+2700, gone** | **+1119** |

A 33,428-unit throw with a seven-second tail now moves nothing past the
wall.

**The fix is to tell momentum from a gesture by its shape.** Neither Safari
nor Chrome exposes the phases AppKit knows about, so the signal has to come
out of the stream, and there is a clean one: momentum decays. Six
consecutive events whose magnitude does not grow (±6%) is a coasting tail —
deliberate scrolling is noisy and does not produce that run — and **the
backstop counts only time in which the reader is pushing**. Momentum can no
longer buy a release; only a sustained gesture can; and when the tail finally
stops, the 0.35s of silence does what it was always meant to.

### 2. The friction is symmetric now

**One wall per direction, at the far end of the reading in that direction.**
Going down it is the bottom of the column; going up it is the dwell's first
unit — which is the arrival frame, so a reader who came from beyond runs the
beats backwards and is stopped on the same picture someone arriving from
below lands on. Same release condition, both ways. Nothing is walled on the
way *in*: that is what the settle is for.

### 3. The cut, and it was not where it looked

Dumped all 22 keyframes and every segment's rate before touching anything.
**The leg into Basis is the smoothest of the three** — 6.87 / 2.53 / 4.64 /
2.61 degrees of yaw per 100 scroll units — against the leg into Homonoia's
18.0 / 21.9 / 6.88 / 0.94. Neither the third station's climb-away nor the
fourth's approach is unusual.

The outlier is one segment and it is **the climb-away added after Basis last
session: 154.9° of yaw in 500 scroll units, 46.5° per 100 units**, more than
double anything else on the route. At the route's own speed that is 155° in
about six tenths of a second — a whip-pan, and the only discontinuity the
sampled pose function finds anywhere.

Fixed by giving the final key its own span: **1,200 units instead of 500**,
which puts it at 19.4°/100u, inside the envelope the rest of the route
already sets. The worst yaw rate anywhere drops from **46.46 to 21.89**, and
21.89 is pre-existing. Least clearance is unchanged at 13.00 and the peak
translation rate at 1.130.

**And a finding to keep: §31's speed cap cannot catch this.** `fastest()`
measures the distance between two poses, so a keyframe that turns 155° while
moving 262 units is barely constrained by it. The cap is a bound on
translation, not on apparent motion.

### 4. The beats are inside the dwell

The beats played across the *approach*, so everything was up before the
camera arrived and the dwell had only the column left to spend. Document
mode works the other way: the section pins and the reader's own scroll walks
the beats. **The dwell is this world's pin** — the camera holds one pose for
every unit of it — so the beats belong in it.

**The dwell is 1,500 units and here is how they are spent:**

| | scroll units into the dwell |
|---|---|
| arrive — machine ID row and headline, nothing else | 0 |
| the summary | 0 → 240 |
| the metric strip and the links | 380 → 620 |
| the writeup | 760 → 1000 |
| the column scrolls | 1000 → 1500 |

380 between beats with a 240-unit fade, so each holds alone for 140 and
nothing is mid-fade for more than a fifth of the dwell. Against document
mode's own pin, which is 1,769px for three beats, this is 1,000 for three
and then 500 for the column. Measured at Homonoia: at +0 the name is 1.000
and the other three are 0; at +300 the summary is up; at +620 the numbers;
at +1000 the writeup; at +1500 the column has travelled its full 399px.

**Homonoia's overrun is gone, and item 5 is what fixed it.** At 45ch its
column ran 476px past the frame; at 54ch it runs **399**, which fits the
500 units with 101 to spare — so at 1512×804 no station needs the rate
clamp at all (Enargeia 204, Philoi 348, Basis 68). The clamp still exists
for short windows: the worst measured is 586 at 1024×560, where the column
runs at 1.17px per scroll unit.

**What it costs the route.** `DWELL` 600 → 1,500 is +900 at each of four
stations, and the final turn is +700: **LENGTH 12,567 → 16,867**, up 34%.
The settles move from 18.3 / 41.4 / 68.2 / 91.2% to **13.6 / 36.2 / 61.5 /
84.0%**. It costs no *flight* time — the dwell is scroll the camera does not
move through — so a fly-past is exactly as long as it was.

**The interactions, which are the part worth reading.**

- The friction's wall moved with the beats. `readEnd` is the end of the
  **reading** now — the last beat plus the column — not the column alone, so
  the friction holds a reader after the writeup has arrived rather than
  before it.
- **A gesture that ends inside the settle's 350-unit window lands on beat
  1**, which is the arrival frame item 4 asks for. A gesture that overshoots
  plays all four beats in one go and is held at the bottom of the reading.
  That is the same as document mode, where a flick through a pin skips its
  beats — the settle is the mechanism that makes the intended arrival
  happen, and the friction is what stops the overshoot going any further.
- The up-wall is the dwell's first unit, which *is* beat 1. So the two
  directions land a reader on the same frame, which is what made the
  symmetry in item 2 easy rather than arbitrary.
- **At beat 1 there is nothing focusable in world mode** — nothing is open,
  so there is no Close and the Live link has not arrived. Scrolling reveals
  them, `Esc` still leaves, axe is still clean, and every fact is still in
  document mode. `Esc` at beat 1 leaves the world rather than closing,
  because there is nothing to close; the harness had to be corrected for
  that rather than the product.

### 5. The column takes more of the frame

**45ch → 54ch, and the scrim 60vw → 68vw.** Compared 45, 54 and 62 at one
pose in one session. 62ch (634px, ending at 698) dims the near ground enough
that the landscape stops reading as a world and starts reading as a
backdrop, which is the constraint that binds. 54ch ends at 616, the scrim is
solid to 617, and §34's structure at 67% of the width — the band from 824 to
1,202 — sits past that in the fade's outer half, with the ranges, the
treeline and the clouds all still legible.

It pays for itself twice: the measure is a comfortable ten words a line
rather than eight, and **the metric strip no longer has to break out of the
column**. At 264px per track the widest value, `334.9 MiB`, is 216 — so
§29's first constraint is now satisfied inside the measure, and one thing
that reached past it is gone.

### Verified

Three speeds over the whole 16,867-unit route on a 30 Hz session (rAF median
33.3): worst single-frame change 0.070 / 0.132 / 0.101 in the first block,
0.079 / 0.163 / 0.176 in the last, 13.7 / 26.0 / 16.6px in the reading.

**Layouts stay at zero** in all three configurations, one style recalc a
frame at 0.099 / 0.083 / 0.087ms. Twelve deep links land, axe **clean in
both modes**, back and forward, the stick round trip and both escapes.

**Bundle** 217,091 + 3,250 worker = **215.18 KiB** of 400 (+210), CSS
**2,658**, document 56,508 (55.18 KiB).

### 33. Entry
World-first routing (SPEC §0.1), the loader, the escape hatch, mode memory.

- The world loads on WebGPU + ≥1024px + motion on; everything else, and
  `?doc`, gets the document
- A visible, honest progress state — a percentage and what it is doing, in
  the site's own mono. Not a spinner
- The escape control is reachable by keyboard on the first frame, from
  anywhere, and `Esc` reaches it. The choice persists

**Done when:** interactive world under 3s on a desktop connection; nobody is
trapped; a crawler still gets real HTML at every URL; LCP unchanged.
**Report:** time to interactive world, LCP both modes, bundle both sides.

### 34. The four scenes
Four places in the landscape, far enough apart that reaching one is a
journey and close enough that the next is visible from the last. Each is a
picture of the system rather than a monument to it (SPEC §0.4): an engineer
who knows the domain should recognise what they are looking at without being
told.

- **Enargeia** — a machine thinking, running on the visitor's own hardware
- **Homonoia** — five nodes passing something between them, one holding the
  term. **This absorbs the old cluster step**: the traffic simulation from
  §15–§16 comes back here, the election is the set piece (SPEC §4.7's one
  thing to get right), and the ground under it is where §16's heightfield
  term raises a massif
- **Philoi** — two workstations, the same document open on both, edits
  arriving
- **Basis** — modules wired together with a request tracing through them.
  Deliberately the quietest

**Scale is the open question and it is Theo's call** (SPEC §8): enormous, in
the cities' register, or human with the route descending to a few units.
**Decide by looking at one before building four** — and ask before modelling.

**Done when:** a term ends and the ground under Homonoia rearranges, with
three stations standing elsewhere in the world.

### 35. Collision and the unlock
Oriented boxes in a spatial hash, a sphere against a box, resolved by
pushing out along the shallowest axis (SPEC §0.3). The camera has a radius
of four units and resolution is a push, not a stop. **The altitude clamp
still applies underneath** — ground and architecture are two constraints and
both hold.

- **Every built thing carries an authored proxy**, a handful of boxes beside
  the geometry that produced them. Under-approximate, never over: a bad
  proxy is worse than none, because bouncing off nothing is a bug a reader
  cannot explain
- The four scenes get theirs here, since they are the only built things that
  exist yet
- **Free flight is offered at the end of the route** — a visible control,
  not a hidden key — and the choice persists. Scrolling from inside it picks
  the route back up at the nearest station

**Done when:** you cannot get inside anything built, sliding along a wall
works, and a returning visitor is not made to scroll the route again.
**Report:** the proxy convention, box counts, the cost of a query per frame.

### 36. The cities
Houston and Delhi, oversized, visitable, solid (SPEC §0.2). Towers 180–320
units against a landscape whose highest ground is 128; streets 60–80 wide;
Delhi mostly 15–40 and spread over four times the footprint, with two or
three monuments reaching 120. The contrast between the two skylines is the
point of having both.

**The world bound goes from 2,600 to 5,000** with them — a 10km world, 220
seconds across at cruise. The ceiling and the recall stay as measured; the
fog, the chunk reach and the star sphere are camera-relative and do not care.

**Done when:** you can fly down a street between two towers and the towers
stop you.
**Report:** ms/frame and draw calls inside a city and from outside it, the
bound change measured against §24's flight tests.

### 37. The other ten landmarks
The stadium, the datacenter hall, the dish array, the turbines, the torii
gate, the court, the bridge, the lighthouse, the standing stones, the wreck
(SPEC §0.2). None on the route, none carrying a writeup, each distinct
enough in silhouette that nobody flies to one expecting content.

**Siting is searched, not chosen** — the height field knows where ridges,
shores and flat ground are, the way §22 found the opening pose and §29 sited
its slab. Each gets a proxy per §35's convention.

### 38. Brightness, performance, accessibility
Re-solved for a world with cities in it. The measurement harness from
§17–§20 stands and most of what it was constraining is gone: text is
confined to the writeup column, so the bound applies behind it and nowhere
else.

60fps on integrated graphics, with LOD doing the work. Lighthouse
accessibility 100 in document mode; escapable, and nothing world-only, in
world mode. The DPR 1.5 cap is re-decided here on frame time rather than on
focus (SPEC §4.7).

**Report:** ms/frame, draw calls, chunk generation cost, bundle both sides,
LCP both modes, axe across every state.
