import { defineConfig } from 'vitest/config';

export default defineConfig({
  // i18next-icu's ESM build default-imports the CJS intl-messageformat entry, which only
  // works through a bundler. Inlining lets Vite resolve intl-messageformat's "module" field.
  test: { server: { deps: { inline: ['i18next-icu'] } } },
});
