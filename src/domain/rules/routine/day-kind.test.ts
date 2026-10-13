import { dayKind } from '@/domain/rules/routine/day-kind';

describe('dayKind (marca §9: one photo per kind of day)', () => {
  it('only lower-body muscles: a leg day', () => {
    expect(dayKind([['quads', 'glutes'], ['hamstrings'], ['calves']])).toBe('lower');
  });

  it('only upper-body muscles: an upper-body day', () => {
    expect(dayKind([['chest'], ['back'], ['biceps']])).toBe('upper');
  });

  it('both: a full-body day', () => {
    expect(dayKind([['quads'], ['chest']])).toBe('fullBody');
  });

  it('abs alone decide nothing, and an unknown day is full body', () => {
    expect(dayKind([['quads'], ['abs']])).toBe('lower');
    expect(dayKind([])).toBe('fullBody');
  });
});
