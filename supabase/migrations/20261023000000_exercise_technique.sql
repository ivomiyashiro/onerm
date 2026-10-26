-- How each exercise is done (#306, RF-CAT-02): steps and common mistakes, the machine to look for
-- and a curated video. They replace `description`, which stays because migrations are additive.
alter table public.exercises
  add column technique jsonb,
  add column machine text check (machine in (
    'leg-press', 'hack-squat', 'smith', 'leg-extension', 'leg-curl-seated', 'leg-curl-lying',
    'calf-raise-standing', 'calf-raise-seated', 'hip-thrust', 'hip-abduction', 'hip-adduction',
    'chest-press', 'incline-chest-press', 'pec-deck', 'shoulder-press', 'pullover', 'lat-pulldown', 'seated-row',
    'chest-supported-row', 'preacher-curl'
  )),
  add column video_url text check (video_url like 'https://%');
