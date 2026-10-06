/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/tools/jest/svg-mock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Integration tests (*.int.test.ts) run with `bun run test:int` (jest.int.config.js).
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '\\.int\\.test\\.ts$'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}', '!**/*.test.{ts,tsx}'],
};
