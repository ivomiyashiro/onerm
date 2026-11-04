-- The incline press with a weight stack (#331): a new value in the `machine` vocabulary. A CHECK
-- can't be altered, so it is replaced; the old values stay, which keeps the migration additive.
alter table public.exercises
  drop constraint exercises_machine_check,
  add constraint exercises_machine_check check (machine in (
    'leg-press', 'hack-squat', 'smith', 'leg-extension', 'leg-curl-seated', 'leg-curl-lying',
    'calf-raise-standing', 'calf-raise-seated', 'hip-thrust', 'hip-abduction', 'hip-adduction',
    'chest-press', 'incline-chest-press', 'selectorized-incline-chest-press', 'pec-deck',
    'shoulder-press', 'pullover', 'lat-pulldown', 'seated-row', 'chest-supported-row', 'preacher-curl'
  ));
