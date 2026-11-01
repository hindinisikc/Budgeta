import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Relative base so the build works from any static-host sub-path (HashRouter handles routes).
  base: './',
  plugins: [react(), tailwindcss()],
});
