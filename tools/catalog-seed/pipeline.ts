import type { Exercise } from '@/domain/models/exercise';
import {
  EQUIPMENT,
  LOAD_TYPES,
  MACHINES,
  MECHANICS,
  MUSCLES,
  type Equipment,
  type Machine,
  type Muscle,
} from '@/domain/models/vocabulary';

import type { ExerciseCandidate, ExerciseSourceAdapter } from './types';

/**
 * One curated exercise (ADR-0004 §3 «curate»): which source exercise enters the catalog, under
 * which id of ours, and what we override from the source. The id is ours and never changes
 * (RN-CAT-01, RN-CAT-05).
 */
export interface CurationEntry {
  readonly id: string;
  readonly source: string;
  readonly externalId: string;
  readonly slug?: string;
  readonly name?: string;
  readonly aliases?: readonly string[];
  readonly loadType?: Exercise['loadType'];
  readonly primaryMuscles?: readonly Muscle[];
  readonly secondaryMuscles?: readonly Muscle[];
  readonly primaryEquipment?: Equipment;
  readonly equipment?: readonly Equipment[];
  readonly mechanic?: Exercise['mechanic'];
  readonly isUnilateral?: boolean;
  /** The machine to look for (#306): only for exercises done on one. */
  readonly machine?: Machine;
}

/**
 * How a movement is done (#306), written once by the team in `technique.json` and shared by every
 * exercise it lists by slug: the bench press with a barbell or in the Smith machine is done the
 * same way.
 */
export interface TechniqueEntry {
  readonly exercises: readonly string[];
  readonly steps: readonly string[];
  readonly mistakes: readonly string[];
  /** A curated video; without one the app searches YouTube. */
  readonly videoUrl?: string;
}

/** An exercise as the pipeline outputs it, with the sources it came from (for the server). */
export interface SeededExercise {
  readonly exercise: Exercise;
  readonly sourceRefs: readonly { readonly source: string; readonly externalId: string }[];
}

export interface PipelineReport {
  readonly exercises: readonly SeededExercise[];
  /** Candidates a source could not map (reason included). Only the curated ones are errors. */
  readonly rejected: readonly { source: string; externalId: string; reason: string }[];
  /** Curated entries that did not become an exercise, and why. The seed must not go on with any. */
  readonly errors: readonly string[];
  /** Different exercises that look alike: reported for a manual review, never merged. */
  readonly possibleDuplicates: readonly string[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Lowercase, without accents, single spaces. Used for slugs and to compare names. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function slugify(name: string): string {
  return normalizeText(name).replace(/ /g, '-');
}

/** Strict check of the canonical model (06 §3, ADR-0004 §1). Returns the problems found. */
export function validateExercise(exercise: Exercise): string[] {
  const problems: string[] = [];
  const oneOf = (value: string, allowed: readonly string[]) => allowed.includes(value);

  if (!UUID.test(exercise.id)) problems.push('id is not a UUID v4');
  if (!SLUG.test(exercise.slug)) problems.push(`slug "${exercise.slug}" is not a valid slug`);
  if (exercise.name.trim() === '') problems.push('name is empty');
  if (!oneOf(exercise.loadType, LOAD_TYPES)) problems.push(`loadType "${exercise.loadType}"`);
  if (!oneOf(exercise.mechanic, MECHANICS)) problems.push(`mechanic "${exercise.mechanic}"`);
  if (exercise.primaryMuscles.length === 0) problems.push('no primary muscle');
  for (const muscle of [...exercise.primaryMuscles, ...exercise.secondaryMuscles]) {
    if (!oneOf(muscle, MUSCLES)) problems.push(`muscle "${muscle}"`);
  }
  if (!oneOf(exercise.primaryEquipment, EQUIPMENT)) {
    problems.push(`primaryEquipment "${exercise.primaryEquipment}"`);
  }
  for (const item of exercise.equipment) {
    if (!oneOf(item, EQUIPMENT)) problems.push(`equipment "${item}"`);
  }
  if (!exercise.equipment.includes(exercise.primaryEquipment)) {
    problems.push('primaryEquipment is not in equipment');
  }
  if (exercise.machine !== null) {
    if (!oneOf(exercise.machine, MACHINES)) problems.push(`machine "${exercise.machine}"`);
    else if (exercise.primaryEquipment !== 'machine') {
      problems.push(
        `machine "${exercise.machine}" on an exercise whose primaryEquipment is not machine`,
      );
    }
  }
  if (exercise.technique?.steps.length === 0) problems.push('technique without steps');
  if (exercise.videoUrl !== null && !exercise.videoUrl.startsWith('https://')) {
    problems.push(`videoUrl "${exercise.videoUrl}" is not https`);
  }
  return problems;
}

/** Applies the curation over a candidate; null when it still lacks something the model needs. */
function curate(
  entry: CurationEntry,
  candidate: ExerciseCandidate,
  techniques: ReadonlyMap<string, TechniqueEntry>,
): Exercise | string {
  const name = (entry.name ?? candidate.name ?? '').trim().replace(/\s+/g, ' ');
  const primaryEquipment = entry.primaryEquipment ?? candidate.primaryEquipment;
  const mechanic = entry.mechanic ?? candidate.mechanic;
  const isUnilateral = entry.isUnilateral ?? candidate.isUnilateral;
  if (name === '') return 'no Spanish name and no override (R2)';
  if (!primaryEquipment) return 'no primaryEquipment: add it to the curation';
  if (!mechanic) return 'no mechanic: add it to the curation';
  if (isUnilateral === null) return 'no isUnilateral: add it to the curation';
  const slug = entry.slug ?? slugify(name);
  const technique = techniques.get(slug);

  return {
    id: entry.id,
    slug,
    name,
    aliases: [...(entry.aliases ?? candidate.aliases)],
    loadType: entry.loadType ?? candidate.loadType,
    primaryMuscles: [...(entry.primaryMuscles ?? candidate.primaryMuscles)],
    secondaryMuscles: [...(entry.secondaryMuscles ?? candidate.secondaryMuscles)],
    primaryEquipment,
    equipment: [
      ...(entry.equipment ??
        (candidate.equipment.length > 0 ? candidate.equipment : [primaryEquipment])),
    ],
    mechanic,
    isUnilateral,
    technique: technique
      ? { steps: [...technique.steps], mistakes: [...technique.mistakes] }
      : null,
    machine: entry.machine ?? null,
    videoUrl: technique?.videoUrl ?? null,
    attributions: [candidate.attribution],
    deprecatedAt: null,
  };
}

/**
 * extract → map → normalize → validate → curate → dedupe (ADR-0004 §3). `load` and `export` take
 * the result. Only what the curation includes enters the catalog (R3, less noise).
 */
export async function runPipeline(
  adapters: readonly ExerciseSourceAdapter[],
  curation: readonly CurationEntry[],
  techniques: readonly TechniqueEntry[] = [],
): Promise<PipelineReport> {
  const candidates = new Map<string, ExerciseCandidate>();
  const rejected: { source: string; externalId: string; reason: string }[] = [];

  for (const adapter of adapters) {
    for await (const raw of adapter.extract()) {
      const result = adapter.map(raw);
      if (result.ok) {
        candidates.set(
          `${result.candidate.source}:${result.candidate.externalId}`,
          result.candidate,
        );
      } else {
        rejected.push({
          source: adapter.sourceId,
          externalId: result.externalId,
          reason: result.reason,
        });
      }
    }
  }

  const errors: string[] = [];
  const techniqueBySlug = new Map<string, TechniqueEntry>();
  for (const technique of techniques) {
    for (const slug of technique.exercises) {
      if (techniqueBySlug.has(slug)) errors.push(`technique: "${slug}" has two techniques`);
      techniqueBySlug.set(slug, technique);
    }
  }

  const exercises: SeededExercise[] = [];
  const seenEntries = new Set<string>();
  const curatedSlugs = new Set<string>();

  for (const entry of curation) {
    const key = `${entry.source}:${entry.externalId}`;
    const label = `${key} (${entry.id})`;
    if (seenEntries.has(key)) {
      errors.push(`${label}: listed twice in the curation`);
      continue;
    }
    seenEntries.add(key);

    const candidate = candidates.get(key);
    if (!candidate) {
      const why = rejected.find((r) => `${r.source}:${r.externalId}` === key)?.reason;
      errors.push(
        `${label}: ${why ? `rejected by the source: ${why}` : 'not found in the source'}`,
      );
      continue;
    }
    const curated = curate(entry, candidate, techniqueBySlug);
    if (typeof curated === 'string') {
      errors.push(`${label}: ${curated}`);
      continue;
    }
    curatedSlugs.add(curated.slug);
    const problems = validateExercise(curated);
    if (problems.length > 0) {
      errors.push(`${label}: invalid: ${problems.join('; ')}`);
      continue;
    }
    exercises.push({
      exercise: curated,
      sourceRefs: [{ source: entry.source, externalId: entry.externalId }],
    });
  }

  // dedupe: ids and slugs are unique keys on the server, so a clash is an error. Similar names
  // are only reported.
  const byId = new Map<string, string>();
  const bySlug = new Map<string, string>();
  const byName = new Map<string, string>();
  const possibleDuplicates: string[] = [];
  const unique: SeededExercise[] = [];
  for (const seeded of exercises) {
    const { id, slug, name } = seeded.exercise;
    if (byId.has(id) || bySlug.has(slug)) {
      errors.push(`${name} (${id}): id or slug "${slug}" already used by another exercise`);
      continue;
    }
    byId.set(id, name);
    bySlug.set(slug, name);
    const normalized = normalizeText(name);
    const twin = byName.get(normalized);
    if (twin) possibleDuplicates.push(`"${name}" and "${twin}" have the same normalized name`);
    byName.set(normalized, name);
    unique.push(seeded);
  }

  for (const slug of techniqueBySlug.keys()) {
    if (!curatedSlugs.has(slug)) errors.push(`technique: "${slug}" is not in the catalog`);
  }

  return { exercises: unique, rejected, errors, possibleDuplicates };
}
