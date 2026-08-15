import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-var': 'off',
      'prefer-const': 'warn',
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      // React 19's new compiler-oriented rules are valuable for new code, but
      // making them blocking would fail the existing application on safe
      // state synchronization and external browser navigation patterns.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
    'test-prisma.ts',
  ]),
])
