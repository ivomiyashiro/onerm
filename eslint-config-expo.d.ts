// eslint-config-expo ships no types: its flat config is a list of ESLint configs.
declare module 'eslint-config-expo/flat' {
  import type { Linter } from 'eslint';

  const config: Linter.Config[];
  export default config;
}
