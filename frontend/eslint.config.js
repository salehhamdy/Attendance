import js from '@eslint/js';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['dist'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.browser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { react, 'react-hooks': hooks },
    settings: { react: { version: 'detect' } },
    rules: { ...hooks.configs.recommended.rules, 'react/jsx-uses-vars': 'error', 'react/jsx-uses-react': 'error' },
  },
];

