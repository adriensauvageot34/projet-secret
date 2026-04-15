-- Token events ledger hardening.
-- token_events stores immutable unit movements, while participants.current_tokens remains runtime cache.

alter table if exists token_events
  add column if not exists notes text,
  add column if not exists related_accusation_id uuid,
  add column if not exists related_advantage_instance_id uuid,
  add column if not exists related_gm_decision_id uuid,
  add column if not exists related_element_instance_id uuid,
  add column if not exists delta_tokens integer;

update token_events
set delta_tokens = delta
where delta_tokens is null;

alter table token_events
  alter column delta_tokens set not null;

alter table token_events
  add constraint token_events_delta_tokens_non_zero check (delta_tokens <> 0),
  add constraint token_events_event_type_check check (
    event_type in (
      'accusation_correct',
      'shop_purchase',
      'refund',
      'fake_bait_bonus',
      'manual_adjustment',
      'bonus_effect',
      'cancellation',
      'other'
    )
  );

alter table token_events
  drop constraint if exists token_events_related_accusation_id_fkey,
  drop constraint if exists token_events_related_advantage_instance_id_fkey,
  drop constraint if exists token_events_related_gm_decision_id_fkey,
  drop constraint if exists token_events_related_element_instance_id_fkey;

alter table token_events
  add constraint token_events_related_accusation_id_fkey
  foreign key (related_accusation_id)
  references accusations(id)
  on delete set null,
  add constraint token_events_related_advantage_instance_id_fkey
  foreign key (related_advantage_instance_id)
  references advantage_instances(id)
  on delete set null,
  add constraint token_events_related_gm_decision_id_fkey
  foreign key (related_gm_decision_id)
  references gm_decisions(id)
  on delete set null,
  add constraint token_events_related_element_instance_id_fkey
  foreign key (related_element_instance_id)
  references element_instances(id)
  on delete set null;

create index if not exists idx_token_events_participant_id
  on token_events(participant_id);
create index if not exists idx_token_events_session_id
  on token_events(session_id);
create index if not exists idx_token_events_created_at
  on token_events(created_at);
create index if not exists idx_token_events_event_type
  on token_events(event_type);
create index if not exists idx_token_events_related_accusation_id
  on token_events(related_accusation_id);
create index if not exists idx_token_events_related_advantage_instance_id
  on token_events(related_advantage_instance_id);
create index if not exists idx_token_events_related_gm_decision_id
  on token_events(related_gm_decision_id);
create index if not exists idx_token_events_related_element_instance_id
  on token_events(related_element_instance_id);
create index if not exists idx_token_events_session_participant_created_at
  on token_events(session_id, participant_id, created_at);

alter table if exists gm_decisions
  add column if not exists decision_label text not null default '',
  add column if not exists target_token_event_id uuid;

alter table gm_decisions
  drop constraint if exists gm_decisions_target_token_event_id_fkey;

alter table gm_decisions
  add constraint gm_decisions_target_token_event_id_fkey
  foreign key (target_token_event_id)
  references token_events(id)
  on delete set null;

create index if not exists idx_gm_decisions_target_token_event_id
  on gm_decisions(target_token_event_id);
