import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/** Shared ESLint config for every Next.js app in the workspace. */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Restate eslint-config-next's default ignores, which a flat config drops.
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
