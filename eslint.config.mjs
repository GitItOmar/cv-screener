import js from '@eslint/js';
import { includeIgnoreFile } from '@eslint/compat';
import eslintConfigPrettier from 'eslint-config-prettier';
import path from 'node:path';

const gitignorePath = path.resolve('.', '.gitignore');

export default [
  // Ignore .gitignore files/folder in eslint
  includeIgnoreFile(gitignorePath),
  // Base JavaScript config
  js.configs.recommended,
  // Next.js configuration
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    plugins: {
      '@next/next': (await import('@next/eslint-plugin-next')).default,
    },
    rules: {
      '@next/next/no-html-link-for-pages': 'warn',
      '@next/next/no-img-element': 'warn',
    },
  },
  // React and JSX configuration
  {
    files: ['**/*.jsx', '**/*.tsx'],
    plugins: {
      react: (await import('eslint-plugin-react')).default,
      'react-hooks': (await import('eslint-plugin-react-hooks')).default,
      'jsx-a11y': (await import('eslint-plugin-jsx-a11y')).default,
    },
    rules: {
      // React rules
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/function-component-definition': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react/no-array-index-key': 'warn',
      'react/no-unstable-nested-components': 'warn',
      'react/self-closing-comp': 'warn',
      'react/button-has-type': 'warn',
      'react/no-unknown-property': 'warn',

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // JSX Accessibility rules
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/anchor-has-content': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/aria-proptypes': 'warn',
      'jsx-a11y/aria-unsupported-elements': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/role-supports-aria-props': 'warn',
    },
  },
  // Import rules configuration
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    plugins: {
      'import-x': (await import('eslint-plugin-import-x')).default,
    },
    rules: {
      // Import rules - disabled to avoid resolver issues with aliases
      'import-x/extensions': 'off', // Don't require file extensions
      'import-x/no-unresolved': 'off', // Don't warn about unresolved paths (alias imports)
      'import-x/namespace': 'off', // Turn off namespace warnings
      'import-x/no-rename-default': 'off', // Allow default import renaming
      'import-x/prefer-default-export': 'off', // Allow named exports without defaults
      'import-x/order': 'off', // Turn off import ordering to avoid alias issues
    },
  },
  // Global config for all files
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Node.js globals for API routes
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        // Web API globals
        Response: 'readonly',
        Request: 'readonly',
        File: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        TextDecoder: 'readonly',
        TextEncoder: 'readonly',
        fetch: 'readonly',
        // Next.js specific globals
        __dirname: 'readonly',
        __filename: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Console statements - warn instead of error for development
      'no-console': 'warn',

      // Function hoisting - allow it for cleaner code organization
      'no-use-before-define': ['error', { functions: false }],

      // Object shorthand - warn instead of error
      'object-shorthand': 'warn',

      // Default case - warn instead of error
      'default-case': 'warn',

      'no-unused-vars': 'error',

      // General rules
      'no-nested-ternary': 'warn',
      'no-continue': 'warn',
      'no-restricted-syntax': 'warn',

      // Airbnb-style rules
      'prefer-const': 'error',
      'no-var': 'error',
      'prefer-arrow-callback': 'warn',
      'arrow-spacing': 'warn',
      'prefer-template': 'warn',
      'template-curly-spacing': 'warn',
      'no-useless-escape': 'error',
      'no-dupe-keys': 'error',
      'no-control-regex': 'error',
      'no-useless-catch': 'error',
    },
  },
  // Prettier integration - disable conflicting rules
  eslintConfigPrettier,
];
