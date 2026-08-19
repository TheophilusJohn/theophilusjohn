# theophilusjohn.com

Personal portfolio for Theophilus Biju John. Astro 7, deployed to Cloudflare Pages.
Live at https://theophilusjohn.com — every commit to `main` deploys.

Full design spec: `docs/SPEC.md`. Numbered build steps: `docs/STEPS.md`.

---

## What this site is

Portfolio-first, four projects, heavily animated, dark. Two modes:

- **World mode** — a flyable, cel-shaded night landscape. The four projects
  are scenes standing in it, on a route driven by scroll. **This is what
  `/` loads** on WebGPU, ≥1024px, motion on — since §33, in fact and not
  only in the spec. See SPEC §0.
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

**Since §36 there are two cities in it, and they are the reason the world is
ten kilometres across.** `city.ts` is the seventh module with no three and no
DOM in it — it imports `height.ts` and `cover.ts`'s hash and nothing else —
and it owns both, as 250 boxes in `built.ts`'s existing mesh: **no new draw
call, and at DPR 1.5 flying down a Houston street is half a millisecond
*cheaper* than the empty plain**, because an opaque tower over a sky pixel
takes the dome's two fractal noises off it. The contrast between them is a
plan as well as a skyline: Houston is a five-by-five grid with a hard edge on
the flattest ground its footprint could find, and Delhi is a plot rule tested
against slope and the water line, so the terrain draws its outline. Nothing
grows in a street — `cover.ts`'s `paved()` is one disc per city read by the
conifers, the stone and the ground cover alike, which is why `height.ts` and
not `city.ts` carries the two centres: the worker has to know *where* a city
is without importing what one is made of. `camera.ts`'s bound goes 2,600 →
**5,000**, and that is load-bearing rather than aspirational: Houston stands
2,992 from the origin. Everything under it is where §24 measured it.

**Since §40 the world has a day, and it is the sky and the stars.** The light
token set is no longer scoped away from `[data-mode="world"]`, so `--scrim`
and `--halo` inverted for free exactly as §39 predicted and `palette.ts`
observes `data-theme` beside `data-contrast`. `sky.ts`'s `gradient()` is now
**two constructions behind a branch**: night lifts from `--void` at the zenith
to `--rule` at the horizon, day deepens from `--rule` at the horizon to
`--muted` at the zenith, and **the one token neither ever wears is `--void`** —
drafting the day horizon as `--void` reproduced §22's bug in a mirror, since
that is the clear colour and what `haze()` starts from. Four bands, `band.ts`'s
own RAMP and one-pixel `fwidth` edge, cut into the **ramp** rather than into
tokens, because the light set is a text palette with **nothing at all between
0.705 and 0.14**. The glow goes toward `--void` and the deck's lit face moves
`--paper` → `--void`; its body is `--rule` in both. **The stars are not drawn
at day** — one draw call fewer at every pose (50→49, 64→63, …) and 16,000
triangles, worth a measured **0.004–0.019ms**, which is a fifth of what the day
gradient costs and not the payment §4.9 hoped for. The branch is a measurement:
as one `mix` the day end cost the **night** frame +0.051–0.076ms at DPR 1.5,
branched it is +0.022–0.045, and `fwidth` is legal inside it because the
condition is a uniform. **Lifting the scoping brought §39's split due in world
mode** — seven DOM controls still wore `--leader`, the arrival's subline at
**2.23:1** over the day sky and two progress fills at **1.74:1** on their own
tracks; all seven are `--leader-ink` now and there is no `var(--leader)` left
in the DOM layer. The night appearance is unchanged **by measurement** — 20
glyph-mask readings over five frames, identical at 19 and 0.01 apart at the
twentieth. **The scrim's rung did not move**: swept 0.45 → 1.0 it buys nine
hundredths, because the covered pixels are looking at the halo. What it left
open is that `--leader-ink` has **no margin** (§8): the machine ID is
4.42–4.50 over the world, the halo's ceiling is the token's own 4.54, and §43
re-solves it against a ground §41 and §42 have not built yet. **The light world
is mid-surgery until §42** — a day sky over a night-shaded white-out.

**Since §39 there are two appearances, and only the document had the second
one.** `tokens.css` carries a light set under
`html[data-theme="light"]:not([data-mode="world"])` — the dark set's own
*ratios* reproduced (every one meets or exceeds its twin: `--dim` 5.10 against
5.07, `--muted` 6.49 / 6.43, `--paper` 15.67 / 15.64), the same 248–252° hue
family, and a fourth set for light × high contrast. **The accent splits by
job, not by appearance**: `--leader` is `#A99BF5` in both and always will be,
`--leader-ink` is the accent when it has to be *read against the page*, and in
dark it is `var(--leader)` — so the dark appearance is unchanged by
substitution rather than by intention, proved at 17 computed-colour probes in
both contrast states. The split had to go **wider than drafted**: `#A99BF5` is
**2.23:1** on the light page and **1.74:1** on its own `--rule` track, so the
focus ring, the stage's progress fill, `text-decoration-color` and the cursor's
link dot moved with the type. The cost is that the light document has **no
full-strength `#A99BF5` in it at all** — two candidates were built and
measured out, the pressed-toggle chip at a 2.23:1 boundary and the machine ID
on a dark chip *despite* passing both bounds (7.03:1 ink, 15.67:1 edge),
because it is the only filled ground in the light document and the accent is
**9.9% of its own mark**. SPEC §8 carries that rather than hiding it, and the
standing position is that the accent may simply not have a home on a pale
ground. **`--leader-ink` is solved in OKLCH** — the source's own hue and
chroma (h 290.01°, C 0.1285) with lightness the only thing that moves, which
is what makes it read as `#A99BF5` darkened; the first solve held HSL
saturation instead and drifted 7.3° toward blue with 78% more chroma. The
third toggle is `tj:theme`, three states, `auto` **resolved to
an explicit attribute before first paint** rather than duplicated inside a
media query; with the bundle blocked the appearance still applies, and with no
JS at all the site is dark, which is its default by design. The world is
night in both appearances and `--scrim` and `--halo` invert for free when §40
lifts the scoping. Steps 40–43 are the world at day and the re-measure; see
SPEC §4.9.

**Since §38 hard rule 6 is verified rather than asserted, and the type is
legible over everything §36 and §37 put in the world.** The audit is two
halves: a walk over every string world mode can put on screen (**67, of
which 59 are the document's own words**; the eight that are not are controls
and landmark names), and a scene-by-scene reading of what §34's four scenes
*show* against what the writeups say — which found two gaps and closed them
with one sentence each in `enargeia.mdx` (a token is one pass up through the
layers) and `homonoia.mdx` (the four beats of an election). The cities and
the ten landmarks contribute **no strings at all**, which is the easy half
confirmed. **`--halo` is one token now** — §33's stack plus a 1px ring, which
is what the bound actually needed, because it is measured over the glyphs'
own covered pixels and what shows through there is the antialiased edge. It
carries the way out, the stick, the arrival column and a station's name row;
before it, the way out measured **3.86:1 over the turbine row** and a
station's machine ID **1.76:1** across a lit cloud, and the scrim could not
have fixed the second (solving for the rung wants 0.95 against §32's 0.45).
Nothing is under 4.5:1 now and the worst of 116 measurements is 5.04, where
5.07 is `--dim` on pure `--void` and the ceiling. **§33's `Esc` defect is
closed**: the inline listener returns unless `data-mode` is still `world`,
so the adapter-refused load records no preference. And the frame budget has
an instrument at last — see Budgets; the short version is that this machine
is an **M4, integrated**, that a frame is `base + slope × megapixels` with
the sky dome as nearly all of the slope, and that the world holds 60fps with
a GPU **10.8× slower** than this one at the shipped DPR cap.

**Since §37 the other ten landmarks stand in it, and none of them is a
station.** `landmark.ts` is the eighth module with no three and no DOM in it —
it imports `height.ts` and `cover.ts`'s hash and nothing else — and it owns
the stadium, the datacenter hall, the dish array, the turbines, the torii
gate, the court, the bridge, the lighthouse, the standing stones and the
wreck: **212 boxes into `built.ts`'s existing mesh and nineteen lights into
the additive layer, for no new draw call at all**. Every site is *searched*,
one rule per silhouette, and the rule is the landmark — flat ground for a
bowl, a summit for a gate, a steady hillside for the array, a crest for the
turbines, a valley with abutments on both sides for the bridge. All ten are
at least 445 units off the flown route. **Scale is what keeps them apart from
the four scenes**: 17 to 136 units against stations of 40–70 and towers of
180–320, and the court is at true basketball-court size, which is the joke.
**Nothing lit here wears `--leader`** — it is `--mint`, §30's token, because
a lit thing in the leader's colour is a promise of content and §0.2 says a
landmark must not make one. A lamp is a signal that does not travel; the
lighthouse's turning light is a *rate*, and the fade distance is authored per
signal now so "visible from further than it should be" is 2,600 units rather
than a claim. `kind 5` is the only new part kind since §34 — a rotor blade
turning about its part's **local z**, carrying the integral of `wind.ts`'s
gust so a gust speeds the five turbines up as it passes them.

**And the proxy is the geometry minus what moves.** Every box is pushed to
both lists in one call (§36's rule), so the fifteen turbine blades are the
only omission — a blade's place is a function of the clock and a hash entry
is not. Three of the ten are places rather than objects: you fly through the
torii, down the datacenter's fifteen-unit aisle and under the bridge.

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

**Since §34 there is something standing at each of the four sites, and one
of them is an election.** (The four scenes are **182 parts**, not the 441
§34's own note recorded: its aliasing fix took Enargeia from 350 cells to
90 and the number outlived it. 96 / 20 / 45 / 21, counted in Node at §35.) `scenes.ts` is the fifth module with no three and
no DOM in it — it imports `height.ts` and nothing else — and it owns the four
**sites** as well as the four scenes, because a scene is a thing in the world
and `route.ts` is a flight past it. Scale is **enormous** (§8's last open
decision, answered): 40 to 70 units against conifers of 12.5 and city towers
of 180 to 320, decided on §24's six-unit camera floor rather than on taste.
`consensus.ts` is Raft as a pure function of the clock — `stateAt(t)` is
total, so a harness walks any phase of any term by asking for the second it
wants, which is the correction to §15's `Math.random()` leader. `built.ts`
draws all four scenes in **two draw calls**: one instanced box mesh for 356
parts and one additive layer for 51 travelling signals, `stands.ts`'s
construction for the third time. And `swell.ts` is the ground answering the
election — see below, because it is the load-bearing decision of the step.

**The election moves the ground and the field does not move.** `uplift()` was
shares-weighted and its `min(…, 1.4)` clamp ate them entirely: measured,
`[1,0,0,0,0]` returned 1.400 at all five nodes, exactly as equal shares did,
so the election could never have moved anything. It is shares-independent
now, and the deviation lives in `swell()` — one narrow summit per node, σ=62,
zero-mean, so a term changes which of the five summits is high and leaves the
massif (the biggest thing in the opening frame) alone. **It is not part of
`height()`**: everything a worker bakes has to be a pure function of (x, z),
including where a conifer stands and how dark the ground under it is, so the
deviation is carried on the main thread instead — a vertex term on the
terrain with its own analytic normal, a rigid lift on the masts, and a JS
term on §24's floor. Measured: 38 units between holding the term and not,
over 2.7 seconds, and chunk generation unchanged.

**Since §35 everything built is solid, and the stick is a button.**
`solid.ts` is the sixth module with no three and no DOM in it: 48 authored
boxes in a spatial hash, a sphere against an oriented box, resolved by
pushing out along the shallowest axis with §24's floor holding the veto —
ground and architecture are two constraints and both hold. It is a **static
table**, decided against the two residency schemes on measurement rather
than taste: the whole world is 2,376 bytes, and a scheme that saves two
kilobytes costs a second object lifetime to reason about. A proxy is
**under-approximate and authored**, and "inside" means inside the volume a
four-unit sphere can occupy rather than inside the drawn outline — every gap
in these four scenes is narrower than the sphere is wide, so a box spanning
one is exact. Basis's six struts are deliberately **not** in it. Measured:
zero reachable cells inside anything carrying a proxy, over 21.5M lattice
cells (§37 added 3.79M more, also zero); the route's closest approach is the
same number to a proxy and to a drawn box alike, which is the check that
matters — **22.67 units at the baked distribution and 12.31 with a node
holding the term** (§37's correction; §35 and §36 both recorded the first as
the minimum); a query is **0.055µs a frame on the route** and 0.98 at its
worst, against the floor clamp's 1.8. `stick.ts` is the other half — `F` is
gone, the offer is a `<button>` at the opposite end of `.escape`'s edge with
the rail between them, it ramps in over 300 units at the end of the last
dwell, and `tj:flight` persists the **unlock** and not the mode, so a
returning visitor opens at the arrival with the offer up rather than in free
flight over an empty ridge. A wheel from inside free flight rejoins the
route at the nearest station — the wheel and not every input, because the
arrows are movement and a touch drag is the look control.

**And the arrival frame carries the name** (§0.3's 0% row, finally owned by a
step). Not a clone of the document's hero — that is `--t-hero` at 18vw and
would fill the frame the landscape is the subject of — but `--t-2xl` in the
reading column, on a ramp off scroll that is gone by 1,200, four hundred
units before Enargeia's machine ID begins to resolve.

**Since §33 the mode is decided before first paint, and that is the whole
of world-first.** The head script in `Base.astro` resolves it and writes
`data-mode` on the root: capability first and unbypassable (an adapter, 1024
px, motion on — `?world` moves *memory* aside, never this), then
`?doc > ?world > tj:mode > capability`. A URL is obeyed and never stored,
because a link someone sent you is not a preference; `tj:mode` is written
only by the two controls that are a reader's own act, which is the same
three-state shape as `tj:motion`. Three things need that answer in the frame
the browser paints: the **curtain** (`Entry.astro`'s opaque `--void` layer,
carrying an honest percentage — streamed bytes, then generated chunks, never
a time curve), the intro's decision **not to arm** (a world load would
otherwise put LCP behind the bundle for a sequence under an opaque canvas),
and the **way out**, which is a promise about a load with no bundle yet — so
the click and `Esc` are bound inline, delegated off `document`, and
`window.__leaveWorld` is the one definition of leaving that `scene.ts` also
calls. `world.ts` is the half that cannot be synchronous: it asks for the
adapter, streams the chunk named by `/world.json` (a build plugin writes it;
a hashed filename does not exist until the build that made it), and takes
the curtain back down if the answer is no. **Nothing on that path is
destructive** — the document is painted, `inert` rather than hidden, and one
attribute away.

**The landscape is a set of files that cannot see a GPU and a few that can**
(§22). `height.ts` is the field and imports nothing — no three, no DOM — so
Node runs the `.ts` directly and every number about the terrain is that
function's own output. `chunk.ts` samples it into arrays, `grid.ts` is the
vertex layout the worker and the main thread both index, `cover.ts` (§27) is
where anything grows, `sun.ts` and `wind.ts` are the two directions the world
agrees on, `scatter.ts` (§28) is what stands on it, `air.ts` (§30) is what
floats over it, `terrain-worker.ts` runs the generator off the main thread,
and `terrain.ts`, `water.ts`, `blades.ts`, `stands.ts`, `motes.ts`,
`clouds.ts`, `sky.ts`, `built.ts` and `swell.ts` are the parts that know what
a mesh is. **`scenes.ts`, `city.ts` and `landmark.ts` are on the pure side of
that line too**: everything standing in this world is authored as boxes and a
rule, and `built.ts` is the only file that knows what a mesh is made of. Keep it that
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
   state or a live link, it must not be that colour. **And since §39 it means
   the colour, not the ink**: anything that has to be *read against the page*
   — type, a focus ring, an underline, a progress fill — is `--leader-ink`,
   which is `var(--leader)` in dark and a darker sibling in light. `--leader`
   itself may only be a fill with something dark on it, or **in the world's
   own render layer** — §40 sharpened that last clause, because it was written
   while the world was night in both appearances and the DOM controls over the
   canvas are the page in every sense that matters. There is no
   `var(--leader)` anywhere in the DOM layer now.
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
- **A pose function with a defaulted second argument is two functions, and
  sampling it at the default measures the wrong one.** `poseAt(y, arrive)`
  carries §29's residual creep in `arrive`; every diagnostic that called
  `poseAt(y, 0)` was blind to the creep entirely — not under-resolved, but
  measuring a different function. Measured: 6.9°/100 units at `arrive = 0`
  against **25,191** at `arrive = 1`, in the same place.
- **`atan2` toward a point the camera passes *through* is a singularity.**
  Re-aiming at a station from the flown pose is a bearing that swings 180°
  when the path passes near the site: Philoi's departure misses its own site
  by **13 units** where the other three miss by 118, 278 and 130, and it is
  the only one that whips. An aim correction has to be the difference between
  two *fixed* poses, never an absolute aim taken from wherever the camera got
  to — then it is bounded, and inside the dwell it is the same number.
- **The camera's floor is not `height()` under it.** `floorAt()` takes the
  highest ground under the camera *and along `velocity × 0.35s` ahead of it*,
  so `pose.y − height(pose.x, pose.z)` is not the margin the clamp uses and a
  clearance check built on it can miss a clamp entirely. Recompute with the
  look-ahead, at the speeds the route actually reaches.
- **Comparing two screenshots for identity while a render loop is running
  measures the loop.** The site's own rAF keeps advancing `uTime`, so frames
  taken either side of a change differ whatever the change was. Stop the
  loop, or measure something that is not the pixels.
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
- **A link that changes the query is a mode change, and `url-sync` ate it.**
  Every path on this site normalises to `/`, so the handler that stops the
  header nav reloading the page (§4.6) also caught `/?world`: preventDefault,
  pushState, and a scroll inside the document it was already in. The address
  bar then reads `?world` on a page that is still document mode, and it
  cannot be otherwise — the mode is resolved in a head script and a
  pushState does not run one. Tell: the URL changes and the document does
  not, three navigations in a row, with the same per-document nonce each
  time.
- **Pumping a worker pool on rAF makes it a display-rate pool.** The only
  thing that dispatches terrain is `terrain.update()`, so awaiting a frame
  between calls hands three chunks to three workers and then idles them for
  the rest of the frame: 136 chunks took **860ms** against a pool that
  generates one in about three. A macrotask yield — the same queue the
  replies arrive on — took the whole world load from 1,089ms to 399. Use a
  frame only when the thing being paced is *drawn*.
- **§17's 12×12 block is glyph-sized for the display face, not for 10px
  mono**, and at that size the label is mostly gaps. Measuring a halo that
  way averages it against the space between words and reports no
  improvement from a fix that visibly works. And a sample rect padded past
  the element reaches whatever is next to it: a rect padded 12px below the
  way out caught the top of the route rail, which is `--leader` on `--void`
  and scores as ink in a brightness mask — that is where four different
  scenes reporting an identical 0.385 came from. For text over the world,
  build the glyph mask first (hide the canvas, render the label white on
  `--void`, read coverage), then measure the background *under the covered
  pixels only*.
- **`localStorage` is per origin, not per page**, so a harness that seeds it
  with `evaluateOnNewDocument` carries every earlier test's writes into the
  next one — and clearing on *every* document instead wipes the write the
  test just made, which is usually the subject. Seed once per run, behind a
  `sessionStorage` sentinel.
- A harness that does not clear the cache cannot see a download phase at
  all: the loader's fetch step completed instantly from an earlier test's
  copy and the phase it was waiting for never appeared. And `load` on a
  throttled connection does not fire until the world chunk has arrived, so a
  wait for the fetch phase armed after it always misses — go to
  `domcontentloaded`.
- **A cross-checked tuple is only as good as its field order.** Two "failures"
  in the entry harness were `escape` read in `curtain`'s position, and two
  more were expectations I had invented rather than read (a project's
  headline, and an address `url-sync` is *supposed* to rewrite). Name the
  fields in the assertion; a labelled object cannot be misread the way a
  four-element array can.
- **A gated branch in a vertex shader still costs the branch.** `swellLift`
  in `stands.ts` ran once per vertex of twenty thousand instances on a
  608-unit disc and measured **+0.22ms a frame at every pose in the world**,
  including a settle a kilometre from the thing it was for. What it bought,
  counted in Node: **twelve conifers** inside the whole footprint and **no
  ground cover at all**. Count what a term is *for* before paying for it
  everywhere; a placement rule that removes the twelve is free.
- **`fog(positionWorld)` in a fragment shader recomputes the whole vertex
  chain per pixel.** Three derives `positionWorld` from `positionNode`, so a
  billboard whose position included five exponentials evaluated them on every
  covered pixel: fifty-one additive quads cost **0.31ms**, against 0.004 for
  four hundred and forty-one opaque boxes, and a material stripped to a
  constant cost nothing — which is what says it is the shader and not the
  submission. Anything constant across an instance belongs in a `varying`,
  including the whole product of a transparent layer's opacity terms.
- **A camera-facing quad at a *fixed* world point straddles the near plane.**
  Every other billboard here is camera-relative (§30's motes, §30's cloud
  forms), so its centre is always in front of the eye; one placed in the
  world is not, and a quad built in the camera's basis around a point behind
  the near plane does not vanish — it rasterises across the whole screen.
  Collapse it to a point.
- **A frame-cost A/B is not like for like if the poses moved.** §34 took the
  settle's aim height from the scene's pad instead of `height(site)`, which
  changed the pitch at all four stations by a degree or two — enough to
  change how much ground is in frame. Drive one forced pose into both builds.
- **`If` needs a shader stack, so it only works inside `Fn`.** Called bare in
  a material's node graph there is no block to add the branch to, and the
  build fails at mount with `Cannot read properties of null (reading 'If')` —
  which in world-first is a page that never comes out from behind the
  curtain.
- **A recursive "not the previous one" is O(k) and overflows.** A succession
  written as `leaderOf(k−1)` walks once per term elapsed — four hundred
  frames deep after an hour, and a stack overflow for a harness asking about
  term 20,000. A fixed cycle has the property by construction, costs one
  modulo, and needs its seam checked.
- **The bands are placed around flat ground and a box is even less like flat
  ground than a cone.** `sun.ts` puts the key light where an axis-aligned
  face reaches `N·L` 0.660 at *best*, so a conifer's 0.05–0.86 compression
  lands the brightest wall of a building two hundredths past the terminator
  and every scene is one flat fill. Fit the range through what the shape can
  actually reach — and note that §29's framing rule says nothing about where
  the light is, so two of the four settles stand on the shadow side and a
  built surface needs a **fill** the terrain never wanted.
- **Thin slabs alias, and the fix is gaps rather than thickness.** Plates
  0.85 units thick on a 2.9 pitch, seen at a shallow angle with no MSAA,
  showed the back of a stack through the front as vertical moiré — which
  reads as a rendering fault rather than as depth. 5.8 units of air on a
  17-unit pitch is a gap the eye resolves as a gap; 1.8 on 8 is where two
  edges land in one pixel.
- **A whole structure in `--leader` is too much accent for one bit of
  state.** A hundred-unit mast given the term read as a column of accent with
  its own shading mixed away under it, which flattened it into a silhouette.
  Five identical masts differing by one lit block is what an election looks
  like from the air.
- **An instance's yaw turns the box about its own centre and does not move
  it.** `built.ts` writes an instance position as `site + part.(x, y, z)`
  flat and hands the shader `cos/sin` separately, so a second consumer of
  the same authoring that *also* rotates the offset puts the box somewhere
  else: §35's proxies had sixteen of forty-eight displaced, worst **37.8
  units** at Basis's outermost module against a four-unit camera radius —
  a proxy for empty air beside a module with nothing on it. It is invisible
  in every rendered frame, because the thing that is wrong is the thing that
  is not drawn. The cross-check that catches it is cheap and exact: where a
  proxy *is* the geometry, the closest approach to a proxy and to a drawn
  box have to be the same number.
- **"Cannot get inside it" is a flood fill, not a set of probe points.**
  Fill the free space around a scene from outside on a lattice, then ask of
  every cell it *reaches* whether it is inside the drawn geometry — the two
  failure directions are not symmetric, and only one is safe. A lattice too
  coarse to resolve a passage under-reports reachability, which hides a
  hole; one that jumps a wall over-reports, which merely sends you looking.
  Every obstacle is inflated by the sphere's radius before the test, so the
  thinnest thing in §35's world is 9.4 units of blocked space against a
  2-unit step — a wall cannot be jumped, and the step is what decides
  whether a gap is found.
- **A spatial hash's distance is readable without exporting one.** A query
  that answers "is anything within r" answers "how far is the nearest
  thing" under bisection on r, so a harness gets an exact distance out of
  the shipped function instead of re-deriving the table it walks. 44
  bisections over 2.8M poses cost five seconds.
- **The tab the browser tools drive is `document.hidden` between calls**,
  so rAF stops and anything the render loop drives — a route position, a
  panel, a `data-ready` — silently never advances. Wheel events dispatched
  into it still accumulate, so the symptom is a page that has clearly
  received the input and not acted on it. A `computer` screenshot
  foregrounds the tab; a `javascript_tool` call does not. Drive state
  through the module's own functions rather than waiting for a frame.
- **A closure's state outlives the `localStorage` key that seeded it.**
  Clearing `tj:flight` and re-testing the unlock in the same page measures
  a module whose `unlocked` and `latch` are still set from the last run, and
  it reports the *end* state for every step of the ramp. Reload between
  runs; a three-state preference has three states to reach and only one of
  them is the one already in memory.
- **§17's 12×12 block does not fit inside a 10px mono label at all.** §35's
  stick is 240 covered pixels in a 108×7 box, so a 12×12 window anchored
  inside the glyph box has no valid position and the measurement comes back
  empty rather than wrong. Size the block to the glyphs (7px here) and
  restrict it to the mask's covered pixels, which is also what keeps the
  route rail — `--leader` on `--void`, three pixels away — out of the sample.
- **A number that exists to make a guarantee checkable has to be the number
  the guarantee is made in.** `camera.ts`'s floor has included the swell since
  §34 and `view.pose().ground` — which exists for no other purpose than
  checking the floor — still returned `height()` alone, so a clearance taken
  against it read **under six units on 210 frames** of a terrain-hugging
  flight over the massif, worst −2.99, with the clamp holding exactly 6.000
  the whole way. It looks like the guarantee failing, and every dip is a place
  where the swell's deviation is negative. Fixed at §36; the tell was
  `nearBuilt: false` at every one of them, 147 to 255 units from the cluster
  centre, which is inside `SWELL_REACH` and nowhere near a mast.
- **"The towers stop you" is not "the camera stops".** Resolution is a push
  (§0.3), so a boosted flight straight at a city slides round it and comes
  out the other side having travelled almost the full distance — which reads
  as no collision at all. The honest instrument is whether any frame *ended*
  inside something: 633 frames flown at Houston at 180 units/s, zero still
  inside, closest approach exactly 4.00 — the camera's own radius, pressed
  against a wall.
- **A `flyTo` is an ease and any input cancels it**, so a harness that sets a
  start pose and immediately starts holding a key measures a flight from
  wherever the camera happened to be — 1,059 units from where it says, in the
  case that found this. Wait for `view.easing()` to go false, and report the
  pose the run actually started at.
- **An opaque layer that covers the sky is a negative frame cost, and §26's
  water is not the only case.** The sky dome runs two fractal noises per sky
  pixel, so at DPR 1.5 — where the frame is fill-bound — flying down a street
  in §36's Houston measured **1.05ms against the empty plain's 1.61**, in both
  orders. The build with 250 more boxes in it renders that frame half a
  millisecond faster than the one without them.
- **A bearing convention is invisible to every other check.** `landmark.ts`'s
  `yawFor` was `90 + bearing` where `turn` and `built.ts`'s `rot` both send a
  part's local +z to `(sin θ, cos θ)`, which makes it `90 − bearing`. The two
  agree at 90° and nowhere else: the dish array came back running **122° off
  the contour** it was sited on, the turbines across their own crest, the
  torii's opening 27° off its approach. Nothing else caught it — every part
  stood on the ground, nothing floated, the flood fill found no way inside,
  the clearances were fine. What catches it is asserting the **bearing between
  two placed parts** against the bearing that was asked for, which is one line
  per landmark.
- **A rule that describes a shape's neighbourhood is not a rule about the
  shape.** "The ground is higher at both ends" scores a **saddle**, not a
  crest, and the first turbine site sat four units below the flank beside it.
  A crest is above the ground either side of it *and* holds its own height
  along itself — two tests, and the second one alone is a col.
- **An additive lamp inside the box that is meant to be emitting it is
  depth-tested away.** The layer does not write depth but it does test it, so
  a billboard at the centre of a lighthouse's lamp room, or a floodlight at
  the centre of its own head, is drawn and discarded — measured, **no change
  at all in an 80-pixel window over nine seconds** of the beacon's own cycle,
  which reads as a light that does not work rather than as one that is
  hidden. Put the lamp in open air; where the housing would enclose it, make
  the housing mullions.
- **A repeated placement is only as varied as it is coprime with the field it
  reads.** §37's turbine row was pitched at 120 against `wind.ts`'s 120-unit
  gust wave, so all five rotors sat at the same phase and turned in unison —
  the exact failure the gust term was added to prevent. At 96 they sit a
  fifth of a cycle apart. Check a pitch against every wavelength the thing
  standing on it reads.
- **A landmark's lights may not wear `--leader`, and the reason is §0.2 rather
  than §2.** The accent marks state and a landmark has none, but the binding
  argument is that a landmark must be distinct enough that nobody flies to one
  expecting content — and a lit thing in the leader's colour is a promise of
  content. `--mint` is this world's light that is not state.
- **A "closest approach" swept over states is wrong if the geometry is not
  re-read for each one.** §35 and §36 both recorded the route's least
  clearance to anything built as 22.67 and §36 added that the swell "only ever
  lifts the masts further from the path". It is the other way round — the
  route climbs out *over* Homonoia — and the true minimum is **12.31**, with a
  node holding the term and its crown 60 units higher. The claim is what
  stopped anyone re-checking the number, which is the more expensive half.
- **The compositor can present at 30 Hz with the tab genuinely foreground**,
  and then every rAF interval in a flight test is vsync rather than work —
  a median of exactly 33.3ms with a p99 of 35.0 is the tell. Nothing timed as
  a batch between two `onSubmittedWorkDone` is affected, which is why that is
  the frame-cost instrument; "frames over 25ms" simply cannot be reported in
  such a session. Measure the raw rAF interval before trusting one.

- **A camera pose solved by iteration has two ways to go wrong and both
  read as a flaky world.** Turning the camera left moves the world *right*
  in the frame, so a naive correction on either axis diverges — measured,
  yaw −455°, −1019° and 873° on three passes over the same site, each
  measuring whatever happened to be in that direction and reporting 3.85,
  4.70 and 5.06 for the same thing. And `project()` reads
  `matrixWorldInverse`, which `camera.ts`'s `drive` does not refresh. Assert
  the residual and refuse to measure a pose that did not converge.
- **`text-decoration-color` does not follow `color: transparent`.** It is
  `--leader` globally here, so a brightness harness that hides the ink to
  read the backdrop leaves every link's underline painted: measured, four
  different metric strips reporting an identical worst block of **0.3847**,
  which is `--leader`'s own luminance and the tell that it is ink and not
  scene.
- **A halo is won at the glyph edge, not in the pool.** The bound is
  measured over the glyphs' own covered pixels, and what shows through there
  is the antialiased edge — so a 1px ring took every failing case from
  3.86–4.16 to ≥4.90, where doubling the 2px core reached 4.63. Add radius
  inward before outward.
- **A harness that serves uncompressed is measuring a different site.**
  Cloudflare serves the build gzipped; a plain static server does not, and
  document LCP on Lighthouse's Slow 4G came back **1,820ms against 1,116**
  with one line added to the harness. And "Slow 4G" names two presets:
  Lighthouse's is 1.6 Mbps at 150ms, DevTools' applies the 3.75× multiplier
  to the latency as well, and they are a second apart on the same page.
- **A `__probe` patch can change the chunk graph.** Extra dynamic imports in
  the entry made rollup split the world chunk in two — 49KB and 727KB where
  the shipped build has one of 798KB — so `world.json` named the small half,
  the curtain's fetch phase counted 20 KiB and the import fetched the rest
  with the bar sitting still. Take loading numbers on the shipped build.
- **axe run during the intro reports the log band.** GSAP fades `.log-band`
  in from opacity 0 and leaves an inline opacity on it for the whole tween,
  which axe folds into the contrast it computes: eleven `color-contrast`
  violations on `aria-hidden` decoration, none once it has cleared. Wait for
  the tween, not for `data-intro`.
- **An accent is not a colour with one contrast — it has one per ground, and
  a palette that flips grounds re-asks the question.** `#A99BF5` is 7.65:1 on
  `--void` and **2.23:1** on the light page, 1.74:1 on its own `--rule` track;
  the drafted claim that it "clears 3:1 for non-text UI on a pale ground" was
  made against no measurement and is wrong by a third. The fix is a token
  split by *job* (`--leader` / `--leader-ink`) rather than by appearance, and
  the second one defined as `var(--leader)` in the base set — which is what
  makes the untouched appearance provably untouched, because there is no
  second value anywhere to keep in sync.
- **Both contrast bounds can pass and the mark still be wrong, and the
  instrument for that is the accent's share of its own area.** A machine ID
  in `--leader` on a `--paper` chip measures 7.03:1 for the ink and 15.67:1
  for the chip's edge — a dark mark on a light page is the easy direction for
  a boundary — and it still came out, because at 10px mono in a 112×24 box the
  accent is **9.9%** of the thing built to show it and what registers is the
  black rectangle. Two other tells worth naming: a filled ground that is the
  *only* one in its document is a vocabulary of one and reads as an artifact,
  and the heaviest element in a section should not be its least consequential
  text.
- **Reversing a fill and its ink solves the ink and not the boundary.**
  `--paper` on `#A99BF5` is 7.03:1 and reads beautifully; the chip's own edge
  against a pale page is 2.23:1, and the edge is what SC 1.4.11 is about —
  it is the thing that says the control is pressed. High contrast made it
  *worse*, because the dark set lifts `--leader` and a lighter accent on a
  light page is 1.66:1. Measure the fill against what surrounds it, not only
  against what sits on it.
- **A `[hidden]` element with an author `display` on it is not hidden**, and
  the cost of that only shows up when something else in the row grows. §38
  recorded the World link showing at ≤640px and left it; §39's third toggle
  turned it into a wrapped nav row and 60px of header at 360 and 390.
  `nav a:not([hidden])` in the tap-target block, and the header is §38's
  geometry to the pixel at every width.
- **A three-state preference resolved in CSS is the palette written twice.**
  `auto` for an appearance can be a `@media (prefers-color-scheme: light)`
  block or an attribute the head script writes before paint; the second is one
  selector and one copy of the tokens, and it is the shape `tj:motion` already
  has. The instrument that proves it applies pre-paint is aborting every `.js`
  request and checking the page is still light — and the honest thing to say
  beside it is that with JS off there is no attribute at all.
- **The palest token in a set is still the clear colour, and a sky painted in
  it is still a hole.** §22 found it with `--void` at the *zenith* at night and
  the far ground fading into the same value; §40 drafted the day horizon as
  `--void` for the obvious reason — it is the palest thing in the light set —
  and got the identical failure upside down, a frame whose bottom third had no
  horizon in it at all. `--rule` at 0.705 against `--void`'s 0.918 is pale and
  has a value of its own. The rule that comes out of both: **`--void` is what
  everything fades toward and therefore the one token nothing may be**.
- **A palette solved for text has a hole where a sky needs midtones.** The
  light set is `--void` 0.918, `--void-lift` 0.845, `--rule` 0.705, then
  `--dim` 0.140 and `--muted` 0.099 — three pale tones and three ink tones,
  which is exactly right for a page and unusable as a gradient. Band the *ramp*
  between two tokens instead of banding the tokens; every colour is still a
  token's own value or a mix of two, which is what `interior()` has done since
  §30. The dark set has the same hole and the night sky never met it, because
  it lives entirely at the dark end (`--void` to `--rule` is 0.0068 to 0.0225).
- **A uniform is the most coherent branch condition there is, and it is worth
  branching on.** `palette.day` written as one `mix` of both appearances cost
  the **night** frame +0.051 to +0.076ms at DPR 1.5 — paid on every pixel of
  sky, ground and water alike, since all three fog toward `gradient()` — and
  sharing every subexpression the two ends had in common did not move it.
  Branched inside an `Fn` it is +0.022 to +0.045. And a derivative *can* live
  inside such a branch: `fwidth` wants uniform control flow, a uniform-valued
  condition is uniform, and hoisting it out measured no different.
- **A token solved exactly to the bar has no room for a second ground.** §39
  chose `--leader-ink` as the lightest value clearing 4.5:1 against `--void`
  (4.54) because that is closest to the source. Over the world a glyph sits on
  `--void` *seen through a halo over a scene*, and any scene at all eats three
  hundredths: 4.42–4.50. Neither the scrim's rung (0.09 across its entire
  range) nor the halo (whose ceiling is the token's own 4.54) can reach it.
  The lever is the token, and the general form is §39's own trap said again —
  an accent has one contrast per ground, and a new mode is a new ground.
- **The direction of a contrast failure inverts with the appearance.** At
  night the binding pixel under a glyph is the **brightest** one — §38's lit
  cloud at 1.76:1. At day the ink is dark and it is the **darkest** one. A
  harness that takes a max is measuring nothing in the second case and will
  report a comfortable pass.
- **CDP's CPU throttle does not slow a worker.** Chunk generation came back
  *faster* under 4× throttling (1.27ms a chunk against 2.72) because the main
  thread stops competing for cores. It bounds main-thread work and nothing
  else; say so beside the number.

---

## Budgets

Check before claiming a step is done.

**Revised at §21 (SPEC §0.7).** The desktop number was set when the world
was one particle field behind a document and the desktop bundle was the
document *plus* the scene. The world is the site now, so the two are
budgeted apart and a reader never pays both.

- Document JS, any viewport: **under 120KB gzipped** (no Three below
  1024px). Measured at §40: **unchanged to the byte** on a §39 build in the
  same session — 150,425 raw over the same three files, 57,027 gzipped —
  because §40 ships no document JS at all. CSS **3,338 → 3,323** gzipped
  (**−15**; raw 12,352 → 12,334): the light set lost two
  `:not([data-mode="world"])` and gained seven `-ink`, and the step's CSS is
  net *smaller* than the feature it adds. `index.html` 11,120 → **11,119**.
  Earlier, measured at §39: **unchanged to the byte** on a §38 build in the
  same session — 150,425 raw over the same three files — because Astro inlines
  the toggle module into the page, so the third control's script lands in the
  HTML. CSS **3,189 → 3,338** gzipped (+149; raw 11,881 → 12,352) for the two
  light token sets and nine `--leader` → `--leader-ink` moves, and
  `index.html` **10,759 → 11,122** (+363) for the head script's theme branch,
  the third button and its module. (Those baselines are a post-§38 build:
  §38's own report predates the hero-knee and stage-leading addenda.) Earlier,
  measured at §38: **54.94 KiB (56,256)** over three files, 150,443
  raw, **unchanged to the byte** on a §37 build in the same session — the
  step's only document-mode bytes are CSS and HTML. (That file set is entry
  + LogBand + the motion chunk, with the dynamically imported world chunk
  excluded; earlier steps counted a slightly different set and reported
  57,024.) `index.html` 9,858 → **10,249** gzipped for the two sentences the
  audit added and the one condition on `Esc`. Earlier, at §37: **unchanged to the byte** on a §36 build in the
  same session at the same gzip level, and the entry script byte-identical at
  17,380 uncompressed — which is what a step that adds only world-mode code
  should do. Earlier, at §36: **55.69 KiB (57,024)** — **unchanged in content**,
  17,380 bytes uncompressed either way, and the only bytes that differ are
  the eight-character world-chunk hash the entry script names. Earlier, at
  §35: **55.69 KiB (57,023)** — **unchanged to the
  byte** on §34, which is what a step that adds only world-mode code should
  do. Earlier, at §34: **55.69 KiB (57,023)**, which is **−1 byte** on
  a §33 build in the same session at the same gzip level — nothing in this
  step lands in document mode. §33: 55.69 KiB (57,024). Earlier, at §32: **55.18 KiB (56,507 gzipped)**, up 38 bytes on a
  §31 build in the same session at the same gzip level — the address
  `world.ts` and `projects.ts` each capture at import, and Lenis's
  re-measure. §31: 55.0 KiB (56,338), unchanged in content since §21; §28
  measured 55.2 with a `__world` hook still in the entry script
- World chunk, desktop: **under 400KB gzipped**. Measured at §40: **226,910
  gzipped** (798,466 raw), up **179** on a §39 build in the same session at the
  same gzip level — the day gradient, the branch and the appearance uniform.
  **The worker is byte-identical** at 3,593: nothing in a worker calls
  `gradient()` or reads the palette, so `sky.ts` and `palette.ts` are
  tree-shaken out of it entirely, as `solid.ts` and `swell` already were.
  225.10 KiB of 400. Earlier, at §39:
  **byte-identical to §38's** — same 226,731 gzipped, same
  `scene.DWsQXswP.js` hash, worker unchanged at 3,593 — because nothing in
  that step ships world code. Earlier, at §38:
  **224.93 KiB** (230,324 = 226,731 + 3,593 worker) and **byte-identical to
  §37's** — same chunk hash, same worker — because nothing in that step
  lands in it. CSS 3,131 → **3,147** for the `--halo` token and its four
  uses, which is 27 raw bytes more than the two nine-shadow stacks it
  replaced. The old limit was 260KB for
  document + scene together; it bound at §20 (254.8 KiB, 5.2 spare) and that
  is why the WebGL 2 tier does not ship and why the terrain was a Phong
  material rather than a standard one. Both decisions still stand on their
  own merits. Measured at §37: **224.92 KiB** (230,322 = 226,729 + 3,593
  worker), up **2,503** on a §36 build in the same session at the same gzip
  level — ten landmarks, 212 boxes, nineteen lamps, the rotor kind and the
  per-signal fade distance. **The worker is +186**, which is `paved()` reading
  twelve sites instead of two and the ten-site table it reads them from: the
  second time since §28 that a step has put anything in one, and it is ten
  circles rather than ten landmarks. CSS unchanged at 3,131. Earlier, at §36: **222.48 KiB** (224,412 + 3,407 worker), up
  **1,388** on a §35 build in the same session at the same gzip level — two
  cities, 250 boxes, the `paved()` disc and the bound. **The worker is +115**
  and it is the first thing since §28 to land in one: `cover.ts` asks whether
  ground is paved and the worker bakes that into the tint, which is why
  `height.ts` and not `city.ts` carries the two centres. CSS unchanged at
  3,131. Earlier, at §35: **221.12 KiB** (223,139 + 3,292 worker), up
  **1,575** on §34 — the proxies, the hash, the resolution and the stick.
  **The worker is byte-identical**: nothing in a worker calls `resolve`, so
  `solid.ts` is tree-shaken out of it entirely, the way `swell` and
  `setShares` already were. CSS 3,058 → **3,113** for the `.stick` block.
  Earlier, at §34: **219.59 KiB** (221,564 + 3,292 worker), up
  **4,303** on a §33 build in the same session at the same gzip level — four
  scenes, the election, the swell and the arrival, and the largest
  single-step addition to the chunk so far (§28's conifers were 3,743).
  **The worker is +42**, which is `scatter.ts`'s bare disc; `swell` and
  `setShares` are tree-shaken out of it, since nothing in a worker calls
  them. §33: **215.34 KiB** (217,261 + 3,250 worker), up
  138 bytes on §32 — the mount's progress callback and its wait for ground —
  of which the worker is again 0. §32: **215.21 KiB** (217,123 + 3,250
  worker), of
  which the worker is 0 — the content layer bakes nothing and the worker is
  byte-identical. That is +32 for the creep's re-aim, over 215.18 KiB
  (217,091) for the beats moving into the dwell, over
  214.97 KiB (216,881) for the rail, the friction and the column's order, over 214.53 KiB (216,433) for the settle at the end of a gesture,
  over 214.38 KiB (216,279) for the damping, the third phase and the last
  climb-away, over 214.10 KiB (215,985) as §32 first shipped, itself up
  **1,541** on a §31 build in the same session at the same gzip level. CSS
  2,035 → **2,548** for the station layer and the `--scrim` token,
  2,658 → **2,924** at §33 for the curtain and the way out, and
  2,924 → **3,058** at §34 for the arrival block. §31 with every hook removed: **212.5 KiB** (214,426
  + 3,223 worker), of which the route and its driver are 2,205 bytes and none
  of them the worker. §30: **210.4 KiB** (212,221
  + 3,223 worker), of which motes and the cloud volume are 2,253 bytes and
  **none of them the worker** — neither layer has anything to bake, so it is
  byte-identical to §28's. §28 in the same session: 208.2 (its own report said
  209.0; conifers and stone were 3,743 bytes, 842 of them the worker, where
  the shade under a canopy is baked). §27: 205.3, §26: 202.7, §25: 202.1,
  §24: 201.4. A `__world` measurement hook lands in the *entry* script, not
  in the scene chunk, so an A/B of the world chunk is unaffected by it
- **8ms/frame at cruise.** **§40 re-fitted §38's law in both appearances**,
  five pixel scales at 1512×804 over six poses. Night `base` 0.79–0.95 and
  slope 0.129–0.175; day **0.74–0.90 and 0.150–0.199** — a lower base and a
  steeper slope, which is the right shape, since the stars are vertex work that
  has gone and the day gradient is per-pixel work that has arrived. At the
  shipped DPR 1.5 cap that is 1.24–1.36 at night and **1.29–1.37 at day**,
  against §38's worst pose of 1.545. **The sky dome is the biggest layer in
  both and the whole of the difference lives in it**: 0.239–0.407 at night
  against **0.263–0.463** at day, with terrain (0.08–0.19), trees and stone
  (0.14–0.21), cloud forms, water, cover, everything built, signals and motes
  all inside their own noise between the two. **The starfield is 0.004–0.019ms**
  — the instrument's floor — so §4.9's "the draw call pays for some of what
  follows" is true of about a fifth of it. Earlier: **§38 measured the frame as
  a law rather than as a number**: `ms = base + slope × megapixels`, base 0.51–0.88 (submission
  and vertex work) and slope **0.099 to 0.405 ms/Mpx**, fitted over five
  pixel scales at nine poses. At the shipped DPR 1.5 cap that is **1.13 to
  1.55ms**; at DPR 3, 2.06 to 5.01. **The sky dome is nearly all of the
  slope** — +0.25 to +0.43ms at 1.5 and **+1.72 to +2.77 at 3**, against
  whole frames of 1.31 to 1.56 and 3.96 to 4.85 — and every other layer is
  vertex work whose share *falls* as the pixels go up: terrain 0.16–0.38,
  trees and stone 0.18–0.52, cover 0.03–0.09, cloud forms 0.05–0.06, motes
  0.01–0.04, everything built 0.03, signals 0.02–0.04, water 0.01, stars
  0.01–0.03 at DPR 1.5. **Standing in §36's Houston, turning the city off
  costs 2.485ms at DPR 3** — an opaque surface over a sky pixel takes the
  dome's two noises off it, for the fourth time (§26, §36, §37). §0.2's
  block (steps 25–28 and 30) is finished and
  §34 is the first thing since to spend any of it. **§37's ten landmarks
  spend none either, and two of them give it back**: one forced pose into both
  builds, both orders, nine poses — draw calls **identical at every one**,
  triangles +2,546, and the DPR 1 delta is −0.026 to +0.022 with the two
  orders disagreeing in sign at four of the nine. At DPR 1.5, **inside the
  datacenter hall it is −0.327 / −0.353 and under the bridge deck −0.282 /
  −0.211** — §26's water and §36's Houston for the third time, because an
  opaque surface covering the sky takes the dome's two fractal noises off it.
  A roof over your head is the cheapest thing this world can draw. Earlier,
  **§36's two cities spend none**: one forced pose into both builds, both orders, nine poses — draw
  calls **identical at every one** (the cities are instances in a mesh that
  already existed), triangles +3,000, and the DPR 1 delta is −0.023 to +0.061
  with the two orders disagreeing in sign at four of the nine. At DPR 1.5,
  **flying down a Houston street is 1.05 against the control's 1.61** — the
  city is cheaper than the sky it hides. Earlier: Measured at §34 on built
  code, **one forced pose driven into both builds** so the two frames contain
  the same ground, trees and sky — the settle pitches moved this step, so a
  jump-to-scroll A/B is not like for like — both orders, DPR 1: Enargeia's
  settle **1.030 / 1.035 against §33's 0.923 / 0.919 (+0.107 / +0.116)**,
  Philoi's +0.014 / +0.077, Basis's +0.030 / +0.010, §31's Homonoia settle
  +0.041 / +0.066. **At DPR 1.5 it is −0.035 to +0.007** — nothing, because
  the frame is fill-bound there and the scenes are vertex work. Draw calls
  **+2**, triangles +2,286. Directly measured at a settle: the four hundred
  boxes 0.034ms, the fifty-one signals 0.023. Earlier figures below are
  against 0.83 (§30, DPR 1). The geomorph took
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
- LCP under 2.5s on throttled 4G. Measured at §38 on the shipped build,
  cold cache, **gzip served** (a harness that does not is measuring a
  different site), three runs each: document **80–92ms desktop**,
  416–436 on Fast 4G and **1,152–1,164 on Lighthouse's Slow 4G** (1.6 Mbps,
  150ms); world 52 / 312–332 / 548–568. Both reproduce §33's figures. The
  DevTools preset of the same name — same bandwidth, 562ms of latency —
  is 2,132–2,152 and 1,380–1,392, so always name which one. Earlier,
  measured at §33 in a real browser on a
  cold cache, three runs each: document mode **72–84ms desktop** and
  **1,112–1,116 on Lighthouse's Slow 4G**; world mode **44–84** and
  **536–552**, lower in both because §33 does not arm the intro's pre-paint
  hold there. Say the rest of it: that entry names the hero `<h1>`, which on
  a world load is behind an opaque curtain and never seen — report the
  interactive-world figure beside it or the number flatters the page.
  §22 measured 24ms desktop / 48ms mobile on a different harness
- **Interactive world under 3s** on a desktop connection. Measured at §38:
  **428–434ms** cold on desktop, 1,468–1,476 on Fast 4G, 4,559–4,588 on
  Lighthouse's Slow 4G — and that last figure does **not** reproduce §33's
  2,766–2,899. Ten kilobytes of chunk growth is about 60ms of the gap and
  the rest is not attributable: §33's throttle parameters are not written
  down, and the two presets called Slow 4G are a second apart on the same
  page. Under a slowed main thread the desktop figure is 534 / 861 / 1,142ms
  at 1× / 4× / 6×. Earlier, measured at §33 at
  `.world[data-ready]`, which is set after the first render with the loop
  already running: **391 / 399 / 445 ms** cold on desktop, 842–844 on Fast
  4G, 2,766–2,899 on Slow 4G. Of the desktop figure the ground is ~280ms
  (136 chunks at the opening pose) and the fetch about 50
- Under 100 draw calls. **§40 takes one away at day**: 49 / 63 / 51 / 55 / 56 /
  61 over six poses against night's 50 / 64 / 52 / 56 / 57 / 62, and 16,000
  triangles, which is the 8,000 star sprites and nothing else. Identical at
  night to §39's. Earlier, **§38 adds none and cannot**: the world chunk is
  byte-identical to §37's, so the 50–71 counted over nine poses are §37's own
  counts by construction. Earlier, **§37 adds none at all** — 47 to 71 over nine poses,
  identical between a §37 build and a §36 one, because everything built in the
  world is still two draw calls and §37's nineteen lights go into the layer
  the four scenes' messages already travel in. Earlier, **§36 adds none at
  all** — 47 to 62 over nine poses,
  identical between a §36 build and a §35 one, because everything built in
  the world is still two draw calls. Measured at §30 on built code against a §28 build,
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
  Measured at §38 over 30s of boosted free flight, 502 chunks in every run:
  **2.72ms a chunk** in the worker (worst 28.3 to 51.4 on a level-0 chunk)
  and **17.1 to 36.6ms of main-thread attach for all 502**, with zero holes
  at the end and **zero frames over 25ms** at the shipped cap. CDP's CPU
  throttle does not reach the workers — generation came back *faster* under
  it, because the main thread stops competing.
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
  flight that tries to break it, and the clamp costs 1.8µs a frame. **§36
  re-ran §24's flights against the 5,000 bound and it still is**; a collision
  query in a city is 0.05 to 0.17µs against a mast's 0.98, and 633 frames
  flown straight at Houston at boost ended **zero** of them inside anything,
  with a closest approach of exactly 4.00 — the camera's own radius. The route
  never reaches it: its least clearance is **13.00 units** by construction —
  at Enargeia's settle, and unchanged by §32's extra keyframe. **As flown it
  is 9.07**, at scroll 2,275 on the approach to Enargeia, swept every scroll
  unit at three arrival clocks and over four whole terms of the swell; a §33
  build measures **9.06** at the same place, so §34 changes it by a
  hundredth and §32's recorded "12.6 as flown" was taken on a coarser sample.
  §34 adds a second thing the route must clear and does: closest approach of
  the flown path to any box of any scene is **22.7 units** (Homonoia's
  climb-out, past a mast), then 32.0, 92.2 and 107.3, against §35's four-unit
  camera radius. **§35 re-measured it against the proxies and got the same
  four numbers** — 22.67 / 32.04 / 92.23 / 107.27, swept every scroll unit at
  five arrival clocks over thirty-three cluster states — which is the check
  that Homonoia's proxy is its geometry, and it is how §35's placement bug
  was caught. **§37 corrects the minimum: it is 12.31, not 22.67.** 22.67 is
  the baked distribution; the route climbs out *over* Homonoia, so the swell
  moves a mast **toward** the path rather than away from it, and with node 0
  holding the term the crown rises 60.02 units into a clearance of 73.9.
  Proxy and drawn box agree at 12.31 too. A collision query costs **0.055µs a
  frame on the route**, 0.043 through §37's turbine row, **0.257 down the
  datacenter aisle** — the densest query in the world, twenty-six boxes inside
  120 units — and 0.98 pressed into a mast, against the altitude clamp's 1.8.
  The table is **495 boxes over 594 cells, 29,740 bytes** (§36: 294 / 467 /
  18,560)
- **The route is flown two ways** (§31), because they measure different
  things. A reader (a 600px burst, then 700ms) never sees the speed cap bind
  at the end of a gesture — 283 units/s median, and the camera is where the
  scroll says the moment they stop. A 1,500px/s continuous scrub is what the
  cap is for, and it costs a **14-second fly-past** after the last wheel
  event. rAF median 16.4ms either way, 5 or 6 frames over 25ms in ~1,450,
  never more than 3 chunks pending
- **60fps on integrated graphics, with LOD doing the work. Measured at §38,
  and the first thing it measured was the machine**: this is an Apple M4
  with a ten-core built-in GPU, so every frame number in this project has
  been taken on integrated graphics all along and the record's "discrete
  GPU" was wrong. What is left is how much slower a GPU may be, and the
  proxy is pixels: at DPR 1.5 the worst pose on the route is 1.545ms, so a
  60Hz frame allows a GPU **10.8× slower** (5.2× against the 8ms cruise
  ceiling); at a cap of 2 it is 6.9× and at 3, 3.3×. **That ratio is what
  the DPR cap buys and it is why §38 left it at 1.5**, since frame time on
  this machine is inside the budget at every scale measured. Both halves
  slowed at once — main thread 4× and four times the pixels — flies the
  world at a **16.9ms median** with 1.8% of frames over 25ms
- Lighthouse accessibility **100**. **§40 measured axe clean in six world
  states** — day arrival, day mid-flight, a day name frame, a day writeup,
  day + contrast, and a night name frame — and the thing to say beside that is
  that **axe cannot see any of it**: the backdrop is a canvas, so the machine
  ID's measured 4.42:1 over the day sky is invisible to a checker and was found
  with §38's glyph-mask harness instead. Nothing else in the day world is under
  **4.93:1**. Earlier: **§39 adds a second appearance to every
  state, and axe measured clean in eight document ones**: light, light +
  contrast, a light deep link, light at 360, light with motion off, dark, dark
  + contrast, dark at 360. Nothing in the light document is under **4.54:1**,
  and the accent is the one token that could not come with it (2.23:1 on a
  pale page). Earlier: **axe measured clean at §38 in ten
  states**, both modes: document mode, a document deep link, the curtain
  held, the **adapter-refused fallback** (which nothing had ever run it
  against), the arrival, mid-flight, a station's name frame, a writeup open,
  free flight with the stick taken, and the document with the way back
  showing. Wait for the intro's band tween before running it, or eleven
  `color-contrast` violations on `aria-hidden` decoration are reported that
  are not there at rest. Earlier: axe-core measured at §32 in world mode
  too, and it needs one thing document mode does not: the station panel has
  to be a **named landmark of its own**, because the document's `<main>` is
  behind an opaque canvas and out of the accessibility tree. Without it,
  three `region` violations; with it, zero in both modes. **§33 adds two
  more nodes outside `<main>` and they need the same thing** — the curtain
  is a labelled `<section>` and the way out a labelled `<nav>`; without them
  two `region` violations during the load and one once it is flying.
  Measured clean at §33 in five states: document mode, the curtain held,
  the world at the arrival, the world at a station, and document mode with
  the way back shown. **§34's arrival needs the same thing again** — the name
  at 0% is a `<section>` labelled by the `<h1>` inside it, which in world mode
  is the page's only heading — and axe measured **clean in six states** at
  §34: document mode, the curtain held, the arrival, mid-flight, at a station,
  and reading a writeup
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
