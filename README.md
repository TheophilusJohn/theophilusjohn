# theophilusjohn.com

Document-mode skeleton. Steps 1–4 of the build order in the spec.

## Run

```bash
npm install
npm run dev
```

## Deploy

```bash
npx astro add cloudflare
```

Then connect the repo in Cloudflare Pages — build command `npm run build`, output `dist`.
Add `theophilusjohn.com` and `www.theophilusjohn.com` as custom domains, redirect www to apex.

## What's here

- `src/styles/tokens.css` — palette and type scale. Every size and colour comes from here.
- `src/styles/global.css` — reset, base type, motion kill-switch.
- `src/layouts/Base.astro` — head, skip link, header, footer. Pre-paint toggle script lives here.
- `src/components/Toggles.astro` — contrast and reduced-motion controls, persisted to localStorage.
- `src/content.config.ts` — project schema.
- `src/content/projects/*.mdx` — four projects, writeup bodies empty.
- `src/pages/` — home, work index, project pages, about, 404.

## What's next

5. Self-host the display and mono fonts (currently falling back to system).
6. Fill the four writeups. Constraint → decisions → result → what I'd change.
7. Then, and only then, `npm i gsap lenis three` and start the motion layer.

## Rules that are easy to break

- No arbitrary font sizes or colours. Add a token instead.
- `--leader` means active/elected/current. Never decoration.
- Anything animated must check `[data-motion="off"]`, not just the media query.
