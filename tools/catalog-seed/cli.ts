/**
 * Catalog seed (ADR-0004): a development tool, run by the maintainer, never by the app.
 *
 *   bun run seed:catalog           extract, curate and regenerate the snapshot (src/data/catalog)
 *   bun run seed:catalog --load    also publish it to Supabase (needs SUPABASE_URL and
 *                                  SUPABASE_SERVICE_ROLE_KEY in the environment, RNF-08)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { manualAdapter } from './adapters/manual';
import { onermV1Adapter } from './adapters/onerm-v1';
import { wgerAdapter } from './adapters/wger';
import { buildExercisesFile, type ExercisesFile } from './export';
import { loadCatalog } from './load';
import { runPipeline, type CurationEntry, type TechniqueEntry } from './pipeline';
import type { ExerciseCandidate } from './types';

const here = __dirname;
const snapshotFile = join(here, '../../src/data/catalog/exercises.json');
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

async function main(): Promise<void> {
  const curation = readJson<CurationEntry[]>(join(here, 'curation.json'));
  const manual = readJson<ExerciseCandidate[]>(join(here, 'manual.json'));
  const techniques = readJson<TechniqueEntry[]>(join(here, 'technique.json'));

  console.log('Extracting from wger…');
  const report = await runPipeline(
    [wgerAdapter(), manualAdapter(manual), onermV1Adapter()],
    curation,
    techniques,
  );

  console.log(
    `${report.exercises.length} curated exercises, ${report.rejected.length} candidates rejected by the mapping.`,
  );
  for (const line of report.possibleDuplicates) console.warn(`Possible duplicate: ${line}`);
  if (report.errors.length > 0) {
    for (const line of report.errors) console.error(`ERROR ${line}`);
    process.exitCode = 1;
    return;
  }

  const previous = readJson<ExercisesFile>(snapshotFile);
  const now = new Date();
  const file = buildExercisesFile(
    report.exercises.map(({ exercise }) => exercise),
    previous,
    now,
  );
  if (file !== previous) writeFileSync(snapshotFile, `${JSON.stringify(file, null, 2)}\n`);
  console.log(
    file === previous
      ? `Snapshot unchanged (version ${file.version}).`
      : `Snapshot written: version ${previous.version} → ${file.version}.`,
  );

  if (!process.argv.includes('--load')) return;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('--load needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
    process.exitCode = 1;
    return;
  }
  // The snapshot module reads the file just written, so it is loaded after the export.
  const { CATALOG_SNAPSHOT } = await import('@/data/catalog/catalog-snapshot');
  const client = createClient(url, key, { auth: { persistSession: false } });
  const result = await loadCatalog(
    client,
    report.exercises,
    CATALOG_SNAPSHOT.templates,
    new Date(),
  );
  console.log('Loaded into Supabase:', JSON.stringify(result));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
