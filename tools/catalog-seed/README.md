# Catalog seed (ADR-0004)

A development tool for the maintainer. It never runs in the app.

```bash
bun run seed:catalog          # extract from wger, curate and regenerate src/data/catalog/exercises.json
bun run seed:catalog --load   # also publish the catalog to Supabase
```

To publish to the cloud project without typing the keys each time, put them in `.seed.local`
(ignored by git, and **not** in `.env.local`: `bun run` loads that one into every script, and the
Supabase tests would then run against the cloud) and run `bun run seed:catalog:cloud`:

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<the service_role key>
```

`--load` needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the environment (RNF-08): the
`service_role` key only lives on the maintainer's machine, never in the repo or the app.

Pipeline: `extract → map → normalize → validate → curate → dedupe → load → export`.

- `adapters/` one adapter per source (`wger`, `manual`). A taxonomy value without a mapping rejects
  the exercise with a reason; nothing is dropped silently.
- `curation.json` lists what enters the catalog and what we override from the source. The `id` is
  ours and never changes (RN-CAT-01). To add an exercise, add an entry (find the wger id in
  `https://wger.de/api/v2/exerciseinfo/?language=4`), run the seed and commit the new snapshot.
- `manual.json` holds our own exercises (source `manual`), with no API.
- The seed fails (exit code 1) if a curated exercise can't be built; it never half-publishes.
- Running it twice changes nothing: the snapshot version only goes up when the content changes, and
  `--load` only writes the rows that differ, so the apps don't pull what didn't change.
- An exercise removed from the curation is marked as deprecated on the server, never deleted.

wger's data is CC-BY-SA / CC0: each exercise keeps its license and author in `attributions`, which
the credits screen shows (R1).
