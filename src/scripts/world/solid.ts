/* §0.3 / §35 — what the camera cannot enter.

   §4.7's "no collision, the ground is a height function" is true of terrain
   and false of everything built: a world where a mast stops you and a plinth
   does not is a rule nobody can learn. So this is the second constraint on
   the camera, and it is deliberately not general collision — oriented boxes
   in a spatial hash, a sphere against a box, resolved by pushing out along
   the shallowest axis. Exact for a world made of primitives, and it never
   needs a physics engine.

   **The sixth module with no three and no DOM in it**, after `height.ts`,
   `route.ts`, `cover.ts`'s family and `scenes.ts` (and `city.ts` since §36)
   — which is what lets a Node harness flood-fill the space around a scene
   and answer "can a sphere of radius four reach the inside of anything
   built" without a GPU. Every number in the §35 and §36 reports is this
   file's own output.

   ── Which of §35's three architectures, and why ─────────────────────────
   **A static table, independent of chunk streaming.** Every proxy in one
   hash, built at module load, held for the life of the page.

   The objection to it is memory: it holds every box whether or not that
   ground is loaded, and §36 takes the world to 10km. Measured, that
   objection does not survive contact with the numbers — the four scenes were
   **48 boxes: a 1,728-byte Float32Array and an index of 81 entries over 25
   cells, 2,376 bytes all told**, and §35 guessed that §36's two cities and
   §37's ten landmarks would be "a few hundred more". **§36 built them and it
   is 294 boxes over 467 cells: 18,560 bytes**, which is the whole of what a
   residency scheme would be saving. It is a bad trade at any world size, and
   it is a *worse* one now that the table has to answer a query inside a
   city: the two cities are the densest part of it and a query there tests
   0.7 to 8 boxes at 0.05 to 0.17µs, against a mast's 0.98.

   The other two were rejected on correctness rather than on cost:

   - **Proxies carried on the chunk** makes solidity a function of LOD, and
     the camera moves faster than chunks arrive (§24: 632 chunks over 75s of
     boosted flight). A building whose chunk has not landed is a building you
     fly through — which is §0.3's "a bad proxy is worse than none" arriving
     by the back door, and it would be intermittent, which is worse than
     wrong.
   - **A coarse hash keyed to the quadtree but loaded by distance** fixes
     that and keeps the residency win, at the cost of a second lifetime.
     There is nothing to spend it on until the table is large enough to
     matter, and this file is the only place that would have to change when
     it is: `BUILT` is assembled here and read through one function, so a
     residency scheme is a change to how the table is filled and to nothing
     else. §36 exercised that: adding two cities is one array spread.

   **Placement is already pure** (§28's rule) — a proxy is a function of
   where a thing is and nothing about it depends on which chunk is resident,
   which is what makes all three possible and this one trivial.

   ── The one thing that moves ────────────────────────────────────────────
   Homonoia's masts ride the swell: the summit under a node rises by up to
   thirty units while it holds the term (§34), and `built.ts` lifts the whole
   node rigidly by `swell()` at its base. So does the proxy, at query time,
   from the same function §24's floor already calls — which is why `ride` is
   a flag on the box rather than a second table. It is a vertical offset, so
   the hash never has to be rebuilt. */

import { CITIES } from './city';
import { swell } from './height';
import { SCENES } from './scenes';

/** Everything in the world that carries a proxy. §36's cities are read
    exactly as the four scenes are — a city's `pad` is zero and its parts
    carry world heights, which is the only difference and it is arithmetic
    rather than a case. */
const BUILT = [...SCENES, ...CITIES];

/** The camera's radius (§0.3). Four units, so it stops a little short of a
    surface rather than touching it. */
export const RADIUS = 4;

/* The hash cell. Big enough that the biggest proxy here — Enargeia's plinth,
   52 units across — spans four cells rather than sixteen, small enough that
   a query at a station reads two or three buckets rather than the scene.
   Nothing is tuned to it: it is a bucket size, and the query is exact
   whatever it is. §36 left it alone and measured what happened: Delhi's
   buildings stand on a 54-unit pitch, so a cell holds about four of them and
   a query in the densest street tests eight. */
const CELL = 48;

/* One box, flat: x, y, z, w, h, d, cos(yaw), sin(yaw), ride.
   The trig is baked because a query does it otherwise, per box, per frame,
   for an angle that was decided at build. */
const STRIDE = 9;

/* **A part's yaw turns the box about its own centre and does not move it.**
   `built.ts` writes the instance's position as `site + part.(x, y, z)` flat
   and hands the shader `cos/sin` separately, so the offset is never turned;
   a proxy that turned it is a proxy somewhere else. Measured before it was
   fixed: sixteen of the forty-eight boxes displaced, worst **37.8 units** at
   Basis's outermost module, against a camera radius of four — a proxy for
   empty air beside a module with nothing on it, which is §0.3's "bouncing
   off nothing" and the thing it is worse than none *for*.

   What the angle is for is the box's own frame, inside `resolve`:
       wx = lx·c + lz·s      lx = wx·c − wz·s
       wz = lz·c − lx·s      lz = wx·s + wz·c                               */

const boxes = new Float32Array(
  BUILT.reduce((n, s) => n + s.proxy.length, 0) * STRIDE,
);
const COUNT = boxes.length / STRIDE;

/** Cell key → the boxes whose footprint touches it. A `Map` rather than a
    dense grid: the world is 5.2km across and every solid thing in it stands
    inside four footprints of about fifty units. */
const cells = new Map<number, number[]>();
const key = (cx: number, cz: number) => cx * 1e6 + cz;

{
  let i = 0;
  for (const scene of BUILT) {
    for (const p of scene.proxy) {
      const rad = (p.yaw * Math.PI) / 180;
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      const x = scene.site.x + p.x;
      const z = scene.site.z + p.z;
      const at = i * STRIDE;
      boxes[at] = x;
      boxes[at + 1] = scene.pad + p.y;
      boxes[at + 2] = z;
      boxes[at + 3] = p.w;
      boxes[at + 4] = p.h;
      boxes[at + 5] = p.d;
      boxes[at + 6] = c;
      boxes[at + 7] = s;
      boxes[at + 8] = p.ride ? 1 : 0;

      /* Bucketed by the *world-axis* extent of the turned box, which is
         what a query's own axis-aligned window can be tested against. A
         turned box reaches `|w·c| + |d·s|` along x, and the swell moves it
         vertically only, so this is decided once. */
      const ex = Math.abs(p.w * c) + Math.abs(p.d * s);
      const ez = Math.abs(p.d * c) + Math.abs(p.w * s);
      const x0 = Math.floor((x - ex) / CELL);
      const x1 = Math.floor((x + ex) / CELL);
      const z0 = Math.floor((z - ez) / CELL);
      const z1 = Math.floor((z + ez) / CELL);
      for (let cx = x0; cx <= x1; cx++) {
        for (let cz = z0; cz <= z1; cz++) {
          const k = key(cx, cz);
          const list = cells.get(k);
          if (list) list.push(i);
          else cells.set(k, [i]);
        }
      }
      i++;
    }
  }
}

/** What the report counts, and what a residency scheme would be saving. */
export const stats = {
  boxes: COUNT,
  cells: cells.size,
  /** The table and its index, in bytes. */
  bytes:
    boxes.byteLength +
    [...cells.values()].reduce((n, list) => n + list.length * 8, 0),
};

/* The scratch a query works in, module-level because `resolve` runs once a
   frame for the whole life of the page and an allocation there is garbage
   on a flight. */
const push = { x: 0, y: 0, z: 0 };
const seen = new Int32Array(COUNT);
let stamp = 0;
const hits: number[] = [];

/** How many boxes the last query actually tested, which is the only honest
    thing to report about a spatial hash. */
export let tested = 0;

/**
 * Push a sphere out of everything it is inside.
 *
 * `floor` is §24's altitude clamp for this position — the two constraints
 * hold at once, and when they disagree the ground wins: a box may never
 * resolve *downward* through the floor, and where the shallowest axis would
 * do that the box gives up its vertical axis and pushes horizontally
 * instead. That is always possible, because a sphere overlapping a box in
 * three dimensions overlaps it in two.
 *
 * Returns the accumulated displacement, or null if nothing was touched. The
 * vector is module-owned; copy it before the next call.
 */
export function resolve(
  x: number, y: number, z: number,
  radius: number, floor: number,
): { x: number; y: number; z: number } | null {
  /* The window is the sphere plus one resolution's worth of travel, because
     a push moves the sphere and the second pass below tests it where it
     landed. Two radii is the most any single push can be. */
  const reach = radius * 3;
  const x0 = Math.floor((x - reach) / CELL);
  const x1 = Math.floor((x + reach) / CELL);
  const z0 = Math.floor((z - reach) / CELL);
  const z1 = Math.floor((z + reach) / CELL);

  hits.length = 0;
  stamp++;
  for (let cx = x0; cx <= x1; cx++) {
    for (let cz = z0; cz <= z1; cz++) {
      const list = cells.get(key(cx, cz));
      if (!list) continue;
      // A box wider than a cell is in several of them, and a sphere near a
      // corner reads several: a box may only be resolved against once.
      for (const i of list) {
        if (seen[i] === stamp) continue;
        seen[i] = stamp;
        hits.push(i);
      }
    }
  }
  tested = hits.length;
  if (!hits.length) return null;

  push.x = 0;
  push.y = 0;
  push.z = 0;
  let any = false;

  /* Two passes. A sphere in the corner between two boxes is pushed out of
     the first into the second, and one pass would leave it there; the second
     resolves what the first created. A third changes nothing measurable here
     — the proxies are convex and never meet at less than a right angle. */
  for (let pass = 0; pass < 2; pass++) {
    for (const i of hits) {
      const at = i * STRIDE;
      const c = boxes[at + 6]!;
      const s = boxes[at + 7]!;
      const w = boxes[at + 3]!;
      const h = boxes[at + 4]!;
      const d = boxes[at + 5]!;

      const dx = x + push.x - boxes[at]!;
      const dz = z + push.z - boxes[at + 2]!;
      const lift = boxes[at + 8]! ? swell(boxes[at]!, boxes[at + 2]!) : 0;
      const ly = y + push.y - (boxes[at + 1]! + lift);
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;

      // The closest point on the box, in its own frame.
      const qx = lx < -w ? -w : lx > w ? w : lx;
      const qy = ly < -h ? -h : ly > h ? h : ly;
      const qz = lz < -d ? -d : lz > d ? d : lz;
      const ex = lx - qx;
      const ey = ly - qy;
      const ez = lz - qz;
      const gap = ex * ex + ey * ey + ez * ez;
      if (gap > radius * radius) continue;

      let px = 0, py = 0, pz = 0;
      if (gap > 1e-9) {
        // Outside the box and touching it: out along the surface normal.
        const dist = Math.sqrt(gap);
        const over = radius - dist;
        px = (ex / dist) * over;
        py = (ey / dist) * over;
        pz = (ez / dist) * over;
      } else {
        // Inside it: the shallowest axis, which is the only choice that does
        // not throw the camera across the room.
        const ox = w + radius - Math.abs(lx);
        const oy = h + radius - Math.abs(ly);
        const oz = d + radius - Math.abs(lz);
        if (oy <= ox && oy <= oz) py = ly < 0 ? -oy : oy;
        else if (ox <= oz) px = lx < 0 ? -ox : ox;
        else pz = lz < 0 ? -oz : oz;
      }

      // Back to world, and then the floor's veto.
      let wx = px * c + pz * s;
      let wz = pz * c - px * s;
      if (py < 0 && y + push.y + py < floor) {
        /* The ground wins. Re-solve the same box in plan only: the sphere
           overlaps it in x and z or it could not have overlapped it at all,
           so a horizontal way out always exists. */
        py = 0;
        const ax = w + radius - Math.abs(lx);
        const az = d + radius - Math.abs(lz);
        if (ax <= az) { px = lx < 0 ? -ax : ax; pz = 0; }
        else { px = 0; pz = lz < 0 ? -az : az; }
        wx = px * c + pz * s;
        wz = pz * c - px * s;
      }

      push.x += wx;
      push.y += py;
      push.z += wz;
      any = true;
    }
  }
  return any ? push : null;
}
