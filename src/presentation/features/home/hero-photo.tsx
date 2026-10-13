import type { DayKind } from '@/domain/rules/routine/day-kind';
import {
  VeiledPhoto,
  type PhotoName,
  type Veil,
} from '@/presentation/components/photo/veiled-photo';

/** marca §9: one photo per kind of day. */
const PHOTOS: Record<DayKind, PhotoName> = { lower: 'deadlift', upper: 'grip', fullBody: 'rack' };

/** Figma HeroCard «Velo»: 15 % of the background at the top, ≥ 65 % from 30 % down (marca §9). */
const VEIL: Veil = [
  { offset: 0, opacity: 0.15 },
  { offset: 0.3, opacity: 0.65 },
  { offset: 0.6, opacity: 0.85 },
  { offset: 1, opacity: 0.97 },
];

/** The background of the «Hoy toca» card: the photo of its kind of day. */
export function HeroPhoto({ kind }: { kind: DayKind }) {
  return <VeiledPhoto photo={PHOTOS[kind]} veil={VEIL} />;
}
