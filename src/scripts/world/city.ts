/* §0.2 / §36 — the two cities, as boxes and where they stand.

   "Oversized, deliberately. Towers 180–320 units, against a landscape whose
   highest ground is 128 and whose conifers are 12. A city is therefore
   taller than the mountains and a tower is twenty-five trees. Streets 60–80
   units wide. … Delhi inverts it — mostly 15–40 units, dense, spread over
   four times the footprint, with two or three monuments reaching 120. The
   contrast between the two skylines is the point of having both."

   **The seventh module with no three and no DOM in it**, after `height.ts`,
   `route.ts`, `cover.ts`'s family, `scenes.ts` and `solid.ts`. It imports
   the field and `cover.ts`'s hash and nothing else, so Node runs the `.ts`
   directly and every number in the §36 report — the counts, the heights, the
   street widths, the buildable fraction — is this file's own output.

   ── The contrast is a plan as well as a skyline ─────────────────────────
   §0.2 asks for two cities that read differently, and height alone does not
   do it: two grids of boxes at two scales are one idea drawn twice. So the
   *rule that decides where a building is* differs too, and it is the ground
   that makes them differ.

   - **Houston is a grid with a hard edge**, on the flattest ground its own
     footprint could be sited on. Twenty-one plots, five by five with the
     corners cut, and then nothing at all: no thinning, no outskirts. It does
     not ask the terrain a single question about where a tower may stand,
     which is what "flat ground that stops abruptly" means from the air.
   - **Delhi is a field that follows the ground.** Its plots are tested for
     slope and for water and thinned toward the rim, so the city fills the
     basin's floor, climbs a little way up the flanks and stops where the
     ground turns over — and there is a bite out of it where a lake is.
     Nothing about its outline is authored.

   That difference is forced rather than chosen. The flattest 1,240-across
   patch of ground anywhere in this world has **71 units of relief**, against
   buildings 15 to 40 tall: a low city laid out on a grid there would be a
   blanket over a hill, and the only honest way to spread one over four times
   Houston's footprint is to let the terrain say where it goes.

   ── A city has no pad ───────────────────────────────────────────────────
   A scene stands on a slab (`scenes.ts`'s `padOf`) because it is one object
   and a level one. A city is two hundred objects over 1,240 units, and a
   slab under that is a mesa. So **every building stands on the ground under
   it**, sunk far enough that its footing is buried on the high corner, and
   the city's `pad` is zero — a part's `y` here is measured from sea level
   rather than from a slab, which is the one way these differ from the four
   scenes as `built.ts` and `solid.ts` read them.

   ── The proxy is the geometry ───────────────────────────────────────────
   §35's convention allows for this case and Homonoia already uses it: where
   a thing *is* a handful of boxes standing on their own, an authored
   approximation of it could only be worse. So every box below is pushed to
   both lists in one call — a city cannot acquire §35's placement bug,
   because there is no second expression for where a box is.

   The one deliberate hole is the same as Basis's struts, and it is the arch:
   what is solid is the two piers, the span and the attic, and the opening
   between them is 28 units across and 52 tall against a camera of four. You
   fly through it. */

import { hash3, ramp } from './cover';
import { CITY_SITES, WATER, height } from './height';
import type { Built, Part, Solid } from './scenes';

const DEG = Math.PI / 180;

/* A city is turned off the world axes, and that is the only reason it is
   here: everything else in this world is a landform or one object, and a
   grid square to x and z is the one thing that would say a computer laid it
   out. The turn has to be applied twice and in two different ways — to
   *where* a block is, here, and to the block itself, by `built.ts`'s shader
   through `part.yaw` — because an instance's yaw turns the box about its own
   centre and does not move it (§35). Both come off the same `yaw` and the
   same call below, so they cannot drift apart. */
function turn(u: number, v: number, deg: number): [number, number] {
  const r = deg * DEG;
  return [u * Math.cos(r) + v * Math.sin(r), v * Math.cos(r) - u * Math.sin(r)];
}

type Site = { slug: string; x: number; z: number };
const siteOf = (slug: string): Site => {
  const s = CITY_SITES.find((c) => c.slug === slug)!;
  return { slug, x: s.x, z: s.z };
};

/** The lowest ground under a footprint. A building is sunk to it, so a
    footing is buried on the high corner rather than standing on a stilt on
    the low one — which is what `SLAB` does for a scene and is the only thing
    the ground is asked about once a plot has been accepted. */
function underAt(site: Site, ox: number, oz: number, w: number, d: number, yaw: number): number {
  let low = Infinity;
  for (const su of [-1, 1]) {
    for (const sv of [-1, 1]) {
      const [cx, cz] = turn(su * w, sv * d, yaw);
      low = Math.min(low, height(site.x + ox + cx, site.z + oz + cz));
    }
  }
  return low;
}

/** One box, from the ground up, into both lists at once. `from` and `to` are
    world heights because a city has no pad.

    There is no way to ask for a box that is drawn and not solid, and that is
    the point: §35's placement bug was two expressions for where one box is,
    and a city has two hundred and fifty of them. What is not solid here is
    what is not *drawn* — the arch's opening is a gap between two piers. */
function block(
  out: { parts: Part[]; proxy: Solid[] },
  ox: number, oz: number, from: number, to: number,
  w: number, d: number, yaw: number,
): void {
  const y = (from + to) / 2;
  const h = (to - from) / 2;
  out.parts.push({ x: ox, y, z: oz, w, h, d, yaw, kind: 0, a: 0, b: 0 });
  out.proxy.push({ x: ox, y, z: oz, w, h, d, yaw, ride: false });
}

/* ── Houston — a tight cluster that stops ───────────────────────────────
   Five by five at a 128-unit pitch with the four corners cut: twenty-one
   plots, of which one is left empty by the hash, and **572 units across** the
   drawn boxes. The pitch is the street and the tower widths were solved back
   from it rather than the other way about — measured, a shaft is 48 to 65
   across and what is left between two neighbours is **65.5 to 77.0 units**,
   inside §0.2's 60 to 80.

   The profile is a downtown: tallest in the middle, falling to the edge, and
   then a hard stop. Nothing tapers off, nothing stands outside the grid, and
   the plot that is empty is empty *inside* it. A skyline that decays at its
   edges is a city seen from ten miles away in daylight; this one is meant to
   be flown into. Measured, the towers stand **190 to 300 units** over the
   ground under them — the expression below can reach 320 but only the centre
   plot is at the top of the height curve, and its own jitter is 0.86.

   Each tower is three boxes rather than one, and it is the cheapest thing
   that stops a skyline reading as a bar chart: a shaft, a setback at 0.62 of
   the height and a crown at 0.86. The two tallest get a mast, because what
   makes a skyline legible at 842 to 1,377 units — which is where Basis's
   settle sees this one — is one or two silhouettes that come to a point. */
const H_YAW = 18;
const H_PITCH = 128;
const H_GRID = 5;
const H_TALL = 320;
const H_SHORT = 180;
const H_HALF_MIN = 24;
const H_HALF_MAX = 33;
/** How far a tower's footing reaches below the lowest ground under it. The
    site has 40 units of relief across the whole 480, so this is about three
    times what a single 66-unit plot can drop across. */
const H_SINK = 16;

function houston(): Built {
  const site = siteOf('houston');
  const out = { parts: [] as Part[], proxy: [] as Solid[] };
  const mid = (H_GRID - 1) / 2;
  const reach = mid * H_PITCH;

  const towers: { ox: number; oz: number; half: number; top: number }[] = [];
  for (let i = 0; i < H_GRID; i++) {
    for (let j = 0; j < H_GRID; j++) {
      const u = (i - mid) * H_PITCH;
      const v = (j - mid) * H_PITCH;
      const r = Math.hypot(u, v) / reach;
      // The cut corners, and then a plot left open inside the grid.
      if (r > 1.25) continue;
      if (hash3(i, j, 7) < 0.12 && r > 0.1) continue;

      const [ox, oz] = turn(u, v, H_YAW);
      const half = H_HALF_MIN + (H_HALF_MAX - H_HALF_MIN) * hash3(i, j, 11);
      /* Downtown, written down: 1 at the centre and 0 at the edge of the
         cluster, then a fifth of the range as jitter so the skyline is not a
         cone. */
      const t = Math.max(0, 1 - r / 1.15);
      const tall = H_SHORT + (H_TALL - H_SHORT) * (0.05 + 0.95 * t) * (0.84 + 0.16 * hash3(i, j, 13));
      towers.push({ ox, oz, half, top: tall });
    }
  }
  // The mast goes on the two tallest, and nothing else in the city has one.
  const spires = towers.slice().sort((a, b) => b.top - a.top).slice(0, 2);

  for (const t of towers) {
    const base = underAt(site, t.ox, t.oz, t.half, t.half, H_YAW) - H_SINK;
    const top = base + H_SINK + t.top;
    const setback = base + H_SINK + t.top * 0.62;
    const crown = base + H_SINK + t.top * 0.86;
    block(out, t.ox, t.oz, base, setback, t.half, t.half * 0.88, H_YAW);
    block(out, t.ox, t.oz, setback, crown, t.half * 0.80, t.half * 0.70, H_YAW);
    block(out, t.ox, t.oz, crown, top, t.half * 0.58, t.half * 0.50, H_YAW);
    if (spires.includes(t)) block(out, t.ox, t.oz, top, top + 30, 1.8, 1.8, H_YAW);
    /* A podium under nine of the twenty, and it is the thing that says the
       towers share a ground: without one the cluster is a set of independent
       objects that happen to be near each other. */
    if (hash3(Math.round(t.ox), Math.round(t.oz), 5) > 0.62) {
      block(out, t.ox, t.oz, base, base + H_SINK + 15, t.half * 1.34, t.half * 1.24, H_YAW);
    }
  }
  return { slug: 'houston', site: { x: site.x, z: site.z }, pad: 0, parts: out.parts, proxy: out.proxy };
}

/* ── Delhi — low, dense, and shaped by the ground ───────────────────────
   A 54-unit plot grid over a disc of 620, turned 9° off the axes, with every
   fifth row and column left open — so there is a clear strip **66 units
   across** every 270, which is the only authored structure in it and is what
   makes the plan legible from above. Everything else about the outline is
   the terrain's. Be exact about how much: of the plots that reach the ground
   tests, **seven are refused for slope and nine for the water line**, and
   over the whole disc — before the thinning takes its share — sixteen are too
   steep and twenty-one are wet. So the *scale* of the city is the radial
   thinning's and its **shape** is the ground's: the north-west flank is cut
   where the basin turns over and there is a lake bitten out of the south, and
   neither is authored. 162 buildings, and the rule is what stopped it being
   a disc.

   Buildings are 32 to 48 across on a 54 pitch, so two neighbours are 6 to
   22 apart and the jittered pairs touch. That is deliberate and it is the
   other half of the contrast: Houston's gaps are streets you fly down and
   Delhi's are alleys you cannot, which is what dense means. It was built at
   28–42 first and the plan came back reading as scattered blocks with ground
   between them from three hundred units up, which is a suburb.

   Three tests, in the order they cost: the avenue, then a hashed density
   that thins from the core to the rim, then the ground — above the water
   line and under a slope of 0.30. The last two are what make it a different
   city rather than a smaller Houston. Measured, they leave a city that is
   two thirds built and has a lake bitten out of one side.

   Nothing here is 180 units tall and nothing needs to be: what this city has
   to do is be *wide*, and what makes 15 units read at all is that there are
   two hundred of them. Two of them break the surface — a handful of blocks
   at 1.8× — and the three monuments do the rest. */
const D_YAW = -9;
const D_PITCH = 54;
const D_R = 620;
const D_AVENUE = 5;
const D_LOW = 15;
const D_HIGH = 40;
const D_HALF_MIN = 16;
const D_HALF_MAX = 24;
const D_SLOPE = 0.30;
const D_SINK = 9;
/** Where the ground is measured, for the slope test: forward differences
    over the same span `cover.ts` uses, so the two agree about what steep is. */
const D_SPAN = 4;

function delhi(): Built {
  const site = siteOf('delhi');
  const out = { parts: [] as Part[], proxy: [] as Solid[] };
  const span = Math.ceil(D_R / D_PITCH);

  for (let i = -span; i <= span; i++) {
    for (let j = -span; j <= span; j++) {
      if (i % D_AVENUE === 0 || j % D_AVENUE === 0) continue;
      const u = i * D_PITCH + (hash3(i, j, 1) - 0.5) * 15;
      const v = j * D_PITCH + (hash3(i, j, 2) - 0.5) * 15;
      const r = Math.hypot(u, v);
      if (r > D_R) continue;
      /* Dense in the core, thinning to the rim. `ramp` reversed, so it is 1
         inside 0.45 of the radius and 0 at it. */
      const density = ramp(D_R, D_R * 0.45, r);
      if (hash3(i, j, 3) > 0.22 + 0.78 * density) continue;

      const [ox, oz] = turn(u, v, D_YAW);
      const x = site.x + ox;
      const z = site.z + oz;
      const g = height(x, z);
      if (g < WATER + 2.5) continue;
      const slope = Math.hypot(
        height(x + D_SPAN, z) - g,
        height(x, z + D_SPAN) - g,
      ) / D_SPAN;
      if (slope > D_SLOPE) continue;

      const w = D_HALF_MIN + (D_HALF_MAX - D_HALF_MIN) * hash3(i, j, 4);
      const d = D_HALF_MIN + (D_HALF_MAX - D_HALF_MIN) * hash3(i, j, 5);
      /* Skewed low: the exponent puts two thirds of the city under half the
         range, so 40 is a building that stands out of it rather than the
         average one. */
      let tall = D_LOW + (D_HIGH - D_LOW) * Math.pow(hash3(i, j, 6), 1.6);
      if (hash3(i, j, 9) > 0.95) tall *= 1.8;

      const base = underAt(site, ox, oz, w, d, D_YAW) - D_SINK;
      block(out, ox, oz, base, base + D_SINK + tall, w, d, D_YAW);
    }
  }

  /* ── The three monuments ───────────────────────────────────────────
     They stand in avenue crossings, which are the only open ground in the
     city and are where a reader flying down one arrives at them.

     **The tower is not fluted, and that is §34's lesson rather than a
     shortcut.** Ribs 3 units wide on a 30-unit drum are 1.8 units of gap at
     the pitch a flute needs; seen from anywhere outside the city, with no
     MSAA, two edges land in one pixel and what comes back is vertical moiré
     — the exact failure that took Enargeia from 350 cells to 90. What
     carries the silhouette at that distance is the taper and the three
     balcony rings, so that is what is modelled. */
  const cross = (i: number, j: number): [number, number] =>
    turn(i * D_PITCH * D_AVENUE, j * D_PITCH * D_AVENUE, D_YAW);

  // The arch. Two piers, a span and an attic, and the opening is left open:
  // 28 units across and 52 tall against a camera of four. Sixty-four wide
  // in all, which is what the avenue it stands in leaves clear — and 28 by
  // 72 was the first build, which read as a doorway rather than as a gate.
  {
    const [ox, oz] = cross(0, 0);
    const g = underAt(site, ox, oz, 32, 15, D_YAW) - 10;
    for (const s of [-1, 1]) {
      const [px, pz] = turn(s * 24, 0, D_YAW);
      block(out, ox + px, oz + pz, g, g + 10 + 52, 10, 14, D_YAW);
    }
    block(out, ox, oz, g + 10 + 52, g + 10 + 74, 32, 14, D_YAW);
    block(out, ox, oz, g + 10 + 74, g + 10 + 102, 22, 11, D_YAW);
  }

  // The tapering tower, and it is the tallest thing in this city.
  {
    const [ox, oz] = cross(1, -1);
    const g = underAt(site, ox, oz, 16, 16, D_YAW) - 10;
    const drums: [number, number, number][] = [
      [0, 34, 15.0], [34, 60, 12.6], [60, 80, 10.4], [80, 96, 8.4], [96, 108, 6.6],
    ];
    for (const [from, to, half] of drums) block(out, ox, oz, g + from, g + 10 + to, half, half, D_YAW);
    for (const [at, half] of [[34, 15.0], [60, 12.6], [80, 10.4]] as const) {
      block(out, ox, oz, g + 10 + at - 1.1, g + 10 + at + 1.1, half + 3.4, half + 3.4, D_YAW);
    }
    block(out, ox, oz, g + 10 + 108, g + 10 + 121, 3.2, 3.2, D_YAW);
  }

  // A stepped tank: five slabs, and the only thing in the world you can
  // walk down into. Sixty units, so it reads as a monument and not a roof.
  {
    const [ox, oz] = cross(-1, 1);
    const g = underAt(site, ox, oz, 30, 30, D_YAW) - 12;
    const steps: [number, number][] = [[0, 12], [12, 24], [24, 36], [36, 48], [48, 60]];
    steps.forEach(([from, to], k) => {
      const half = 30 - k * 5;
      block(out, ox, oz, g + from, g + 12 + to, half, half, D_YAW);
    });
  }

  return { slug: 'delhi', site: { x: site.x, z: site.z }, pad: 0, parts: out.parts, proxy: out.proxy };
}

export const CITIES: Built[] = [houston(), delhi()];
export const cityOf = (slug: string): Built => CITIES.find((c) => c.slug === slug)!;
