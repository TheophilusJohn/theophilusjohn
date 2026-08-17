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

   What is here is the renderer, a camera you can fly, and — since §22 — a
   landscape under it with — since §23 — a sky over it and a light on it, and
   — since §26 — water in the low ground. Almost none of any of it is in this
   file: `height.ts` is the field, `chunk.ts` samples it and bakes what it
   shadows, `grid.ts` is the vertex layout both ends share, `terrain.ts`
   decides which squares of ground exist and how they band, `water.ts` is the
   one plane at the field's water level, `sky.ts` is the gradient and the
   cloud deck and `sun.ts` is the one direction all of it agrees on. Still
   ahead:

   - §34 brings the cluster back as a thing standing in a place, and with it
     the election, which is still the one thing to get right

   The scene is no longer a function of scroll position, and that rule goes
   with it. What replaces it is a stricter one in the same spirit: the pose
   is a function of the camera's own state, held in camera.ts and nowhere
   else, so nothing in this file may move the view. */

import { Renderer, Scene, WebGPUBackend, BasicNodeLibrary } from 'three/webgpu';
import { uniform } from 'three/tsl';
import { holdScroll } from '../motion';
import { buildBlades } from './blades';
import { buildCamera } from './camera';
import { buildPalette, token } from './palette';
import { buildSky } from './sky';
import { buildStars } from './stars';
import { buildTerrain } from './terrain';
import { buildWater } from './water';

/* Wall clock, unscaled. There is no section speed to scale it by any more —
   the sky was already exempt from that (§18), and now everything is. */
const uTime = uniform(0);

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
     and tone mapping operators and none of the mesh node materials. Worth
     8.0KB, and §23 was the step that would have had to give it back — it
     does not, because the banding *is* the lighting model and a light node
     would only have produced the scalar the bands then cut. */
  const renderer = new Renderer(new WebGPUBackend(params), params);
  renderer.library = new BasicNodeLibrary();
  renderer.setClearColor(token('--void'), 1);

  function size() {
    const [w, h] = viewport();
    // §4.7 capped this at 1.5 because the layer was out of focus behind
    // text. It is the whole frame now and nothing is in front of it, so the
    // justification is gone and only the cost argument is left — which is a
    // measurement (§35), not a decision this step gets to make on taste.
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

  /* Every palette token is a uniform, re-read on every change, never folded
     into the shader at build — the whole of that argument is in
     `palette.ts`, along with the reason it is one object rather than a
     subset per layer. The clear colour is the one thing outside it: it is a
     renderer setting rather than a node. */
  const palette = buildPalette(() => renderer.setClearColor(token('--void'), 1));

  /* Three layers and one horizon between them (§0.2). The sky carries the
     gradient and the cloud deck, the stars sit in its upper half, and the
     ground fades into the same gradient the sky draws — which is what
     `terrain.ts` imports from `sky.ts` and the reason the two are built
     against one palette. */
  const sky = buildSky(palette, uTime);
  scene.add(sky.mesh);

  const stars = buildStars(palette, uTime);
  scene.add(stars.stars);

  const terrain = buildTerrain(palette);
  scene.add(terrain.group);

  /* One plane at the world's water level, between the ground and the sky in
     draw order (§26). It has no update: the disc follows the camera in the
     shader and where a lake *is* is decided by the depth test against the
     ground, not by anything on the CPU. */
  const water = buildWater(palette, uTime);
  scene.add(water.mesh);

  /* Ground cover, on a disc that follows the camera (§27). Unlike the water
     it has an update, and it is the only thing in the world that samples the
     height field on the main thread for a reason other than the camera:
     blades stand *on* the ground, so their bases come out of the same field
     the workers generate from. It is drawn before the water, which is what
     puts a blade on a shore behind the surface it is standing next to. */
  const blades = buildBlades(palette, uTime);
  scene.add(blades.mesh);

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
    blades.update(camera);
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

     `Esc` leaves. **This is a placeholder for §30**, which owns the visible,
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
  // The whole grid at once rather than a frame's worth of it: this is before
  // the first frame, where fifteen milliseconds are free and cover fading in
  // over the opening half second is not. It returns immediately at any pose
  // the disc is invisible from, which the opening pose is.
  blades.settle(camera);
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

  return { renderer, scene, camera, view, sky, stars, terrain, water, blades };
}
