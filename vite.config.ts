/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// On GitHub Pages the site is served from https://<user>.github.io/<repo>/,
// so assets must be requested from that sub-path. Locally we serve from root.
// Override with BASE_PATH when the repo name differs from "magames".
const base = process.env.BASE_PATH ?? (process.env.NODE_ENV === 'production' ? '/magames/' : '/')

export default defineConfig({
  base,
  // Under Vitest, resolve Svelte's browser build so @testing-library/svelte can
  // mount components (Svelte 5 otherwise resolves its server build in jsdom).
  // Guarded by VITEST so the production build is unaffected.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Kaartspellen',
        short_name: 'Kaarten',
        description: 'Rustige, reclamevrije kaartspellen met grote, goed leesbare kaarten.',
        lang: 'nl',
        theme_color: '#0b6b3a',
        background_color: '#0b6b3a',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,mp3,ogg}']
      }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,js}'],
    // Playwright specs live in tests/e2e and must not be picked up by Vitest.
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**']
  }
})
