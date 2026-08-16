# theophilusjohn.com — build spec v2

Personal site for Theophilus Biju John. Portfolio-first, heavily animated, dark.

Reference for feel: wodniack.dev — warm near-black, oversized display type, ambient data texture, machine-style project IDs, scroll as the primary structure. Not a copy: the ambient texture here is real Raft log output, not decorative binary.

Supersedes v1. The OpenLDAP writeup is out.

---

## 1. Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Astro 5 | Same as the reference site. Zero JS baseline, opt into islands |
| Animation | GSAP 3.13+ with ScrollTrigger and SplitText | Free for commercial use since April 2025, all plugins included |
| Smooth scroll | Lenis | Does not break `position: sticky`, which pinned sections depend on |
| 3D | Three.js r171+ via `three/webgpu` | `WebGPURenderer`, TSL shaders, automatic WebGL 2 fallback. Laptop geometry from primitives — no GLTF, no loader, no Draco |
| Page transitions | Astro `<ClientRouter />` (View Transitions) | See §4.6 for the teardown problem |
| Styling | Plain CSS, custom properties | No Tailwind |
| Fonts | Self-hosted woff2, variable, subset | Display face needs a width axis |
| Deploy | Cloudflare Pages | Domain already on Cloudflare |

**Do not install** Motion, Anime.js, React Spring, or Trig.js. Motion and Anime.js duplicate GSAP and two timeline engines animating the same nodes causes jank. React Spring is React-only. Trig.js optimises for a byte budget this project isn't keeping.

**Do not install** GSAP ScrollSmoother. It overlaps Lenis — Lenis is the pick. Running both fights over scroll position.

No React. If an island needs a framework, use Preact.

---

## 2. Design tokens

### Palette

Violet-black. Cool, near-neutral, with enough hue that the accent belongs to it rather than sitting on top of it.

```css
--void:      #14121F;  /* page */
--void-lift: #1C1A2B;  /* raised panels */
--rule:      #2A2640;  /* hairlines */
--dim:       #4A4470;  /* metadata, IDs, log text */
--muted:     #9A93C0;  /* body copy */
--paper:     #EDEAFB;  /* headings, primary text */
--leader:    #A99BF5;  /* the accent */
--mint:      #C6E9D2;  /* optional second accent, currently unused */
```

`--leader` is lavender and carries one meaning everywhere it appears: active, elected, current. Never use it as generic decoration — if it isn't marking state or a live link, it shouldn't be lavender.

The practical reason for lavender over the earlier amber: in the render layer the accent is drawn as thousands of overlapping translucent particles. Lavender stays saturated as it stacks. Amber goes brown and cyan blows out to white.

`--mint` is held in reserve as a second accent — useful if a state ever needs to be distinguished from *elected* (committed vs. pending, say). Don't introduce it without a reason.

### Type

Display face needs a **variable width axis**. Hero is set at the expanded end (~120) at very large sizes with tight negative tracking; body sits nearer normal width. Candidates to audition: Archivo Expanded, Anybody, Roboto Flex. Pick by setting the actual word "Homonoia" at 180px and seeing which one holds up.

Mono carries all metadata — project IDs, log texture, nav, captions. IBM Plex Mono unless something with more character survives at 10px.

Set the scale in `tokens.css` and use it. No arbitrary font sizes anywhere.

### Hero copy

Single word: **Developer**. Set at maximum scale, expanded width axis, tight negative tracking, filling the hero width edge to edge.

Because it's one word it can't carry a two-line stack, so the amber moves to the subline: the headline makes the broad claim, the subline immediately narrows it. `Distributed systems, consensus, replication.` in `--leader`, remainder in `--muted`.

The laptop moves below or behind the word rather than beside it — a single word at full width leaves no room for a side-by-side arrangement.

### Ambient texture

Bands of monospace Raft log lines drifting horizontally at `--dim`, above and below the hero and between major sections.

Content must be **real output shapes**, not lorem: `term=5 idx=0120 vote granted n4→n1`, `n3 state=follower applied=0119`, `append k=philoi len=0118`. Someone who knows Raft should be able to read a band and recognise a leader election. That's the whole point of the device and it's what makes it yours rather than borrowed.

Generate the lines from Homonoia's actual simulation output where possible. Loop seamlessly by duplicating the string and translating `-50%`.

---

## 3. Content

Four projects. Each gets a full page — no thumbnail grid, the reference site's grid works because it has 34 entries.

1. **Homonoia** — `#hmna-0001/04`
2. **Philoi** — `#phli-0002/04`
3. **Basis** — `#bass-0003/04`
4. **Enargeia** — `#enrg-0004/04`

Order is not settled — see §8. With pinned sections the first project takes disproportionate attention, so sequence deliberately rather than by date.

Plus: about page, resume PDF download, contact links. No blog.

### Frontmatter schema

```ts
{
  title: string
  machineId: string          // "#hmna-0001/04"
  summary: string            // max 140 chars, result-first
  role: string
  period: string
  stack: string[]
  metrics: { value: string, label: string }[]   // max 4
  liveUrl?: string
  repoUrl?: string
  order: number
}
```

### Writeup structure

Four beats, same every time: **constraint** (what was actually hard), **decisions** (two or three, each with the rejected alternative), **result** (quantified — no adjectives doing a number's job), **what I'd change** (specific and honest; this is the section that separates a portfolio from a resume).

---

## 4. The six set pieces

### 4.1 Page-load intro

Runs once per session, gated on `sessionStorage`. Nobody should sit through it twice.

Sequence: log bands fade in and start drifting → display type masks up line by line → nav and metadata fade last. Total budget **under 1400ms**. Bail immediately if reduced motion is on.

Do not block content on webfont load. Use `font-display: swap` and start the reveal on `document.fonts.ready` with a hard 800ms timeout fallback.

### 4.2 Hero type reveal

GSAP SplitText, masked line reveal — lines translate up out of an overflow-hidden clip, staggered.

SplitText's rewrite includes screen-reader handling, so it restores the original text to assistive tech. Verify with VoiceOver anyway; a hero split into per-character spans that reads as gibberish is a real failure mode.

### 4.3 Pinned project sections

Each of the four pins on scroll while its content advances, then releases.

- `pin: true`, `scrub: 1` on the ScrollTrigger
- `anticipatePin: 1` to stop the jump at pin start
- Disable pinning below 900px — pinned sections on mobile trap the scroll and feel broken. Fall back to a plain stacked reveal.
- Amber machine ID sits in the pinned corner and increments as sections pass

### 4.4 The laptop

**Not a separate canvas.** The laptop is geometry inside the persistent scene described in §4.7 — same `WebGLRenderer`, same scene graph, same render loop, same camera. There is exactly one WebGL context on this site.

A laptop in three-quarter view, lid open, screen rendering a live terminal. Particles from the field flow around and behind it. As the hero releases on scroll the laptop recedes and dims into the field, and the simulation continues alone down the rest of the page. It is never unmounted — on a project route it sits far back and out of focus.

#### Geometry

Built from primitives. No downloaded model, no GLTF loader, no Draco. A laptop is a rounded box for the base, a rounded box for the lid, a plane for the display, and a slightly inset plane for the bezel. Around 30KB on top of Three itself.

Materials: `MeshStandardMaterial`, dark cool grey to sit inside the palette rather than photoreal aluminium. Two lights — one key, one rim in `--leader` catching the lid edge. No environment map, no post-processing, no shadows.

#### Depth and blending

The one real gotcha in merging the two. Field particles are additively blended and must not write depth, or they punch holes in each other and in the laptop.

- Laptop meshes: opaque, `depthWrite: true`, rendered first
- Particles: `depthTest: true`, `depthWrite: false`, `blending: AdditiveBlending`, rendered after
- Set `renderOrder` explicitly rather than trusting Three's default sort

Get this wrong and particles either vanish behind the lid or draw on top of the screen. Both look broken in different ways.

#### The screen

Terminal output rendered to a `CanvasTexture` mapped onto the display plane. Draw monospace text to an offscreen 2D canvas, scroll it, flag `texture.needsUpdate` — this is far cheaper than `CSS3DRenderer` and doesn't fight the WebGL compositing.

**Content comes from Homonoia's simulation.** Real leader elections, real term increments, real log replication — the same source as the drifting bands in §2, just rendered on the display. The 2D cluster visualisation is gone but the simulation core is still doing the work behind it.

Update the canvas on an interval (~8fps is plenty for terminal text), not every animation frame. Redrawing text at 60fps is pure waste.

Accessibility: canvas text is invisible to screen readers. The same log lines must exist in a visually-hidden `<pre aria-hidden="false">` adjacent to the canvas, or the screen content is simply absent for assistive tech.

#### Motion

Slow idle float and a subtle rotation tracking pointer position, clamped to a few degrees. On scroll, the laptop rotates and recedes as the hero releases — tie to the same ScrollTrigger that drives the hero type reveal so they move as one gesture.

#### Constraints

Everything about loading, DPR, mobile, fallbacks and pausing is inherited from §4.7 — the laptop has no independent lifecycle. Only these are specific to it:

- The laptop is added to the scene *after* first paint of the field, so the background establishes before the object arrives
- Tree-shake hard: import only `WebGLRenderer`, `Scene`, `PerspectiveCamera`, and the geometries and materials actually used. No `OrbitControls`
- Clicking the laptop routes to the Homonoia writeup. It needs a real focusable DOM element over it — a mesh is not keyboard reachable
- The static fallback PNG in §4.7 must include the laptop, since there is no path where the field renders and the laptop doesn't

### 4.7 Persistent render layer

**The architectural decision that separates this from a normal page.** Read before building anything in §4.

A fixed, full-viewport canvas at `z-index: 0` that mounts once and never unmounts. All content is normal DOM above it at `z-index: 1`. The canvas is *not* a hero element — it is the environment the entire site sits inside.

This is the **only** WebGL context on the site, and it is created once for the session. The laptop in §4.4 is an object within this scene, not a second canvas.

#### Persistence is free

Because the site is one page (§4.6), the canvas mounts once and is never torn down. There is no navigation to survive.

What replaces the old requirement: the scene must react to **scroll position**, not to route. Section boundaries drive the simulation state. Verify by scrolling the full page top to bottom and back — the scene must never reset, flash, or reinitialise, and its state must be a pure function of scroll position so that landing deep-linked mid-page looks identical to having scrolled there.

#### Compute-driven, not decorative

The scene is a GPU compute simulation, and its state is driven by whatever section is in view:

- **Homonoia** — consensus message passing as a field: five attractors, messages as advected particles, leader shifts redistributing the flow
- **Enargeia** — token activations; the field driven by actual inference output
- **Philoi** — concurrent edits converging; two divergent states resolving into one
- **Basis** — quietest state, near-still

This is the part that makes the site un-copyable. A generic particle field says nothing. A field computed by the same class of kernel that runs the inference engine is the portfolio arguing for itself.

#### Renderer

**Resolved: Three.js `WebGPURenderer` with shaders authored in TSL.**

Since r171 (September 2025) the WebGPU renderer is production-ready via `import * as THREE from 'three/webgpu'`, with automatic WebGL 2 fallback. Safari 26 shipped WebGPU, so coverage is effectively universal. TSL compiles the same shader source to WGSL or GLSL depending on the active renderer, so there is no second shader codebase to maintain.

This removes the earlier WebGPU-vs-WebGL2 fork entirely: WGSL knowledge from Enargeia transfers, compute passes are available, and the fallback path is handled by the library rather than hand-written.

Note `await renderer.init()` before the first render — WebGPU initialisation is async, unlike WebGL.

Compute-driven particle counts in the hundreds of thousands are realistic on WebGPU, against roughly 50k on WebGL. Size the field for WebGPU and let the fallback reduce density rather than designing for the floor.

#### Constraints

- Cap DPR at 1.5 for the background layer; it is out of focus behind text and does not need retina resolution
- Halve the simulation resolution below 1024px; disable entirely below 768px
- Reduced motion → freeze on a single computed frame, do not remove the canvas
- Pause the loop on `visibilitychange` — a compute simulation running in a background tab is a battery complaint
- Text contrast is measured *against the busiest frame the scene can produce*, not against the average. If the scene can ever wash out body copy, the scene is wrong — darken it, don't lighten the text

### 4.9 World mode

The render layer given a camera path and depth. Not a separate build — the same scene, same renderer, same simulation, extended into Z.

#### Two modes, one content

| | Document mode | World mode |
|---|---|---|
| Default for | Crawlers, reduced motion, no WebGL, mobile, `?mode=doc` | Capable desktop hardware |
| Navigation | Normal scroll | Same scroll, driving a camera. Free flight unlockable |
| Content | DOM | DOM, opened from landmarks |

**The writeups are identical in both.** Document mode is not a fallback stub — it is the full site from steps 1–3, and world mode is a shell around the same HTML. Anything true only in world mode is atmosphere, never information.

A visible, persistent control switches modes. Remember the choice in `localStorage`.

#### Movement

Camera follows a spline. Scroll position maps to distance along it, driven by the same Lenis instance as document mode — one scroll authority, not two. Since both modes are the same page and the same scroll, switching modes is a change of representation, not of position.

Free flight unlocks once the visitor reaches the fourth landmark, or immediately via a control. Pointer-drag to look, WASD or drag-to-move. Bound the volume; a visitor who flies into empty black and can't find their way back is a lost visitor. Provide a *return to path* control that is always visible in free flight.

#### Landmarks

Four structures in the volume, one per project, positioned along the spline in the order set in §3. Each has three states: distant (silhouette only), approaching (label and machine ID resolve), arrived (writeup opens in DOM).

The laptop from §4.4 is the first landmark — the hero object becomes the entry point rather than a separate thing.

#### Scroll position is the source of truth

One page (§4.6), so a landmark is a scroll range, not a route. Arriving at Homonoia does `replaceState` to `/projects/homonoia`; loading that URL flies the camera to that range. Both directions must work.

Because scroll drives both modes, switching between them mid-page must land in the same place. Test this specifically: scroll to Philoi in document mode, switch to world, and the camera should already be at Philoi rather than at the start of the spline.

#### Performance

- Instance the field; never one draw call per particle
- LOD on landmarks: silhouette geometry at distance, detail only on approach
- Frustum cull aggressively — the volume is mostly empty and mostly behind you
- Hold 60fps on integrated graphics, or reduce field density until it does
- Preload nothing beyond the next landmark on the spline

#### Accessibility

World mode is not required to be keyboard-navigable as a 3D space. It **is** required to be escapable: the mode switch must be reachable by keyboard from anywhere, and `Esc` returns to the path.

Every piece of information in world mode must exist in document mode. That is the accessibility story — not making a flight simulator screen-reader friendly, but guaranteeing nothing is lost by never entering it.

### 4.10 Custom cursor

- **Only on `(pointer: fine)`.** Never initialise on touch. This is the single most common way custom cursors break a site.
- Never hide the native cursor over text inputs or links without a visible substitute state
- GSAP `quickTo()` for the follow, not per-frame `set()`
- States: default dot, expanded ring over project rows, amber over links
- Reduced motion → don't initialise at all, native cursor only

### 4.6 One page, no transitions

**The site is a single document.** Everything — hero, all four projects, about — lives on `/`. There are no route changes and no `<ClientRouter />`.

This is the decision that simplifies everything else. Nothing to tear down, nothing to re-init, no dead node references. The canvas persists because it never unmounts; the camera and the scroll position are the same variable.

Total prose across the whole site is roughly 600 words. Four separate routes was heavy machinery for that, and a continuous 3D space that hard-navigates between documents fights itself.

#### URLs still work

Deep links are not negotiable — sending someone straight to one project is the most common thing this site will be used for. The History API carries them without routes:

- Scrolling a project section past a threshold does `history.replaceState` to `/projects/enargeia`. **`replaceState`, not `push`** — pushing on scroll floods the back stack and makes the back button useless.
- Loading `/projects/enargeia` directly scrolls (document mode) or flies (world mode) to that section, without animating from the top.
- `popstate` moves to the matching section.

Astro still needs to emit those paths so they resolve on Cloudflare rather than 404ing. Keep `getStaticPaths` and render a real page per project containing that project's content — crawlable, and the fallback if JS never runs. On load with JS, redirect to `/#enargeia` equivalent or hydrate in place; decide which and write it down.

#### What this deletes

- The View Transitions teardown, formerly the most likely thing in this build to break
- Canvas persistence machinery in §4.7
- Two scroll authorities. Document scroll and camera-along-spline become one mechanism

### Lenis ↔ ScrollTrigger wiring

Required for pinning to track smooth scroll:

```js
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

---

## 5. The two toggles

Both live in the header, both persist to `localStorage`, both apply before first paint via an inline script in `<head>` to avoid a flash.

### Reduced motion

Three states: `auto` (follow the OS), `on`, `off`. Default `auto`.

When motion is off: no intro sequence, no scrub, no pinning, no cursor, no drift on the log bands, no page transitions. Every reveal becomes an instant final state — **not** a shortened animation. Content must be fully reachable and readable.

This isn't a courtesy feature. It's what keeps the site usable for a hiring manager on a laptop trackpad who finds the motion nauseating.

### Contrast

Toggles a `[data-contrast="high"]` token set: `--paper` to pure `#FFFFFF`, `--muted` lifted to at least 7:1 against `--void`, `--dim` lifted to 4.5:1, hairlines to `--rule` at double opacity. The accent shifts lighter to hold contrast on dark.

Audit the default palette too — `--dim` at `#4A4470` on `#14121F` is intentionally low-contrast texture, which is fine for decorative log bands but must never carry information that isn't repeated elsewhere.

---

## 6. Budgets

Hard limits. Check before launch, not after.

- **Homepage JS, mobile: under 120KB gzipped.** Three.js is not loaded below 768px, so this stays achievable
- **Homepage JS, desktop: under 260KB gzipped**, GSAP + Lenis + Three included
- **LCP under 2.5s** on a throttled 4G mobile profile. The hero PNG is the LCP element on mobile — compress it properly
- Laptop scene holds 60fps on integrated graphics. If it can't, cut geometry detail before cutting the screen content
- No layout shift from the intro sequence — CLS under 0.1
- Lighthouse accessibility 100
- Every interactive element reachable and visibly focused by keyboard
- Site fully usable at 360px wide with motion disabled

If the desktop budget blows, the laptop is what gets deferred or simplified — never the accessibility work.

---

## 7. Build order

Get the domain resolving on day one, then layer motion on top of a site that already works without it.

1. Astro scaffold, Cloudflare Pages, `theophilusjohn.com` live on an empty page
2. Tokens, type scale, fonts subset and self-hosted
3. **Full static site: all four project pages, about, contact, resume. No animation at all.** This is the fallback layer and it must stand alone.
4. Both toggles, wired to a `data-motion` attribute nothing reads yet
5. Lenis + ScrollTrigger wiring, log band drift
6. Hero type reveal (SplitText)
7. Pinned project sections
8. Page-load intro
9. 3D laptop hero — geometry first, then the canvas terminal, then the static PNG fallback. Render the PNG *from* the finished scene so they match
10. Custom cursor
11. Collapse to one page — all content on `/`, plus `replaceState` URL sync and deep-link entry (§4.6)
12. Budget and accessibility pass

**Ship here.** Steps 1–12 are the complete document-mode site and it stands entirely on its own. Everything below is world mode, which is a second project layered on top of a finished one.

13. Give the scene depth — field extends into Z, camera spline laid out
14. Landmarks: geometry, three states, positions along the spline
15. Mode switch, `localStorage` persistence, scroll ↔ camera sync both directions
16. Rails movement wired to Lenis
17. Free flight, bounds, return-to-path control
18. LOD, instancing, culling, 60fps pass on integrated graphics

Steps 1–3 are a shippable site. If momentum dies at any point after step 3, what's live is still a real portfolio.

---

## 8. Open decisions

- Project order — Enargeia leading vs. Homonoia leading
- Display typeface — audition three against "Homonoia" at 180px

---

## 10. Skills ramp

Already in hand: TypeScript, Astro, GSAP, WGSL compute (Enargeia), distributed systems.

**Vanilla Three, not React Three Fiber.** R3F exists to reconcile a component tree; this scene is one canvas that mounts once and never unmounts. Keeping a React root alive across View Transitions is more fragile than keeping a plain renderer alive, and drei's helpers are all things this scene doesn't use. TSL and compute are renderer-agnostic, so R3F-based tutorials still apply — only their `<Canvas>` setup differs.

To learn, in build order:

1. **Three.js core** — scene graph, cameras, materials, lights, render loop, disposal. The largest gap; a wide API rather than a hard one
2. **TSL** — node-based shader authoring. New syntax, but the WGSL model transfers directly
3. **GPGPU in Three** — compute nodes, storage buffers, instanced particles. Closest to work already done
4. **Camera splines** — `CatmullRomCurve3`, frames along a curve, damped follow. Small topic, and it is the entire rails system
5. **ScrollTrigger driving a camera** rather than DOM properties, plus the Lenis wiring in §4.6
6. **Performance tooling** — `stats-gl`, `renderer.info`, Spector.js. Under 100 draw calls. Dispose geometries, materials, textures, render targets — leaks are what kill a scene that never unmounts, which is this architecture exactly
7. **Astro islands and View Transitions persistence** — smallest item, biggest silent failure

### Resources, one per job

| For | Use | Note |
|---|---|---|
| Three.js core (1) | Three.js Journey | Core chapters only. Its shader chapters are GLSL-era and superseded |
| TSL (2) | Maxime Heckel, *Field Guide to TSL and WebGPU* | Written by someone who knew shaders and learned the new layer — the same position |
| TSL reference | `threejs.org/docs/TSL.html` | Consult, don't read through |
| Compute (3) | Official Three.js WebGPU compute examples | Read the source. This is the real documentation |
| Traps | utsubo, *Migrate Three.js to WebGPU (2026)* | Read once before writing anything |
| Codegen | `dgreenheck/webgpu-claude-skill` | Install in Claude Code first — keeps generated code on r183+ API |
| Scroll (5) | GSAP ScrollTrigger docs and demos | Nothing third-party beats them |

Splines, instancing and LOD need no course — a docs page each.

### Known traps

- `await renderer.init()` before first render. WebGPU init is async; WebGL was not
- Feature-detect with `renderer.isWebGPURenderer`, not `capabilities.isWebGL2`, which is undefined under WebGPU
- Never mix `three` and `three/webgpu` imports in one codebase. Use `three/webgpu` everywhere
- WebGPU support in Three is not universally called production-ready — Threlte's docs still advise against it in production while recommending r171+ if used. The automatic WebGL 2 fallback contains the risk, but expect breaking changes across versions and pin the Three version
