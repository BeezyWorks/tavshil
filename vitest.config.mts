import path from 'node:path'

import { defineConfig } from 'vitest/config'

/** App-side unit tests: pure TypeScript only (no React Native imports). `core` and `worker` have their own. */
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: { include: ['src/**/*.test.ts'] },
})
