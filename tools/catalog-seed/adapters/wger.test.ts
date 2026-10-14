import { mapWgerExercise, wgerAdapter } from './wger';

const license = {
  short_name: 'CC-BY-SA 4',
  url: 'https://creativecommons.org/licenses/by-sa/4.0/',
};

function exercise(overrides: Record<string, unknown> = {}) {
  return {
    id: 371,
    muscles: [{ id: 10, name: 'Quadriceps femoris' }],
    muscles_secondary: [{ id: 8, name: 'Gluteus maximus' }],
    equipment: [],
    translations: [
      { language: 2, name: 'Leg Press', description: '<p>Push.</p>' },
      { language: 4, name: 'Prensa de piernas', description: '<p>Empujá <b>fuerte</b>.</p>' },
    ],
    license,
    license_author: 'someone',
    ...overrides,
  };
}

describe('wger adapter: map (ADR-0004 §3)', () => {
  it('maps muscles, the Spanish name and the English one as an alias', () => {
    const result = mapWgerExercise(exercise());
    expect(result).toMatchObject({
      ok: true,
      candidate: {
        source: 'wger',
        externalId: '371',
        name: 'Prensa de piernas',
        aliases: ['Leg Press'],
        primaryMuscles: ['quads'],
        secondaryMuscles: ['glutes'],
        description: 'Empujá fuerte .',
      },
    });
  });

  it('leaves out what wger cannot know: mechanic, laterality and machine equipment', () => {
    const result = mapWgerExercise(exercise());
    expect(result).toMatchObject({
      ok: true,
      candidate: { mechanic: null, isUnilateral: null, primaryEquipment: null, equipment: [] },
    });
  });

  it('maps the equipment, ignores the furniture and takes bodyweight as such', () => {
    const dumbbell = mapWgerExercise(
      exercise({ equipment: [{ name: 'Dumbbell' }, { name: 'Bench' }] }),
    );
    expect(dumbbell).toMatchObject({
      ok: true,
      candidate: { primaryEquipment: 'dumbbell', equipment: ['dumbbell'], loadType: 'external' },
    });
    const bodyweight = mapWgerExercise(
      exercise({ equipment: [{ name: 'none (bodyweight exercise)' }] }),
    );
    expect(bodyweight).toMatchObject({ ok: true, candidate: { loadType: 'bodyweight' } });
  });

  it('rejects, with a reason, a muscle without a mapping', () => {
    const result = mapWgerExercise(exercise({ muscles: [{ id: 3, name: 'Serratus anterior' }] }));
    expect(result).toEqual({
      ok: false,
      externalId: '371',
      reason: 'unmapped muscle "Serratus anterior" (id 3)',
    });
  });

  it('rejects, with a reason, equipment without a mapping', () => {
    const result = mapWgerExercise(exercise({ equipment: [{ name: 'Swiss Ball' }] }));
    expect(result).toEqual({
      ok: false,
      externalId: '371',
      reason: 'unmapped equipment "Swiss Ball"',
    });
  });

  it('has no name when there is no Spanish translation (R2)', () => {
    const result = mapWgerExercise(
      exercise({ translations: [{ language: 2, name: 'Leg Press' }] }),
    );
    expect(result).toMatchObject({ ok: true, candidate: { name: null } });
  });

  it('attributes the license and the author, never an email (R1)', () => {
    const named = mapWgerExercise(exercise());
    expect(named).toMatchObject({
      candidate: {
        attribution: {
          source: 'wger',
          license: 'CC-BY-SA 4',
          attribution: expect.stringContaining('someone'),
        },
      },
    });
    const emailed = mapWgerExercise(exercise({ license_author: 'a@b.com' }));
    expect(JSON.stringify(emailed)).not.toContain('a@b.com');
  });
});

describe('wger adapter: descriptions', () => {
  it('decodes the HTML entities of the description', () => {
    const result = mapWgerExercise(
      exercise({
        translations: [
          { language: 4, name: 'X', description: '<p>Pecho &amp; hombros&nbsp;hoy</p>' },
        ],
      }),
    );
    expect(result).toMatchObject({ candidate: { description: 'Pecho & hombros hoy' } });
  });
});

describe('wger adapter: extract', () => {
  it('follows the pagination until there is no next page', async () => {
    const pages = [
      { next: 'https://wger.de/page2', results: [{ id: 1 }, { id: 2 }] },
      { next: null, results: [{ id: 3 }] },
    ];
    const fetchFn = jest.fn(async () => ({ ok: true, json: async () => pages.shift() }));
    const seen: unknown[] = [];
    for await (const raw of wgerAdapter(fetchFn as unknown as typeof fetch).extract()) {
      seen.push(raw);
    }
    expect(seen).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('refuses a next page on another host', async () => {
    const fetchFn = jest.fn(async () => ({
      ok: true,
      json: async () => ({ next: 'https://evil.example/page2', results: [] }),
    }));
    const extract = wgerAdapter(fetchFn as unknown as typeof fetch).extract();
    await expect(extract[Symbol.asyncIterator]().next()).rejects.toThrow('another host');
  });

  it('fails loudly when the API answers an error', async () => {
    const fetchFn = jest.fn(async () => ({ ok: false, status: 503 }));
    const extract = wgerAdapter(fetchFn as unknown as typeof fetch).extract();
    await expect(extract[Symbol.asyncIterator]().next()).rejects.toThrow('503');
  });
});
