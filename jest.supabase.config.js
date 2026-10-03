// Tests against local Supabase: plain Node, without jest-expo (its setup replaces fetch).
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tools/supabase/**/*.supabase.test.ts'],
  transform: { '^.+\\.ts$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
};
