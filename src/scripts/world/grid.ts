/* §0.2 — the vertex layout of one chunk, and nothing else.

   Its own file because it is the one thing the worker and the main thread
   both have to agree on: `chunk.ts` fills the buffers and `terrain.ts`
   indexes them, and if the two disagreed about where the skirt rows start
   the ground would be stitched to itself. It imports nothing — in
   particular not `height.ts`, which is what keeps the generator out of the
   world chunk and in the worker where it belongs.

   ── Skirts, and why not stitching ──────────────────────────────────────
   Two leaves at different quadtree levels meet along an edge where one has
   twice or four times the sample spacing of the other, and `height.ts`'s
   Nyquist term makes them disagree there by the amplitude of the octaves
   between them. That gap is a hole you can see the sky through.

   The exact fix is to stitch: snap the fine edge to the coarse level's
   sampling. It is exact, and it is also the reason not to — a chunk's
   geometry would then depend on which levels its four neighbours happen to
   be, so crossing a boundary would regenerate a ring of chunks that had not
   moved, and nothing could be keyed by its own coordinates.

   A skirt is an apron hanging from the chunk's edge, deep enough to cover
   the worst disagreement. It costs 196 of a chunk's 2,597 vertices and 384
   of its 4,992 triangles, it depends on nothing outside the chunk, and both
   sides of every seam have one — so it does not matter which of the two is
   the lower. */

/** Quads per side, every chunk at every level. 2,597 vertices, which is
    what keeps the index buffer in a Uint16. */
export const SEG = 48;

export const VERTEX_COUNT = (SEG + 1) * (SEG + 1) + 4 * (SEG + 1);

/* Quads per side of the **shadow** lattice (§23), which is coarser than the
   vertices and interpolated onto them. It is here rather than in `chunk.ts`
   because it is the other thing the two ends have to agree on, and because
   the number is not free: it has to divide SEG, so every fourth vertex is a
   lattice point, and it has to keep every level's lattice a subset of the
   coarsest one — 96/12 = 8 units at level 0 and 64 at level 3, and a
   level-3 point falls on a level-0 point because 8 divides 64. Two chunks
   at different levels therefore agree about the shadow at the points they
   share, which is as close to a seamless shading boundary as anything short
   of stitching gets. */
export const SHADOW_SEG = 12;

export type ChunkSpec = {
  /** World coordinate of the chunk's minimum corner. */
  x: number;
  z: number;
  /** World size of the square. */
  size: number;
  /** How far the apron hangs, in world units. */
  drop: number;
  /* Which quadrant of its parent this chunk is, or `null` at the root level
     where there is no coarser geometry to have come from. It is the only
     thing §25's morph needs to know about the tree: the parent's grid origin
     is this chunk's own corner less the quadrant, and every vertex here sits
     either on a parent vertex or exactly halfway along one of its edges. */
  quadrant: { x: 0 | 1; z: 0 | 1 } | null;
};

/* Index buffer for the grid and its four aprons. A pure function of SEG, so
   it is built once and sliced per chunk. **Not shared between geometries**:
   the WebGPU backend deletes a geometry's index attribute from its buffer
   map on dispose, so one retired chunk would drop the buffer out from under
   every other chunk still drawing with it. 30KB a chunk to not have that. */
export function buildIndices(): Uint16Array {
  const w = SEG + 1;
  const out = new Uint16Array(SEG * SEG * 6 + SEG * 4 * 6);
  let o = 0;
  for (let j = 0; j < SEG; j++) {
    for (let i = 0; i < SEG; i++) {
      const a = j * w + i;
      out[o++] = a;
      out[o++] = a + w;
      out[o++] = a + 1;
      out[o++] = a + 1;
      out[o++] = a + w;
      out[o++] = a + w + 1;
    }
  }

  /* Each apron reuses the surface's own edge vertices along its top and a
     dropped copy along its bottom, so the join between apron and surface
     cannot itself open. Winding is per edge: an apron wound the wrong way
     is invisible under backface culling, and the crack it was covering
     comes back. */
  const edge = (base: number, top: (k: number) => number, flip: boolean) => {
    for (let k = 0; k < SEG; k++) {
      const t0 = top(k);
      const t1 = top(k + 1);
      const b0 = base + k;
      const b1 = base + k + 1;
      if (flip) {
        out[o++] = t0; out[o++] = b0; out[o++] = t1;
        out[o++] = t1; out[o++] = b0; out[o++] = b1;
      } else {
        out[o++] = t0; out[o++] = t1; out[o++] = b0;
        out[o++] = t1; out[o++] = b1; out[o++] = b0;
      }
    }
  };

  const skirt = w * w;
  edge(skirt, (k) => k, false);                     // j = 0, faces -Z
  edge(skirt + w, (k) => SEG * w + k, true);        // j = SEG, faces +Z
  edge(skirt + w * 2, (k) => k * w, true);          // i = 0, faces -X
  edge(skirt + w * 3, (k) => k * w + SEG, false);   // i = SEG, faces +X
  return out;
}
