// Unit tests for the app's pure helpers (src/**/*.test.ts). Run through the core package's vitest:
// `pnpm test:app`. A plain object so the root needs no vitest dependency of its own.
import { fileURLToPath } from 'node:url'

export default {
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
}
