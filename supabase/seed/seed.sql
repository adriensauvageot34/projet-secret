insert into levels (id, rank_name, min_score, mission_difficulty_max, constraint_difficulty_max, shop_tier_max) values (1,'Bronze',0,1,1,1) on conflict do nothing;

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
