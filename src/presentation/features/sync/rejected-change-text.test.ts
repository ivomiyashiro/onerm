import type { RejectedChange } from '@/domain/models/rejected-change';
import {
  rejectedChangeBody,
  rejectedChangeLabel,
} from '@/presentation/features/sync/rejected-change-text';

const change = (overrides: Partial<RejectedChange>): RejectedChange => ({
  kind: 'routine',
  id: 'r1',
  reason: '23514',
  name: 'Fuerza',
  uploadedBefore: false,
  dependents: 0,
  ...overrides,
});

describe('rejected change texts (RF-SYNC-06.AC4, 13-textos)', () => {
  it('names the record, with its name when it has one', () => {
    expect(rejectedChangeLabel(change({}))).toBe('Rutina «Fuerza»');
    expect(rejectedChangeLabel(change({ kind: 'workoutSet', name: null }))).toBe(
      'Una serie de un entrenamiento',
    );
  });

  it('D12: the reason and what discarding does, by whether it was uploaded', () => {
    expect(rejectedChangeBody(change({ dependents: 3 }))).toBe(
      'Algún dato está fuera de los valores que acepta el servidor. Si lo descartás, se borra junto con 3 registros que dependen de él.',
    );
    expect(rejectedChangeBody(change({ reason: '42501', uploadedBefore: true }))).toBe(
      'El servidor no permite este cambio. Si lo descartás, vuelve a la versión guardada.',
    );
  });
});
