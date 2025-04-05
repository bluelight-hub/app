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
        '!migrate.ts',
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
        '^@/(.*)$': '<rootDir>/$1'
    }
};
