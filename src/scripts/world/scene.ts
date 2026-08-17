/* §0 / §4.7 — the render layer, and the world it contains.

   One renderer, one context, one scene, mounted once and never torn down.
   That much is §15 and it does not move. What §21 changed is everything
   about what is *in* it and what it is *for*.

   Until §21 this file was a consensus simulation drawn behind a scrolling
   document: five nodes trading a hundred and twenty thousand messages, a
   lit terrain displaced by who was receiving what, a leader light standing
   over the elected node, a horizon arc, a mist layer, and six per-section
   presets tweened by whichever range of the page was in view. Every one of
   those is measured and reported at §15–§20 and none of it is wrong. It is
   all gone from here, because §0 reverses what it was built for: the world
   loads first, and a landscape that exists to be flown over is a different
   object from one that exists to be glimpsed between paragraphs.

   What is here is the renderer, the sky, a camera you can fly and — since
   §22 — a landscape under it. The landscape is four files of its own and
   almost none of it is in this one: `height.ts` is the field, `chunk.ts`
   samples it, `grid.ts` is the vertex layout both ends share, `terrain.ts`
   decides which squares of ground exist. Still ahead:

   - §23 makes the light bands and replaces the sky wholesale
   - §24 clamps the camera above the ground it can now see
   - §29 brings the cluster back as a thing standing in a place, and with it
     the election, which is still the one thing to get right

   The scene is no longer a function of scroll position, and that rule goes
   with it. What replaces it is a stricter one in the same spirit: the pose
   is a function of the camera's own state, held in camera.ts and nowhere
   else, so nothing in this file may move the view. */

import { Color, Renderer, Scene, WebGPUBackend, BasicNodeLibrary } from 'three/webgpu';
import { uniform } from 'three/tsl';
import { holdScroll } from '../motion';
import { buildCamera } from './camera';
import { buildStars } from './stars';
import { buildTerrain } from './terrain';

/* Wall clock, unscaled. There is no section speed to scale it by any more —
   the sky was already exempt from that (§18), and now everything is. */
const uTime = uniform(0);

const uLead = uniform(new Color());
const uPaper = uniform(new Color());
const uRule = uniform(new Color());
const uDim = uniform(new Color());
const uVoid = uniform(new Color());

const token = (name: string) =>
  new Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim());

/* documentElement.clientWidth, not innerWidth: the canvas is fixed to the
   initial containing block, which a classic scrollbar is outside of. Sized
   from innerWidth the buffer is ~15px wider than the box it is drawn in and
   the whole scene is stretched by that much. It also answers while the
   canvas is still detached, which clientWidth on the element itself does
   not. */
const viewport = () => [document.documentElement.clientWidth, innerHeight] as const;

export async function mount() {
  /* Built detached. Nothing reaches the document until there is a frame in
     it — a renderer that fails to initialise must leave no node behind, and
     in world-first that matters more than it did: the node it would leave
     is an opaque rectangle over the whole site rather than a dark layer
     behind it. */
  const canvas = document.createElement('canvas');
  canvas.className = 'world';
  canvas.setAttribute('aria-hidden', 'true');

  const params = {
    canvas,
    antialias: false,
    // Opaque, and the clear colour is --void.
    alpha: false,
    powerPreference: 'high-performance' as const,
  };

  /* Not `WebGPURenderer`, which is exactly this plus a getFallback that
     swaps in the WebGL backend when the adapter request fails. Naming that
     class is what pulls the second backend into the bundle, and world.ts
     has already asked for the adapter, so the fallback would be a second
     answer to a settled question at 23.1KB gzipped.

     BasicNodeLibrary rather than the standard one: it registers the lights
     and tone mapping operators §23 will need, and none of the mesh node
     materials. Worth 8.0KB — and worth re-checking at §23, which is the
     first step since §19 to want a lighting model of its own. */
  const renderer = new Renderer(new WebGPUBackend(params), params);
  renderer.library = new BasicNodeLibrary();
  renderer.setClearColor(token('--void'), 1);

  function size() {
    const [w, h] = viewport();
    // §4.7 capped this at 1.5 because the layer was out of focus behind
    // text. It is the whole frame now and nothing is in front of it, so the
    // justification is gone and only the cost argument is left — which is a
    // measurement (§30), not a decision this step gets to make on taste.
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(w, h, false);
  }
  size();

  // WebGPU initialisation is async, unlike WebGL. Nothing may be built
  // against the device before this resolves.
  await renderer.init();

  const scene = new Scene();
  const view = buildCamera(canvas, viewport()[0] / viewport()[1]);
  const camera = view.camera;

  const sky = buildStars({ paper: uPaper, lead: uLead }, uTime);
  scene.add(sky.stars);

  /* Three tones for the ground and the colour under it. --rule is the
     shadow side, --dim the mid, --paper the faces square to the key light;
     §0.2 asks for the palette to carry the light rather than the light to
     carry a palette, and this is the smooth version of the three bands §23
     will quantise it into. */
  const terrain = buildTerrain({ shadow: uRule, mid: uDim, lit: uPaper, void: uVoid });
  scene.add(terrain.group);

  /* Every palette token is a uniform, re-read on every change, never folded
     into the shader at build. §15 read them once at mount and a page
     *loaded* in high contrast got a different scene from one *toggled* into
     it — only the second path was ever tested, and the bug survived two
     steps. The scale factor that used to ride alongside them is gone: it
     was there to move the busiest frame down under text, and the text has
     moved off the world (§0.4). What high contrast does to the world now is
     what it does to everything, which is move the tokens. */
  function repaint() {
    uLead.value = token('--leader');
    uPaper.value = token('--paper');
    uRule.value = token('--rule');
    uDim.value = token('--dim');
    uVoid.value = token('--void');
    renderer.setClearColor(token('--void'), 1);
  }
  repaint();
  new MutationObserver(repaint).observe(document.documentElement, {
    attributeFilter: ['data-contrast'],
  });

  /* ── The loop ──────────────────────────────────────────────────────────
     Plain rAF, where every step to §20 drove this off gsap.ticker. The
     ticker was the right clock while the scene had to stay in step with
     Lenis and four scrubbed pins; a world that is not driven by scroll has
     nothing to stay in step with, and the ticker's lag smoothing exists to
     protect scrubs rather than a flight. The dt cap below is what a
     backgrounded tab needed from it and is cheaper than the dependency. */
  let last = 0;
  let frame = 0;

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    // A tab that has been away hands back the whole elapsed gap. Capped, or
    // the camera covers a minute of coasting in one step.
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    uTime.value += dt;
    view.update(dt);
    // After the camera and before the render: which squares of ground exist
    // is a function of where the camera is *this* frame, and asking a frame
    // late is a hole in the ground on every LOD boundary crossed at speed.
    terrain.update(camera, dt);
    renderer.render(scene, camera);
  };

  function run() {
    if (frame) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    if (!frame) return;
    cancelAnimationFrame(frame);
    frame = 0;
  }

  // A render loop in a background tab is a battery complaint. rAF already
  // throttles hard there; stopping is explicit about it.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else run();
  });

  addEventListener('resize', () => {
    size();
    camera.aspect = viewport()[0] / viewport()[1];
    camera.updateProjectionMatrix();
  });

  /* ── Entry and exit ──────────────────────────────────────────────────
     §0.1: the document's HTML renders first and is what the browser paints;
     the world mounts over it. So LCP is the document's and is untouched,
     and the attribute that covers the page is set here — after there is a
     frame in the canvas — rather than in the head script.

     `Esc` leaves. **This is a placeholder for §25**, which owns the visible,
     persistent, keyboard-reachable control and the mode memory. It is here
     at all because §0.1 is explicit that nobody is trapped, and a world
     with no way out is not a smaller version of that promise. */
  addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const url = new URL(location.href);
    url.searchParams.delete('world');
    location.replace(url.pathname + url.search + url.hash);
  });

  /* One pass over the quadtree before the first frame, so the opening pose
     asks for its ground at load rather than a frame after the canvas is
     already over the document. */
  terrain.update(camera, 0);
  renderer.render(scene, camera);

  /* The document is behind an opaque canvas from the next line, so it must
     stop moving. The root's `overflow: hidden` alone does not do it: Lenis
     handles the wheel itself and scrolls the window programmatically, which
     is not a scroll the root can refuse. */
  holdScroll();

  document.documentElement.dataset.world = '';
  document.body.append(canvas);
  requestAnimationFrame(() => canvas.setAttribute('data-ready', ''));

  run();

  return { renderer, scene, camera, view, sky, terrain };
}
