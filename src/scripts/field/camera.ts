/* §4.7 / §18 — scroll is altitude.

   One curve, and both modes read it. Scrolling the page *is* the flight,
   which is the whole reason document mode is not a lesser version of world
   mode: §4.8 adds control of this camera rather than adding the world.

   The state must be a pure function of scroll position (§4.7), so nothing
   here integrates, accumulates or remembers. The damping below is a lag on
   the *input* — the curve is evaluated at a scroll position a fraction of
   a second behind the real one, so a fast scroll arrives with momentum —
   and it converges on the honest answer within a few frames of coming to
   rest. Landing deep-linked mid-page is `snap()`, which is the same
   function with the lag taken out.

   §17 revised where the curve is keyed. A project is three beats now, and
   they are three stages of one continuous descent, so the camera has to be
   visibly lower at beat 3 than at beat 1 of the same project and the
   landscape resolves as the writeup arrives. A beat is a scroll range
   inside a pin and only the pin knows where it is, so the keyframes come
   from projects.ts rather than from a fraction of the document.

   The path itself is in curve.ts. */

import { PerspectiveCamera } from 'three/webgpu';
import { motionOff } from '../motion';
import { ranges } from '../projects';
import { keyframes, poseAt, type Key } from './curve';

const DEG = Math.PI / 180;

/* Short. Long enough that a flung scroll arrives with weight, short enough
   that the pose is the honest one before a reader has finished reading the
   line that brought them there. */
const LAG = 0.18;

/* §4.7: a couple of degrees, eased. It costs nothing and does more for the
   sense of depth than anything else in this section — and it matters more
   since §4.3, because two beats in three are now mostly world. */
const YAW = 2.2 * DEG;
const TILT = 1.4 * DEG;
const POINTER_LAG = 0.32;

export function buildCamera(aspect: number) {
  // The far plane is the ground disc and the star sphere behind it.
  const camera = new PerspectiveCamera(50, aspect, 0.1, 260);

  let keys: Key[] = [];

  function remeasure() {
    keys = keyframes(ranges(), Math.max(1, document.documentElement.scrollHeight - innerHeight));
  }

  let at = 0;
  let px = 0, py = 0, tx = 0, ty = 0;

  function apply() {
    const pose = poseAt(keys, at);
    camera.position.set(0, pose.alt, pose.dist);
    // YXZ, so the yaw is around world up and the tilt is around the
    // camera's own right — the order a look-down camera needs, and the
    // reason this is not lookAt(): a target point would have to be
    // invented for a pose that is already two angles.
    camera.rotation.set(-pose.pitch * DEG - py * TILT, -px * YAW, 0, 'YXZ');
  }

  function update(dt: number) {
    /* More than a screen in one frame is not a scroll, it is a jump: a
       deep link's re-jump once the pins are in (§17), the correction
       keepingPlace makes when four pins are created under the reader, an
       in-page link, the back button. The lag is there to give a flick
       weight and would fly the camera in over half a second from a pose
       nobody was ever at. Arrive instead. At 60fps a flick would have to
       cover 48,000px/s to reach this. */
    if (Math.abs(scrollY - at) > innerHeight) at = scrollY;

    const k = 1 - Math.exp(-dt / LAG);
    at += (scrollY - at) * k;

    const parallax = !motionOff();
    const pk = 1 - Math.exp(-dt / POINTER_LAG);
    px += ((parallax ? tx : 0) - px) * pk;
    py += ((parallax ? ty : 0) - py) * pk;

    apply();
  }

  /* No lag, no parallax: the pose the scroll position actually names. Used
     for the first frame, where the reader may have deep-linked into the
     middle of the page, and for coming back from a frozen or backgrounded
     state, where the lag would otherwise fly the camera in from wherever
     it was left. */
  function snap() {
    at = scrollY;
    px = py = tx = ty = 0;
    apply();
  }

  /* Only on a pointer that can hover. A touch device has no resting
     pointer position, so this would be driven by taps. */
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', (event) => {
      tx = (event.clientX / document.documentElement.clientWidth) * 2 - 1;
      ty = (event.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  remeasure();

  return { camera, update, snap, remeasure };
}
