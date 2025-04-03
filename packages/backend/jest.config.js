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
        'src/**/*.ts',
        '!src/migrations/**/*.ts',
        '!src/main.ts',
        '!src/migrate.ts',
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