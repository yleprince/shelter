import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works when served from a GitHub Pages project subpath.
  base: './',
  server: {
    // `npm run api` serves the scores API; nginx does the same proxying in Docker.
    proxy: { '/api': 'http://localhost:3000' },
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
});
