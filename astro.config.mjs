import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  site: 'https://bykamo.dev',
  output: 'static',
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
