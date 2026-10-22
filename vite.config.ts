import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// BASE_PATH lets the same build work on GitHub Pages (/Coffee-Finder/) and at a domain root.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
});
