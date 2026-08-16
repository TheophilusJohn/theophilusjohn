# theophilusjohn.com — build spec v2

Personal site for Theophilus Biju John. Portfolio-first, heavily animated, dark.

Reference for feel: wodniack.dev — warm near-black, oversized display type, ambient data texture, machine-style project IDs, scroll as the primary structure. Not a copy: the ambient texture here is real Raft log output, not decorative binary.

Supersedes v1. The OpenLDAP writeup is out.

---

## 1. Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Astro 7 | Zero JS baseline, opt into islands. Upgraded from 5 — check v7 docs, not v5 |
| Animation | GSAP 3.13+ with ScrollTrigger and SplitText | Free for commercial use since April 2025, all plugins included |
| Smooth scroll | Lenis | Does not break `position: sticky`, which pinned sections depend on |
| 3D | Three.js pinned at 0.185.1 via `three/webgpu` | WebGPU only (§15) — a `Renderer` on a `WebGPUBackend`, TSL shaders, no WebGL 2 fallback. A browser without WebGPU gets the document, which is the whole site. Laptop geometry from primitives — no GLTF, no loader, no Draco |
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
--dim:       #8780B2;  /* metadata, IDs, log text */
--muted:     #9A93C0;  /* body copy */
--paper:     #EDEAFB;  /* headings, primary text */
--leader:    #A99BF5;  /* the accent */
--mint:      #C6E9D2;  /* optional second accent, currently unused */
```

`--leader` is lavender and carries one meaning everywhere it appears: active, elected, current. Never use it as generic decoration — if it isn't marking state or a live link, it shouldn't be lavender.

The practical reason for lavender over the earlier amber: in the render layer the accent is drawn as thousands of overlapping translucent particles. Lavender stays saturated as it stacks. Amber goes brown and cyan blows out to white.

`--mint` is held in reserve as a second accent — useful if a state ever needs to be distinguished from *elected* (committed vs. pending, say). Don't introduce it without a reason.

**Revised (§14): `--dim` is `#8780B2`, not the `#4A4470` this section shipped with.** The old value was 2.07:1 on `--void` and accounted for every one of the 100 axe violations §14 measured — the whole primary nav, both section headings, the period, the stack, the metric labels, the footer, the log bands. Same hue and saturation, lightness only, 5.07:1; the high-contrast value moved with it, to 7.42:1, because a toggle that shifts contrast by half a point looks broken. **Do not restore the darker value.** What it encoded survives as a rule about *what the token is used for* — `--dim` is texture and must never carry information said nowhere else — and a contrast checker cannot see that distinction anyway.

### Type

Display face needs a **variable width axis**. Hero is set at the expanded end (~120) at very large sizes with tight negative tracking; body sits nearer normal width. Candidates to audition: Archivo Expanded, Anybody, Roboto Flex. Pick by setting the actual word "Homonoia" at 180px and seeing which one holds up.

Mono carries all metadata — project IDs, log texture, nav, captions. IBM Plex Mono unless something with more character survives at 10px.

Set the scale in `tokens.css` and use it. No arbitrary font sizes anywhere.

### Hero copy

**Revised: the hero is the name.** Two lines — `Theophilus` / `John` — at maximum scale, `wdth` 125, tight negative tracking, bleeding off the right edge at full width. The earlier single word **Developer** is out: on a portfolio the name is the thing worth setting at 16rem, and one word could not carry the two-line stack the scale wants.

The subline narrows the claim the way the old headline was going to: `Builds systems that have to agree with each other.` — the whole line in `--leader`, which is the accent §2 fixes as *state*, doing the job the amber subline was drafted for.

The laptop is not beside the hero. At hero scroll the camera is high above the world looking down (§4.7), so the laptop is far below it as landmark one — the arrangement is a camera position, not a layout.

### Ambient texture

Bands of monospace Raft log lines drifting horizontally at `--dim`, above and below the hero and between major sections.

Content must be **real output shapes**, not lorem: `term=5 idx=0120 vote granted n4→n1`, `n3 state=follower applied=0119`, `append k=philoi len=0118`. Someone who knows Raft should be able to read a band and recognise a leader election. That's the whole point of the device and it's what makes it yours rather than borrowed.

Generate the lines from Homonoia's actual simulation output where possible. Loop seamlessly by duplicating the string and translating `-50%`.

---

## 3. Content

Four projects. Each gets a full page — no thumbnail grid, the reference site's grid works because it has 34 entries.

1. **Enargeia** — `#enrg-0001/04`
2. **Homonoia** — `#hmna-0002/04`
3. **Philoi** — `#phli-0003/04`
4. **Basis** — `#bass-0004/04`

**Settled: Enargeia leads.** With pinned sections the first project takes disproportionate attention, and the browser-native inference engine is the one that most needs the reader still fresh. The machine IDs number the running order, so they moved with it. `src/content/projects/` is the authority for both and this list follows it, not the other way round.

Plus: about page, resume PDF download, contact links. No blog.

### Frontmatter schema

```ts
{
  title: string
  machineId: string          // "#enrg-0001/04" — numbers the running order
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

## 4. The eight set pieces

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
- The machine ID sits in the section's own top row in `--leader`. **Revised (§11):** it does not increment in a pinned corner — what tracks position through the pin is the rule between the two columns, filling in `--leader` as the section advances. One accent, one meaning: the part of the section already behind you

### 4.4 The laptop

**Not a separate canvas.** The laptop is geometry inside the persistent scene described in §4.7 — same `Renderer` on the same `WebGPUBackend`, same scene graph, same render loop, same camera. There is exactly one GPU context on this site, and since §15 there is no WebGL context at all.

A laptop in three-quarter view, lid open, screen rendering a live terminal. Particles from the field flow around and behind it.

**Revised: it does not recede — you descend past it.** This was written when the field was flat and the laptop drifted in front of it. It is landmark one now, standing on the terrain at a fixed place in the world (§4.8), and scroll is camera altitude (§4.7): at hero scroll the camera is high above and the laptop is small and far below, and by the first project it is behind and above you. Nothing about the object moves. It is never unmounted, and there is no route for it to be unmounted by — the site is one document (§4.6).

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

**Revised: scroll no longer moves the laptop at all.** The camera altitude curve in §4.7 is what changes the view of it, driven by the same Lenis instance as everything else — there is no ScrollTrigger on this object and nothing to tie to the hero reveal.

What is left is a slow idle float and a subtle rotation tracking pointer position, clamped to a few degrees. **Both are an open question (§8)**, because the camera already carries its own pointer parallax and a second one on the object may cancel or double it. Decide it in step 18 with the thing on screen; do not build both by inference from this paragraph.

#### Constraints

Everything about loading, DPR, mobile, fallbacks and pausing is inherited from §4.7 — the laptop has no independent lifecycle. Only these are specific to it:

- The laptop is added to the scene *after* first paint of the field, so the background establishes before the object arrives
- Tree-shake hard: named imports from `three/webgpu` only, and only the geometries and materials actually used. No `OrbitControls`. The renderer, camera and scene already exist — the laptop adds geometry to them and nothing else
- Clicking the laptop routes to the Homonoia writeup. It needs a real focusable DOM element over it — a mesh is not keyboard reachable

### 4.5 Custom cursor

- **Only on `(pointer: fine)`.** Never initialise on touch. This is the single most common way custom cursors break a site.
- Never hide the native cursor over text inputs or links without a visible substitute state
- GSAP `quickTo()` for the follow, not per-frame `set()`
- States: default dot, expanded ring over project rows, amber over links
- Reduced motion → don't initialise at all, native cursor only

**Decided (§13): `--leader`, not amber.** The palette moved off amber to lavender in §2 and this line was not updated with it — it means the accent, and §5 already allows the accent on a live link. The "project rows" are now the full-height stages of §4.3, so the ring is what the cursor becomes over a project: an outline rather than more ink, since that is where the pointer sits over text being read.

### 4.6 One page, no transitions

**The site is a single document.** Everything — hero, all four projects, about — lives on `/`. There are no route changes and no `<ClientRouter />`.

This is the decision that simplifies everything else. Nothing to tear down, nothing to re-init, no dead node references. The canvas persists because it never unmounts; the camera and the scroll position are the same variable.

Total prose across the whole site is roughly 600 words. Four separate routes was heavy machinery for that, and a continuous 3D space that hard-navigates between documents fights itself.

#### URLs still work

Deep links are not negotiable — sending someone straight to one project is the most common thing this site will be used for. The History API carries them without routes:

- Scrolling a project section past a threshold does `history.replaceState` to `/projects/enargeia`. **`replaceState`, not `push`** — pushing on scroll floods the back stack and makes the back button useless.
- Loading `/projects/enargeia` directly scrolls (document mode) or flies (world mode) to that section, without animating from the top.
- `popstate` moves to the matching section.

Astro still needs to emit those paths so they resolve on Cloudflare rather than 404ing. Keep `getStaticPaths` and render a real page per project containing that project's content — crawlable, and the fallback if JS never runs.

**Decided (§7): redirect, not hydrate in place.** `/projects/<slug>` renders the full section standalone, and an inline head script does `location.replace('/#' + slug)`. Hydrating in place would mean two live variants of the same content — one with the other three projects reachable and one without — and world mode would need a second entry path for the second variant. The redirect keeps one runtime.

Consequences, all verified:
- `replace()`, not `assign()`, so the stub never enters the back stack.
- The stub fires before paint, so there is no flash of the standalone page.
- The browser's own hash jump does the scroll, so nothing animates from the top.
- The scroll observer's first `replaceState` then rewrites `/#enargeia` back to `/projects/enargeia`, so the deep link survives the round trip.

`/projects` and `/about` were real routes while the site was live. They stay resolvable as Astro `redirects` to `/#work` and `/#about` — a meta-refresh page, so it works with JS off too.

#### What this deletes

- The View Transitions teardown, formerly the most likely thing in this build to break
- Canvas persistence machinery in §4.7
- Two scroll authorities. Document scroll and camera altitude become one mechanism (§4.7)

### 4.7 The render layer, and the world it contains

**The architectural decision that separates this from a normal page.** Read before building anything in §4.

A fixed, full-viewport canvas at `z-index: 0` that mounts once and never unmounts. All content is normal DOM above it at `z-index: 1`. The canvas is *not* a hero element — it is the environment the entire site sits inside.

This is the **only** GPU context on the site, and it is created once for the session. The laptop in §4.4 is an object within this scene, not a second canvas.

#### Built, and standing (§15)

One `Renderer` on a `WebGPUBackend`, one canvas, mounted once, built detached and inserted only when there is a frame in it. Everything below is what that scene *contains*; none of it changes the architecture above.

Because the site is one page (§4.6), the canvas mounts once and is never torn down. There is no navigation to survive. What replaces the old requirement: the scene reacts to **scroll position**, not to route, and its state must be a pure function of that position so landing deep-linked mid-page looks identical to having scrolled there. Verify by scrolling the full page top to bottom and back — the scene must never reset, flash, or reinitialise.

**Decided (§15): two tiers, not three.** The reduced WebGL 2 tier was built and measured and does not ship. `three/webgpu` is one module, so no bundler can put one backend in each chunk; carrying both costs every desktop load 23.1KB gzipped and puts the page 12.4 KiB over the hard budget in §6. WebGPU only lands at 249.5 KiB. A browser without WebGPU gets the bottom tier, which is the document, which is the whole site.

#### What the world is

A dark volume with a floor and a sky.

The floor is a heightfield **computed from the cluster** — ground rises where message traffic is dense and falls where it is quiet, with the highest ground under whichever node currently holds leadership. It is not decorated terrain and it is not noise. Fly over it and the shape you are flying over is the shape of a consensus algorithm running.

The sky is a starfield at effective infinity. Between them is the field from §15: messages in flight between five nodes. **Turned, at §16** — the pentagon was upright and facing the camera when there was nothing under it, and a cluster standing over a landscape is a ring on the ground plane. Same shape, same spacing, same simulation, laid flat at altitude 9 with the terrain rising underneath it, and the swirl taken against world up so the routes braid across the ground rather than through it.

**Why this rather than a landscape.** A landscape would be prettier faster and would say nothing. The reference site's terrain works because its author is an illustrator and the terrain is the artwork. Here the terrain has to be the work, or it is decoration on a portfolio about not decorating things.

The complaint this answers, recorded so it does not get re-litigated: five emitters trading particles at one depth is a legible diagram and reads as one. It has no near and no far, so there is nothing to be inside of.

#### The heightfield

Two terms, summed.

**Structure — analytic, evaluated per vertex.** Every node contributes a radially symmetric peak whose amplitude is that node's current traffic share. Every active route contributes a ridge along the line between its endpoints, falling off with perpendicular distance. This is a closed-form function of the node positions and the section uniforms already in `scene.ts`, so it costs no storage, has no warm-up, and is identical on the first frame and the thousandth.

```
h(p) = Σ_nodes  A_i · exp(-|p - n_i|² / σ²)
     + Σ_routes B_ij · exp(-d_perp(p, n_i, n_j)² / τ²) · window(t_along)
```

`A_i` is the node's share of addressed traffic — under Homonoia the leader's term dominates and the landscape is one mountain; under Enargeia the five are even and it is a ring of hills. `B_ij` is nonzero only for routes carrying traffic, so raising `leaderMix` visibly grows ridges toward one summit.

**Texture — accumulated, optional, and the second thing to build.** A 512×512 `r32uint` storage texture, into which the particle compute pass `atomicAdd`s one per particle per frame, decayed 2% per frame. Sampled and added to `h` at a low amplitude. This is what makes the ground feel *alive* rather than *computed* — it lags the simulation, so a leader change leaves the old mountain visibly subsiding for a few seconds after the traffic has left it.

Build the analytic term first and ship it. Add accumulation only once the frame budget is measured with everything else in place. If it does not fit, the world is complete without it.

**An election is the set piece.** Under Homonoia the term ends every 3.4s. `A_i` retargets, the ridges swing, and **the landscape itself redistributes** — one summit subsiding while another rises, over roughly two seconds of eased transition. Tween the amplitudes, never snap them. A heightfield that jumps is a glitch; one that flows is a mountain range rearranging itself.

#### The floor is particles, not a mesh

Decided. A second instanced sprite buffer, positions sampled on the heightfield rather than a lit surface.

- One material for the whole world. No second lighting model, no normals, no shadow story, no mesh LOD. The ground is made of the same stuff as the traffic above it, which is true and also cheap.
- Nothing occludes. A solid floor would hide half the field the moment the camera descends; particles keep the volume readable from inside it.
- It is the version that could only come from this project. A lit mesh is a landscape; a resolved density is a measurement.

Points on a **camera-relative grid**, not a world-fixed one. Each particle holds a fixed `(u, v)` in a disc around the camera's ground position; its world position is that offset plus the camera, wrapped, with `y = h(x, z)`. The grid moves with the viewer, so ground detail is always where the eye is and the far field never needs more points than it can resolve.

Radial density falls as `1/r`, which cancels the perspective gathering and gives even screen-space coverage rather than a dense smear at the horizon. Per-point `y` jitter proportional to local slope, so cliffs read as scree and flats read as flats.

Count: **300,000** at the compute tier, halved below 1024px. 200,000 was the number here and §16 measured it: count was the wrong knob. A camera-relative disc only ever shows about a quarter of itself, so what decides whether the ground reads as a surface is the radius it is spread over — 92 units made the massif an island in an empty plain, 42 made it a landscape. 300,000 closed the rest and costs 1.6ms of a 2.5ms frame.

**The horizon.** Particle ground has no edge, and an edge is what makes a floor a floor. Draw one: a thin great-circle arc at the far clip in `--rule`, one pixel, never brighter. Built as a `Line` closed by repeating its first point — the new renderer does not support `LineLoop` at all. That is the only non-particle geometry in the world and it is what turns a field of dots into a place with a limit. At grazing angles the ground densifies toward that line on its own, so the arc is confirming a boundary the eye already believes rather than inventing one.

#### The starfield

Third instanced buffer, **8,000 points** on a sphere of effectively infinite radius — positioned in view space so they never parallax, which is what makes them read as far away rather than as nearby dots.

Brightness drawn per-star from a power law, so a few are bright and most are barely there. A slow per-star phase on opacity, periods spread between 4 and 14 seconds, so the sky is never uniformly still and never visibly twinkling in unison.

`--paper` at low alpha for most; a scattering in `--leader` at maybe one in forty, so the sky belongs to the palette without being violet.

Stars are the only thing in the world that does not mean anything. That is deliberate: everything else is a measurement, and a world where every single element is load-bearing reads as a diagram again.

#### The camera

**Scroll is altitude.** One curve, and both modes read it.

| scroll | altitude | pitch | what you see |
|---|---|---|---|
| hero | high above | looking down ~60° | the whole cluster as a map, ground far below |
| project 1 | descending | ~35° | peaks resolving, horizon entering frame |
| project 2–3 | low | ~15° | among the ridges, traffic passing at eye level |
| project 4 | lowest | ~5° | inside it, horizon across the frame, stars above |
| about | rising | ~30° | pulling back out |

This is the whole answer to "both — above it and down in it". The descent is the read, and it means document mode is not a lesser version of world mode: scrolling the page *is* the flight, and world mode adds control rather than adding the world.

Position along the curve is `scrollY / maxScroll`, driven by the same Lenis instance as everything else — one scroll authority (§4.6), and the camera is a pure function of scroll position exactly as this section requires of the scene state.

Damped: the camera lags the scroll by a short time constant, so a fast scroll arrives with momentum instead of teleporting. A slight pointer parallax on top — a couple of degrees of yaw and pitch, eased. This costs nothing and does more for the sense of depth than any other single thing in this section. Disabled under reduced motion.

#### Fog

Not optional, and not atmosphere for its own sake.

Exponential-squared fog to `--void`, tuned so the far ground fades roughly where the horizon arc sits. Fog is what makes distance *legible* in a particle world — without it every point is the same brightness at every depth and the volume flattens back into the diagram this revision exists to escape.

It also solves the density problem at the horizon for free, and it hides the far clip so the ground has no visible end. Stars are exempt; they are behind the fog by construction.

#### Brightness

Text contrast is measured *against the busiest frame the scene can produce*, not against the average. If the scene can ever wash out body copy, the scene is wrong — darken it, don't lighten the text.

**Decided (§15): the rule, made measurable.** "The busiest frame" is the brightest **glyph-sized local average** the scene draws — a 12×12 mean, not the brightest pixel, because that is the background a piece of text actually sits on. The bound is `--void-lift`: the scene may look raised and never more. Measured at that bound, every text token clears 4.5:1 against the worst background on the page.

**Corrected (§16): the toggle reads the palette, not a remembered one.** High contrast has to move the busiest frame *down*, and it was not: the scene read `--leader` and `--rule` once at mount, so a page loaded in high contrast got the brighter palette — `--rule` goes from `#2A2640` to `#4A4470`, 2.6× the luminance — scaled by the same 0.45 as a page toggled into it, and the two paths differed. Both tokens are uniforms now, re-read on every change; the factor is 0.20, measured. Normal 0.99× of the bound, high contrast 0.68×.

**Revised: that bound applies where text is.** It is a document-mode constraint, not a property of the scene.

- **Document mode** — the bound holds unchanged. The terrain is far below the camera through the whole scroll, fogged, and dim. It is a floor glimpsed under the content, not a landscape competing with it.
- **World mode** — text is confined to the writeup panel, which has its own backing. Outside that panel the scene may go to **4× the document bound**, measured the same way. Where the panel is open, the region behind it returns to the document bound.

This is the honest resolution of "make it brilliant" against "text must be readable". The constraint was never about the scene; it was about the words. Where there are no words, spend the light.

#### Performance

Everything here is instanced points, plus the one line. Measured at §16 with ground, field and arc: **4 draw calls** — ground, arc, field, and the renderer's own blit. Stars make it 5.

- Ground 300k, field 120k, stars 8k. All halved below 1024px; world mode is desktop-only anyway.
- The heightfield is evaluated in the vertex shader, not on the CPU. Nothing reads back.
- Frustum culling is off on all three — the bounding sphere an instanced sprite computes is the unit quad at the origin (§15). The camera-relative ground grid is the culling: points behind the viewer wrap to in front of it.
- **Target: 60fps on integrated graphics.** If it does not hold, ground count is the first thing to cut and the accumulation texture is the second. The election transition is the last, because it is the point.

Measure `renderer.info` with `autoReset = false` (§15 trap), and report milliseconds per frame rather than fps — fps is vsync-capped and hides regressions until it falls off a cliff. The rAF interval is vsync too, and `--disable-gpu-vsync` does not lift it; §16's number is a batch of renders between two `queue.onSubmittedWorkDone()`, because the timestamp queries under it returned negative durations. Measured there: **2.50ms** at 1512×804, and 2.32ms at DPR 1.5 — this layer is vertex-bound on 420k instanced quads, not fill-bound.

#### Constraints

- Cap DPR at 1.5 for the background layer; it is out of focus behind text and does not need retina resolution
- Halve the simulation resolution below 1024px; disable entirely below 768px
- Reduced motion → freeze on a single computed frame, do not remove the canvas
- Pause the loop on `visibilitychange` — a compute simulation running in a background tab is a battery complaint

#### What this does not include

Stated so nobody builds them by inference:

- No mesh terrain, no normals, no lit surface, no shadows.
- No trees, rocks, water, clouds, or any other landscape furniture.
- No texture maps of any kind. Everything is procedural or accumulated.
- No collision. The ground is a height function, and free flight (§4.8) clamps the camera above it rather than colliding with it.
- No time of day, no sun, no directional lighting. There is no light source in this world; every point emits.

#### The one thing to get right

Not the terrain. The **election**.

Everything else here is scaffolding for a single moment: a term ends, and the landscape a visitor is flying over rearranges itself because a distributed system elected a different leader. Nobody else's portfolio does that, and it is the only thing on this site that could not be built by someone who had not implemented Raft.

If the frame budget forces a choice, that survives and everything else goes.

### 4.8 World mode

The same scene given control of the camera. Not a separate build — same renderer, same simulation, same world as §4.7. Document mode already flies it; world mode hands over the stick.

#### Two modes, one content

| | Document mode | World mode |
|---|---|---|
| Default for | Crawlers, reduced motion, no WebGPU, mobile, `?mode=doc` | Capable desktop hardware |
| Navigation | Normal scroll | Same scroll, driving the same camera. Free flight unlockable |
| Content | DOM | DOM, opened from landmarks into the writeup panel |

**The writeups are identical in both.** Document mode is not a fallback stub — it is the full site from steps 1–14, and world mode is a shell around the same HTML. Anything true only in world mode is atmosphere, never information.

A visible, persistent control switches modes. Remember the choice in `localStorage`.

#### Movement

The camera altitude curve in §4.7 is the whole of the movement in both modes, driven by the same Lenis instance — one scroll authority, not two. Since both modes are the same page and the same scroll, switching modes is a change of representation, not of position.

Free flight unlocks once the visitor reaches the fourth landmark, or immediately via a control. Pointer-drag to look, WASD or drag-to-move. Bound the volume, and clamp the camera above `h(x, z)` — there is no collision, only a floor it may not go under. A visitor who flies into empty black and can't find their way back is a lost visitor: provide a *return to path* control that is always visible in free flight.

#### Landmarks

Four structures standing on the ground, one per project, positioned along the curve in the order set in §3. Each has three states: distant (silhouette only), approaching (label and machine ID resolve), arrived (writeup opens in the panel).

The laptop from §4.4 is the first landmark — the hero object becomes the entry point rather than a separate thing. It stands on the terrain, which is why it is built after the ground rather than before it.

LOD on landmarks: silhouette geometry at distance, detail only on approach. Preload nothing beyond the next landmark.

#### Scroll position is the source of truth

One page (§4.6), so a landmark is a scroll range, not a route. Arriving at Homonoia does `replaceState` to `/projects/homonoia`; loading that URL flies the camera to that range. Both directions must work.

Because scroll drives both modes, switching between them mid-page must land in the same place. Test this specifically: scroll to Philoi in document mode, switch to world, and the camera should already be at Philoi rather than at the start of the curve.

#### Accessibility

World mode is not required to be keyboard-navigable as a 3D space. It **is** required to be escapable: the mode switch must be reachable by keyboard from anywhere, and `Esc` returns to the path.

Every piece of information in world mode must exist in document mode. That is the accessibility story — not making a flight simulator screen-reader friendly, but guaranteeing nothing is lost by never entering it.

### Lenis ↔ ScrollTrigger wiring

Required for pinning to track smooth scroll:

```js
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
```

**Revised (§11): no `lagSmoothing(0)`.** The third line was here and is out — lag smoothing stays at GSAP's defaults. Off, a tab returning from the background hands Lenis and every scrub tween the whole elapsed wall-clock gap in one tick: invisible on a looping marquee, a visible jump under a pinned section. The log bands lose nothing, because they pause off-screen and their phase has already drifted from the clock that seeded it.

---

## 5. The two toggles

Both live in the header, both persist to `localStorage`, both apply before first paint via an inline script in `<head>` to avoid a flash.

### Reduced motion

Three states: `auto` (follow the OS), `on`, `off`. Default `auto`.

When motion is off: no intro sequence, no scrub, no pinning, no cursor, no drift on the log bands, no page transitions. Every reveal becomes an instant final state — **not** a shortened animation. Content must be fully reachable and readable.

This isn't a courtesy feature. It's what keeps the site usable for a hiring manager on a laptop trackpad who finds the motion nauseating.

### Contrast

Toggles a `[data-contrast="high"]` token set: `--paper` to pure `#FFFFFF`, `--muted` lifted to at least 7:1 against `--void`, `--dim` lifted to 4.5:1, hairlines to `--rule` at double opacity. The accent shifts lighter to hold contrast on dark.

`--dim` must never carry information that isn't repeated elsewhere — it is texture. That is a rule about usage, not about the value: §14 lifted the token itself to `#8780B2` (5.07:1) because a checker cannot see the distinction and scored every use of it as a failure. See §2.

---

## 6. Budgets

Hard limits. Check before launch, not after.

- **Homepage JS, mobile: under 120KB gzipped.** Three.js is not loaded below 768px, so this stays achievable
- **Homepage JS, desktop: under 260KB gzipped**, GSAP + Lenis + Three included
- **LCP under 2.5s** on a throttled 4G mobile profile. There is no hero image — the LCP element is the `h1`, and the only thing that has ever delayed it is JS the intro was waiting on (§12). Measured at §15: 2.0s mobile, 0.6s desktop
- The world holds 60fps on integrated graphics. If it can't, cut ground particle count first and the accumulation texture second — the election transition is last, because it is the point (§4.7)
- No layout shift from the intro sequence — CLS under 0.1
- Lighthouse accessibility 100
- Every interactive element reachable and visibly focused by keyboard
- Site fully usable at 360px wide with motion disabled

**It blew at §15, and what gave was the renderer's WebGL 2 fallback** — not the laptop, and never the accessibility work. Three tiers did not fit in 260KB and two do, so a browser without WebGPU gets the document, which is the whole site. Measured: mobile 54.6 KiB, desktop 249.5 KiB.

---

## 7. Build order

**`docs/STEPS.md` is the single source of truth for step numbering.** It is
the file a session opens with, it carries the done-markers and the measured
reports, and a second numbering here only ever drifts out of agreement
with it.

## 8. Open decisions

- **Display typeface.** Archivo is shipped and self-hosted (§5), picked for having a real `wdth` axis. It was never set against Anybody or Roboto Flex at 180px the way this line asked — open only in the sense that it was decided by elimination rather than by looking.
- **The laptop's idle motion.** §4.4 was written when the laptop drifted in front of a flat field and the hero's ScrollTrigger drove it. It is landmark one standing on terrain now, and the camera already carries its own pointer parallax (§4.7) — a per-object idle float and a second pointer rotation on top may double up, or may be exactly the life the object needs. Decide it in step 18, with the thing on screen.

---

## 10. Skills ramp

Already in hand: TypeScript, Astro, GSAP, WGSL compute (Enargeia), distributed systems.

**Vanilla Three, not React Three Fiber.** R3F exists to reconcile a component tree; this scene is one canvas that mounts once and never unmounts, and drei's helpers are all things it doesn't use. (The original argument was about keeping a React root alive across View Transitions — those are gone, §4.6, and the point stands without them.) TSL and compute are renderer-agnostic, so R3F-based tutorials still apply; only their `<Canvas>` setup differs.

To learn, in build order:

1. **Three.js core** — scene graph, cameras, materials, lights, render loop, disposal. The largest gap; a wide API rather than a hard one
2. **TSL** — node-based shader authoring. New syntax, but the WGSL model transfers directly
3. **GPGPU in Three** — compute nodes, storage buffers, instanced particles. Closest to work already done
4. **Camera curves** — frames along a curve, damped follow. Small topic, and it is the entire movement system. Note the shape changed with the terrain fold: scroll drives *altitude and pitch* over a landscape (§4.7), not distance along a spline through empty volume
5. **ScrollTrigger driving a camera** rather than DOM properties, plus the Lenis wiring in §4.6
6. **Performance tooling** — `stats-gl`, `renderer.info`, Spector.js. Under 100 draw calls. Dispose geometries, materials, textures, render targets — leaks are what kill a scene that never unmounts, which is this architecture exactly
7. **Astro islands** — smallest item. View Transitions persistence was on this list and is not a topic any more: §4.6 removed `<ClientRouter />` entirely, and the canvas persists because the site is one document and nothing ever unmounts

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
- **Superseded (§15): there is nothing to feature-detect on the renderer.** `isWebGPURenderer` belonged to the `WebGPURenderer` class, and naming that class is what drags the WebGL 2 backend into the bundle — so the site builds a `Renderer` on a `WebGPUBackend` directly and does not have the flag. The question is asked before Three loads at all: `navigator.gpu.requestAdapter()` in `field.ts`, whose answer decides whether the scene chunk is fetched. (`capabilities.isWebGL2` is undefined under WebGPU and was never the right question either.)
- Never mix `three` and `three/webgpu` imports in one codebase. Use `three/webgpu` everywhere
- WebGPU support in Three is not universally called production-ready — Threlte's docs still advise against it in production while recommending r171+ if used. **There is no fallback backend to contain that risk (§15); the document is the fallback**, and it is the whole site. Expect breaking changes across versions: Three is pinned at 0.185.1 and an upgrade is a step of its own, not a dependency bump
