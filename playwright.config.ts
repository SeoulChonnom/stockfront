import { defineConfig, devices } from '@playwright/test';

/** Same-origin preview and API mocks avoid CORS and real backend dependencies. */
const PORT = 4173;
const HOST = `http://127.0.0.1:${PORT}`;
const BASE_URL = `${HOST}/stock/`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Keep local timing races visible; CI gets one retry for infrastructure noise.
  retries: process.env.CI ? 1 : 0,
  // Bound Chromium concurrency on shared development machines.
  workers: 2,
  reporter: 'list',
  timeout: 45_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Bind the probe and server to the same IPv4 host. Invoke Vite directly
    // because the package script forwards a literal `--` and drops later flags.
    command: `pnpm build && pnpm exec vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      VITE_API_HOST: HOST,
      VITE_APP_ENV: 'development',
    },
  },
});
