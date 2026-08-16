# theophilusjohn.com

Personal portfolio for Theophilus Biju John. Astro 7, deployed to Cloudflare Pages.
Live at https://theophilusjohn.com — every commit to `main` deploys.

Full design spec: `docs/SPEC.md`. Numbered build steps: `docs/STEPS.md`.

---

## What this site is

Portfolio-first, four projects, heavily animated, dark. Two modes:

- **Document mode** — the site is ONE page. All content lives on `/`. Deep
  links work via History API `replaceState`, not routes. Crawlable,
  accessible, fast. It must stand entirely alone.
- **World mode** — a navigable 3D volume wrapped around the *same* HTML.
  Additive. Never the only way to reach anything.

Build order is strict: document mode is finished and shipped before world
mode begins. Steps 1–14, then 15–21. See `docs/STEPS.md`.

---

## Hard rules

These are not preferences. Violating one is a bug.

1. **No arbitrary values.** Every colour and font size comes from a token in
   `src/styles/tokens.css`. Need a new one? Add a token, don't inline a hex
   or a `px` value.
2. **`--leader` means state.** Active, elected, current. If it isn't marking
   state or a live link, it must not be that colour.
3. **Motion checks `[data-motion="off"]`**, not just the media query. The
   toggle overrides the OS in both directions.
4. **Reduced motion means final state, not fast animation.** No shortened
   durations. Skip to the end.
5. **One WebGL context** on the whole site. The laptop is geometry inside
   the persistent scene, not a second canvas.
6. **Every fact exists in document mode.** If information only appears in
   world mode, that is a bug, not a feature.
7. **No new dependencies without asking.** Especially: no React, no R3F, no
   Tailwind, no second animation library.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Astro 7 (upgraded from 5; check v7 docs, not v5) |
| Styling | Plain CSS + custom properties. Scoped `<style>` in components |
| Animation | GSAP (ScrollTrigger, SplitText) — free for commercial use since 3.13 |
| Smooth scroll | Lenis |
| 3D | Three.js r171+ via `three/webgpu`. TSL shaders. Pin the version |
| Content | Astro content collections + MDX |
| Deploy | Cloudflare Pages, `npm run build`, output `dist` |

**Banned:** React, React Three Fiber, Tailwind, Motion, Anime.js, React
Spring, Trig.js, GSAP ScrollSmoother (overlaps Lenis).

---

## Known traps

- `await renderer.init()` before first render. WebGPU init is async.
- Feature-detect with `renderer.isWebGPURenderer`, never
  `capabilities.isWebGL2` (undefined under WebGPU).
- Never mix `three` and `three/webgpu` imports. Use `three/webgpu` everywhere.
- URL sync on scroll uses `replaceState`, never `pushState`. Pushing on
  scroll floods the back stack and breaks the back button.
- Additive particles must not write depth but must still depth-test.
  Set `renderOrder` explicitly.
- Dispose geometries, materials, textures, render targets. The scene never
  unmounts, so leaks accumulate silently.
- Custom cursor only on `(pointer: fine)`. Never initialise on touch.
- `gsap.ticker.lagSmoothing(0)` means a backgrounded tab applies the whole
  elapsed wall-clock gap in one frame on return. Invisible on a looping
  marquee; scrubbed pins (step 11) will inherit it and jump. Decide there
  whether to re-enable lag smoothing or clamp.
- A toggle that overrides an OS preference must persist both states, not
  clear its key on un-press. Clearing drops back to `auto`, so the OS
  re-asserts on the next load and silently undoes the choice. Same reason
  a bare `@media (prefers-reduced-motion: reduce)` block has to be scoped
  `html:not([data-motion="on"])` — otherwise the query overrides the toggle
  and only one direction works.
- Pre-paint state paints off the root attribute the inline head script
  sets, never off `aria-pressed`. The module that syncs `aria-pressed`
  lands after first paint, so a control styled from it flashes.
- GSAP absorbs an element's existing CSS transform as pixel `x` on attach,
  then stacks its own xPercent/yPercent on top — doubling the offset. If an
  element has a CSS transform before GSAP animates it, pin `x: 0` (or
  `y: 0`) in the from-vars so only the percent drives position. Tell: the
  element lands at ~2x its intended offset.

---

## Budgets

Check before claiming a step is done.

- Homepage JS, mobile: **under 120KB gzipped** (no Three below 768px)
- Homepage JS, desktop: **under 260KB gzipped**
- LCP under 2.5s on throttled 4G
- Under 100 draw calls
- Lighthouse accessibility **100**
- Usable at 360px wide with motion off

---

## Working agreement

- **One numbered step per session.** Don't drift into the next one.
- **Stop and ask** rather than substituting an approach. Especially: a
  different typeface, a different library, a workaround that changes
  architecture.
- **Report what you measured**, not that it "should" work. Sizes, counts,
  timings.
- Don't add comments explaining what code does. Comment only *why*, where
  a choice would otherwise look arbitrary.
- Commit at the end of a step, message in the imperative: `Self-host fonts`.
