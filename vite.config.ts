import { defineConfig, configDefaults } from 'vitest/config';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/aptechhn-n5/',
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: /^npm:(.*)$/, replacement: '$1' },
    ],
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000/',
      },
    },
    setupFiles: ['src/test/setup.ts'],
    globals: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'supabase/functions/**/*.{test,spec}.ts'],
    exclude: [...configDefaults.exclude, '**/.worktrees/**'],
  },
});
