/* §0.4 / §34 — the four scenes, as boxes and where they stand.

   "Each is a picture of the system rather than a monument to it, and an
   engineer who knows the domain should recognise what they are looking at
   without being told." So none of these is a *structure* with a plaque on
   it: Enargeia is a forward pass, Homonoia is five nodes and a term, Philoi
   is two editors converging, Basis is a request through a graph. §0.4's
   older text asked for gates and monoliths and it is reversed — a monolith
   has to be explained and a scene explains itself.

   **No three and no DOM**, which is the fourth module in that discipline
   after `height.ts`, `route.ts` and `cover.ts`'s family. It imports the
   field, because where a scene stands is a question about the ground, and
   nothing else. So Node runs it and every number in the §34 report — the
   footprints, the pads, the part counts — is this file's own output.

   ── Scale (§8's last open decision, answered) ───────────────────────────
   **Enormous.** A station is 40 to 70 units tall against conifers of 12.5
   and city towers of 180 to 320 (§0.2): three and a half trees, a fifth of
   a tower. Not human-scale-with-the-camera-descending, and the deciding
   argument is not taste — §24's camera floor is six units over the ground,
   which is above head height on a desk, so the human register would have
   had every scene looked *down* on from 27° of pitch and would have moved
   the floor, the four settles and every number §31 and §32 measured. The
   enormous register costs nothing: the route was already sited for it.

   ── Sited here, flown from `route.ts` ───────────────────────────────────
   The four sites moved into this file at §34 and that is the right way
   round: `route.ts` reads them, not the other way about, because a scene
   is a thing in the world and the route is a flight past it. What is still
   `route.ts`'s is the camera — where it stands and how it gets there.

   **`radius` and `tall` are the framing rule's only two inputs** and three
   of the four are *derived from the sited stand-off* rather than chosen: at
   §31's distances the quarter-of-the-frame rule wants 24, 22 and 26, so
   those are the scenes' half-widths and the scenes were built to them.
   Homonoia is the exception and cannot be: its five nodes stand on
   `height.ts`'s own 120-unit ring, so the scene is 140 across the corners
   whatever this file would prefer, and it is the *stand* that moves. */

import { CLUSTER_NODES, CLUSTER_SITE, clusterNode, height } from './height';

export type Kind =
  /** Static mass. Lit, banded, and nothing else. */
  | 0
  /** Enargeia's layers. `a` is the layer's place in the stack, 0 at the
      input and 1 at the output; the wave is a function of it. */
  | 1
  /** Homonoia's nodes. `a` is the node index, and it is also what the
      ground under it is indexed by — one answer to "which node is this". */
  | 2
  /** Philoi's lines. `a` is the line's index in the document and `b` is
      which screen it is drawn on. Both are read off a table. */
  | 3
  /** Basis's modules. `a` is the module's place along the trace. */
  | 4
  /** §37's rotor blade, and the only part in the world that moves under its
      own arithmetic rather than under a clock somebody hands it. `a` is the
      blade's phase in turns and `b` its radius from the hub — the part's own
      (x, y, z) is the **hub**, not the blade, because a blade's place is a
      function of the time and its box has to turn about a point it is not
      centred on (§35's lesson about yaw, one axis over). */
  | 5;

/** One box. Centre and half-extents, in **site-local** units: x and z from
    the site, y from the pad. `yaw` is about world up. */
export type Part = {
  x: number; y: number; z: number;
  w: number; h: number; d: number;
  yaw: number;
  kind: Kind;
  a: number;
  b: number;
};

/** One thing that travels between two places, in the same local frame.
    `rate` is cycles a second and `phase` where in its cycle it starts, so a
    signal has no state either — it is `fract(t·rate + phase)` exactly as a
    mote is (§30). `group` selects which of the scene's clocks gates it. */
export type Signal = {
  from: [number, number, number];
  to: [number, number, number];
  rate: number;
  phase: number;
  /** How far the path bows away from the straight line, in units. */
  arc: number;
  /** What fraction of its cycle the signal is alive for, and over which it
      travels the whole leg. 1 is a dot that never stops; Basis's trace is
      a sixth, so one request crosses one strut at a time and the graph is
      never carrying six of them at once. */
  span: number;
  group: number;
  /** Which node it belongs to, where that matters — Homonoia gates its
      traffic on who holds the term. −1 for signals that are always on. */
  node: number;
  /** How big the billboard is, in units. Per signal rather than one
      constant, because the four scenes are read from 121 to 774 units away:
      a 2.6-unit dot is nine pixels at Philoi and three at Homonoia, and
      three pixels at 0.55 alpha through half a fog is not a message being
      sent. */
  size: number;
  /** How far away it is gone, in units. Authored per signal since §37 rather
      than one constant for the layer, and the lighthouse is the whole reason:
      §0.2 asks for a light "visible from further than it should be", which is
      a number about one lamp and not about the layer it is drawn in. The four
      scenes all take `SIGNAL_FAR`. */
  far: number;
};

/** What a message between two masts is worth being drawn at. Homonoia's legs
    are read from 774 units at the settle and its own arcs are 240 across, so
    the layer has to survive the whole of that and nothing beyond it. */
export const SIGNAL_FAR = 1000;

/** One box of a scene's **collision proxy** (§35), in the same site-local
    frame `Part` is in. `ride` is whether it moves with the swell — true only
    for Homonoia's masts, which stand on summits that rise with the term, and
    it is taken at the box's own centre because every box of a node shares
    that node's (x, z), exactly as `built.ts`'s rigid lift does.

    **Authored, never derived**, and the rule is §0.3's: a proxy has to be
    *inside* its own silhouette, because bouncing off nothing is a bug a
    reader cannot explain where flying through a gap is merely a world that
    does not stop you. What "inside" means here is inside the volume **a
    four-unit sphere can occupy** rather than inside the drawn outline — the
    two differ wherever a scene has a gap narrower than eight units, and
    every gap in these four is: Enargeia's cells are 5.8 apart, Philoi's desk
    clears its floor by 2.9 and its screen frame by 4.1. A box spanning those
    is exact for the only query that will ever be made of it. */
export type Solid = {
  x: number; y: number; z: number;
  w: number; h: number; d: number;
  yaw: number;
  ride: boolean;
};

/** What `built.ts` draws and `solid.ts` reads: boxes, a proxy for them, and
    somewhere to stand. A scene is one of these and §36's cities are the
    other — which is the whole of what the two share, and it is why neither
    of those two files knows there is more than one kind of built thing.

    **A city's `pad` is zero.** A scene stands on a slab and measures every
    part off its top; a city is two hundred buildings over 1,240 units, each
    standing on the ground under it, so its parts carry world heights. */
export type Built = {
  slug: string;
  site: { x: number; z: number };
  /** The top of the pad every part's `y` is measured from. */
  pad: number;
  parts: Part[];
  /** §35. A handful of boxes beside the geometry that produced them. */
  proxy: Solid[];
};

export type Scene = Built & {
  radius: number;
  tall: number;
  signals: Signal[];
};

/* The pad. A scene stands on a slab whose top is *above the highest ground
   under its footprint*, so nothing floats on the low side of a site that is
   level to within 8.5 to 13.8 units rather than level. The slab itself
   reaches well below the lowest, so on the high side it is buried — which
   is what a thing built on a slope looks like and is cheaper than terracing
   the terrain under it.

   It is also what the camera aims at: `route.ts` frames `pad + 0.4·tall`.
   **Homonoia is the exception both ways** — nothing is built on a slab
   there, the five nodes stand on their own summits, and a pad taken as the
   *highest* ground over a 280-unit footprint is 127.5, which is the top of
   the massif and 25 units above the tallest crown. Aimed at that the scene
   sits at the bottom of the frame. So it is the mean of the five node
   grounds instead, which is the middle of the thing being looked at, and
   the difference is 53 units of aim. */
const PAD_LIFT = 1.5;
function padOf(site: { x: number; z: number }, half: number): number {
  let top = -Infinity;
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      top = Math.max(top, height(site.x + (i * half) / 2, site.z + (j * half) / 2));
    }
  }
  return top + PAD_LIFT;
}

function ringPad(): number {
  let sum = 0;
  for (let i = 0; i < CLUSTER_NODES; i++) {
    const n = clusterNode(i);
    sum += height(n.x, n.z);
  }
  return sum / CLUSTER_NODES;
}

/** How deep a slab reaches, so it is never seen to end. The sites are level
    to about 14 units and the pad sits over the highest of them. */
const SLAB = 26;

const box = (
  x: number, y: number, z: number, w: number, h: number, d: number,
  kind: Kind = 0, a = 0, b = 0, yaw = 0,
): Part => ({ x, y, z, w, h, d, yaw, kind, a, b });

/** A proxy box from the span it covers rather than from a centre and a half
    height, because that is how every one of them is read off the geometry:
    "from the top of the plinth to the top of the lid". */
const slab = (
  x: number, z: number, from: number, to: number, w: number, d: number,
  yaw = 0, ride = false,
): Solid => ({ x, y: (from + to) / 2, z, w, h: (to - from) / 2, d, yaw, ride });

/* ── Enargeia — a machine thinking ──────────────────────────────────────
   §0.4: "a stack of layers with a wave of activation travelling through it
   … it runs on the visitor's own hardware; the scene should not look like a
   datacenter."

   **The negative half is the hard half** and it is answered by the count:
   there is exactly *one* of these. Racks are what "many machines" reaches
   for, and a hall of them says the opposite of what the project claims — so
   this is one object on one plinth with nothing beside it, and what is
   repeated inside it is *layers*, not machines. A grid of cells stacked in
   depth is a tensor; four corner columns tie the stack into one chassis
   rather than leaving it as shelving.

   The wave is the forward pass and it runs bottom to top: `kind 1` carries
   each layer's own place in the stack, and `built.ts` turns a clock and
   that number into how lit a cell is. Nothing about it is per cell, which
   is deliberate — a layer activates as a layer. */
/* Ten layers of sixteen, not fourteen of twenty-five. **Thin slabs alias.**
   At 0.85 units thick on a 2.9 pitch, seen from 132 units at a shallow angle
   with no MSAA, the back of the stack showed through the front as vertical
   moiré — which reads as a rendering fault rather than as depth. The fix is
   thicker plates, fewer of them, and **wider gaps between the cells**: 5.8
   units of air on a 17-unit pitch is a gap the eye resolves as a gap, where
   1.8 on 8 is where two edges land in one pixel. Ninety cells instead of
   three hundred and fifty, and the object is the same object. */
const E_LAYERS = 10;
const E_CELLS = 3;
const E_PITCH = 17.0;  // between cells, so the grid is 34 across
const E_RISE = 4.1;    // between layers
const E_BASE = 9.0;    // the lowest layer, over the plinth
const E_CELL = 5.6;    // half-width of a cell
const E_PLATE = 1.15;  // half its thickness
/** Seconds a forward pass takes, bottom to top. `built.ts` reads it too. */
export const E_PASS = 3.2;

function enargeia(): { parts: Part[]; signals: Signal[]; proxy: Solid[] } {
  const parts: Part[] = [];
  const span = ((E_CELLS - 1) * E_PITCH) / 2;
  const top = E_BASE + (E_LAYERS - 1) * E_RISE;

  // The plinth. Wider than the stack, and the only part of the scene that
  // is not the machine.
  parts.push(box(0, -SLAB / 2 + 2, 0, span + 9, SLAB / 2 + 2, span + 9));

  // Four columns, corner to corner, which is what makes it one chassis.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push(box(sx * (span + 4.4), (top + 4) / 2, sz * (span + 4.4), 1.5, (top + 4) / 2, 1.5));
    }
  }
  // And a lid, so the stack is enclosed rather than open shelving.
  parts.push(box(0, top + 4.6, 0, span + 5.4, 0.9, span + 5.4));

  for (let l = 0; l < E_LAYERS; l++) {
    const y = E_BASE + l * E_RISE;
    const a = l / (E_LAYERS - 1);
    for (let i = 0; i < E_CELLS; i++) {
      for (let j = 0; j < E_CELLS; j++) {
        /* A weight per cell, so a layer does not activate as one solid
           bar. Not all units fire on a pass, and the band read as a lit
           slab across the whole machine without it — which is a scanner,
           not a forward pass. Hashed, so it is the same machine on every
           load, and it rides in `b` because only `kind 3` reads that. */
        const w = ((Math.sin((l * 12.9898 + i * 78.233 + j * 37.719) * 43758.5453) + 1) / 2);
        parts.push(box(i * E_PITCH - span, y, j * E_PITCH - span, E_CELL, E_PLATE, E_CELL, 1, a, w));
      }
    }
  }

  /* One token leaves the top per pass. It is the output, and it is the only
     part of this scene that is not inside the machine — which is the whole
     of what "it runs on the visitor's own hardware" has to say in a
     picture: something comes *out* of it. */
  const signals: Signal[] = [{
    from: [0, top + 6, 0], to: [0, top + 30, 0],
    rate: 1 / E_PASS, phase: 0, arc: 0, group: 0, node: -1, span: 0.34, size: 4.0, far: SIGNAL_FAR,
  }];

  /* **Two boxes for ninety-six parts**, and that is the shape of the whole
     convention. The plinth is its own part copied out. The chassis is one
     box from the plinth's top to the lid's, at the *lid's* half-width —
     which is the narrowest of the three things that reach the outside
     (columns 22.9, cells 22.6, lid 22.4), so the proxy is inside the
     silhouette on every face.

     What it swallows is the air between the cells and the 3.85 units under
     the lowest layer, and neither is reachable: the gaps are 5.8 across and
     the sphere is 8. */
  const plinthTop = -SLAB / 2 + 2 + (SLAB / 2 + 2);
  const proxy: Solid[] = [
    slab(0, 0, -SLAB, plinthTop, span + 9, span + 9),
    slab(0, 0, plinthTop, top + 4.6 + 0.9, span + 5.4, span + 5.4),
  ];
  return { parts, signals, proxy };
}

/* ── Homonoia — five nodes and a term ───────────────────────────────────
   §0.4: "five nodes in the landscape, passing something between them, with
   one of them holding the term."

   The five stand on `height.ts`'s own ring, one per Gaussian, so the node
   and the summit it stands on are the same index — and `swell` raises the
   one holding the term by thirty units under the pylon standing on it. That
   agreement is the whole scene: nothing here says "the ground moves", the
   ground moves because the field's shares moved.

   A node is a mast rather than a building: three stacked sections narrowing
   upward and a crown that carries the state. `--leader` is on the crown and
   on nothing else (§2 — the colour is state), so five identical silhouettes
   differ by one lit block, which is what an election looks like from the
   air.

   **Each node's local y is its own ground**, not the pad: they stand a
   hundred and twenty units apart on a massif whose summits differ by sixty,
   and a common pad would be a plateau nobody built. */
/* A hundred units, and it is a measurement rather than a taste: at the
   framing rule's 774-unit stand-off a 46-unit mast is 3.4° of a 60° frame —
   forty-six pixels — and five of them read as posts on a ridge rather than
   as a cluster. At 100 they are 7.4°, which is a hundred pixels, and the ring
   still sits inside the quarter-width the composition allows. Under the
   cities' 180–320 either way (§0.2). */
const H_TALL = 100;
const H_CROWN = 7.0;

function homonoia(pad: number): { parts: Part[]; signals: Signal[]; proxy: Solid[] } {
  const parts: Part[] = [];
  const signals: Signal[] = [];
  const proxy: Solid[] = [];
  const at: [number, number, number][] = [];

  for (let i = 0; i < CLUSTER_NODES; i++) {
    const n = clusterNode(i);
    const x = n.x - CLUSTER_SITE.x;
    const z = n.z - CLUSTER_SITE.z;
    // Its own ground, in the pad's frame. The swell is *not* added here:
    // it is live, and `built.ts` lifts the whole node by it in the shader.
    const y = height(n.x, n.z) - pad;

    /* **The crown carries the term and the mast does not.** Given `kind 2`
       the whole node lit, and a hundred-unit tower in `--leader` is a great
       deal of accent for one bit of state — it also flattened the node into
       one silhouette, because the shading is mixed away under it. Five
       identical masts differing by one lit block is what an election looks
       like from the air, and it is the reading §2 asks for. */
    parts.push(box(x, y + 3, z, 15.0, SLAB, 15.0));
    parts.push(box(x, y + H_TALL * 0.30, z, 8.4, H_TALL * 0.30, 8.4));
    parts.push(box(x, y + H_TALL * 0.66, z, 5.4, H_TALL * 0.24, 5.4));
    parts.push(box(x, y + H_TALL * 0.90 + H_CROWN, z, 9.2, H_CROWN, 9.2, 2, i));

    at.push([x, y + H_TALL * 0.90 + H_CROWN, z]);

    /* **Here the proxy is the geometry**, which is the case the convention
       has to allow for: a mast is already four stacked boxes standing on
       their own, so an authored approximation of it could only be worse.
       Four per node, twenty for the scene, every one riding the swell —
       the summit under a node rises by up to thirty units while it holds
       the term, and a proxy that stayed where the field left it would be a
       mast you could fly through for a third of every election. */
    proxy.push(
      slab(x, z, y + 3 - SLAB, y + 3 + SLAB, 15.0, 15.0, 0, true),
      slab(x, z, y, y + H_TALL * 0.60, 8.4, 8.4, 0, true),
      slab(x, z, y + H_TALL * 0.42, y + H_TALL * 0.90, 5.4, 5.4, 0, true),
      slab(x, z, y + H_TALL * 0.90, y + H_TALL * 0.90 + H_CROWN * 2, 9.2, 9.2, 0, true),
    );
  }

  /* The traffic. Every message has a *direction*, because that is the
     asymmetry Raft has and a mesh does not: AppendEntries go out from the
     node holding the term and acknowledgements come back to it. Which node
     that is changes with the term, so a leg is authored **both ways** for
     every pair and `built.ts` turns off the half that does not belong to
     the current leader. Two per pair per direction, offset half a cycle, so
     a leg is never empty. */
  for (let i = 0; i < CLUSTER_NODES; i++) {
    for (let j = 0; j < CLUSTER_NODES; j++) {
      if (i === j) continue;
      for (let k = 0; k < 2; k++) {
        signals.push({
          from: at[i]!, to: at[j]!,
          rate: 1 / 1.9, phase: k / 2 + (i * 0.13 + j * 0.29) % 1,
          arc: 16, group: 1, node: i, span: 1, size: 9.5, far: SIGNAL_FAR,
        });
      }
    }
  }
  return { parts, signals, proxy };
}

/* ── Philoi — two editors, and nothing is discarded ─────────────────────
   §0.4: "two workstations, screens lit, the same document open on both.
   Edits appear on one and arrive on the other. Nothing is discarded, and a
   reader should be able to see that."

   **That last clause is the whole scene and it is the hard one.** Two
   cursors that both move show collaboration; what a CRDT claims is
   convergence, and the only way to *show* it is to make the two columns
   observably the same document. So the lines have an order that is a
   property of the line rather than of when it arrived — every line carries
   an origin, both screens sort by it, and a line that arrives late lands
   **between** two lines that are already there, pushing the ones below it
   down. Nothing is overwritten and nothing is dropped: the column only ever
   grows, and it grows the same way on both screens.

   The lines and their order are a table `built.ts` walks each frame; what
   is here is the furniture and how many slots there are. */
export const P_LINES = 16;
/** Between lines. 16 × 1.72 is 27.5 units against a 30-unit screen, so a
    full document reaches the bottom rail and does not pass it. */
export const P_PITCH = 1.72;
const P_SCREEN_W = 8.6;
const P_SCREEN_H = 15.0;
const P_APART = 12.6;
const P_TURN = 21;     // degrees each screen is turned in toward the other
const P_DESK = 6.0;
/** Seconds between edits. Slow: what has to be readable is that a line
    lands *between* two others, and at a fast cadence that is a flicker. */
export const P_CYCLE = 6.4;

function philoi(): { parts: Part[]; signals: Signal[]; proxy: Solid[] } {
  const parts: Part[] = [];
  const signals: Signal[] = [];
  const seat: [number, number, number][] = [];
  /* The floor first, so the three boxes read in the order they stand. */
  const floorTop = -SLAB / 2 + 1.2 + (SLAB / 2 + 1.2);
  const proxy: Solid[] = [slab(0, 0, -SLAB, floorTop, P_APART + 12, 11.5)];

  /* A screen is turned in toward the other, so anything offset from its
     centre has to be turned with it: the instance's own yaw rotates the
     box, and this rotates where the box *is*. Getting that wrong leaves a
     frame whose uprights are square to the world and whose glass is not. */
  const turn = (ox: number, oz: number, deg: number): [number, number] => {
    const r = (deg * Math.PI) / 180;
    return [ox * Math.cos(r) + oz * Math.sin(r), -ox * Math.sin(r) + oz * Math.cos(r)];
  };

  /* **One floor, not two plinths.** Built as a slab under each desk it read
     as a dark mesa with the screens standing on top of it — the two blocks
     merged at this distance and what the eye found was the silhouette of the
     ground, not of a room. One platform under both is a floor two people
     share, which is also what the scene is about. */
  parts.push(box(0, -SLAB / 2 + 1.2, 0, P_APART + 12, SLAB / 2 + 1.2, 11.5));

  for (let s = 0; s < 2; s++) {
    const side = s === 0 ? -1 : 1;
    const x = side * P_APART;
    const yaw = -side * P_TURN;

    // The desk, and the stand the screen rises off.
    parts.push(box(x, P_DESK, 0, 9.6, 0.7, 6.4, 0, 0, 0, yaw));
    const [kx, kz] = turn(0, 1.2, yaw);
    parts.push(box(x + kx, P_DESK + 3.0, kz, 1.0, 3.0, 1.0, 0, 0, 0, yaw));

    // The screen's frame: two uprights and two rails, so the lines inside
    // it are held by something rather than floating.
    const sy = P_DESK + 6.2 + P_SCREEN_H;
    for (const e of [-1, 1]) {
      const [ux, uz] = turn(e * (P_SCREEN_W + 0.7), 0, yaw);
      parts.push(box(x + ux, sy, uz, 0.7, P_SCREEN_H + 0.7, 0.7, 0, 0, 0, yaw));
    }
    for (const e of [-1, 1]) {
      parts.push(box(x, sy + e * (P_SCREEN_H + 0.7), 0, P_SCREEN_W + 1.4, 0.7, 0.7, 0, 0, 0, yaw));
    }

    /* The lines. A slot rather than a line: which line is in it, whether it
       is there at all and how far down it has been pushed are all `kind 3`
       reading a table. The `y` here is the *top* of the column and the
       table moves it down. */
    for (let i = 0; i < P_LINES; i++) {
      parts.push(box(
        x, sy + P_SCREEN_H - 1.2, 0,
        P_SCREEN_W * 0.82, 0.42, 0.32, 3, i, s, yaw,
      ));
    }
    seat.push([x, sy + 2, 0]);

    /* Five per side. The desk box runs from the floor rather than from the
       desk's own underside, because the 2.9 units under it are not a place a
       four-unit sphere can be.

       **The screen is the frame and not the glass**, which is the one place
       in these four scenes where the difference is large enough to see. A
       single box over the frame would be an 18.6 × 31.4 pane of nothing —
       the biggest over-approximation available in this world, and at a scene
       whose whole subject is what is *on* the screens. So it is the two
       uprights and the two rails, copied. What is left open is the opening,
       which is 2.3 sphere-widths across. */
    proxy.push(slab(x, 0, floorTop, P_DESK + 0.7, 9.6, 6.4, yaw));
    for (const e of [-1, 1]) {
      const [ux, uz] = turn(e * (P_SCREEN_W + 0.7), 0, yaw);
      proxy.push(slab(x + ux, uz, sy - P_SCREEN_H - 0.7, sy + P_SCREEN_H + 0.7, 0.7, 0.7, yaw));
      const rail = sy + e * (P_SCREEN_H + 0.7);
      proxy.push(slab(x, 0, rail - 0.7, rail + 0.7, P_SCREEN_W + 1.4, 0.7, yaw));
    }
  }

  /* The edit in flight, and it goes both ways at once — concurrent edits
     are the case a CRDT is *for*, and two that took turns would be showing
     a lock. */
  for (let k = 0; k < 2; k++) {
    signals.push({ from: seat[0]!, to: seat[1]!, rate: 1 / P_CYCLE, phase: k * 0.5, arc: 7, group: 2, node: -1, span: 0.42, size: 2.4, far: SIGNAL_FAR });
    signals.push({ from: seat[1]!, to: seat[0]!, rate: 1 / P_CYCLE, phase: 0.25 + k * 0.5, arc: 7, group: 2, node: -1, span: 0.42, size: 2.4, far: SIGNAL_FAR });
  }
  return { parts, signals, proxy };
}

/* ── Basis — modules, wired, with a request through them ────────────────
   §0.4: "something assembled and running. Modules wired together, a request
   tracing through them on a slow loop. Deliberately the quietest."

   So it is the one scene with no repetition in it: seven blocks of
   different sizes at different heights, joined by struts, and one thing
   moving through them every twelve seconds. The trace is a *path* rather
   than a broadcast — a request enters, passes through the graph in order
   and leaves — which is the difference between a framework and a cluster
   and is the thing an engineer reads off it immediately.

   The struts are boxes rather than lines: `LineLoop` is not a supported
   object type on this renderer and a `Line` would be a second draw call and
   a second material for eight segments (§28's argument for one mesh). */
/** Seconds a request takes to cross the whole graph. The quietest scene
    gets the slowest clock. */
export const B_CYCLE = 12;

const B_NODES: [number, number, number, number][] = [
  // x, z, height of the module, its half-width
  [-17, -9, 9.0, 5.4],
  [-6, 6, 16.0, 4.6],
  [4, -8, 23.0, 5.0],
  [15, 4, 13.5, 4.2],
  [8, 14, 29.0, 4.4],
  [-9, 16, 19.0, 4.0],
  [-19, 7, 11.0, 4.8],
];

function basis(): { parts: Part[]; signals: Signal[]; proxy: Solid[] } {
  const parts: Part[] = [];
  const signals: Signal[] = [];
  const at: [number, number, number][] = [];
  const proxy: Solid[] = [slab(-2, 3, -SLAB, -SLAB / 2 + 1.0 + (SLAB / 2 + 1.0), 21, 17)];

  /* Tight to the graph rather than a platform around it. A slab wider than
     what stands on it reads as a mesa the modules happen to be on, and the
     scene is the wiring. */
  parts.push(box(-2, -SLAB / 2 + 1.0, 3, 21, SLAB / 2 + 1.0, 17));

  B_NODES.forEach(([x, z, h, half], i) => {
    const a = i / (B_NODES.length - 1);
    // The mast it stands on, then the module.
    parts.push(box(x, h / 2, z, 0.8, h / 2, 0.8));
    parts.push(box(x, h + half * 0.7, z, half, half * 0.7, half * 0.8, 4, a, 0, i * 23));
    at.push([x, h + half * 0.7, z]);
    // The mast and the module it carries, copied. Two per node, fourteen
    // for the graph.
    proxy.push(
      slab(x, z, 0, h, 0.8, 0.8),
      slab(x, z, h, h + half * 1.4, half, half * 0.8, i * 23),
    );
  });

  // The wiring: one strut per edge of the path, drawn as a thin box turned
  // to lie along it. Its own `kind 0` — a wire is not a module and does not
  // light up; what lights up is what the request is *in*.
  for (let i = 0; i < B_NODES.length - 1; i++) {
    const p = at[i]!, q = at[i + 1]!;
    const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2];
    const flat = Math.hypot(dx, dz);
    parts.push({
      x: (p[0] + q[0]) / 2, y: (p[1] + q[1]) / 2, z: (p[2] + q[2]) / 2,
      w: Math.hypot(flat, dy) / 2, h: 0.7, d: 0.7,
      yaw: (Math.atan2(dx, dz) * 180) / Math.PI - 90,
      kind: 0, a: 0, b: 0,
    });
    /* One request, one strut at a time. The cycle is the whole traverse and
       each strut owns a `span` of it — offset by exactly its own share, so
       the dot leaves one module as it enters the next and there is never
       more than one in the graph. */
    signals.push({
      from: p, to: q, rate: 1 / B_CYCLE,
      phase: -i / (B_NODES.length - 1), arc: 0, group: 3, node: i,
      span: 1 / (B_NODES.length - 1), size: 2.6, far: SIGNAL_FAR,
    });
  }
  /* **The struts are not in it, and that is the deliberate half of the
     rule.** They are 1.4 units thick and lie at six different angles; a
     proxy for one is a box the sphere meets four units before it looks like
     it should, at the one place in the scene where the eye can see there is
     nothing there. Flying through a wire is a world that does not stop you.
     Bouncing off the air beside one is a bug. */
  return { parts, signals, proxy };
}

/* ── The four ───────────────────────────────────────────────────────────
   Sites searched against the field at §31 — level ground a scene can stand
   on, proud of what is around it, the next visible from the last one's
   climb-away, no leg doubling back, and the first in the opening frame. */
const SITES = {
  enargeia: { x: 12, z: -967 },
  homonoia: CLUSTER_SITE,
  philoi: { x: -1040, z: 280 },
  basis: { x: -1640, z: 1300 },
} as const;

function build(): Scene[] {
  const out: Scene[] = [];
  const make = (
    slug: string, site: { x: number; z: number }, radius: number, tall: number,
    parts: (pad: number) => { parts: Part[]; signals: Signal[]; proxy: Solid[] },
    pad = padOf(site, radius),
  ) => {
    const { parts: p, signals: s, proxy } = parts(pad);
    out.push({ slug, site: { x: site.x, z: site.z }, pad, radius, tall, parts: p, signals: s, proxy });
  };

  make('enargeia', SITES.enargeia, 24, 46, () => enargeia());
  /* 140 rather than the 90 the sited stand implied: the ring is
     `height.ts`'s and cannot be narrowed without taking each node off its
     own summit, which is the one thing this scene is. So `route.ts` stands
     further back for this one — the only station whose camera moved at
     §34. */
  make('homonoia', SITES.homonoia, 140, 120, (pad) => homonoia(pad), ringPad());
  make('philoi', SITES.philoi, 22, 40, () => philoi());
  make('basis', SITES.basis, 26, 44, () => basis());
  return out;
}

export const SCENES: Scene[] = build();
export const sceneOf = (slug: string): Scene => SCENES.find((s) => s.slug === slug)!;
