import { defineConfig } from 'drizzle-kit';

// `bunx drizzle-kit generate` writes the migrations to drizzle/ (ADR-0010). The `expo` driver
// also writes drizzle/migrations.js, which bundles the .sql files into the app.
export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/data/db/schema.ts',
  out: './drizzle',
});
