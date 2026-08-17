/* §4.7 — the persistent render layer.

   One renderer, one context, one scene, mounted once and never torn down.
   The site is a single document (§4.6), so persistence costs nothing: there
   is no navigation to survive. What has to hold instead is that the scene's
   state is a function of *where you are on the page*, so that arriving at
   /projects/philoi by deep link looks like having scrolled there.

   The field is a consensus simulation, not decoration. Five attractors are
   a five-node cluster; particles are messages, emitted at the node that
   sent them and consumed at the node they are addressed to. What a section
   changes is how the cluster is behaving — how much of the traffic routes
   through one elected node, how many nodes are participating, how fast,
   how noisy. Homonoia is where that is literal and the term ends under
   you; the other sections borrow the same machine.

   The simulation is a compute pass over storage buffers, so this module
   only ever runs on WebGPU. The other tier is the absence of it: field.ts
   asks for an adapter and never imports this file without one. The note
   there explains why the WebGL 2 tier §15 asked for was measured and then
   left out. */

import {
  AdditiveBlending,
  BasicNodeLibrary,
  Color,
  PointsNodeMaterial,
  Renderer,
  Scene,
  Sprite,
  Vector3,
  WebGPUBackend,
} from 'three/webgpu';
import {
  Fn,
  If,
  cross,
  float,
  hash,
  instanceIndex,
  instancedArray,
  mx_noise_vec3,
  select,
  smoothstep,
  uniform,
  uniformArray,
  vec2,
  vec3,
} from 'three/tsl';
import gsap from 'gsap';
import { motionOff, onMotionChange } from '../motion';
import { onLayout } from '../projects';
import { onSection } from '../url-sync';
import { buildCamera } from './camera';
import { fog } from './fog';
import { buildStars } from './stars';
import { buildTerrain, shares } from './terrain';

/* ── The cluster ─────────────────────────────────────────────────────────
   Five nodes, which is the cluster Homonoia simulates and the number on
   its own metric list. A pentagon rather than a cloud: every particle is
   travelling between two of these, and if the endpoints are not legible
   the traffic reads as smoke.

   §16 laid the pentagon down. It was upright and facing the camera when
   the world was a volume with nothing in it; it is a cluster standing over
   a landscape now, so it is a ring on the ground plane held at altitude,
   with the terrain rising underneath it. The shape and the spacing are the
   ones the simulation was tuned against — the same 5.3 units to a side —
   turned through 90°, with a little height left in the third axis so the
   five are not a flat disc. */
const ALT = 9.0;
const NODES = [
  new Vector3(0.0, ALT - 0.42, -3.5),
  new Vector3(4.7, ALT + 0.78, -1.0),
  new Vector3(2.9, ALT - 1.02, 3.2),
  new Vector3(-2.9, ALT + 0.54, 3.2),
  new Vector3(-4.7, ALT - 0.78, 1.0),
];
const N = NODES.length;

/* ── Section states ──────────────────────────────────────────────────────

   Keyed by the `data-path` values §4.6 already puts in the address bar, so
   "which part of the page is this" has one definition and both the URL and
   the field read it.

   leaderMix is the fraction of traffic addressed to the elected node; the
   rest goes to a neighbour. nodes is how many of the five are emitting.
   elect is the term length in seconds — 0 means the leader never changes. */
type Preset = {
  speed: number; pull: number; swirl: number; jitter: number;
  leaderMix: number; nodes: number; spread: number; glow: number;
  leader: number; elect: number;
};

const PRESETS: Record<string, Preset> = {
  // The hero, and the only frame everybody sees. A cluster at rest still
  // has a leader — it is what "at rest" means — so the shares are
  // 0.47/0.20/0.11/0.11/0.11: one summit with the range spread under it,
  // which is both the more legible landscape and the more truthful one.
  // The term is slow rather than absent (§17): at 11s a reader who stays
  // sees the world rearrange once, and it is far enough from Homonoia's
  // 3.4s that it never competes with the section that owns the election.
  '/': { speed: 0.70, pull: 1.10, swirl: 0.50, jitter: 0.22, leaderMix: 0.45, nodes: 5, spread: 0.40, glow: 0.41, leader: 0, elect: 11 },

  // Enargeia — token activations. Almost nothing routes to a leader: the
  // traffic passes around the ring and the noise term carries it, which is
  // what a spreading activation looks like rather than a vote.
  '/projects/enargeia': { speed: 1.15, pull: 1.40, swirl: 0.25, jitter: 0.60, leaderMix: 0.12, nodes: 5, spread: 0.55, glow: 0.87, leader: 2, elect: 0 },

  // Homonoia — the literal one. Every message is addressed to the leader,
  // the pull is hard enough that the flow is a visible funnel, and the
  // term ends every 3.4s: the whole field redirects mid-flight, which is
  // the one place on this site that shows what an election costs.
  '/projects/homonoia': { speed: 1.00, pull: 1.80, swirl: 0.45, jitter: 0.30, leaderMix: 1.00, nodes: 5, spread: 0.35, glow: 0.18, leader: 0, elect: 3.4 },

  // Philoi — concurrent edits converging. Two emitters, one destination,
  // and the swirl bends the streams around each other before they land in
  // the same place.
  '/projects/philoi': { speed: 0.85, pull: 1.30, swirl: 0.90, jitter: 0.30, leaderMix: 0.92, nodes: 2, spread: 0.45, glow: 0.26, leader: 3, elect: 0 },

  // Basis — the quietest state §4.7 asks for. Near-still, dim, three nodes
  // idling. It is the section with no metrics; the field says so too.
  '/projects/basis': { speed: 0.20, pull: 0.50, swirl: 0.10, jitter: 0.10, leaderMix: 0.50, nodes: 3, spread: 0.90, glow: 0.2, leader: 1, elect: 0 },

  '/about': { speed: 0.80, pull: 1.00, swirl: 0.45, jitter: 0.16, leaderMix: 0.45, nodes: 5, spread: 0.50, glow: 0.21, leader: 4, elect: 0 },
};

const DEFAULT = PRESETS['/'];

/* ── Uniforms ─────────────────────────────────────────────────────────── */

const uSpeed = uniform(DEFAULT.speed);
const uPull = uniform(DEFAULT.pull);
const uSwirl = uniform(DEFAULT.swirl);
const uJitter = uniform(DEFAULT.jitter);
const uLeaderMix = uniform(DEFAULT.leaderMix);
const uNodes = uniform(DEFAULT.nodes);
const uSpread = uniform(DEFAULT.spread);
const uGlow = uniform(DEFAULT.glow);
const uContrast = uniform(1);
const uLead = uniform(new Color());
const uQuiet = uniform(new Color());
const uPaper = uniform(new Color());
const uLeader = uniform(DEFAULT.leader);

const uDt = uniform(0);
const uClock = uniform(0);
const uSeed = uniform(0);
const uSize = uniform(1.6);

/* Wall clock, unscaled. uClock above runs at the section's own speed —
   which is what the traffic wants and the sky must not have: the stars are
   at effective infinity and belong to no section (§18). */
const uTime = uniform(0);

/* How bright this layer is allowed to be, which §4.7 does not leave to
   taste: text is measured against the busiest frame the scene can produce,
   and if the scene can wash out body copy the scene is wrong.

   The bound, stated so it can be measured: the brightest 12x12 average the
   field draws anywhere on the page never exceeds --void-lift. A glyph-sized
   local mean rather than a single pixel, because that is the background a
   piece of text actually sits on; --void-lift because it is the palette's
   own name for a raised surface, so the field is allowed to look raised and
   never more. At that bound every text token clears 4.5:1 against the worst
   background on the page. Additive blending clamps none of this for us —
   the earlier version of this file peaked at pure white.

   The figure is total ink, not per-particle opacity: the alpha a particle
   is drawn at is this over however many particles were allocated. The count
   is a quality setting — 120k at full width, half that on a small viewport
   — and neither of those is a decision about how bright the page is.

   Re-measured at §16 and it fell a long way, from 696. Nothing about the
   simulation changed: the cluster was 9 units from the camera and filled
   the frame, and it is 18.5 units away over a landscape now, so the same
   ink lands in about a third of the area.

   Re-solved at §17 against the local bound (§4.7), from 88 — **2.5x**. The
   bound is not one number for the whole frame any more: it is the contrast
   the text actually standing in front of the scene needs, measured inside
   that element's own box.

   Two things about the solve, both of which the obvious arithmetic gets
   wrong. Ink scales the scene's *contribution*, and --void is under every
   pixel and does not move — so the factor comes from `backdrop - --void`,
   not from the backdrop. Dividing the totals understates it by about half
   and is what a first pass here did. And the ceiling is not `2x
   --void-lift`: 2x puts --dim at 4.1:1, under AA, so the figure the
   revision expected was never available. What binds is --dim at 10px, and
   the reason the ink is still one uniform rather than a function of the
   beat is that --dim is on screen at every scroll position on the page —
   the header nav, the period row, the metric labels, the log bands.

   Re-solved again at §18, from 221 — **2.15x** — because the camera moved
   and the bound is measured against whatever is in frame. Two things it
   found. The fog costs the field about a third of its light at every stop,
   and the descent gives most of it back by standing 15 units off the
   cluster where §17 stood 18.5. And the sky is a *separate* budget: the
   elements bound by stars have no field or ground behind them at all
   (0.00000, measured with the stars switched off), and the elements the
   field binds have no stars over them, so scaling the two together solves
   neither. See stars.ts for the other half.

   §17 recorded 23x to 223x of local headroom at beats 1 and 3 and left a
   scroll-varying alpha to this step. It is 1.11x to 36.7x now and the
   loose end is enargeia alone, the one project still high enough that the
   ground is far — descending is what spent it, because the stops with text
   now have the ground close. The mechanism is still available and there is
   much less left for it to buy. */
const INK = 474;
const uAlpha = uniform(0); // set at mount, from INK over the allocated count

const nodes = uniformArray<'vec3'>(NODES, 'vec3');

/* A section that stands two nodes up is not entitled to put five nodes'
   worth of traffic in the air. The particle count is fixed — the buffers
   are allocated once and the scene never reinitialises — so the share
   belonging to the nodes that are not participating comes off the
   brightness instead of off the count. */
const participation = uAlpha.mul(uNodes.div(N));

/* Per-particle randomness with no storage behind it: four independent
   draws off a stride-4 index, so no two particles share a seed and none of
   this has to be written down anywhere. */
const fi = float(instanceIndex);
const draw = (n: number) => hash(fi.mul(4).add(n));

const rOwner = draw(0);
const rRoute = draw(1);
const rRate = draw(2);
const rPhase = draw(3);

/* Which node emitted this particle and which one it is addressed to.
   `routed` is a per-particle constant compared against a uniform, so
   raising leaderMix converts particles to leader traffic in a stable order
   rather than reshuffling the field every frame.

   The leader's own particles cannot be addressed to the leader — that is a
   message to yourself, and it would sit as a dead blob on the one node the
   section is about. They go to a neighbour instead, which is also what the
   leader actually sends. */
const routed = rRoute.lessThan(uLeaderMix);
const owner = rOwner.mul(uNodes).floor().clamp(0, N - 1).toInt();
const neighbour = owner.add(1).mod(N);
const addressed = select(routed, uLeader.toInt(), neighbour);
const target = select(addressed.equal(owner), neighbour, addressed);

/* ── Mount ───────────────────────────────────────────────────────────── */

let renderer: Renderer | null = null;

const token = (name: string) =>
  new Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim());

export async function mount() {
  // Built detached. Nothing reaches the document until there is a frame in
  // it — a renderer that fails to initialise must leave no node behind,
  // not a black rectangle over the page.
  const canvas = document.createElement('canvas');
  canvas.className = 'field';
  canvas.setAttribute('aria-hidden', 'true');

  const params = {
    canvas,
    antialias: false,
    // Opaque, and the clear colour is --void. Additive particles over a
    // transparent canvas composite against the page rather than against
    // the scene, and the difference shows wherever they overlap.
    alpha: false,
    powerPreference: 'high-performance' as const,
  };

  /* Not `WebGPURenderer`, which is exactly this plus a getFallback that
     swaps in the WebGL backend when the adapter request fails. Naming that
     class is what pulls the second backend into the bundle, and field.ts
     has already asked for the adapter, so the fallback would be a second
     answer to a settled question at 23.1KB gzipped. `isWebGPURenderer` goes
     with it; the tier is explicit now, and the trap that flag exists to
     avoid (`capabilities.isWebGL2`) was never in play here.

     BasicNodeLibrary rather than the standard one: it registers the lights
     and tone mapping operators, which §4.4 will need, and none of the mesh
     node materials, which nothing on this site uses. Worth 8.0KB. */
  renderer = new Renderer(new WebGPUBackend(params), params);
  renderer.library = new BasicNodeLibrary();
  renderer.setClearColor(token('--void'), 1);
  size();

  // WebGPU initialisation is async, unlike WebGL. Nothing may be built
  // against the device before this resolves.
  await renderer.init();

  /* §4.7's resolution rule, read once. The scene never reinitialises, so a
     window dragged across 1024px keeps the field it was given; only the
     framebuffer follows the viewport. */
  const count = 120_000 * (innerWidth >= 1024 ? 1 : 0.5);

  const scene = new Scene();
  /* §18. Scroll is altitude: the camera is a curve over this landscape
     rather than a place to stand, keyed to where the pins put the beats.
     Everything about where it is lives in camera.ts; this file only tells
     it what time it is. */
  const view = buildCamera(viewport()[0] / viewport()[1]);
  const camera = view.camera;

  const material = new PointsNodeMaterial({
    transparent: true,
    blending: AdditiveBlending,
    // §4.4's rule, set now rather than when the laptop arrives: the field
    // depth-tests so geometry can occlude it, and writes no depth so the
    // particles cannot punch holes in each other.
    depthWrite: false,
    depthTest: true,
    sizeAttenuation: false,
  });
  material.sizeNode = vec2(uSize);

  /* --leader is the accent and it means elected (§2). That is exactly what
     it marks here: a particle carrying a message addressed to the leader.
     Everything else is --rule, a hairline's worth above the page.

     Uniforms rather than constants folded into the shader, because both
     tokens move under high contrast and §15 read them once at mount: a
     page *loaded* in high contrast got the brighter palette and a page
     *toggled* into it kept the darker one, and only the second was ever
     measured. They are re-read on every change now, so the two paths are
     the same page. */
  material.colorNode = select(routed, uLead, uQuiet).mul(uGlow).mul(uContrast);

  uAlpha.value = INK / count;

  const built = buildCompute(count);
  material.positionNode = built.position;
  material.opacityNode = built.alpha;

  /* §16. The floor, and it is this cluster: peaks under the nodes with the
     amplitude of the traffic they are receiving, ridges along the routes
     carrying it. Built here so it reads the same node positions the
     simulation does — one definition of where the cluster is.

     §19: it is a lit surface, so it brings the world's only two lights
     with it — the leader, and a fill low enough that its far side is
     readable rather than black. They belong to the terrain because what
     they are attached to is the elected node. */
  const terrain = buildTerrain(NODES, { lead: uLead, quiet: uQuiet, contrast: uContrast });
  scene.add(terrain.terrain, terrain.mist, terrain.horizon, ...terrain.lights);

  /* §18. The sky, and the only thing in the world that means nothing. It
     goes in behind the fog rather than through it. */
  const sky = buildStars({ paper: uPaper, lead: uLead, contrast: uContrast }, uTime);
  scene.add(sky.stars);

  const field = new Sprite(material);
  field.count = count;
  // The bounding sphere Sprite computes is the unit quad at the origin.
  // Instances are spread over the whole volume, so culling against it
  // drops the entire field the moment the origin leaves the frustum.
  field.frustumCulled = false;
  field.renderOrder = 10;
  scene.add(field);

  built.init();

  /* ── State ─────────────────────────────────────────────────────────── */

  let preset = DEFAULT;
  let term = 0;
  let applied = false;

  /* High contrast is a legibility setting and this layer sits under every
     word on the page, so it gets darker, never brighter. §4.7 measures
     text against the busiest frame the scene can produce, so the busiest
     frame is the thing the toggle has to move — and it has to move it
     *down*, which the 0.45 §15 chose no longer did once the palette came
     with it: high contrast lifts --rule from #2A2640 to #4A4470, which is
     2.6x the luminance, and the ground is mostly --rule. 0.20 is measured
     against the same 12x12 bound: the loudest section goes from 0.97x of
     --void-lift to 0.69x, and every section lands within 0.03 of that. */
  function syncContrast() {
    const high = document.documentElement.dataset.contrast === 'high';
    uLead.value = token('--leader');
    uQuiet.value = token('--rule');
    uPaper.value = token('--paper');
    gsap.set(uContrast, { value: high ? 0.20 : 1 });
    // The surface is lit rather than additive, so its share of this is two
    // light colours and an exposure rather than one multiply (terrain.ts).
    terrain.paint(uLead.value, uQuiet.value, token('--void'), token('--void-lift'), high ? 0.20 : 1);
    // The palette moved, so a frozen frame is now stale rather than still.
    repaint();
  }

  onSection((path) => {
    preset = PRESETS[path] ?? DEFAULT;
    term = 0;
    uLeader.value = preset.leader;

    const pairs: Array<[typeof uSpeed, number]> = [
      [uSpeed, preset.speed], [uPull, preset.pull], [uSwirl, preset.swirl],
      [uJitter, preset.jitter], [uLeaderMix, preset.leaderMix],
      [uNodes, preset.nodes], [uSpread, preset.spread], [uGlow, preset.glow],
    ];

    /* The first section this module hears about is the one the reader is
       already in — a deep link, or simply the time this bundle took to
       arrive. It lands instantly, so the state is a function of position
       and not of how long the scene has been running. Every later change
       is a transition, because it was a scroll. */
    const instant = !applied || motionOff();
    for (const [u, value] of pairs) {
      if (instant) gsap.set(u, { value });
      else gsap.to(u, { value, duration: 1.6, ease: 'power2.out', overwrite: true });
    }
    // The ground is the same change, so it takes the same duration: the
    // landscape and the traffic over it arrive together.
    retarget(instant ? 0 : 1.6);
    applied = true;
  });

  /* The floor is a function of who is receiving what, which is a function
     of the preset and of who currently holds the term. Both ends of that
     are here, so this is the only place the ground is told anything. */
  function retarget(duration: number) {
    terrain.retarget(
      shares(Math.round(preset.nodes), preset.leaderMix, uLeader.value),
      duration,
    );
  }

  /* ── The loop ──────────────────────────────────────────────────────── */

  const advance = (dt: number) => {
    uClock.value += dt * uSpeed.value;
    uTime.value += dt;

    if (preset.elect > 0) {
      term += dt;
      if (term >= preset.elect) {
        term -= preset.elect;
        // A term ends and another node takes it. Never the incumbent: a
        // cluster that re-elects the same node reads as a stuck animation.
        uLeader.value = (uLeader.value + 1 + Math.floor(Math.random() * (N - 1))) % N;
        /* The set piece. The traffic redirects this frame — it is one
           uniform and the compute pass reads it — and the landscape takes
           two seconds to agree, one summit subsiding while another rises.
           Under motion off no term ever ends, so there is nothing here to
           skip. */
        retarget(2.0);
      }
    }

    built.step(dt);
  };

  function repaint() {
    if (!running) draw();
  }

  const draw = () => {
    // The mist is a disc carried with the camera and the arc is its edge.
    terrain.follow(camera);
    // §20. Exposure is the pose's fourth channel, so it arrives from the
    // curve with the position rather than from anything here — and it is
    // read after view.update/snap has run, so a frozen frame and a moving
    // one are lit by the same number.
    terrain.expose(view.exposure());
    renderer!.render(scene, camera);
  };

  const tick = (_time: number, deltaMs: number) => {
    // Lag smoothing already caps the gap a backgrounded tab hands back
    // (§11). This is the floor under it: an uncapped dt puts every
    // particle through the far side of the cluster in a single step.
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    advance(dt);
    view.update(dt);
    draw();
  };

  let running = false;
  let byMotion = motionOff();
  let byHidden = document.hidden;

  /* Both reasons to stop are held separately. Collapsing them into one
     flag means a tab backgrounded while motion is off starts running when
     it comes back, having lost the half of the state that said not to. */
  function sync() {
    const run = !byMotion && !byHidden;
    if (run === running) return;
    running = run;
    if (run) {
      /* The page scrolled while this was frozen or backgrounded, and the
         curve's lag would fly the camera in from wherever it was left.
         Resuming is an arrival, not a move. */
      view.snap();
      gsap.ticker.add(tick);
    } else gsap.ticker.remove(tick);
  }

  onMotionChange((off) => {
    byMotion = off;
    sync();
  });

  // A compute simulation in a background tab is a battery complaint.
  document.addEventListener('visibilitychange', () => {
    byHidden = document.hidden;
    sync();
  });

  addEventListener('resize', () => {
    size();
    camera.aspect = viewport()[0] / viewport()[1];
    camera.updateProjectionMatrix();
    // The document is a different height, so every keyframe on the curve
    // is at a different scroll position. projects.ts re-decides whether it
    // pins on a 250ms debounce and says so; this is the half that does not
    // wait for it, because the viewport alone moves the end of the page.
    view.remeasure();
    // Frozen means still, not stale — the framebuffer changed shape.
    if (!running) draw();
  });

  /* Pinning four sections is worth most of nine screens (§17), and it can
     be decided or undecided long after this module mounted: the fonts land
     late and the fit rule is re-asked on them. Rebuild the curve when it
     does. */
  onLayout(() => view.remeasure());

  /* §4.7: reduced motion freezes the scene on a single computed frame and
     keeps the canvas. A frame computed from the initial state is five dots
     at five nodes — the simulation before it has done anything — so the
     still frame is the field run forward to where it would have been and
     then stopped. With motion on it does the same job: the reveal is a
     field rather than an empty page filling in.

     The palette is read here rather than where it is declared, because the
     first frame has to have it and `repaint` has to exist by then. */
  syncContrast();
  new MutationObserver(syncContrast).observe(document.documentElement, {
    attributeFilter: ['data-contrast'],
  });

  /* The reader may have deep-linked into the middle of the page, so the
     first frame is the pose the scroll position names rather than the top
     of the curve. Undamped — there is nothing yet for the lag to lag. */
  view.snap();

  for (let i = 0; i < 240; i++) advance(1 / 30);
  draw();

  document.documentElement.dataset.field = '';
  document.body.prepend(canvas);
  requestAnimationFrame(() => canvas.setAttribute('data-ready', ''));

  sync();

  return { renderer, scene, camera, field, count, terrain, sky };
}

/* ── The simulation ─────────────────────────────────────────────────────

   Each particle accelerates toward the node its message is addressed to,
   with a tangential term that keeps the traffic curving rather than
   falling straight in and a noise term standing in for the network.
   Arriving — or running out of life — consumes it, and the sender emits
   another in its place. */
function buildCompute(count: number) {
  const positions = instancedArray(count, 'vec3');
  const velocities = instancedArray(count, 'vec3');
  const lives = instancedArray(count, 'float');

  // Re-drawn against a frame counter. Against the fixed seeds instead,
  // every particle would respawn at the same offset from its node for the
  // life of the page and the emitters would read as fixed constellations.
  const scatter = () =>
    vec3(
      hash(fi.mul(4).add(uSeed)),
      hash(fi.mul(4).add(uSeed).add(1)),
      hash(fi.mul(4).add(uSeed).add(2)),
    ).sub(0.5);

  const init = Fn(() => {
    const j = scatter();
    const from = nodes.element(owner).add(j.mul(uSpread));
    const away = nodes.element(target).sub(from);
    positions.element(instanceIndex).assign(from);
    velocities.element(instanceIndex).assign(away.div(away.length().max(0.0001)).mul(0.9));
    // Staggered, so the first frame is not one synchronised pulse.
    lives.element(instanceIndex).assign(rPhase);
  })().compute(count);

  const update = Fn(() => {
    const p = positions.element(instanceIndex);
    const v = velocities.element(instanceIndex);
    const l = lives.element(instanceIndex);

    const to = nodes.element(target).sub(p);
    const d = to.length();
    const dir = to.div(d.max(0.0001));
    /* Around world up, since §16 laid the cluster down: the routes are
       near-horizontal now, so a tangent taken against up braids them
       across the ground where the camera can see it, where one taken
       against the view axis would swing half the traffic down into the
       terrain. Guarded: a message travelling straight up has no tangent,
       and an unguarded normalize() there is a NaN that sticks. */
    const raw = cross(dir, vec3(0, 1, 0));
    const tang = raw.div(raw.length().max(0.0001));
    const flow = mx_noise_vec3(p.mul(0.28).add(vec3(0, 0, uClock.mul(0.08))));

    /* Per-particle, signed. A tangent applied uniformly bends every message
       between a pair of nodes along the same curve, and the traffic arrives
       as one tube two units wide with a core bright enough to blow out the
       page behind it. Signed by the particle's own draw, the same force
       fans the route into a braid the width of the gap, which is both what
       the peak needed and what a hundred thousand separate messages should
       look like. */
    const spin = tang.mul(uSwirl.mul(rPhase.sub(0.5)).mul(2.4));

    v.addAssign(dir.mul(uPull).add(spin).add(flow.mul(uJitter.mul(rRate.add(0.4)))).mul(uDt));
    v.mulAssign(float(1).sub(uDt.mul(1.6)).clamp(0, 1));
    p.addAssign(v.mul(uDt.mul(uSpeed)));
    l.addAssign(uDt.mul(uSpeed).mul(rRate.mul(0.25).add(0.22)));

    If(l.greaterThan(1).or(d.lessThan(0.18)), () => {
      const j = scatter();
      const from = nodes.element(owner).add(j.mul(uSpread));
      p.assign(from);
      // Launched toward the receiver rather than dropped at rest. From
      // rest the first second of every message is spent sitting on its
      // sender, and five nodes wearing a cloud each is what the field
      // looked like before this line.
      const away = nodes.element(target).sub(from);
      v.assign(away.div(away.length().max(0.0001)).mul(0.9).add(j.mul(0.3)));
      l.assign(0);
    });
  })().compute(count);

  const life = lives.element(instanceIndex);
  /* Dark at both ends of the journey: the life fade covers the sender, and
     this covers the receiver. Without it the funnel converges on a point
     and the point saturates to white — measured, before this line, at a
     peak of exactly (255, 255, 255) under Homonoia. A message dimming as
     it is consumed is also the truer picture. */
  const arriving = nodes.element(target).sub(positions.element(instanceIndex)).length();

  return {
    position: positions.element(instanceIndex),
    /* Fogged like the ground (§18). The cluster is 10 units across and the
       camera comes within 15 of it, so the near side of the ring is half
       again as close as the far side — without this the traffic is a flat
       badge over a landscape that has depth. */
    alpha: smoothstep(0, 0.12, life)
      .mul(smoothstep(1, 0.86, life))
      .mul(smoothstep(0.5, 2.6, arriving))
      .mul(fog(positions.element(instanceIndex)))
      .mul(participation),
    init: () => renderer!.compute(init),
    step: (dt: number) => {
      uDt.value = dt;
      uSeed.value = (uSeed.value + 977) % 8_388_608;
      renderer!.compute(update);
    },
  };
}

/* documentElement.clientWidth, not innerWidth: the canvas is fixed to the
   initial containing block, which a classic scrollbar is outside of. Sized
   from innerWidth the buffer is ~15px wider than the box it is drawn in and
   the whole field is stretched by that much. Measured here at 1512: 1497.
   It also answers while the canvas is still detached, which clientWidth on
   the element itself does not. */
const viewport = () => [document.documentElement.clientWidth, innerHeight] as const;

function size() {
  const [w, h] = viewport();
  // §4.7 caps DPR at 1.5: the layer is out of focus behind text, and a
  // retina framebuffer of it is fill rate spent on nothing.
  renderer!.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer!.setSize(w, h, false);
}
