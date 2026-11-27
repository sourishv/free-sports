import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' makes the build work on GitHub Pages (any repo name), Firebase Hosting,
// Netlify, Cloudflare Pages… without changing anything. Routing uses the URL hash.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1200 },
});
