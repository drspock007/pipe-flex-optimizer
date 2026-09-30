import {
  getSeoPage,
  NOT_FOUND_SEO,
  serializeJsonLd,
  SOCIAL_IMAGE_URL,
} from "./routes";

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function removeMeta(selector: string) {
  document.head.querySelector(selector)?.remove();
}

export function applySeo(pathname: string) {
  const page = getSeoPage(pathname);
  if (!page) {
    document.title = NOT_FOUND_SEO.title;
    setMeta('meta[name="description"]', "name", "description", NOT_FOUND_SEO.description);
    setMeta('meta[name="robots"]', "name", "robots", NOT_FOUND_SEO.robots);
    document.head.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]').forEach((element) => element.remove());
    document.head.querySelector('link[rel="canonical"]')?.remove();
    document.getElementById("route-jsonld")?.remove();
    return;
  }

  document.title = page.title;
  setMeta('meta[name="description"]', "name", "description", page.description);
  removeMeta('meta[name="robots"]');
  setMeta('meta[property="og:type"]', "property", "og:type", page.openGraphType);
  setMeta('meta[property="og:url"]', "property", "og:url", page.canonical);
  setMeta('meta[property="og:title"]', "property", "og:title", page.title);
  setMeta('meta[property="og:description"]', "property", "og:description", page.description);
  setMeta('meta[property="og:image"]', "property", "og:image", SOCIAL_IMAGE_URL);
  setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
  setMeta('meta[name="twitter:title"]', "name", "twitter:title", page.title);
  setMeta('meta[name="twitter:description"]', "name", "twitter:description", page.description);
  setMeta('meta[name="twitter:image"]', "name", "twitter:image", SOCIAL_IMAGE_URL);

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = page.canonical;

  let jsonLd = document.getElementById("route-jsonld") as HTMLScriptElement | null;
  if (!jsonLd) {
    jsonLd = document.createElement("script");
    jsonLd.id = "route-jsonld";
    jsonLd.type = "application/ld+json";
    document.head.appendChild(jsonLd);
  }
  jsonLd.text = serializeJsonLd(page.jsonLd);
}
