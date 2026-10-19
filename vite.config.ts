import { defineConfig } from 'vite';

export default defineConfig({
  // relative asset paths: the build runs from any folder (itch.io iframe, GitHub Pages, Vercel)
  base: './',
  server: { port: 5173, strictPort: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 4000 },
});
