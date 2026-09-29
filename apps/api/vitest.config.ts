import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC is needed so decorator metadata (NestJS dependency injection) is emitted in tests.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    globalSetup: process.env.INTEGRATION === '1' ? ['test/global-setup.ts'] : [],
    testTimeout: 30_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
});
