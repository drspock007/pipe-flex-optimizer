import {
  buildSitemap,
  getSeoPage,
  NOT_FOUND_SEO,
  serializeJsonLd,
  SOCIAL_IMAGE_URL,
} from "./routes";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderDocument(template: string, pathname: string, appHtml: string): string {
  const page = getSeoPage(pathname);
  let html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

  if (!page) {
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(NOT_FOUND_SEO.title)}</title>`);
    html = html.replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(NOT_FOUND_SEO.description)}" />`,
    );
    html = html.replace(/\s*<meta (?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>/g, "");
    html = html.replace(/\s*<link rel="canonical"[^>]*>/, "");
    html = html.replace(/\s*<script id="route-jsonld"[^>]*>[\s\S]*?<\/script>/, "");
    html = html.replace("</head>", `    <meta name="robots" content="${NOT_FOUND_SEO.robots}" />\n  </head>`);
    return html;
  }

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(page.title)}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeHtml(page.description)}" />`,
  );
  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${page.canonical}" />`,
  );
  html = html.replace(/<meta property="og:type" content="[^"]*"\s*\/?>/, `<meta property="og:type" content="${page.openGraphType}" />`);
  html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${page.canonical}" />`);
  html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${escapeHtml(page.title)}" />`);
  html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${escapeHtml(page.description)}" />`);
  html = html.replace(/<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${SOCIAL_IMAGE_URL}" />`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`);
  html = html.replace(/<meta name="twitter:image" content="[^"]*"\s*\/?>/, `<meta name="twitter:image" content="${SOCIAL_IMAGE_URL}" />`);
  html = html.replace(
    /<script id="route-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script id="route-jsonld" type="application/ld+json">${serializeJsonLd(page.jsonLd)}</script>`,
  );
  return html;
}

export { buildSitemap };
