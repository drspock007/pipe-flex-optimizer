export const SITE_URL = "https://pipe-lowering.giovannimalagninoconsulting.com";
export const SOCIAL_IMAGE_URL =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/eb307abc-c24d-41c5-b15d-9bfdc426a84d/id-preview-407395a1--d5fba987-72f9-45cd-bd56-623f72d37b40.lovable.app-1772125474066.png";

export type PublicRoute = "/" | "/in-service" | "/help";

export interface SeoPage {
  path: PublicRoute;
  title: string;
  description: string;
  canonical: string;
  lastModified: string;
  openGraphType: "website" | "article";
  jsonLd: Record<string, unknown>;
}

const organization = {
  "@type": "Organization",
  "@id": "https://www.giovannimalagninoconsulting.com/#organization",
  name: "Giovanni Malagnino Consulting",
  url: "https://www.giovannimalagninoconsulting.com",
  email: "giovanni@giovannimalagninoconsulting.com",
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/logo.png`,
  },
  sameAs: [
    "https://www.facebook.com/giovannimalagninoconsulting",
    "https://www.linkedin.com/in/giovannimalagnino/",
  ],
};

const website = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "Pipe Lowering and In-service Deflection",
  url: `${SITE_URL}/`,
  inLanguage: "en",
  publisher: { "@id": organization["@id"] },
};

const graph = (...entities: Record<string, unknown>[]) => ({
  "@context": "https://schema.org",
  "@graph": [organization, website, ...entities],
});

export const SEO_PAGES: readonly SeoPage[] = [
  {
    path: "/",
    title: "Pipe Lowering Stress & Deflection Calculator | GMC",
    description:
      "Analyze steel pipeline lowering with free or restrained axial behavior, unilateral supports and optional rigid ground contact.",
    canonical: `${SITE_URL}/`,
    lastModified: "2026-09-27",
    openGraphType: "website",
    jsonLd: graph({
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#pipe-lowering-application`,
      name: "Pipe Lowering Stress & Deflection Calculator",
      url: `${SITE_URL}/`,
      description:
        "Engineering calculator for steel pipeline lowering with free or restrained axial behavior, unilateral supports and optional rigid ground contact.",
      applicationCategory: "EngineeringApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@id": organization["@id"] },
      isPartOf: { "@id": website["@id"] },
    }),
  },
  {
    path: "/in-service",
    title: "In-service Pipe Deflection Calculator | GMC",
    description:
      "Evaluate temporary deflection of pressurized steel pipe across a symmetric excavation, including initial-state scenarios and temporary supports.",
    canonical: `${SITE_URL}/in-service`,
    lastModified: "2026-09-27",
    openGraphType: "website",
    jsonLd: graph({
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/in-service#application`,
      name: "In-service Pipe Deflection Calculator",
      url: `${SITE_URL}/in-service`,
      description:
        "Engineering calculator for temporary elastic deflection of pressurized steel pipe across a symmetric excavation.",
      applicationCategory: "EngineeringApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@id": organization["@id"] },
      isPartOf: { "@id": website["@id"] },
    }),
  },
  {
    path: "/help",
    title: "Pipe Lowering & In-service Deflection Help | GMC",
    description:
      "Technical documentation for pipe lowering and temporary in-service steel deflection models, searches, result terminology and limitations.",
    canonical: `${SITE_URL}/help`,
    lastModified: "2026-09-27",
    openGraphType: "article",
    jsonLd: graph({
      "@type": "TechArticle",
      "@id": `${SITE_URL}/help#article`,
      headline: "Pipe Lowering and In-service Deflection Technical Documentation",
      description:
        "Technical documentation for pipe lowering and temporary in-service steel deflection models, searches, result terminology and limitations.",
      url: `${SITE_URL}/help`,
      inLanguage: "en",
      proficiencyLevel: "Expert",
      about: [
        "Pipe lowering",
        "Biaxial beam analysis",
        "Temporary in-service steel pipe deflection",
        "Unilateral support contact",
      ],
      audience: {
        "@type": "Audience",
        audienceType: "Pipeline, mechanical and structural engineers",
      },
      author: { "@id": organization["@id"] },
      publisher: { "@id": organization["@id"] },
      isPartOf: { "@id": website["@id"] },
    }),
  },
] as const;

const normalizePath = (pathname: string) => {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
};

export function getSeoPage(pathname: string): SeoPage | undefined {
  const normalized = normalizePath(pathname);
  return SEO_PAGES.find((page) => page.path === normalized);
}

export const NOT_FOUND_SEO = {
  title: "Page Not Found (404) | GMC",
  description: "The requested page does not exist.",
  robots: "noindex,nofollow",
} as const;

export function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function buildSitemap(): string {
  const urls = SEO_PAGES.map(
    (page) => `  <url>\n    <loc>${page.canonical}</loc>\n    <lastmod>${page.lastModified}</lastmod>\n  </url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
