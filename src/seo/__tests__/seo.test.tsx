import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { fireEvent, render as renderTestingLibrary, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import SeoHead from "@/components/SeoHead";
import { render } from "@/entry-server";
import { buildSitemap, renderDocument } from "@/seo/prerender";
import { SEO_PAGES } from "@/seo/routes";

const template = `<!doctype html><html lang="en"><head>
  <title>fallback</title>
  <meta name="description" content="fallback" />
  <link rel="canonical" href="https://example.test/" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://example.test/" />
  <meta property="og:title" content="fallback" />
  <meta property="og:description" content="fallback" />
  <meta property="og:image" content="https://example.test/image.png" />
  <meta name="twitter:title" content="fallback" />
  <meta name="twitter:description" content="fallback" />
  <meta name="twitter:image" content="https://example.test/image.png" />
  <script id="route-jsonld" type="application/ld+json">{}</script>
</head><body><div id="root"></div></body></html>`;

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  const original = console.error;
  consoleError = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("Warning: useLayoutEffect does nothing on the server")) return;
    original(...args);
  });
});

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  window.localStorage.clear();
  consoleError.mockRestore();
});

describe("SEO route registry and prerendering", () => {
  it("defines unique metadata for every public route and generates the same sitemap", () => {
    expect(new Set(SEO_PAGES.map((page) => page.path)).size).toBe(SEO_PAGES.length);
    expect(new Set(SEO_PAGES.map((page) => page.title)).size).toBe(SEO_PAGES.length);
    expect(new Set(SEO_PAGES.map((page) => page.description)).size).toBe(SEO_PAGES.length);
    expect(new Set(SEO_PAGES.map((page) => page.canonical)).size).toBe(SEO_PAGES.length);

    const sitemap = new DOMParser().parseFromString(buildSitemap(), "application/xml");
    const locations = [...sitemap.querySelectorAll("loc")].map((node) => node.textContent);
    expect(locations).toEqual(SEO_PAGES.map((page) => page.canonical));
    expect(sitemap.querySelector("parsererror")).toBeNull();
    expect(buildSitemap()).not.toMatch(/<priority>|<changefreq>/);
  });

  it.each(SEO_PAGES)("renders content and route-specific head data for $path", (page) => {
    const html = renderDocument(template, page.path, render(page.path));
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(document.title).toBe(page.title);
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(page.description);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(page.canonical);
    expect(document.querySelector("h1")?.textContent?.trim()).toBeTruthy();
    expect(document.body.textContent?.length).toBeGreaterThan(500);
    const jsonLd = document.querySelector<HTMLScriptElement>("#route-jsonld")?.textContent;
    expect(jsonLd).toBeTruthy();
    expect(() => JSON.parse(jsonLd!)).not.toThrow();

    for (const other of SEO_PAGES.filter((candidate) => candidate.path !== page.path)) {
      expect(document.title).not.toBe(other.title);
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).not.toBe(other.canonical);
    }
  });

  it("renders an unindexable 404 without a canonical URL", () => {
    const html = renderDocument(template, "/missing", render("/missing"));
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex,nofollow");
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.querySelector('meta[property^="og:"], meta[name^="twitter:"]')).toBeNull();
    expect(document.querySelector("#route-jsonld")).toBeNull();
    expect(document.querySelector("h1")?.textContent).toBe("404");
  });
});

describe("client SEO navigation and hydration", () => {
  it("updates the head during SPA navigation", async () => {
    renderTestingLibrary(
      <MemoryRouter initialEntries={["/"]}>
        <SeoHead />
        <Link to="/help">Open help</Link>
        <Routes><Route path="*" element={null} /></Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(document.title).toBe(SEO_PAGES[0].title));
    fireEvent.click(screen.getByRole("link", { name: "Open help" }));
    await waitFor(() => expect(document.title).toBe(SEO_PAGES[2].title));
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(SEO_PAGES[2].canonical);
  });

  it("hydrates a prerendered route without replacing its content", async () => {
    window.history.replaceState({}, "", "/help");
    document.body.innerHTML = `<div id="root">${render("/help")}</div>`;
    const rootElement = document.getElementById("root")!;
    const firstHeading = rootElement.querySelector("h1");
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(rootElement, <App />);
    });
    expect(rootElement.querySelector("h1")).toBe(firstHeading);
    expect(rootElement.querySelector("h1")?.textContent).toContain("Help");
    await act(async () => root!.unmount());
  });
});
