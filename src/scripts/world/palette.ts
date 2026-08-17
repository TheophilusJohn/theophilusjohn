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
};

const NAMES = {
  void: '--void',
  lift: '--void-lift',
  rule: '--rule',
  dim: '--dim',
  muted: '--muted',
  paper: '--paper',
  lead: '--leader',
} as const;

export const token = (name: string) =>
  new Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim());

export function buildPalette(onRepaint?: () => void) {
  const keys = Object.keys(NAMES) as (keyof Palette)[];
  const uniforms = {} as Record<keyof Palette, { value: Color }>;
  const palette = {} as Palette;
  for (const key of keys) {
    const node = uniform(new Color());
    uniforms[key] = node;
    // A colour node *is* three floats and TSL converts it at runtime; the
    // cast is only because the overload list does not name 'color'.
    palette[key] = vec3(node as unknown as Token);
  }

  function repaint() {
    for (const key of keys) uniforms[key]!.value = token(NAMES[key]);
    onRepaint?.();
  }

  repaint();
  new MutationObserver(repaint).observe(document.documentElement, {
    attributeFilter: ['data-contrast'],
  });

  return palette;
}
