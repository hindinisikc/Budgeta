import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base so the build works from any static-host sub-path (HashRouter handles routes).
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // New versions install in the background and take over on the next app launch,
      // so an update never reloads the page while you're typing an expense.
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Budgeta',
        short_name: 'Budgeta',
        description: 'Personal budget tracker — works offline, data stays on your device.',
        lang: 'en-PH',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#faf6f0',
        theme_color: '#faf6f0',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache the app shell for offline use. Fonts: only the Latin subsets the app actually uses.
        globPatterns: ['**/*.{js,css,html,svg,png}', '**/*latin*.woff2'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
