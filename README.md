# Theophilus John

I'm a computer science master's student at the University of Houston–Clear
Lake, where I also administer the lab environment — a mixed Ubuntu and
Windows Server estate used by students and faculty. Before that I spent three
years at Tata Consultancy Services as a systems engineer, working on TCS
BaNCS, a core banking platform. Most of what I build ends up being about the
same problem: getting separate things to agree.

**[theophilusjohn.com](https://theophilusjohn.com)** · Houston, TX

- **[Enargeia](https://enargeia.dev)** — an LLM running entirely in the
  browser, every kernel WGSL on WebGPU, zero server cost
- **[Homonoia](https://homonoia.dev)** — Raft written from the paper, on a
  network you can break while it runs
- **[Philoi](https://philoi.net)** — a collaborative editor where concurrent
  edits converge without a lock
- **[Basis](https://github.com/TheophilusJohn/basis)** — a TypeScript SaaS
  starter, shipped to a live deployment with validated billing

---

## About this repository

Personal portfolio for Theophilus Biju John. Astro 7, deployed to Cloudflare
Pages. Live at <https://theophilusjohn.com> — every commit to `main` deploys.

The design spec is `docs/SPEC.md`, the numbered build steps are
`docs/STEPS.md`, and the working rules are `CLAUDE.md`. Those three are the
authority; this file is the map.

### Run

```bash
npm install
npm run dev      # astro dev
npm run build    # static build to dist/
npm run check    # astro check — types across .astro, .ts and .mdx
npm run preview
```

### What the site is

**Two modes, and the world is the default.** `/` resolves which one before
first paint, in a head script in `src/layouts/Base.astro`:

- **World mode** — a flyable, cel-shaded night-or-day landscape rendered with
  WebGPU. The four projects are *scenes* standing in it, on a route driven by
  scroll, with two cities and ten landmarks off it. Requires an adapter, a
  viewport of 1024px or wider, and motion on. Nothing overrides that gate.
- **Document mode** — everything else, and it stands entirely alone. The whole
  site is one page: hero, four projects, about. Deep links work through the
  History API rather than routes. It is what `?doc` forces and the escape
  hatch from inside the world.

**Every fact exists in document mode.** Information that only appears in the
world is a bug, not a feature — that is the whole accessibility story now
that the world loads first.

### Layout

| | |
|---|---|
| `src/styles/tokens.css` | The palette and the type scale. Every colour and size on the site comes from here — four token sets: dark, dark + high contrast, light, light + high contrast |
| `src/styles/global.css` | Reset, base type, the world's DOM layer, the motion kill-switch |
| `src/layouts/Base.astro` | Head, link previews, icons, skip link, header, footer. The pre-paint script that resolves appearance, contrast, motion and mode lives here |
| `src/components/Toggles.astro` | Three controls — appearance, contrast, motion. All three-state, all persisted, all applied before first paint |
| `src/components/Entry.astro` | The world's curtain and the way out of it |
| `src/content/projects/*.mdx` | The four projects. Frontmatter is the authority for order, metrics and links |
| `src/scripts/*.ts` | Document mode — motion, intro, hero, pinned beats, cursor, URL sync, and the loader that decides whether the world boots |
| `src/scripts/world/*.ts` | World mode. **Fourteen of these thirty-four files have no `three` and no DOM in them** — the field, the placement rules, the route, the scenes, the cities, the landmarks, the collision table, the election — so Node imports the `.ts` directly and the numbers in the record are the shipped function's own output |
| `astro.config.mjs` | Two build plugins: the world chunk's manifest, and `sitemap.xml` / `robots.txt` |

### Deploy

Cloudflare Pages, build command `npm run build`, output `dist`. The adapter
is deliberately **not** in `astro.config.mjs` — leaving it out is what keeps
`npm run build` a plain static build during development. Add it at deploy
time:

```bash
npx astro add cloudflare
```

Two things about the zone rather than the repo, both found by the §44 audit:

- **Turn off Email Address Obfuscation** (Scrape Shield). It rewrites both
  `mailto:` links into `/cdn-cgi/l/email-protection` and injects a script to
  undo that at runtime — so with JS off, which is the state the whole
  no-script story is built for, the address reads `[email protected]`.
- **Check `robots.txt` after the first deploy.** Cloudflare's managed
  robots.txt appends to the origin's rather than standing aside, so confirm
  the `Sitemap:` line survived.

### Regenerating the static art

`public/og.png`, `favicon.svg`, `favicon.ico` and `apple-touch-icon.png` are
checked in rather than built, because they change when the wordmark or the
subline does and not otherwise. The card is rendered from the site's own
tokens and self-hosted faces through a headless browser at 1200×630; the mark
is five nodes with the elected one in `--leader`, which is the site's own
motif and hard rule 2's licensed use of the accent.

If you regenerate the SVG by hand, note that **an XML comment may not contain
a double hyphen** — writing `--leader` in one makes the file not well-formed,
and it then serves 200 and renders nothing.

### Budgets

Checked every step, and the numbers are in `CLAUDE.md`.

- Document JS, any viewport: **under 120 KB gzipped** (no Three below 1024px)
- World chunk, desktop: **under 400 KB gzipped**
- 8ms/frame at cruise, under 100 draw calls, 60fps on integrated graphics
- LCP under 2.5s on throttled 4G; interactive world under 3s
- Lighthouse accessibility 100, usable at 360px wide with motion off

### Rules that are easy to break

The full set is in `CLAUDE.md`. The ones that bite most often:

- **No arbitrary values.** Every colour and font size is a token. Need a new
  one? Add a token.
- **`--leader` means state** — active, elected, current. Anything that has to
  be *read against the page* is `--leader-ink` instead.
- **Motion checks `[data-motion="off"]`**, not just the media query, and
  reduced motion means the final state rather than a faster animation.
- **One WebGL context** on the whole site.
- **No new dependencies without asking.** Especially no React, no R3F, no
  Tailwind, no second animation library.
