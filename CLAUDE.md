# theophilusjohn.com

Personal portfolio for Theophilus Biju John. Astro 7, deployed to Cloudflare Pages.
Live at https://theophilusjohn.com — every commit to `main` deploys.

Full design spec: `docs/SPEC.md`. Numbered build steps: `docs/STEPS.md`.

---

## What this site is

Portfolio-first, four projects, heavily animated, dark. Two modes:

- **World mode** — a flyable, cel-shaded night landscape. The four projects
  are scenes standing in it, on a route driven by scroll. **This is what
  loads** on WebGPU, ≥1024px, motion on. See SPEC §0.
- **Document mode** — the site is ONE page. All content lives on `/`. Deep
  links work via History API `replaceState`, not routes. Crawlable,
  accessible, fast. It must stand entirely alone. It is what everything else
  gets, what `?doc` forces, and the escape hatch from inside the world.

**The world loads first and the document is the escape hatch, not the
shell.** That reversed at step 21; steps 15–20 built the world as a layer
*behind* a scrolling document, and SPEC §0 records what that assumption
cost. Document mode was finished and shipped first (steps 1–14) and stays
finished — that is what makes the reversal survivable. Steps 21–38 build the
world. See `docs/STEPS.md`.

**And the world is inhabited (SPEC §0.2–§0.4, after step 29).** Scroll is the
route and free flight is what the last station unlocks; the four projects are
*scenes* of the systems rather than structures; twelve landmarks and two
visitable cities stand off the route; and everything **built** is solid —
§4.7's "no collision" is true of terrain only. Everything after step 30 was
renumbered for it; the divider above step 31 carries the mapping.

**Since §31 the route is the site and free flight is a flag.** `route.ts` is
the fourth module with no three and no DOM in it — it imports `height.ts` and
nothing else — and it is the whole of what "scroll is the site" means: four
searched station sites, a framing *rule* (stand off until the scene is a
quarter of the frame, aim at 0.4 of its height, turn 17° off the bearing) and
a pose that is a pure function of a scroll position and one arrival clock.
`scroll.ts` is the gesture — wheel, keys, touch, damped at 0.22s, capped at
420 units a second — because in world mode there is no document to scroll.
**It also settles and it resists**: a gesture that ends within 350 scroll
units of a settle is carried to the dwell's first unit (forward only,
approach side only, never from inside the dwell, never mid-scroll), and
movement *stops* at the far end of a station's reading in whichever
direction it is going — the bottom of the column going down, the dwell's
first unit going up — until the arriving gesture ends. Both retarget or
clamp `want`, so the ease, the cap and the interruption are the ones already
there, and the settle can only ever move a reader forward. **"The gesture
ended" is not a timer**: a trackpad emits through its whole inertial tail,
so momentum is told by its shape (six consecutive non-growing deltas) and
the 1.5s backstop counts only time the reader is pushing.
`rail.ts` is the one thing that reports any of it: a 1px progress rail at
the right edge, standing in for the scrollbar world mode does not have.
`camera.ts` still owns the pose: the route hands one to `drive()`, the floor
and the bounds still apply to it, and every input in that file is dead until
`stick(true)`, which is `F` until §35 builds the unlock.

**Since §32 the writeup arrives at a station, and it is the document's own
nodes.** `station.ts` is the content layer: it clones the machine ID row,
the headline, the summary, the metric strip, the links and the writeup out
of the sections already on the page — classes and Astro scope attributes
and all — so the register cannot drift from document mode's, and it strips
ids and inline styles because `projects.ts` leaves GSAP's `opacity: 0` on a
headline for most of a pin. The three landmark states are **one number**,
`bandAt()`'s weight — **damped once, upstream, at 0.30s**, and then read
twice — but only for the name. **Everything below the headline is a beat
inside the dwell**, driven by scroll position within it the way
`projects.ts` walks a pinned section: the summary, then the numbers and
links, then the writeup, then the column, over 1,500 units. The approach
resolves the headline and nothing else, which is the frame a reader lands
on. The address bar is
`replaceState` in one direction and a route jump on popstate in the other.
**The dwell is the reading**: a station's column is taller than the frame,
so the 600 scroll units in which the camera holds its pose move the column
instead — one gesture, one scroll position, nothing intercepted — and that
one is damped at 0.09s rather than 0.30, because a reader's own wheel moving
text must not lag. Both are exempt on a jump, which is §31's rule one level
up.

**The landscape is a set of files that cannot see a GPU and a few that can**
(§22). `height.ts` is the field and imports nothing — no three, no DOM — so
Node runs the `.ts` directly and every number about the terrain is that
function's own output. `chunk.ts` samples it into arrays, `grid.ts` is the
vertex layout the worker and the main thread both index, `cover.ts` (§27) is
where anything grows, `sun.ts` and `wind.ts` are the two directions the world
agrees on, `scatter.ts` (§28) is what stands on it, `air.ts` (§30) is what
floats over it, `terrain-worker.ts` runs the generator off the main thread,
and `terrain.ts`, `water.ts`, `blades.ts`, `stands.ts`, `motes.ts`,
`clouds.ts` and `sky.ts` are the parts that know what a mesh is. Keep it that
way: a worker that reaches anything in three is a second copy of the
renderer.

**Since §23 the worker also bakes light**, and `sun.ts` is why that is
allowed: the key light is one direction in a module that imports nothing, so
`chunk.ts` can march shadows against it and `terrain.ts` can shade against
it without either one importing the other. `chunk.ts` runs in Node too —
extensionless relative imports need a resolver hook, and then the generation
numbers are the shipped file's own output the way the field's are.

**Since §24 the world is finite and the camera is held above it.** The floor,
the bounds and the recall all live in `camera.ts` and nothing else may move
the view. They are one construction: a term that reshapes the *wanted*
velocity before it is damped, with a hard clamp behind it as the guarantee —
so nobody is ever stopped, and nobody ever gets through. `height()` on the
main thread is the floor, which makes `camera.ts` the second caller of the
field after `terrain.ts`'s LOD criterion.

**Since §25 a chunk carries its parent's surface as well as its own.**
Three attributes morph — position, shading normal, baked shadow — and the
weight is **one number per chunk**, read from the *parent's* rectangle
distance so it is the same arithmetic the split is decided on. It must
reach 0 by half the birth distance (`MORPH` ≥ 0.5) or every level pops at
once. `chunk.ts` builds a block of any level's grid, so a chunk's morph
target is that same function over the quarter of its parent it covers —
never an approximation of it.

**Since §26 the world has water, and it is one plane and a depth test.**
`WATER = -8` lives in `height.ts` — with the field, so the worker can ask
how near water is (§27) without importing anything that has seen a GPU — and
`water.ts` draws a 64-triangle disc at that level, centred on the camera in
the shader. Nothing knows where a lake is: the terrain is opaque and drawn
first, so the depth test finds the basins and the shoreline is the exact
intersection of two surfaces. It draws **after the ground and before the
sky**, which is what keeps the deck's fractal noise off the pixels it owns.

**Since §27 things grow on it, and the density is baked as well as
instanced.** `cover.ts` is the one answer to "does anything grow at (x, z)" —
a pure function of the field, its landform gradient, the range mask and
`WATER` — and both ends call it: the worker bakes it per vertex (so the
ground is *tinted* to the last chunk and the tint morphs like the other three
attributes), and `blades.ts` stands 28,800 blades in it on a camera-relative
disc of 60 units. The disc is filled on the main thread because a blade has
to stand on ground only `height()` knows about; it is a world-anchored grid
of cells mapped toroidally into one buffer, so a slot is refilled only when
the cell it holds changes, under a per-frame budget. **The band model is
`band.ts`** now — the edges, the ramp and the shadow depth in one place, on
three rungs since §28 (−1 a conifer, 0 the ground and stone, +1 growth) —
because §27 puts a second surface in those bands and §28 two more, and a
blade whose terminator sat a hundredth off the ground's would draw a line
along every slope.

**`wind.ts` is numbers, not a function** (§27), for the same reason `sun.ts`
is: the blades want a bend vector, the cloud deck wants the displacement it
integrates to, the water wants a bearing per wave. One direction, one gust
wave, one wander, and each layer's use is one line — everything that moves is
within 22° of one direction and inside the frequency band §26 measured. §28's
canopies read the gust wave itself and add nothing to the spectrum: what is
per tree is stiffness, never phase, because a phase offset destroys the
travelling band and the band is what makes a gust read as wind.

**Since §28 things stand on the ground as well as growing on it.**
`scatter.ts` is the second pure placement module — conifers and stone, keyed
to a world-fixed 16-unit cell — and `stands.ts` draws them on a
camera-relative grid the way `blades.ts` does, at 608 units instead of 60. It
is **two draw calls for the whole world**, not §0.2's one per variant per
chunk: a quadtree covers the same ground at four levels at once, so a tree on
a boundary would be drawn once, three times or not at all. Variants are three
floats in the instance rather than three geometries.

**Since §30 the air has things in it too, and one of them is a fact about the
whole frame.** `motes.ts` is `blades.ts`'s construction for the third time —
a camera-relative grid of 676 cells, additive `--mint` billboards, and a mote
with **no state at all**: it is a phase, `fract(t·rate + phase)`, running one
rise-with-pauses and one downwind drift per cycle. Its density rule is
`air.ts`, the third pure placement module, and it is its own file for the
reason `cover.ts` is — §0.2's claim ("denser over water and vegetation,
sparse on bare rock") is about the world, and a claim that can only be
evaluated inside a material is one nobody can check. `clouds.ts` is the near
field of the sky: camera-facing quads in *cloud space* — the world sliding
downwind at the deck's own rate — placed by the same pure-function rule.

**The murk lives in `fog.ts` and that is the load-bearing decision of §30.**
Being inside a cloud is a fact about how far you can see, so it is one uniform
on the fog's density plus one mix in `sky.ts`'s `haze` — which every opaque
surface in the world already fogs toward — plus the dome, the stars and the
terrain's rim. No post pass, no second render target, no fifth material, and
nothing measurable on the frame. A puff fades out over exactly the band the
murk fades in: **the billboard is what a cloud looks like from outside, the
murk is what one looks like from inside, and neither is ever asked to be the
other.**

**A conifer's shade is baked by the worker, which is why placement has to be
pure.** `chunk.ts` splats each canopy downsun onto §23's shadow lattice and
multiplies it into the marched term, so the tree is drawn on the main thread
and the shade under it is computed in a worker three levels away — they agree
only because `scatter.ts` answers the same question on both sides. Two rules
came out of building it: **shade may lag the thing casting it and may never
outrun it** (level 1 reaches 576 units, the trees fade at 590, and the far
ridges came back covered in pools with nothing in them), and an object's own
`N·L` must be **compressed into the bands** before `band.ts` cuts it, because
the bands are placed around flat ground and a cone has facets at every angle.

**The landscape is alive from §0.2 (decided at §24), and after §30 it is
finished.** §4.7's "no trees, rocks, water, clouds" is reversed and steps
25–28 and 30 built what replaced it: geomorph, water, ground cover and wind,
rocks and conifers, motes and cloud volume. §29 between them is a throwaway
probe that does not ship. **Nothing is left of §0.2** — steps 31 onward are
the route, the stations and what stands on the ground, not what the ground
is made of. Everything scattered on the terrain is placed by a **pure
function of `(x, z)`** — chunks generate independently, in three workers, in
any order, and anything stateful would make two chunks disagree about their
shared edge.

---

## Hard rules

These are not preferences. Violating one is a bug.

1. **No arbitrary values.** Every colour and font size comes from a token in
   `src/styles/tokens.css`. Need a new one? Add a token, don't inline a hex
   or a `px` value.
2. **`--leader` means state.** Active, elected, current. If it isn't marking
   state or a live link, it must not be that colour.
3. **Motion checks `[data-motion="off"]`**, not just the media query. The
   toggle overrides the OS in both directions.
4. **Reduced motion means final state, not fast animation.** No shortened
   durations. Skip to the end.
5. **One WebGL context** on the whole site. Every structure is geometry
   inside the persistent scene, not a second canvas.
6. **Every fact exists in document mode.** If information only appears in
   world mode, that is a bug, not a feature. This is the whole accessibility
   story now that the world loads first — the world must be **escapable**,
   from the keyboard, on the first frame.
7. **No new dependencies without asking.** Especially: no React, no R3F, no
   Tailwind, no second animation library.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Astro 7 (upgraded from 5; check v7 docs, not v5) |
| Styling | Plain CSS + custom properties. Scoped `<style>` in components |
| Animation | GSAP (ScrollTrigger, SplitText) — free for commercial use since 3.13 |
| Smooth scroll | Lenis |
| 3D | Three.js **pinned at 0.185.1** via `three/webgpu`. TSL shaders |
| Content | Astro content collections + MDX |
| Deploy | Cloudflare Pages, `npm run build`, output `dist` |

**Banned:** React, React Three Fiber, Tailwind, Motion, Anime.js, React
Spring, Trig.js, GSAP ScrollSmoother (overlaps Lenis).

---

## Known traps

- `await renderer.init()` before first render. WebGPU init is async.
- Feature-detect with `renderer.isWebGPURenderer`, never
  `capabilities.isWebGL2` (undefined under WebGPU).
- Never mix `three` and `three/webgpu` imports. Use `three/webgpu` everywhere.
- URL sync on scroll uses `replaceState`, never `pushState`. Pushing on
  scroll floods the back stack and breaks the back button.
- Additive particles must not write depth but must still depth-test.
  Set `renderOrder` explicitly.
- Dispose geometries, materials, textures, render targets. The scene never
  unmounts, so leaks accumulate silently.
- Custom cursor only on `(pointer: fine)`. Never initialise on touch.
- `gsap.ticker.lagSmoothing(0)` means a backgrounded tab applies the whole
  elapsed wall-clock gap in one frame on return — invisible on a looping
  marquee, a jump under a scrubbed pin. Settled in step 11: lag smoothing
  is back on at GSAP's defaults. Do not turn it off again for the bands;
  they pause off-screen, so their phase already drifts from the clock.
- Pinning content taller than the viewport hides its own tail behind the
  fold for the length of the pin. A width breakpoint does not catch it —
  a short laptop screen at full width reproduces the phone failure. Measure
  against `innerHeight` and pin all of them or none. Since §17 the thing
  measured is the tallest *beat*, not the whole section.
- Anything that changes document height after load invalidates a `#hash`
  the browser already resolved — pins add their scroll distance above every
  later section. Re-jump once the page is its final height.
- A toggle that overrides an OS preference must persist both states, not
  clear its key on un-press. Clearing drops back to `auto`, so the OS
  re-asserts on the next load and silently undoes the choice. Same reason
  a bare `@media (prefers-reduced-motion: reduce)` block has to be scoped
  `html:not([data-motion="on"])` — otherwise the query overrides the toggle
  and only one direction works.
- Pre-paint state paints off the root attribute the inline head script
  sets, never off `aria-pressed`. The module that syncs `aria-pressed`
  lands after first paint, so a control styled from it flashes.
- GSAP defers the first write of a `from` tween to the start of the next
  tick. Anything that uncovers an element *because* the start state is on
  it — a pre-paint hold, a visibility gate — must pass `lazy: false`, or
  the element is one dropped frame from painting its final position first.
  Tell: `transform` still reads `none` right after the tween is created.
- ARIA prohibits an accessible name on `paragraph`, `generic` and friends,
  so the `aria-label` SplitText writes to stand in for its split spans is
  dropped on a `<p>`, leaving the text unreadable behind `aria-hidden`
  children. Split headings; move a paragraph with a wrapper instead.
- `overflow: visible clip` is legal and honoured — `visible` degrades to
  `auto` next to `hidden` or `scroll`, but not next to `clip`. That is how
  a line mask clips its travel axis without cutting the hero's bleed.
- A pre-paint hold puts LCP behind the JS bundle for every load it is
  armed on. Arm it only on the loads that will actually use it — decided
  in the head script, before paint — and give it a timeout release so a
  bundle that never arrives cannot leave the page blank. The module has to
  claim the hold synchronously at import, or the release fires underneath
  a sequence that is still waiting on something.
- Measuring an rAF-driven sequence needs the tab genuinely foreground.
  Chrome's window occlusion reports `visibilityState: "hidden"` when the
  window is fully covered *or* the tab is not the active one in its
  window, and rAF stops — the numbers come back frozen at the start
  state rather than wrong in an obvious way. Check `document.hidden` in
  the probe before trusting a timing.
- A component's scoped style outranks a page-level rule. Astro compiles
  scoped CSS with its own attribute on every selector, so a bare
  `button { cursor: pointer }` in a component beats `html[data-cursor] *`
  in global.css. A rule that is one decision about the whole page needs
  `!important` to be that, the way the motion block already is.
- WCAG exempts pure decoration from contrast; axe cannot see the
  exemption. A drifting strip of `aria-hidden` log lines is still text
  with a colour, and it fails `color-contrast` like anything else. A
  token that is deliberately near-invisible cannot be on the page at all
  if the target is Lighthouse 100.
- LCP counts text that is `visibility: hidden`, so a pre-paint hold does
  not show up in it — and neither does a line sitting outside its mask.
  Measured: hold cleared at 48ms, LCP entry on the hero line at 76ms, ink
  actually settled at 856ms. Report the settle time next to the LCP or the
  number flatters the page.
- `three/webgpu` is one module, so a bundler can tree-shake inside it but
  cannot split it across chunks. Naming `WebGPURenderer` is what pulls the
  WebGL 2 backend in — it is that class's `getFallback` that imports it —
  and there is no arrangement of dynamic imports that gets one backend per
  browser. `new Renderer(new WebGPUBackend(params), params)` is the same
  renderer without it, 23.1KB gzipped lighter; `BasicNodeLibrary` in place
  of the standard one is 8.0KB more.
- WebGPU only supports point primitives at 1 pixel, so `Points` cannot have
  a size there. Sized particles are a `Sprite` with `count`, which is
  instanced the same way — and its bounding sphere is the unit quad at the
  origin, so `frustumCulled = false` or the whole field disappears the
  moment the origin leaves the frustum.
- Additive blending has no ceiling, and the contrast rule in §4.7 is the
  only thing standing between a compute field and white. Measure it as the
  brightest **glyph-sized local average** (12×12), not the brightest pixel:
  that is the background text actually sits on. `--void-lift` is the bound
  — at it every text token clears 4.5:1. Peak density lives where routes
  converge, so the fixes are structural (fade over the last stretch of the
  journey, sign the tangential force per particle) before they are an alpha.
- `renderer.info` counters on the new renderer are zeroed by its own rAF,
  not by `render()`, so reading `drawCalls` from outside a frame gives 0 or
  a partial count. Set `info.autoReset = false`, reset, render, read. There
  is no `info.render.frame` on it at all — count renders yourself.
- A `position: fixed` canvas is sized from `documentElement.clientWidth`,
  never `innerWidth`. A classic scrollbar is outside the initial containing
  block, so `innerWidth` is ~15px wider than the box the canvas is drawn in
  and the whole scene is stretched by that much. It also answers while the
  element is still detached, which its own `clientWidth` does not.
- Puppeteer's `screenshot({ clip })` is in **page** coordinates and captures
  beyond the viewport, which puts a fixed element somewhere other than where
  it is on screen — a scrolled page reads back as if the canvas were blank.
  Shoot the whole viewport and crop when reading the pixels. Peel the
  document (`visibility: hidden` on header/main/footer) to measure the scene
  alone, and remember the custom cursor and the skip link are siblings of it.
- `LineLoop` is not a supported object type on the new renderer — it warns
  once per frame and draws nothing. A closed ring is a `Line` whose first
  point is repeated at the end.
- A WebGPU canvas cannot be read back with `drawImage` into a 2D context:
  it comes out fully transparent, and a brightness measurement built on it
  reports a black page rather than failing. Screenshot through the browser
  and decode the PNG.
- `trackTimestamp` has to be in the **backend's** parameters, not set on
  the renderer afterwards — `new Renderer(new WebGPUBackend(params))` reads
  it from `params`, and setting it on the renderer alone leaves the query
  set unbuilt and every duration at 0. Even wired up correctly the pool
  returned nonsense here (negative durations on an empty scene, one layer
  timing slower alone than with a second on top). What does work for
  ms/frame: stop the site's loop, render a batch of N between two
  `device.queue.onSubmittedWorkDone()`, divide. rAF intervals are useless
  for this — vsync pins them at the refresh rate and `--disable-gpu-vsync`
  does not lift it.
- Reading a token with `getComputedStyle` at mount freezes the palette the
  page happened to load with. A control that both re-colours the page and
  scales the scene then behaves differently depending on whether it was
  *set before load* or *toggled after* it, and only the second path is
  usually the one tested. Scene colours are uniforms, re-read on change.
- A **pinned** element reports `top: 0` for the entire length of its pin,
  so its rect says nothing about how far into the pin the reader is.
  `scrollIntoView` and `lenis.scrollTo` both resolve it to the scroll
  position they were handed — the jump is a silent no-op. Ask the
  ScrollTrigger for its `start`. Anything that measures "where is this
  section" for later restoration has the same bug in the other direction.
- Anything measured at module import is measured in the **fallback font**:
  `document.fonts.status` is still `"loading"` when a deferred module
  runs. A layout decision made there is made against metrics the page will
  never render with. Re-ask on `document.fonts.ready` — with a timeout
  guard only if it gates content (§12), not if it gates an enhancement.
- Eased opacity does not cross-fade. `power2.in` out against `power2.out`
  in leaves both elements at 0.88 in the middle; swapping the pair dips to
  0.25. Linear on both is the only pair that sums to 1 the whole way.
- Brightness solves scale the scene's **contribution**, not the backdrop:
  `--void` is under every pixel and does not move with ink. Dividing
  totals understates the headroom by about half.
- A classic scrollbar's **thumb** is the brightest thing on the page by a
  factor of ten, and it moves down the frame as you scroll. Crop pixel
  measurements to `documentElement.clientWidth` or every reading is the
  scrollbar.
- GSAP absorbs an element's existing CSS transform as pixel `x` on attach,
  then stacks its own xPercent/yPercent on top — doubling the offset. If an
  element has a CSS transform before GSAP animates it, pin `x: 0` (or
  `y: 0`) in the from-vars so only the percent drives position. Tell: the
  element lands at ~2x its intended offset.
- Distance fog tuned at one camera altitude is tuned at one altitude only.
  Once scroll is altitude the same `exp(-(kd)²)` that fades the far ground
  correctly from 4 units up puts *all* of it in the haze from 26, because
  the ground directly below is then 26 units away. Weight `dy` (0.35 here)
  so the fog is a layer with a thickness: the horizon is a fixed
  **horizontal** radius, so that is the axis the tuning has to live on.
- A brightness bound over a scene with a sky is two bounds. Text high in
  the frame sits on stars with literally no ground behind it and text low
  in the frame sits on ground with no stars over it, so one uniform scale
  over both solves neither. Measure each layer alone, pair the results per
  element, and check that nothing mixes the two before scaling them apart.
- Scroll damping must not apply to a jump. A deep link's re-jump, a
  `keepingPlace` correction and the back button all move the page by
  screens in one frame, and a lag makes the camera fly in from a pose
  nobody was at. Over `innerHeight` in a frame, snap — a real flick would
  have to cover 48,000px/s to reach it.
- Anything that is a pure function of scroll and layout should live in a
  module with no three and no DOM in it. That is the only part of the
  render layer that can be checked without a GPU, and Node can import the
  `.ts` directly, so the numbers in the report are the shipped function's
  own output instead of a re-derivation of it.
- A frame-derived probe is not automatically a better measurement than an
  in-page one. Finding the horizon arc by row brightness picked the
  traffic funnel about half the time and disagreed with itself by 400px on
  a repeat; the pose read off `camera` was exact. Where a temporary
  `window.__probe` is the honest instrument, use it and take it out again.
- `page.screenshot` in a headed browser catches the Astro dev toolbar,
  which is a lit pill at the bottom centre and outranks the whole scene on
  a peak measurement. Peel it with the document.
- **Lenis owns the scroll position, so a harness may not use
  `window.scrollTo`.** It lands, and then Lenis eases the page back toward
  its own stale target over the next second — a stop measured 600ms later
  is measured somewhere between the two, and drifts of 400 to 3,500px were
  going unnoticed. Expose the instance and use `lenis.scrollTo(y,
  { immediate: true })`, the way `jumpTo` already does.
- Peeling the document off the scene is not `visibility: hidden` on the
  landmarks. `visibility` is inherited but a descendant may re-assert
  `visible`, and GSAP's `autoAlpha` writes exactly that onto the beat
  elements — so at beat 1 the headline and the machine ID climb back out of
  the peel and get measured as scene. Tell: the same number under every
  layer, and a backdrop eight times `--void-lift`. Use a `!important`
  stylesheet.
- Adding up each layer's own worst 12×12 is not the combined worst case:
  every layer's maximum is found at its own place in the element and its
  own frame, and maxima that never coincide understate the headroom badly.
  Measure the combined frame for where the scene *is*, and use the
  per-layer figures only as a bound on what scaling one of them can add:
  `scene_after ≤ scene_all + layer·(s−1)`.
- One 8-bit code step above `--void` is a scene contribution of 0.00131 in
  these measurements. A row reading exactly that is at the instrument's
  floor, not at a value.
- A lit opaque mesh is **fill** bound where every instanced-sprite layer
  here is vertex bound: DPR 1.5 doubles the surface's cost and leaves the
  points where they were. The DPR cap is what keeps it affordable.
- `material.normalNode` is read in **view** space, so an analytic normal
  has to be `cameraViewMatrix.transformDirection(n)`. And fog on an opaque
  surface is a *mix* toward `--void` rather than the multiply the additive
  layers use — after lighting, via `material.outputNode` and the `output`
  property node.
- A point light at cluster altitude is inside the mountain it grows: the
  peak rises toward the node that earned it, so the light ends up 2.6 units
  off its own summit and 40 off the rim. At an inverse square that is 64×
  across one frame and no single exposure serves it.
- A scene whose landscape moves on a **random** schedule cannot be bounded
  by a timed sample. Homonoia's term ends every 3.4s and the next leader is
  drawn from the four that are not the incumbent, so the worst frame is the
  worst over five massif placements and the tweens between them: two runs
  of the same length disagreed by 1.7× on one stop's ceiling, and one
  passed a stop the other failed at 4.22:1. More frames is not the fix —
  force the sequence, hold each leader, walk each transition, take the
  worst of all of it.
- An exposure that is measured at the stops is not measured on the path.
  A solve that cleared all fourteen camera stops failed **between** two of
  them at 4.34:1, because the binding element changes with the beat and a
  midpoint inherits neither end's. Constrain the midpoints too; a margin
  on the keyframes does not cover it.
- A lit surface's contribution is **not** proportional to its exposure.
  Fog mixes it toward `--void`, so the pixel is `void + fog·(lit·g − void)`
  and doubling `g` does not double the contribution over the page. Fit the
  line through two measured exposures rather than scaling one.
- The same mix means a lit surface can be *darker* than the page: at
  `--void-lift` base colour, any irradiance under ~0.6 puts it below
  `--void`, so a mean-brightness probe over the ground reports a negative
  contribution and is right to.
- Narrowing a ridge cannot lower a saddle. `τ` is a perpendicular falloff
  and a ridge lies *on* the segment between two summits, so thinning it
  leaves the height between them exactly where it was — the ridge's own
  amplitude is the only knob for that. Tell: every adjacent route's deepest
  point measures *above* the lower of its two summits.
- "Does the composition work" has an instrument: the angle between the view
  axis and the ground under the subject. At 11–18° below the axis a
  landform is in the bottom third of the frame and cropped by the fold,
  whatever the altitude says. Standing further back closes it.
- `overflow: hidden` on the root does not stop Lenis. It reads the wheel
  itself and moves the window programmatically, which is not a scroll the
  root can refuse — measured at 2,978px on one flick with the document
  behind an opaque canvas. `lenis.stop()` is the pause, and it leaves the
  instance, the ticker wiring and every ScrollTrigger in place.
- A query parameter that carries a *mode* has to survive everything that
  rewrites the URL. `url-sync`'s `replaceState` wrote a bare pathname on
  the first scroll and the project stubs redirected to `'/#' + slug`;
  either one silently drops `?doc` or `?world` and lands the reader in the
  other mode.
- Deleting a whole layer barely moves the world chunk. It is almost
  entirely `three/webgpu` — a compute pass, a lit surface, 66k vertices and
  five lights came to 5.1 KiB gzipped. The size that moves is *whether the
  chunk is fetched at all*.
- An empty world with stars at effective infinity cannot show translation:
  the frame is identical before and after a hundred units of travel. Read
  the pose, not the pixels. That is the honest instrument there, not a
  workaround for one.
- `renderer.info` has no frame counter, so a batch of N renders reports the
  sum. Reset, render exactly one, read — then time a separate batch.
- Sub-millisecond frames need a warm-up batch before the timed one, or the
  first measurement is submit overhead and DPR 1.5 comes back *faster* than
  DPR 1.
- `/// <reference lib="webworker" />` is **not scoped to its file**. It
  merges the worker globals into the whole project, and the first casualty
  is `addEventListener` — every `KeyboardEvent` and `PointerEvent` handler
  in every other file degrades to a bare `Event`. Type the worker scope by
  hand instead: 14 errors in three files that never imported the worker.
- The WebGPU backend deletes a geometry's **index** attribute from its
  buffer map on dispose, along with its own. One index buffer shared across
  a pool of streaming chunks is therefore dropped out from under every chunk
  still drawing with it by the first retirement. Give each its own copy.
- A nested ring clipmap has an alignment condition that does not survive
  four levels: level L's block must exactly fill the hole in level L+1's, so
  each origin has to be a multiple of the *next* level's chunk size, and by
  the fourth level the finest ring can only re-centre every 32 chunks. That
  is what L-shaped trim strips exist for. A quadtree has no such condition —
  children tile their parent — and its leaves are keyed by their own
  coordinates, so nothing a neighbour does can invalidate a generated chunk.
- Cracks between LOD levels are **skirts or stitching, and stitching is the
  expensive one**. Snapping a fine edge to the coarse level's sampling is
  exact, and it makes a chunk's geometry a function of what its four
  neighbours currently are — so crossing a boundary regenerates a ring of
  chunks that never moved, and nothing can be cached by key.
- An LOD criterion measured from y=0 is measured from the wrong place. A
  camera cruising at 190 over ground at −6 is 190 away from *everything*,
  the finest level wants 144, and it never appears at all. The vertical leg
  has to be the height above the ground under the camera, which means the
  main thread samples the height field once a frame — the same call §24's
  clamp needs.
- Transparent objects depth-test **after** the opaque pass, so a star sphere
  inside the terrain's reach draws stars in front of a mountain. Put the sky
  beyond the last chunk of ground, not beyond the last thing that existed
  when it was tuned.
- Flying "forward" is along the view axis, so a harness that holds W with
  any pitch on descends. 75s at 180 units/s and −9° is 2,100 units down, and
  the whole test then happens under the terrain without failing.
- **A band edge finds every octave the normal has.** Quantised light on a
  procedural heightfield is not the smooth ramp with a step in it: the
  detail layer's 0.9-unit bump every 14 units is 23° of tilt, and 23° crosses
  any threshold, so the ground comes back as two-tone camouflage. Shade from
  a normal mixed toward a *landform* gradient (a coarse lattice), not from
  the surface's own — and keep the geometry untouched, it is only the light
  that wants the smoother question.
- The same edge is why a sun elevation tuned under a smooth ramp does not
  survive banding. At 13.9° flat ground is at `N·L` 0.24 of a 0–0.56 range,
  so every edge is a few degrees from flat; the placement has to be *around*
  flat ground, with the tilt it takes to change band written down.
- Bilinear interpolation of any per-chunk lattice is C0 across a cell, and a
  hard threshold over that discontinuity draws axis-aligned rectangles.
  Smoothstep the interpolant.
- Fog on the ground must fade toward **the sky's colour in that direction**,
  not toward `--void` — otherwise the horizon band is a line the ground is
  cut out of. But not the whole way: a range is darker than the sky behind
  it, and 1.0 there is a violet wash with a rim light in it.
- "Fog in the valleys" written as a density that *falls* with altitude
  un-fogs the far ground, and the far ground is the only thing hiding the
  edge of the world. Add density low; never subtract it high.
- A sky dome is drawn over every sky pixel, so anything per-pixel in it is
  the most expensive thing in the frame — two 4-octave fractal noises were
  1.53ms against the whole landscape's 0.19. Branch the body of it on the
  cheap term (`If(fade > 0)`); fragment branching pays when the branch is
  spatially coherent, which a cloud deck is.
- A shadow marched against the height field in the worker costs **generation
  time, not frame time** — 0.34ms of a 1.10ms chunk, and a render delta
  inside the noise. Two conditions on it reading as light rather than
  speckle: march the coarse field (a floor on the sample spacing) and start
  from the coarse surface, or every detail hollow shadows itself.
- A soft limit written as *cancel the input, add a return, both over a band*
  is never reached: the reader settles where the two cancel. At boost that
  is 80% of the way through the band, so the number to report is the
  equilibrium and not the constant. The hard clamp behind it is a guarantee
  against a dt spike, not a behaviour.
- **The altitude ceiling is not an independent number — it is the cloud
  deck.** `sky.ts` draws the deck only on rays that reach it from below, so
  one unit above it the sky loses its clouds in every direction at once, and
  the fog's 0.35 `dy` takes the ground at the same time. Judge the limit on
  the *spread* of the lower half of the frame, not its mean: the mean falls
  the whole way up and says nothing, the spread holds and then collapses.
- **A headed browser loses OS focus, and `blur` clears every held key.** A
  flight test driven by puppeteer's keyboard therefore measures 0.7s of
  flight and 74s of coasting — and reports a beautifully consistent
  clearance for a camera that is not moving. Re-assert the key as a
  synthetic event every frame; then remember that synthetic keydowns are
  never matched by a keyup, so dispatch a `blur` between runs or `held`
  carries over and the next test flies with the last one's keys down.
- **A per-vertex LOD morph is wrong on a quadtree.** All four children are
  born in the same frame across the whole of the parent's square, so a fade
  keyed to each vertex's own distance has finished at the near corner and
  not started at the far one — and the far half of that square then changes
  in one frame, which is the pop it was there to remove. One weight per
  chunk, off the *parent's* rect distance. It does not open a seam between
  same-level neighbours: along a shared edge both chunks agree about the
  ground and both parents agree about it, so the two ends of the blend are
  equal there and the mix is the same at any weight.
- A morph that is not finished when a chunk is replaced by its own children
  pops by the remainder, because the children show its *unmorphed* surface.
  A chunk is replaced at half the distance it was born at and its rect is
  inside its parent's, so "finished by half the birth distance" is the
  exact condition at every level at once.
- A pop cannot be measured in pixels while the camera is moving — at cruise
  every pixel changes every frame and 0.75 units of travel swamps it. Two
  instruments that do work: read the drawn surface out of the geometry
  buffers at fixed world points (the rasteriser's own interpolation, in
  JS), and for a picture, **hold the pose the frame is drawn from and
  advance only the pose the LOD is decided from**.
- A control test that switches a clamp *off* does not give a like-for-like
  frame cost: with no floor the camera is 12km under the terrain within
  seconds and there is nothing left to draw. Time the function directly
  (`height()` is 0.354µs; the clamp takes five) and use the control only for
  the depth it reaches.
- A full-frame plane is **cheaper than what it hides**. The sky dome runs two
  fractal noises per sky pixel, so a water surface drawn before it is a
  negative cost where it covers half the frame — and drawn *before* the
  terrain it would be the same pixels shaded twice. Draw order is the whole
  performance story of an opaque layer that covers a lot of screen.
- `--void` is the clear colour, the fog target and the sky at the zenith all
  at once. A surface painted in it has no value of its own at exactly the
  angles where its own shading gives it none either, and it reads as a hole
  cut in the terrain rather than as a thing. `--void-lift` is the darkest a
  surface can be and still be one.
- What makes an animated surface read as *fast* is not its speed but
  `speed / wavelength`. Four ripple waves at one speed put the shortest at
  0.38 Hz against the longest's 0.03, and the short one alone moved a 12×12
  block by 10.8 levels of luma a frame. Hold every scale to the same
  frequency band and measure it against the one thing already moving (the
  cloud deck, 1.2).
- A shoreline is where the **drawn** ground crosses the water plane, so the
  LOD moves it: §25 leaves the surface 0.09–0.48 units from the field, and at
  the shore's median slope of 0.081 that is 1 to 6 units of coast sliding as
  you approach. Continuous because the geomorph is; it would have been a jump
  of the same size before it.
- **Grass reads as rain** when what is drawn is thinner than it is long with
  space around it, and no amount of density fixes it: the shape has to be
  about four times as long as it is wide, and clustered into tufts rather
  than scattered as single blades. The other half of the same failure is
  lighting it absolutely — at one or two pixels wide a blade's own `N·L` is
  noise, not shading, and anything more than a step away from the ground it
  stands on reads as weather rather than as cover. Light it by the ground's
  own term and let its facing modulate that.
- A camera-relative layer gated on "how far is the ground under the camera"
  is wrong beside a cliff: ground at the camera's own altitude fifty units
  away is inside the layer's reach while the sample under it says 130. Probe
  the diagonals as well, or ten thousand instances leave the frame in one
  frame — the pop the distance fade exists to prevent, arriving by the back
  door.
- A lattice that is both marched and read has to be sized for what is
  *read*: §23 marched a ring of 196 shadow points of which the interpolation
  only ever touched 169, so §27's per-vertex density came out free. Check
  which ring an interpolation actually reaches before adding one.
- Storing a coarse height in a `Float32Array` and marching from *that* rather
  than from the double it was computed as moves the shadow by 4e-7. Harmless
  here and worth knowing before claiming a surface is unchanged in every byte.
- **A stale `astro preview` binds `[::1]:4321` and shadows a harness server
  bound to `*:4321`**, so every measurement silently hits the project's own
  `dist` instead of the build the harness was pointed at. It survives across
  sessions. Resolve the served asset chain (`/?world` → entry → scene chunk →
  md5) before trusting an A/B, or check `lsof -nP -iTCP:4321 -sTCP:LISTEN`.
- **A camera-relative layer is sized against where the near edge of the frame
  lands, not against how far you can see.** At the opening pose the camera is
  190 units up at 9° of pitch, so the bottom of a 60° frame is 39° below the
  horizon and the nearest visible ground is 315 units along the view — a
  370-unit disc drew nothing at all in the frame the world is composed
  against, while looking correct from every low pose it was tuned at.
- **Baked shade may lag the thing casting it and may never outrun it.** §28
  baked conifer shadows at levels 0 and 1; a level-1 chunk reaches 576 units
  and the trees fade out at 590, so the far ridges came back covered in soft
  dark ellipses with nothing standing in them, which reads as holes cut in
  the ground. The error in the other direction is invisible, because §25's
  morph carries a chunk in from a parent that has none.
- **The bands are placed around flat ground, and an object is not flat
  ground.** At a 32° sun a level surface is `N·L` 0.52 and 14° of tilt changes
  band; an upright cone's sunward face is 0.99 and the facet beside it 0.10,
  so three bands become four across one tree. Compress an object's own `N·L`
  into a range before `band.ts` cuts it, or conifers come back as white
  spikes and boulders as white confetti — the brightest things in the frame.
- **A flight test is order-sensitive and one order is not a measurement.**
  Whichever build runs first in a browser session pays for the cold start,
  comes back 0.3–0.5ms slower per chunk and owns every frame over 25ms —
  enough to make the build with more work in it look *faster* than its own
  control. Run both orders and report both.
- An octahedron scaled three ways is a rhombus from every angle. What makes a
  lump of stone read is that its outline has more corners than its shading
  has bands; eight faces came back as a slope of floating crystals and
  twenty-four as boulders.
- **A shape drawn inside a quad has to fit inside it.** A lobed disc whose
  coverage reaches `EDGE·(1 + LOBE)` past the quad's inscribed radius is cut
  off square, and what comes back is a set of shapes with three or four
  dead-straight sides — which reads as cut paper and is very easy to
  misdiagnose as the *design* being wrong. §30's cloud volume was nearly cut
  over it.
- A lit face asked as `dot(direction from the centre, the light)` is an
  angular sweep, so the terminator is a straight line through the middle of
  the shape. A lit face is a **region**: sample the same shape displaced away
  from the light and take the lens where the two overlap. The displacement
  has to be about a whole radius — the lens is 61% of a disc at half a radius
  and 39% at one.
- **`--rule` against the sky at cloud altitude is very nearly the same
  value**, so an unlit body painted in it disappears and leaves the lit part
  floating with nothing around it. Floor the mix (0.42 of the way to
  `--paper`) rather than starting it at the token.
- The renderer draws a **transparent double-sided** object twice — back faces,
  then front. A billboard built in the camera's own basis never shows its
  back, so `DoubleSide` there is one wasted draw call and twice the triangles.
- **§26's instrument applies to a moving point as well as to a band edge, and
  the arithmetic is about pixels rather than about speed.** A mote rising 1.4
  units a second is 0.066° a frame at twenty units — one pixel, on a core four
  across — and a dot that crosses its own width in four frames measured 10.02
  levels of luma against the cloud deck's 1.03. It is also why a camera-
  relative point layer needs a **near** fade as well as a far one: the camera
  floor is 6 units over ground the motes stand 15.6 above, so some of them are
  always a hand's width from the eye, and one that close is thirty degrees of
  frame rather than a point of light. The near fade alone took 5.51 to 2.72.
- A frame-differencing instrument must **render once after changing what is
  visible and before the first screenshot**, or frame 0 is the previous
  configuration's frame and every reading is the difference between two
  scenes. Tell: readings of 90–115 levels where the layer alone gives 1.
- **A speed limit on a scroll-driven camera cannot be measured as a chord,
  and cannot be measured locally either.** Across a keyframe the route arrives
  at rest and leaves in another direction, so the two ends of a step sit close
  together with sixty units of flight between them — it measures as capped and
  flies at 4,512 units a second. *At* a keyframe the local rate is zero by
  construction, so a cap taken there permits any step at all: 15,410. What
  works is the maximum rate sampled across the whole candidate step, which is
  conservative and converges, at 0.48µs a frame.
- A bound on how far the gesture may run ahead of a rate-limited flight buys a
  short catch-up by **discarding scroll the reader made** — measured, a
  full-route scrub ended 5,957 units short of where it had been scrolled to.
  A reader who is not where they scrolled to has been lied to; a long fly-past
  is the better failure.
- A residual motion that is a pure function of scroll **stops exactly when the
  scroll stops**, which is the thing it exists to prevent. The clock is the
  second input, and it is the only one a pose module may not hold itself.
- **An exponential chase never arrives, and `>=` notices.** `at` approaches
  `want` and sits a vanishing fraction below it for ever, so a reader eased
  *up* to a keyframe is never "at" it: `atSettle()` stays false and §29's
  residual creep silently does not run. It shows up as a beat that does not
  happen rather than as a wrong number, and a snap-to-target makes it the
  common case. Close the last hundredth.
- **A trackpad never goes silent, so no timer over "any input" can mean
  "the gesture ended".** macOS emits wheel events through the entire
  inertial tail at the display rate: measured on a modelled flick, 125
  events over 1,991ms with a median gap of 0ms and **not one gap reaching
  350ms**. Anything gated on silence therefore cannot fire inside a flick,
  and whatever backstop sits behind it fires on every one. Neither Safari
  nor Chrome exposes AppKit's wheel phases to JS; what is available is the
  shape — momentum decays, so a run of consecutive non-growing deltas is the
  tell, and a timer should count only the time the reader is *pushing*.
- **`page.mouse.wheel` has no inertia**, so a synthetic flick ends when the
  script stops and a harness built on it will pass a test the product fails.
  Dispatch the stream from **inside the page** at a real 60Hz cadence: CDP
  round-trips measured ~100ms here, six times too slow to make a tail at all.
- **A speed cap on distance between poses does not bound apparent motion.**
  §31's `fastest()` measures translation, so a keyframe that turns 155° while
  moving 262 units is almost unconstrained by it — measured at 46.5° of yaw
  per 100 scroll units against the route's next worst of 21.9, and it reads
  as a cut. Rotation has to be authored inside the envelope; the cap will not
  catch it.
- **"When does a gesture end" is a question about the input, not about the
  motion it started.** A snap gated on the *flight's* velocity fires only
  after the damped chase has coasted to a stop, so the reader watches the
  camera settle and then move again — two motions where there should be one.
  Gate it on the input rate (damped, plus a floor on the silence) and the
  retarget merges into the flight already running. The floor is what protects
  a deliberate reader: measured, 0.35s covers every wheel cadence up to
  300ms between notches and gives way at 400.
- **A resistance gated on where a gesture *started* is device-dependent.**
  A burst of twenty wheel notches walks into the gate's window and is caught
  from the sixth; one trackpad event carrying the same distance is tested
  once, from outside it, and passes. Same gesture, same distance, two
  answers. Gate on what the step would *reach*, not on where it began.
- **An accumulated-delta threshold with decay converges to `rate × τ`**, so
  it scores a fast gesture above a sustained one — which is backwards if
  what you are trying to tell apart is a flick from a deliberate push.
  Measured at 2,000 units and τ = 0.6, bursts from 600 to 3,000 never
  reached it at all. Duration is the honest signal; magnitude is not.
- **A value derived from a damped position is not itself damped.** The
  gesture being smooth says nothing about what reads it: a band weight taken
  off `scroll.ts`'s output stepped by 0.15 of an opacity and 256px of text in
  one frame at a 1,500px/s scrub. Document mode only looks smoother because
  it has *two* layers — Lenis eases the scroll and GSAP's `scrub: 1` lerps
  the timeline toward wherever that lands. Damp once, upstream of everything
  derived, and exempt a jump.
- **A ramp is a gain on whatever feeds it.** Compressing 0.40 of a band onto
  0–1 and smoothstepping it multiplies the input's per-frame step by 3.75, so
  the block with the narrowest band is the one that still looks snappy after
  the damping is added. Read the ramp width before blaming τ.
- **The last item in a generated series is the one with no successor**, and
  a loop that builds the link *between* items silently omits it. `route.ts`
  gave every station a climb-away except the fourth, which left its band with
  no ramp-out, pinned the writeup open to the final scroll unit, and — because
  the gesture is clamped to `LENGTH` — collapsed every overshoot onto the tail
  of the last reading. It reads as "the last one arrives faster", which is
  what sends you looking at the wrong thing.
- **Lenis clamps a scroll target to its own cached limit**, and every
  programmatic jump in this codebase is made *because* the document just
  changed height — a pin created, a pin released, a deep link corrected. Its
  ResizeObserver has not fired at that point, so the limit is the height of
  the page before the change and the jump silently lands short: `/#philoi`
  asked for 5,927 and got 4,105, which is Homonoia, one project early.
  `lenis.resize()` first. Every document-mode deep link past the first had
  it from §17 to §32.
- **An address has to be read before anything else rewrites it.** `url-sync`
  replaces the path from the *document's* own scroll on the first frame and
  its `replaceState` drops the fragment; `projects.ts` moves the document
  twice, once in the fallback font. Anything that resolves a URL later than
  that — the world, which is behind an adapter request and a dynamic import,
  or a re-jump on `fonts.ready` — is resolving a URL the reader never typed.
  Tell: a deep link landing one project early, consistently.
- A grid track left at `auto` is sized by its widest child, so **one item
  that deliberately overflows the column widens the column**. A metric strip
  at its own width silently re-measured every paragraph beside it and pushed
  the meta row's far end 160px past the box it belongs to.
  `grid-template-columns: minmax(0, 1fr)`.
- A control fixed to the frame is correct until the content under it moves.
  A close button at the top-left is fine at a settle and is sitting inside
  an 88px headline 200px into the reading — put it in the row it belongs to
  and let a key cover the scrolled case.
- **A 45ch column re-breaks an authored headline.** The `<br>` in the
  frontmatter is content's decision about where the line falls; a narrower
  box turns two lines into three and costs a screen. Display type wants
  `max-content` and a bound, not the measure the prose uses.
- **The compositor can present at 30 Hz with the tab genuinely foreground**,
  and then every rAF interval in a flight test is vsync rather than work —
  a median of exactly 33.3ms with a p99 of 35.0 is the tell. Nothing timed as
  a batch between two `onSubmittedWorkDone` is affected, which is why that is
  the frame-cost instrument; "frames over 25ms" simply cannot be reported in
  such a session. Measure the raw rAF interval before trusting one.

---

## Budgets

Check before claiming a step is done.

**Revised at §21 (SPEC §0.7).** The desktop number was set when the world
was one particle field behind a document and the desktop bundle was the
document *plus* the scene. The world is the site now, so the two are
budgeted apart and a reader never pays both.

- Document JS, any viewport: **under 120KB gzipped** (no Three below
  1024px). Measured at §32: **55.18 KiB (56,507 gzipped)**, up 38 bytes on a
  §31 build in the same session at the same gzip level — the address
  `world.ts` and `projects.ts` each capture at import, and Lenis's
  re-measure. §31: 55.0 KiB (56,338), unchanged in content since §21; §28
  measured 55.2 with a `__world` hook still in the entry script
- World chunk, desktop: **under 400KB gzipped**. The old limit was 260KB for
  document + scene together; it bound at §20 (254.8 KiB, 5.2 spare) and that
  is why the WebGL 2 tier does not ship and why the terrain was a Phong
  material rather than a standard one. Both decisions still stand on their
  own merits. Measured at §32: **215.18 KiB** (217,091 + 3,250 worker), of
  which the worker is 0 — the content layer bakes nothing and the worker is
  byte-identical. That is +210 for the beats moving into the dwell, over
  214.97 KiB (216,881) for the rail, the friction and the column's order, over 214.53 KiB (216,433) for the settle at the end of a gesture,
  over 214.38 KiB (216,279) for the damping, the third phase and the last
  climb-away, over 214.10 KiB (215,985) as §32 first shipped, itself up
  **1,541** on a §31 build in the same session at the same gzip level. CSS
  2,035 → **2,548** for the station layer and the `--scrim` token. §31 with every hook removed: **212.5 KiB** (214,426
  + 3,223 worker), of which the route and its driver are 2,205 bytes and none
  of them the worker. §30: **210.4 KiB** (212,221
  + 3,223 worker), of which motes and the cloud volume are 2,253 bytes and
  **none of them the worker** — neither layer has anything to bake, so it is
  byte-identical to §28's. §28 in the same session: 208.2 (its own report said
  209.0; conifers and stone were 3,743 bytes, 842 of them the worker, where
  the shade under a canopy is baked). §27: 205.3, §26: 202.7, §25: 202.1,
  §24: 201.4. A `__world` measurement hook lands in the *entry* script, not
  in the scene chunk, so an A/B of the world chunk is unaffected by it
- **8ms/frame at cruise** is the ceiling everything §0.2 puts *on* the
  landscape shares (steps 25–28 and 30, and after §30 nothing is left to
  spend it), against 0.83 today (§30, DPR 1). The geomorph took
  0.08 of it at the densest stop and nothing measurable at DPR 1.5 — five
  more floats a vertex is vertex-bound, and DPR 1.5 is fill-bound. Water
  took nothing at all (§26: -0.008 / +0.002 / +0.005 measured against the
  same build with the plane hidden) and *gives* 0.02 back where it covers
  half the frame. Ground cover is two costs and both are small: the *tint*
  is +0.077 / +0.037 / +0.014ms at 70 / 190 / 520 (two more floats a vertex
  and the band expression evaluated twice, and it is paid at every altitude),
  and the *disc* is +0.052 / +0.034 / +0.014 at three low poses and nothing
  at all above 58 units over the ground, where it is not drawn. Its fill is
  main-thread work rather than frame cost: 0.070ms a frame over a 75s boost
  flight, worst frame 2.70ms at its 96-cell budget. §30's two are the
  cheapest of the block: the motes are +0.011 / +0.016 / +0.024ms at three low
  poses and *negative* at DPR 1.5 (pure vertex work on a fill-bound frame),
  and are not drawn at all above 126 units over the ground; the cloud forms
  are +0.008 at the opening pose, +0.035 there at DPR 1.5, and **+0.653 at DPR
  1.5 inside a form**, which is their worst case and the one pose where they
  hide the sky dome's two fractal noises entirely. The murk that carries them
  into every other material costs −0.022 to +0.022 — inside the noise.
  Report per layer
- LCP under 2.5s on throttled 4G. Measured at §22: 24ms desktop, 48ms mobile
- **Interactive world under 3s** on a desktop connection
- Under 100 draw calls. Measured at §30 on built code against a §28 build,
  same harness, same session: **58 / 45 / 24** at 70, 190 and 520 units of
  altitude against §28's 56 / 44 / 23 — the cloud forms at every altitude and
  the motes only at 70 — at **0.925 / 0.831 / 0.632 ms/frame** against
  0.900 / 0.833 / 0.613, and 1.283 / 1.227 / 1.104 at DPR 1.5 against
  1.279 / 1.195 / 1.083. That harness now settles every camera-relative layer
  for the pose it measures, which both builds pay for. Earlier, at §28 against
  a §27 build, same harness, same session: **56 / 44 / 24** at 70, 190 and 520 units of
  altitude — two of them §28's — at **0.881 / 0.820 / 0.693 ms/frame** against
  §27's 0.626 / 0.539 / 0.511, and 1.24 / 1.19 / 1.18 at DPR 1.5 against
  1.10 / 1.07 / 1.08. Earlier, at §26 against a §25 build,
  same harness, same machine: **54 / 42 / 22** at 70, 190 and 520 units of
  altitude — one of them the water — at **0.581 / 0.501 / 0.493 ms/frame**
  against §25's 0.590 / 0.497 / 0.490, and ~1.03 at DPR 1.5 either way. §27
  adds one draw call and 86,400 triangles *only below 58 units over the
  ground*: same 54 / 42 / 22 at those three stops, at 0.652 / 0.535 / 0.510
  against a §26 control's 0.575 / 0.498 / 0.496 in the same session.
  **§31 measures the route rather than three altitudes**, because the route is
  where a reader is: 41 poses (every keyframe and the midpoint of every
  segment) on built code came back **0.865ms median and 0.984 worst at DPR 1**,
  1.341 / 1.458 at DPR 1.5, **45–61 draw calls**. The settles are the
  expensive end — they are low enough for the blade disc and the motes to be
  drawn. The driver itself is 0.48µs a frame while its speed cap is binding.
  Counts and timings are a function of the window the harness opens, so
  compare within a run: §25's own figures on the dev server were 53 / 41 / 21
  at 0.64 / 0.54 / 0.50 and §24's 57 / 44 / 24 at 0.521 / 0.477 / 0.455 (§23:
  57 at 0.548; §22: 56 at 0.302; §21, empty: 2 at 0.108; §20: 6 at 2.26).
  Of a cruise frame the sky dome is 0.18ms and the landscape 0.19.
  **§32 adds nothing to the scene**, so those figures stand by construction —
  what it adds is a full-viewport DOM layer over the canvas, which the GPU
  batch instrument cannot see. Measured instead on Chrome's own style and
  layout counters, 12s windows at 1512×804: **one style recalc a frame and
  zero layouts** in every configuration, at 0.084ms a frame with a writeup
  open against 0.099 with no station in frame, and **+0.104ms** of total
  main-thread task time. It measures its own column on arrival, on resize
  and on `fonts.ready`, never per frame, which is what holds the layout
  count at zero. rAF is unreportable from that session — the compositor
  presented at 30 Hz (33.3 median, 34.1 p95) in all eight samples.
  **Re-measured after §32's smoothing pass**, against that build in one 60Hz
  session: still **one recalc a frame and zero layouts**, at 0.055ms open
  against the old build's 0.057, and 0.072 with no station against 0.073.
  Six custom properties a frame instead of five, over four panels instead of
  one, is inside the noise — `put()` compares before it sets, so the three
  panels that are not on screen write nothing. What the pass is *for* is
  measurable in the other instrument: the worst single-frame step in the
  reading at a 1,500px/s scrub went from **255.8px to 65.5**, p95 255.8 to
  31.3, and the last block's worst opacity step from 0.151 to 0.050
- Chunk generation is tracked apart from render cost, because at this scale
  what breaks is a hitch when new ground arrives, not a low average.
  Measured at §24 over 75s of boosted flight: level at 190, 549 chunks at
  4.65ms each in the worker pool (worst 8.1), 0.2ms worst on the main
  thread, **zero frames over 25ms**; terrain-hugging at boost, 632 at 5.06.
  §25's parent patch put that up 4% on the mix and 26% on a level-0 chunk
  (1.21 → 1.52ms in Node; a root chunk, which never morphs, is 1.14), and
  geometry per chunk from 109.7 to 160.4 KB — 28.2 MB alive at the opening
  pose. Nothing under it moved: same draw calls, same triangles, same end
  pose, same 6.000 clearance. §26 changed none of it — the worker is
  byte-identical and 75s of the same flight came back 638 chunks either way,
  3.67 against 3.54ms, p99 18.2 against 18.3. §27 bakes a density on the same
  lattice and costs 0% to +2% in Node — it narrowed the shadow march to the
  ring the interpolation reads (196 → 169 points), which paid for it — and
  the flight came back 638 chunks at 3.34 against the control's 3.67, p99
  18.2 against 18.3. Geometry per chunk 160.4 → 180.7 KB, 31.8 MB alive at
  the opening pose. §30 changes none of it — the worker is byte-identical
  again and 75s of the same flight came back 674/677 chunks either way, 8.44
  to 8.99ms in a session whose compositor was presenting at 30 Hz. Its own
  fill is the smallest of the three: 10,221 cells for **0.072ms a frame,
  worst frame 1.90ms** at a 96-cell budget, against the blade disc's 0.409
  and worst 4.50 in the same run, and with no shadow marches in it at all.
  §23's 1,772 chunks was an *unbounded* 13.5km flight and cannot be
  reproduced now that the world is 6.4km across
- The camera's clearance over the ground is **exactly 6.000 units** in every
  flight that tries to break it, and the clamp costs 1.8µs a frame. The route
  never reaches it: its least clearance is **13.00 units** by construction —
  at Enargeia's settle, and unchanged by §32's extra keyframe — and 12.6 as
  flown
- **The route is flown two ways** (§31), because they measure different
  things. A reader (a 600px burst, then 700ms) never sees the speed cap bind
  at the end of a gesture — 283 units/s median, and the camera is where the
  scroll says the moment they stop. A 1,500px/s continuous scrub is what the
  cap is for, and it costs a **14-second fly-past** after the last wheel
  event. rAF median 16.4ms either way, 5 or 6 frames over 25ms in ~1,450,
  never more than 3 chunks pending
- 60fps on integrated graphics, with LOD doing the work
- Lighthouse accessibility **100**. axe-core measured at §32 in world mode
  too, and it needs one thing document mode does not: the station panel has
  to be a **named landmark of its own**, because the document's `<main>` is
  behind an opaque canvas and out of the accessibility tree. Without it,
  three `region` violations; with it, zero in both modes
- Usable at 360px wide with motion off

---

## Working agreement

- **One numbered step per session.** Don't drift into the next one.
- **Stop and ask** rather than substituting an approach. Especially: a
  different typeface, a different library, a workaround that changes
  architecture.
- **Report what you measured**, not that it "should" work. Sizes, counts,
  timings.
- Don't add comments explaining what code does. Comment only *why*, where
  a choice would otherwise look arbitrary.
- Commit at the end of a step, message in the imperative: `Self-host fonts`.
