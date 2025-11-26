import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base path for GitHub Pages - update 'black_rabbit' to match your repo name
  base: process.env.GITHUB_ACTIONS ? '/black_rabbit/' : '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    allowedHosts: ['hulk.local'],
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
});
