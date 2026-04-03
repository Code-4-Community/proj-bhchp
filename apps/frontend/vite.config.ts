/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import path from 'path';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/frontend',

  server: {
    port: 4200,
    host: 'localhost',
    fs: {
      allow: [path.resolve(__dirname, '../..')],
    },
  },

  preview: {
    port: 4300,
    host: 'localhost',
  },

  plugins: [react(), nxViteTsPaths()],

  // Expose both VITE_ vars and non-prefixed AWS_ vars to the client.
  // The frontend reads `AWS_REGION` directly, while the Cognito app
  // still uses `VITE_COGNITO_*` values.
  envPrefix: ['VITE_', 'AWS_'],

  test: {
    globals: true,
    cache: {
      dir: '../../node_modules/.vitest',
    },
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },

  resolve: {
    alias: {
      '@api': path.resolve(__dirname, './src/api'),
      '@components': path.resolve(__dirname, './src/components'),
      '@containers': path.resolve(__dirname, './src/containers'),
      '@public': path.resolve(__dirname, './public'),
      '@shared': path.resolve(__dirname, '../../shared'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@admin': path.resolve(__dirname, './src/admin'),
    },
  },
});
