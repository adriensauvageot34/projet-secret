insert into levels (
  level_number,
  label,
  min_score,
  max_score,
  mission_difficulty_max,
  constraint_difficulty_max,
  shop_tier_max,
  fake_elements_unlocked,
  missions_visible_per_difficulty,
  constraints_visible_per_difficulty,
  privilege_text,
  visible_order
)
values
  (
    1,
    'Niveau 1',
    0,
    4,
    1,
    1,
    1,
    false,
    2,
    2,
    'Accès aux missions jusqu’à la difficulté 1. Accès aux contraintes jusqu’à la difficulté 1. Accès à la boutique jusqu’au tier 1. Faux éléments non débloqués. Niveau d’entrée et de découverte du système.',
    1
  ),
  (
    2,
    'Niveau 2',
    5,
    9,
    2,
    2,
    1,
    false,
    2,
    2,
    'Accès aux missions jusqu’à la difficulté 2. Accès aux contraintes jusqu’à la difficulté 2. Accès à la boutique jusqu’au tier 1. Faux éléments non débloqués. Niveau de consolidation et d’ouverture stratégique initiale.',
    2
  ),
  (
    3,
    'Niveau 3',
    10,
    15,
    2,
    2,
    2,
    true,
    2,
    2,
    'Accès aux missions jusqu’à la difficulté 2. Accès aux contraintes jusqu’à la difficulté 2. Accès à la boutique jusqu’au tier 2. Faux éléments débloqués. Premier palier tactique avancé du système.',
    3
  ),
  (
    4,
    'Niveau 4',
    16,
    24,
    3,
    3,
    2,
    true,
    2,
    2,
    'Accès aux missions jusqu’à la difficulté 3. Accès aux contraintes jusqu’à la difficulté 3. Accès à la boutique jusqu’au tier 2. Faux éléments débloqués. Niveau de gameplay avancé et de prise de risque renforcée.',
    4
  ),
  (
    5,
    'Niveau 5',
    25,
    999,
    3,
    3,
    3,
    true,
    2,
    2,
    'Accès aux missions jusqu’à la difficulté 3. Accès aux contraintes jusqu’à la difficulté 3. Accès à la boutique jusqu’au tier 3. Faux éléments débloqués. Niveau de maîtrise complète et d’accès total aux options avancées.',
    5
  )
on conflict (level_number) do update
set
  label = excluded.label,
  min_score = excluded.min_score,
  max_score = excluded.max_score,
  mission_difficulty_max = excluded.mission_difficulty_max,
  constraint_difficulty_max = excluded.constraint_difficulty_max,
  shop_tier_max = excluded.shop_tier_max,
  fake_elements_unlocked = excluded.fake_elements_unlocked,
  missions_visible_per_difficulty = excluded.missions_visible_per_difficulty,
  constraints_visible_per_difficulty = excluded.constraints_visible_per_difficulty,
  privilege_text = excluded.privilege_text,
  visible_order = excluded.visible_order,
  updated_at = timezone('utc', now());

insert into players (
  display_name,
  nickname,
  photo_url,
  notes_profile,
  is_active,
  can_play,
  can_be_gm,
  role_tag
)
values
  ('Manon', null, null, null, true, true, false, null),
  ('Mathilde', null, null, null, true, true, false, null),
  ('Yannick', null, null, null, true, true, false, null),
  ('Esteban', null, null, null, true, true, false, null),
  ('Greg', null, null, null, true, true, false, null),
  ('Alexis', null, null, null, true, true, false, null),
  ('Fanny', null, null, null, true, true, false, null),
  ('Chloé', null, null, null, true, true, false, null),
  ('Cédric', null, null, null, true, true, false, null),
  ('Juliette', null, null, null, true, true, false, null),
  ('Lou', null, null, null, true, true, false, null),
  ('Mec de Lou', null, null, null, true, true, false, null),
  ('Lucas', null, null, null, true, true, false, null),
  ('Florentine', null, null, null, true, true, false, null),
  ('Marina', null, null, null, true, true, false, null),
  ('Laurinne', null, null, null, true, true, false, null),
  ('Andy', null, null, null, true, true, false, null),
  ('Adrien', null, null, null, true, false, true, null)
on conflict (display_name) do update
set
  nickname = excluded.nickname,
  photo_url = excluded.photo_url,
  notes_profile = excluded.notes_profile,
  is_active = excluded.is_active,
  can_play = excluded.can_play,
  can_be_gm = excluded.can_be_gm,
  role_tag = excluded.role_tag;
