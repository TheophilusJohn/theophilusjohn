/* §0.3 — the camera: driven by the route, and flown when the stick is out.

   **Reversed at §31, and the reversal is one flag.** §21–§24 built this as
   free flight, the default, with a guided path as the alternative; §0.3 says
   that is backwards, because scroll is what everybody does to a website
   without being told and free flight is a mode nobody discovers by accident.
   So the route drives the camera through `drive()` and every input below is
   dead until `stick(true)` — which §35's unlock is, and which is a key here
   in the meantime.

   What survives from §18's `curve.ts` is its discipline rather than its
   numbers: the pose is a function of state that is written down here and
   nowhere else, and no other module may move the camera. `route.ts` is that
   discipline taken further — the pose it hands over is a pure function of a
   scroll position — and the floor, the bounds and the recall below still
   apply to it, because a route that flew into a ridge would be a second
   answer to a question §24 settled.

   **§24 closes the three things §21 left open**, and all three are the same
   shape: a term that reshapes the *wanted* velocity before it is damped,
   plus a hard guarantee behind it. The floor is `height()` on the main
   thread — the same function the workers sample and `terrain.ts` already
   calls once a frame for its LOD. The bounds are a radius and a ceiling.
   The way back is a recall to the opening pose, because the guided path
   §0.3 would rather hand this to does not exist until §34. */

import { PerspectiveCamera, Vector3 } from 'three/webgpu';
import { height } from './height';

const DEG = Math.PI / 180;

/* Wider than the 50° the fixed curve used. That number was chosen to hold a
   ten-unit cluster in frame from a fixed distance; a camera that goes where
   it likes wants peripheral vision instead, and 60° is the usual answer for
   a flight view. §23 left it there: with a horizon band and a cloud deck to
   compose against, 60° is what puts a range and the sky over it in the same
   frame. */
const FOV = 60;

/* The far plane is past the star sphere, which is past the last chunk of
   ground (§22). Everything between 1,300 and 2,600 is fully fogged, so the
   clip is invisible and the whole range is spare. Near lifts to 0.5 with
   it: 5,200:1 is a depth range a 24-bit buffer holds without fighting, and
   §24's altitude clamp is what says nothing will ever be closer. */
const NEAR = 0.5;
const FAR = 2600;

/* Straight down and straight up are both a gimbal: at ±90° the yaw axis and
   the view axis are the same line and a drag stops meaning anything. Five
   degrees short of it. */
const PITCH_LIMIT = 85 * DEG;

/* Radians per pixel of drag. 0.25° per pixel puts a full turn at about
   1,440px — a long drag across a wide window — which is the rate that reads
   as moving your head rather than as a joystick. */
const LOOK = 0.25 * DEG;

/* §21 set this at 14 against an empty world, where there was nothing for a
   speed to be relative to. §22 gives it one: `height.ts` puts one ridge
   system 380 units from the next, so 45 crosses a range every 8.4 seconds
   and a minute in one direction passes seven of them. At 14 the same minute
   covered two and a half, and the world read as vast because it was slow —
   which is the wrong reason for a world to read as vast. Shift is 180, and
   at that a minute is 10.8km of new ground. */
const SPEED = 45;      // units per second at full input
const BOOST = 4;       // multiplier while a modifier is held

/* Momentum, and it is the same shape as the scroll damping it replaces: an
   exponential approach to the input rather than an impulse, so releasing a
   key coasts to a stop over the same constant it took to reach speed. Long
   enough to have weight, short enough that a correction lands where it was
   aimed. */
const DRIFT = 0.22;

/* §22 gives this something to compose against, and this pose is a search
   over the field rather than a guess: open ground under the camera, nothing
   within 300 units to look at, a 125-unit range between 380 and 900, and
   more ground standing behind it. 190 clears that range by 65, which puts
   its crest just above the view axis at a 9° depression — high enough to be
   the subject and low enough that the sky is still half the frame.

   The heading is 30°, which is within five of the bearing to the cluster
   massif (`height.ts`, CLUSTER_SITE) a kilometre out. That is a
   coincidence of the search rather than a composition, and §32 is what will
   make it deliberate — it sites the four structures, and this pose moves
   with them. */
const START = new Vector3(-60, 190, 60);
const START_YAW = 30;
const START_PITCH = -9;

/* ── The floor ──────────────────────────────────────────────────────────
   §0.3: an altitude clamp, not collision. The ground is a height function
   and the camera may not go under it; a cliff face is still something you
   pass through, and that is the decision rather than an omission — a world
   this size cannot afford a collider and does not want one.

   CLEARANCE is what the *drawn* surface needs rather than what the field
   does. A level-0 chunk samples at 2 units and drops part of the finest
   range octave, so the mesh under the camera sits up to about 0.6 units off
   `height(x, z, 0)`; the near plane is 0.5 in front of that, and the rest is
   so that ground arriving from below reads as ground rather than as a wipe.

   AHEAD is a *time*, so the distance scales with speed: at cruise the
   camera reads 16 units in front of itself and at boost 63. Sampled at
   four points along that leg and not only at the end — one sample skips
   whatever stands between here and there, which at boost is a whole ridge.
   What it buys is terrain following: the camera rises over a crest before
   it is inside it rather than being pushed out of it after. */
const CLEARANCE = 6;
const AHEAD = 0.35;
const AHEAD_STEPS = 4;

/* Within this of the floor, descent input is cancelled in proportion. The
   hard clamp below is the guarantee; this is what stops a reader driving
   into the ground and being bounced back out of it. It does not push up:
   flying low along a valley is a thing to be able to do. */
const CUSHION = 24;

/* ── The bounds ─────────────────────────────────────────────────────────
   §0.3 asks to be turned back rather than to hit a wall, and the field is
   infinite, so this is a decision about where the site is rather than where
   the terrain runs out.

   The radius is set by what has to be inside it. Homonoia's massif stands
   at 1,040 from the origin and reaches 600 past that (`height.ts`), and §32
   sites four structures that have to be far enough apart to be a journey
   and close enough that the next is visible from the last. Inside 3,200 the
   field runs -24.6 to 126.2 with a mean of 11.2, 40% of it under zero and
   2.7% over sixty, and 16.8 range wavelengths across the diameter —
   measured out of `height.ts` in Node over 80,381 samples, so it is the
   shipped field's own answer. Mountains standing in open country. At cruise the soft edge is
   58 seconds out and the far side is 116; at boost, 14 and 29.

   **The ceiling is the cloud deck**, and that is a measurement rather than
   a taste. `sky.ts` draws the deck only on rays that reach it from below,
   so at 620 the sky loses its clouds in every direction at once — and the
   ground goes with it, because the fog weights `dy` at 0.35 and a camera
   that high is 220 units of haze from the ground under it. Measured over
   the lower half of the frame at eleven altitudes: mean luminance falls
   from 71 at the opening pose to 45 at 480 and 25.6 at 880, and the spread
   that says the ground is still *shape* holds near 20 to 590 and then goes
   with it. So the hard limit is 560, sixty under the deck.

   BAND is the width over which the push out is taken away and the drift
   home is added, so at the far edge of it the reader is moving inward at
   RETURN even at full boost. There is no frame in which anything stops —
   and it is also why the limits are not where the reader stops: a climb
   settles where the input and the return cancel, which is 460 at cruise
   and 520 at boost. */
const BOUND = 2600;
const BOUND_BAND = 600;
const CEILING = 360;
const CEILING_BAND = 200;
const RETURN = SPEED;

/* ── The recall ─────────────────────────────────────────────────────────
   The one thing here that is not a force. §4.8 asks for a *return to path*
   control that is always visible in free flight, and since §31 there is a
   path: `flyTo` takes any pose, so the same ease that comes home is what
   rejoins the route at the station nearest to wherever the reader flew to.
   `R` and `Home` are still the opening pose.

   Eased over a duration that grows with the distance and caps, so a recall
   from the far edge is a fast pass over the landscape rather than a cut and
   rather than a minute of watching. Any input cancels it — a control that
   cannot be interrupted is a cutscene. */
const RECALL_RATE = 900;   // units per second, before the caps
const RECALL_MIN = 0.8;
const RECALL_MAX = 2.5;
const RECALL = ['KeyR', 'Home'];

/* event.code, not event.key: it names the physical key, so WASD is the same
   three fingers on AZERTY and Dvorak. */
const FORWARD = ['KeyW', 'ArrowUp'];
const BACK = ['KeyS', 'ArrowDown'];
const LEFT = ['KeyA', 'ArrowLeft'];
const RIGHT = ['KeyD', 'ArrowRight'];
const UP = ['Space', 'KeyE'];
const DOWN = ['KeyQ', 'KeyC'];

export function buildCamera(canvas: HTMLCanvasElement, aspect: number) {
  const camera = new PerspectiveCamera(FOV, aspect, NEAR, FAR);

  let yaw = START_YAW * DEG;
  let pitch = START_PITCH * DEG;
  const position = START.clone();
  const velocity = new Vector3();

  const held = new Set<string>();
  let boosting = false;
  let recall: { t: number; dur: number; from: Vector3; yaw: number; pitch: number; to: Vector3; toYaw: number; toPitch: number } | null = null;

  /* Who is flying. False is the route (§31) and every input below is
     inert; §35's unlock is what turns it on for good. */
  let flying = false;

  const forward = new Vector3();
  const right = new Vector3();
  const wanted = new Vector3();

  /* The highest ground under the camera and under where it is heading.
     `height` with no spacing is every octave — the field itself, not the
     LOD's version of it — which is the only sample that is the same answer
     at every altitude. */
  function floorAt(): number {
    const reach = Math.hypot(velocity.x, velocity.z) * AHEAD;
    let top = height(position.x, position.z);
    if (reach > 1) {
      const nx = velocity.x / Math.hypot(velocity.x, velocity.z);
      const nz = velocity.z / Math.hypot(velocity.x, velocity.z);
      for (let i = 1; i <= AHEAD_STEPS; i++) {
        const d = (reach * i) / AHEAD_STEPS;
        top = Math.max(top, height(position.x + nx * d, position.z + nz * d));
      }
    }
    return top + CLEARANCE;
  }

  function apply() {
    camera.position.copy(position);
    // YXZ so the yaw is around world up and the pitch around the camera's
    // own right — the order a look camera needs, and the reason this is not
    // lookAt(): a target point would have to be invented for a pose that is
    // already two angles.
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  }

  /* ── Driven (§31) ────────────────────────────────────────────────────
     The route hands over a pose and this is where it lands, so the one
     rule §21 wrote down still holds: the camera's position is written in
     this file and nowhere else.

     The floor applies to it. A route keyframe is composed against the
     field and clears it by 13 units at the worst point, so the clamp never
     fires — but a *guarantee* that fires only when someone is flying is not
     one, and the velocity below is what makes it the same guarantee: it is
     the pose's own delta, so `floorAt`'s look-ahead reads where the route is
     going rather than where it has been. */
  function drive(pose: { x: number; y: number; z: number; yaw: number; pitch: number }, dt: number) {
    if (dt > 0) velocity.set((pose.x - position.x) / dt, (pose.y - position.y) / dt, (pose.z - position.z) / dt);
    position.set(pose.x, pose.y, pose.z);
    yaw = pose.yaw * DEG;
    pitch = pose.pitch * DEG;
    floor();
    apply();
  }

  function update(dt: number) {
    if (recall) {
      flyHome(dt);
      floor();
      apply();
      return;
    }

    const down = (codes: string[]) => codes.some((c) => held.has(c));

    /* The input basis is the camera's, except for up. Flying "up" along the
       view axis while looking at the ground is a barrel roll nobody asked
       for; every flight camera means world up here. */
    forward.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    right.set(Math.cos(yaw), 0, -Math.sin(yaw));

    wanted.set(0, 0, 0);
    if (down(FORWARD)) wanted.add(forward);
    if (down(BACK)) wanted.sub(forward);
    if (down(RIGHT)) wanted.add(right);
    if (down(LEFT)) wanted.sub(right);
    if (down(UP)) wanted.y += 1;
    if (down(DOWN)) wanted.y -= 1;
    // Normalised, or two keys at once is 1.41x the speed of one.
    if (wanted.lengthSq() > 0) wanted.normalize().multiplyScalar(SPEED * (boosting ? BOOST : 1));

    bound();
    cushion();

    const k = 1 - Math.exp(-dt / DRIFT);
    velocity.addScaledVector(wanted.sub(velocity), k);
    position.addScaledVector(velocity, dt);

    floor();
    apply();
  }

  /* ── The bounds, as a term on `wanted` ───────────────────────────────
     Not a wall and not a spring. Over the band the outward part of the
     input is taken away in proportion and a drift home is added in the
     same proportion, so past the far edge every input has an inward
     resultant and the camera comes back on its own. A reader pressing W at
     the edge feels the world lean rather than a stop.

     The hard clamps after the integration are a guarantee rather than a
     behaviour: the loop caps dt at 1/30, so nothing that happens at these
     speeds reaches them. They are what makes "cannot" true. */
  function bound() {
    const r = Math.hypot(position.x, position.z);
    if (r > BOUND && r > 0) {
      const t = Math.min((r - BOUND) / BOUND_BAND, 1);
      const nx = position.x / r;
      const nz = position.z / r;
      const out = wanted.x * nx + wanted.z * nz;
      if (out > 0) {
        wanted.x -= nx * out * t;
        wanted.z -= nz * out * t;
      }
      wanted.x -= nx * RETURN * t;
      wanted.z -= nz * RETURN * t;
    }

    if (position.y > CEILING) {
      const t = Math.min((position.y - CEILING) / CEILING_BAND, 1);
      if (wanted.y > 0) wanted.y -= wanted.y * t;
      wanted.y -= RETURN * t;
    }
  }

  /* Descent input only, and only near the ground. The floor below is what
     stops the camera going under; this is what stops it being *put* back
     out, which is the difference between a limit and a bounce. */
  function cushion() {
    if (wanted.y >= 0) return;
    const gap = position.y - floorAt();
    if (gap >= CUSHION) return;
    wanted.y *= Math.max(gap, 0) / CUSHION;
  }

  function floor() {
    const y = floorAt();
    if (position.y < y) {
      position.y = y;
      // Or the descent that was arrested accumulates while the ground rises
      // and fires the camera upward the moment the ridge is behind it.
      if (velocity.y < 0) velocity.y = 0;
    }
    const r = Math.hypot(position.x, position.z);
    const max = BOUND + BOUND_BAND;
    if (r > max) {
      position.x *= max / r;
      position.z *= max / r;
    }
    position.y = Math.min(position.y, Math.max(CEILING + CEILING_BAND, y));
  }

  /* ── The recall ──────────────────────────────────────────────────────
     Eased on a smoothstep so it leaves and arrives at rest, and the yaw
     takes the short way round — a recall that unwinds 350° is a spin. The
     floor still applies while it runs, so the way home is a pass over the
     landscape rather than a line through it.

     §31 generalises it to any pose, because rejoining the route is the same
     movement as coming home: the reader is somewhere they flew to and the
     camera has to arrive at a composed pose without cutting. */
  function flyTo(to: { x: number; y: number; z: number; yaw: number; pitch: number }) {
    const target = new Vector3(to.x, to.y, to.z);
    recall = {
      t: 0,
      dur: Math.min(Math.max(position.distanceTo(target) / RECALL_RATE, RECALL_MIN), RECALL_MAX),
      from: position.clone(),
      yaw,
      pitch,
      to: target,
      toYaw: to.yaw * DEG,
      toPitch: to.pitch * DEG,
    };
  }

  const home = () => flyTo({ x: START.x, y: START.y, z: START.z, yaw: START_YAW, pitch: START_PITCH });

  function flyHome(dt: number) {
    const r = recall!;
    r.t = Math.min(r.t + dt / r.dur, 1);
    const s = r.t * r.t * (3 - 2 * r.t);
    position.lerpVectors(r.from, r.to, s);
    const turn = ((r.toYaw - r.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    yaw = r.yaw + turn * s;
    pitch = r.pitch + (r.toPitch - r.pitch) * s;
    velocity.set(0, 0, 0);
    if (r.t >= 1) recall = null;
  }

  /* ── Look ────────────────────────────────────────────────────────────
     Drag rather than pointer lock. Lock is the better control and it is a
     permission prompt, a browser-drawn escape overlay and a mode the reader
     cannot see the edges of — none of which belong on the first thirty
     seconds of a portfolio. §24 left it that way: a mode with an escape
     overlay of its own is one more thing between the reader and the way
     out, and §0.6 is explicit that the world is escapable first.

     Undamped, deliberately, where the movement is damped: a look that lags
     the hand reads as latency rather than as weight, and this is the one
     input where the pointer is a direct manipulation of the frame. */
  let dragging = -1;
  let lastX = 0, lastY = 0;

  canvas.addEventListener('pointerdown', (event) => {
    if (!flying || event.button !== 0) return;
    recall = null;
    dragging = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.dataset.dragging = '';
  });

  /* The delta is taken from the last client position rather than from
     `movementX`. Both are the same number under a captured pointer where
     movementX is implemented; it is not reliably implemented outside
     pointer lock, and a look control that silently does nothing on one
     browser is the kind of failure nobody reports. */
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerId !== dragging) return;
    yaw -= (event.clientX - lastX) * LOOK;
    pitch -= (event.clientY - lastY) * LOOK;
    lastX = event.clientX;
    lastY = event.clientY;
    pitch = Math.min(Math.max(pitch, -PITCH_LIMIT), PITCH_LIMIT);
  });

  const release = (event: PointerEvent) => {
    if (event.pointerId !== dragging) return;
    dragging = -1;
    delete canvas.dataset.dragging;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  /* ── Keys ────────────────────────────────────────────────────────────
     On the window, because the canvas is not focusable and making it so
     would put an unlabelled control in the tab order for no keyboard reader
     to use (§0.6: the world is escapable, not navigable). A modifier means
     the reader is talking to the browser, so nothing is captured then. */
  addEventListener('keydown', (event) => {
    if (!flying || event.metaKey || event.ctrlKey || event.altKey) return;
    boosting = event.shiftKey;
    if (RECALL.includes(event.code)) {
      // Not on the OS repeat: each one would restart the ease from wherever
      // the last had reached, and a held key would never arrive.
      if (!event.repeat) home();
      event.preventDefault();
      return;
    }
    if (!isMove(event.code)) return;
    // A recall is a suggestion. Any input at all is the reader taking the
    // stick back, and it must not have to be fought for.
    recall = null;
    held.add(event.code);
    // Space scrolls a document and the arrows scroll it too. There is no
    // document to scroll in world mode, and preventing it is what stops the
    // page underneath from moving while the reader is flying.
    event.preventDefault();
  });

  addEventListener('keyup', (event) => {
    boosting = event.shiftKey;
    held.delete(event.code);
  });

  /* A window that loses focus keeps whatever was held down, and the camera
     flies off in that direction until it comes back. */
  addEventListener('blur', () => {
    held.clear();
    boosting = false;
  });

  // The opening pose is composed against the field (§22) and stands 196
  // units over it, but nothing guarantees that of a pose in general and the
  // floor is the thing that has to be true on the first frame as well.
  floor();
  apply();

  return {
    camera,
    update,
    drive,
    home,
    flyTo,
    /** True while an eased move is running, which is the one time neither
        the route nor the reader is holding the camera. */
    easing: () => recall !== null,
    /** §35's unlock, on a key until then. Handing the stick over zeroes the
        velocity: the route's own delta can be a thousand units a second on a
        flick, and inheriting that would fling the reader across the world on
        the frame they took control. */
    stick(on: boolean) {
      flying = on;
      velocity.set(0, 0, 0);
      held.clear();
      boosting = false;
      if (!on) recall = null;
    },
    flying: () => flying,
    /** Nothing in the site reads this — it is what a harness measures a
        flight with, and `ground` is what makes the clamp checkable. */
    pose: () => ({
      x: position.x, y: position.y, z: position.z,
      yaw: yaw / DEG, pitch: pitch / DEG,
      speed: velocity.length(),
      ground: height(position.x, position.z),
    }),
  };
}

const isMove = (code: string) =>
  FORWARD.includes(code) || BACK.includes(code) || LEFT.includes(code) ||
  RIGHT.includes(code) || UP.includes(code) || DOWN.includes(code);
