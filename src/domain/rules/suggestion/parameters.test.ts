import { SUGGESTION_PARAMETERS } from '@/domain/rules/suggestion/parameters';

describe('RN-SUG-00 · parameters', () => {
  it('match the table of the specification', () => {
    expect(SUGGESTION_PARAMETERS).toEqual({
      LOAD_INCREASE: 0.05,
      LOAD_INCREASE_HIGH: 0.1,
      MAX_JUMP_WITHOUT_OVERSHOOT: 0.1,
      REP_OVERSHOOT: 2,
      DELOAD: 0.1,
      STAGNATION_THRESHOLD: 3,
      SUSTAINED_SIGNAL: 2,
      EFFORT_DEVIATION: 2,
      SIMPLE_SCALE_MAX_RIR: 4,
      MAX_CONSECUTIVE_CONSOLIDATIONS: 1,
      REENTRY_1: { gapDays: 21, decrease: 0.1 },
      REENTRY_2: { gapDays: 42, decrease: 0.2 },
      E1RM_STANDARD_MAX: 10,
      E1RM_MAX: 15,
      CALIBRATION_STEP_UP: 0.2,
      CALIBRATION_STEP_DOWN: 0.2,
    });
  });
});
