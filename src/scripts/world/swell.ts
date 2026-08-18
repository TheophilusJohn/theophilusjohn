/* §34 — the ground under Homonoia, on the GPU.

   `height.ts` owns the arithmetic and says why the election may not be part
   of the field: the workers bake the surface, its normals, the marched
   shadow, the cover density and `scatter.ts`'s answer to where a conifer
   stands, and all five have to be a pure function of (x, z) or a term ending
   means regenerating six hundred units of world and re-baking the shade
   under trees that have moved. So the field never moves and the *deviation*
   is carried here instead — one term added to the terrain's vertex position,
   with its own analytic normal, and the same term lifting everything that
   stands on the ground.

   **One place, three readers.** `terrain.ts` displaces the surface,
   `built.ts` lifts the pylon standing on a rising summit, and §24's floor
   adds it in JS so the camera cannot be swallowed by one. The last of those
   is why `setSwell` writes both sides from one call — the uniform the GPU
   reads and the array `height.ts` keeps for the floor.

   **What grows on it is not a reader, and that is measured.** `blades.ts`
   and `stands.ts` had the lift too, which is the obviously correct thing:
   grass and conifers stand *on* ground that moves. It cost **0.22 ms a
   frame at every pose in the world** — a gated branch in a vertex shader
   still costs the branch, and `stands.ts` runs one per vertex of twenty
   thousand instances on a 608-unit disc. What it bought was **twelve
   conifers and no grass at all**: `coverAt` is zero over the whole
   footprint. So `scatter.ts` clears the twelve instead, which is free and is
   the picture the massif already had.

   **Everything left is gated.** Five exponentials per vertex over three
   hundred thousand terrain vertices is not free, and outside 306 units the
   term is under a twentieth of a unit. The terrain's gate is a per-chunk
   uniform and the branch is coherent by construction: a chunk is either in
   the massif or nowhere near it. */

import { Fn, If, exp, float, uniform, uniformArray, vec2, vec3 } from 'three/tsl';
import type Node from 'three/src/nodes/core/Node.js';
import {
  CLUSTER_NODES,
  CLUSTER_SITE,
  SWELL_AMP,
  SWELL_REACH,
  SWELL_SIGMA,
  clusterNode,
  setShares,
} from './height';

/** The five deviations, already `share − 1/N`, so the shader does no
    arithmetic the CPU could have done once. Zero across the board is an idle
    cluster and is exactly what every worker has baked. A `uniformArray` is
    `NodeUpdateType.RENDER`, so writing the plain array is the whole update —
    there is no dirty flag to forget. */
const weights = uniformArray(new Array<number>(CLUSTER_NODES).fill(0), 'float');

/* Where the five stand, flattened to 2N floats. Constant for the life of the
   page — it is the field's own ring — but read from `height.ts` rather than
   written out here, because the ground and the pylon standing on it agree
   only if there is one answer to "where is node i". */
const sites = uniformArray(
  Array.from({ length: CLUSTER_NODES * 2 }, (_, k) => {
    const n = clusterNode(k >> 1);
    return k % 2 === 0 ? n.x : n.z;
  }),
  'float',
);

/** Written once a frame by `scene.ts` from `consensus.ts`. Both halves, so
    the ground the camera stands on and the ground it is looking at are the
    same ground. */
export function setSwell(shares: ArrayLike<number>): void {
  setShares(shares);
  for (let i = 0; i < CLUSTER_NODES; i++) {
    weights.array[i] = (shares[i] ?? 0) - 1 / CLUSTER_NODES;
  }
}

/* `uniformArray(...).element()` comes back as `Node<string>` from the type
   definitions — the element type is not carried through — so every read of
   one needs a cast. One helper rather than a cast at each of the six call
   sites, and it is the only `as unknown` in the file. */
const at = (arr: ReturnType<typeof uniformArray>, i: unknown): Node<'float'> =>
  arr.element(i as never) as unknown as Node<'float'>;

const TWO_SIGMA2 = 2 * SWELL_SIGMA * SWELL_SIGMA;
const SIGMA2 = SWELL_SIGMA * SWELL_SIGMA;

/* How far the ground at a world (x, z) is from where the worker baked it,
   and the gradient of that, in one pass — the gradient is the analytic
    derivative of the same five exponentials, so it costs two multiplies per
    node rather than a second evaluation.

   Returns `vec3(lift, ∂lift/∂x, ∂lift/∂z)`. Not exported: the two gated
   wrappers below are the whole surface, because an ungated caller is a
   caller paying five exponentials everywhere in the world. */
const swellAt = /*#__PURE__*/ Fn(([p]: [Node<'vec2'>]) => {
  const out = vec3(0, 0, 0).toVar();
  for (let i = 0; i < CLUSTER_NODES; i++) {
    const d = p.sub(vec2(at(sites, i * 2), at(sites, i * 2 + 1)));
    const g = exp(d.dot(d).div(-TWO_SIGMA2)).mul(at(weights, i)).mul(SWELL_AMP);
    out.addAssign(vec3(g, g.mul(d.x).div(-SIGMA2), g.mul(d.y).div(-SIGMA2)));
  }
  return out;
});

/** The lift and its gradient, gated — the terrain's own reader.

    **Wrapped in `Fn` because `If` needs a shader stack**: called bare in a
    material's node graph there is no block to add the branch to and the
    build fails with `Cannot read properties of null (reading 'If')`, at
    mount, which in world-first is a page that never comes out from behind
    the curtain. */
export const swellGated = /*#__PURE__*/ Fn(([p, near]: [Node<'vec2'>, Node<'float'>]) => {
  const out = vec3(0, 0, 0).toVar();
  If(near.greaterThan(0.5), () => {
    out.assign(swellAt(p));
  });
  return out;
});

/** The lift alone, gated, for anything that stands on the ground rather than
    being it: a blade, a conifer, a boulder, a pylon. Evaluated once at the
    object's *base* and applied rigidly, never per vertex — a twelve-unit
    tree on a moving summit would otherwise shear.

    **Two gates, and the second one is the one that matters.** The uniform is
    the caller's per-frame answer to "could anything in my disc be in the
    massif at all", and it has to be generous: `stands.ts` draws to 608 units,
    so it is true for any camera within 914 of the site — which is true at
    *Enargeia*, a station a kilometre away. Gated on that alone, every one of
    twenty thousand conifers evaluated five exponentials at a stop where none
    of them is within reach of the term, and it measured **+0.23 ms a frame**
    — a quarter of the whole frame, for a scene the reader cannot see from
    there. The per-instance test is two subtractions and a dot, it is exact,
    and it is coherent across a draw because trees near the massif are near
    each other. */
export const swellLift = /*#__PURE__*/ Fn(([p, near]: [Node<'vec2'>, Node<'float'>]) => {
  const lift = float(0).toVar();
  const d = p.sub(vec2(CLUSTER_SITE.x, CLUSTER_SITE.z));
  If(near.greaterThan(0.5).and(d.dot(d).lessThan(SWELL_REACH * SWELL_REACH)), () => {
    lift.assign(swellAt(p).x);
  });
  return lift;
});

/** A gate uniform. Its own per caller: the terrain's is per chunk and the
    two discs' are per frame. */
export const gate = () => uniform(0);

/** Whether a point is near enough for any of it to matter, in JS. `pad` is
    whatever reach the caller's own layer adds — a disc radius for the
    camera-relative layers, a chunk's half-diagonal for the terrain. */
export function nearSwell(x: number, z: number, pad = 0): boolean {
  const r = SWELL_REACH + pad;
  const dx = x - CLUSTER_SITE.x;
  const dz = z - CLUSTER_SITE.z;
  return dx * dx + dz * dz < r * r;
}
