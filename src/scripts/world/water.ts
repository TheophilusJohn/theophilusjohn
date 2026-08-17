/* §0.2 — water, and it is one plane.

   **Lakes, not rivers.** A global level and a surface drawn where the ground
   is below it. On a heightfield that is nearly free: the terrain is opaque
   and drawn first, so a plane at `WATER` is hidden everywhere the ground
   stands above it and visible everywhere it does not. Nothing here knows
   where a lake is. The basins the field already produces are the lakes, and
   the shoreline is the exact intersection of two surfaces rather than a
   curve anybody had to find.

   Rivers are not this. They need flow accumulation over the whole field or
   channels carved into the generator, which is a project of its own — and
   the cheap substitute, a ribbon of noise, reads as a stain rather than as
   water. **Not now**, and §0.2 says so in the same words.

   **One quad-fan of 64 triangles, one draw call, no LOD and no state.** The
   disc is centred on the camera in the shader the way the sky sphere is
   (§23), so it needs no update from the loop and is never culled. Everything
   else — the mirror, the ripple, the glance — is per fragment off
   `positionWorld`, which is why the geometry can be this crude.

   **Underwater is not a mode.** §24's floor is `height() + 6` and a lake is
   up to 16.6 units deep, so the camera can fly under the surface and the
   only thing that happens is that it is seen from below: the normal takes
   the sign of which side the eye is on, and the fog and the light are the
   ones every other surface uses. A submerged render path is a whole second
   set of decisions for something nobody does twice. */

import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicNodeMaterial } from 'three/webgpu';
import {
  cameraPosition,
  cos,
  float,
  fwidth,
  mix,
  positionLocal,
  positionWorld,
  reflect,
  smoothstep,
  vec2,
  vec3,
} from 'three/tsl';
import type Node from 'three/src/nodes/core/Node.js';
import type UniformNode from 'three/src/nodes/core/UniformNode.js';
import { fog } from './fog';
import { WATER } from './height';
import type { Palette } from './palette';
import { gradient, haze } from './sky';
import { SUN } from './sun';

/* Inside the camera's far plane (2,600) at every altitude the ceiling
   allows, and outside the last chunk of ground. The rim is 2,500 units out
   and fog has taken the surface to the sky's own colour by 1,300, so what
   the ring of water past the edge of the terrain does is hide the edge of
   the terrain. */
const REACH = 2500;
const SIDES = 64;

/* ── The ripple ─────────────────────────────────────────────────────────
   §0.2: still, mostly. A slow normal perturbation and no waves — this is
   high country at night, not a coast. Four directional waves, and what is
   summed is the *slope* rather than a height, because nothing here displaces
   geometry: the surface is tilted by at most 4.2° close to the eye and 2.4°
   past 180 units, which is what puts a wobble in the mirror's band edges and
   a bite in the edge of the glance.

   Wavelengths are not harmonics of each other, or the four would line up
   into one wave every 34 units. Drift is a fixed direction until §27, which
   builds the one wind field everything that moves is supposed to read.

   **Each wave has its own reach**, which is `height.ts`'s Nyquist argument
   at a different scale: a ripple whose wavelength is under a couple of
   pixels is not detail, it is a crawl, and a hard-edged glance over it is a
   field of sparkle — the failure the cloud deck has at grazing angles (§23).
   So each one is faded out over the last 60% of its own reach, and the far
   water is a flat mirror, which is what it should be anyway.

   **What sets each speed is its own wavelength**, and that is a measurement
   rather than a feel. With the camera still and the clock stepped by hand a
   frame at a time, a 12×12 block of the surface moved 10.8 levels of luma in
   one frame at the first pass — against 1.2 for the cloud deck, which is the
   only other thing in the frame that moves on its own. The offender was the
   short wave: what a band edge sees is cycles per second, `speed / length`,
   and at 2.3 over 6 units that one was 0.38 Hz against the longest wave's
   0.03. Held between 0.03 and 0.07 the whole surface moves 2.3 levels a
   frame, which is under twice the sky. Water that changes faster than the
   sky is not still. */
const WAVES = [
  { length: 34, slope: 0.018, dir: [0.94, 0.34], speed: 1.1, reach: 900 },
  { length: 21, slope: 0.014, dir: [-0.42, 0.91], speed: 0.9, reach: 620 },
  { length: 13, slope: 0.010, dir: [0.65, -0.76], speed: 0.7, reach: 400 },
  { length: 6, slope: 0.032, dir: [-0.87, -0.49], speed: 0.4, reach: 180 },
] as const;

/* ── The mirror ─────────────────────────────────────────────────────────
   The body of the water is the sky reflected in it, which on a flat surface
   is `gradient()` of the reflected view ray — so a lake seen from above is
   nearly --void because it is mirroring the zenith, and the far end of the
   same lake is the horizon band because it is mirroring that. The gradient
   does most of a fresnel's work on its own; this term is what stops the near
   water being a weak copy of the sky, by holding it dark until the view is
   glancing enough for a reflection to be the honest answer.

   Quantised in three, like every other surface in this world (§0.2), with
   the same one-pixel `fwidth` edge the ground bands on. What that draws is
   two arcs across a lake — the near third dark, the far third sky — and
   they are the reason a flat plane reads as a *surface* rather than as a
   hole cut in the terrain.

   **The dark end is --void-lift and §0.2 says --void.** One token, and it
   is the difference between a lake and a hole: --void is the clear colour,
   what the fog takes everything to, and the sky at the zenith, so a surface
   painted in it has no value of its own at exactly the angles where the
   mirror gives it none either. One step up is still darker than any band the
   ground has and still darker than the sky over it — the water is the
   darkest thing in the frame either way, and at --void-lift it is a thing
   rather than an absence. */
const MIRROR_LO = 0.30;
const MIRROR_HI = 0.92;
const MIRROR_MID = 0.34;
const MIRROR_TOP = 0.72;
const EDGE = 0.8;

/* ── The glance ─────────────────────────────────────────────────────────
   Where the key light comes back off the water: the one place in the frame
   that is --leader because something is happening there rather than because
   something is marked. One band, hard-edged, no falloff — a smooth specular
   on a cel surface is the tell that the lighting model was borrowed.

   The threshold is a cosine, so 0.995 is a cone about 5.7° wide, and where
   it lands is arithmetic rather than taste: the reflected ray has to reach a
   light 31° up, so the glance sits where the view depression is 31° — a band
   of water about 320 units out from the opening pose and 100 from a low
   pass. The ripple deviates the reflection by up to 8°, which is what breaks
   that band into a path at altitude.

   **It stays a patch at close range and a tighter cone is worse.** Inside
   about 150 units the glance is wider than the ripple that would break it,
   so it draws as one slab with bites out of its edges; at 0.999 it breaks
   there and is reduced to two specks of a few pixels at the cruise pose,
   which is the view the world is actually flown from. A band that reads at
   190 units up and is a solid patch at 50 is the better trade. */
const GLANCE = 0.995;
const GLANCE_EDGE = 1.6;

export function buildWater(palette: Palette, time: UniformNode<'float', number>) {
  const material = new MeshBasicNodeMaterial({ side: DoubleSide, fog: false });

  /* The disc follows the camera in x and z only: its y is the world's water
     level and the whole point of it is that the level is the same
     everywhere. */
  material.positionNode = positionLocal.add(vec3(cameraPosition.x, 0, cameraPosition.z));

  const eye = cameraPosition.sub(positionWorld);
  const dist = eye.length();
  const toEye = eye.normalize();

  const p = vec2(positionWorld.x, positionWorld.z);
  let slope: Node<'vec2'> = vec2(0, 0);
  for (const wave of WAVES) {
    const k = (Math.PI * 2) / wave.length;
    const dir = vec2(wave.dir[0], wave.dir[1]);
    const phase = p.dot(dir).sub(time.mul(wave.speed)).mul(k);
    const damp = smoothstep(wave.reach, wave.reach * 0.4, dist);
    slope = slope.add(dir.mul(cos(phase).mul(wave.slope).mul(damp)));
  }

  /* Which side of the surface the eye is on. Above, the normal is up;
     below, the whole thing is flipped and the same expression mirrors the
     sky under the horizon instead of over it. `sign` rather than a branch —
     it is one multiply and it is exact at the only value that matters. */
  const side = cameraPosition.y.sub(WATER).sign();
  const normal = vec3(slope.x.negate(), 1, slope.y.negate()).normalize().mul(side);

  const bounce = reflect(toEye.negate(), normal);

  const grazing = float(1).sub(normal.dot(toEye).max(0));
  const t = smoothstep(MIRROR_LO, MIRROR_HI, grazing);
  const edge = fwidth(t).mul(EDGE).max(0.001);
  const cut = (at: number) => smoothstep(float(at).sub(edge), float(at).add(edge), t);
  const mirror = cut(MIRROR_MID).add(cut(MIRROR_TOP)).mul(0.5);

  const surface = mix(palette.lift, gradient(bounce, palette), mirror);

  const glance = bounce.dot(vec3(SUN.x, SUN.y, SUN.z));
  const lit = fwidth(glance).mul(GLANCE_EDGE).max(0.0002);
  const spark = smoothstep(float(GLANCE).sub(lit), float(GLANCE).add(lit), glance);

  /* Same fog and the same thing to fade into as the ground (§23). A lake at
     900 units that arrived at --void while the ridge behind it arrived at
     the sky would draw its own outline on the horizon. */
  const depth = fog(positionWorld);
  material.colorNode = mix(haze(toEye, palette), mix(surface, palette.lead, spark), depth);

  const mesh = new Mesh(disc(), material);
  // Centred on the camera in the shader, so its own bounds say nothing.
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  /* After the ground and before the sky. The plane covers the whole lower
     half of the frame, so drawing it before the terrain would shade every
     pixel of it twice; drawing it before the sky is what keeps the deck's
     two fractal noises off the pixels the water already owns. */
  mesh.renderOrder = 1;

  return { mesh, material };
}

/* A fan rather than a quad, because a quad big enough to reach the horizon
   in every direction has corners outside the far plane and the clip is a
   straight edge across the water. */
function disc() {
  const position = new Float32Array((SIDES + 2) * 3);
  position[1] = WATER;
  for (let i = 0; i <= SIDES; i++) {
    const a = (i / SIDES) * Math.PI * 2;
    const o = (i + 1) * 3;
    position[o] = Math.cos(a) * REACH;
    position[o + 1] = WATER;
    position[o + 2] = Math.sin(a) * REACH;
  }

  const index = new Uint16Array(SIDES * 3);
  for (let i = 0; i < SIDES; i++) {
    index[i * 3] = 0;
    index[i * 3 + 1] = i + 1;
    index[i * 3 + 2] = i + 2;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
}
