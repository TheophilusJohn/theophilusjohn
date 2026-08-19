/* §0.2 — motes, and they are the thing that says *alive* rather than *lit*.

   Everything §22–§28 put in this world is a surface: ground, water, cover,
   stone, wood. All of it is still. What a night landscape has that none of
   those give it is air with something in it — and §0.2 is precise about what
   that something must not be: "slow, wandering, and they must not read as
   dust. Dust falls and drifts; these rise and hesitate."

   So the whole of the motion here is one cycle per mote, and the cycle is
   the requirement written down: **a rise with pauses in it**, downwind
   travel along `wind.ts` while it rises, a small drift across, and a fade in
   at the bottom and out at the top so nothing is ever seen to reset. A mote
   is not a particle with a velocity; it is a phase.

   ── Where they are ─────────────────────────────────────────────────────
   §27's construction again, and for §27's reason: a mote hangs over ground
   that only `height.ts` on this thread knows about, and how many hang there
   is `cover.ts`'s own density — "denser over water and vegetation, sparse on
   bare rock" is three lines of arithmetic over answers both ends of the
   world already agree on. A world-anchored grid of cells is mapped
   toroidally into one buffer, a slot is refilled only when the cell it holds
   moves, and the refills are capped per frame.

   **`--mint`, and this is what §2 has held it in reserve for.** The token
   has been in `tokens.css` since the palette was written with a note saying
   not to use it without a reason; a second accent belongs to the one thing
   in the world that is neither lit by the key light nor a state — §2's rule
   is that `--leader` means *elected*, and a mote means nothing at all except
   that the air is not empty. Additive and fogged, so §0.2's last clause is
   literal: this is the only layer allowed to be brighter than the ground it
   is over, and the fog is what stops it being brighter than the sky.

   ── And at day it is not additive at all (§42) ─────────────────────────
   §0.2's clause is a clause about *night*: additive blending has no ceiling
   and no floor, and over a ground that runs 0.30 to 0.85 there is no
   headroom left to be brighter in. SPEC §4.9 offers two answers — dark
   motes, or a night-only layer — and says cutting them is acceptable.
   Neither is needed, because the two are the same layer with one property
   changed: **`AdditiveBlending` → `NormalBlending`, and `--mint` is a dark
   token in the light set.** Everything else is untouched — the same phase,
   the same rise with pauses in it, the same two rings, the same disc, the
   same fade, the same instance buffer, the same draw call and the same
   count. A speck of dust over a meadow at noon is dark against the ground
   and dark against the sky, which is what this now is, and §0.2's sentence
   reads the same way with one word in it inverted.

   The blend is a material property rather than a node, so it cannot be a
   uniform: `setDay` is what the palette's repaint calls, and it is the only
   thing in this file that knows which appearance it is. */

import {
  AdditiveBlending,
  NormalBlending,
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
  float,
  fract,
  mix,
  positionWorld,
  sin,
  smoothstep,
  uniform,
  vec3,
} from 'three/tsl';
import type UniformNode from 'three/src/nodes/core/UniformNode.js';
import { airAt, airBase } from './air';
import { cover, hash3 } from './cover';
import { fog } from './fog';
import { height } from './height';
import type { Palette } from './palette';
import { WIND, WIND_PERP } from './wind';

/* ── The grid ───────────────────────────────────────────────────────────
   26 cells of 10 units is 260 across, so the disc reaches 130 in every
   direction and REACH is inside it on the axes as well as in the corners.

   **Twice the blades' reach and a fifth of the stands'**, which is what a
   mote's own size decides rather than taste: at 0.3 units across it is four
   pixels at 40 units and one at 130, and a one-pixel additive dot in `--mint`
   over a violet landscape is exactly the "field of sparks" §27 measured and
   rejected for grass. Past the fade there is nothing standing in for them
   the way the ground's tint stands in for the blades — the air past 130
   units is simply empty, and it is empty in a way nobody can see, because
   what is there instead is a hundred and thirty units of fog. */
const CELL = 10;
const GRID = 26;
const PER = 4;
const COUNT = GRID * GRID * PER;

const REACH = 126;
const REACH_IN = 100;

/* ── And the near edge, which is a measurement ──────────────────────────
   A mote may be a metre from the eye: §24's floor holds the camera 6 units
   over the ground and a mote stands up to 15.6 above it, so at any low pose
   some of them are *behind* the reader's head and some are a hand's width
   in front of it. One that close is thirty degrees of frame in `--mint`, and
   §26's instrument found it immediately — the worst 12×12 block moved **9.95
   levels of luma in one sixtieth of a second** against the cloud deck's 1.13
   and the grass's 2.78, which is four times the fastest thing in the world.
   Nothing about the motion was wrong; what was wrong is that a point of
   light two units away is not a point.

   Faded out inside 8 units and gone by 3, which costs nothing: a mote that
   close is out of focus in every sense and the disc holds two thousand more
   behind it. */
const NEAR = 17;
const NEAR_OUT = 6;

/* Sampled at the level-0 spacing for §27's reason: the mesh under the camera
   is a level-0 chunk and that is the surface the reader sees. There is no
   SINK — a mote does not stand on the ground, it floats over it, and LOW is
   already further off the surface than the LOD error. */
const SAMPLE = 2;

/* ── How high ───────────────────────────────────────────────────────────
   A mote is born between LOW and HIGH over the surface and rises RISE
   further before it fades, so the layer occupies 0.6 to 15.6 units of air.
   §0.2 says "near the ground" and that is the whole constraint: a mote at
   forty units is a star with a colour problem, and one at half a unit is a
   reflection on the ground. */
const LOW = 0.6;
const HIGH = 9;
const RISE = 5.2;

/* ── The cycle ──────────────────────────────────────────────────────────
   **The hesitation is a term, not an easing.** The rise is `f(t) = t −
   (A / 2πk)·sin(2πkt)`, whose derivative is `1 − A·cos(2πkt)`: at A = 0.94
   and k = 3 the mote comes to within 6% of a stop three times on its way up
   and never quite stops, which is what "rise and hesitate" is and what an
   ease-in-out is not. The same `f` drives the downwind travel, so a mote
   hesitates in every axis at once — a pause that is only vertical reads as a
   lift rather than as an insect.

   **18 to 34 seconds a cycle, and the first build's 9 to 17 was measured
   and rejected.** §26's instrument — the worst 12×12 block of luma between
   two frames a sixtieth of a second apart — put the motes at **10.02 levels**
   against the cloud deck's 1.03 and the grass's 2.08, four times the fastest
   thing in the world. Nothing there was a band edge crawling; it is
   arithmetic about a point of light. A mote at the shortest period rose 1.4
   units a second, and 1.4 units a second at twenty units away is 0.066° a
   frame — a pixel — on a core that is four across. A dot that crosses its own
   width in four frames is a firefly on fast-forward, and this world's water
   was slowed down to belong in it.

   TRAVEL is 6 units downwind over the cycle, which is 0.24 units a second
   against the gust wave's 9: the motes agree with the wind about *direction*
   and disagree with it about speed by a factor of nearly forty, and that is
   the point — this is what is drifting in the air rather than what the air
   is doing. */
const PERIOD_LOW = 18;
const PERIOD_RANGE = 16;
const HESITATE_A = 0.94;
const HESITATE_K = 3;
const TRAVEL = 6;
const CROSS = 1.4;

/* Fade in over the first sixth of the cycle and out over the last. Anything
   shorter and the reset is a blink; anything longer and a mote spends its
   life at half brightness. */
const IN = 0.16;
const OUT = 0.84;

/* A slow brightness wander, and the rate is inside the band §26 and §27
   measured rather than beside it: 0.14 Hz is half the grass's flutter and
   four times the deck's advection. It is per mote — the one phase in this
   world that is deliberately not a function of position, because a field of
   lights pulsing in step is a string of them. */
const FLICKER_HZ = 0.14;
const FLICKER_LOW = 0.45;

/* ── How big and how bright ─────────────────────────────────────────────
   The quad is a world-space billboard, so a mote shrinks with distance the
   way everything else does. At 0.34 units it is five pixels at twenty units
   and one at a hundred and thirty, which is the whole range over which a
   point of light reads as a point of light rather than as noise.

   ALPHA is additive over `--void`, and this is the layer §0.2 says may be
   the brightest thing over the ground it is on. It is bounded by being
   *small*: a mote's brightest 12×12 block is mostly background, which is
   the measurement §4.7 makes and the reason a bright dot costs less than a
   dim wash. §38 owns the number. */
const SIZE_LOW = 0.24;
const SIZE_RANGE = 0.16;
const ALPHA = 0.52;

/* The same measurement `built.ts` makes, one layer over (§42). Additive over
   `--void` puts the whole of `--mint` on screen at ALPHA; alpha-blended it
   puts ALPHA of the way there. Measured at Enargeia's settle, the brightest
   mote is **+0.371** of relative luminance at night and the darkest is
   **−0.172** at day, which is a peak gain of 0.495 read two ways. 2.0 takes
   the day peak to 1 — a solid speck with the same two rings around it —
   and leaves the near fade, the far fade, the envelope, the flicker and the
   fog where they are. It cannot reach night's ratio and nothing can: a dark
   speck on ground at 0.45 is 2.3:1 where a lit one on 0.016 is 9:1, and
   that is the palette rather than the layer. */
const DAY_GAIN = 2;

/* Two hard rings rather than a gaussian: a soft blob is the one shape this
   world does not contain, and a core with a step down to a halo is the same
   decision the bands are. */
const CORE = 0.17;
const CORE_IN = 0.09;
const HALO = 0.42;
const HALO_IN = 0.2;
const HALO_LEVEL = 0.3;

/* ── How many ───────────────────────────────────────────────────────────
   §0.2's density rule is `air.ts` — denser over water and vegetation, sparse
   on bare rock — for the reason every placement rule in this world is its
   own module: it is a claim about the world, and a claim that can only be
   evaluated inside a material is one nobody can check. What is left here is
   the rejection, which is `blades.ts`'s and is per instance rather than per
   cell: thin air should be a few motes rather than four dim ones. */
const KEEP = 0.7;

/* §27's budget, and §27's argument for it: at cruise a column crossing is 26
   cells, so this is not a rate limit in flight — it is what bounds the frame
   after a jump, and 676 cells at 96 is seven frames of the air filling in. */
const BUDGET = 96;

const TAU = Math.PI * 2;

/* Probes on the four diagonals at 0.7 of the reach, which is §27's fix for a
   gate that is wrong beside a cliff. */
const PROBES = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

export function buildMotes(palette: Palette, time: UniformNode<'float', number>) {
  const geometry = quad();

  /* Where the mote is born, in world coordinates: the bottom of its own
     rise, already lifted off the ground. */
  const iPos = new Float32Array(COUNT * 3);
  /* Its size, where it is in its cycle, how fast that cycle runs, and one
     seed that carries the flicker phase and the cross-drift phase. Two uses
     of one hash, which does not show for `blades.ts`'s reason: what it buys
     is that no two motes beside each other are doing the same thing. */
  const iAim = new Float32Array(COUNT * 4);
  const aPos = new InstancedBufferAttribute(iPos, 3);
  const aAim = new InstancedBufferAttribute(iAim, 4);
  geometry.setAttribute('iPos', aPos);
  geometry.setAttribute('iAim', aAim);
  geometry.instanceCount = COUNT;

  /* ── The billboard basis ─────────────────────────────────────────────
     The camera's own right and up in world space, written once a frame.
     Everything else in this world is geometry with a facing of its own, so
     this is the first layer that has to be *turned* — and it is turned on
     the CPU rather than out of `cameraWorldMatrix` because six floats a
     frame is cheaper to read than a matrix column, and because a mote's
     quad has no other reason to know what a matrix is. */
  const camRight = uniform(new Vector3(1, 0, 0));
  const camUp = uniform(new Vector3(0, 1, 0));

  const material = new MeshBasicNodeMaterial({
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });

  /* Called by the palette's repaint, before the first frame and on every
     change of `data-theme`. `needsUpdate` is what rebuilds the pipeline; it
     is one hitch on a toggle and nothing at all in a flight. */
  const setDay = (day: boolean) => {
    const want = day ? NormalBlending : AdditiveBlending;
    if (material.blending === want) return;
    material.blending = want;
    material.needsUpdate = true;
  };

  const pos = attribute<'vec3'>('iPos', 'vec3');
  const aim = attribute<'vec4'>('iAim', 'vec4');
  const corner = attribute<'vec2'>('qOff', 'vec2');

  const size = aim.x;
  const seed = aim.w;

  /* Where in its life this mote is. `fract` rather than a modulo of a
     stored age: there is no state here at all, so a mote that leaves the
     disc and comes back is where it would have been. */
  const t = fract(time.mul(aim.z).add(aim.y));

  /* The rise, with the pauses in it. See HESITATE_A above — this is the
     integral of `1 − A·cos(2πkt)`, so both the height and the travel come
     from one evaluation of one sine. */
  const climb = t.sub(sin(t.mul(TAU * HESITATE_K)).mul(HESITATE_A / (TAU * HESITATE_K)));

  const along = vec3(WIND.x, 0, WIND.z).mul(climb.mul(TRAVEL));
  const across = vec3(WIND_PERP.x, 0, WIND_PERP.z).mul(
    sin(t.mul(TAU).add(seed.mul(TAU))).mul(CROSS),
  );
  const centre = pos.add(vec3(0, climb.mul(RISE), 0)).add(along).add(across);

  /* Scaled to nothing at the edge of the disc rather than clipped, which is
     the rule every camera-relative layer here follows (§27, §28). */
  const range = centre.sub(cameraPosition).length();
  const shrink = smoothstep(REACH, REACH_IN, range);
  const offset = camRight.mul(corner.x).add(camUp.mul(corner.y));
  material.positionNode = centre.add(offset.mul(size.mul(shrink)));

  /* The two rings, and then everything that dims one: born and dying, its
     own slow flicker, the edge of the disc, and the fog — which since §30
     also carries the murk, so a mote seen from inside a cloud goes with
     everything else. */
  const r = corner.length();
  const disc = smoothstep(HALO, HALO_IN, r).mul(HALO_LEVEL)
    .add(smoothstep(CORE, CORE_IN, r).mul(1 - HALO_LEVEL));
  const envelope = smoothstep(0, IN, t).mul(smoothstep(1, OUT, t));
  const flicker = mix(
    float(FLICKER_LOW),
    float(1),
    sin(time.mul(FLICKER_HZ * TAU).add(seed.mul(TAU * 3))).mul(0.5).add(0.5),
  );

  material.colorNode = palette.mint;
  material.opacityNode = disc
    .mul(envelope)
    .mul(flicker)
    .mul(shrink)
    .mul(smoothstep(NEAR_OUT, NEAR, range))
    .mul(fog(positionWorld, palette))
    .mul(ALPHA)
    .mul(mix(float(1), float(DAY_GAIN), palette.day))
    .clamp(0, 1);

  const mesh = new Mesh(geometry, material);
  // Instance positions are world coordinates and the geometry is one quad at
  // the origin, so there is nothing here to cull against.
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  mesh.visible = false;
  /* Additive, so it must not write depth and must still test — after the
     stars and after the cloud forms, which is what puts a mote in front of a
     lake and behind a ridge. */
  mesh.renderOrder = 3;

  /* ── The fill ────────────────────────────────────────────────────────
     §27's, unchanged in shape. A stale slot holds motes at their old cell's
     real world position, which is outside the disc by construction, so the
     fade takes them to nothing while the grid catches up. */
  const heldX = new Int32Array(GRID * GRID).fill(0x7fff_ffff);
  const heldZ = new Int32Array(GRID * GRID).fill(0x7fff_ffff);
  let cursor = 0;

  const stats = { cells: 0, ms: 0, worst: 0, worstCells: 0, stale: GRID * GRID };

  const PROBE = REACH * 0.7;

  function reachable(x: number, y: number, z: number) {
    if (y - height(x, z) < REACH) return true;
    for (const [ox, oz] of PROBES) {
      const dx = ox * PROBE * Math.SQRT1_2;
      const dz = oz * PROBE * Math.SQRT1_2;
      if (Math.hypot(dx, dz, y - height(x + dx, z + dz)) < REACH) return true;
    }
    return false;
  }

  function place(slot: number, ci: number, cj: number) {
    const cx = (ci + 0.5) * CELL;
    const cz = (cj + 0.5) * CELL;

    /* Four samples of the field: one for the surface and three inside
       `cover`. The duplicate is deliberate — `cover` is the one answer to
       "does anything grow here" and the whole point of §27's split is that
       nobody re-derives it. A mote is not a blade; it does not need the
       gradient, the range mask or the marched shadow, and paying one extra
       `height` to avoid keeping a second copy of the density rule is the
       cheap side of that trade. */
    const h = height(cx, cz, SAMPLE);
    const density = airAt(h, cover(cx, cz, SAMPLE));
    // Over a lake the air starts at the surface, not at the bed.
    const base = airBase(h);

    for (let k = 0; k < PER; k++) {
      const o = slot * PER + k;
      const p = k * 8;
      if (hash3(ci, cj, p) * KEEP >= density) {
        // A size of zero is two degenerate triangles, which is cheaper than
        // a branch and needs no second instance count.
        iAim[o * 4] = 0;
        continue;
      }
      iPos[o * 3] = (ci + hash3(ci, cj, p + 1)) * CELL;
      iPos[o * 3 + 1] = base + LOW + (HIGH - LOW) * hash3(ci, cj, p + 2);
      iPos[o * 3 + 2] = (cj + hash3(ci, cj, p + 3)) * CELL;
      iAim[o * 4] = SIZE_LOW + SIZE_RANGE * hash3(ci, cj, p + 4);
      iAim[o * 4 + 1] = hash3(ci, cj, p + 5);
      iAim[o * 4 + 2] = 1 / (PERIOD_LOW + PERIOD_RANGE * hash3(ci, cj, p + 6));
      iAim[o * 4 + 3] = hash3(ci, cj, p + 7);
    }
  }

  function update(camera: Camera, all = false) {
    /* Off the quaternion rather than off `matrixWorld`: the world matrix is
       composed by the renderer during the render that comes *after* this,
       so reading it here is reading the previous frame's pose — a quad
       turned one frame late, which at boost is a visible lean. `rotation`
       writes the quaternion the moment it is set, so this is the pose
       `camera.ts` decided this frame. */
    camRight.value.set(1, 0, 0).applyQuaternion(camera.quaternion);
    camUp.value.set(0, 1, 0).applyQuaternion(camera.quaternion);

    const p = camera.position;
    const visible = reachable(p.x, p.y, p.z);
    mesh.visible = visible;
    if (!visible) return;

    const started = performance.now();
    const i0 = Math.round(p.x / CELL) - GRID / 2;
    const j0 = Math.round(p.z / CELL) - GRID / 2;
    const budget = all ? GRID * GRID : BUDGET;

    let filled = 0;
    let stale = 0;
    let lo = GRID * GRID;
    let hi = 0;
    for (let n = 0; n < GRID * GRID; n++) {
      const slot = (cursor + n) % (GRID * GRID);
      const si = slot % GRID;
      const sj = (slot - si) / GRID;
      const ci = i0 + (((si - i0) % GRID) + GRID) % GRID;
      const cj = j0 + (((sj - j0) % GRID) + GRID) % GRID;
      if (heldX[slot] === ci && heldZ[slot] === cj) continue;
      if (filled >= budget) {
        stale++;
        continue;
      }
      place(slot, ci, cj);
      heldX[slot] = ci;
      heldZ[slot] = cj;
      filled++;
      lo = Math.min(lo, slot);
      hi = Math.max(hi, slot + 1);
      if (filled >= budget) cursor = (slot + 1) % (GRID * GRID);
    }

    if (filled) {
      const span = hi - lo;
      aPos.addUpdateRange(lo * PER * 3, span * PER * 3);
      aAim.addUpdateRange(lo * PER * 4, span * PER * 4);
      aPos.needsUpdate = true;
      aAim.needsUpdate = true;
    }

    const ms = performance.now() - started;
    stats.cells += filled;
    stats.ms += ms;
    if (ms > stats.worst) {
      stats.worst = ms;
      stats.worstCells = filled;
    }
    stats.stale = stale;
  }

  return {
    mesh,
    setDay,
    settle: (camera: Camera) => update(camera, true),
    update,
    stats,
    count: COUNT,
    /** How many slots are actually standing, which is what a harness reports
        against the density rule rather than against the buffer. */
    shown: () => {
      let n = 0;
      for (let i = 0; i < COUNT; i++) if (iAim[i * 4]! > 0) n++;
      return n;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

/* One quad, in a space where the corner offsets run ±0.5 and are the same
   two numbers the fragment shader measures its rings against. `position` is
   there because a geometry without one has no vertex count; every vertex of
   every mote is placed by `positionNode` out of the instance and this
   attribute, so its own values are never used. */
function quad(): InstancedBufferGeometry {
  const off = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);
  const position = new Float32Array(12);
  const index = new Uint16Array([0, 1, 2, 0, 2, 3]);

  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('qOff', new BufferAttribute(off, 2));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
}
