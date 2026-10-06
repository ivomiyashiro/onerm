const base = require('./jest.config');

/**
 * Integration tests of the data layer: a real SQLite database (better-sqlite3, in memory) with the
 * app's migrations. Plain Node: better-sqlite3 is a native Node module.
 * @type {import('jest').Config}
 */
module.exports = {
  ...base,
  testEnvironment: 'node',
  testMatch: ['**/*.int.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
};
