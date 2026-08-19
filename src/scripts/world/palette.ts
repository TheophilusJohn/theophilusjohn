/* §2 / §23 — the palette, as uniforms.

   Every colour in the world is a token in `tokens.css` and every one of
   them is read here, at mount and on every change of the contrast toggle.
   §15 read them once and folded them in, and a page *loaded* in high
   contrast then got a different scene from one *toggled* into it — only the
   second path was ever tested and the bug survived two steps.

   It is its own module as of §23 because the sky and the ground now share
   it. The ground's far distance fades into the sky rather than into --void
   (§23), which means the material that draws the horizon and the material
   that draws the ground under it have to be reading the same seven values;
   handing each its own subset was how the two could drift apart. */

import { Color } from 'three/webgpu';
import { uniform, vec3 } from 'three/tsl';
import type Node from 'three/src/nodes/core/Node.js';

/* Handed out as vec3 rather than as the colour uniform behind it. A colour
   node and a vec3 node are the same three floats, and mixing one with the
   other is a type error at every second call site — every colour in this
   world is a term in an expression rather than a material's `color`, so
   converting once here is what keeps the shading code readable. */
export type Token = Node<'vec3'>;

export type Palette = {
  /** The deep sky, the clear colour, and what fog takes everything to. */
  void: Token;
  lift: Token;
  rule: Token;
  dim: Token;
  muted: Token;
  paper: Token;
  lead: Token;
  /** §30's motes, and the only thing in the world wearing it. */
  mint: Token;
  /* **Which appearance, as a uniform (§40).** 1 at day, 0 at night, and it
     is in the palette rather than beside it because it is the same fact the
     eight tokens above are: what the page currently looks like, re-read on
     every change. Every layer that needs a *different construction* rather
     than different values reads it — the sky's gradient, its cloud deck —
     and mixes between the two ends with it.

     Read as a *branch* and not as a mix — see `sky.ts`, where the two ends
     are two constructions rather than one with different numbers, and where
     the difference between branching on this and mixing with it was
     measured on the night frame. */
  day: Node<'float'>;
};

const NAMES = {
  void: '--void',
  lift: '--void-lift',
  rule: '--rule',
  dim: '--dim',
  muted: '--muted',
  paper: '--paper',
  lead: '--leader',
  mint: '--mint',
} as const;

export const token = (name: string) =>
  new Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim());

/** **Which appearance, read off the root (§40).** The head script resolves
    `auto` to an explicit attribute before first paint (§39), so this is a
    question with an answer in the frame the browser paints and there is no
    media query to consult here. Anything that is not `light` is night,
    including the absent attribute — with no script at all the site is dark,
    which is its default by design. */
export const isDay = () => document.documentElement.dataset.theme === 'light';

export function buildPalette(onRepaint?: (day: boolean) => void) {
  const keys = Object.keys(NAMES) as Exclude<keyof Palette, 'day'>[];
  const uniforms = {} as Record<string, { value: Color }>;
  const palette = {} as Palette;
  for (const key of keys) {
    const node = uniform(new Color());
    uniforms[key] = node;
    // A colour node *is* three floats and TSL converts it at runtime; the
    // cast is only because the overload list does not name 'color'.
    palette[key] = vec3(node as unknown as Token);
  }

  /* The appearance, beside the eight colours and re-read with them. It is a
     uniform and not a rebuild for the same reason they are: a scene that
     read the attribute once at mount would behave differently depending on
     whether the toggle was *set before* the load or *toggled after* it, and
     only the second path is usually the one tested (§15's bug, twice). */
  const day = uniform(0);
  palette.day = day;

  function repaint() {
    for (const key of keys) uniforms[key]!.value = token(NAMES[key]);
    const lit = isDay();
    day.value = lit ? 1 : 0;
    onRepaint?.(lit);
  }

  repaint();
  /* Two attributes since §40. `data-contrast` moves the values inside an
     appearance; `data-theme` moves the appearance. Both land on the root
     and both are one repaint. */
  new MutationObserver(repaint).observe(document.documentElement, {
    attributeFilter: ['data-contrast', 'data-theme'],
  });

  return palette;
}
