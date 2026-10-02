import type { APIRoute } from 'astro';
import { locales, paths } from '../data/content';

export const prerender = true;

const pages = ['home', 'calculators', 'privacy', 'cookies'] as const;
const urls = pages.flatMap((page) => locales.map((locale) => {
  const path = page === 'home' ? paths.home(locale) : page === 'calculators' ? paths.calculators(locale) : page === 'privacy' ? paths.privacy(locale) : paths.cookies(locale);
  return { locale, page, loc: `https://giovannimalagninoconsulting.com${path}` };
}));

export const GET: APIRoute = () => {
  const entries = urls.map((url) => {
    const alternates = urls.filter((candidate) => candidate.page === url.page)
      .map((candidate) => `<xhtml:link rel="alternate" hreflang="${candidate.locale}" href="${candidate.loc}"/>`).join('');
    return `<url><loc>${url.loc}</loc>${alternates}<xhtml:link rel="alternate" hreflang="x-default" href="https://giovannimalagninoconsulting.com/fr/"/></url>`;
  }).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
