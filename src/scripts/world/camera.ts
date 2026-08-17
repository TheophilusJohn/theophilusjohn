/* §0.3 — free flight, and it is the default rather than an unlock.

   **This replaces the scroll-driven curve.** Until §21 the camera was a
   pure function of scroll position: ten keyframes, smoothstepped, keyed to
   where four pins put twelve beats, with a fourth channel carrying the
   exposure. That whole construction belongs to a world sitting *behind* a
   document, and §0 puts the world in front of it. The path between the four
   projects comes back at §28 as one thing the camera can be driven by, not
   as the only place it can be.

   What survives from `curve.ts` is its discipline rather than its numbers:
   the pose is a function of state that is written down here and nowhere
   else, and no other module may move the camera.

   **Deliberately minimal.** §24 owns the altitude clamp, the soft bounds
   and the return-to-path control. There is no ground to clamp against and
   nowhere to be turned back from until §22, so building either now would be
   building against a world that does not exist. What is here is enough to
   look around and fly, damped, so §22 has something to inspect terrain
   with. */

import { PerspectiveCamera, Vector3 } from 'three/webgpu';

const DEG = Math.PI / 180;

/* Wider than the 50° the fixed curve used. That number was chosen to hold a
   ten-unit cluster in frame from a fixed distance; a camera that goes where
   it likes wants peripheral vision instead, and 60° is the usual answer for
   a flight view. §23 may want it back once there is a horizon to compose
   against. */
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
   coincidence of the search rather than a composition, and §26 is what will
   make it deliberate — it sites the four structures, and this pose moves
   with them. */
const START = new Vector3(-60, 190, 60);
const START_YAW = 30;
const START_PITCH = -9;

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

  const forward = new Vector3();
  const right = new Vector3();
  const wanted = new Vector3();

  function apply() {
    camera.position.copy(position);
    // YXZ so the yaw is around world up and the pitch around the camera's
    // own right — the order a look camera needs, and the reason this is not
    // lookAt(): a target point would have to be invented for a pose that is
    // already two angles.
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  }

  function update(dt: number) {
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

    const k = 1 - Math.exp(-dt / DRIFT);
    velocity.addScaledVector(wanted.sub(velocity), k);
    position.addScaledVector(velocity, dt);

    apply();
  }

  /* ── Look ────────────────────────────────────────────────────────────
     Drag rather than pointer lock. Lock is the better control and it is a
     permission prompt, a browser-drawn escape overlay and a mode the reader
     cannot see the edges of — none of which belong on the first thirty
     seconds of a portfolio. §24 may offer it as an opt-in.

     Undamped, deliberately, where the movement is damped: a look that lags
     the hand reads as latency rather than as weight, and this is the one
     input where the pointer is a direct manipulation of the frame. */
  let dragging = -1;
  let lastX = 0, lastY = 0;

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
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
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    boosting = event.shiftKey;
    if (!isMove(event.code)) return;
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

  apply();

  return {
    camera,
    update,
    pose: () => ({
      x: position.x, y: position.y, z: position.z,
      yaw: yaw / DEG, pitch: pitch / DEG,
      speed: velocity.length(),
    }),
  };
}

const isMove = (code: string) =>
  FORWARD.includes(code) || BACK.includes(code) || LEFT.includes(code) ||
  RIGHT.includes(code) || UP.includes(code) || DOWN.includes(code);
