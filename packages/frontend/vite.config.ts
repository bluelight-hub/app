import tailwindcss from '@tailwindcss/vite';
import tanstackRouter from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import * as process from 'node:process';
import { defineConfig, loadEnv } from 'vite';

// .env laden bevor die Config ausgewertet wird (für VITE_PORT, VITE_API_URL etc.)
Object.assign(process.env, loadEnv('development', process.cwd(), ['VITE_', 'TAURI_']));

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const host = process.env.TAURI_DEV_HOST;

// Check for certificates
const certPath = path.resolve(__dirname, '../../certs/localhost.pem');
const keyPath = path.resolve(__dirname, '../../certs/localhost-key.pem');
const useHttps = existsSync(certPath) && existsSync(keyPath);

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routeFileIgnorePattern: '.(test|spec).(ts|tsx)$',
    }),
    tailwindcss(),
    react(),
  ],
  clearScreen: false,
  server: {
    strictPort: true,
    host: host || true,
    allowedHosts: true, // allow access from all hosts
    port: parseInt(process.env.VITE_PORT || '3090', 10),
    https: useHttps
      ? {
          key: readFileSync(keyPath),
          cert: readFileSync(certPath),
        }
      : undefined,
    proxy: {
      '/uploads': {
        target: process.env.VITE_API_URL || (useHttps ? 'https://localhost:3091' : 'http://localhost:3091'),
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: process.env.VITE_API_URL || (useHttps ? 'https://localhost:3091' : 'http://localhost:3091'),
        changeOrigin: true,
        secure: false,
      },
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari16',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@atoms': path.resolve(__dirname, './src/components/atoms'),
      '@molecules': path.resolve(__dirname, './src/components/molecules'),
      '@organisms': path.resolve(__dirname, './src/components/organisms'),
      '@templates': path.resolve(__dirname, './src/components/templates'),
      '@pages': path.resolve(__dirname, './src/components/pages'),
      '@bluelight-hub/shared/client': path.resolve(__dirname, '../shared/client'),
    },
  },
});
