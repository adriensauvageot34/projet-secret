insert into levels (id, rank_name, min_score, mission_difficulty_max, constraint_difficulty_max, shop_tier_max) values (1,'Bronze',0,1,1,1) on conflict do nothing;
