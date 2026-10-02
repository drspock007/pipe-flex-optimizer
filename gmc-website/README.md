# GMC corporate website

Independent Astro site for Giovanni Malagnino Consulting. The existing React/Vite calculator application and its deployment remain separate.

## Local development

Requirements: Node.js 22.12+ and pnpm 9+.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:4321/`. The root page sends visitors to the French version at `/fr/`.

## Build and preview

```sh
pnpm check
pnpm build
pnpm preview
```

Static output is written to `dist/`. The root redirects and old WordPress language URLs are prepared in `public/_redirects` (Netlify/Cloudflare Pages) and `public/.htaccess` (Apache). The production host must apply the corresponding redirect rules when the domain is switched.

## Analytics and publication setup

Copy `.env.example` to `.env` and set `PUBLIC_GA_MEASUREMENT_ID` to the GA4 web stream ID. GA is loaded only after the visitor chooses analytics. The consent cookie is strictly functional and expires after 180 days. Do not commit the production stream ID if the repository is public.

Before publication, complete `src/data/legal.ts`, verify the legal entity and postal contact, set the GA4 retention configuration, and review all three privacy/cookie policy translations. The policy pages visibly identify this pending review. Also validate the calculator URLs and the proposed wording with the business owner.

Fonts are downloaded at build time by Astro's font provider and served from this site. The heading face is Habibi and the body face is Roboto, matching the typography used in the existing GMC application shell. Brand black, white and amber are kept as the primary palette.
