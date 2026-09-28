# SEO deployment checks

`src/seo/routes.ts` is the source of truth for public routes, metadata, JSON-LD
and sitemap dates. Update a route's `lastModified` only when its visible content
changes materially.

`bun run build` renders the React application into `dist/index.html`,
`dist/help/index.html`, `dist/in-service/index.html` and `dist/404.html`, then
generates `dist/sitemap.xml`. The client hydrates those documents and continues
to update the head during React Router navigation.

## Publication gate

After publishing through Lovable, verify the production responses rather than
assuming the local static-server behavior matches the CDN:

1. Request `/`, `/help` and `/in-service` without executing JavaScript. Each
   response must contain its own H1, title, description, canonical and
   `route-jsonld` graph.
2. Confirm `robots.txt` and `sitemap.xml` are public and that the sitemap contains
   exactly the three public canonical URLs.
3. Request a random missing URL. It must return HTTP 404 and the response must
   contain `noindex,nofollow`. A rendered 404 component with HTTP 200 is still a
   soft 404 and does not pass this gate.
4. If Lovable's React/Vite fallback ignores the generated route files or still
   returns HTTP 200 for missing URLs, resolve that in the hosting layer. Lovable's
   documented alternative for full server responses is migration to TanStack
   Start; do not claim the 404 issue is fixed until the live status is verified.
5. Run Lovable's **SEO & AI search** scan after publishing and validate each
   JSON-LD graph with Google's Rich Results Test and Schema.org Validator.

Lovable documents that older React/Vite projects receive on-request prerendering
for verified Google, Bing, social and AI crawlers. The generated static documents
remain useful for compatible static hosting, deterministic tests and deployment
inspection, but only the live checks above prove what the production CDN serves.

## Search engines

In Google Search Console, verify the exact HTTPS property, submit
`https://pipe-lowering.giovannimalagninoconsulting.com/sitemap.xml`, inspect all
three canonical URLs and request indexing after the new deployment. Confirm that
Google's selected canonical matches the declared canonical. Import the verified
property into Bing Webmaster Tools and submit the same sitemap.

Search Console and Bing require access to the owner's accounts and are therefore
post-deployment operations, not build steps. Review coverage and Core Web Vitals
weekly for the first month, then include them in the regular monthly SEO review.

References:

- <https://docs.lovable.dev/features/seo-aeo>
- <https://docs.lovable.dev/features/upgrade-to-tanstack-start>
- <https://docs.lovable.dev/integrations/google-search-console>
