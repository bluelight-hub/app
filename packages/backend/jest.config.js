module.exports = {
    moduleFileExtensions: [
        'js',
        'json',
        'ts'
    ],
    rootDir: 'src',
    testRegex: '.*\\.spec\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest'
    },
    collectCoverageFrom: [
        '**/*.ts',
        '!migrations/**/*.ts',
        '!main.ts',
        '!logger/**/*.ts',
        '!**/node_modules/**',
        '!dist/**',
        '!**/test/**',
    ],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
    setupFilesAfterEnv: [
        '<rootDir>/jest.setup.ts'
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@prisma/generated/prisma/enums$': '<rootDir>/__mocks__/prisma/enums.ts',
        '^@prisma/generated/prisma/client$': '<rootDir>/__mocks__/prisma/client.ts',
        '^@prisma/generated/prisma$': '<rootDir>/__mocks__/prisma/enums.ts'
    },
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    }
};
