import { defineConfig } from 'eslint/config';
import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';

// Folder boundaries from docs/FRONTEND.md §14, enforced here so a review does not have to.
// Relative imports only, so package paths such as @angular/core/testing never match.
const relativeInto = (...folders) => ({
  regex: String.raw`^(\.\.?/)+(${folders.join('|')})(/|$)`,
  message: 'This import crosses a folder boundary (docs/FRONTEND.md §14).',
});
const outsideShared = relativeInto('core', 'layout', 'features');
const outsideCore = relativeInto('layout', 'features');
// Components ask services for data; only services and interceptors talk HTTP (CLAUDE.md).
const httpClientImport = {
  name: '@angular/common/http',
  importNames: ['HttpClient'],
  message: 'Only services talk HTTP. Inject a service instead.',
};

export default defineConfig(
  { ignores: ['dist/', '.angular/', 'coverage/'] },
  {
    files: ['**/*.ts'],
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
      'no-nested-ternary': 'error',
      // A decorated class with no members is normal Angular: the decorator carries the meaning.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
    },
  },
  {
    files: ['src/app/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: [httpClientImport], patterns: [outsideShared] }],
    },
  },
  {
    files: ['src/app/core/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [outsideCore] }] },
  },
  {
    files: ['src/app/{features,layout}/**/*.ts'],
    ignores: ['**/*.service.ts', '**/*.spec.ts'],
    rules: { 'no-restricted-imports': ['error', { paths: [httpClientImport] }] },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
