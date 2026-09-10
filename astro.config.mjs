import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [
    sitemap(),
  ],
  site: 'https://pulsepanelboost.com',
  server: {
    port: 4321,
    host: true,
  },
});