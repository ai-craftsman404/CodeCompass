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
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 40,  // Lowered for development; will increase as implementations complete
      functions: 40,
      lines: 40,
      statements: 40
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
  verbose: true,
  bail: false,
  errorOnDeprecated: true
};
