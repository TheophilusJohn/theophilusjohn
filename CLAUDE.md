# theophilusjohn.com

Personal portfolio for Theophilus Biju John. Astro 7, deployed to Cloudflare Pages.
Live at https://theophilusjohn.com — every commit to `main` deploys.

Full design spec: `docs/SPEC.md`. Numbered build steps: `docs/STEPS.md`.

---

## What this site is

Portfolio-first, four projects, heavily animated, dark. Two modes:

- **World mode** — a flyable, cel-shaded night landscape. The four projects
  are structures standing in it. **This is what loads** on WebGPU, ≥1024px,
  motion on. See SPEC §0.
- **Document mode** — the site is ONE page. All content lives on `/`. Deep
  links work via History API `replaceState`, not routes. Crawlable,
  accessible, fast. It must stand entirely alone. It is what everything else
  gets, what `?doc` forces, and the escape hatch from inside the world.

**The world loads first and the document is the escape hatch, not the
shell.** That reversed at step 21; steps 15–20 built the world as a layer
*behind* a scrolling document, and SPEC §0 records what that assumption
cost. Document mode was finished and shipped first (steps 1–14) and stays
finished — that is what makes the reversal survivable. Steps 21–35 build the
world. See `docs/STEPS.md`.

**The landscape is five files and only one of them can see a GPU** (§22).
`height.ts` is the field and imports nothing — no three, no DOM — so Node
runs the `.ts` directly and every number about the terrain is that
function's own output. `chunk.ts` samples it into arrays, `grid.ts` is the
vertex layout the worker and the main thread both index, `terrain-worker.ts`
runs the generator off the main thread, and `terrain.ts` is the only part
that knows what a mesh is. Keep it that way: a worker that reaches anything
in three is a second copy of the renderer.

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

**The landscape is alive from §0.2 (decided at §24).** §4.7's "no trees,
rocks, water, clouds" is reversed and steps 25–29 build what replaces it:
geomorph, water, ground cover and wind, rocks and conifers, motes and cloud
volume. Everything scattered on the terrain is placed by a **pure function of
`(x, z)`** — chunks generate independently, in three workers, in any order,
and anything stateful would make two chunks disagree about their shared edge.

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
- A control test that switches a clamp *off* does not give a like-for-like
  frame cost: with no floor the camera is 12km under the terrain within
  seconds and there is nothing left to draw. Time the function directly
  (`height()` is 0.354µs; the clamp takes five) and use the control only for
  the depth it reaches.

---

## Budgets

Check before claiming a step is done.

**Revised at §21 (SPEC §0.7).** The desktop number was set when the world
was one particle field behind a document and the desktop bundle was the
document *plus* the scene. The world is the site now, so the two are
budgeted apart and a reader never pays both.

- Document JS, any viewport: **under 120KB gzipped** (no Three below
  1024px). Measured at §24: 55.3 KiB, unchanged in content since §21 — the
  one byte that moves is the hash of the scene chunk it names
- World chunk, desktop: **under 400KB gzipped**. The old limit was 260KB for
  document + scene together; it bound at §20 (254.8 KiB, 5.2 spare) and that
  is why the WebGL 2 tier does not ship and why the terrain was a Phong
  material rather than a standard one. Both decisions still stand on their
  own merits. Measured at §24: 201.4 KiB, of which the terrain worker is 1.7
  — the whole movement system was 555 bytes
- **8ms/frame at cruise** is the ceiling everything §0.2 puts *on* the
  landscape shares (steps 25–29), against 0.48 today. Report per layer
- LCP under 2.5s on throttled 4G. Measured at §22: 24ms desktop, 48ms mobile
- **Interactive world under 3s** on a desktop connection
- Under 100 draw calls. Measured at §24: **57 / 44 / 24** at 70, 190 and 520
  units of altitude, at **0.521 / 0.477 / 0.455 ms/frame** — 0.98 at DPR 1.5
  (§23: 57 at 0.548; §22: 56 at 0.302; §21, empty: 2 at 0.108; §20: 6 at
  2.26). Of a cruise frame the sky dome is 0.18ms and the landscape 0.19
- Chunk generation is tracked apart from render cost, because at this scale
  what breaks is a hitch when new ground arrives, not a low average.
  Measured at §24 over 75s of boosted flight: level at 190, 549 chunks at
  4.65ms each in the worker pool (worst 8.1), 0.2ms worst on the main
  thread, **zero frames over 25ms**; terrain-hugging at boost, 632 at 5.06.
  §23's 1,772 chunks was an *unbounded* 13.5km flight and cannot be
  reproduced now that the world is 6.4km across
- The camera's clearance over the ground is **exactly 6.000 units** in every
  flight that tries to break it, and the clamp costs 1.8µs a frame
- 60fps on integrated graphics, with LOD doing the work
- Lighthouse accessibility **100**
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
