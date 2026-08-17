/* §0.7 — "terrain generation off the main thread if it stalls the frame".

   It does. One chunk is 2,601 samples of a nine-octave field, and the
   frame budget at 60fps is 16.6ms in total; a flight that crosses a level-0
   boundary asks for several at once. So this is a worker from the start
   rather than after a hitch was measured — the measurement is in the §22
   report either way, but a hitch that only shows on a slower machine than
   this one is not a thing to leave in and wait for.

   It imports `chunk.ts`, which imports `height.ts`, and neither of those
   imports three. That is what makes this a small module rather than a
   second copy of the renderer, and it is the reason `grid.ts` exists to
   hold the layout the main thread also needs. */

import { buildChunk } from './chunk';
import type { ChunkSpec } from './grid';

type Request = { key: string; spec: ChunkSpec };

/* Typed by hand rather than with `/// <reference lib="webworker" />`. That
   directive is not scoped to the file: it merges the worker globals into
   the whole project, and the first thing it does is replace the DOM's
   `addEventListener` overloads with the worker's — which takes every
   `KeyboardEvent` in camera.ts and url-sync.ts down to a bare `Event`.
   Fourteen errors in three files that never imported this one. */
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage: (message: unknown, transfer: Transferable[]) => void;
};

scope.onmessage = (event: MessageEvent<Request>) => {
  const { key, spec } = event.data;
  const started = performance.now();
  const data = buildChunk(spec);
  scope.postMessage(
    { key, ...data, ms: performance.now() - started },
    // Transferred, not copied. 125KB a chunk each way otherwise.
    [
      data.position.buffer,
      data.normal.buffer,
      data.shadow.buffer,
      data.cover.buffer,
      data.morphY.buffer,
      data.morphNormal.buffer,
      data.morphShadow.buffer,
      data.morphCover.buffer,
    ],
  );
};
