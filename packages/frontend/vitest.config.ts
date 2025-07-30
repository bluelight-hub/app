/// <reference types="vitest" />
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/**/*.d.ts',
        'src/**/__snapshots__/**',
        'src/**/mocks/**',
        'src-tauri/**',
        'dist/**',
        'coverage/**',
        '**/node_modules/**',
        'src/**/*.config.{js,ts}',
        'src/**/*.test.{js,ts,jsx,tsx}',
        // ESLint configuration files
        'eslint.config.js',
        '.eslintrc.*',
        '**/eslint.config.{js,ts,mjs}',
        'src/**/*.spec.{js,ts,jsx,tsx}',
        // Type-only files
        'src/utils/types.ts',
        'src/types/**/*.ts',
        'src/**/*.types.ts',
        'src/**/*.d.ts',
        // Asset-only imports
        'src/assets/**',
        // Main entry points that bootstrap the app
        'src/main.tsx',
        'src/App.tsx',
      ],
      thresholds: {
        global: {
          branches: 50,
          functions: 50,
          lines: 50,
          statements: 50,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@atoms': path.resolve(__dirname, './src/components/atoms'),
      '@molecules': path.resolve(__dirname, './src/components/molecules'),
      '@organisms': path.resolve(__dirname, './src/components/organisms'),
      '@templates': path.resolve(__dirname, './src/components/templates'),
      '@pages': path.resolve(__dirname, './src/components/pages'),
    },
  },
});
