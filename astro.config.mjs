import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

/* §33 — the loader needs a URL and a size before it fetches anything.

   The world is one dynamic import and the bundler turns it into one hashed
   chunk, so at runtime there is nothing to ask: the filename only exists
   after the build that produced it, and `__vitePreload`'s dependency table
   is a closure inside the entry chunk. Vite injects a `modulepreload` link
   when the import is *called*, which is a frame too late to measure and the
   wrong kind of request to read progress from.

   So the build writes down what it emitted. `/world.json` is two fields —
   where the chunk is and how many bytes it decodes to — and it is fetched
   from the head script, in parallel with the entry chunk, so it costs no
   round trip on the critical path. Everything else about the loader is a
   measurement rather than a constant, and this is the one thing that cannot
   be: a size the build knows and the browser does not. */
function worldManifest() {
  return {
    name: 'tj:world-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const [file, out] of Object.entries(bundle)) {
        if (out.type !== 'chunk') continue;
        if (!out.facadeModuleId?.endsWith('world/scene.ts')) continue;
        this.emitFile({
          type: 'asset',
          fileName: 'world.json',
          // Decoded bytes, not the wire's. The wire figure is the response's
          // own Content-Length and the loader reads it there; what a stream
          // hands back is decompressed, so that is what the total has to be
          // measured in or the bar runs past its own end under gzip.
          source: JSON.stringify({ url: '/' + file, bytes: Buffer.byteLength(out.code) }),
        });
        return;
      }
    },
  };
}

export default defineConfig({
  site: 'https://theophilusjohn.com',
  integrations: [mdx()],

  vite: { plugins: [worldManifest()] },

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
