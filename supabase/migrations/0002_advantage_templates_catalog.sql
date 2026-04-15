alter table advantage_instances
rename column template_id to advantage_template_id;

alter table advantage_templates
rename column title to name;

alter table advantage_templates
rename column description to description_player;

alter table advantage_templates
rename column price_tokens to cost_tokens;

alter table advantage_templates
add column min_player_level integer not null default 1,
add column visible_if_locked boolean not null default true,
add column is_active boolean not null default true,
add column target_type text not null default 'none',
add column duration_seconds integer not null default 0,
add column is_consumable boolean not null default true,
add column max_uses integer not null default 1,
add column description_admin text not null default '',
add column updated_at timestamptz not null default timezone('utc', now());

alter table advantage_templates
drop column config;

alter table advantage_templates
drop column code;

alter table advantage_templates
alter column effect_code set not null,
alter column effect_family set not null,
alter column tier set not null,
alter column created_at set default timezone('utc', now());

alter table advantage_templates
add constraint advantage_templates_name_unique unique (name),
add constraint advantage_templates_effect_code_unique unique (effect_code),
add constraint advantage_templates_tier_min_check check (tier >= 1),
add constraint advantage_templates_min_player_level_min_check check (min_player_level >= 1),
add constraint advantage_templates_cost_tokens_non_negative_check check (cost_tokens >= 0),
add constraint advantage_templates_duration_seconds_non_negative_check check (duration_seconds >= 0),
add constraint advantage_templates_max_uses_non_negative_check check (max_uses >= 0),
add constraint advantage_templates_effect_family_check check (
  effect_family in ('info', 'tempo', 'protection', 'pressure', 'value', 'social', 'investigation', 'wager', 'other', 'defense', 'exposure')
),
add constraint advantage_templates_target_type_check check (
  target_type in ('self', 'other_player', 'other_participant', 'element', 'none')
),
add constraint advantage_templates_consumption_consistency_check check (
  (is_consumable = true and max_uses >= 1)
  or
  (is_consumable = false and max_uses >= 0)
);

drop trigger if exists trg_advantage_templates_set_updated_at on advantage_templates;

create trigger trg_advantage_templates_set_updated_at
before update on advantage_templates
for each row
execute function set_updated_at();
