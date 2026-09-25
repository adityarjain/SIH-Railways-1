import { defineConfig } from '@playwright/test';

// Starts the real API (fresh temp SQLite) and the Vite dev server, then drives
// Chromium against them. Run: npm run e2e
export default defineConfig({
  testDir: './e2e',
  workers: 1, // one shared API database
  timeout: 45_000,
  use: { baseURL: 'http://localhost:5173', viewport: { width: 1280, height: 860 } },
  webServer: [
    {
      command: '.venv/bin/uvicorn api.app:app --port 8000',
      cwd: '..',
      url: 'http://127.0.0.1:8000/api/health',
      env: { RMO_DB_PATH: '/tmp/rmo-e2e.sqlite3' },
      reuseExistingServer: false,
    },
    { command: 'npm run dev -- --port 5173', url: 'http://localhost:5173', reuseExistingServer: false },
  ],
});
