import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  unbundle: false,
  // Bundle EVERY dependency (express, ai, zod, ...) into dist/index.mjs.
  // The Databricks App container has no access to npm, so the deployed app
  // must run with plain `node` and no node_modules folder.
  noExternal: [/.*/],
  // Bundled CommonJS packages (e.g. express) call require() for Node
  // built-ins; provide a real require inside the ESM bundle.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
  },
  dts: false,
});
