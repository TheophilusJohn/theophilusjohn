/* §4.7 / §16 — the floor, and it is the cluster.

   The ground rises where message traffic is dense and falls where it is
   quiet, with the highest ground under whichever node currently holds
   leadership. It is not decorated terrain and it is not noise: every
   amplitude here is a share of the traffic the field above it is carrying,
   computed from the same routing rule the compute pass uses. Fly over it
   and the shape you are flying over is the shape of a consensus algorithm
   running.

   Two things live in this file. The heightfield — closed form, five peaks
   and ten ridges over constant geometry, evaluated per vertex, no storage
   and no warm-up, so it is identical on the first frame and the thousandth.
   And the floor that samples it: a second instanced sprite on a
   camera-relative disc, which is the only part of the world that is not
   world-fixed, because ground detail has to be where the eye is.

   The amplitudes are the whole point and they are never snapped. A term
   ends, the shares retarget, and the landscape redistributes over two
   seconds — one summit subsiding while another rises. A heightfield that
   jumps is a glitch; one that flows is a mountain range rearranging. */

import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Line,
  LineBasicNodeMaterial,
  PointsNodeMaterial,
  Sprite,
  Vector2,
  Vector3,
} from 'three/webgpu';
import {
  Fn,
  cameraPosition,
  clamp,
  cos,
  dot,
  exp,
  float,
  hash,
  instanceIndex,
  mix,
  sin,
  smoothstep,
  uniform,
  uniformArray,
  vec2,
  vec3,
} from 'three/tsl';
import type UniformNode from 'three/src/nodes/core/UniformNode.js';
import gsap from 'gsap';

/* ── Shape ───────────────────────────────────────────────────────────────
   World units, and all of them are relative to the cluster: the pentagon
   is about 5 units in radius and 5.3 to a side, so a peak two thirds of
   that across merges with its neighbours into a massif rather than
   standing as five separate cones. The summit at a full share of the
   traffic stops just under the cluster's own altitude — the mountain grows
   toward the node that earned it and never through it. */
const PEAK = 8.0;    // summit height at a full share of the traffic
const SIGMA = 3.4;   // peak radius, 1/e
const RIDGE = 8.0;   // ridge height per unit of route share
const TAU = 1.3;     // ridge half-width, 1/e

/* The disc of ground carried with the camera, and where the horizon sits.
   Measured rather than chosen: the count is fixed, so the radius is what
   decides how many points land in the frame. At 92 the massif was an
   island in an empty plain and the ground never read as a surface; at 42
   the same points cover the visible ground four times as densely and the
   arc is a limit you can see. */
const RADIUS = 42;

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

/* Total ink again (§15): the alpha a ground point is drawn at is this over
   however many were allocated, so halving the count on a small viewport is
   a quality setting and not a change to how bright the page is. The number
   itself is measured against the bound, not chosen. */
const INK = 5800;

/* ── The heightfield ─────────────────────────────────────────────────────

   h(p) = Σ_nodes  A_i · exp(-|p - n_i|² / σ²)
        + Σ_routes B_ij · exp(-d_perp(p, n_i, n_j)² / τ²) · window(t)

   Returned as a pair: the height, and how much of it the elected node is
   responsible for. Unrolled over constant geometry — five nodes and ten
   pairs are known before the shader is built, so the endpoints, directions
   and lengths are numbers in it and only the amplitudes are uniforms. */
const height = Fn(([p]: [any]) => {
  const h = float(0).toVar();
  const hl = float(0).toVar();

  for (let i = 0; i < N; i++) {
    const [nx, nz] = nodesXZ[i];
    const d = p.sub(vec2(nx, nz));
    const g = exp(dot(d, d).mul(-1 / (SIGMA * SIGMA))).mul(PEAK);
    const a = nodeAmp.element(i);
    h.addAssign(g.mul(a.x));
    hl.addAssign(g.mul(a.y));
  }

  for (let k = 0; k < PAIRS.length; k++) {
    const [i, j] = PAIRS[k];
    const [ax, az] = nodesXZ[i];
    const [bx, bz] = nodesXZ[j];
    const ex = bx - ax;
    const ez = bz - az;
    const len2 = ex * ex + ez * ez;

    const rel = p.sub(vec2(ax, az));
    const t = clamp(dot(rel, vec2(ex, ez)).div(len2), 0, 1);
    const perp = rel.sub(vec2(ex, ez).mul(t));
    // The window is what keeps a ridge from double-counting the peaks it
    // runs between: it fades into them rather than piling on top.
    const g = exp(dot(perp, perp).mul(-1 / (TAU * TAU)))
      .mul(smoothstep(0, 0.22, t))
      .mul(smoothstep(1, 0.78, t))
      .mul(RIDGE);
    const a = pairAmp.element(k);
    h.addAssign(g.mul(a.x));
    hl.addAssign(g.mul(a.y));
  }

  return vec2(h, hl);
});

/* ── Build ───────────────────────────────────────────────────────────── */

type Palette = {
  lead: UniformNode<'color', Color>;
  quiet: UniformNode<'color', Color>;
  contrast: UniformNode<'float', number>;
};

export function buildTerrain(nodes: Vector3[], palette: Palette) {
  N = nodes.length;
  nodesXZ = nodes.map((n) => [n.x, n.z] as [number, number]);
  PAIRS.length = 0;
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) PAIRS.push([i, j]);
  nodeVecs = Array.from({ length: N }, () => new Vector2());
  pairVecs = Array.from({ length: PAIRS.length }, () => new Vector2());
  nodeAmp = uniformArray<'vec2'>(nodeVecs, 'vec2');
  pairAmp = uniformArray<'vec2'>(pairVecs, 'vec2');

  const count = 300_000 * (innerWidth >= 1024 ? 1 : 0.5);
  uAlpha.value = INK / count;

  /* Each point holds a fixed (u, v) in a disc around the camera's ground
     position; its world position is that offset plus the camera. The grid
     moves with the viewer, so detail is always where the eye is and the
     far field never needs more points than it can resolve.

     Radial density falling as 1/r is a radius drawn uniformly: a disc
     whose surface density goes as 1/r has N(<r) ∝ r. That is what keeps
     the near ground from being a dense smear under the camera and still
     leaves enough points at distance to resolve a horizon. */
  const gi = float(instanceIndex);
  const rnd = (n: number) => hash(gi.mul(4).add(n));

  const r = rnd(0).mul(RADIUS * 0.985).add(RADIUS * 0.015);
  const theta = rnd(1).mul(Math.PI * 2);
  const ground = cameraPosition.xz.add(vec2(cos(theta), sin(theta)).mul(r));

  const sample = height(ground);
  const h = sample.x;

  /* Per-point y jitter proportional to local slope, so cliffs read as
     scree and flats read as flats. Two extra taps rather than an analytic
     gradient: the ridge terms make the closed-form derivative twice the
     code for a number that only has to be roughly right. */
  const e = 0.9;
  const slope = height(ground.add(vec2(e, 0))).x.sub(h).abs()
    .add(height(ground.add(vec2(0, e))).x.sub(h).abs())
    .div(e);

  const material = new PointsNodeMaterial({
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    sizeAttenuation: false,
  });
  material.sizeNode = vec2(2.0);
  material.positionNode = vec3(
    ground.x,
    h.add(rnd(2).sub(0.5).mul(slope.mul(0.55))),
    ground.y,
  );

  /* Ground that belongs to the elected node is --leader, which is the same
     rule §2 fixes and the same one the traffic above it follows: the accent
     marks who holds the term. Weighted by height as well as by share, so
     the plains stay --rule rather than taking an accent from a share of
     nearly nothing. */
  const share = sample.y.div(h.max(0.001)).mul(smoothstep(0.5, 4.5, h)).clamp(0, 1);
  material.colorNode = mix(palette.quiet, palette.lead, share.mul(0.62)).mul(palette.contrast);

  /* Distance falloff. §17 replaces this with the real exponential-squared
     fog to --void — this is the half of it the brightness bound cannot
     wait for, because a ground with no far limit piles its last few units
     of radius into a bright band across the frame, and the bound is
     measured on the busiest frame the scene can produce. Gone by the arc,
     which is where §4.7 says the far ground fades. */
  const far = r.div(RADIUS);
  material.opacityNode = exp(far.mul(1.35).pow(2).negate())
    .mul(smoothstep(1, 0.9, far))
    .mul(uAlpha);

  const floor = new Sprite(material);
  floor.count = count;
  // Same reason as the field (§15): the bounding sphere an instanced
  // sprite computes is the unit quad at the origin, and the ground is
  // nowhere near the origin once the camera has moved.
  floor.frustumCulled = false;
  floor.renderOrder = 5;

  /* The horizon. Particle ground has no edge, and an edge is what makes a
     floor a floor — one thin arc at the far clip, --rule, one pixel, and
     the only non-particle geometry in the world. It confirms a boundary
     the eye already believes: at grazing angles the ground densifies
     toward that line on its own.

     A closed strip rather than a LineLoop: the new renderer does not
     support that primitive at all, so the ring repeats its first point. */
  const SEGMENTS = 256;
  const ring = new Float32Array((SEGMENTS + 1) * 3);
  for (let i = 0; i <= SEGMENTS; i++) {
    const a = (i / SEGMENTS) * Math.PI * 2;
    ring[i * 3] = Math.cos(a) * RADIUS;
    ring[i * 3 + 2] = Math.sin(a) * RADIUS;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(ring, 3));
  const horizonMaterial = new LineBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  horizonMaterial.colorNode = palette.quiet.mul(palette.contrast);
  const horizon = new Line(geometry, horizonMaterial);
  horizon.frustumCulled = false;
  horizon.renderOrder = 6;

  /* The floor is a disc around the camera and the arc is its edge, so both
     follow the camera's ground position. Nothing else in the world does. */
  const follow = (camera: { position: Vector3 }) =>
    horizon.position.set(camera.position.x, 0, camera.position.z);

  /* Tween the amplitudes, never snap them. Two seconds is the term change
     in §4.7; a section change borrows the field's own 1.6s so the ground
     and the traffic arrive together; and a first application is instant,
     because the state has to be a function of position and not of how long
     the page has been open. */
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
  }

  return { floor, horizon, follow, retarget, count, radius: RADIUS };
}
