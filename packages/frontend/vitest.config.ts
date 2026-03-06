import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    env: {
      // Explicitly set INSECURE_MODE to false for tests
      // Tests that need INSECURE_MODE can override via vi.stubEnv()
      VITE_INSECURE_MODE: 'false',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.config.*', '**/node_modules/**', '**/dist/**', '**/src-tauri/**', '**/.tauri/**', '**/routeTree.gen.ts'],
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'src-tauri', '.tauri'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@bluelight-hub/shared/client': path.resolve(__dirname, '../shared/client'),
    },
  },
});
