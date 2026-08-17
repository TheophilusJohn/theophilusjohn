/* §0.1 — the gate in front of the world.

   Everything here is cheap and ships in the main bundle. The world itself,
   and Three with it, is a dynamic import that only ever happens on a load
   that is going to render one. That is the whole reason the document's JS
   budget still holds, and it is unchanged from §15 — what changed is what
   the answer means. Until §21 this module decided whether to put a scene
   *behind* a document. It decides whether the site is a world now.

   **Two tiers, not three**, still. §15 asked for a reduced WebGL 2 tier
   between compute and nothing, and it was built and measured; it does not
   ship. `three/webgpu` is a single module, so a bundler cannot split the
   two backends into separate chunks, and carrying both costs every world
   load 23.1KB gzipped for a backend that cannot run a compute pass anyway.
   §0.1 says the browser that would have had it gets the document, which is
   the whole site.

   **Decided once, at load.** §15's gate re-asked on resize, because a scene
   behind a document could arrive at any time without disturbing anything.
   A mode cannot: dragging a window past 1024px must not teleport a reader
   who is reading into a landscape they did not ask for. */

import { motionOff } from './motion';

/* §0.1's threshold, and it is the whole of the mobile story: there is no
   halved tier below it any more, there is the document. */
const MIN_WIDTH = 1024;

/* **Interim, and §25 removes it.** The build order puts world-first entry
   at step 25 and the world itself at 21–24, so between the two there has to
   be an answer to "what does / serve", and every commit here deploys. The
   answer is that / serves the document — finished, fast, and carrying no
   Three at all — and the world is built at `?world` until the loader, the
   escape control and the mode memory exist to switch on it honestly.

   `?doc` is already §0.1's own opt-out and works today, by being anything
   other than `?world`. It is checked explicitly so that the flip at §25 is
   one line here rather than a re-reading of this comment. */
const params = new URLSearchParams(location.search);
const asked = params.has('world') && !params.has('doc');

/* Not `navigator.gpu` on its own. The property exists in browsers that
   cannot hand out an adapter — a machine with no supported GPU, a blocked
   driver, a headless run — and a renderer built on that promise fails after
   the bundle has already been paid for. Asking for the adapter is the only
   honest question, and its answer is the whole tier decision. */
async function capable(): Promise<boolean> {
  if (!navigator.gpu) return false;
  try {
    return Boolean(await navigator.gpu.requestAdapter());
  } catch {
    return false;
  }
}

async function boot() {
  try {
    if (!(await capable())) return;
    const { mount } = await import('./world/scene');
    await mount();
  } catch (error) {
    /* The document is underneath and untouched, so a world that fails to
       start is a load that got the document — which is §0.1's bottom tier
       reached by a different route, not a broken page. */
    console.warn('world: not mounted', error);
  }
}

/* Reduced motion is document mode, always (§0.6). Not a frozen frame and
   not a toggle inside the world: there is nothing to freeze, because the
   world is a thing you fly and freezing flight is refusing to load it. */
if (asked && innerWidth >= MIN_WIDTH && !motionOff()) boot();

export {};
