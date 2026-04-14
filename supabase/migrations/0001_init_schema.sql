create extension if not exists "pgcrypto";

create table sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  session_date date not null,
  location text,
  status text not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  gm_player_id uuid,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  handle text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table sessions add constraint sessions_gm_player_id_fkey foreign key (gm_player_id) references players(id);

create table levels (
  id int primary key,
  rank_name text not null,
  min_score int not null,
  mission_difficulty_max int not null,
  constraint_difficulty_max int not null,
  shop_tier_max int not null,
  fake_elements_unlocked boolean not null default false,
  missions_visible_per_difficulty int not null default 1,
  constraints_visible_per_difficulty int not null default 1
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  player_id uuid not null references players(id),
  role text not null default 'player',
  current_status text not null default 'active',
  current_score int not null default 0,
  current_tokens int not null default 0,
  current_level int not null default 1 references levels(id),
  combo_count int not null default 0,
  mission_slots int not null default 2,
  constraint_slots int not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (session_id, player_id)
);

create table element_templates (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  element_type text not null,
  title text not null,
  player_display_text text not null,
  difficulty int not null,
  validation_mode text not null default 'self_declare',
  skip_unlock_rule text not null default 'after_delay',
  can_be_fake boolean not null default false,
  in_reserve_pool boolean not null default true,
  success_button_label text not null default 'Réussi',
  failure_button_label text not null default 'Échoué',
  ui_tag_1 text,
  ui_tag_2 text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

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
  participant_id uuid not null references participants(id) on delete cascade,
  outcome_template_id uuid not null references wheel_outcome_templates(id),
  spun_at timestamptz not null default timezone('utc', now()),
  notes text
);
