import { defineConfig } from 'vite';

export default defineConfig({
  // Configure relative paths so it loads correctly on GitHub Pages under a subfolder
  base: './',
  build: {
    outDir: 'dist',
  },
});
