module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  // Limit parallelism to prevent DB connection pool exhaustion
  maxWorkers: 1, // Serial execution for DB-heavy integration tests
  testMatch: [
    '**/domain/**/*.spec.ts',
    '**/infrastructure/**/*.spec.ts',
    '**/infrastructure/**/*.e2e.spec.ts',
    '**/application/**/*.spec.ts',
    '**/common/**/*.spec.ts',
    '**/smoke/**/*.smoke.spec.ts',
    '**/__tests__/**/*.spec.ts',
  ],
  testPathIgnorePatterns: ['/node_modules/'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            decorators: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
          },
          target: 'es2021',
        },
      },
    ],
  },
  transformIgnorePatterns: [],
  // Disable Babel coverage plugin - use SWC instead
  coverageProvider: 'v8',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
  },
  collectCoverageFrom: ['src/domain/**/*.ts', '!src/domain/**/*.spec.ts'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '\\.example\\.ts$', // Example files - not production code
  ],
  coverageThreshold: {
    global: {
      branches: 79,
      functions: 79,
      lines: 79,
      statements: 79,
    },
  },
};
