import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works when served from a GitHub Pages project subpath.
  base: './',
  build: {
    chunkSizeWarningLimit: 1600,
  },
});
