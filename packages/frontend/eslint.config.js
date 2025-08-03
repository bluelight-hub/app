import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import { tanstackConfig } from '@tanstack/eslint-config';

export default tseslint.config(
  ...tanstackConfig,
  {
    ignores: [
      'dist',
      '../shared/**/*',
      'src-tauri/**/*',
      'vite.config.ts',
      'vitest.config.ts',
      'coverage/**/*',
      'test-results/**/*',
      'playwright-report/**/*',
      'eslint.config.js',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/**/*.{ts,tsx}', 'e2e/**/*.{ts,tsx}', 'playwright.config.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.e2e.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': 'allow-with-description',
          'ts-nocheck': true,
          'ts-check': false,
        },
      ],
      'no-useless-escape': 'warn',
      // Temporarily disable pnpm catalog enforcement for new dependencies
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/components/organisms/mocks/**/*.tsx', '**/*.test.tsx', 'e2e/**/*.{ts,tsx}'],
    rules: {
      'max-lines': [
        'error',
        {
          max: 500,
          skipBlankLines: false,
          skipComments: false,
        },
      ],
      'max-lines-per-function': [
        'warn',
        {
          max: 400,
          skipBlankLines: false,
          skipComments: false,
        },
      ],
    },
  },
  // Add Prettier config at the end to override conflicting rules
  eslintConfigPrettier,
);
