import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  // Ignorar dist y node_modules
  { ignores: ['dist/**', 'node_modules/**'] },

  // playwright.config.js es Node (usa process.env) aunque el resto del
  // proyecto sea browser: exponer los globals de Node solo ahí.
  {
    files: ['playwright.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Configuración base
  {
    files: ['**/*.{js,jsx}'],
    ...js.configs.recommended,
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // Restaurar las reglas recomendadas de @eslint/js (el spread
      // `...js.configs.recommended` se pisaba con este bloque `rules`:
      // la propiedad `rules` local ganaba y se perdían ~51 reglas,
      // incluida `no-undef` (¡por eso `logout` indefinido no disparaba!).
      ...js.configs.recommended.rules,

      // React
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/prop-types': 'off',

      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Generales - detectar código muerto
      'no-unused-vars': ['warn', {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: true,
        caughtErrors: 'none',
      }],
      'no-unreachable': 'error',
      'no-constant-condition': 'warn',
      'no-irregular-whitespace': 'error',

      // Consistencia
      'no-console': 'off',
    },
  },
];
