import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  base: '/stock/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // `e2e/**` holds Playwright specs, which must only ever be run by
    // `pnpm e2e`. Without this exclude, vitest collects them too and fails
    // with "Playwright Test did not expect test.describe() to be called
    // here" — every unit test still passes, but `pnpm test` exits non-zero.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
});
