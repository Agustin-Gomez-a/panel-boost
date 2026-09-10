import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    sitemap(),
  ],
  site: 'https://pulsepanelboost.com',
  server: {
    port: 4321,
    host: true,
  },
});
