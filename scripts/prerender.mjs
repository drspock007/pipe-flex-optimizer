import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const workspace = process.cwd();
const distDirectory = resolve(workspace, "dist");
const serverEntry = resolve(workspace, "dist-ssr/entry-server.js");
const { buildSitemap, render, renderDocument, SEO_PAGES } = await import(serverEntry);
const template = await readFile(resolve(distDirectory, "index.html"), "utf8");

for (const page of SEO_PAGES) {
  const outputDirectory = page.path === "/" ? distDirectory : resolve(distDirectory, page.path.slice(1));
  await mkdir(outputDirectory, { recursive: true });
  const html = renderDocument(template, page.path, render(page.path));
  await writeFile(resolve(outputDirectory, "index.html"), html);
}

const notFoundHtml = renderDocument(template, "/404", render("/404"));
await writeFile(resolve(distDirectory, "404.html"), notFoundHtml);
await writeFile(resolve(distDirectory, "sitemap.xml"), buildSitemap());
await rm(resolve(workspace, "dist-ssr"), { recursive: true, force: true });
