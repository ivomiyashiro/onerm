import type { EffortMode, ExperienceLevel, LoadUnit } from '@/domain/models/vocabulary';
import type { SuggestionExplanation } from '@/domain/rules/suggestion/explanation';
import type { ExposureSet } from '@/domain/rules/suggestion/exposures';
import type {
  LimitingSide,
  Suggestion,
  SuggestionCode,
  SuggestionReason,
} from '@/domain/rules/suggestion/suggestion';
import { toUnit } from '@/domain/rules/units';
import type { IconName } from '@/presentation/components/icons/icon';
import { TREND_ICONS, trendOf } from '@/presentation/features/home/trend';
import { common } from '@/presentation/strings/common';
import { dayMonth, decimal, estimateText, loadNumber } from '@/presentation/strings/numbers';
import { principles } from '@/presentation/strings/principles';
import { suggestions } from '@/presentation/strings/suggestions';
import { workout as text } from '@/presentation/strings/workout';

export interface ReasonInput {
  readonly explanation: SuggestionExplanation;
  readonly level: ExperienceLevel;
  readonly effortMode: EffortMode;
  readonly unit: LoadUnit;
  /** ESTIMATED_FROM_E1RM: the exercise the estimate comes from; null if not in the catalog. */
  readonly basisName: string | null;
}

/** One row of the data of S10: «La última vez · 60 kg × 12 · 12 · 12». */
export interface WhyFact {
  readonly label: string;
  readonly value: string;
}

export interface WhyDetail {
  readonly title: string;
  readonly body: string;
  readonly facts: readonly WhyFact[];
  /** «En qué nos basamos» (13 §4, §6). */
  readonly principle: { readonly name: string; readonly summary: string };
}

type PrincipleId = keyof typeof suggestions.principleNames;

/** The principle behind each reason (13 §4, decided on 2026-10-13). */
const PRINCIPLES: Record<SuggestionCode, PrincipleId> = {
  CALIBRATION: 'P-10',
  CALIBRATION_STEP: 'P-10',
  CALIBRATION_STEP_DOWN: 'P-10',
  ESTIMATED_FROM_E1RM: 'P-10',
  PRESCRIPTION_CHANGED: 'P-10',
  FROM_EXERCISE_HISTORY: 'P-11',
  INCREASE_LOAD: 'P-11',
  EXTEND_REPS: 'P-11',
  ADD_REP: 'P-11',
  COMPLETE_SETS: 'P-11',
  REPEAT: 'P-11',
  BODYWEIGHT_ADD_REP: 'P-11',
  BODYWEIGHT_READY: 'P-11',
  CONSOLIDATE: 'P-06',
  EARLY_INCREASE: 'P-06',
  HIGH_INCREASE: 'P-06',
  DELOAD: 'P-12',
  REENTRY: 'P-13',
  BODYWEIGHT_CALIBRATION: 'P-05',
};

/** The icon of the reason row: what changes, or «i» for the instruction of a calibration. */
export function reasonIcon(code: SuggestionCode): IconName {
  if (code === 'CALIBRATION' || code === 'BODYWEIGHT_CALIBRATION') return 'info';
  if (code === 'CALIBRATION_STEP') return 'up';
  if (code === 'CALIBRATION_STEP_DOWN') return 'down';
  return TREND_ICONS[trendOf(code)];
}

const isAdvanced = (level: ExperienceLevel) => level !== 'novice';

function formatLoad(kg: number | null, unit: LoadUnit): string {
  if (kg === null) return text.set.noLoad;
  return `${loadNumber(toUnit(kg, unit), unit)} ${common.units[unit]}`;
}

/** The increase against W, rounded: «+4 %». */
const percentOver = (loadKg: number, workingLoadKg: number) =>
  Math.round((loadKg / workingLoadKg - 1) * 100);

/** RF-SUG-07.AC1: the short line under the suggestion, novice or technical (13 §4). */
export function reasonLine(input: ReasonInput): string {
  const { suggestion } = input.explanation;
  const line = lineOf(suggestion, input);
  const reentry = 'withReentry' in suggestion.reason ? suggestion.reason.withReentry : undefined;
  if (reentry === undefined) return line;
  return `${line.replace(/\.$/, '')}${suggestions.withReentry(reentry.gapDays)}`;
}

function lineOf(suggestion: Suggestion, input: ReasonInput): string {
  const { reason } = suggestion;
  const { unit } = input;
  const { repRange, sets } = input.explanation.prescription;
  const advanced = isAdvanced(input.level);
  const load = formatLoad(suggestion.loadKg, unit);
  const r = suggestions.reasons;

  switch (reason.code) {
    case 'CALIBRATION':
      return advanced
        ? r.CALIBRATION.advanced(repRange.min, repRange.max)
        : r.CALIBRATION.novice(repRange.min, repRange.max);
    case 'CALIBRATION_STEP':
      return advanced
        ? r.CALIBRATION_STEP.advanced(reason.repsToFailure, load)
        : r.CALIBRATION_STEP.novice(load);
    case 'CALIBRATION_STEP_DOWN':
      return advanced
        ? r.CALIBRATION_STEP_DOWN.advanced(load)
        : r.CALIBRATION_STEP_DOWN.novice(load);
    case 'ESTIMATED_FROM_E1RM': {
      const date = dayMonth(reason.basis.at);
      return advanced || input.basisName === null
        ? r.ESTIMATED_FROM_E1RM.advanced(estimateText(reason.e1rm.value, unit), date)
        : r.ESTIMATED_FROM_E1RM.novice(input.basisName, date);
    }
    case 'FROM_EXERCISE_HISTORY':
      return advanced
        ? r.FROM_EXERCISE_HISTORY.advanced(formatLoad(reason.workingLoadKg, unit))
        : r.FROM_EXERCISE_HISTORY.novice();
    case 'PRESCRIPTION_CHANGED':
      // Without an e1RM the technical line has nothing to show: the plain one says it all.
      return advanced && reason.e1rm !== null
        ? r.PRESCRIPTION_CHANGED.advanced(estimateText(reason.e1rm.value, unit))
        : r.PRESCRIPTION_CHANGED.novice(repRange.min, repRange.max);
    case 'REENTRY':
      return advanced
        ? r.REENTRY.advanced(reason.gapDays, reason.decreasePercent)
        : r.REENTRY.novice(reason.gapDays);
    case 'DELOAD':
      return advanced ? r.DELOAD.advanced() : r.DELOAD.novice(reason.stagnantExposures);
    case 'CONSOLIDATE':
      return advanced
        ? r.CONSOLIDATE.advanced(decimal(reason.meanRir), input.explanation.prescription.targetRir)
        : r.CONSOLIDATE.novice();
    case 'EARLY_INCREASE':
      return advanced
        ? r.EARLY_INCREASE.advanced(decimal(reason.meanRir))
        : r.EARLY_INCREASE.novice(load);
    case 'HIGH_INCREASE':
      return advanced
        ? r.HIGH_INCREASE.advanced(decimal(reason.meanRir))
        : r.HIGH_INCREASE.novice(load);
    case 'INCREASE_LOAD':
      return advanced
        ? r.INCREASE_LOAD.advanced(reason.increasePercent, load)
        : r.INCREASE_LOAD.novice(sets, repRange.max, load);
    case 'EXTEND_REPS':
      return advanced
        ? r.EXTEND_REPS.advanced(suggestion.reps, reason.increasePercent)
        : r.EXTEND_REPS.novice(suggestion.reps);
    case 'ADD_REP':
      return advanced
        ? r.ADD_REP.advanced(formatLoad(reason.workingLoadKg, unit), suggestion.reps)
        : r.ADD_REP.novice(suggestion.reps);
    case 'COMPLETE_SETS':
      return advanced
        ? r.COMPLETE_SETS.advanced(sets)
        : r.COMPLETE_SETS.novice(sets, load, repRange.max);
    case 'REPEAT':
      return advanced ? r.REPEAT.advanced() : r.REPEAT.novice(load, repRange.min);
    case 'BODYWEIGHT_CALIBRATION':
      return advanced ? r.BODYWEIGHT_CALIBRATION.advanced() : r.BODYWEIGHT_CALIBRATION.novice();
    case 'BODYWEIGHT_ADD_REP':
      return advanced
        ? r.BODYWEIGHT_ADD_REP.advanced(suggestion.reps)
        : r.BODYWEIGHT_ADD_REP.novice(suggestion.reps);
    case 'BODYWEIGHT_READY':
      return advanced ? r.BODYWEIGHT_READY.advanced() : r.BODYWEIGHT_READY.novice();
  }
}

/** The detail of S10 (13 §4, third column). */
function detailOf(suggestion: Suggestion, input: ReasonInput): string {
  const { reason } = suggestion;
  const { unit } = input;
  const { repRange, targetRir } = input.explanation.prescription;
  const r = suggestions.reasons;

  switch (reason.code) {
    case 'CALIBRATION_STEP':
      return r.CALIBRATION_STEP.detail(reason.reps, reason.rir ?? 0);
    case 'ESTIMATED_FROM_E1RM':
      return r.ESTIMATED_FROM_E1RM.detail(
        formatLoad(reason.basis.loadKg, unit),
        reason.basis.reps,
        estimateText(reason.e1rm.value, unit),
        repRange.min,
        targetRir,
        formatLoad(suggestion.loadKg, unit),
      );
    case 'PRESCRIPTION_CHANGED':
      return r.PRESCRIPTION_CHANGED.detail(repRange.min, repRange.max);
    case 'DELOAD':
      return r.DELOAD.detail(
        reason.stagnantExposures,
        `${formatLoad(reason.bestMark.loadKg, unit)} × ${decimal(reason.bestMark.meanReps)}`,
      );
    case 'EARLY_INCREASE':
      return r.EARLY_INCREASE.detail(decimal(reason.meanRir));
    case 'INCREASE_LOAD':
      return reason.afterOvershoot
        ? `${r.INCREASE_LOAD.detail()} ${r.INCREASE_LOAD.bigJump}`
        : r.INCREASE_LOAD.detail();
    case 'EXTEND_REPS':
      return r.EXTEND_REPS.detail(formatLoad(reason.nextLoadKg, unit));
    case 'ADD_REP':
      return r.ADD_REP.detail(reason.previousReps, repRange.max);
    case 'REPEAT':
      return r.REPEAT.detail(repRange.min);
    case 'BODYWEIGHT_ADD_REP':
      return r.BODYWEIGHT_ADD_REP.detail(repRange.max);
    default:
      return r[reason.code].detail();
  }
}

/** RF-SUG-07.AC4: the side a unilateral reason took, when it says so. */
function limitingSideOf(reason: SuggestionReason): LimitingSide | null {
  if ('limitingSide' in reason) return reason.limitingSide;
  if (reason.code === 'ESTIMATED_FROM_E1RM') {
    const { side, reps } = reason.basis;
    return side === null ? null : { side, reps };
  }
  if (reason.code === 'CALIBRATION_STEP' && reason.side !== null) {
    return { side: reason.side, reps: reason.reps };
  }
  return null;
}

/** «60 kg × 12 · 12 · 12», or each load when they differ. */
function lastTimeText(sets: readonly ExposureSet[], unit: LoadUnit): string {
  const loads = new Set(sets.map((set) => set.loadKg));
  if (loads.size === 1) {
    const [load] = loads;
    const reps = sets.map((set) => set.reps).join(' · ');
    return load === null ? `× ${reps}` : `${formatLoad(load, unit)} × ${reps}`;
  }
  return sets.map((set) => `${formatLoad(set.loadKg, unit)} × ${set.reps}`).join(' · ');
}

/** «2 o 3 más» on the simple scale (RN-ENT-03), or «reserva 2». */
function effortText(meanRir: number, mode: EffortMode): string {
  const rir = Math.round(meanRir);
  if (mode === 'rir') return text.effort.rowRir(rir);
  if (rir === 0) return text.effort.row.none;
  if (rir === 1) return text.effort.row.one;
  if (rir <= 3) return text.effort.row.twoOrThree;
  return text.effort.row.fourOrMore;
}

const INCREASES: ReadonlySet<SuggestionCode> = new Set([
  'INCREASE_LOAD',
  'EARLY_INCREASE',
  'HIGH_INCREASE',
]);

/** Reasons that move the reps towards the cap: the advanced S10 shows it. */
const REP_STEPS: ReadonlySet<SuggestionCode> = new Set([
  'ADD_REP',
  'EXTEND_REPS',
  'COMPLETE_SETS',
  'REPEAT',
]);

function factsOf(input: ReasonInput): WhyFact[] {
  const { suggestion, lastTime, meanRir, estimatedMax, prescription } = input.explanation;
  const { reason } = suggestion;
  const { unit } = input;
  const labels = suggestions.why;
  const advanced = isAdvanced(input.level);
  const facts: WhyFact[] = [];

  if (lastTime !== null) {
    facts.push({ label: labels.lastTime, value: lastTimeText(lastTime.sets, unit) });
  }
  if (meanRir !== null) {
    facts.push(
      !advanced
        ? { label: labels.meanEffort, value: effortText(meanRir, input.effortMode) }
        : {
            label:
              input.effortMode === 'rir' ? labels.advanced.meanRir : labels.advanced.meanReserve,
            value: labels.withTarget(decimal(meanRir), prescription.targetRir),
          },
    );
  }
  if (advanced && estimatedMax !== null) {
    facts.push({
      label: labels.advanced.estimatedMax,
      value: formatLoad(estimatedMax.value, unit),
    });
  }
  if (INCREASES.has(reason.code) && 'workingLoadKg' in reason && suggestion.loadKg !== null) {
    const percent = percentOver(suggestion.loadKg, reason.workingLoadKg);
    facts.push({
      label: labels.increase,
      value: labels.increaseValue(percent, formatLoad(suggestion.loadKg, unit)),
    });
  }
  if (!advanced) return facts;
  if (reason.code === 'REENTRY') {
    facts.push({ label: labels.advanced.daysOff, value: String(reason.gapDays) });
    facts.push({
      label: labels.advanced.adjustment,
      value: labels.decreaseValue(reason.decreasePercent),
    });
  }
  if (reason.code === 'DELOAD' && suggestion.loadKg !== null) {
    facts.push({ label: labels.advanced.previousW, value: formatLoad(reason.workingLoadKg, unit) });
    const percent = -percentOver(suggestion.loadKg, reason.workingLoadKg);
    facts.push({ label: labels.advanced.adjustment, value: labels.decreaseValue(percent) });
  }
  if (REP_STEPS.has(reason.code)) {
    facts.push({ label: labels.advanced.rangeCap, value: String(prescription.repRange.max) });
  }
  return facts;
}

/** RF-SUG-07.AC2: S10 «¿Por qué?», novice or with the calculation for intermediate and advanced. */
export function whyDetail(input: ReasonInput): WhyDetail {
  const { suggestion } = input.explanation;
  const { code } = suggestion.reason;
  const detail = detailOf(suggestion, input);
  const side = limitingSideOf(suggestion.reason);
  const body = [
    isAdvanced(input.level) ? lineOf(suggestion, input) : null,
    detail,
    side === null ? null : suggestions.limitingSide(suggestions.sides[side.side], side.reps),
  ]
    .filter((part) => part !== null)
    .join(' ');
  const principle = PRINCIPLES[code];

  return {
    title:
      code === 'CALIBRATION' || code === 'BODYWEIGHT_CALIBRATION'
        ? suggestions.why.calibrationTitle
        : suggestion.loadKg === null
          ? suggestions.why.repsTitle(suggestion.reps)
          : suggestions.why.title(formatLoad(suggestion.loadKg, input.unit), suggestion.reps),
    body,
    facts: factsOf(input),
    principle: { name: suggestions.principleNames[principle], summary: principles[principle] },
  };
}
