import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: z
    .object({
      title: z.string(),
      machineId: z.string(),
      // Result-first. Shown on the card and in meta description.
      summary: z.string().max(140),
      // Editorial line used as the large headline. Not the project name.
      headline: z.string(),
      /* Where the headline breaks across two lines: the zero-based index
         of the word to break *after*. Omit for no break. Purely visual —
         the break is a <br>, so the heading still reads as one string. */
      headlineBreak: z.number().int().nonnegative().optional(),
      role: z.string(),
      period: z.string(),
      stack: z.array(z.string()),
      metrics: z.array(z.object({ value: z.string(), label: z.string() })).max(4).default([]),
      liveUrl: z.url().optional(),
      repoUrl: z.url().optional(),
      order: z.number(),
      draft: z.boolean().default(false),
    })
    // An index past the last word would silently render no break. Fail the
    // build instead — a headline reflow is exactly the thing nobody notices.
    .superRefine((d, ctx) => {
      if (d.headlineBreak === undefined) return;
      const words = d.headline.trim().split(/\s+/);
      if (d.headlineBreak > words.length - 2) {
        ctx.addIssue({
          code: 'custom',
          path: ['headlineBreak'],
          message: `headlineBreak ${d.headlineBreak} leaves nothing on the second line; "${d.headline}" has ${words.length} words, so the last usable index is ${words.length - 2}.`,
        });
      }
    }),
});

export const collections = { projects };
