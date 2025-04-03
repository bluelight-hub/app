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
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@atoms': path.resolve(__dirname, './src/components/atoms'),
            '@molecules': path.resolve(__dirname, './src/components/molecules'),
            '@organisms': path.resolve(__dirname, './src/components/organisms'),
            '@templates': path.resolve(__dirname, './src/components/templates'),
            '@pages': path.resolve(__dirname, './src/components/pages')
        }
    }
}); 