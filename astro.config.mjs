import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://theophilusjohn.com',
  integrations: [mdx()],

  // §4.6 collapsed these into ranges on `/`. They were linked from the
  // nav while the site was live, so they keep resolving. Static build
  // emits a meta-refresh page, so this works with JS off too.
  redirects: {
    '/projects': '/#work',
    '/about': '/#about',
  },

  // Cloudflare adapter is added at deploy time:
  //   npx astro add cloudflare
  // Left out here so `npm run build` works as a static build during development.
});
