const browser = ['document', 'window', 'location', 'localStorage', 'matchMedia',
  'FormData', 'URL', 'Blob', 'fetch', 'crypto', 'confirm', 'TextDecoder',
  'AbortController', 'setInterval', 'clearInterval', 'setTimeout', 'console', 'structuredClone'];

export default [
  { ignores: ['node_modules/**', 'dist/**'] },
  {
    files: ['src/**/*.js'],
    languageOptions: { globals: Object.fromEntries(browser.map(name => [name, 'readonly'])) },
    rules: { 'no-undef': 'error', 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
];
