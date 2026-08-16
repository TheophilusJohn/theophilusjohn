/* §4.7 — the gate in front of the persistent render layer.

   Everything here is cheap and ships in the main bundle. The scene itself,
   and Three with it, is a dynamic import that only ever happens on a load
   that is going to render something: below 768px, or without WebGPU, this
   module answers no and the site is the document it already was. That is
   the whole reason the mobile JS budget still holds.

   **Two tiers, not three.** §15 asked for a reduced WebGL 2 tier between
   compute and nothing, and it was built and measured — the same five nodes
   with the journey evaluated as a Bézier in the vertex shader, since that
   backend has no compute pass. It does not ship. `three/webgpu` is a single
   module, so a bundler cannot split the two backends into separate chunks;
   carrying both costs every desktop load 23.1KB gzipped and puts the page
   at 272.4KB against a hard 260KB budget. WebGPU only is 249.8KB. §4.7 says
   the site is complete at the bottom tier, so the browser that would have
   had the reduced field gets the document instead — which is the whole
   site, and the rule that had to give was the one that was not hard. */

const MIN_WIDTH = 768;

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

let booting = false;

async function boot() {
  if (booting) return;
  booting = true;
  try {
    if (!(await capable())) return;
    const { mount } = await import('./field/scene');
    await mount();
  } catch (error) {
    // The field is the environment, not the site. Anything that goes wrong
    // in it leaves the document exactly as it was.
    console.warn('field: not mounted', error);
  }
}

/* Mount once, never unmount — so the width rule is a floor to cross, not a
   condition to keep satisfying. A phone never crosses it; a desktop window
   dragged narrow keeps the scene it already has, because tearing it down
   and rebuilding it is the one thing §4.7 says this layer never does. */
const wide = matchMedia(`(min-width: ${MIN_WIDTH}px)`);
if (wide.matches) boot();
else wide.addEventListener('change', (e) => e.matches && boot());

export {};
