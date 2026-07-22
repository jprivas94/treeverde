import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', '.prisma/**'] },

  {
    files: ['**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      // Dead code detection
      'no-unused-vars': ['warn', {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: true,
        caughtErrors: 'none',
      }],
      'no-unreachable': 'error',
      'no-constant-condition': 'warn',
      'no-irregular-whitespace': 'error',

      // Node.js best practices
      'no-console': 'off',
      'require-atomic-updates': 'off',
    },
  },
];
