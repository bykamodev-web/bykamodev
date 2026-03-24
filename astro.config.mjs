import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import cloudflare from '@astrojs/cloudflare'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  site: 'https://bykamo.dev',
  output: 'static',
  adapter: cloudflare(),
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/preview/'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    format: 'directory',
    inlineStylesheets: 'always',
  },
  trailingSlash: 'never',
})
