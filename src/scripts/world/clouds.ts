/* §0.2 — cloud you can fly through, and it is the one thing in this world
   built against a warning in its own spec.

   §23's deck is a ray–plane intersection: real parallax, no geometry, and
   **you cannot reach it**. It recedes to a line at the horizon and passes
   overhead when you climb, and at no altitude the camera can reach (§24 caps
   it at 560 against the deck's 620) does it become a place. So §0.2 asks for
   volume in the near field, and then says the quiet part out loud: "soft
   billboards in a hard-banded world is a contradiction, and it may have to
   be banded to the point of looking like solid forms. Try it, look at it,
   cut it if it fights the shading."

   It does not fight the shading, and the reason is the one decision in this
   file that is not a number: **a form is never seen close up.** A puff fades
   out over the same band the murk fades in, so what a reader flying into a
   cloud sees is not a card turning to face them — it is a shape ahead, then
   the world closing in, then the shape behind. The billboard is what a cloud
   looks like from outside and the murk is what one looks like from inside,
   and neither is ever asked to be the other.

   ── The three parts ────────────────────────────────────────────────────
   - **Placement**, a pure function of a world cell, like everything else
     scattered on this world (§0.2) — except that the cells are in *cloud
     space*, which is the world sliding downwind at the deck's own rate. So
     the forms advect along `wind.ts` with the deck over them and nothing has
     to be re-placed as they do.
   - **A puff**, which is a camera-facing quad with a lobed outline and
     banded alpha. Not a gradient: the coverage is quantised into terraces
     the way the deck's is, so the edge of a cloud is a set of steps and the
     lit side of one is two flat regions rather than a ramp.
   - **The murk**, which lives in `fog.ts` because being inside a cloud is a
     fact about how far you can see. It is written here, from the camera's
     distance to the nearest puff, and everything that fogs reads it.

   ── What it is not ─────────────────────────────────────────────────────
   Not a volume, not a raymarch, not a second deck. Twenty-five cells of nine
   puffs is **one draw call and 450 triangles** for the whole layer, and its
   whole cost is the fill of a few large quads. */

import {
  BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  MeshBasicNodeMaterial,
  Vector3,
  type Camera,
} from 'three/webgpu';
import {
  atan,
  attribute,
  cameraPosition,
  mix,
  positionWorld,
  sin,
  smoothstep,
  uniform,
  vec2,
} from 'three/tsl';
import type UniformNode from 'three/src/nodes/core/UniformNode.js';
import { hash3 } from './cover';
import { fog, murk } from './fog';
import type { Palette } from './palette';
import { haze } from './sky';
import { SUN } from './sun';
import { DECK_DRIFT, WIND } from './wind';

/* ── Where a form stands ────────────────────────────────────────────────
   One cell of 620 units carries at most one form, and a fifth of the cells
   carry none, so the sky has holes in it that are bigger than the clouds. A
   5×5 window around the camera reaches 1,550 units, which is past where the
   fog has taken anything to the sky's own colour — a form is faded out long
   before its cell leaves the window, so nothing ever appears.

   620 is the deck's own noise scale (`sky.ts`), and that is deliberate
   rather than a reuse: the deck's smallest feature is about 155 units and
   its cells are 620, so a near-field form arriving every 620 units is the
   same weather at a different distance instead of a second, finer sky. */
const CELL = 620;
const GRID = 5;
const EMPTY = 0.2;
const PUFFS = 9;
const COUNT = GRID * GRID * PUFFS;

/* ── How high ───────────────────────────────────────────────────────────
   §0.2 wants them "under the same deck", and §24 makes that a hard
   arithmetic rather than a preference: the camera's ceiling equilibrium is
   460 at cruise and 520 at boost, and its hard clamp is 560. A form at 620
   is scenery. 205 to 415 is the band a reader actually flies through —
   above every ridge the field produces (126.2, §24) and under everything
   the camera can be pushed to. */
const LOW = 205;
const HIGH = 415;

/* A form is a flattened cluster: nine puffs inside ±76 units horizontally
   and ±20 vertically, so with the radii below it is about 300 across and 140
   deep. Clouds are wider than they are tall. */
const SPREAD = 76;
const RISE = 20;

/* A puff's own radius, and the pair below it is the ratio that matters:
   **the puffs have to be big against the spread or a form is a bunch of
   grapes.** At the first build's 38–72 against ±78 the individual discs were
   separately legible at three hundred units and the opening frame came back
   with a swarm of small grey lumps under the deck. At 52–98 against ±76 the
   nine of them overlap into one silhouette with terraces on it, which is
   what a cel cloud is. */
const R_LOW = 52;
const R_RANGE = 46;

/* ── The near fade, and the murk that replaces it ───────────────────────
   Both are the same two numbers, which is the whole construction: a puff is
   at full strength past OUT of its own radius, gone by IN, and the murk runs
   the other way over exactly that band. So there is no distance at which the
   reader can see a flat card and no distance at which the world is clear
   *and* the cloud has vanished — the two hand over.

   IN is inside the puff rather than at its centre because a cluster is nine
   of them: by the time the nearest is gone the reader is among the rest, and
   the murk is at its ceiling. */
const NEAR_IN = 0.55;
const NEAR_OUT = 1.45;

/* And the far one, which is a composition decision rather than a cost.
   §0.2 asks for volume **in the near field**, and the deck is what carries
   the distance; a form left to fog out on its own is still a third opaque
   at seven hundred units, and the opening pose came back with nine of them
   strung along the horizon reading as a swarm of small grey lumps under the
   deck's own band. Faded out by 1,150 there are about eight inside the
   reach at any time, near enough to have size. */
const FAR = 1150;
const FAR_IN = 820;

/* ── The shape ──────────────────────────────────────────────────────────
   A disc with lobes on it, which is the cheapest outline that is not a
   circle: the radius is modulated by two harmonics of θ at a phase of the
   puff's own, so nine of them overlapping have an outline with no symmetry
   any one of them has.

   **EDGE has to keep the disc inside its own quad, and that is a
   measurement rather than a margin.** A quad's inscribed radius is 1 in
   these units and its corners are at 1.41, so a coverage that reaches
   `EDGE·(1 + LOBE)` past 1 is cut off by the quad's own edge — and the
   first build's did, at 1.20. What comes back is not a soft cloud: it is a
   set of shapes with three or four dead-straight sides, which read as cut
   paper and were very nearly the reason this layer was cut. 0.84·1.15 is
   0.97, and it is the whole difference between a cloud and origami.

   STEPS is the terracing, and it is the deck's own number (`sky.ts`): the
   coverage is quantised into three so the edge is a set of steps. That is
   what stops this being a soft billboard in a banded world. */
const LOBE = 0.10;
const LOBE_2 = 0.05;
const LOBES = 3;
const LOBES_2 = 5;
const EDGE = 0.84;
const EDGE_IN = 0.64;
const STEPS = 3;
const ALPHA = 1;

/* ── The lit face ──────────────────────────────────────────────────────
   **The same construction the deck's is** (`sky.ts`): a second sample of
   the same shape, displaced toward the light. Where the displaced shape is
   still inside the puff, this is a part of it the light reaches; where it
   is not, this is the shaded side. That gives a *crescent* on the sun side
   with the puff's own lobed outline in it.

   The first build asked the other obvious question instead — the dot of the
   pixel's direction from the centre with the sun's — and the answer is an
   angular sweep, so the terminator is a straight line through the middle of
   every puff and the layer comes back as folded paper. A cloud's lit face
   is a *region*, not a hemisphere.

   **LIFT is a whole radius, and it has to be.** The lit region is the lens
   where a disc displaced by LIFT still overlaps the one it came from, and
   that lens is 61% of the puff at half a radius and 39% at one — so at the
   first build's 0.42 every form came back almost entirely `--paper`, which
   is a daytime cloud in a world that is night. At 0.9 the lit face is a
   third of the puff and the body is the other two. */
const LIFT = 0.78;
const LIT_STEPS = 2;

/* Where the *unlit* body sits between the two tokens, and it is the second
   thing the first build got wrong in the other direction. At 0 the body is
   `--rule`, which against this sky at cloud altitude is very nearly the same
   value — so the shaded two thirds of every puff disappeared and what was
   left was a white lens floating in the sky with no cloud around it. The
   deck has never had this problem because its own `lit` term is a smoothstep
   that is rarely zero. At 0.42 the three tones are 0.42, 0.71 and 1, which
   is the deck's own spacing and a body that is visibly cloud. */
const LIT_FLOOR = 0.42;

const TAU = Math.PI * 2;

export function buildClouds(palette: Palette, time: UniformNode<'float', number>) {
  const geometry = quad();

  /* A puff's centre, in cloud space — the drift below is added in the
     shader, so nothing is re-placed as the sky moves. */
  const iPos = new Float32Array(COUNT * 3);
  /* Its radius and the phase of its lobes. */
  const iAim = new Float32Array(COUNT * 2);
  const aPos = new InstancedBufferAttribute(iPos, 3);
  const aAim = new InstancedBufferAttribute(iAim, 2);
  geometry.setAttribute('iPos', aPos);
  geometry.setAttribute('iAim', aAim);
  geometry.instanceCount = COUNT;

  const camRight = uniform(new Vector3(1, 0, 0));
  const camUp = uniform(new Vector3(0, 1, 0));
  /* The key light in the billboard's own plane, so the lit face is a
     two-component dot in the fragment rather than a basis per pixel. */
  const sunFace = uniform(new Vector3(0, 1, 0));
  /* Where cloud space is relative to the world this frame. One vector,
     written from the same clock the shader reads, so the CPU's idea of where
     a form is and the GPU's cannot drift. */
  const drift = uniform(new Vector3());

  /* **Single-sided, and that is a draw call rather than a preference.** The
     renderer draws a transparent *double*-sided object twice — back faces,
     then front — so the first build cost two draw calls and 900 triangles
     for a layer that has one visible side by construction: a billboard is
     built in the camera's own basis and its back is never toward the eye. */
  const material = new MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });

  const pos = attribute<'vec3'>('iPos', 'vec3');
  const aim = attribute<'vec2'>('iAim', 'vec2');
  const corner = attribute<'vec2'>('qOff', 'vec2');

  const radius = aim.x;
  const centre = pos.add(drift);
  const offset = camRight.mul(corner.x).add(camUp.mul(corner.y));
  material.positionNode = centre.add(offset.mul(radius));

  /* ── The outline ─────────────────────────────────────────────────────
     `corner` runs ±0.5, so `p` doubled is 0 in the middle and 1 at the edge
     of the quad, and the two harmonics push that in and out by a seventh.
     Written once and evaluated twice — the body and the lit face are the
     same shape at two places, which is what makes the crescent belong to
     the puff rather than to the light. Two `atan`s and two `sin`s per
     pixel, and they are the only transcendentals in this layer. */
  const shape = (p: ReturnType<typeof vec2>) => {
    const r = p.length().mul(2);
    const theta = atan(p.y, p.x);
    const phase = aim.y.mul(TAU);
    const lobe = sin(theta.mul(LOBES).add(phase)).mul(LOBE)
      .add(sin(theta.mul(LOBES_2).sub(phase)).mul(LOBE_2))
      .add(1);
    return smoothstep(EDGE, EDGE_IN, r.div(lobe));
  };

  const cover = shape(vec2(corner.x, corner.y));
  // Terraced rather than faded: three flat regions with hard steps between.
  const banded = cover.mul(STEPS).ceil().div(STEPS).clamp(0, 1);

  /* The same shape, sampled displaced *away* from the light: a point on the
     sun side lands back inside the puff and is lit, one on the shaded side
     lands outside it and is not. Quantised into two, like the deck's own
     lit edge — a cloud at night has a bright face and a body and nothing
     in between. */
  const lit = shape(vec2(
    corner.x.sub(sunFace.x.mul(LIFT * 0.5)),
    corner.y.sub(sunFace.y.mul(LIFT * 0.5)),
  )).mul(LIT_STEPS).round().div(LIT_STEPS).clamp(0, 1);
  /* **The lit face is `--paper` at night and `--void` at day, which is the
     sky deck's own pair (§40, §42).** `--paper` inverted is the *darkest*
     ink in the light set, so the night construction ported straight over
     paints the sunward face of every near-field puff near-black — the same
     failure §40 found on the deck, in the layer §40 did not touch. The body
     stays `--rule` in both for the deck's reason: inverted it is a mid tone
     at 0.705, darker than the sky above thirty degrees and lighter than it
     at the horizon, which is what a cloud looks like from where they are. */
  const face = mix(palette.paper, palette.void, palette.day);
  const body = mix(palette.rule, face, lit.mul(1 - LIT_FLOOR).add(LIT_FLOOR));

  /* Distance does three things to a puff and they are all the same fade in
     different places: near, it hands over to the murk; far, the fog takes
     its colour to the sky's; and past the last cell there is nothing left of
     either. */
  const dist = centre.sub(cameraPosition).length();
  const near = smoothstep(radius.mul(NEAR_IN), radius.mul(NEAR_OUT), dist)
    .mul(smoothstep(FAR, FAR_IN, dist));
  const depth = fog(positionWorld, palette);

  const toEye = cameraPosition.sub(positionWorld).normalize();
  material.colorNode = mix(haze(toEye, palette), body, depth);
  material.opacityNode = banded.mul(near).mul(depth).mul(ALPHA);

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  mesh.visible = false;
  /* Transparent, so it is drawn after both opaque layers whatever this says
     — and before the motes, which is what puts a mote over a lake in front
     of the cloud that is a kilometre behind it. */
  mesh.renderOrder = 2;

  /* ── The fill ────────────────────────────────────────────────────────
     No toroidal bookkeeping and no budget, unlike §27's and §28's discs:
     there are twenty-five cells here rather than seventeen hundred, none of
     them touches the height field, and rebuilding the whole layer is a few
     hundred hashes. What is kept from those two is the *trigger* — the
     window only moves when the camera crosses a cell in cloud space, which
     at cruise is every fourteen seconds. */
  let heldI = 0x7fff_ffff;
  let heldJ = 0x7fff_ffff;

  const stats = { fills: 0, ms: 0, worst: 0, murk: 0, forms: 0 };

  function fill(i0: number, j0: number) {
    const started = performance.now();
    let forms = 0;
    for (let sj = 0; sj < GRID; sj++) {
      for (let si = 0; si < GRID; si++) {
        const ci = i0 + si;
        const cj = j0 + sj;
        const slot = sj * GRID + si;
        const there = hash3(ci, cj, 0) >= EMPTY;
        if (there) forms++;
        /* The form's own centre, jittered inside its cell so the lattice is
           not a lattice, and its altitude and scale hashed with it. */
        const fx = (ci + 0.15 + 0.7 * hash3(ci, cj, 1)) * CELL;
        const fz = (cj + 0.15 + 0.7 * hash3(ci, cj, 2)) * CELL;
        const fy = LOW + (HIGH - LOW) * hash3(ci, cj, 3);
        // A form is 0.7 to 1.25 of the nominal spread, so no two are the
        // same size at the same distance.
        const scale = 0.7 + 0.55 * hash3(ci, cj, 4);

        for (let k = 0; k < PUFFS; k++) {
          const o = slot * PUFFS + k;
          const p = 8 + k * 6;
          if (!there) {
            // A radius of zero is two degenerate triangles.
            iAim[o * 2] = 0;
            continue;
          }
          iPos[o * 3] = fx + (hash3(ci, cj, p) * 2 - 1) * SPREAD * scale;
          iPos[o * 3 + 1] = fy + (hash3(ci, cj, p + 1) * 2 - 1) * RISE * scale;
          iPos[o * 3 + 2] = fz + (hash3(ci, cj, p + 2) * 2 - 1) * SPREAD * scale;
          iAim[o * 2] = (R_LOW + R_RANGE * hash3(ci, cj, p + 3)) * scale;
          iAim[o * 2 + 1] = hash3(ci, cj, p + 4);
        }
      }
    }
    aPos.needsUpdate = true;
    aAim.needsUpdate = true;

    const ms = performance.now() - started;
    stats.fills++;
    stats.ms += ms;
    stats.forms = forms;
    if (ms > stats.worst) stats.worst = ms;
  }

  const scratch = new Vector3();

  function update(camera: Camera, all = false) {
    camRight.value.set(1, 0, 0).applyQuaternion(camera.quaternion);
    camUp.value.set(0, 1, 0).applyQuaternion(camera.quaternion);
    /* The key light in the billboard's plane, normalised there. It is *which
       side* the lit face is on, so what matters is the direction and not how
       much of the light survives the projection: looking straight down the
       sun's own bearing the projection is nearly zero, and a puff whose lit
       side faded out with it would go flat in the one direction a cloud is
       most obviously lit. Up, when there is nothing left to normalise. */
    scratch.set(SUN.x, SUN.y, SUN.z);
    const sx = scratch.dot(camRight.value);
    const sy = scratch.dot(camUp.value);
    const len = Math.hypot(sx, sy);
    if (len > 1e-4) sunFace.value.set(sx / len, sy / len, 0);
    else sunFace.value.set(0, 1, 0);

    // Cloud space slides downwind at the deck's own rate (§27), so the two
    // layers of sky are one weather system rather than two.
    const t = time.value * DECK_DRIFT;
    drift.value.set(WIND.x * t, 0, WIND.z * t);

    const cx = camera.position.x - drift.value.x;
    const cz = camera.position.z - drift.value.z;
    const i0 = Math.round(cx / CELL) - (GRID - 1) / 2;
    const j0 = Math.round(cz / CELL) - (GRID - 1) / 2;
    if (all || i0 !== heldI || j0 !== heldJ) {
      fill(i0, j0);
      heldI = i0;
      heldJ = j0;
    }
    mesh.visible = true;

    /* ── The murk ──────────────────────────────────────────────────────
       The nearest puff decides it, over the same band its own fade uses.
       `max` rather than a sum: a cluster is nine overlapping puffs and
       adding them would put the reader inside a cloud while still a hundred
       units outside it. What a sum would buy — a denser middle — is already
       there, because the middle is where the puffs overlap and the nearest
       one is therefore nearer. */
    let worst = 0;
    for (let n = 0; n < COUNT; n++) {
      const radius = iAim[n * 2]!;
      if (radius <= 0) continue;
      const dx = iPos[n * 3]! + drift.value.x - camera.position.x;
      const dy = iPos[n * 3 + 1]! - camera.position.y;
      const dz = iPos[n * 3 + 2]! + drift.value.z - camera.position.z;
      const d = Math.hypot(dx, dy, dz) / radius;
      if (d >= NEAR_OUT) continue;
      const s = Math.min(Math.max((NEAR_OUT - d) / (NEAR_OUT - NEAR_IN), 0), 1);
      const m = s * s * (3 - 2 * s);
      if (m > worst) worst = m;
    }
    murk.value = worst;
    stats.murk = worst;
  }

  return {
    mesh,
    settle: (camera: Camera) => update(camera, true),
    update,
    stats,
    count: COUNT,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

/* One quad, corners at ±0.5. Same shape as `motes.ts`'s and deliberately not
   shared with it: a geometry is disposed by the layer that owns it, and two
   layers holding one would be the §22 index-buffer bug in a second place. */
function quad(): InstancedBufferGeometry {
  const off = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);
  const position = new Float32Array(12);
  const index = new Uint16Array([0, 1, 2, 0, 2, 3]);

  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('qOff', new BufferAttribute(off, 2));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
}
