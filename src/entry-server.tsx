import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { AppContent, AppProviders } from "./App";
import { buildSitemap, renderDocument } from "./seo/prerender";
import { SEO_PAGES } from "./seo/routes";

export function render(pathname: string): string {
  return renderToString(
    <AppProviders>
      <StaticRouter location={pathname}>
        <AppContent trackPageViews={false} />
      </StaticRouter>
    </AppProviders>,
  );
}

export { buildSitemap, renderDocument, SEO_PAGES };
