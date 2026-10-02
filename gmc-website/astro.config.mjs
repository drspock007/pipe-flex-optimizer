import { defineConfig, fontProviders } from 'astro/config';

export default defineConfig({
  site: 'https://giovannimalagninoconsulting.com',
  fonts: [
    {
      name: 'Habibi',
      cssVariable: '--font-heading',
      provider: fontProviders.google(),
      weights: [400],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      name: 'Roboto',
      cssVariable: '--font-body',
      provider: fontProviders.google(),
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['Arial', 'sans-serif'],
    },
  ],
});
