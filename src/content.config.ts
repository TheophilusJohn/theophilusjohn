import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    machineId: z.string(),
    // Result-first. Shown on the card and in meta description.
    summary: z.string().max(140),
    // Editorial line used as the large headline. Not the project name.
    headline: z.string(),
    role: z.string(),
    period: z.string(),
    stack: z.array(z.string()),
    metrics: z.array(z.object({ value: z.string(), label: z.string() })).max(4).default([]),
    liveUrl: z.string().url().optional(),
    repoUrl: z.string().url().optional(),
    order: z.number(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects };
