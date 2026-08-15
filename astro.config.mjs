import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://theophilusjohn.com',
  integrations: [mdx()],
  // Cloudflare adapter is added at deploy time:
  //   npx astro add cloudflare
  // Left out here so `npm run build` works as a static build during development.
});
