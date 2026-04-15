-- Canonical catalog for advantage templates.
-- Keeps runtime ownership/activation in advantage_instances only.

alter table if exists advantage_templates
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

-- Normalize legacy columns into catalog columns.
alter table if exists advantage_templates
  rename column title to name;

alter table if exists advantage_templates
  rename column description to description_player;

alter table if exists advantage_templates
  rename column price_tokens to cost_tokens;

alter table if exists advantage_templates
  add column if not exists min_player_level integer not null default 1,
  add column if not exists visible_if_locked boolean not null default true,
  add column if not exists is_active boolean not null default true,
  add column if not exists target_type text not null default 'none',
  add column if not exists duration_seconds integer not null default 0,
  add column if not exists is_consumable boolean not null default true,
  add column if not exists max_uses integer not null default 1,
  add column if not exists description_admin text not null default '';

alter table if exists advantage_templates
  drop column if exists code,
  drop column if exists config;

-- Legacy effect_code may not have been unique.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'advantage_templates_effect_code_unique'
  ) then
    alter table advantage_templates
      add constraint advantage_templates_effect_code_unique unique (effect_code);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'advantage_templates_name_unique'
  ) then
    alter table advantage_templates
      add constraint advantage_templates_name_unique unique (name);
  end if;
end
$$;

alter table advantage_templates
  drop constraint if exists advantage_templates_values_check,
  drop constraint if exists advantage_templates_effect_family_check,
  drop constraint if exists advantage_templates_target_type_check,
  drop constraint if exists advantage_templates_consumption_check;

alter table advantage_templates
  add constraint advantage_templates_values_check check (
    tier >= 1
    and min_player_level >= 1
    and cost_tokens >= 0
    and duration_seconds >= 0
    and max_uses >= 0
  ),
  add constraint advantage_templates_effect_family_check check (
    effect_family in (
      'investigation',
      'tempo',
      'defense',
      'value',
      'wager',
      'pressure',
      'exposure',
      'info',
      'protection',
      'social',
      'other'
    )
  ),
  add constraint advantage_templates_target_type_check check (
    target_type in ('self', 'other_participant', 'other_player', 'element', 'none')
  ),
  add constraint advantage_templates_consumption_check check (
    (is_consumable = true and max_uses >= 1)
    or
    (is_consumable = false and max_uses >= 0)
  );

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_advantage_templates_set_updated_at'
  ) then
    create trigger trg_advantage_templates_set_updated_at
    before update on advantage_templates
    for each row
    execute function set_updated_at();
  end if;
end
$$;

-- Align FK naming and column naming with catalog/runtime split.
alter table if exists advantage_instances
  add column if not exists advantage_template_id uuid;

update advantage_instances
set advantage_template_id = template_id
where advantage_template_id is null
  and template_id is not null;

alter table advantage_instances
  alter column advantage_template_id set not null;

alter table advantage_instances
  drop constraint if exists advantage_instances_template_id_fkey,
  drop constraint if exists advantage_instances_advantage_template_id_fkey;

alter table advantage_instances
  add constraint advantage_instances_advantage_template_id_fkey
  foreign key (advantage_template_id)
  references advantage_templates(id)
  on delete restrict;

alter table advantage_instances
  drop column if exists template_id;
