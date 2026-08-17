/* §4.7 / §16, reversed at §19 — the floor, and it is the cluster.

   The ground rises where message traffic is dense and falls where it is
   quiet, with the highest ground under whichever node currently holds
   leadership. It is not decorated terrain and it is not noise: every
   amplitude here is a share of the traffic the field above it is carrying,
   computed from the same routing rule the compute pass uses. Fly over it
   and the shape you are flying over is the shape of a consensus algorithm
   running.

   **§19 made it a surface.** From §16 to §18 the floor was points sampled
   on the heightfield, on the argument that one material for the whole world
   is cheaper, that nothing should occlude, and that a resolved density is a
   measurement where a lit mesh is a landscape. All three were true and the
   conclusion was still wrong: measured at every altitude the camera reaches,
   the points never fused into a surface. They fuse when they are dense
   enough in *screen* space, and the density needed at 4 units up is not the
   density affordable at 26 — one camera-relative disc cannot be tuned for
   both. What makes ground read as ground is that it occludes and shades,
   and those were exactly what the old decision traded away.

   So there are three things in this file now. The heightfield — closed
   form, five peaks and ten ridges over constant geometry, and since §19 its
   own gradient with it, so the surface has an exact normal at no storage
   cost. The mesh that displaces to it, camera-relative and radial. And the
   points, demoted to the air above it: they turned out to be very good at
   atmosphere and bad at being a floor.

   The amplitudes are the whole point and they are never snapped. A term
   ends, the shares retarget, and the landscape redistributes over two
   seconds — one summit subsiding while another rises, with the light that
   lit the old one travelling to the new. A heightfield that jumps is a
   glitch; one that flows is a mountain range rearranging. */

import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Line,
  LineBasicNodeMaterial,
  Mesh,
  MeshPhongNodeMaterial,
  PointLight,
  PointsNodeMaterial,
  Sprite,
  Uint32BufferAttribute,
  Vector2,
  Vector3,
} from 'three/webgpu';
import {
  Fn,
  cameraPosition,
  cameraViewMatrix,
  clamp,
  cos,
  dot,
  exp,
  float,
  hash,
  instanceIndex,
  mix,
  output,
  positionGeometry,
  sin,
  smoothstep,
  uniform,
  uniformArray,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import type UniformNode from 'three/src/nodes/core/UniformNode.js';
import gsap from 'gsap';
import { fog } from './fog';

/* ── Shape ───────────────────────────────────────────────────────────────
   World units, and all of them are relative to the cluster. The summit at
   a full share of the traffic stops just under the cluster's own altitude
   — the mountain grows toward the node that earned it and never through
   it.

   **Re-tuned at §20, which is the first time anyone could see it.** These
   were set at §16 against a floor made of points and never verified,
   because for three steps nothing on screen could resolve a summit from a
   ridge. On a lit surface σ 3.4 and RIDGE 8 turned out to be a plateau
   rather than a cluster: at half the 5.3-unit spacing two peaks still
   contributed 0.55 of each other, and a route carried a ridge as tall as
   the nodes it joined, so the five stood in one continuous rim with no
   saddle anywhere on it — measured, the deepest point of every adjacent
   route was *above* the lower of its two summits.

   σ 2.0 puts that overlap at 0.17 and TAU 0.9 makes a route a line rather
   than a wall. RIDGE is the third number and the reason it had to move is
   that τ cannot fix it: a ridge lies exactly on the segment between two
   summits, so narrowing it thins the ridge without lowering the saddle.

   What does not separate, and it is the cluster's geometry rather than
   these constants: nodes 3 and 4 stand **2.84 units apart** in xz where
   the other four sides run 4.6 to 6.5, so they read as one twin summit at
   any σ wide enough to be a hill. */
const PEAK = 8.0;    // summit height at a full share of the traffic
const SIGMA = 2.0;   // peak radius, 1/e
const RIDGE = 5.0;   // ridge height per unit of route share
const TAU = 0.9;     // ridge half-width, 1/e

/* The disc of ground carried with the camera, and where the horizon sits.
   Measured rather than chosen at §16, when the disc was points and the
   count was fixed: at 92 the massif was an island in an empty plain, at 42
   the same points covered the visible ground four times as densely. The
   mesh inherits the number because the arc, the fog and the stars are all
   tuned against it — RADIUS is the one fixed distance in this world. */
export const RADIUS = 42;

/* The mesh, and the reason it is rings rather than a square grid: a square
   spends its vertices in the corners, which are the furthest and foggiest
   part of the frame, and starves the ground directly underfoot. Radii go
   as a quadratic in the ring index, so spacing is 0.04 units under the
   camera and 0.29 at the rim — the near ground gets the resolution and the
   far ground gets the fog. */
const RINGS = 256;
const SEGMENTS = 256;
const SKIRT = 24;   // the outer ring, dropped, so the surface has no edge

const PAIRS: Array<[number, number]> = [];

let nodesXZ: Array<[number, number]> = [];
let N = 0;

/* ── Shares ──────────────────────────────────────────────────────────────

   Who is receiving, and along which routes. This is the compute pass's
   routing rule (scene.ts) evaluated on the CPU over the whole population
   instead of per particle: every participating node emits an equal share,
   `leaderMix` of it addressed to the leader and the rest to its
   neighbour, and a node never addresses itself.

   The result is one number per node — its share of arriving traffic, which
   is the peak amplitude — and one per pair, which is the ridge. They sum
   to 1, so PEAK and RIDGE are the only things setting the scale of the
   landscape and a section cannot accidentally raise the whole world. */
export type Shares = { node: number[]; pair: number[]; leader: number };

function pairIndex(a: number, b: number) {
  const [i, j] = a < b ? [a, b] : [b, a];
  return PAIRS.findIndex((p) => p[0] === i && p[1] === j);
}

export function shares(active: number, leaderMix: number, leader: number): Shares {
  const node = new Array(N).fill(0);
  const pair = new Array(PAIRS.length).fill(0);
  const each = 1 / Math.max(active, 1);

  for (let i = 0; i < active; i++) {
    const neighbour = (i + 1) % N;
    // A message to yourself is not a message. The leader's own traffic
    // goes to a neighbour, which is what a leader actually sends.
    const addressed = leader === i ? neighbour : leader;
    for (const [to, w] of [
      [addressed, each * leaderMix],
      [neighbour, each * (1 - leaderMix)],
    ] as const) {
      if (w <= 0 || to === i) continue;
      node[to] += w;
      pair[pairIndex(i, to)] += w;
    }
  }
  return { node, pair, leader };
}

/* ── Uniforms ────────────────────────────────────────────────────────────
   `x` is the amplitude, `y` is the part of it that belongs to the elected
   node. Both are tweened, so during a term change the colour flows across
   the landscape at the same rate the landscape moves.

   Built in buildTerrain rather than here: the arrays are as long as the
   cluster, which is the caller's fact, and the heightfield below only
   reads them when it is first called, which is after that. */
let nodeAmp: ReturnType<typeof uniformArray<'vec2'>>;
let pairAmp: ReturnType<typeof uniformArray<'vec2'>>;
let nodeVecs: Vector2[] = [];
let pairVecs: Vector2[] = [];

const uAlpha = uniform(0);

/* Total ink again (§15): the alpha a mist point is drawn at is this over
   however many were allocated, so halving the count on a small viewport is
   a quality setting and not a change to how bright the page is.

   §19 re-solved it from scratch rather than scaling §18's 31,150, and the
   number is not comparable to it in any case: there are half as many points
   and they are no longer the ground. What they are is the air over it, and
   the bound they have to clear is the one §4.7 always set — the brightest
   glyph-sized local mean behind a piece of text. See uGain below for the
   other half of the solve, which is the surface's. */
const INK = 5570;

/* Mist, not scree. The points sit *above* the surface now, on a spread
   biased low so the mass of them is in the first unit or two and a few
   drift to head height at the lowest camera stop. The slope-proportional
   jitter that made cliffs read as scree went with the old job: the surface
   has cliffs of its own. */
const MIST = 4.0;

/* ── The heightfield ─────────────────────────────────────────────────────

   h(p) = Σ_nodes  A_i · exp(-|p - n_i|² / σ²)
        + Σ_routes B_ij · exp(-d_perp(p, n_i, n_j)² / τ²) · window(t)

   Returned as a vec4: the height, how much of it the elected node is
   responsible for, and ∂h/∂x, ∂h/∂z. Unrolled over constant geometry —
   five nodes and ten pairs are known before the shader is built, so the
   endpoints, directions and lengths are numbers in it and only the
   amplitudes are uniforms.

   **The gradient is analytic (§19), not sampled.** h is a sum of Gaussians
   and every term differentiates in closed form, so the normal is exact and
   costs one multiply-add per term rather than two extra evaluations of the
   whole field. It has to be exact for a cheaper reason than accuracy: the
   amplitudes tween continuously through an election, so anything baked
   would need rebuilding every frame. */
const height = Fn(([p]: [any]) => {
  const h = float(0).toVar();
  const hl = float(0).toVar();
  const g = vec2(0).toVar();

  for (let i = 0; i < N; i++) {
    const [nx, nz] = nodesXZ[i];
    const d = p.sub(vec2(nx, nz));
    const e = exp(dot(d, d).mul(-1 / (SIGMA * SIGMA))).mul(PEAK);
    const a = nodeAmp.element(i);
    h.addAssign(e.mul(a.x));
    hl.addAssign(e.mul(a.y));
    // d/dp exp(-|d|²/σ²) = -2d/σ² · exp(...)
    g.addAssign(d.mul(e.mul(a.x).mul(-2 / (SIGMA * SIGMA))));
  }

  for (let k = 0; k < PAIRS.length; k++) {
    const [i, j] = PAIRS[k];
    const [ax, az] = nodesXZ[i];
    const [bx, bz] = nodesXZ[j];
    const ex = bx - ax;
    const ez = bz - az;
    const len2 = ex * ex + ez * ez;
    const axis = vec2(ex, ez);

    const rel = p.sub(vec2(ax, az));
    const t = clamp(dot(rel, axis).div(len2), 0, 1);
    const perp = rel.sub(axis.mul(t));
    const e = exp(dot(perp, perp).mul(-1 / (TAU * TAU)));
    // The window is what keeps a ridge from double-counting the peaks it
    // runs between: it fades into them rather than piling on top.
    const s1 = smoothstep(0, 0.22, t);
    const s2 = smoothstep(1, 0.78, t);
    const a = pairAmp.element(k);
    const amp = a.x.mul(RIDGE);
    h.addAssign(e.mul(s1).mul(s2).mul(amp));
    hl.addAssign(e.mul(s1).mul(s2).mul(a.y).mul(RIDGE));

    /* Both halves of the product rule. Where t is clamped the window is 0
       and so is its derivative — smoothstep leaves the edges flat — so the
       expression below is already zero outside the segment and needs no
       mask. Inside it, dot(perp, axis) is zero by construction, which is
       what collapses d|perp|²/dp to 2·perp. */
    const u1 = clamp(t.div(0.22), 0, 1);
    const u2 = clamp(float(1).sub(t).div(0.22), 0, 1);
    const dw = u1.mul(u1.oneMinus()).mul(6 / 0.22).mul(s2)
      .sub(u2.mul(u2.oneMinus()).mul(6 / 0.22).mul(s1));
    g.addAssign(
      perp.mul(e.mul(s1).mul(s2).mul(amp).mul(-2 / (TAU * TAU)))
        .add(axis.mul(e.mul(dw).mul(amp).div(len2))),
    );
  }

  return vec4(h, hl, g.x, g.y);
});

/* ── Build ───────────────────────────────────────────────────────────── */

type Palette = {
  lead: UniformNode<'color', Color>;
  quiet: UniformNode<'color', Color>;
  contrast: UniformNode<'float', number>;
};

/* How bright the surface is allowed to be. It multiplies the shaded result,
   so the ratio between key and fill and the falloff are all preserved by
   it; only the exposure moves.

   **§20 made it a channel on the camera pose.** §19 solved one number for
   the whole page and measured what that cost: the tightest text anywhere —
   a 10px --dim metric label at Homonoia's beat 2 — set a ceiling every
   other stop then inherited, and Enargeia's beat 3 could have taken 596x of
   it. The values live in curve.ts with the altitude and the pitch, because
   the reader's position on the page already has exactly one authority and
   an exposure that varied on its own would be a second one. This uniform is
   written once per frame from that curve; `contrast` is the only thing this
   file still multiplies into it.

   It is worth knowing why Homonoia binds and that it is not a fixed
   property of the layout: the term ends every 3.4s and the next leader is
   drawn at random, so the massif walks under that column and out of it
   again and the worst frame is the worst over five placements. §20 found
   that no timed sample bounds that — two runs of the same length disagreed
   by 1.7x — so the number below comes from forcing the sequence, each
   leader held and each transition walked. */
const uGain = uniform(0.185);
let exposure = 0.185;
let contrastScale = 1;

/* Interpolation between keyframes is convex, so no scroll position can be
   brighter than the brightest keyframe and there is nothing here to clamp.
   What the path still has to be checked for is the other direction — a
   position between two keyframes that both clear their own ceiling can
   exceed the ceiling *there*, because the binding element changes with the
   beat. That is a measurement, not an assertion, and it is in the report. */
const applyGain = () => { uGain.value = exposure * contrastScale; };
const uVoid = uniform(new Color());
const uBase = uniform(new Color());

/* The leader light is the whole idea (§19): the summit that rises under
   the elected node is also what lights the terrain around it, so a term
   change re-lights the landscape as it re-shapes it.

   **Decay 1, not the physical 2.** At an inverse square the light stands
   2.6 units off its own summit and 40 off the rim, which is 64x across one
   frame: the massif blew out to white with a black plain around it and the
   world read as a stage set with a lamp on it — the failure §4.7 names.
   Nothing else in this scene is physical either. At 1/d the same light is
   8x across the frame, which is a landscape that is brighter near the
   elected node and legible everywhere, and the idea survives contact.
   Judged by looking, as that section asks. */
const LIGHT = 90;

/* Over the elected node rather than at it, and this is measured rather
   than chosen. A peak grows *toward* the node that earned it — under
   Homonoia the leader's summit reaches 6.4 of the cluster's own 9 — so a
   light standing at the node stands 2.6 units off the top of its own
   mountain and 40 off the rim. That put the busiest frame at pure white
   with 0.02x of headroom while Enargeia, whose landscape is flat, had 42x:
   a spread no single exposure can serve. Six units up is the same light in
   the same place from any distance that matters and takes the spread to
   something one number covers. */
const LIFT = 6;

/* The fill exists for one stated reason — so the faces the key does not
   reach are readable rather than black — and where it stands is decided by
   that reason rather than by symmetry. **From over the reader's shoulder,
   not from the far side of the ring.** The camera stands outside the
   cluster at +z and the key stands inside it, so every slope facing the
   reader faces away from the key: opposite the leader the fill lands on the
   same far side as the key and the whole landscape is a silhouette at every
   stop on the curve. Measured by looking, at the lowest one.

   Offset up and to the left of the camera rather than on its axis, because
   a light on the view axis is a flash photograph and flattens exactly the
   form this step exists to show. In --rule against the key's --leader, so
   the two sides of a ridge are the palette's two ends. Irradiance rather
   than candela — a directional light has no falloff. */
const FILL = 3;
const FILL_OFFSET = new Vector3(-9, 11, 5);

export function buildTerrain(nodes: Vector3[], palette: Palette) {
  N = nodes.length;
  nodesXZ = nodes.map((n) => [n.x, n.z] as [number, number]);
  PAIRS.length = 0;
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) PAIRS.push([i, j]);
  nodeVecs = Array.from({ length: N }, () => new Vector2());
  pairVecs = Array.from({ length: PAIRS.length }, () => new Vector2());
  nodeAmp = uniformArray<'vec2'>(nodeVecs, 'vec2');
  pairAmp = uniformArray<'vec2'>(pairVecs, 'vec2');

  const wide = innerWidth >= 1024;

  /* ── The surface ─────────────────────────────────────────────────────
     A radial grid in the ground plane, carried with the camera exactly as
     the point disc is: the geometry holds the (u, v) offset and the vertex
     shader adds the camera's ground position, so resolution is always
     where the eye is and the far field never gets vertices it cannot
     resolve. Rings run 0 → RADIUS on a quadratic, and one extra ring at
     the rim drops SKIRT units so the surface has no visible edge on a
     frame that catches it. The arc still draws the limit. */
  const rings = wide ? RINGS : RINGS >> 1;
  const segments = wide ? SEGMENTS : SEGMENTS >> 1;
  const ringCount = rings + 2;
  const grid = new Float32Array(ringCount * segments * 3);
  for (let k = 0; k < ringCount; k++) {
    const t = Math.min(k, rings) / rings;
    const r = RADIUS * (0.25 * t + 0.75 * t * t);
    const drop = k > rings ? -SKIRT : 0;
    for (let s = 0; s < segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      const o = (k * segments + s) * 3;
      grid[o] = Math.cos(a) * r;
      grid[o + 1] = drop;
      grid[o + 2] = Math.sin(a) * r;
    }
  }

  // Wound so (inner, inner+1, outer) faces up: (B-A)x(C-A) is +y for a ring
  // walked anticlockwise in xz. The centre ring is a single point, so its
  // band is a fan with one degenerate triangle per quad.
  const index = new Uint32Array((ringCount - 1) * segments * 6);
  let w = 0;
  for (let k = 0; k < ringCount - 1; k++) {
    for (let s = 0; s < segments; s++) {
      const s1 = (s + 1) % segments;
      const a = k * segments + s, b = k * segments + s1;
      const c = (k + 1) * segments + s, d = (k + 1) * segments + s1;
      index[w++] = a; index[w++] = b; index[w++] = c;
      index[w++] = b; index[w++] = d; index[w++] = c;
    }
  }

  const surface = new BufferGeometry();
  surface.setAttribute('position', new Float32BufferAttribute(grid, 3));
  surface.setIndex(new Uint32BufferAttribute(index, 1));

  const ground = cameraPosition.xz.add(positionGeometry.xz);
  const sample = height(ground).toVar();
  const world = vec3(ground.x, sample.x.add(positionGeometry.y), ground.y);

  const material = new MeshPhongNodeMaterial({ shininess: 1, specular: 0x000000 });
  material.positionNode = world;
  /* Analytic, and in view space because that is where normalNode is read.
     A heightfield's normal is (-∂h/∂x, 1, -∂h/∂z) and nothing about that
     needs a normal buffer, a second attribute, or computeVertexNormals —
     which is what makes an election affordable: the amplitudes tween every
     frame of it and the normals follow for free. */
  material.normalNode = cameraViewMatrix.transformDirection(
    vec3(sample.z.negate(), 1, sample.w.negate()).normalize(),
  );

  /* Base --void-lift, so unlit ground is barely above the page and the
     lighting does all the work; tinted toward --leader by the same share
     term the points used, so the surface says who owns it. Weighted by
     height as well as by share, so the plains stay quiet rather than
     taking an accent from a share of nearly nothing. */
  const owned = sample.y.div(sample.x.max(0.001)).mul(smoothstep(0.5, 4.5, sample.x)).clamp(0, 1);
  material.colorNode = mix(uBase, palette.lead, owned.mul(0.22));

  /* Fog, and it is a mix rather than a multiply — the one place in this
     world where that distinction exists. Everything else is additive over
     a canvas cleared to --void, so fading a contribution to zero *is*
     fading it to --void; an opaque surface has to be taken there. Applied
     after the lighting, which is what `output` is: the shaded result
     before this node replaces it. */
  material.outputNode = vec4(mix(uVoid, output.rgb.mul(uGain), fog(world)), 1);

  const terrain = new Mesh(surface, material);
  // The geometry is an offset from the camera, so its bounding sphere is a
  // disc at the origin and says nothing about where the mesh is drawn.
  terrain.frustumCulled = false;
  // Opaque and first: everything else in this world is additive and depth-
  // tests against it (§4.4). This is the layer that finally occludes.
  terrain.renderOrder = 1;

  /* ── Light ───────────────────────────────────────────────────────────
     There is no sun in this world and there should not be one. The light
     is the leader: a point light over the elected node, so the summit that
     rises under it is also what illuminates the ground around it, and a
     term change moves the light with the mountain.

     The fill is the same idea's cost of doing business — without a second
     source half the terrain is a silhouette. It is directional, in --rule
     against the key's --leader, and it follows the reader rather than the
     cluster (FILL_OFFSET). There is no ambient term at all: every surface
     here is lit by the cluster or not lit. */
  const key = new PointLight(0xffffff, LIGHT, 0, 1);
  key.position.copy(nodes[0]).y += LIFT;
  const fill = new DirectionalLight(0xffffff, FILL);

  /* ── The mist ────────────────────────────────────────────────────────
     What is left of the old floor, and it is better at this. Each point
     holds a fixed (u, v) in a disc around the camera's ground position;
     radial density falling as 1/r is a radius drawn uniformly, which is
     what keeps the near air from being a dense smear under the camera and
     still leaves something to resolve at distance. Lifted off the surface
     on a spread biased low, so it reads as ground fog rather than as
     ground. Half the count of §18: they are not trying to be a floor. */
  const count = 150_000 * (wide ? 1 : 0.5);
  uAlpha.value = INK / count;

  const gi = float(instanceIndex);
  const rnd = (n: number) => hash(gi.mul(4).add(n));

  const r = rnd(0).mul(RADIUS * 0.985).add(RADIUS * 0.015);
  const theta = rnd(1).mul(Math.PI * 2);
  const at = cameraPosition.xz.add(vec2(cos(theta), sin(theta)).mul(r));
  const under = height(at).toVar();

  const mistMaterial = new PointsNodeMaterial({
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    sizeAttenuation: false,
  });
  mistMaterial.sizeNode = vec2(2.0);
  const drift = vec3(at.x, under.x.add(rnd(2).pow(1.5).mul(MIST)), at.y);
  mistMaterial.positionNode = drift;

  const owns = under.y.div(under.x.max(0.001)).mul(smoothstep(0.5, 4.5, under.x)).clamp(0, 1);
  mistMaterial.colorNode = mix(palette.quiet, palette.lead, owns.mul(0.62)).mul(palette.contrast);

  /* §18's fog, against distance from the camera. The edge cut stays: fog
     has the air at 0.03 by the arc and the last 6% of the radius takes
     that to nothing, so the disc's rim can never resolve as a rim. */
  const far = r.div(RADIUS);
  mistMaterial.opacityNode = fog(drift).mul(smoothstep(1, 0.94, far)).mul(uAlpha);

  const mist = new Sprite(mistMaterial);
  mist.count = count;
  // Same reason as the field (§15): the bounding sphere an instanced
  // sprite computes is the unit quad at the origin, and the mist is
  // nowhere near the origin once the camera has moved.
  mist.frustumCulled = false;
  mist.renderOrder = 5;

  /* The horizon. An edge is what makes a floor a floor — one thin arc at
     the far clip, --rule, one pixel. It confirms a boundary the eye
     already believes: at grazing angles the ground densifies toward that
     line on its own.

     A closed strip rather than a LineLoop: the new renderer does not
     support that primitive at all, so the ring repeats its first point.
     Since §19 it also depth-tests, and sits a fraction outside the mesh
     rim rather than on it — a limit drawn *through* the ridge in front of
     it is exactly the flatness the surface exists to end, and drawn at the
     same radius as the rim it would z-fight the whole way round. */
  const ARC = 256;
  const ring = new Float32Array((ARC + 1) * 3);
  for (let i = 0; i <= ARC; i++) {
    const a = (i / ARC) * Math.PI * 2;
    ring[i * 3] = Math.cos(a) * RADIUS * 1.006;
    ring[i * 3 + 2] = Math.sin(a) * RADIUS * 1.006;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(ring, 3));
  const horizonMaterial = new LineBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
  horizonMaterial.colorNode = palette.quiet.mul(palette.contrast);
  const horizon = new Line(geometry, horizonMaterial);
  horizon.frustumCulled = false;
  horizon.renderOrder = 6;

  /* The mist is a disc around the camera and the arc is its edge, so both
     follow the camera's ground position. The surface does the same in its
     own vertex shader; nothing else in the world moves with the viewer. */
  const follow = (camera: { position: Vector3 }) => {
    horizon.position.set(camera.position.x, 0, camera.position.z);
    // A directional light's direction is its position against its target,
    // and the target is the origin — so this is the offset above, taken
    // from wherever the reader is standing.
    fill.position.copy(camera.position).add(FILL_OFFSET);
  };

  /* Tween the amplitudes, never snap them. Two seconds is the term change
     in §4.7; a section change borrows the field's own 1.6s so the ground
     and the traffic arrive together; and a first application is instant,
     because the state has to be a function of position and not of how long
     the page has been open.

     The light rides the same tween. That is the set piece: the mountain
     subsides, another rises, and what was lighting the first one travels
     to the second over the same two seconds. */
  function retarget(s: Shares, duration: number) {
    const write = (v: Vector2, amp: number, mine: boolean) => {
      const x = amp;
      const y = mine ? amp : 0;
      if (duration <= 0) {
        gsap.killTweensOf(v);
        v.set(x, y);
      } else {
        gsap.to(v, { x, y, duration, ease: 'power2.inOut', overwrite: true });
      }
    };
    for (let i = 0; i < N; i++) write(nodeVecs[i], s.node[i], i === s.leader);
    for (let k = 0; k < PAIRS.length; k++) {
      write(pairVecs[k], s.pair[k], PAIRS[k].includes(s.leader));
    }

    const n = nodes[s.leader];
    // Intensity follows the leader's own share, so a section with no
    // strong leader is a dimmer world. Floored, because a cluster with the
    // traffic spread evenly still has to be lit.
    const gain = LIGHT * (0.45 + 0.55 * Math.min(s.node[s.leader] / 0.5, 1));
    if (duration <= 0) {
      gsap.killTweensOf([key.position, key]);
      key.position.set(n.x, n.y + LIFT, n.z);
      key.intensity = gain;
    } else {
      const ease = 'power2.inOut';
      gsap.to(key.position, { x: n.x, y: n.y + LIFT, z: n.z, duration, ease, overwrite: true });
      gsap.to(key, { intensity: gain, duration, ease, overwrite: true });
    }
  }

  /* The palette moves under high contrast and §15 read it once at mount,
     which meant a page *loaded* in high contrast and a page *toggled* into
     it were two different scenes. Colours that are uniforms are re-read by
     scene.ts; a light's colour is not a uniform, so it is re-read here. */
  function paint(lead: Color, quiet: Color, page: Color, base: Color, contrast: number) {
    uVoid.value.copy(page);
    uBase.value.copy(base);
    key.color.copy(lead);
    fill.color.copy(quiet);
    // High contrast has to move the busiest frame down and only down, and
    // the tokens themselves get *brighter* when it is on (§16) — --rule
    // 2.6x, --leader with it. The exposure carries both.
    contrastScale = contrast;
    applyGain();
  }

  /* The curve's fourth channel, arriving once a frame (§20). Held here
     rather than written straight to the uniform, so the contrast toggle can
     re-apply it without knowing where on the page the reader is. */
  function expose(value: number) {
    exposure = value;
    applyGain();
  }

  return {
    terrain, mist, horizon, lights: [key, fill] as const,
    follow, retarget, paint, expose,
    count, radius: RADIUS,
  };
}
