# §4.7 / §4.9 — revised for the terrain world

Replaces the "persistent render layer" and "world mode" sections. Everything
built in §15 stands: one `Renderer` on a `WebGPUBackend`, one canvas, mounted
once, state a function of scroll position. What follows is what that scene
contains.

The complaint this answers, recorded so it does not get re-litigated: five
emitters trading particles at one depth is a legible diagram and reads as one.
It has no near and no far, so there is nothing to be inside of.

---

## 1. What the world is

A dark volume with a floor and a sky.

The floor is a heightfield **computed from the cluster** — ground rises where
message traffic is dense and falls where it is quiet, with the highest ground
under whichever node currently holds leadership. It is not decorated terrain
and it is not noise. Fly over it and the shape you are flying over is the
shape of a consensus algorithm running.

The sky is a starfield at effective infinity.

Between them is the field from §15, unchanged: messages in flight between five
nodes.

**Why this rather than a landscape.** A landscape would be prettier faster and
would say nothing. The reference site's terrain works because its author is an
illustrator and the terrain is the artwork. Here the terrain has to be the
work, or it is decoration on a portfolio about not decorating things.

---

## 2. The heightfield

### Source

Two terms, summed.

**Structure — analytic, evaluated per vertex.** Every node contributes a
radially symmetric peak whose amplitude is that node's current traffic share.
Every active route contributes a ridge along the line between its endpoints,
falling off with perpendicular distance. This is a closed-form function of the
node positions and the section uniforms already in `scene.ts`, so it costs no
storage, has no warm-up, and is identical on the first frame and the
thousandth.

```
h(p) = Σ_nodes  A_i · exp(-|p - n_i|² / σ²)
     + Σ_routes B_ij · exp(-d_perp(p, n_i, n_j)² / τ²) · window(t_along)
```

`A_i` is the node's share of addressed traffic — under Homonoia the leader's
term dominates and the landscape is one mountain; under Enargeia the five are
even and it is a ring of hills. `B_ij` is nonzero only for routes carrying
traffic, so raising `leaderMix` visibly grows ridges toward one summit.

**Texture — accumulated, optional, and the second thing to build.** A 512×512
`r32uint` storage texture, into which the particle compute pass `atomicAdd`s
one per particle per frame, decayed 2% per frame. Sampled and added to `h` at a
low amplitude. This is what makes the ground feel *alive* rather than
*computed* — it lags the simulation, so a leader change leaves the old
mountain visibly subsiding for a few seconds after the traffic has left it.

Build the analytic term first and ship it. Add accumulation only once the
frame budget is measured with everything else in place. If it does not fit,
the world is complete without it.

### An election is the set piece

Under Homonoia the term ends every 3.4s. `A_i` retargets, the ridges swing,
and **the landscape itself redistributes** — one summit subsiding while
another rises, over roughly two seconds of eased transition. That is the
single most striking thing this site can do, and it is the reason the terrain
is worth building at all.

Tween the amplitudes, never snap them. A heightfield that jumps is a glitch;
one that flows is a mountain range rearranging itself.

---

## 3. The floor is particles, not a mesh

Decided. A second instanced sprite buffer, positions sampled on the
heightfield rather than a lit surface.

### Why

- One material for the whole world. No second lighting model, no normals, no
  shadow story, no mesh LOD. The ground is made of the same stuff as the
  traffic above it, which is true and also cheap.
- Nothing occludes. A solid floor would hide half the field the moment the
  camera descends; particles keep the volume readable from inside it.
- It is the version that could only come from this project. A lit mesh is a
  landscape; a resolved density is a measurement.

### How

Points on a **camera-relative grid**, not a world-fixed one. Each particle
holds a fixed `(u, v)` in a disc around the camera's ground position; its
world position is that offset plus the camera, wrapped, with `y = h(x, z)`.
The grid moves with the viewer, so ground detail is always where the eye is
and the far field never needs more points than it can resolve.

Radial density falls as `1/r`, which cancels the perspective gathering and
gives even screen-space coverage rather than a dense smear at the horizon.

Per-point `y` jitter proportional to local slope, so cliffs read as scree and
flats read as flats.

Count: **200,000** at the compute tier, halved below 1024px. Measure before
trusting that number.

### The horizon

Particle ground has no edge, and an edge is what makes a floor a floor.

Draw one: a thin great-circle arc at the far clip in `--rule`, one pixel,
never brighter. That is the only non-particle geometry in the world and it is
what turns a field of dots into a place with a limit.

At grazing angles the ground densifies toward that line on its own, so the arc
is confirming a boundary the eye already believes rather than inventing one.

---

## 4. The starfield

Third instanced buffer, **8,000 points** on a sphere of effectively infinite
radius — positioned in view space so they never parallax, which is what makes
them read as far away rather than as nearby dots.

Brightness drawn per-star from a power law, so a few are bright and most are
barely there. A slow per-star phase on opacity, periods spread between 4 and
14 seconds, so the sky is never uniformly still and never visibly twinkling in
unison.

`--paper` at low alpha for most; a scattering in `--leader` at maybe one in
forty, so the sky belongs to the palette without being violet.

Stars are the only thing in the world that does not mean anything. That is
deliberate: everything else is a measurement, and a world where every single
element is load-bearing reads as a diagram again.

---

## 5. The camera

**Scroll is altitude.** One curve, and both modes read it.

| scroll | altitude | pitch | what you see |
|---|---|---|---|
| hero | high above | looking down ~60° | the whole cluster as a map, ground far below |
| project 1 | descending | ~35° | peaks resolving, horizon entering frame |
| project 2–3 | low | ~15° | among the ridges, traffic passing at eye level |
| project 4 | lowest | ~5° | inside it, horizon across the frame, stars above |
| about | rising | ~30° | pulling back out |

This is the whole answer to "both — above it and down in it". The descent is
the read, and it means document mode is not a lesser version of world mode:
scrolling the page *is* the flight, and world mode adds control rather than
adding the world.

Position along the spline is `scrollY / maxScroll`, driven by the same Lenis
instance as everything else — one scroll authority (§8), and the camera is a
pure function of scroll position exactly as §4.7 requires of the scene state.

Damped: the camera lags the scroll by a short time constant, so a fast scroll
arrives with momentum instead of teleporting.

A slight pointer parallax on top — a couple of degrees of yaw and pitch,
eased. This costs nothing and does more for the sense of depth than any other
single thing in this document. Disabled under reduced motion.

---

## 6. Fog

Not optional, and not atmosphere for its own sake.

Exponential-squared fog to `--void`, tuned so the far ground fades roughly
where the horizon arc sits. Fog is what makes distance *legible* in a particle
world — without it every point is the same brightness at every depth and the
volume flattens back into the diagram this whole revision exists to escape.

It also solves the density problem at the horizon for free, and it hides the
far clip so the ground has no visible end.

Stars are exempt. They are behind the fog by construction.

---

## 7. Brightness, restated

§15's rule stands and is the reason the field currently reads as violet mist:
the brightest 12×12 average anywhere on the page must not exceed
`--void-lift`, because text sits on it.

**That bound applies where text is.** It is a document-mode constraint, not a
property of the scene.

- **Document mode** — the bound holds unchanged. The terrain is far below the
  camera through the whole scroll, fogged, and dim. It is a floor glimpsed
  under the content, not a landscape competing with it.
- **World mode** — text is confined to the writeup panel, which has its own
  backing. Outside that panel the scene may go to **4× the document bound**,
  measured the same way. Where the panel is open, the region behind it returns
  to the document bound.

This is the honest resolution of "make it brilliant" against "text must be
readable". The constraint was never about the scene; it was about the words.
Where there are no words, spend the light.

---

## 8. Performance

Everything here is instanced points. Three draw calls: ground, field, stars.

- Ground 200k, field 120k, stars 8k. All halved below 1024px; world mode is
  desktop-only anyway.
- The heightfield is evaluated in the vertex shader, not on the CPU. Nothing
  reads back.
- Frustum culling is off on all three (bounding spheres are unit quads at the
  origin, §15). The camera-relative ground grid is the culling — points behind
  the viewer wrap to in front of it.
- **Target: 60fps on integrated graphics.** If it does not hold, ground count
  is the first thing to cut and the accumulation texture is the second. The
  election transition is the last, because it is the point.

Measure `renderer.info` with `autoReset = false` (§15 trap), and report
milliseconds per frame rather than fps — fps is vsync-capped and hides
regressions until it falls off a cliff.

---

## 9. What this does not include

Stated so nobody builds them by inference:

- No mesh terrain, no normals, no lit surface, no shadows.
- No trees, rocks, water, clouds, or any other landscape furniture.
- No texture maps of any kind. Everything is procedural or accumulated.
- No collision. The ground is a height function, and free flight (§20) clamps
  the camera above it rather than colliding with it.
- No time of day, no sun, no directional lighting. There is no light source in
  this world; every point emits.

---

## 10. Build order changes

Step 16 was the laptop. It now comes after the ground, because where the
laptop sits depends on there being ground under it.

| step | was | now |
|---|---|---|
| 16 | the laptop | **terrain: analytic heightfield, particle ground, horizon arc** |
| 17 | depth and camera spline | **starfield, fog, camera altitude curve** |
| 18 | landmarks | **the laptop**, standing on ground, as landmark one |
| 19 | mode switch and URL sync | landmarks 2–4 |
| 20 | free flight | mode switch, scroll ↔ camera sync |
| 21 | performance pass | free flight, bounds, altitude clamp |
| 22 | — | accumulation texture, if the budget allows |
| 23 | — | performance pass |

Step 16 alone changes the site more than steps 8–14 combined. Do it, ship it,
and look at it before committing to the rest.

---

## 11. The one thing to get right

Not the terrain. The **election**.

Everything else here is scaffolding for a single moment: a term ends, and the
landscape a visitor is flying over rearranges itself because a distributed
system elected a different leader. Nobody else's portfolio does that, and it
is the only thing on this site that could not be built by someone who had not
implemented Raft.

If the frame budget forces a choice, that survives and everything else goes.
