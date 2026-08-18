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
   — since §26 — water in the low ground, and — since §34 — four scenes
   standing in it with an election running in one of them — and, since §35,
   solid, with the stick on offer at the end of the route. Almost none of any
   of it is in this file: `height.ts` is the field, `chunk.ts` samples it and bakes what it
   shadows, `grid.ts` is the vertex layout both ends share, `terrain.ts`
   decides which squares of ground exist and how they band, `water.ts` is the
   one plane at the field's water level, `sky.ts` is the gradient and the
   cloud deck, `sun.ts` is the one direction all of it agrees on and
   `solid.ts` is the one answer to what the camera may not enter. Still
   ahead:

   - §36 and §37 put two cities and ten landmarks in it, and each of them
     arrives carrying a proxy `solid.ts` already knows how to read

   The scene is no longer a function of scroll position, and that rule goes
   with it. What replaces it is a stricter one in the same spirit: the pose
   is a function of the camera's own state, held in camera.ts and nowhere
   else, so nothing in this file may move the view. */

import { Renderer, Scene, WebGPUBackend, BasicNodeLibrary } from 'three/webgpu';
import { uniform } from 'three/tsl';
import { holdScroll } from '../motion';
import { buildBlades } from './blades';
import { buildBuilt } from './built';
import { buildCamera } from './camera';
import { stateAt } from './consensus';
import { buildClouds } from './clouds';
import { buildMotes } from './motes';
import { buildPalette, token } from './palette';
import { buildRail } from './rail';
import { poseAt, nearest } from './route';
import { buildScroll } from './scroll';
import { buildSky } from './sky';
import { buildStands } from './stands';
import { buildStation, entryAt, type Where } from './station';
import { buildStars } from './stars';
import { buildStick } from './stick';
import { setSwell } from './swell';
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

/** What the loader is told, in the last fifth of its bar (§33). Reported
    rather than estimated: the fraction is a count of real chunks. */
export type Progress = (at: number, what: string) => void;

/* The backstop on waiting for ground. A frame with squares of sky in it
   where the terrain should be is a bad first impression, so the curtain
   waits for the quadtree to cover the opening pose — but it may not wait
   for ever on a machine that cannot keep up. Past this the world is shown
   with whatever it has and the rest arrives over the next second, through
   §25's morph, which is what that mechanism is for. */
const GROUND_BY = 4000;

/** `arrived` is the address the reader loaded, captured by `world.ts` at
    import — not read here, because by now it has been overwritten (§32). */
export async function mount(arrived?: Where, report: Progress = () => {}) {
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
    // measurement (§36), not a decision this step gets to make on taste.
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

  /* Conifers and stone on a disc of their own (§28), six times the blades'
     reach because a twelve-unit tree is still thirty pixels at three hundred
     units where a blade is four at sixty. Two draw calls, one grid, one fill
     — and the shade under a conifer is not here at all: the worker bakes it
     into the ground's own shadow attribute, off the same `scatter.ts` this
     reads. Opaque and before the water in draw order, like the ground. */
  const stands = buildStands(palette, uTime);
  scene.add(stands.treeMesh);
  scene.add(stands.rockMesh);

  /* ── The air (§30) ───────────────────────────────────────────────────
     The two atmospheric layers, and they are built together because they
     read one wind and because between them they are the whole of what makes
     the world feel occupied rather than modelled.

     The clouds go in first and are updated first, and both matter. They own
     `fog.ts`'s murk — how far anything can be seen this frame — so a frame
     that read it before they wrote it would fog the world by where the
     camera was last frame; and they are drawn before the motes, which is
     what puts a mote over a lake in front of a form a kilometre behind it. */
  const clouds = buildClouds(palette, uTime);
  scene.add(clouds.mesh);

  const motes = buildMotes(palette, uTime);
  scene.add(motes.mesh);

  /* ── What is built (§34) ─────────────────────────────────────────────
     The four scenes, and it is two draw calls for all of them: one instanced
     box mesh for a hundred and eighty-two parts and one additive layer for
     the fifty-one things travelling between them. (441 until §34's own
     aliasing fix took Enargeia from 350 cells to 90; the comment outlived
     it.) `scenes.ts` is where they are, `consensus.ts` is what the cluster
     is doing, and neither of those files has seen a GPU.

     Added after the motes and before the loop, so the boxes are opaque and
     drawn with the world while the signals — additive, depth-tested, not
     depth-written — sit at renderOrder 2 with the cloud forms and in front
     of the ground they cross. */
  const built = buildBuilt(palette, uTime);
  scene.add(built.mesh);
  scene.add(built.signals);

  /* ── The route (§31) ─────────────────────────────────────────────────
     Scroll is the site. `scroll.ts` turns the gesture into a position along
     the route and `route.ts` turns that into a pose, and neither of them can
     see this file: one reads events and the other is arithmetic over the
     height field. What arrives here is a pose, and it goes into the camera
     the same way the reader's own flying does — through camera.ts, which is
     still the only thing that may move the view. */
  const ride = buildScroll(canvas, () => take(false));

  /* ── The station's content (§32) ──────────────────────────────────────
     The writeup is the document's own HTML, cloned, and it arrives over
     the scene rather than instead of it. `station.ts` owns the three
     landmark states and the address bar in both directions; what it needs
     from here is the route position each frame and a way to jump, which is
     the same `ride` the wheel drives. */
  const place = buildStation(
    (y) => ride.jump(y),
    (i, units) => ride.reading(i, units),
  );

  /* And the one indicator the world has, which is the scrollbar the
     document gets for free: how far along the route you are, where the four
     stations sit on it, and which one you are at. It reports and does
     nothing else. */
  const rail = buildRail();

  /* ── The stick (§35) ─────────────────────────────────────────────────
     The offer at the end of the route, and the way back from inside it.
     One function does both directions, because they are one decision seen
     twice — the button calls it, a wheel in free flight calls it, and there
     is no third caller. Handing over zeroes the camera's velocity;
     rejoining is the route picked up at the station **nearest to wherever
     the reader flew to**, eased rather than cut, which is `flyTo` doing the
     job §24 built it for. */
  function take(on: boolean) {
    if (on === view.flying()) return;
    view.stick(on);
    ride.hold(on);
    canvas.toggleAttribute('data-flying', on);
    if (on) return;
    const pose = view.pose();
    ride.jump(nearest(pose.x, pose.z));
    view.flyTo(poseAt(ride.at(), 0));
  }
  const stick = buildStick(() => take(!view.flying()));

  ride.jump(entryAt(arrived));

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

    /* ── The election (§4.7's one thing to get right) ──────────────────
       A pure function of the clock, evaluated once and handed to the two
       things that read it: `swell.ts` — which writes both the uniform the
       ground is displaced by and the array §24's floor samples — and
       `built.ts`, which lights the mast on the summit that is rising. One
       call, so the mountain and the machine can never disagree about who
       holds the term.

       It runs whether or not anyone is at Homonoia. A cluster that stopped
       electing when the camera looked away would be a screensaver; and off
       the massif every reader of it is one distance test. */
    const cluster = stateAt(uTime.value);
    setSwell(cluster.shares);
    /* Three things can be holding the camera and only one of them at a
       time: an eased move between the two (rejoining the route), the reader
       with the stick, or — by default, and this is the reversal §31 is —
       the route. */
    if (view.easing() || view.flying()) view.update(dt);
    else {
      const on = ride.update(dt);
      view.drive(poseAt(on.y, on.arrive), dt);
    }
    /* Off the route there is no station: with the stick out the reader is
       somewhere the route has no position for, and a writeup hanging over
       a free flight is a claim about where they are that is not true. */
    const on = view.flying() ? null : ride.at();
    place.update(on, dt);
    rail.update(on);
    stick.update(on);
    // After the camera and before the render: which squares of ground exist
    // is a function of where the camera is *this* frame, and asking a frame
    // late is a hole in the ground on every LOD boundary crossed at speed.
    terrain.update(camera, dt);
    blades.update(camera);
    stands.update(camera);
    clouds.update(camera);
    motes.update(camera);
    built.update(camera, cluster, uTime.value, dt);
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

     **§33 owns the way out**, and it owns it from before this file has been
     downloaded: the control is in the server-rendered HTML and the head
     script binds both the click and the key. What is added here is the
     half that only exists once there is something to be inside of — an
     open writeup is what `Esc` closes first, and only with nothing open
     does it leave. Handing over is one attribute: the head script's own
     listener stands down the moment `data-world` appears, so the two never
     both fire and there is still exactly one definition of leaving. */
  addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Escape') {
      if (place.dismiss()) return;
      window.__leaveWorld?.();
      return;
    }

    /* **`F` is gone at §35.** The stick was on a key here from §29 as an
       interim, and §0.3 is explicit that free flight is offered by a visible
       control rather than a hidden one — `stick.ts` is that control, it is a
       real `<button>`, and a keyboard reader reaches it with Tab. A second
       undocumented binding for the same thing would be one more mode nobody
       can see the edges of, which is the argument that kept pointer lock out
       of §24. */
  });

  /* One pass over the quadtree before the first frame, so the opening pose
     asks for its ground at load rather than a frame after the canvas is
     already over the document. The route is what puts the camera there —
     the same call the loop makes, at wherever the URL landed (§32): a deep
     link opens at a station's settle rather than at the arrival. */
  view.drive(poseAt(ride.at(), 0), 0);
  terrain.update(camera, 0);

  /* ── Waiting for ground (§33) ────────────────────────────────────────
     The pass above *asks* for the opening pose's chunks; the workers
     answer over the next frames, and until they do the ground is squares
     of sky. So the curtain stays up and the last fifth of its bar is this
     wait, counted in the one unit that is honest here: `holes` is the
     number of wanted leaves with no generated ancestor to stand in for
     them, which is exactly "how much of this frame has no ground in it".
     It starts at the whole quadtree and reaches zero. On a cold load it
     drops by exactly the number of workers each time round, because there
     are no ancestors yet: nothing has been generated, so every wanted leaf
     has to be its own coverage and the count is the honest one.

     **Not rAF, and that is worth the sentence.** `update()` is what
     dispatches, so pumping it at the display rate hands three chunks to
     three workers and then leaves them idle for the rest of the frame:
     measured, 136 chunks took 860ms that way, against a pool that
     generates one in about three. A macrotask yield instead — which is the
     queue the worker replies arrive on, so each turn dispatches whatever
     came back on the last one. The deadline is the backstop, and it is
     wall clock rather than a frame count for the same reason. */
  const want = terrain.counts().wanted || 1;
  for (const until = performance.now() + GROUND_BY; ; ) {
    const holes = terrain.stats.holes;
    report((want - holes) / want, `generating terrain · ${want - holes}/${want} chunks`);
    if (!holes || performance.now() > until) break;
    await new Promise((next) => setTimeout(next, 0));
    terrain.update(camera, 0);
  }

  // The whole grid at once rather than a frame's worth of it: this is before
  // the first frame, where fifteen milliseconds are free and cover fading in
  // over the opening half second is not. It returns immediately at any pose
  // the disc is invisible from, which the opening pose is.
  blades.settle(camera);
  stands.settle(camera);
  clouds.settle(camera);
  motes.settle(camera);
  built.update(camera, stateAt(0), 0, 0);
  renderer.render(scene, camera);

  /* The document is behind an opaque canvas from the next line, so it must
     stop moving. The root's `overflow: hidden` alone does not do it: Lenis
     handles the wheel itself and scrolls the window programmatically, which
     is not a scroll the root can refuse. */
  holdScroll();

  document.documentElement.dataset.world = '';
  document.body.append(place.root, rail.root, stick.root, canvas);
  /* Attached before it is measured: `station.ts` reads the column's own
     height to decide how much of it the dwell has to carry, and a detached
     subtree measures zero. A deep link arrives at a settle, so this is the
     load that has a writeup open in its first frame. */
  place.update(ride.at(), 0);
  rail.update(ride.at());
  stick.update(ride.at());
  requestAnimationFrame(() => {
    canvas.setAttribute('data-ready', '');
    place.root.setAttribute('data-ready', '');
    rail.root.setAttribute('data-ready', '');
    stick.root.setAttribute('data-ready', '');

    /* And the curtain comes down, over a world that is already complete
       behind it — the canvas does not fade in under `data-mode="world"`,
       because what it would be fading in *from* is the same `--void` this
       is painted in. One layer moves, not two: a pair of eased opacities
       does not cross-fade (§20), and here there is nothing to cross-fade
       with anyway.

       Removed rather than left at zero: it is a full-viewport element over
       the whole scene, and a transparent one still composites. */
    const curtain = document.querySelector<HTMLElement>('.curtain');
    if (!curtain) return;
    report(1, 'ready');
    curtain.setAttribute('data-out', '');
    setTimeout(() => curtain.remove(), 700);
  });

  run();

  return {
    renderer, scene, camera, view, ride, place, rail, stick, take,
    sky, stars, terrain, water, blades, stands, clouds, motes, built,
    /* The loop, so it can be stopped from outside. The visibility handler
       above is one caller; a frame-cost harness is the other, and it is not
       optional there — `renderer.info` is zeroed by the renderer's own rAF
       rather than by `render()`, so a count read while the loop is running
       is whatever the last frame happened to leave behind. */
    run, stop,
  };
}
