/* §0.2 — conifers and stone, standing on the ground `terrain.ts` draws.

   §0.2 asks for "instanced meshes, three or four variants each, one draw
   call per variant per chunk". Two of those three clauses survived the
   build and the third did not, for a reason §27 already found and this step
   only confirms.

   **It is a camera-relative grid, not a per-chunk buffer**, exactly as the
   blade disc is. A quadtree covers the same ground at four resolutions at
   once, so "the trees of this chunk" is not a well-defined set — a tree on a
   boundary belongs to a level-0 leaf, its level-1 parent standing in for it
   while it generates, and the level-2 chunk both were subdivided out of.
   Placing per leaf would draw it once, three times or not at all depending
   on which of them happens to be visible. A world-fixed cell owned by
   nothing has none of that, it costs one draw call per species rather than
   one per variant per chunk, and it is a construction that is already
   measured (§27).

   **And the variants are per instance rather than three or four of them.**
   A conifer here is a trunk and two cones — §0.2's own "a silhouette is a
   cone and a trunk" — and what makes one tree different from the next is its
   height, how broad it is against that height and which way it is turned,
   all of which are three floats in the instance rather than a second
   geometry. So there are more shapes than four and fewer draw calls than
   eight. A boulder is the same argument with three half-axes instead of one
   width.

   ── What this file may and may not know ────────────────────────────────
   Placement is `scatter.ts` and is a pure function of the cell (§0.2), which
   is what lets the worker bake the shade under a conifer without this file
   telling it where any tree is. What is *here* is the part that needs a GPU
   and the part that needs the drawn surface: a tree stands on the ground the
   reader sees, and only `height.ts` on this thread knows where that is. */

import {
  BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  MeshBasicNodeMaterial,
  type Camera,
} from 'three/webgpu';
import {
  attribute,
  cameraPosition,
  cos,
  float,
  mix,
  positionLocal,
  positionWorld,
  sin,
  smoothstep,
  vec2,
  vec3,
} from 'three/tsl';
import type Node from 'three/src/nodes/core/Node.js';
import type UniformNode from 'three/src/nodes/core/UniformNode.js';
import { CAST, bands } from './band';
import { sunlight } from './chunk';
import { fog } from './fog';
import { WATER, height } from './height';
import type { Palette } from './palette';
import {
  CELL,
  ROCKS,
  TREES,
  boulder,
  conifer,
  groundAt,
  rockClump,
  rockDensity,
  treeClump,
  treeDensity,
} from './scatter';
import { haze } from './sky';
import { SUN } from './sun';
import {
  GUST_AMP,
  GUST_BASE,
  GUST_LENGTH,
  GUST_SPEED,
  WANDER,
  WANDER_LENGTH,
  WANDER_PERIOD,
  WIND,
  WIND_PERP,
} from './wind';

/* ── The grid ───────────────────────────────────────────────────────────
   76 cells of `scatter.ts`'s 16 units is 1,216 across, so the disc reaches
   608 in every direction and both reaches below are inside it on the axes as
   well as in the corners.

   **It is six times the blade disc's reach, and that is the difference
   between cover and furniture.** Grass past sixty units is sub-pixel and the
   ground's own tint carries it (§27); a conifer is twelve units tall, which
   is thirty pixels at three hundred and still ten at a thousand, and §28's
   own test — that you can see where the forest stops from above — is a test
   about the middle distance rather than the near field. The cruise pose is
   190 units over the ground and the trees are drawn there; the blades are
   not.

   **608 is a measurement and 370 was not enough of one.** The first build
   reached 370 and put no tree at all in the opening frame, which is the pose
   the whole world is composed against: at 190 units up and 9° of pitch the
   bottom edge of the frame is 39° below the horizon, so the nearest ground
   anybody can see is 246 units away horizontally and 315 along the view —
   past where a 370-unit disc has already faded everything to nothing. The
   number a camera-relative layer has to be sized against is not how far you
   can see, it is **where the near edge of the frame lands**, and at cruise
   altitude that is most of the way to the old reach. */
const GRID = 76;
const CELLS = GRID * GRID;
const TREE_COUNT = CELLS * TREES;
const ROCK_COUNT = CELLS * ROCKS;

/* Where each species shrinks into the ground rather than being clipped out
   of the frame — §0.2's rule, and §27's construction for it. Stone gets less
   reach than the conifers because it is an order of magnitude smaller: a
   four-unit boulder is eight pixels at 420 units where a twelve-unit tree is
   still fifteen at 590. It is not the near field only — §0.2 wants stone
   because it "reads at every distance and does not need a treeline", and a
   scree slope at four hundred units is texture on the slope rather than
   objects on it, which is exactly what scree is.

   The fade band is a fifth of the reach either way, which at boost is about
   half a second of travel. */
const TREE_REACH = 590;
const TREE_REACH_IN = 472;
const ROCK_REACH = 420;
const ROCK_REACH_IN = 336;

/* ── Standing on the drawn ground, not on the field ────────────────────
   §27's SAMPLE and its reason: the mesh under the camera is a level-0 chunk
   sampling at 2, so that is the surface the reader sees and the surface a
   root has to be under. SINK is deeper than a blade's because these reach
   past level 0 — a chunk drawn at level 2 samples at 8 and is up to a couple
   of units off the field, and a trunk hanging in the air is worse at any
   distance than a trunk a little too deep. */
const SAMPLE = 2;
const TREE_SINK = 0.5;
const ROCK_SINK = 0.25;

/** How much of its own vertical half-axis a boulder's centre is lifted above
    the ground. Small, because the visible half is the top: at 0.12 about
    forty per cent of the stone is under the surface, which is what stops one
    sitting on a slope like a dropped object. */
const ROCK_LIFT = 0.12;

/* ── Why an object's light is compressed ───────────────────────────────
   **The bands are placed around flat ground and these are not flat ground.**
   `sun.ts` puts the key light 32° up so a level surface sits at `N·L` 0.52,
   and `band.ts` puts its two edges at 0.64 and 0.90 — which is a 14° tilt to
   leave the low band and 38° to reach the top. A cone standing upright has
   facets at every angle: its sunward face is at 0.99 and the one next to it
   at 0.10, so the same three bands are *four* bands across one tree.
   Measured on the first build, and it is not subtle — the conifers came back
   as a field of white spikes and the boulders as white confetti, both of them
   the brightest things in the frame by a distance.

   So an object's own `N·L` is mapped into a range instead of used raw, and
   the range is what decides how much of it crosses an edge. A conifer spans
   `--void-lift` to a lit face just inside the middle band; a boulder spans
   the ground's own two, because stone is what the ground is made of. The
   marched shadow is untouched by this — it still takes a tree in a valley
   down toward the floor of the world, exactly as it takes the ground. */
const TREE_DARK = 0.05;
const TREE_LIGHT = 0.86;
const ROCK_DARK = 0.3;
const ROCK_LIGHT = 0.84;

/* ── How a canopy reads the wind ────────────────────────────────────────
   §0.2: "trees sway at the canopy" and "one field so they agree". So this is
   the **same gust wave the grass reads**, at the same 0.075 Hz, with the
   same wander across it — nothing is added to the spectrum §26 and §27
   measured, because a second rate in the frame is exactly the thing one
   field exists to prevent.

   What is per tree is stiffness, not phase. A phase offset would be the
   tempting way to stop a stand moving as one object, and it is wrong: it
   destroys the travelling band, which is the only thing that makes a gust
   read as *wind* rather than as a pulse. Different amounts of the same lean
   keeps the band and breaks the rigidity.

   SWAY is a twentieth of the tree's height at the tip against a blade's
   0.42, because a conifer is wood. Amplitude by the square of the height
   along the trunk (§0.2: "a trunk is still and a canopy is not"), which is
   the shape a cantilever bends in and the same expression `blades.ts`
   uses. */
const SWAY = 0.05;
const STIFF_LOW = 0.6;
const STIFF_RANGE = 0.8;

/* Cells refilled per frame. A diagonal crossing at boost is 24 cells, so
   this is not a rate limit in flight; it is what bounds the frame after a
   jump, and 5,776 cells at 128 is 45 frames of the world filling in. */
const BUDGET = 128;

const TAU = Math.PI * 2;

/* Probes at 0.7 of the reach on the four diagonals, which is §27's fix for a
   gate that is wrong beside a cliff: ground at the camera's own altitude two
   hundred units away is inside the layer while the sample directly under it
   says four hundred, and a gate that could not see it would take ten
   thousand instances off the frame in one frame. */
const PROBES = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

function nearestGround(x: number, y: number, z: number, probe: number): number {
  let best = y - height(x, z);
  for (const [ox, oz] of PROBES) {
    const dx = ox * probe * Math.SQRT1_2;
    const dz = oz * probe * Math.SQRT1_2;
    const d = Math.hypot(dx, dz, y - height(x + dx, z + dz));
    if (d < best) best = d;
  }
  return best;
}

export function buildStands(palette: Palette, time: UniformNode<'float', number>) {
  /* ── The instance buffers ───────────────────────────────────────────
     Both species carry a world root, four shape numbers and two more, and
     the last of the four is the same in both: how much of the key light the
     marched shadow says reaches this cell. That is what puts a tree in the
     shade its own valley is in — the ground under it is banded by the same
     scalar (§23), and an object lit as if the ridge above it were not there
     is the decal §0.2 warns about from the other direction. */
  const tPos = new Float32Array(TREE_COUNT * 3);
  /* Height, the two halves of the yaw, and the canopy's radius as a fraction
     of that height. The yaw is stored as its cosine and sine because the
     rotation is 2D and an angle would be two trig calls per vertex. */
  const tAim = new Float32Array(TREE_COUNT * 4);
  /* The cell's light, and this tree's own stiffness in the gust. */
  const tVar = new Float32Array(TREE_COUNT * 2);
  const rPos = new Float32Array(ROCK_COUNT * 3);
  /* Three half-axes and the cell's light. */
  const rAim = new Float32Array(ROCK_COUNT * 4);
  const rTurn = new Float32Array(ROCK_COUNT * 2);

  const trees = coniferGeometry();
  const aTreePos = new InstancedBufferAttribute(tPos, 3);
  const aTreeAim = new InstancedBufferAttribute(tAim, 4);
  const aTreeVar = new InstancedBufferAttribute(tVar, 2);
  trees.setAttribute('iPos', aTreePos);
  trees.setAttribute('iAim', aTreeAim);
  trees.setAttribute('iVar', aTreeVar);
  trees.instanceCount = TREE_COUNT;

  const rocks = boulderGeometry();
  const aRockPos = new InstancedBufferAttribute(rPos, 3);
  const aRockAim = new InstancedBufferAttribute(rAim, 4);
  const aRockTurn = new InstancedBufferAttribute(rTurn, 2);
  rocks.setAttribute('iPos', aRockPos);
  rocks.setAttribute('iAim', aRockAim);
  rocks.setAttribute('iTurn', aRockTurn);
  rocks.instanceCount = ROCK_COUNT;

  const sun = vec3(SUN.x, SUN.y, SUN.z);

  /* Both materials end the same way and it is `terrain.ts`'s ending: band
     the lighting term through `band.ts`, then mix toward the sky in the
     direction being looked at rather than toward --void, so a conifer on a
     far ridge arrives at the same colour the ridge does. No rim: the rim is
     what draws a ridgeline (§23), and a rim on a four-unit boulder is a
     bright speck — which is `--leader` spent on nothing, against a rule
     (§2) that says the colour means state. */
  const shade = (
    material: MeshBasicNodeMaterial,
    normal: Node<'vec3'>,
    lit: Node<'float'>,
    step: -1 | 0,
    dark: number,
    light: number,
  ) => {
    const toEye = cameraPosition.sub(positionWorld).normalize();
    const lum = mix(float(dark), float(light), normal.dot(sun).max(0)).mul(
      mix(float(1 - CAST), 1, lit),
    );
    const depth = fog(positionWorld, palette);
    material.colorNode = mix(haze(toEye, palette), bands(lum, palette, step), depth);
  };

  /* ── The conifers ────────────────────────────────────────────────────
     The geometry is a unit tree: y from 0 at the root to 1 at the tip, x and
     z in units of the canopy's own base radius. So one instance is a scale
     by (h·w, h, h·w), a yaw and a translation — and the whole thing shrinking
     to nothing at the edge of the disc is that same scale going to zero,
     which is why the root is the instance position and not the centre. */
  const treeMaterial = new MeshBasicNodeMaterial({ fog: false });
  {
    const pos = attribute<'vec3'>('iPos', 'vec3');
    const aim = attribute<'vec4'>('iAim', 'vec4');
    const vary = attribute<'vec2'>('iVar', 'vec2');
    const h = aim.x;
    const c = aim.y;
    const s = aim.z;
    const w = aim.w;

    const ground = vec2(pos.x, pos.z);
    const along = ground.dot(vec2(WIND.x, WIND.z));
    const across = ground.dot(vec2(WIND_PERP.x, WIND_PERP.z));
    const gust = sin(along.sub(time.mul(GUST_SPEED)).div(GUST_LENGTH).mul(TAU));
    const wander = sin(
      across.div(WANDER_LENGTH).sub(time.div(WANDER_PERIOD)).mul(TAU),
    ).mul(WANDER);
    const strength = float(GUST_BASE)
      .add(gust.mul(GUST_AMP))
      .mul(vary.y.mul(STIFF_RANGE).add(STIFF_LOW));
    const lean = vec3(WIND.x, 0, WIND.z)
      .mul(cos(wander))
      .add(vec3(WIND_PERP.x, 0, WIND_PERP.z).mul(sin(wander)))
      .mul(strength.mul(SWAY));

    const lx = positionLocal.x.mul(w);
    const lz = positionLocal.z.mul(w);
    const up = positionLocal.y;
    const shape = vec3(lx.mul(c).sub(lz.mul(s)), up, lx.mul(s).add(lz.mul(c)))
      .add(lean.mul(up.mul(up)));
    const shrink = smoothstep(TREE_REACH, TREE_REACH_IN, pos.sub(cameraPosition).length());
    treeMaterial.positionNode = pos.add(shape.mul(h.mul(shrink)));

    /* The baked normal under that scale. A non-uniform scale takes the
       inverse on a normal, and here the inverse is exact and free: the
       vertical factor is the tree's height and the two horizontal ones are
       its height times its width, so what is left after dividing through by
       the height is one division by the width. */
    const n = attribute<'vec3'>('normal', 'vec3');
    // Floored, because a rejected slot is an instance whose every scale is
    // zero and a NaN normal on a degenerate triangle is a fact about the
    // driver rather than about this file.
    const nw = w.max(1e-4);
    const ns = vec3(n.x.div(nw), n.y, n.z.div(nw)).normalize();
    shade(
      treeMaterial,
      vec3(ns.x.mul(c).sub(ns.z.mul(s)), ns.y, ns.x.mul(s).add(ns.z.mul(c))),
      vary.x,
      -1,
      TREE_DARK,
      TREE_LIGHT,
    );
  }

  /* ── The stone ───────────────────────────────────────────────────────
     Twenty-four flat faces and three half-axes, which is the whole of the
     variant argument: one lump of stone scaled between 0.2 and 4 on each
     axis apart is a slab, a boulder and a standing stone, and what tells
     them apart at these sizes is the facets rather than the outline. No
     wind, for the obvious reason. */
  const rockMaterial = new MeshBasicNodeMaterial({ fog: false });
  {
    const pos = attribute<'vec3'>('iPos', 'vec3');
    const aim = attribute<'vec4'>('iAim', 'vec4');
    const turn = attribute<'vec2'>('iTurn', 'vec2');
    const c = turn.x;
    const s = turn.y;

    const p = positionLocal.mul(vec3(aim.x, aim.y, aim.z));
    const shape = vec3(
      p.x.mul(c).sub(p.z.mul(s)),
      p.y.add(aim.y.mul(ROCK_LIFT)),
      p.x.mul(s).add(p.z.mul(c)),
    );
    const shrink = smoothstep(ROCK_REACH, ROCK_REACH_IN, pos.sub(cameraPosition).length());
    rockMaterial.positionNode = pos.add(shape.mul(shrink));

    const n = attribute<'vec3'>('normal', 'vec3');
    const ns = vec3(
      n.x.div(aim.x.max(1e-4)),
      n.y.div(aim.y.max(1e-4)),
      n.z.div(aim.z.max(1e-4)),
    ).normalize();
    shade(
      rockMaterial,
      vec3(ns.x.mul(c).sub(ns.z.mul(s)), ns.y, ns.x.mul(s).add(ns.z.mul(c))),
      aim.w,
      0,
      ROCK_DARK,
      ROCK_LIGHT,
    );
  }

  const treeMesh = new Mesh(trees, treeMaterial);
  const rockMesh = new Mesh(rocks, rockMaterial);
  for (const mesh of [treeMesh, rockMesh]) {
    // Instance positions are world coordinates and the geometry's own bounds
    // are one object at the origin, so there is nothing here to cull against.
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    mesh.visible = false;
  }

  /* ── The fill ────────────────────────────────────────────────────────
     §27's, unchanged in shape: which world cell each slot currently holds,
     refilled only when the cell it should hold moves, walked from wherever
     the last frame stopped and stopped again at BUDGET. A stale slot holds
     objects at their old cell's real world position, which is outside the
     disc by construction, so the fade scales them to nothing and nothing
     wrong is ever drawn while the grid catches up. */
  const heldX = new Int32Array(CELLS).fill(0x7fff_ffff);
  const heldZ = new Int32Array(CELLS).fill(0x7fff_ffff);
  let cursor = 0;

  const stats = {
    cells: 0,
    marches: 0,
    ms: 0,
    worst: 0,
    worstCells: 0,
    stale: CELLS,
  };

  const out = new Float32Array(6);

  function place(slot: number, ci: number, cj: number) {
    const cx = (ci + 0.5) * CELL;
    const cz = (cj + 0.5) * CELL;

    /* Both clumps first, and neither of them touches the field: two thirds
       of the world is outside both a forest and a scree field, and those
       cells cost two noises rather than the five samples and a march below.
       It is the same early-out the worker uses to afford baking the shade. */
    const tc = treeClump(cx, cz);
    const rc = rockClump(cx, cz);
    let tree = 0;
    let rock = 0;
    let lit = 0;
    if (tc > 0 || rc > 0) {
      const g = groundAt(cx, cz);
      tree = tc > 0 ? treeDensity(g, tc) : 0;
      rock = rc > 0 ? rockDensity(g, rc, cx, cz) : 0;
      if (tree > 0 || rock > 0) {
        /* The same march `chunk.ts` bakes into the ground, from the same
           coarse surface — which `groundAt` has already sampled, so this is
           the march and not the sample under it. */
        lit = sunlight(cx, cz, g.h);
        stats.marches++;
      }
    }

    for (let k = 0; k < TREES; k++) {
      const o = slot * TREES + k;
      // A height of zero is a tree with no length: eighteen degenerate
      // triangles, which is cheaper than a branch and needs no second count.
      if (tree <= 0 || !conifer(ci, cj, k, tree, out)) {
        tAim[o * 4] = 0;
        continue;
      }
      tPos[o * 3] = out[0]!;
      tPos[o * 3 + 1] = height(out[0]!, out[1]!, SAMPLE) - TREE_SINK;
      tPos[o * 3 + 2] = out[1]!;
      tAim[o * 4] = out[2]!;
      tAim[o * 4 + 1] = Math.cos(out[4]!);
      tAim[o * 4 + 2] = Math.sin(out[4]!);
      tAim[o * 4 + 3] = out[3]!;
      tVar[o * 2] = lit;
      tVar[o * 2 + 1] = out[5]!;
    }

    for (let k = 0; k < ROCKS; k++) {
      const o = slot * ROCKS + k;
      if (rock <= 0 || !boulder(ci, cj, k, rock, out)) {
        rAim[o * 4] = 0;
        rAim[o * 4 + 1] = 0;
        rAim[o * 4 + 2] = 0;
        continue;
      }
      const y = height(out[0]!, out[1]!, SAMPLE);
      /* The drawn surface rather than the coarse one the density was decided
         on, so this is the one place a boulder can turn out to be under the
         water after all. Nothing bakes a rock, so the two ends cannot
         disagree about it and the test is free. */
      if (y < WATER) {
        rAim[o * 4] = 0;
        rAim[o * 4 + 1] = 0;
        rAim[o * 4 + 2] = 0;
        continue;
      }
      rPos[o * 3] = out[0]!;
      rPos[o * 3 + 1] = y - ROCK_SINK;
      rPos[o * 3 + 2] = out[1]!;
      rAim[o * 4] = out[2]!;
      rAim[o * 4 + 1] = out[3]!;
      rAim[o * 4 + 2] = out[4]!;
      rAim[o * 4 + 3] = lit;
      rTurn[o * 2] = Math.cos(out[5]!);
      rTurn[o * 2 + 1] = Math.sin(out[5]!);
    }
  }

  function update(camera: Camera, all = false) {
    const p = camera.position;
    const near = nearestGround(p.x, p.y, p.z, TREE_REACH * 0.7);
    treeMesh.visible = near < TREE_REACH;
    rockMesh.visible =
      treeMesh.visible && nearestGround(p.x, p.y, p.z, ROCK_REACH * 0.7) < ROCK_REACH;
    if (!treeMesh.visible) return;

    const started = performance.now();
    const i0 = Math.round(p.x / CELL) - GRID / 2;
    const j0 = Math.round(p.z / CELL) - GRID / 2;
    const budget = all ? CELLS : BUDGET;

    let filled = 0;
    let stale = 0;
    let lo = CELLS;
    let hi = 0;
    for (let n = 0; n < CELLS; n++) {
      const slot = (cursor + n) % CELLS;
      const si = slot % GRID;
      const sj = (slot - si) / GRID;
      // The cell this slot stands for: the one inside the grid's current
      // square whose coordinate is congruent to the slot's, which is what
      // makes the mapping toroidal and the fill a ring.
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
      if (filled >= budget) cursor = (slot + 1) % CELLS;
    }

    if (filled) {
      // One merged range per buffer, for §27's reason: a column of cells is
      // contiguous and a row is strided by the whole grid, so merging is
      // either exact or the whole buffer.
      const span = hi - lo;
      aTreePos.addUpdateRange(lo * TREES * 3, span * TREES * 3);
      aTreeAim.addUpdateRange(lo * TREES * 4, span * TREES * 4);
      aTreeVar.addUpdateRange(lo * TREES * 2, span * TREES * 2);
      aRockPos.addUpdateRange(lo * ROCKS * 3, span * ROCKS * 3);
      aRockAim.addUpdateRange(lo * ROCKS * 4, span * ROCKS * 4);
      aRockTurn.addUpdateRange(lo * ROCKS * 2, span * ROCKS * 2);
      for (const a of [aTreePos, aTreeAim, aTreeVar, aRockPos, aRockAim, aRockTurn]) {
        a.needsUpdate = true;
      }
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
    treeMesh,
    rockMesh,
    settle: (camera: Camera) => update(camera, true),
    update,
    stats,
    counts: () => {
      let trees = 0;
      let rocks = 0;
      for (let i = 0; i < TREE_COUNT; i++) if (tAim[i * 4]! > 0) trees++;
      for (let i = 0; i < ROCK_COUNT; i++) if (rAim[i * 4]! > 0) rocks++;
      return { trees, rocks, slots: { trees: TREE_COUNT, rocks: ROCK_COUNT } };
    },
    dispose: () => {
      trees.dispose();
      rocks.dispose();
      treeMaterial.dispose();
      rockMaterial.dispose();
    },
  };
}

/* ── One conifer ────────────────────────────────────────────────────────
   A trunk and two cones, in a unit space where y runs 0 at the root to 1 at
   the tip and x, z are in units of the canopy's base radius. Six sides a
   cone and three a trunk: eighteen triangles, and at the distance the
   nearest of these is ever seen that is a silhouette with facets in it
   rather than a shape you can count the sides of.

   **Non-indexed and flat-shaded**, which is the whole reason it reads. A
   smooth normal around a six-sided cone is a gradient, and a gradient under
   a hard band edge is one band with a wobble in it; six flat faces are six
   decisions, and about half of them are on the other side of the terminator
   from the rest. That is what makes a cel-shaded tree look like a tree.

   The two cones overlap on purpose: the lower one's top is inside the upper
   one's base, so the join is a step in the silhouette rather than a seam. */
const CONE_SIDES = 6;
const TRUNK_SIDES = 3;
const TRUNK_R = 0.16;
const TRUNK_TOP = 0.34;
const LOWER = { y0: 0.24, y1: 0.74, r: 1 };
const UPPER = { y0: 0.6, y1: 1, r: 0.6 };

function coniferGeometry(): InstancedBufferGeometry {
  const position: number[] = [];
  const normal: number[] = [];

  const cone = (y0: number, y1: number, r: number, sides: number) => {
    for (let k = 0; k < sides; k++) {
      const a0 = (k / sides) * Math.PI * 2;
      const a1 = ((k + 1) / sides) * Math.PI * 2;
      face(
        position,
        normal,
        [Math.cos(a0) * r, y0, Math.sin(a0) * r],
        [Math.cos(a1) * r, y0, Math.sin(a1) * r],
        [0, y1, 0],
      );
    }
  };

  for (let k = 0; k < TRUNK_SIDES; k++) {
    const a0 = (k / TRUNK_SIDES) * Math.PI * 2;
    const a1 = ((k + 1) / TRUNK_SIDES) * Math.PI * 2;
    const p0 = [Math.cos(a0) * TRUNK_R, 0, Math.sin(a0) * TRUNK_R] as const;
    const p1 = [Math.cos(a1) * TRUNK_R, 0, Math.sin(a1) * TRUNK_R] as const;
    face(position, normal, p0, p1, [p1[0], TRUNK_TOP, p1[2]]);
    face(position, normal, p0, [p1[0], TRUNK_TOP, p1[2]], [p0[0], TRUNK_TOP, p0[2]]);
  }
  cone(LOWER.y0, LOWER.y1, LOWER.r, CONE_SIDES);
  cone(UPPER.y0, UPPER.y1, UPPER.r, CONE_SIDES);

  return assemble(position, normal);
}

/* ── One boulder ────────────────────────────────────────────────────────
   Two rings and two poles: six faces on the top, six on the bottom and a
   twelve-triangle belt between them, every vertex pulled off the sphere by a
   fixed amount. Twenty-four flat faces where the first build had eight — and
   that is a measurement rather than a refinement. An octahedron scaled three
   ways is a **rhombus** from every angle, and a slope of them came back as a
   scatter of floating crystals; what makes a lump of stone read is that its
   outline has more corners than its shading has bands.

   Irregular here rather than per instance: the three half-axes in the
   instance already give the proportions, and a shape that is asymmetric
   *before* it is scaled is what stops a field of them reading as one object
   at different sizes. */
const ROCK_SIDES = 6;
const ROCK_RINGS = [
  { y: 0.36, r: 0.88, turn: 0.08 },
  { y: -0.3, r: 0.96, turn: 0.5 },
];

/* Deterministic and tiny: the lump has to be the same lump in every instance
   of it, and a random at module scope would still be one shape — it would
   just be a different one on every reload, which is a thing to notice in a
   screenshot diff and never in the world. */
const wobble = (n: number) => (Math.sin(n * 12.9898) * 43758.5453) % 1;

function boulderGeometry(): InstancedBufferGeometry {
  const position: number[] = [];
  const normal: number[] = [];
  const ring = (index: number) => {
    const spec = ROCK_RINGS[index]!;
    const out: (readonly number[])[] = [];
    for (let k = 0; k < ROCK_SIDES; k++) {
      const a = ((k + spec.turn) / ROCK_SIDES) * Math.PI * 2;
      const r = spec.r * (0.82 + 0.3 * wobble(index * 7 + k));
      out.push([Math.cos(a) * r, spec.y + 0.18 * wobble(index * 13 + k + 3), Math.sin(a) * r]);
    }
    return out;
  };

  const top = [0.08, 0.94, -0.06] as const;
  const bottom = [-0.05, -0.92, 0.09] as const;
  const upper = ring(0);
  const lower = ring(1);
  for (let k = 0; k < ROCK_SIDES; k++) {
    const k1 = (k + 1) % ROCK_SIDES;
    face(position, normal, top, upper[k]!, upper[k1]!);
    face(position, normal, upper[k]!, lower[k]!, upper[k1]!);
    face(position, normal, upper[k1]!, lower[k]!, lower[k1]!);
    face(position, normal, bottom, lower[k1]!, lower[k]!);
  }
  return assemble(position, normal);
}

/** One flat triangle, wound so its face points away from the origin. Every
    shape here is a star domain around its own axis, so "outward" is the
    dot with the centroid and the winding is fixed rather than reasoned
    about at each call. */
function face(
  position: number[],
  normal: number[],
  a: readonly number[],
  b: readonly number[],
  c: readonly number[],
) {
  const ux = b[0]! - a[0]!;
  const uy = b[1]! - a[1]!;
  const uz = b[2]! - a[2]!;
  const vx = c[0]! - a[0]!;
  const vy = c[1]! - a[1]!;
  const vz = c[2]! - a[2]!;
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const cx = (a[0]! + b[0]! + c[0]!) / 3;
  const cz = (a[2]! + b[2]! + c[2]!) / 3;
  const flip = nx * cx + nz * cz < 0;
  if (flip) {
    nx = -nx;
    ny = -ny;
    nz = -nz;
  }
  const len = Math.hypot(nx, ny, nz) || 1;
  const tri = flip ? [a, c, b] : [a, b, c];
  for (const p of tri) {
    position.push(p[0]!, p[1]!, p[2]!);
    normal.push(nx / len, ny / len, nz / len);
  }
}

function assemble(position: number[], normal: number[]): InstancedBufferGeometry {
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(position), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normal), 3));
  return geometry;
}
