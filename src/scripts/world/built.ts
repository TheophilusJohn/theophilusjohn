/* §0.4 / §34 — the four scenes, drawn.

   `scenes.ts` and `city.ts` are where they are and what they are made of;
   this is the half that needs a GPU. It follows `stands.ts`'s construction
   exactly, and for the same reason: **two draw calls for everything built in
   the world**, not one per scene and not one per part. Every box in the
   world and fifty-one travelling signals go into two instanced meshes, and what makes
   one box different from the next is six floats in its instance rather than
   a second geometry. Since §36 that is 425 boxes rather than 182: the two
   cities are in the same mesh, for the same reason.

   ── What is animated, and where it is decided ──────────────────────────
   Nothing here decides anything. `consensus.ts` says who holds the term and
   `scene.ts` hands the answer down once a frame; everything else is
   `fract(t · rate + phase)` off the world's own clock, which is §30's rule
   for a mote applied to a machine. So a scene has no state, a reload puts it
   where it would have been, and a harness can force any moment of any term
   by asking `stateAt` for the second it wants.

   Four kinds and one table between them:

   - **Enargeia's layers** read a wave that is a pure function of the clock
     and the layer's own place in the stack.
   - **Homonoia's nodes** read five floats — how much of the term each holds
     — and the same five weights raise the ground under them through
     `swell.ts`. One number, two surfaces, which is why the mountain and the
     mast agree.
   - **Philoi's lines** read a table of thirty, and it is the one thing here
     computed on the CPU: where a line sits depends on how many lines with a
     smaller origin are visible, which is a count rather than a formula.
   - **Basis's modules** read one traversal parameter.

   ── Light ───────────────────────────────────────────────────────────────
   §28's rule, and it bites harder here than it did on a conifer: **the bands
   are placed around flat ground and a box is not flat ground.** A cube has
   faces at 0° and 90° to everything, so its own `N·L` runs the full 0 to 1
   and `band.ts` would cut four bands across one building — the white-spikes
   failure, with corners. So an object's `N·L` is compressed into a range
   before the bands see it, exactly as a tree's is, and the range is a little
   wider and brighter than a conifer's because what has to read is a *made*
   surface rather than a mass.

   Step −1, with the conifers: a station has to be a **silhouette at
   distance** (§4.8's first landmark state), and the ladder that starts at
   `--void-lift` is the one that gives an edge against the sky. `--leader` is
   on nothing but state (§2) — the lit layer, the node holding the term, the
   line that has just arrived, the module the request is in. */

import {
  AdditiveBlending,
  BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  MeshBasicNodeMaterial,
  Vector3,
  type Camera,
} from 'three/webgpu';
import {
  attribute,
  cameraPosition,
  cameraViewMatrix,
  float,
  fract,
  mix,
  positionLocal,
  positionWorld,
  smoothstep,
  step,
  uniform,
  uniformArray,
  varying,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import type Node from 'three/src/nodes/core/Node.js';
import type UniformNode from 'three/src/nodes/core/UniformNode.js';
import { bands } from './band';
import { CITIES } from './city';
import { LANDMARKS, SPIN_GUST, SPIN_HZ } from './landmark';
import type { Cluster } from './consensus';
import { fog } from './fog';
import type { Palette } from './palette';
import { B_CYCLE, E_PASS, P_LINES, P_PITCH, SCENES } from './scenes';
import { GUST_LENGTH, GUST_SPEED, WIND } from './wind';
import { gate, nearSwell, swellLift } from './swell';
import { haze } from './sky';
import { SUN } from './sun';

/* §28's compression, and the range is solved rather than picked — the first
   attempt used a conifer's and every scene came back a flat black cut-out.

   **The reason is that a box cannot reach `N·L` 1.** `sun.ts` puts the key
   light at (−0.545, 0.535, 0.660), so an axis-aligned face gets 0.660 at
   best (the +z wall), 0.535 (the top) or 0.545 (the −x wall), and the other
   three get nothing. Compressed into a conifer's 0.05–0.86 the *brightest*
   face of a building lands at 0.67 — two hundredths past `band.ts`'s
   terminator — so every one of the four scenes was one flat fill of
   `--void-lift` with the accent floating on it.

   **And two of the four settles stand on the shadow side**, which is the
   half of it that no amount of fitting fixes. §29's framing rule turns 17°
   off the bearing to the subject and says nothing about where the light is:
   at Enargeia the camera sees the +z wall and it is the brightest face a box
   has, and at Philoi, Homonoia and Basis the camera sees the +x and −z walls
   and both of those are at `N·L` 0 exactly. Re-siting three settles to suit
   the sun is a search this step is not, and turning the scenes to face the
   light would point Philoi's two screens away from the reader.

   So the low end of the range is a **fill**, and it is the one thing here
   the terrain does not get: a mountain reads by its slopes and has a whole
   frame to do it in, where a facade has four flat rectangles and no shading
   at all without one. Taken all the way to a wall inside the middle band
   (0.66) every scene came back a pale grey slab with its silhouette gone,
   which is the failure in the other direction and the worse one — §4.8's
   first landmark state is *distant silhouette*. 0.50 is where both hold: an
   unlit wall sits a quarter of the way from `--void-lift` to `--rule` and a
   lit one is nine tenths of the way from `--rule` to `--dim`, so a box is
   dark against the sky and has three values across it up close.

   And **no `--paper` on the mass at all** — the two brightest tokens stay
   where §2 puts them, on state. */
const MASS_DARK = 0.50;
const MASS_LIGHT = 1.07;

/** How far a lit part goes toward `--leader`. Not to it: at 1.0 the cell is
    a flat patch of accent with no shading left in it, which reads as a
    sticker rather than as a surface with a light behind it. */
const HOT = 0.86;

/* ── Enargeia's wave ────────────────────────────────────────────────────
   One pass bottom to top per E_PASS seconds. Just under a tenth of the
   stack, so one layer is at full and the two either side are partly on: at
   0.16 three whole layers lit at once and the machine grew a solid bar of
   accent across it, which is a scanner rather than a forward pass. The other
   half of that fix is per cell — see E_FLOOR. */
const WAVE = 0.09;
/** How lit the quietest cell of an active layer gets, against the loudest.
    Not all units fire on a pass, and a layer that activates uniformly is a
    bar of light rather than a computation. */
const E_FLOOR = 0.15;

/* Basis's, and deliberately the quietest thing in the world. */
const TRACE = 0.09;

/* ── Philoi's document ──────────────────────────────────────────────────
   Sixteen lines, alternating authors, and each carries an **origin** that
   decides where it sits in the document — a fraction, fixed for the life of
   the page. The origins are deliberately *not* monotonic in the order the
   lines are written: a document that only ever appends is a log, and an
   append cannot show convergence because there is nothing to converge on.
   Every other line lands between two that are already there.

   `LATENCY` is what makes the property visible. A line appears at once on
   the screen that wrote it and a moment later on the other, so for that
   moment the two columns disagree — and then they agree again, in the same
   order, with nothing dropped from either. */

/* Fixed, so both screens sort the same way and the page is the same page on
   every load. Written as the position each line claims in the document, not
   as the order it was typed in — five of these land above a line that is
   already there, which is the only event in the scene worth watching. */
const ORIGIN = [
  0.06, 0.62, 0.31, 0.88, 0.18, 0.74, 0.44, 0.97,
  0.12, 0.55, 0.37, 0.81, 0.25, 0.68, 0.50, 0.93,
];
/** Strictly alternating, and that is a constraint rather than a shrug: the
    edit in flight has to leave a screen at the moment that screen writes a
    line, and an irregular author order has no single rate to give it. */
const AUTHOR = ORIGIN.map((_, i) => i % 2);

/** Seconds between edits. Slow, because what has to be legible is *where* a
    line lands rather than that one did. */
const P_EVERY = 1.9;
/** How long an edit is in flight — the only window in which the two columns
    disagree, and therefore the only window in which a reader can see that
    this is a replica rather than a shared screen. */
const P_LATENCY = 0.42;
/** The whole document, written. 16 × 1.9 is 30.4s, which is exactly eight of
    an author's own 3.8s — the two clocks have to share a wrap or the edit in
    flight drifts away from the line it is carrying. */
const P_CYCLE = P_LINES * P_EVERY;
/** The last of it: the column empties and the next document starts. A loop,
    like everything else in the world — and a document *closing* is not a
    line being discarded, which is the claim the scene makes. */
const P_CLEAR = 2.2;
/** How long a line stays lit after it lands. */
const P_HOT = 0.9;
/** How fast a line slides to the place an insertion above it opened up.
    What makes the insertion readable is that the lines below it *move*, and
    a jump is not a movement. */
const P_SLIDE = 0.18;

const SIGNAL_ALPHA = 0.55;
/** How wide the fade at the far end is. **The distance itself is authored per
    signal** since §37 (`Signal.far`) rather than being one number for the
    layer: §0.2 asks the lighthouse for a light "visible from further than it
    should be", which is a fact about one lamp — 2,600 units against the four
    scenes' 1,000 and the stadium's 900 — and a layer constant cannot carry
    it. The band is the layer's, because what it is for is the pop and that
    is the same at any range. */
const SIGNAL_FADE = 140;

const TAU = Math.PI * 2;

/* `uniformArray(...).element()` comes back as `Node<string>` from the type
   definitions — the element type is not carried through — so every read of
   one needs a cast. One helper rather than a cast at each of the six call
   sites, and it is the only `as unknown` in the file. */
const at = (arr: ReturnType<typeof uniformArray>, i: unknown): Node<'float'> =>
  arr.element(i as never) as unknown as Node<'float'>;


type Row = { pos: number; hot: number; on: number };

export function buildBuilt(palette: Palette, time: UniformNode<'float', number>) {
  /* ── The boxes ───────────────────────────────────────────────────────
     One unit cube, ±1 on every axis, with per-face normals — so twenty-four
     vertices rather than eight, because a box shaded from eight shared
     normals is a sphere with corners. */
  const geometry = new InstancedBufferGeometry();
  {
    const p: number[] = [];
    const n: number[] = [];
    const idx: number[] = [];
    const faces: [Vector3, Vector3, Vector3][] = [
      [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, -1)],
      [new Vector3(-1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)],
      [new Vector3(0, 1, 0), new Vector3(0, 0, 1), new Vector3(1, 0, 0)],
      [new Vector3(0, -1, 0), new Vector3(0, 0, -1), new Vector3(1, 0, 0)],
      [new Vector3(0, 0, 1), new Vector3(0, 1, 0), new Vector3(1, 0, 0)],
      [new Vector3(0, 0, -1), new Vector3(0, 1, 0), new Vector3(-1, 0, 0)],
    ];
    for (const [normal, up, right] of faces) {
      const base = p.length / 3;
      for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
        p.push(
          normal.x + right.x * u + up.x * v,
          normal.y + right.y * u + up.y * v,
          normal.z + right.z * u + up.z * v,
        );
        n.push(normal.x, normal.y, normal.z);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(p), 3));
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(n), 3));
    geometry.setIndex(new BufferAttribute(new Uint16Array(idx), 1));
  }

  /* Flattened out of `scenes.ts` and `city.ts` once, at build. Every part of
     every built thing in the world is in one buffer and nothing here is ever
     rewritten — what changes is four uniforms and a thirty-entry table.

     **§36's two cities go in this mesh rather than in one of their own**,
     which is what holds the whole world at two draw calls. They cost nothing
     the four scenes do not: a city is `kind 0` throughout, so the varying
     below resolves to a constant zero for all of it and the only work an
     instance does is the same box the stations are made of. What a city
     brings is *fill* — a tower is 320 units of surface — and fill is paid
     for where the camera is, which is why §36 measures inside one and
     outside one rather than at three altitudes. */
  const parts = [...SCENES, ...CITIES, ...LANDMARKS].flatMap((s) => s.parts.map((part) => ({ scene: s, part })));
  const N = parts.length;
  const aPos = new Float32Array(N * 3);
  const aSize = new Float32Array(N * 3);
  const aCtl = new Float32Array(N * 4);
  const aTurn = new Float32Array(N * 2);

  parts.forEach(({ scene, part }, i) => {
    aPos[i * 3] = scene.site.x + part.x;
    aPos[i * 3 + 1] = scene.pad + part.y;
    aPos[i * 3 + 2] = scene.site.z + part.z;
    aSize[i * 3] = part.w;
    aSize[i * 3 + 1] = part.h;
    aSize[i * 3 + 2] = part.d;
    aCtl[i * 4] = part.kind;
    aCtl[i * 4 + 1] = part.a;
    aCtl[i * 4 + 2] = part.b;
    aTurn[i * 2] = Math.cos((part.yaw * Math.PI) / 180);
    aTurn[i * 2 + 1] = Math.sin((part.yaw * Math.PI) / 180);
  });

  geometry.setAttribute('iPos', new InstancedBufferAttribute(aPos, 3));
  geometry.setAttribute('iSize', new InstancedBufferAttribute(aSize, 3));
  geometry.setAttribute('iCtl', new InstancedBufferAttribute(aCtl, 4));
  geometry.setAttribute('iTurn', new InstancedBufferAttribute(aTurn, 2));
  geometry.instanceCount = N;

  /* ── The uniforms every kind reads ──────────────────────────────────── */
  const held = uniformArray(new Array<number>(5).fill(0), 'float');
  const lineY = uniformArray(new Array<number>(P_LINES * 2).fill(0), 'float');
  const lineHot = uniformArray(new Array<number>(P_LINES * 2).fill(0), 'float');
  /* A line that has not been written yet has to be *absent*, not parked
     somewhere. Parked above the top rail it is still a lit bar floating over
     the screen — so what the table carries is a scale, and an unwritten line
     is a box of size zero. It also makes the birth a grow-in rather than a
     pop, which is what "a line appears" looks like. */
  const lineOn = uniformArray(new Array<number>(P_LINES * 2).fill(0), 'float');
  const near = gate();

  const material = new MeshBasicNodeMaterial({ fog: false });
  const sun = vec3(SUN.x, SUN.y, SUN.z);

  const pos = attribute<'vec3'>('iPos', 'vec3');
  const size = attribute<'vec3'>('iSize', 'vec3');
  const ctl = attribute<'vec4'>('iCtl', 'vec4');
  const turn = attribute<'vec2'>('iTurn', 'vec2');
  const kind = ctl.x;
  const a = ctl.y;
  /* Clamped, because every kind evaluates it: Enargeia's `a` is a fraction
     of a stack and Homonoia's is a node index, so an unclamped read here
     would index a thirty-entry table with whatever those happen to be. */
  const isLine = kind.equal(3);
  const slot = a.add(ctl.z.mul(P_LINES)).clamp(0, P_LINES * 2 - 1).toInt();

  /* Philoi's lines slide down as edits land above them, so the table moves
     the box rather than the box being where `scenes.ts` put it. Every other
     kind reads nothing here. */
  const drop = isLine.select(at(lineY, slot), float(0));
  const grow = isLine.select(at(lineOn, slot), float(1));

  /* The rigid lift. Taken at the instance's own base, so a forty-six-unit
     mast on a summit that is rising moves as one object. */
  const lift = swellLift(vec2(pos.x, pos.z), near);

  const rot = (v: Node<'vec3'>) =>
    vec3(v.x.mul(turn.x).add(v.z.mul(turn.y)), v.y, v.z.mul(turn.x).sub(v.x.mul(turn.y)));

  /* ── §37's rotor, and it is one turn in the plane the yaw does not use ──
     `kind 5` is a turbine blade: it turns about the part's **local z**, which
     after the yaw is the nacelle's own axis, where every other rotation in
     this file is about world up. So there are two turns stacked here and they
     compose in the one order that works — the blade turns in the rotor plane,
     then the whole rotor faces the wind.

     `a` is the blade's phase in turns and `b` its radius, and the instance's
     position is the **hub**. That is §35's lesson one axis over: an instance's
     rotation turns its box about its own centre and does not move it, so a
     blade that is not centred on the hub has to have its offset turned by the
     same angle its box is — which is why both come off `rc`/`rs` below and
     cannot drift apart.

     **The rate is `wind.ts`'s gust wave**, and what is written here is the
     rate's *integral* because a shader has a clock and not a state:
     `SPIN_GUST·cos(φ)` differentiates to `2π·SPIN_GUST·GUST_HZ·sin(φ)`, which
     is in phase with the strength `wind.ts` gives at the same point. `along`
     is per instance, so a gust travelling the ridge reaches the five turbines
     at different times and nothing had to be jittered to keep them apart.

     For every other kind `rc` is 1, `rs` is 0 and `radius` is 0, so the whole
     construction is the identity — `ctl.z` carries Enargeia's per-cell weight
     and Philoi's screen index and may not be read as a radius by either. */
  const isRotor = kind.equal(5);
  const along = pos.x.mul(WIND.x).add(pos.z.mul(WIND.z));
  const phi = along.sub(time.mul(GUST_SPEED)).div(GUST_LENGTH).mul(TAU);
  const spin = time.mul(SPIN_HZ).add(a).add(phi.cos().mul(SPIN_GUST)).mul(TAU);
  const rc = isRotor.select(spin.cos(), float(1));
  const rs = isRotor.select(spin.sin(), float(0));
  const radius = isRotor.select(ctl.z, float(0));
  const spinZ = (v: Node<'vec3'>) =>
    vec3(v.x.mul(rc).add(v.y.mul(rs)), v.y.mul(rc).sub(v.x.mul(rs)), v.z);
  const hub = vec3(radius.mul(rs), radius.mul(rc), 0);

  material.positionNode = pos
    .add(vec3(0, lift.sub(drop), 0))
    .add(rot(spinZ(positionLocal.mul(size).mul(grow)).add(hub)));

  const normal = rot(spinZ(attribute<'vec3'>('normal', 'vec3'))).normalize();

  /* ── How lit a part is, by kind ─────────────────────────────────────── */
  const wave = fract(time.div(E_PASS));
  const enargeia = smoothstep(WAVE, 0, wave.sub(a).abs()).mul(mix(float(E_FLOOR), 1, ctl.z));
  const homonoia = at(held, a.clamp(0, 4).toInt());
  const philoi = at(lineHot, slot);
  /* The request is at `a` when the traverse is at `a`. `TRACE` is how much of
     the graph is lit around it — narrower than Enargeia's wave, because what
     travels here is one request rather than a front. */
  const basis = smoothstep(TRACE, 0, fract(time.div(B_CYCLE)).sub(a).abs());

  /* **A varying.** How lit a part is is a property of the *instance* — a
     layer, a node, a line, a module — and every term in it is constant
     across the box's whole surface. Written as a plain expression it is a
     fragment-stage node, so four `equal` selects and three dynamically
     indexed uniform-array reads ran on every pixel the four scenes cover:
     measured, the two meshes cost **0.336 ms a frame** for nine thousand
     triangles, which is more than the whole landscape. Interpolating one
     float instead is exact, because a constant interpolates to itself. */
  const hot = varying(float(kind.equal(1).select(
    enargeia,
    kind.equal(2).select(homonoia, isLine.select(philoi, kind.equal(4).select(basis, float(0)))),
  )).clamp(0, 1));
  /* Nothing §37 draws in this mesh is ever hot, and that is hard rule 2
     rather than an omission: `--leader` marks state, a landmark has none, and
     a lit box in the accent would read as a station with something to say.
     `kind 5` falls through every branch above to 0 by construction. */

  /* §28's shading, ending the way every opaque surface in this world ends:
     band the compressed lighting term, then mix toward the sky in the
     direction being looked at so a station on a far ridge arrives at the
     same colour the ridge does. The accent goes on *after* the bands — it is
     state, not light, and banding it would put its edge somewhere else. */
  const toEye = cameraPosition.sub(positionWorld).normalize();
  /* No marched shadow: `chunk.ts` bakes one into the *ground*, and a station
     is not ground. A built thing standing in a valley is therefore lit where
     the slope beside it is not — which is the error in the direction §28
     found to be invisible (shade may lag what casts it and may never outrun
     it), and the alternative is asking a worker about geometry it has never
     been told exists. */
  const lum = mix(float(MASS_DARK), float(MASS_LIGHT), normal.dot(sun).max(0));
  const surface = mix(bands(lum, palette, -1), palette.lead, hot.mul(HOT));
  material.colorNode = mix(haze(toEye, palette), surface, fog(positionWorld));

  const mesh = new Mesh(geometry, material);
  /* Instance positions are world coordinates and the geometry is a unit cube
     at the origin, so the bounding sphere describes nothing. Four hundred
     boxes is 5,100 triangles — cheaper to submit than to bound, and it is
     still cheaper at §36's 425. */
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;

  /* ── The signals ─────────────────────────────────────────────────────
     `motes.ts`'s billboard, once more: additive quads in the camera's own
     basis, with no state at all — a signal is `fract(t·rate + phase)`, and
     `span` is how much of that cycle it is alive for.

     One draw call for everything travelling in the world. */
  const sig = [...SCENES, ...LANDMARKS].flatMap((s) => s.signals.map((signal) => ({ scene: s, signal })));
  const M = sig.length;
  const sGeo = new InstancedBufferGeometry();
  {
    const off = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);
    sGeo.setAttribute('position', new BufferAttribute(new Float32Array(12), 3));
    sGeo.setAttribute('qOff', new BufferAttribute(off, 2));
    sGeo.setIndex(new BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1));
  }

  const sFrom = new Float32Array(M * 3);
  const sTo = new Float32Array(M * 3);
  const sRun = new Float32Array(M * 4);
  const sWho = new Float32Array(M * 4);
  sig.forEach(({ scene, signal }, i) => {
    for (let k = 0; k < 3; k++) {
      const o = k === 0 ? scene.site.x : k === 1 ? scene.pad : scene.site.z;
      sFrom[i * 3 + k] = o + signal.from[k]!;
      sTo[i * 3 + k] = o + signal.to[k]!;
    }
    sRun[i * 4] = signal.rate;
    sRun[i * 4 + 1] = signal.phase;
    sRun[i * 4 + 2] = signal.arc;
    sRun[i * 4 + 3] = signal.span;
    sWho[i * 4] = signal.group;
    sWho[i * 4 + 1] = signal.node;
    sWho[i * 4 + 2] = signal.size;
    sWho[i * 4 + 3] = signal.far;
  });
  sGeo.setAttribute('iFrom', new InstancedBufferAttribute(sFrom, 3));
  sGeo.setAttribute('iTo', new InstancedBufferAttribute(sTo, 3));
  sGeo.setAttribute('iRun', new InstancedBufferAttribute(sRun, 4));
  sGeo.setAttribute('iWho', new InstancedBufferAttribute(sWho, 4));
  sGeo.instanceCount = M;

  const camRight = uniform(new Vector3(1, 0, 0));
  const camUp = uniform(new Vector3(0, 1, 0));
  /* One float per group: Enargeia's pass, Homonoia's traffic, Philoi's
     edits, Basis's request. Homonoia's is the only one that ever leaves 1 —
     the traffic stops through the silence, and that pause is the whole tell
     that an election is happening. */
  const flow = uniformArray(new Array<number>(4).fill(1), 'float');
  /* Who holds the term. A leg is authored both ways for every pair and this
     turns off the half that is not the leader's. */
  const leader = uniform(0);

  const sMaterial = new MeshBasicNodeMaterial({
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });
  {
    const from = attribute<'vec3'>('iFrom', 'vec3');
    const to = attribute<'vec3'>('iTo', 'vec3');
    const run = attribute<'vec4'>('iRun', 'vec4');
    const who = attribute<'vec4'>('iWho', 'vec4');
    const corner = attribute<'vec2'>('qOff', 'vec2');

    const cycle = fract(time.mul(run.x).add(run.y));
    const alive = smoothstep(run.w, run.w.mul(0.92), cycle);
    const u = cycle.div(run.w).clamp(0, 1);

    /* The bow. A message that travels a straight line between two masts a
       hundred and twenty units apart reads as a laser; an arc reads as
       something sent. `4u(1−u)` is the parabola that is 1 at the middle and
       0 at both ends, which is the only shape that leaves the endpoints
       exactly on the two crowns. */
    const bow = u.mul(float(1).sub(u)).mul(4).mul(run.z);
    /* Its own lift, taken at the leg's start: the crowns it flies between
       are on masts that ride the swell, so a message would otherwise leave
       the top of a rising node and arrive under the top of a falling one. */
    const where = mix(from, to, u)
      .add(vec3(0, bow, 0))
      .add(vec3(0, swellLift(vec2(from.x, from.z), near), 0));

    /* ── Why a billboard needs a near test ───────────────────────────
       These are the only camera-facing quads in the world placed at *fixed*
       world points: `motes.ts` and `clouds.ts` are camera-relative, so their
       centres are always in front of the eye. A signal's is not — fly past
       Basis and Homonoia's forty are behind you — and a quad built in the
       camera's own basis around a point **behind the near plane** does not
       vanish, it straddles it, and the two triangles rasterise across the
       whole screen. Additive, so every one of those pixels is a blend.

       Collapsing the quad to a point at its centre is what stops that: a
       zero-size primitive rasterises nothing, and the far fade beside it is
       the same argument one range further out. It is correct and it was not
       the expensive thing — see the varying below, which was. */
    const view = cameraViewMatrix.mul(vec4(where, 1));
    const ahead = step(view.z, -1);
    const range = where.distance(cameraPosition);
    const shrink = ahead.mul(smoothstep(who.w, who.w.sub(SIGNAL_FADE), range));

    sMaterial.positionNode = where.add(
      camRight.mul(corner.x).add(camUp.mul(corner.y)).mul(who.z.mul(shrink)),
    );

    /* ── One varying, and the fragment shader is a disc times it ──────
       Everything below except the disc itself is a property of the
       *instance*: where it is in its cycle, whether it is alive, whose leg
       it is, how far away it is and how much fog is in the way. Written as
       plain expressions they are fragment-stage nodes — and `fog` reads
       `positionWorld`, which three derives from `positionNode`, so the whole
       vertex chain including `swellLift`'s five exponentials was being
       recomputed **per pixel**.

       Measured at Basis's settle: the fifty-one quads cost **0.31 ms a
       frame** against the four hundred and forty-one opaque boxes' 0.004,
       and a material stripped to a constant cost nothing at all — which is
       what said it was the shader and not the submission. */
    const envelope = smoothstep(0, 0.08, u).mul(smoothstep(1, 0.9, u));
    /* Homonoia's legs belong to a node: only the one holding the term sends,
       and −1 means "always". `abs(node − leader) < 0.5` rather than an
       equality on floats. */
    const mine = float(who.y.lessThan(0).select(
      float(1),
      smoothstep(0.5, 0.4, who.y.sub(leader).abs()),
    ));

    const gain = varying(
      alive
        .mul(shrink)
        .mul(envelope)
        .mul(mine)
        .mul(at(flow, who.x.clamp(0, 3).toInt()))
        .mul(fog(where))
        .mul(SIGNAL_ALPHA),
    );

    /* The two rings, which are the only thing here that is genuinely about
       the pixel. */
    const r = corner.length();
    const disc = smoothstep(0.5, 0.34, r).mul(0.35).add(smoothstep(0.2, 0.05, r).mul(0.65));

    /* ── Why a lamp is not `--leader`, and it is §0.2 rather than §2 ────
       Hard rule 2 says the accent marks state, and a landmark has none: it
       carries no writeup, no machine ID and nothing that is current. But the
       binding reason is one line further up — §0.2 asks that a landmark be
       "distinct enough in silhouette from the four stations that nobody flies
       to one expecting content", and a lit thing in the colour Homonoia's
       leader wears is a promise of content. So the nineteen lamps wear
       `--mint`, which §30 gave the motes and which is this world's light that
       is *not* state, and the two are never in one frame's worth of doubt.

       A varying, for the reason the mass's `hot` is one: the tint is a
       property of the instance and a constant interpolates to itself. */
    const tint = varying(mix(palette.lead, palette.mint, step(3.5, who.x)));

    sMaterial.colorNode = tint;
    sMaterial.opacityNode = disc.mul(gain);
  }

  const signals = new Mesh(sGeo, sMaterial);
  signals.frustumCulled = false;
  signals.matrixAutoUpdate = false;
  // After the opaque world and after the cloud forms, before the motes.
  signals.renderOrder = 2;

  /* ── The frame ───────────────────────────────────────────────────────
     Four uniforms, a thirty-entry table and two vectors. Nothing here
     allocates and nothing walks the four hundred instances. */
  const rows: Row[] = [];
  const right = new Vector3();
  const up = new Vector3();
  const back = new Vector3();

  function update(camera: Camera, cluster: Cluster, t: number, dt: number) {
    camera.matrixWorld.extractBasis(right, up, back);
    camRight.value.copy(right);
    camUp.value.copy(up);

    for (let i = 0; i < 5; i++) {
      /* Two things light a mast: holding the term, and campaigning for it.
         The candidate blinks — a node asking for votes is *not* the leader
         and must not read as one, so it is a pulse at half the amplitude
         and the steady light only arrives when the votes do. */
      const term = i === cluster.leader ? cluster.held : i === cluster.previous ? 1 - cluster.held : 0;
      const call = i === cluster.candidate
        ? (0.5 - 0.5 * Math.cos(t * TAU * 3)) * 0.45 * (1 - cluster.held)
        : 0;
      held.array[i] = Math.min(1, term + call);
    }
    flow.array[1] = cluster.flow;
    leader.value = cluster.leader;

    philoiTable(t, dt, rows);
    for (let i = 0; i < rows.length; i++) {
      lineY.array[i] = rows[i]!.pos;
      lineHot.array[i] = rows[i]!.hot;
      lineOn.array[i] = rows[i]!.on;
    }

    near.value = nearSwell(camera.position.x, camera.position.z, 700) ? 1 : 0;
  }

  return { mesh, signals, update, count: N, signalCount: M };
}

/* ── Philoi's table ─────────────────────────────────────────────────────
   The one thing in this file that is a count rather than a formula, and the
   count *is* the claim: a line's place in the document is how many lines
   with a smaller origin are present, so a line that arrives late pushes
   everything below it down and displaces nothing. Both screens run the same
   comparison over the same origins and therefore agree — which is what a
   CRDT guarantees and what §0.4 asks a reader to be able to see.

   Thirty entries, thirty comparisons each. Once a frame, and only while the
   scene is anywhere near the frame. */
function philoiTable(t: number, dt: number, out: Row[]): void {
  const now = ((t % P_CYCLE) + P_CYCLE) % P_CYCLE;
  /* The document closing. One factor over the whole column, so the sixteen
     lines leave together — one at a time would be sixteen deletions, which
     is the one thing this scene may not show. */
  const closing = Math.max(0, 1 - Math.max(0, now - (P_CYCLE - P_CLEAR)) / (P_CLEAR * 0.7));
  /* Framerate-independent, like everything else that eases here. A fixed
     per-frame factor would slide at one speed at 60Hz and another at 30. */
  const k = dt > 0 ? 1 - Math.exp(-dt / P_SLIDE) : 1;

  const bornAt = (i: number, s: number) => i * P_EVERY + (AUTHOR[i] === s ? 0 : P_LATENCY);

  for (let s = 0; s < 2; s++) {
    for (let i = 0; i < P_LINES; i++) {
      const age = now - bornAt(i, s);
      const here = age >= 0;

      /* **The count is the claim.** A line's place in the document is how
         many present lines have a smaller origin — not when it arrived — so
         a line that lands late pushes everything under it down and displaces
         nothing. Both screens run this over the same origins, so both reach
         the same column; the only thing that differs between them is *which*
         lines are present, and only for the length of a latency. */
      let rank = 0;
      if (here) {
        for (let j = 0; j < P_LINES; j++) {
          if (j === i || ORIGIN[j]! >= ORIGIN[i]!) continue;
          if (now - bornAt(j, s) >= 0) rank++;
        }
      }

      const key = i + s * P_LINES;
      const row = (out[key] ??= { pos: 0, hot: 0, on: 0 });
      const want = here ? closing : 0;
      /* The slide is damped; appearing and leaving are not — a line grows in
         over its own scale, and `closing` is already a ramp. */
      row.on = want;
      /* Bright as it lands and then it is just another line. A resting glow
         was drafted here and taken out again — the lines read on their own,
         as bars against a lit screen, and thirty-two of them wearing
         `--leader` at any amount is a great deal of accent for a colour §2
         reserves for state. */
      row.hot = here ? Math.max(0, 1 - age / P_HOT) * closing : 0;
      const target = rank * P_PITCH;
      // A line that is not on screen has nowhere to slide from: snap it, or
      // the next document starts with sixteen bars easing in from the top.
      row.pos = here ? row.pos + (target - row.pos) * k : target;
    }
  }
}
