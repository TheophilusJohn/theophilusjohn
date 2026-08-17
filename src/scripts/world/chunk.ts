/* §0.2 — one chunk of ground, as arrays.

   Pure like `height.ts` and for the same reason: this is what runs in the
   worker, and a worker that reached anything in three would pull the whole
   renderer into a second bundle. Nothing here knows what a BufferGeometry
   is — `terrain.ts` wraps the arrays it gets back, and `grid.ts` is the
   layout both ends read. */

import { height } from './height';
import { SEG, VERTEX_COUNT, type ChunkSpec } from './grid';

export type ChunkData = {
  position: Float32Array;
  normal: Float32Array;
  /** Height bounds, so `terrain.ts` can set a bounding sphere without
      reading the buffer back on the main thread. */
  min: number;
  max: number;
};

export function buildChunk(spec: ChunkSpec): ChunkData {
  const { x, z, size, drop } = spec;
  const spacing = size / SEG;
  const w = SEG + 1;

  /* One vertex of padding on every side, sampled from the same field, so
     the central differences below are exact at the chunk's own edge. Two
     chunks of the same level therefore agree on the normal along their
     shared edge as well as on the height — the seam is invisible rather
     than merely closed. */
  const pw = SEG + 3;
  const H = new Float32Array(pw * pw);
  for (let j = -1; j <= SEG + 1; j++) {
    const wz = z + j * spacing;
    for (let i = -1; i <= SEG + 1; i++) {
      H[(j + 1) * pw + (i + 1)] = height(x + i * spacing, wz, spacing);
    }
  }

  const position = new Float32Array(VERTEX_COUNT * 3);
  const normal = new Float32Array(VERTEX_COUNT * 3);

  let min = Infinity;
  let max = -Infinity;
  const inv = 1 / (2 * spacing);

  for (let j = 0; j <= SEG; j++) {
    for (let i = 0; i <= SEG; i++) {
      const p = (j + 1) * pw + (i + 1);
      const y = H[p]!;
      if (y < min) min = y;
      if (y > max) max = y;

      const v = (j * w + i) * 3;
      /* Local to the chunk's own corner. A world-space buffer would be
         hundreds of thousands of units from the origin after a long flight
         and would quantise visibly in a float32; the mesh carries the
         offset in its matrix, which is a float64 on the CPU. */
      position[v] = i * spacing;
      position[v + 1] = y;
      position[v + 2] = j * spacing;

      const dx = (H[p + 1]! - H[p - 1]!) * inv;
      const dz = (H[p + pw]! - H[p - pw]!) * inv;
      const len = Math.hypot(dx, 1, dz);
      normal[v] = -dx / len;
      normal[v + 1] = 1 / len;
      normal[v + 2] = -dz / len;
    }
  }

  /* The apron. One depth for the whole chunk rather than per vertex, so its
     bottom edge is a straight line — a skirt that followed the terrain
     would be the same shape as the crack it is covering. It carries the
     surface's normal, so on the rare frame an apron is visible it shades
     as the ground above it rather than as a wall. */
  let o = w * w;
  const hang = (surface: number) => {
    const s = surface * 3;
    const d = o * 3;
    position[d] = position[s]!;
    position[d + 1] = position[s + 1]! - drop;
    position[d + 2] = position[s + 2]!;
    normal[d] = normal[s]!;
    normal[d + 1] = normal[s + 1]!;
    normal[d + 2] = normal[s + 2]!;
    o++;
  };
  for (let k = 0; k <= SEG; k++) hang(k);
  for (let k = 0; k <= SEG; k++) hang(SEG * w + k);
  for (let k = 0; k <= SEG; k++) hang(k * w);
  for (let k = 0; k <= SEG; k++) hang(k * w + SEG);

  return { position, normal, min: min - drop, max };
}
