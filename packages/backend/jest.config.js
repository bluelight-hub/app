module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  // DB-Integration-Tests erzwingen seriellen Lauf via `--runInBand` in `test:db`.
  // Unit-Tests nutzen den Jest-Default (50% der Cores), damit CI parallel läuft.
  testMatch: [
    '**/domain/**/*.spec.ts',
    '**/infrastructure/**/*.spec.ts',
    '**/infrastructure/**/*.e2e.spec.ts',
    '**/application/**/*.spec.ts',
    '**/common/**/*.spec.ts',
    '**/smoke/**/*.smoke.spec.ts',
    '**/__tests__/**/*.spec.ts',
    '**/__tests__/**/*.e2e.spec.ts',
    '**/modules/**/*.spec.ts',
    '**/modules/**/*.e2e.spec.ts',
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
