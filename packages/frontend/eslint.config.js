import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', '../shared/**/*'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ]
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/components/organisms/mocks/**/*.tsx'],
    rules: {
      'max-lines': [
        'error',
        {
          max: 500,
          skipBlankLines: false,
          skipComments: false
        }
      ],
      'max-lines-per-function': [
        'warn',
        {
          max: 400,
          skipBlankLines: false,
          skipComments: false
        }
      ] 
    }
  }
)
