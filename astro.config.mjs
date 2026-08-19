import { writeFileSync } from 'node:fs';
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

/* §44 — the sitemap and robots.txt, written from the build's own page list.

   Not `@astrojs/sitemap`: hard rule 7, and there is nothing here that
   earns a dependency. This site emits six pages and the hook hands them
   over already resolved, so the whole thing is a filter and a template —
   and it stays right when a fifth project is added, because the list comes
   from what was actually built rather than from a table kept beside it.

   Both files are generated rather than dropped in `public/` so the
   `Sitemap:` line and the absolute URLs come from `site` itself and cannot
   drift from it. That is the only reason robots.txt is here; it is
   otherwise a constant, and with no `site` set neither file is written at
   all rather than written wrong.

   **What is deliberately not in it:**

   - `404/`, which is the one page the hook reports that must never be
     offered to a crawler.
   - `/about` and `/projects`. They are `redirects` rather than pages, so
     the hook does not report them at all — and that is the right answer
     twice over, because a sitemap that lists a redirect is a soft error
     to every crawler that reads one.
   - `lastmod`, `changefreq` and `priority`. The last two are ignored, and
     a `lastmod` taken from the build clock says "changed" on every deploy
     whether anything did or not. A date that is not true is worse than no
     date, since Google only leans on the field while it stays accurate. */
function siteFiles() {
  // Read from the resolved config rather than repeated here, which is the
  // whole point of generating robots.txt instead of checking one in.
  let site;
  return {
    name: 'tj:site-files',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = String(config.site ?? '').replace(/\/$/, '');
      },
      'astro:build:done': ({ pages, dir, logger }) => {
        if (!site) {
          logger.warn('no `site` configured — skipping sitemap.xml and robots.txt');
          return;
        }
        const locs = pages
          .map((p) => p.pathname)
          .filter((p) => p !== '404/')
          .sort()
          // The hook reports '' for the root and 'projects/basis/' for the
          // rest, which is exactly what a trailing-slash origin serves.
          .map((p) => `${site}/${p}`);

        writeFileSync(
          new URL('sitemap.xml', dir),
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            locs.map((loc) => `  <url><loc>${loc}</loc></url>`).join('\n') +
            '\n</urlset>\n',
        );

        /* Cloudflare's managed robots.txt serves its own content-signals
           block when the origin has none, which is what was on the live
           site before this. Shipping a real one takes the path back; check
           after the first deploy that the Sitemap line survived, because
           the managed feature appends rather than stands aside. */
        writeFileSync(
          new URL('robots.txt', dir),
          `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`,
        );

        logger.info(`sitemap.xml (${locs.length} urls) and robots.txt written`);
      },
    },
  };
}

export default defineConfig({
  site: 'https://theophilusjohn.com',
  integrations: [mdx(), siteFiles()],

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
