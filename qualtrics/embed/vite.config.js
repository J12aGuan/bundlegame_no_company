// Bundles the REAL Svelte components into one self-contained IIFE for Qualtrics.
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';

export default defineConfig({
  plugins: [svelte({ compilerOptions: { dev: false } })],
  resolve: { alias: { $lib: path.resolve('src/lib'), $app: path.resolve('qualtrics/embed/app-shim') } },
  build: {
    lib: { entry: path.resolve('qualtrics/embed/entry.js'), name: 'BundleGameReal', formats: ['iife'], fileName: () => 'real.js' },
    outDir: path.resolve('qualtrics/embed/dist'),
    emptyOutDir: true,
    minify: 'esbuild',
    rollupOptions: { output: { inlineDynamicImports: true } }
  }
});
