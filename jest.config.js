export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/tests/**',
    '!src/**/*.d.ts',
    '!src/conflict-resolver.ts'  // Re-export shim; underlying modules have full coverage
  ],
  coverageThreshold: {
    global: {
      branches: 82,
      functions: 88,
      lines: 88,
      statements: 88
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
  verbose: true,
  bail: false,
  errorOnDeprecated: true
};
