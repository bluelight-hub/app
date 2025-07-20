module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.ts',
    '!migrations/**/*.ts',
    '!main.ts',
    '!logger/**/*.ts',
    '!**/node_modules/**',
    '!dist/**',
    '!**/test/**',
    '!**/*.spec.ts',
    '!**/*.spec.js',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!jest.setup.ts',
    '!eslint.config.js',
    '!.eslintrc.*',
    '!**/eslint.config.{js,ts,mjs}',
    // DTOs, Interfaces, Entities und Enums (meist nur Typdefinitionen ohne Logik)
    '!**/*.dto.ts',
    '!**/*.interface.ts',
    '!**/*.entity.ts',
    '!**/*.enum.ts',
    // Module-Dateien (nur Dependency Injection)
    '!**/*.module.ts',
    // Prisma generated files
    '!**/prisma/generated/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: ['node_modules/(?!(nanoid)/)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@prisma/generated/prisma/enums$': '<rootDir>/__mocks__/prisma/enums.ts',
    '^@prisma/generated/prisma/client$': '<rootDir>/__mocks__/prisma/client.ts',
    '^@prisma/generated/prisma$': '<rootDir>/__mocks__/prisma/enums.ts',
    '^nanoid$': '<rootDir>/__mocks__/nanoid.ts',
  },
  coverageThreshold: {
    global: {
      branches: 75.5,
      functions: 79,
      lines: 80,
      statements: 80,
    },
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/test/',
    '/__tests__/audit-performance.spec.ts$',
  ],
};
