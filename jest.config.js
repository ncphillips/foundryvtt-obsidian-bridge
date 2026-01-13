export default {
    testEnvironment: 'node',
    transform: {},
    setupFilesAfterEnv: ['./jest.setup.js'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^(\\.{1,2}/.*)module\\.json$': '<rootDir>/__mocks__/module.json.js',
    },
    testMatch: [
        '**/*.test.js'
    ],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js',
        '!src/main.js',
        '!src/domain/**',
        '!src/infrastructure/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
};
