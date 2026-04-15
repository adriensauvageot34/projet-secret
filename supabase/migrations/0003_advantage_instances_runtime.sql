-- Runtime overhaul for advantage_instances.
-- Keeps advantage_templates as immutable catalog definitions.

alter table if exists advantage_instances
  add column if not exists assigned_player_id uuid,
  add column if not exists participant_id uuid,
  add column if not exists target_element_instance_id uuid,
  add column if not exists cost_paid integer not null default 0,
  add column if not exists gm_notes text not null default '',
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

-- Legacy compatibility: move owner_participant_id into new participant_id contract.
update advantage_instances
set participant_id = owner_participant_id
where participant_id is null
  and owner_participant_id is not null;

-- Fill assigned_player_id from participant ownership.
update advantage_instances ai
set assigned_player_id = p.player_id
from participants p
where ai.assigned_player_id is null
  and ai.participant_id = p.id;

alter table advantage_instances
  alter column advantage_template_id set not null,
  alter column session_id set not null,
  alter column participant_id set not null,
  alter column assigned_player_id set not null,
  alter column source drop default,
  alter column state drop default,
  alter column remaining_uses drop default,
  alter column remaining_uses set not null;

alter table advantage_instances
  drop constraint if exists advantage_instances_owner_participant_id_fkey,
  drop constraint if exists advantage_instances_participant_id_fkey,
  drop constraint if exists advantage_instances_assigned_player_id_fkey,
  drop constraint if exists advantage_instances_target_participant_id_fkey,
  drop constraint if exists advantage_instances_target_element_instance_id_fkey;

alter table advantage_instances
  add constraint advantage_instances_participant_id_fkey
  foreign key (participant_id)
  references participants(id)
  on delete cascade,
  add constraint advantage_instances_assigned_player_id_fkey
  foreign key (assigned_player_id)
  references players(id)
  on delete restrict,
  add constraint advantage_instances_target_participant_id_fkey
  foreign key (target_participant_id)
  references participants(id)
  on delete set null,
  add constraint advantage_instances_target_element_instance_id_fkey
  foreign key (target_element_instance_id)
  references element_instances(id)
  on delete set null;

alter table advantage_instances
  drop constraint if exists advantage_instances_source_check,
  drop constraint if exists advantage_instances_state_check,
  drop constraint if exists advantage_instances_cost_paid_non_negative,
  drop constraint if exists advantage_instances_remaining_uses_non_negative,
  drop constraint if exists advantage_instances_temporal_order_check,
  drop constraint if exists advantage_instances_state_activation_check,
  drop constraint if exists advantage_instances_state_expiration_check;

alter table advantage_instances
  add constraint advantage_instances_source_check check (
    source in ('shop', 'bonus', 'fake_bait', 'manual')
  ),
  add constraint advantage_instances_state_check check (
    state in ('owned', 'active', 'consumed', 'expired', 'cancelled')
  ),
  add constraint advantage_instances_cost_paid_non_negative check (cost_paid >= 0),
  add constraint advantage_instances_remaining_uses_non_negative check (remaining_uses >= 0),
  add constraint advantage_instances_temporal_order_check check (
    activated_at is null or expires_at is null or expires_at >= activated_at
  ),
  add constraint advantage_instances_state_activation_check check (
    state <> 'active' or activated_at is not null
  ),
  add constraint advantage_instances_state_expiration_check check (
    state <> 'expired' or expires_at is not null
  );

-- Rename legacy owner column after migration to keep schema explicit.
alter table if exists advantage_instances
  rename column owner_participant_id to legacy_owner_participant_id;

alter table if exists advantage_instances
  drop column if exists legacy_owner_participant_id,
  drop column if exists template_id;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_advantage_instances_set_updated_at'
  ) then
    create trigger trg_advantage_instances_set_updated_at
    before update on advantage_instances
    for each row
    execute function set_updated_at();
  end if;
end
$$;

create index if not exists idx_advantage_instances_participant_id
  on advantage_instances(participant_id);
create index if not exists idx_advantage_instances_session_id
  on advantage_instances(session_id);
create index if not exists idx_advantage_instances_advantage_template_id
  on advantage_instances(advantage_template_id);
create index if not exists idx_advantage_instances_state
  on advantage_instances(state);
create index if not exists idx_advantage_instances_participant_state
  on advantage_instances(participant_id, state);
create index if not exists idx_advantage_instances_session_state
  on advantage_instances(session_id, state);
create index if not exists idx_advantage_instances_assigned_player_id
  on advantage_instances(assigned_player_id);
create index if not exists idx_advantage_instances_target_participant_id
  on advantage_instances(target_participant_id);
create index if not exists idx_advantage_instances_target_element_instance_id
  on advantage_instances(target_element_instance_id);
create index if not exists idx_advantage_instances_expires_at
  on advantage_instances(expires_at);

-- Token events can be linked directly to runtime advantage instances.
alter table if exists token_events
  add column if not exists related_advantage_instance_id uuid;

alter table token_events
  drop constraint if exists token_events_related_advantage_instance_id_fkey;

alter table token_events
  add constraint token_events_related_advantage_instance_id_fkey
  foreign key (related_advantage_instance_id)
  references advantage_instances(id)
  on delete set null;

create index if not exists idx_token_events_related_advantage_instance_id
  on token_events(related_advantage_instance_id);
