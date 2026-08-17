# theophilusjohn.com — build spec v2

Personal site for Theophilus Biju John. Portfolio-first, heavily animated, dark.

Reference for feel: wodniack.dev — warm near-black, oversized display type, ambient data texture, machine-style project IDs, scroll as the primary structure. Not a copy: the ambient texture here is real Raft log output, not decorative binary.

Supersedes v1. The OpenLDAP writeup is out.

**§0 replaces the architecture.** Read it before §4. Everything from §4.3 to
§4.8 was written for a document with a world behind it, and that is the
thing §0 reverses.

---

## 0. The world is the site

Everything from §15 to §20 assumed a document with a world behind it. That
assumption is what made the terrain dim, the camera constrained and the
landscape unexplorable — none of those were tuning failures, they were
consequences of the frame. §16–§20 shipped a terrain that is correct,
measured and **boring**, and it is boring because it sat under a scrolling
document: there was nowhere for a world to be, no reason to look at it, and
every knob that could have made it worth looking at was held down by body
copy passing in front of it.

**The world loads first. The projects are places in it. The document is the
escape hatch, not the shell.**

This replaces the architecture, not a section of it. The work below it
mostly survives (§0.5); what it reverses is what that work was *for*.

### 0.1 Entry

`theophilusjohn.com` loads the world on capable hardware.

| condition | what loads |
|---|---|
| WebGPU, viewport ≥ 1024px, motion on | **the world** |
| no WebGPU, or < 1024px, or reduced motion, or JS off | the document |
| `?doc` on any URL | the document |
| crawler / no-JS | the document, server-rendered as now |

The document site is finished, accessible and fast (§1–§20 of the build).
It stops being the main experience and becomes a first-class alternative —
reachable in one click from inside the world, at every moment, from a
control that is always visible.

**Nobody is trapped.** A visitor who wants the resume in ninety seconds gets
a way out on the first frame, and the choice is remembered (`localStorage`,
the same mechanism as the two toggles in §5).

Note what this deletes: below 1024px and under reduced motion there is no
scene at all, so the halved tier §4.7 describes for 768–1024px is gone. The
document is what those loads get, and it is the whole site.

#### The first frame

A world-first site has a loading problem the document never had: Three, the
scene and the terrain all arrive before anything is usable.

- The document's HTML still renders first and is what the browser paints —
  the world mounts over it. LCP stays what it is.
- A visible, honest progress state. Not a spinner: a percentage and what it
  is doing, in the site's own mono. This is a portfolio for an engineer; a
  loader that tells the truth is on-brand.
- **Target: interactive world under 3s on a desktop connection.** If it
  cannot be, the world is too big and the terrain is where to cut.

### 0.2 The landscape

Real terrain. Not five Gaussians.

**Base: procedural.** Ridged multifractal over fBm — the standard
construction for mountains, and the reason a landscape reads as one where
§16–§20's did not. Multiple octaves, so there are ranges, foothills, valleys
and detail at every scale you approach. Erosion-style ridging, so peaks have
crests rather than being smooth bumps.

**Modulation: the cluster.** The traffic heightfield from §16 does not
disappear — it becomes a *layer* on the procedural base, raising ground
where message density is high. The landscape is real terrain, and the
cluster leaves its mark on it. That keeps the meaning without the shape
being five lumps. `h(p)` and `shares()` as built in §16–§20 are the input to
that layer, not the terrain itself.

**Scale is the thing the old one lacked.** The camera should be able to fly
a long time in one direction and find new ground. Terrain extends far past
the horizon; chunks generate around the viewer as they are needed and free
as they are left.

**LOD is not optional at this scale.** Concentric rings of decreasing
resolution around the camera, or quadtree chunks. The near ground gets
detail you could land on; the far ground gets silhouette.

#### Shading — cel, not smooth

**The light is quantised into bands.** Three of them: lit, mid, shadow, with
a hard terminator where each ends. Not a stylistic flourish on top of a
realistic renderer — it replaces the Phong material of §19 outright.

This is a lighting model, not flat art. The geometry is fully 3D and
explorable; what changes is that a slope lit at 0.6 and one lit at 0.45 land
in the same band, so terrain reads as broad shapes with hard edges rather
than as gradients. Wind Waker, Breath of the Wild and Genshin are all this,
and all worlds you fly through.

**The terminator moves.** That is most of why it works in an engine and none
of why it works in a still: come round a ridge and the band edge sweeps
across the slope. Judge it in motion or not at all.

**Rim light on every crest**, in `--leader`. This is what makes ridgelines
legible at distance, and it is the single most important part of the look —
without it a banded landscape is a set of flat shapes with nothing
separating them.

**The palette does not change.** `--void` for the deep sky, `--leader` as
the key and the rim, `--rule` and `--muted` for the mid bands, `--paper` for
the brightest faces and the stars, `--mint` where a structure needs a second
accent. Cel shading is about how light quantises, not which colours it uses,
and a banded violet landscape is a thing nobody else has — where a Shinkai
sunset has been done a thousand times.

**It has to be brighter than §19.** Bands need contrast between them to read
at all, and §19–§20's exposure was solved for a scene sitting under body
copy. World-first removes that constraint: text lives in a panel now (§0.4),
and the brightness table in §4.7 collapses to its third row nearly
everywhere.

#### Atmosphere

- **Night, in the existing palette.** A sky gradient from `--void` at the
  zenith through violet to a lighter band at the horizon, with stars in the
  upper half. Clouds as banded volumes, quantised like everything else.
- Height fog in the valleys, so distance reads even in flat light. The
  squashed vertical axis from §18 survives and is why the tuning holds at
  more than one altitude — and altitude is now unbounded rather than a
  22-unit descent.
- One key light — position open, but it is the thing that makes the bands,
  so it matters more than any light in the project so far.
- **Shadows are worth considering now.** §4.7 refused them because the
  terrain was a background layer. Cel-shaded terrain without them is
  noticeably flat, and hard-edged shadows suit a banded look better than
  soft ones do.

#### The landscape is alive

**Decided at §24, and it reverses §4.7's exclusion list.** That list — "no
trees, rocks, water, clouds, or any other landscape furniture" — is struck
through there rather than deleted, because the argument for it was sound in
the frame it was written in: furniture on a layer glimpsed between
paragraphs is cost with no reader. It is the wrong rule for a world you fly
through. Bare terrain reads as terrain at distance and as *nothing* up
close, because scale comes from having things of known size standing on the
ground.

**The world is alive.** Not lush — night, violet, high country — but
somewhere that supports things. Growth on the lower slopes, water in the low
ground, air with something moving in it.

**Decided with it: the vegetation is conifers.** Pines and low scrub, high
country. Not luminous, not alien. §8 held this open as the last big creative
call before the structures, on the grounds that something stranger was a
different world; it is closed, and this one is a violet night in real
mountains.

##### First, the pop

Before anything is scattered on the terrain, the terrain has to stop
jumping.

Crossing a split distance swaps a coarse chunk for a finer one
instantaneously — new geometry, new normals, new baked shadow, all in one
frame. What that reads as in flight is ground that darkens and then resolves
as you approach, which is the shadow term changing: a coarse chunk marches a
coarse field and has less occlusion in it than the fine chunk replacing it.

**This was never measured.** §22 instrumented *holes* — leaves with no
generated ancestor — and found none. A hole is a bug and a pop is a quality
problem, and the harness only looked for the first.

**Geomorphing.** Each vertex carries the position it would have at its
parent's resolution and blends toward its own over the last stretch before
the split distance. The two levels are alive at once during the blend, which
they already are — the parent is retained on a four-second clock. Three
attributes morph, not one: position, the shading normal, and the baked
shadow. Shadow is the one that shows most, so it is the one to check.

**Built at §25, and one thing about it is not what it looks like.** The
blend *weight* is per chunk rather than per vertex, because all four
children of a cell are born in the same frame across the whole of the
parent's square — a fade keyed to each vertex's own distance is finished at
the near corner and unstarted at the far one, and the far half then changes
in one frame. It comes off the parent's rectangle distance, which is the
quantity the split is decided on, and it has to reach zero by half the
distance the chunk was born at or the chunk's own children pop by whatever
is left of it. Measured: the worst change in one frame was 8.586 units of
height, 19.73° of normal and a full 1.0000 of shadow; it is 0.011, 0.11° and
0.0020 now, and it is a rate rather than an event — the frame a split
happens on can no longer be found in the series.

##### Placement is a pure function

Everything scattered on this terrain is placed by a function of `(x, z)` and
nothing else. No storage, no seeds carried between chunks, no lists.

That is not tidiness. Chunks generate independently, in three workers, in
whatever order they are asked for, and a chunk is cached by coordinate and
never regenerated (§22). Anything stateful would make two chunks disagree
about what stands on their shared edge.

The inputs are already computed: `height()`, its gradient, and the range
mask that decides where there are mountains at all. Density is a function of

- **altitude** — a treeline, and nothing above it
- **slope** — nothing on anything steeper than it could hold
- **the range mask** — sparse on high ground, dense in sheltered country
- **water proximity** — denser near it

Each species samples a low-frequency noise for clumping, then a hash on the
cell for jitter within it. Clumped, not uniform: uniform scatter is the tell
that something was placed by a computer.

##### Water

**Lakes, not rivers.** A global water level, and a plane drawn where the
terrain is below it. That is nearly free on a heightfield and it fills the
basins the field already produces.

Rivers need flow accumulation over the whole field or carved channels in the
generator, which is a project of its own. **Not now, and say so** rather
than approximating them with noise, which reads as a stain rather than a
river.

The surface is banded like everything else: a flat mirror of the sky
gradient, `--leader` where the key light glances off it, `--void` in shadow.
One quantised specular band rather than a smooth highlight.

Still, mostly. A slow normal perturbation, no waves — this is high country
at night and the water is what says the valleys are the bottom.

**Underwater is not a mode.** Fly under the surface and you see it from
below; nothing changes about the fog or the light. Building a submerged
state is a whole render path for something nobody will do twice.

**Built at §26, and the level is `WATER = -8` in `height.ts`** — with the
field rather than with the surface that draws it, so the worker can ask how
near water is without importing anything that has seen a GPU. It is measured
off the field's own distribution: 11.9% of the bounded world in 128 separate
bodies, twelve of them over 200 units across, and the largest is an eighth
of the total. Mean depth 3.67 units, deepest 16.6 — which is why §24's
six-unit floor lets the camera under the surface at all.

The whole layer is one disc of 64 triangles centred on the camera in the
shader: one draw call, no update from the loop, and *nothing knows where a
lake is*. The terrain is opaque and drawn first, so the depth test is what
finds the basins. It covers 7.9% of the opening frame and costs nothing
measurable — and where it covers half the frame it is **faster**, because a
plane over a pixel takes the sky dome's fractal noise off it.

One departure: the un-mirrored body is `--void-lift` rather than `--void`.
`--void` is the clear colour, the fog target and the zenith at once, so a
lake painted in it reads as a hole in the terrain rather than as water.

##### Ground cover

Grass, low scrub, moss on the rock. The thing that makes the ground read as
ground rather than as a shaded surface.

**Instanced blades on a camera-relative disc**, not per chunk. Density falls
with distance and the disc moves with the viewer, which is exactly the
construction §16 used for the old particle floor — that one failed because
it was trying to *be* the ground, and this one is standing on ground that
already exists.

Only within about 120 units. Past that it is sub-pixel and the terrain's own
colour carries it.

Colour from the same three bands as the terrain, one step lighter, so cover
reads as growth on the surface rather than as a texture applied to it.

##### Trees and rocks

**Instanced meshes, three or four variants each, one draw call per variant
per chunk.** Placement per the rule above. Built from primitives like
everything else in this world — a conifer at this distance and this palette
is a silhouette, and a silhouette is a cone and a trunk.

**They must cast into the shadow term.** A tree with no shadow reads as a
decal. The worker already marches the field (§23); a scattered object is a
bump on it, and the cheapest honest answer is a disc of occlusion under each
one baked into the vertex attribute the ground already carries.

**LOD, and it will pop the same way geomorphing fixes.** Fade by scaling to
zero over a distance band rather than switching or clipping — an instance
shrinking into the ground is invisible in flight and a hard cut is not.

**Rocks are the cheaper half and probably the better one.** Scattered stone
on slopes and scree at the foot of cliffs does more for scale than trees do,
because it reads at every distance and does not need a treeline.

##### Motes

The thing that most says *alive* at night, and the cheapest thing here.

Instanced points drifting in the air near the ground, denser over water and
vegetation, sparse on bare rock. `--mint` — the reserved second accent from
§2, which has been waiting for a reason since it came off the Vulpix.

Slow, wandering, and they must not read as dust. Dust falls and drifts;
these rise and hesitate.

Additive, fogged like everything else, and they are the one thing in this
world that is allowed to be brighter than the ground it is over.

##### Wind

One vector field, low frequency, drifting.

Everything that should move reads it: grass bends, trees sway at the canopy,
motes drift with it, the cloud deck advects along it. One field so they
agree — vegetation leaning one way while cloud shadows move the other is the
kind of wrongness nobody can name and everybody feels.

Vertex animation, not simulation. A sine of position and time, amplitude by
height above the ground so a trunk is still and a canopy is not.

##### Clouds you can fly through

The deck built at §23 is a ray–plane intersection: real parallax, no
geometry, and you cannot reach it.

**Add volume near the camera.** A small number of billboarded, banded cloud
forms in the near field that the camera can actually pass through, sitting
under the same deck. Flying into one should dim and diffuse the world for a
second and come out the other side.

This is the single most flight-like thing in this subsection. It is also the
one most likely to look bad — soft billboards in a hard-banded world is a
contradiction, and it may have to be banded to the point of looking like
solid forms. Try it, look at it, cut it if it fights the shading.

##### What it costs

The binding constraint is frame time rather than bytes: the world chunk is
at 200.9 KiB of 400 (§23) and everything here is instanced and most of it is
fogged out beyond a few hundred units. **The ceiling is 8ms at cruise** on
the machine §23 measured 0.48ms on, which leaves half the frame for a slower
one (§0.7). Report per-layer cost the way §23 did — that measurement is what
caught the sky costing five times the landscape.

Generation cost matters more than render cost, as it did for shadows.
Placement per chunk is more sampling in the worker, and the worker is
already at 4.51ms a chunk under flight.

**And worth saying plainly:** this is five steps of world before a single
project appears in it. The site is a portfolio and the portfolio is
currently a document behind a query parameter. A world that is beautiful and
empty is a worse outcome than one that is adequate and inhabited, so if the
choice ever comes down to one more atmospheric layer against getting the
four structures standing in it, the structures win.

### 0.3 Movement

Both, the way a flyable world has both.

**Free flight is the default.** Pointer to look, WASD or drag to move,
momentum and damping. Bounded softly — fly far enough and you are turned
back rather than hitting a wall.

**A path exists for people who do not want to fly.** A guided route between
the four projects, followed by scroll or by a "take me there" control. It is
the same camera; the path drives it when engaged and releases when the
visitor takes over.

**Altitude clamp**, not collision: the camera may not go under the terrain.

### 0.4 The projects, as places

Four locations in the landscape, far enough apart that reaching one is a
journey and close enough that the next is visible from the last.

Each is a **structure** — something built, standing in the terrain, that
reads as made rather than grown. What the four structures are is the biggest
open creative question in this document and it is not decided here (§8).

**Three states**, as §4.8 already had them: distant silhouette, approaching
(name and machine ID resolve), arrived (the writeup opens).

**The writeup opens in the world.** A panel, in DOM, over the scene — the
same HTML the document serves, with its own backing so text stays readable.
Close it and you are back where you were, still flying.

**The URL follows.** Arriving at Enargeia pushes `/projects/enargeia`;
loading that URL in world mode drops you at Enargeia. Deep links work in
both modes and mean the same thing (§4.6 is unchanged — the History API
carries them, and `getStaticPaths` still emits real pages).

### 0.5 What survives §15–§20

Most of the hard-won parts:

- One `Renderer` on a `WebGPUBackend`, one canvas (§15)
- Fog, including the squashed vertical axis (§18)
- The starfield (§18)
- The exposure system (§20) — now much simpler, since text is confined to a
  panel rather than covering the frame
- The whole measurement harness, per-element and per-stop (§17–§20)
- The traffic simulation and the five-node cluster (§15–§16), which becomes
  something you see *at* Homonoia rather than everywhere
- The document site entire (§1–§20 of the build, steps 1–20)

**What goes:** the scroll-driven camera curve, the beats as the world's
structure, the scrim, the camera-relative ground disc, the horizon arc, and
the leader light as the world's only illumination.

### 0.6 Accessibility

Harder than before, and it has to be answered rather than waved at.

**Document mode is the answer, and it is a good one.** It is complete,
axe-clean across eight states, keyboard-navigable, and it contains every
fact the world does. Nothing is world-only.

- Reduced motion → the document, always. No world, no toggle needed.
- The escape control is reachable by keyboard on the first frame, from
  anywhere, and `Esc` reaches it.
- Every URL serves real HTML to a crawler.
- The world is not required to be keyboard-navigable as a flight simulator.
  It is required to be **escapable**, and to have no information in it that
  the document lacks.

That is the same standard §4.8 already set. It is now load-bearing.

### 0.7 Performance and budget

The budget model changes because the world is no longer optional. See §6.

- **Desktop: 400 KiB gzipped** for the world chunk. The 260 in §6 was set
  when the scene was one particle field
- **Mobile: unchanged at 120 KiB.** The world never loads below 1024px
- **60fps on integrated graphics**, with LOD doing the work
- **Terrain generation off the main thread** if it stalls the frame — a
  worker, or generate ahead of the viewer
- **8ms/frame at cruise** on the machine §23 measured 0.48ms on. That is the
  ceiling everything §0.2 puts *on* the landscape shares, and it leaves half
  the frame for a slower machine. Report per layer, not as a total

Track chunk generation cost separately from render cost. At this scale the
thing that breaks is a hitch when new ground arrives, not a low average.

### 0.8 Open

The architecture above is decided. The creative calls are not, and they are
the ones that make this its own rather than a copy. They are listed with the
rest in §8.

**Decided:** anime-adjacent, cel-shaded, night, in the existing palette. The
lavender stays — it is not negotiable and it is the rim light. **And the
landscape is alive** (§0.2): water, ground cover, rocks and conifers, motes
and wind. Not lush; inhabited.

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

**Read §0 first.** §4.1–§4.6 are document mode and stand as written. §4.3's
scrim, §4.7's camera curve and ground, and §4.8 entire were written for a
world *behind* a document, and §0 reverses that. Where a subsection is
superseded it says so and keeps the record rather than deleting it: the
arguments were sound, and it matters which one failed.

### 4.1 Page-load intro

Runs once per session, gated on `sessionStorage`. Nobody should sit through it twice.

Sequence: log bands fade in and start drifting → display type masks up line by line → nav and metadata fade last. Total budget **under 1400ms**. Bail immediately if reduced motion is on.

Do not block content on webfont load. Use `font-display: swap` and start the reveal on `document.fonts.ready` with a hard 800ms timeout fallback.

### 4.2 Hero type reveal

GSAP SplitText, masked line reveal — lines translate up out of an overflow-hidden clip, staggered.

SplitText's rewrite includes screen-reader handling, so it restores the original text to assistive tech. Verify with VoiceOver anyway; a hero split into per-character spans that reads as gibberish is a real failure mode.

### 4.3 The project stage — three beats

**Superseded in part (§0).** The beats are document mode's structure and
they stay exactly as built — three states, scrubbed, pinned, the headline
persisting across all three. What goes is their second job: they are no
longer the world's structure, nothing behind them is a landscape, and **the
scrim goes with that**. A gradient of `--void` at 92% over a page that is
`--void` is invisible; it existed to make beat 3 readable over a scene, and
in world mode text lives in a panel (§0.4) that brings its own backing.

The rest of this subsection is the record of the stage the beats are, and it
holds. Only "world" in the table below is now always "nothing".

Each of the four pins on scroll while a scrubbed timeline moves it through three states, then releases.

**Revised (§17): the stage is three beats, not one composition.** It was a headline across the top with the lead and the writeup in two columns under it — one screen, and every pixel of it words. §16 shipped a terrain that is correct, measured and invisible, and only half of that was brightness: there was nowhere for a world to be. A landscape glimpsed between paragraphs is not a landscape, and no alpha fixes a layout with no room in it.

So: fewer words per screen, not fewer words. The writeups do not change.

| beat | on screen | world |
|---|---|---|
| 1 | machine ID, headline | clear |
| 2 | headline demoted to a mono label, metric strip | clear |
| 3 | writeup, ~45ch column, left | scrim behind the column only |

Beats 1 and 2 carry a line and four numbers between them, and together they are most of the section's duration. That is the room the world needed.

- `pin: true`, `scrub: 1`, `anticipatePin: 1` on the ScrollTrigger
- `end: '+=220%'` of viewport height per section. Beats occupy roughly 0–35%, 35–65% and 65–100% of that, with the transitions overlapping the boundaries
- Each beat cross-fades and translates a short distance vertically — the outgoing element leaving upward, the incoming arriving from below, masked the way §4.2 masks the hero lines. **Never a hard cut:** the pin is scrubbed, so a visitor scrolling slowly sees the states blend, and a hard cut under a scrub reads as a broken sprite
- The headline is the one element that persists across all three, moving from display size at beat 1 to a mono label at beat 2 and staying there. It is the only continuity between the beats, and it is what stops them reading as three unrelated screens
- The machine ID sits in the section's own top row in `--leader`. **Revised (§11):** it does not increment in a pinned corner — what tracks position through the pin is the rule beside the content, filling in `--leader` as the section advances. One accent, one meaning: the part of the section already behind you
- Disable pinning below 900px — pinned sections on mobile trap the scroll and feel broken. Fall back to a plain stacked reveal, which is also what the beats resolve to with motion off

**This roughly triples the page.** That is the price of a world and it is not avoidable: a landscape needs screens with nothing on them. Two consequences, to be handled rather than discovered:

- §4.6's URL sync fires on section boundaries, which are now much further apart. The `replaceState` threshold moves to beat 1's arrival rather than the section's midpoint, or the address bar lags a screen behind the reader.
- Deep links land at beat 1 of their section, not at the section's top.

**The fit rule changes shape.** §11's rule — measure every section against `innerHeight`, pin all or none — was written for a stage that had to fit on one screen. A beat has to fit, not a section. Re-measure against the tallest single beat, which is beat 3. At ~45ch that is shorter than the old two-column stage, so more viewports qualify than before; verify at 1280×720, which failed the old rule.

#### The scrim

Beat 3 is the only text that needs one.

A horizontal linear gradient from `--void` at 92% opacity to transparent, reaching about 60% of the viewport width and fading out well before the right edge. Not a card, not a panel, no border, no corner radius — the moment it has an edge it reads as content pasted onto a background rather than content inside a world.

Beat 2's strip sits at the same left offset, so the two beats share an axis and the scrim's arrival is the only change.

Under the scrim the old brightness bound holds; outside it the scene has no ceiling from legibility. See §4.7.

### 4.4 The laptop

**Reopened (§0).** This was landmark one — a laptop standing on the terrain,
clicked to reach the Homonoia writeup. §0.4 asks what the four structures
*are* and answers "not decided", and a laptop is one candidate in a range
that also holds gates, monoliths, towers, shrine forms and abandoned
machinery. It decides whether the world reads as sacred, industrial or
derelict, and a laptop decides it toward none of those. So this subsection
is not cancelled and it is not scheduled either: it is one answer to §8's
open question, and it is the only one with a build already specified.

Everything below stays true of it *if it is built*. What is already
independent of the decision: one GPU context, geometry from primitives,
`CanvasTexture` for the screen, the visually-hidden `<pre>`, the depth and
blending rules, and a real focusable DOM element rather than a hit test
against a mesh. Those apply to whatever the four structures turn out to be.

**Not a separate canvas.** The laptop is geometry inside the persistent scene described in §4.7 — same `Renderer` on the same `WebGPUBackend`, same scene graph, same render loop, same camera. There is exactly one GPU context on this site, and since §15 there is no WebGL context at all.

A laptop in three-quarter view, lid open, screen rendering a live terminal. Particles from the field flow around and behind it.

**Revised: it does not recede — you descend past it.** This was written when the field was flat and the laptop drifted in front of it. It is landmark one now, standing on the terrain at a fixed place in the world (§4.8), and scroll is camera altitude (§4.7): at hero scroll the camera is high above and the laptop is small and far below, and by the first project it is behind and above you. Nothing about the object moves. It is never unmounted, and there is no route for it to be unmounted by — the site is one document (§4.6).

#### Geometry

Built from primitives. No downloaded model, no GLTF loader, no Draco. A laptop is a rounded box for the base, a rounded box for the lid, a plane for the display, and a slightly inset plane for the bezel. Around 30KB on top of Three itself.

Materials: dark cool grey to sit inside the palette rather than photoreal aluminium. **`MeshPhongNodeMaterial`, not standard (§19):** the terrain settled that question on the bundle, and naming the standard material here would pull its 4.42 KiB back in for one object. Two lights — one key, one rim in `--leader` catching the lid edge — and the world already has both (§4.7). No environment map, no post-processing, no shadows.

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

What is left is a slow idle float and a subtle rotation tracking pointer position, clamped to a few degrees. **Both are an open question (§8)**, because the camera already carries its own pointer parallax and a second one on the object may cancel or double it. Decide it in step 21 with the thing on screen; do not build both by inference from this paragraph.

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

**Superseded by §0 in its subject and kept in its mechanics.** Read §0.2
before building any of the world below. What survives here is the render
layer: one `Renderer` on one `WebGPUBackend`, one canvas, WebGPU-only tiers,
the fog and its squashed vertical axis, the starfield, the exposure channel,
the measurement harness, and every trap this section records. What goes is
the *world it contains* — the camera-relative ground disc, the horizon arc,
the analytic heightfield **as the landscape** (it is a modulation layer on a
procedural base now, §0.2), the leader light as the only illumination, the
Phong material, and the scroll-driven camera curve.

The reason, recorded rather than deleted, because the arguments below were
sound and it matters which one failed: none of §16–§20 was wrong for the
frame it was built in. A world under a scrolling document has no room, no
reason to be looked at, and a brightness ceiling set by whatever body copy
is passing in front of it. Every constraint this section fought — the local
bound, the exposure curve, the composition angle, the occlusion check — is a
constraint the document imposed on the world. §0 removes the document from
in front of the world instead of tuning the world under it.

Two consequences worth naming here because they read as regressions
otherwise. §4.7 argued for a heightfield over a landscape on the grounds
that "the terrain has to be the work, or it is decoration on a portfolio
about not decorating things" — §0.2 keeps that by making the cluster a
*layer* on real terrain rather than the whole of it, so the ground is still
a measurement and is also a place. And §4.7's brightness table collapses:
its third row ("no ceiling from legibility") is nearly the whole frame once
text is confined to a panel.

**The architectural decision that separates this from a normal page.** Read before building anything in §4.

A fixed, full-viewport canvas at `z-index: 0` that mounts once and never unmounts. All content is normal DOM above it at `z-index: 1`. The canvas is *not* a hero element — it is the environment the entire site sits inside.

This is the **only** GPU context on the site, and it is created once for the session. Any structure in §0.4 is an object within this scene, not a second canvas.

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

**The hero's peak, and a correction (§17).** §16 reported the hero as "five hills between 0.13 and 0.28", the flattest landscape `h(p)` can draw, and that was the wrong preset: those are Enargeia's numbers. `shares(5, 0.35, 0)` is **0.41 / 0.20 / 0.13 / 0.13 / 0.13** — the hero has had a dominant peak since §15 and the first screen was never the flat one. Enargeia is, deliberately: almost nothing routes to a leader there because a spreading activation is not a vote.

What stands from the observation is smaller. The hero's peak moves to **0.47** (`leaderMix` 0.45) so that dominance is not a thing you have to measure to see, and the hero gets a **slow term** where it had none — `elect` 0 meant the cluster at rest never elected anything, and a Raft cluster at rest has a leader precisely because it elected one. Slow enough that it drifts rather than switches, and far enough from Homonoia's 3.4s that it never competes with the set piece.

**The shape of `h(p)`, checked at last (§20).** `σ` and `τ` were set at §16 and never verified, because for three steps nothing on screen could resolve a summit from a ridge. The requirement is that **five nodes read as five distinct summits**, and at the old values nothing did: at half the cluster's spacing two peaks still contributed 0.55 of each other, and a route carried a ridge as tall as the nodes it joined, so the deepest point of every adjacent route measured *above* the lower of its two summits. One plateau, not a cluster.

**`σ` 3.4 → 2.0, `τ` 1.3 → 0.9, `RIDGE` 8.0 → 5.0.** The third is the one this section did not name and it has to move, because `τ` cannot do its job: a ridge lies *on* the segment between two summits, so narrowing it thins the ridge without lowering the saddle. Only its height does that. What does not separate at any usable `σ` is nodes 3 and 4, which stand **2.84 units apart** in xz where the other four sides run 4.6 to 6.5 — they are a twin summit, and that is the cluster's geometry rather than the heightfield's. Left as it is: the pentagon is what the simulation is tuned against everywhere else.

**Texture — accumulated, optional, and the second thing to build.** A 512×512 `r32uint` storage texture, into which the particle compute pass `atomicAdd`s one per particle per frame, decayed 2% per frame. Sampled and added to `h` at a low amplitude. This is what makes the ground feel *alive* rather than *computed* — it lags the simulation, so a leader change leaves the old mountain visibly subsiding for a few seconds after the traffic has left it.

Build the analytic term first and ship it. Add accumulation only once the frame budget is measured with everything else in place. If it does not fit, the world is complete without it.

**An election is the set piece.** Under Homonoia the term ends every 3.4s. `A_i` retargets, the ridges swing, and **the landscape itself redistributes** — one summit subsiding while another rises, over roughly two seconds of eased transition. Tween the amplitudes, never snap them. A heightfield that jumps is a glitch; one that flows is a mountain range rearranging itself.

#### The floor is a surface, and the particles are the air over it

**Reversed (§19).** The decision this replaces stood from §16 to §18 and is recorded rather than deleted, because its arguments were sound and it matters which one failed.

*The floor is particles, not a mesh.* A second instanced sprite buffer, positions sampled on the heightfield rather than a lit surface, on three arguments:

- One material for the whole world. No second lighting model, no normals, no shadow story, no mesh LOD. The ground is made of the same stuff as the traffic above it, which is true and also cheap.
- Nothing occludes. A solid floor would hide half the field the moment the camera descends; particles keep the volume readable from inside it.
- It is the version that could only come from this project. A lit mesh is a landscape; a resolved density is a measurement.

All three were true and the conclusion was still wrong. What refuted it was measurement, not taste: **the ground never resolved into a surface at any altitude the camera reaches.** §16 found that the disc radius mattered more than the count and fixed it — 92 to 42 — and it still read as noise near a line. §18 brought the camera from 18.5 units back and 12.5 up down to 4, which is the best case the design allows, and the points still did not fuse: haze at close range, dust at distance.

That is not a tuning failure. Points fuse into a surface when they are dense enough in *screen* space, and the density needed at 4 units is not the density that is affordable at 26 — a camera-relative disc cannot be tuned for both. More fundamentally, what makes ground read as ground is that it **occludes and shades**, and the second argument traded exactly those away by choice.

What the particles turned out to be good at is atmosphere. The frame at Philoi — stars overhead, a horizon, a density gradient falling away — is a real place. It is a place with no floor in it.

So the floor becomes a surface and the particles stay above it. Neither replaces the other, and the third argument survives the reversal: the surface is displaced by the same `h(p)`, so the ground is still the measurement. It now has a normal.

**Nothing else in this section moves.** The heightfield, `shares()`, the routing rule, the election, the camera curve, the fog, the stars and the horizon arc are all unchanged.

#### The mesh

A grid displaced by `h(p)` — the same analytic function the points already sample.

**Geometry.** Camera-relative, exactly as the point disc is: a fixed grid in `(u, v)` around the camera's ground position, with `y = h(x, z)` evaluated in the vertex shader. The grid moves with the viewer, so resolution is always where the eye is.

Radial rather than square — concentric rings with angular subdivision, denser toward the centre. A square grid spends its vertices in the corners, which are the furthest and foggiest part of the frame, and starves the ground directly underfoot.

Skirt the outer ring downward below the fog cutoff, so the mesh has no visible edge on a frame that catches it. The horizon arc still draws the limit; the skirt stops the surface ending in mid-air behind it. The arc also depth-tests since §19 and sits a fraction outside the rim rather than on it: a limit drawn *through* the ridge in front of it is the flatness this revision exists to end, and drawn at the same radius as the rim it z-fights the whole way round.

**Built (§19): 256 rings × 256 segments plus the skirt — 66,048 vertices, 131,584 triangles, one draw call**, halving to 16,640 and 33,024 below 1024px. Radii go as a quadratic in the ring index, which puts the spacing at 0.04 units underfoot and 0.29 at the rim.

**Normals are analytic, not computed from the mesh.** `h` is a sum of Gaussians and its gradient is closed-form, so the normal at any point is exact and costs a couple of extra evaluations — the same ones the scree jitter already takes. No `computeVertexNormals`, no normal buffer, nothing to keep in sync when the amplitudes tween. That matters more than it sounds: the amplitudes move continuously during an election, and baked normals would need rebuilding every frame.

#### Light

There is no sun in this world and there should not be one.

**The light is the leader.** A point light at the elected node, so the summit that rises under the leader is also what illuminates the terrain around it. When the term ends the light moves with the mountain — the landscape re-lights itself as it rearranges.

Colour `--leader`, which is the accent's one meaning (§2) and this is the most literal use of it in the project. Intensity tied to the leader's own amplitude, so a section with no strong leader is a dimmer world.

**A second, fill light** at low intensity, in `--rule`, so unlit faces are readable rather than black. Without it half the terrain is a silhouette and the landform is only legible on one side. Ambient stays at zero: every surface in this world is lit by the cluster or not lit at all.

*The risk, stated.* This is either the best idea in the project or too cute to survive contact. It is worth building because it is cheap to try and because a moving light during an election is the most striking thing this world could do. If it reads as a spotlight rather than as illumination — if the terrain looks like a stage set — fall back to a fixed low directional light from behind the camera and keep the leader light as a subtle rim. Decide by looking, not by argument.

**Built (§19). It survived, and three things about it were decided by measurement rather than by the paragraphs above.**

*Decay 1, not the physical 2.* A peak grows toward the node that earned it, so under Homonoia the light stands 2.6 units off the top of its own mountain and 40 off the rim — 64× across one frame. That is the stage set: the massif blew out to white with a black plain around it, and the busiest frame had 0.02× of the headroom it needed while Enargeia, whose landscape is flat, had 42×. No single exposure serves a spread like that. At 1/d it is 8× across the frame.

*Six units above the node, not at it.* Same problem, same measurement, and this is what actually fixed it: the spread over the fourteen camera stops went from 2000× to about 30×, which one exposure does cover.

*The fill stands over the reader's shoulder, not on the far side of the ring.* The camera is outside the cluster and the key is inside it, so every slope facing the reader faces away from the key — a fill placed opposite the leader lands on the same far side and the landscape is a silhouette at every stop. Offset up and to the left of the camera rather than on its axis: a light on the view axis is a flash photograph and flattens the form. The sentence that survives is the reason ("so unlit faces are readable"), not the geometry.

#### Material

`MeshStandardNodeMaterial`, or `MeshPhongNodeMaterial` if the standard model's roughness response fights the palette.

**It is Phong (§19), and the reason is the budget rather than the palette.** Both were built and measured: the standard material costs 4.42 KiB gzipped against Phong's 0.86, and the desktop bundle had 6.7 KiB of room in it. Standard would have shipped with 1.5 KiB spare and no room for the laptop. At roughness 0.95 and metalness 0 the difference on screen is a GGX sheen worth 4% of the mean frame and 10% of its peak — measured, and invisible at the exposure §4.7's brightness bound allows.

- Base colour `--void-lift`, so unlit ground is barely above the page and the lighting does all the work
- Ground belonging to the elected node tinted toward `--leader` by the same `share` term the points already use, at low weight — the surface says who owns it the way the points did
- Roughness high, metalness zero. Nothing in this world is shiny
- **Opaque**, `depthWrite: true`, rendered before the particles

The traffic is now occluded by terrain, which is new and is most of the point: a message passing behind a ridge and disappearing is the strongest depth cue the world has. But at low altitude a substantial fraction of the cluster may end up behind the massif. Check at the lowest camera stop before tuning anything else — if the traffic is mostly hidden there, the fix is the camera's `dist`, not the mesh.

**Measured (§19), and it does not happen.** Total field light in the frame with the surface in front of it against the same field without it: **0.7% hidden at the hero, 13.5% at Homonoia beat 1** — the tallest massif under a camera still high enough to look across it — **and 0.1% at the lowest stop**, where the cluster stands at altitude 9 and the camera is nearly level under it. `dist` stands.

The particles keep `depthTest: true, depthWrite: false` (§4.4), which is now actually doing something.

#### The point layer, demoted

Reduced, not removed. They are atmosphere now — a demotion in role and an improvement in what they are asked to do.

Points on a **camera-relative grid**, not a world-fixed one. Each particle holds a fixed `(u, v)` in a disc around the camera's ground position; its world position is that offset plus the camera, wrapped, with `y = h(x, z)`. Radial density falls as `1/r`, which cancels the perspective gathering and gives even screen-space coverage rather than a dense smear at the horizon.

- Count drops substantially — the points are no longer trying to be a surface, so they need only be enough to read as haze. §16's finding stands for what it was: at 300,000 the radius, not the count, was the knob, and 42 units was the answer. Start by halving the count and measure
- Lifted off the surface: sample `h(p)` and add a height offset with a wide random spread, so they sit *above* the ground as low mist rather than on it. The slope-proportional `y` jitter that made cliffs read as scree belongs to the surface now
- Fog unchanged. Density still falls as `1/r`

**The horizon.** An edge is what makes a floor a floor. Draw one: a thin great-circle arc at the far clip in `--rule`, one pixel, never brighter. Built as a `Line` closed by repeating its first point — the new renderer does not support `LineLoop` at all. At grazing angles the ground densifies toward that line on its own, so the arc is confirming a boundary the eye already believes rather than inventing one.

#### The starfield

Third instanced buffer, **8,000 points** on a sphere of effectively infinite radius — positioned in view space so they never parallax, which is what makes them read as far away rather than as nearby dots.

Brightness drawn per-star from a power law, so a few are bright and most are barely there. A slow per-star phase on opacity, periods spread between 4 and 14 seconds, so the sky is never uniformly still and never visibly twinkling in unison.

`--paper` at low alpha for most; a scattering in `--leader` at maybe one in forty, so the sky belongs to the palette without being violet.

Stars are the only thing in the world that does not mean anything. That is deliberate: everything else is a measurement, and a world where every single element is load-bearing reads as a diagram again.

**Built (§18), with three things the description above does not settle.**

*View space is the requirement, a sphere carried with the camera is the implementation.* Both halves have to hold: a star must not move when the camera translates 22 units down the curve, and must sweep when the camera turns. Locked to the screen it would fail the second; centred on the world it would fail the first. `cameraPosition + dir · 200` in the shader is both, and costs nothing per frame.

*The sky starts where the ground ends, not at eye level.* The ground is a disc of `RADIUS` carried with the camera, so what lies past its edge is sky — and the angle that begins at is the angle the horizon arc is drawn at, `-y / √(y² + RADIUS²)`, which moves with altitude. Fading the stars in from that line rather than from level closes the band of nothing that otherwise opens between the two: from 26 units up the arc is half a radian below level and the band would be a third of the frame. The stars are therefore drawn over `y ∈ [-0.55, 1]` and not over a hemisphere.

*Per-star alpha, not total ink.* §15's convention — a total divided by the count, so the count stays a quality setting — is right for the ground and the field and wrong here. A star is a point source, so what the brightness bound sees is the single brightest 12×12 with one star in it, and that does not move with the count. Halving the count below 1024px means fewer stars, which is what it should mean.

*Off the unscaled clock.* The twinkle must not take the section's `speed`: the sky is at effective infinity and belongs to no section.

#### The camera

**Superseded (§0.3): scroll is not altitude any more.** Free flight is the
default and a guided path between the four projects is the alternative for
visitors who will not fly. The curve below is what the path inherits — a
route between four places, followed by scroll or by a control, releasing
when the visitor takes over — but it stops being the only way the camera can
be anywhere, and it stops being keyed to pin positions, because the projects
are places in a landscape rather than ranges in a document.

What survives verbatim: **a jump is not a scroll** (damping must not apply
to a re-jump, a correction or the back button), smoothstep rather than
linear between keys, exposure as a channel on the pose, and the whole of
`curve.ts`'s discipline — a pose is a pure function of its input and lives
in a module with no three and no DOM in it.

The record of the curve as built, and why each keyframe is where it is:

**Scroll is altitude.** One curve, and both modes read it.

| scroll | altitude | pitch | what you see |
|---|---|---|---|
| hero | high above | looking down ~60° | the whole cluster as a map, ground far below |
| project 1 | descending | ~35° | peaks resolving, horizon entering frame |
| project 2–3 | low | ~15° | among the ridges, traffic passing at eye level |
| project 4 | lowest | ~5° | inside it, horizon across the frame, stars above |
| about | rising | ~30° | pulling back out |

This is the whole answer to "both — above it and down in it". The descent is the read, and it means document mode is not a lesser version of world mode: scrolling the page *is* the flight, and world mode adds control rather than adding the world.

**Revised (§17): altitude is a function of beat position, not section position.** A project is three beats now (§4.3), and they are three stages of one continuous descent — the camera is visibly lower at beat 3 than at beat 1 of the same project, so the landscape resolves as the writeup arrives. The rows above name where each section *starts*.

Position along the curve is `scrollY / maxScroll`, driven by the same Lenis instance as everything else — one scroll authority (§4.6), and the camera is a pure function of scroll position exactly as this section requires of the scene state.

Damped: the camera lags the scroll by a short time constant, so a fast scroll arrives with momentum instead of teleporting. A slight pointer parallax on top — a couple of degrees of yaw and pitch, eased. This costs nothing and does more for the sense of depth than any other single thing in this section, and it matters more since §4.3: two beats in three are mostly world, and parallax is the cheapest depth cue available. Disabled under reduced motion.

**Built (§18).** Not `scrollY / maxScroll`: the keyframes are the pins' own start and end positions, because a beat is a scroll range inside a pin and nothing outside `projects.ts` knows where that is. Which is also the only way the row above can be true — pinning moves nine screens of scroll distance around, and a fraction of the page would move the whole descent with it.

Two keyframes the table does not name, both forced by the page:

- **The bottom of the flight is project four's *last* beat.** Every other row descends toward the row after it, so the beats inherit the descent from plain interpolation. The fourth has `about` after it and `about` climbs, which would raise the camera through project four's own writeup. The "~5°" row is the pair 8° → 5°.
- **`about` is keyed at the bottom of the document, not at its own top.** At 1512×804 the about section starts at 11,113px against a maximum scroll of 10,755, so a keyframe at its top is one no reader can reach. The climb is the ~500px after the last pin releases, which is where the section rises into frame anyway.

Smoothstep between keyframes, not a straight line: the segments run 781px at the top against 2,573px between projects, so linear plunges over the hero and drifts after it. Zero velocity at each keyframe also means the camera *arrives* at a section rather than passing through the altitude the section is named for.

**A jump is not a scroll.** The lag is there to give a flick weight; applied to a deep link's re-jump, to `keepingPlace`'s correction, or to the back button it flies the camera in over half a second from a pose nobody was at. More than `innerHeight` in one frame snaps. At 60fps a flick would have to cover 48,000px/s to reach that.

Under reduced motion the loop is stopped, so the camera is set from the scroll position at mount and then frozen with the rest of the scene — a deep link lands at its own pose and holds it. That is the constraint below, not an oversight.

**Re-tuned against the surface (§20).** §18 chose `alt` and `dist` when the ground was haze that never resolved, so there was nothing to compose against; §19 gave it a landform and the curve was found to be standing too close to it. The low stops gain `dist` — 2 to 4 units at every project — and §19's occlusion figure (0.1% at the lowest stop) is the room to do it without hiding the field. The descent survives it: monotone to y 10,269 and monotone up after, checked out of `curve.ts` in Node.

**The instrument is the angle between the view axis and the ground under the cluster**, not an opinion about the frame. At §18's distances it ran 11° to 18° *below* the axis at every stop but the hero, which is the bottom third of the frame — so the landform was cropped by the fold and its near flank filled what was left. Standing further back closes that angle. Measured after, by projecting the five node positions: the ring spans **17% of the frame width at the hero to 33% at the lowest stop**, centred **69–72% down** — consistently under the beats' text rather than behind it.

**The hero moves up, and the reason contradicts the instruction that asked for it.** The premise was that the ring might not fit at alt 26; it fits with room to spare, so its problem was never size but that it sat directly behind the name. Alt 26 → **30** with `dist` 13 → **12** puts it clear of the display type and is still a pull back where it counts — 24.0 units from the cluster against 21.4, because at the top of the flight the altitude is the longer leg. The pitch stays at 58°, so §4.7's own row is unchanged.

#### Fog

Not optional, and not atmosphere for its own sake.

Exponential-squared fog to `--void`, tuned so the far ground fades roughly where the horizon arc sits. Fog is what makes distance *legible* in a particle world — without it every point is the same brightness at every depth and the volume flattens back into the diagram this revision exists to escape.

It also solves the density problem at the horizon for free, and it hides the far clip so the ground has no visible end. Stars are exempt; they are behind the fog by construction.

**Built (§18): the vertical axis is squashed, and that is what makes the sentence above true at more than one altitude.** Scroll is altitude, so the same camera stands 26 units up over the hero and 4 down among the ridges. On plain radial distance the ground directly under the hero camera is 26 units away and comes back at 0.29 — measured, the first screen everybody sees fell to *half* the light §17 shipped while the low stops rose above it. Weighting `dy` at 0.35 in the distance says the fog is a layer over the ground and thin through its own thickness, which is both what an atmosphere is and what fixes the tuning: the arc is `RADIUS` away *horizontally* whatever the altitude, so 0.043 leaves the ground at 0.03 there from 26 units up and from 4. The depth gradient is 20× either way.

Nothing mixes toward a colour. The canvas is cleared to `--void` and every material over it is additive, so fading a contribution to zero *is* fading it to `--void` — one multiply on opacity. The horizon arc is exempt along with the stars: it is a drawn limit, and fogging it at exactly the distance the fog is tuned to would erase it.

#### Brightness

Text contrast is measured *against the busiest frame the scene can produce*, not against the average. If the scene can ever wash out body copy, the scene is wrong — darken it, don't lighten the text.

**Decided (§15): the rule, made measurable.** "The busiest frame" is the brightest **glyph-sized local average** the scene draws — a 12×12 mean, not the brightest pixel, because that is the background a piece of text actually sits on. The bound is `--void-lift`: the scene may look raised and never more. Measured at that bound, every text token clears 4.5:1 against the worst background on the page.

**Corrected (§16): the toggle reads the palette, not a remembered one.** High contrast has to move the busiest frame *down*, and it was not: the scene read `--leader` and `--rule` once at mount, so a page loaded in high contrast got the brighter palette — `--rule` goes from `#2A2640` to `#4A4470`, 2.6× the luminance — scaled by the same 0.45 as a page toggled into it, and the two paths differed. Both tokens are uniforms now, re-read on every change; the factor is 0.20, measured. Normal 0.99× of the bound, high contrast 0.68×.

**Revised (§17): the bound is local, because the requirement is local.** The rule says the scene must stay under `--void-lift` *because text sits on it*, and that was applied to the whole scene at all times. The actual requirement is that text is readable, which is only the same thing where there is text.

| region | bound |
|---|---|
| Behind beat-3 text, inside the scrim (§4.3) | `--void-lift`, unchanged |
| Behind beats 1 and 2, and behind the header | 2× `--void-lift` |
| Everywhere else | no ceiling from legibility; taste is the limit |

The header and the footer sit over the world at every scroll position, so they keep a real bound. They are small; the scene can afford them.

In **world mode** text is confined to the writeup panel, which has its own backing: the region behind the panel returns to the document bound and the rest of the frame is the third row of that table.

The measurement harness from §16 stands, but it must now sample **per region** rather than per frame — a whole-viewport worst case is exactly the over-constraint this revision exists to remove.

§16's ink figures were solved against the global bound and do not scale. The ground was landing at 0.65–0.82× of `--void-lift` outside Homonoia, which is why the hero showed an arc and one dot. Re-solve; do not multiply the old numbers.

**Revised (§18): the sky is a second budget, and it does not share with the first.** Measured per element with the stars switched off, the `period` and machine-ID lines that sit high in a section have *no* ground or field behind them at all — they are bound entirely by stars — and every element the ground binds has no stars over it. Over 196 paired elements nothing mixes the two enough to bind, so they solve separately rather than as one scene. Ground and field went to the ceiling; the stars were left where they were, at 1.0 of their own 1.24× headroom, because spending decoration's budget to put a `--dim` label at exactly the AA floor is the wrong trade and this section already says which of the two is scaffolding.

**And §17's local headroom is mostly gone, spent by the camera rather than by an alpha.** §17 measured 23× to 223× behind beats 1 and 3 and noted a scroll-varying alpha for §18. After the descent it is 1.11× to 36.7×, and the loose end is enargeia alone — the one project still high enough that the ground is far. Descending is what spent it: the stops with text now have the ground close. The mechanism is still available and there is much less left for it to buy.

This is the honest resolution of "make it brilliant" against "text must be readable". The constraint was never about the scene; it was about the words. Where there are no words, spend the light.

**§19: the arithmetic does not carry over.** A lit opaque surface is a completely different luminance profile from additive points — it does not accumulate, it has a maximum, and the maximum is wherever the leader light hits a slope face-on. **Re-solve from scratch**; do not scale §18's numbers, because they belong to a layer that no longer exists in that form. The binding case is likely to be a bright lit slope directly behind a `--dim` label at beat 2; measure that specifically. High contrast still moves the busiest frame down and only down.

**Solved (§19), and the predicted binding case is the real one — but it moves.** Surface exposure 0.185, mist ink 5,570 over 150,000 points against §18's 31,150 over 300,000. Over **196 elements at fourteen stops, four layers each: 0 failing, worst measured 4.66:1, the scene at 0.779 of the 4.55:1 ceiling.** High contrast puts it at 0.038 of the same ceiling — down by 20× — with nothing failing. What binds is a lit slope behind a `--dim` 10px metric label at Homonoia beat 2, and Homonoia's term ends every 3.4s, so the massif *walks* under that column and out again: a measurement that samples less than a term never sees the worst frame.

**And §17's local headroom is back, larger than it has ever been.** Per stop the surface could take 1.72× at Homonoia beat 2 and 596× at Enargeia beat 3. §18 spent that gap by descending; an opaque surface re-opens it, because one exposure has to serve the tightest text on the page while most of the page has no text over the world at all. The hero and the lowest stop are dark landforms that could be three to a hundred times brighter without touching a contrast ratio.

**§20: exposure is a channel on the camera pose.** The mechanism §17 named is built, and it is not a new one. `camera.ts` already evaluates altitude, pitch and distance from scroll position with a smoothstep between keyframes; exposure is one more number interpolated along the same curve, so there is no second authority for where on the page the reader is. The values are measured rather than chosen: the harness computes a headroom per stop and each keyframe takes **0.85 of its own stop's ceiling** rather than the minimum over all of them.

Built and measured: **0.700 at the hero and at Enargeia, 0.215 at Homonoia, 0.195 at Philoi, 0.700 at Basis, 0.290 at the bottom, 0.180 at about** — a range of 3.8× where §19 shipped 0.185 everywhere. Ten of the fourteen stops are solved from a measurement; the other four have no ground behind any of their text at all and are capped by taste at 0.70.

**The margin was not enough on its own, and the path is where it showed.** A first solve cleared all fourteen stops and then failed *between* two of them, at 4.34:1 on a 10px `--dim` label. The midpoints are constraints now. Verify the interpolated path, not the keyframes — this section means it literally.

**And a stop whose landscape moves at random cannot be bounded by a timed sample.** Homonoia's term ends every 3.4s and the next leader is drawn from the four that are not the incumbent, so the worst frame is the worst over five massif placements and the tweens between them. Two runs of the same length disagreed by 1.7× on that stop's ceiling, and one of them passed a stop the other failed. Force the sequence — each leader, each transition — and take the worst over all of it.

The failure mode to watch for is a brightness that visibly pumps under a slow scroll. Measured every 100px with the document peeled: the exposure varies ×3.78 and the frame's own mean varies **×1.74**, at most ×1.12 per 100px, because the exposure is largely cancelling the distance rather than adding a variation of its own. A Homonoia election at a standstill moves the frame ×1.05. If a pump ever does appear, the fix is fewer keyframes with wider spacing, not a faster tween.

#### Performance

Instanced points, one line, and since §19 one mesh. Measured at §16 with ground, field and arc: **4 draw calls** — ground, arc, field, and the renderer's own blit. Stars made it 5 at §18; the terrain mesh makes it **6**.

The mesh is one draw call, and it is less geometry than the instanced quads it partly replaces. Lighting is two lights, no shadows, no environment map, no post-processing. **No shadow maps** — a shadow from the leader light would be beautiful and it is a second render pass over the whole terrain. If the frame budget breaks, cut mesh resolution before cutting the point layer: the surface is doing the important job now and it degrades more gracefully than atmosphere does.

- Ground points, field 120k, stars 8k. All halved below 1024px; world mode is desktop-only anyway.
- The heightfield is evaluated in the vertex shader, not on the CPU. Nothing reads back.
- Frustum culling is off on all three — the bounding sphere an instanced sprite computes is the unit quad at the origin (§15). The camera-relative ground grid is the culling: points behind the viewer wrap to in front of it.
- **Target: 60fps on integrated graphics.** If it does not hold, ground count is the first thing to cut and the accumulation texture is the second. The election transition is the last, because it is the point.

Measure `renderer.info` with `autoReset = false` (§15 trap), and report milliseconds per frame rather than fps — fps is vsync-capped and hides regressions until it falls off a cliff. The rAF interval is vsync too, and `--disable-gpu-vsync` does not lift it; §16's number is a batch of renders between two `queue.onSubmittedWorkDone()`, because the timestamp queries under it returned negative durations. Measured there: **2.50ms** at 1512×804, and 2.32ms at DPR 1.5 — this layer is vertex-bound on 420k instanced quads, not fill-bound.

§18: **2.71ms** at 1512×804, and the same 2.71ms at DPR 1.5, which is the vertex bound saying so again. 428k quads now; the stars are 0.07ms of the total and the fog is the rest.

§19: **2.00ms** at 1512×804 and **6 draw calls**. The surface is cheaper than the 150,000 points it replaced. It is also the first layer here that is *fill* bound rather than vertex bound: at DPR 1.5 the frame goes to 2.38ms and the surface alone from 0.470 to 0.945, while the field moves 0.810 → 0.930 and the mist 0.715 → 0.745. The DPR cap in the constraints below is doing more work than it was.

§20: **2.26ms** at DPR 1 and **2.77ms** at DPR 1.5, still 6 draw calls and the same geometry — the exposure is a uniform and the shape constants are folded into the shader, so nothing here was bought with frame time. The surface is 0.73ms of it and still the layer the DPR cap is protecting.

#### Constraints

- ~~Cap DPR at 1.5 for the background layer; it is out of focus behind text
  and does not need retina resolution~~ — **the world is not behind text any
  more (§0).** The cap may still be the right performance call and it is no
  longer justified by focus. Re-decide it on frame time at §35
- ~~Halve the simulation resolution below 1024px; disable entirely below
  768px~~ — **one tier now (§0.1).** Below 1024px there is no scene at all,
  so there is no halved tier to maintain
- ~~Reduced motion → freeze on a single computed frame, do not remove the
  canvas~~ — **reduced motion is document mode (§0.1).** There is no canvas
  to freeze
- Pause the loop on `visibilitychange` — a compute simulation running in a background tab is a battery complaint. Unchanged

#### What this does not include

Stated so nobody builds them by inference. **Four of these five are
reopened by §0.2** and are marked:

- ~~No shadows and no shadow maps.~~ **Reopened, and built at §23.** They
  were refused because the terrain was a background layer. Cel-shaded
  terrain without them is noticeably flat, and hard edges suit a banded
  look. They are baked in the worker, not a second pass
- ~~No trees, rocks, water, clouds, or any other landscape furniture.~~
  **Reversed entire (§0.2, at §24).** Clouds went first, as banded volumes;
  the rest followed for the same reason the whole of this section is
  superseded. Furniture on a layer nobody looks closely at is cost with no
  reader, and that was true — but a world you fly through has no scale
  without things of known size standing on the ground. The vegetation is
  conifers
- No texture maps of any kind. Everything is procedural or accumulated
- No collision. The ground is a height function, and free flight (§0.3) clamps the camera above it rather than colliding with it
- ~~No time of day and no sun.~~ **Reopened: there is one key light now**,
  and it is the thing that makes the bands (§0.2). Its position is open. The
  leader light survives as what lights the cluster at Homonoia (§0.5), not
  as the world's only illumination

#### The one thing to get right

Not the terrain. The **election**.

Everything else here is scaffolding for a single moment: a term ends, and the landscape a visitor is flying over rearranges itself because a distributed system elected a different leader. Nobody else's portfolio does that, and it is the only thing on this site that could not be built by someone who had not implemented Raft.

If the frame budget forces a choice, that survives and everything else goes.

**Two things to get right now (§0).** The election stands, and it becomes
something you arrive at rather than something under every screen — the
cluster and its ground are a place at Homonoia (§0.5). But §0.2's step 22 is
the other one, and it comes first in every sense: if procedural terrain at
scale does not read as a landscape worth flying over, nothing after it
rescues that. The election needs a world to happen in before it is the thing
that matters most about the world.

### 4.8 World mode

**Replaced by §0.** This subsection made world mode an addition to a
document — the same scroll, the same camera curve, free flight *unlocked* at
the fourth landmark, and a mode switch between two representations of one
scroll position. §0 inverts the default: the world is what loads, free
flight is what it is, and the document is the escape hatch. The table below
is the record of the arrangement it replaces.

What survives into §0 unchanged, and it is most of the section: the
writeups are identical in both modes; a visible, persistent control switches
them and the choice is remembered; landmarks have three states; deep links
work in both directions; and the accessibility story is that nothing is
world-only. Three things do not: the modes no longer share a scroll
position, free flight is not something to unlock, and the query parameter is
`?doc` rather than `?mode=doc`.

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

**Revised (§0.7): the desktop number moves and the mobile one does not.**
260 KiB was set when the world was one particle field behind a document and
the desktop bundle was the document *plus* the scene. The world is the site
now, so the number to hold is the world chunk on its own:

| | budget | what it is |
|---|---|---|
| Document, any viewport | **120 KiB gzipped** | The whole document mode: GSAP, Lenis, no Three. §20 measured 55.2 |
| World chunk, desktop | **400 KiB gzipped** | Three, the terrain, the structures. Loaded only under §0.1's conditions |

The two do not add for a reader: a document-mode load never fetches the
world chunk, and a world-mode load pays the document's HTML but not much of
its JS. The old row is kept below because §15 and §19 are recorded against
it and it is why two of this project's decisions look arbitrary otherwise.

- ~~**Homepage JS, mobile: under 120KB gzipped.**~~ Unchanged, and easier:
  Three is not loaded below 1024px now rather than 768px
- ~~**Homepage JS, desktop: under 260KB gzipped**, GSAP + Lenis + Three
  included~~ — superseded by the table above. It bound twice (§15, §19) and
  those two decisions stand on their own merits: the WebGL 2 fallback is
  still not worth 23.1 KiB when the document is the fallback, and nothing in
  this world was ever shiny enough to want the standard material's GGX lobe
- **LCP under 2.5s** on a throttled 4G mobile profile. There is no hero image — the LCP element is the `h1`, and the only thing that has ever delayed it is JS the intro was waiting on (§12). Measured at §15: 2.0s mobile, 0.6s desktop
- The world holds 60fps on integrated graphics. **LOD is what buys that now
  (§0.2)**, not a particle count — cut terrain LOD distance first, structure
  detail second, the election transition last, because it is the point
- **8ms/frame at cruise** on the machine §23 measured 0.48ms on, per-layer
  reported. That is the whole budget everything §0.2 scatters on the
  landscape has to fit inside (§0.7)
- **Interactive world under 3s** on a desktop connection (§0.1). If it
  cannot be, the terrain is where to cut
- Track terrain chunk generation cost separately from render cost. At this
  scale the thing that breaks is a hitch when new ground arrives, not a low
  average (§0.7)
- No layout shift from the intro sequence — CLS under 0.1
- Lighthouse accessibility 100
- Every interactive element reachable and visibly focused by keyboard
- Site fully usable at 360px wide with motion disabled

**It blew at §15, and what gave was the renderer's WebGL 2 fallback** — not the laptop, and never the accessibility work. Three tiers did not fit in 260KB and two do, so a browser without WebGPU gets the document, which is the whole site. Measured: mobile 54.6 KiB, desktop 249.5 KiB.

**§20 spent nothing:** mobile 55.2 KiB, desktop 254.8 KiB, 0.1 KiB under §19 — a fourth number on a pose and three constants.

**It bound again at §19, and what gave was the mesh material.** A lit surface needs a lighting model in the bundle, and `MeshStandardNodeMaterial` is 4.42 KiB of one against `MeshPhongNodeMaterial`'s 0.86. Nothing in this world is shiny, so the difference on screen is a GGX sheen worth 4% of the mean frame; the difference in the bundle is between 1.5 KiB spare and 5.1 KiB. Measured after: mobile 55.3 KiB, desktop 254.9 KiB.

---

## 7. Build order

**`docs/STEPS.md` is the single source of truth for step numbering.** It is
the file a session opens with, it carries the done-markers and the measured
reports, and a second numbering here only ever drifts out of agreement
with it.

## 8. Open decisions

**The three from §0.8 are the ones that matter**, and they are creative
calls rather than architectural ones. The architecture is decided.

- **What the four structures are.** Anime-adjacent and *built*, but that is
  a range: gates, monoliths, towers, shrine forms, abandoned machinery — and
  §4.4's laptop. It decides whether the world reads as sacred, industrial or
  derelict, and it is the one creative call the build order actually blocks
  on (step 31). Ask before modelling.
- ~~**Is the terrain habitable or hostile?**~~ **Answered at §24:
  habitable.** §0.2 makes the landscape alive — water in the low ground,
  conifers and scrub on the lower slopes, motes in the air — which is the
  first of the two and settles the palette and the light with it. What it
  does not settle is the second half of the same question, below.
- **Whether anything moves in it.** Birds, animals, something in the water.
  Cheap, and the difference between a landscape and a place. Also the
  easiest thing here to make look like a screensaver. Not scheduled; §0.2's
  wind field is what it would read, so it is cheaper after step 27 than
  before it.
- **Sound.** A world without audio is quieter than it should be, and it is
  cheap to add and expensive to get right. Not in the build order; it would
  be a step of its own.

Carried over:

- **Display typeface.** Archivo is shipped and self-hosted (§5), picked for having a real `wdth` axis. It was never set against Anybody or Roboto Flex at 180px the way this line asked — open only in the sense that it was decided by elimination rather than by looking.
- ~~**The laptop's idle motion.**~~ Moot until the structures are decided:
  §4.4 is one candidate answer to the first bullet above, and the camera it
  was going to be judged against (a scroll-driven curve with its own pointer
  parallax) does not exist any more.

---

## 10. Skills ramp

Already in hand: TypeScript, Astro, GSAP, WGSL compute (Enargeia), distributed systems.

**Vanilla Three, not React Three Fiber.** R3F exists to reconcile a component tree; this scene is one canvas that mounts once and never unmounts, and drei's helpers are all things it doesn't use. (The original argument was about keeping a React root alive across View Transitions — those are gone, §4.6, and the point stands without them.) TSL and compute are renderer-agnostic, so R3F-based tutorials still apply; only their `<Canvas>` setup differs.

To learn, in build order:

1. **Three.js core** — scene graph, cameras, materials, lights, render loop, disposal. The largest gap; a wide API rather than a hard one
2. **TSL** — node-based shader authoring. New syntax, but the WGSL model transfers directly
3. **GPGPU in Three** — compute nodes, storage buffers, instanced particles. Closest to work already done
4. **Free-flight camera** — look, move, momentum, damping, an altitude clamp
   over a height function, soft bounds. It is the entire movement system
   (§0.3). Camera curves are still on the list but demoted to the guided
   path: frames along a curve, damped follow, releasing to the visitor
5. **Procedural terrain at scale** — ridged multifractal over fBm, chunked
   generation around a moving viewer, LOD rings or a quadtree, generation
   off the main thread. This is the largest new gap and the step the whole
   plan turns on (§0.2). ~~ScrollTrigger driving a camera~~ is not a topic
   any more; the Lenis wiring in §4.6 is still document mode's
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
