import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);

    const notFoundTitle = "Page Not Found (404) — Pipe Lowering";
    const notFoundDesc = "The page you are looking for does not exist. Return to the Pipe Lowering stress analysis tool home page.";
    const pageUrl = `https://pipe-lowering.giovannimalagninoconsulting.com${location.pathname}`;

    const prevTitle = document.title;
    document.title = notFoundTitle;

    const getMeta = (selector: string) => document.querySelector(selector);
    const setMeta = (selector: string, value: string) => {
      const el = getMeta(selector);
      if (el) el.setAttribute("content", value);
    };
    const prev = {
      desc: getMeta('meta[name="description"]')?.getAttribute("content") ?? null,
      ogTitle: getMeta('meta[property="og:title"]')?.getAttribute("content") ?? null,
      ogDesc: getMeta('meta[property="og:description"]')?.getAttribute("content") ?? null,
      ogUrl: getMeta('meta[property="og:url"]')?.getAttribute("content") ?? null,
      twTitle: getMeta('meta[name="twitter:title"]')?.getAttribute("content") ?? null,
      twDesc: getMeta('meta[name="twitter:description"]')?.getAttribute("content") ?? null,
    };
    setMeta('meta[name="description"]', notFoundDesc);
    setMeta('meta[property="og:title"]', notFoundTitle);
    setMeta('meta[property="og:description"]', notFoundDesc);
    setMeta('meta[property="og:url"]', pageUrl);
    setMeta('meta[name="twitter:title"]', notFoundTitle);
    setMeta('meta[name="twitter:description"]', notFoundDesc);

    const canonical = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonical?.getAttribute("href") ?? null;
    if (canonical) canonical.setAttribute("href", pageUrl);

    return () => {
      document.title = prevTitle;
      if (prev.desc !== null) setMeta('meta[name="description"]', prev.desc);
      if (prev.ogTitle !== null) setMeta('meta[property="og:title"]', prev.ogTitle);
      if (prev.ogDesc !== null) setMeta('meta[property="og:description"]', prev.ogDesc);
      if (prev.ogUrl !== null) setMeta('meta[property="og:url"]', prev.ogUrl);
      if (prev.twTitle !== null) setMeta('meta[name="twitter:title"]', prev.twTitle);
      if (prev.twDesc !== null) setMeta('meta[name="twitter:description"]', prev.twDesc);
      if (canonical && prevCanonical !== null) canonical.setAttribute("href", prevCanonical);
    };
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
