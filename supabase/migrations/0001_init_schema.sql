create extension if not exists "pgcrypto";

create table sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  session_date date not null,
  location text not null,
  status text not null,
  rules_announced_at timestamptz not null,
  game_start_at timestamptz not null,
  game_end_at timestamptz not null,
  max_active_missions integer not null default 2,
  max_active_constraints integer not null default 2,
  reserve_per_difficulty integer not null default 2,
  fake_unlock_level integer not null default 3,
  fake_cycle_every_n_completed integer not null default 5,
  bottom_count_for_wheel integer not null default 5,
  game_mode text not null default 'standard',
  notes text not null default '',
  gm_session_notes text not null default '',
  session_gm_participant_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint sessions_status_check check (status in ('preparation', 'live', 'finished', 'archived')),
  constraint sessions_game_mode_check check (game_mode in ('standard')),
  constraint sessions_max_active_missions_non_negative check (max_active_missions >= 0),
  constraint sessions_max_active_constraints_non_negative check (max_active_constraints >= 0),
  constraint sessions_reserve_per_difficulty_non_negative check (reserve_per_difficulty >= 0),
  constraint sessions_fake_unlock_level_min check (fake_unlock_level >= 1),
  constraint sessions_fake_cycle_every_n_completed_min check (fake_cycle_every_n_completed >= 1),
  constraint sessions_bottom_count_for_wheel_non_negative check (bottom_count_for_wheel >= 0),
  constraint sessions_schedule_order_check check (rules_announced_at <= game_start_at and game_start_at <= game_end_at)
);

create table players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null unique,
  nickname text,
  photo_url text,
  notes_profile text,
  is_active boolean not null default true,
  can_play boolean not null default true,
  can_be_gm boolean not null default false,
  role_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_players_set_updated_at
before update on players
for each row
execute function set_updated_at();


create table levels (
  id uuid primary key default gen_random_uuid(),
  level_number int not null unique,
  label text not null,
  min_score int not null,
  max_score int not null,
  mission_difficulty_max int not null,
  constraint_difficulty_max int not null,
  shop_tier_max int not null,
  fake_elements_unlocked boolean not null default false,
  missions_visible_per_difficulty int not null,
  constraints_visible_per_difficulty int not null,
  privilege_text text not null default '',
  visible_order int not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint levels_score_range_check check (min_score <= max_score),
  constraint levels_non_negative_values_check check (
    min_score >= 0
    and max_score >= 0
    and mission_difficulty_max >= 1
    and constraint_difficulty_max >= 1
    and shop_tier_max >= 1
    and missions_visible_per_difficulty >= 1
    and constraints_visible_per_difficulty >= 1
    and visible_order >= 1
  )
);

create trigger trg_levels_set_updated_at
before update on levels
for each row
execute function set_updated_at();

create table participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  player_id uuid not null references players(id),
  role text not null default 'player',
  current_status text not null default 'active',
  current_score int not null default 0,
  current_tokens int not null default 0,
  current_level int not null default 1 references levels(level_number),
  combo_count int not null default 0,
  mission_slots int not null default 2,
  constraint_slots int not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (session_id, player_id)
);

create trigger trg_sessions_set_updated_at
before update on sessions
for each row
execute function set_updated_at();

alter table sessions
add constraint sessions_session_gm_participant_id_fkey
foreign key (session_gm_participant_id)
references participants(id)
on delete set null;

create table element_templates (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  element_type text not null,
  category text not null,
  difficulty integer not null,
  points integer not null default 0,
  duration_minutes integer not null,
  skip_unlock_minutes integer not null,
  validation_mode text not null,
  proof_required boolean not null default false,
  can_be_fake boolean not null default false,
  can_appear_in_reserve boolean not null default true,
  is_active boolean not null default true,
  player_description text not null,
  short_label text not null default '',
  ui_tags text[] default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint element_templates_type_check check (element_type in ('mission', 'constraint')),
  constraint element_templates_validation_mode_check check (validation_mode in ('auto', 'proof', 'gm')),
  constraint element_templates_validation_consistency_check check (
    (validation_mode = 'auto' and proof_required = false)
    or
    (validation_mode = 'proof' and proof_required = true)
    or
    (validation_mode = 'gm')
  ),
  constraint element_templates_values_check check (
    difficulty >= 1
    and points >= 0
    and duration_minutes > 0
    and skip_unlock_minutes >= 0
  )
);

create trigger trg_element_templates_set_updated_at
before update on element_templates
for each row
execute function set_updated_at();

create table element_instances (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  template_id uuid not null references element_templates(id),
  slot_index int not null default 0,
  state text not null default 'reserve',
  claimed_result text not null default 'none',
  final_result text not null default 'pending',
  proof_status text not null default 'not_required',
  activated_at timestamptz,
  skip_available_at timestamptz,
  ends_at timestamptz,
  cooldown_until timestamptz,
  points_gained int not null default 0,
  points_lost int not null default 0,
  tokens_gained int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table advantage_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  effect_code text not null,
  effect_family text not null,
  price_tokens int not null,
  tier int not null default 1,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table advantage_instances (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  template_id uuid not null references advantage_templates(id),
  source text not null default 'shop',
  state text not null default 'owned',
  remaining_uses int not null default 1,
  activated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table accusations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  accuser_participant_id uuid not null references participants(id),
  accused_participant_id uuid not null references participants(id),
  arbiter_participant_id uuid references participants(id),
  suspect_element_type text,
  suspect_template_id uuid references element_templates(id),
  linked_element_instance_id uuid references element_instances(id),
  justification text,
  status text not null default 'submitted',
  decision text not null default 'pending',
  verdict text not null default 'none',
  impact_score_delta int not null default 0,
  impact_token_delta int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

create table gm_decisions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  decision_type text not null,
  status text not null default 'recorded',
  actor_participant_id uuid references participants(id),
  accusation_id uuid references accusations(id),
  element_instance_id uuid references element_instances(id),
  rationale text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  applied_at timestamptz
);

create table score_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  event_type text not null,
  delta int not null,
  source_table text,
  source_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table token_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  event_type text not null,
  delta int not null,
  source_table text,
  source_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table wheel_outcome_templates (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  label text not null,
  description text,
  effect_code text,
  weight int not null default 1,
  created_at timestamptz not null default timezone('utc', now())
);

create table final_wheel_spins (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  participant_id uuid not null references participants(id),
  outcome_template_id uuid not null references wheel_outcome_templates(id),
  spun_at timestamptz not null default timezone('utc', now()),
  notes text
);

create index idx_participants_session_id on participants(session_id);
create index idx_element_instances_session_participant on element_instances(session_id, participant_id);
create index idx_advantage_instances_session_participant on advantage_instances(session_id, participant_id);
create index idx_score_events_session_participant on score_events(session_id, participant_id);
create index idx_token_events_session_participant on token_events(session_id, participant_id);
create index idx_accusations_session_status on accusations(session_id, status);
create index idx_element_templates_type_difficulty on element_templates(element_type, difficulty);
