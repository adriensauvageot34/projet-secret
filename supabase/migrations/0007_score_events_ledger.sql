-- Score events ledger hardening.
-- score_events stores immutable score movements, while participants.current_score remains a runtime cache.

alter table if exists score_events
  rename column delta to delta_points;

alter table if exists score_events
  add column if not exists notes text,
  add column if not exists related_element_instance_id uuid,
  add column if not exists related_accusation_id uuid,
  add column if not exists related_gm_decision_id uuid,
  add column if not exists delta_points integer;

update score_events
set delta_points = coalesce(delta_points, 0)
where delta_points is null;

alter table score_events
  alter column participant_id set not null,
  alter column session_id set not null,
  alter column event_type set not null,
  alter column delta_points set not null,
  alter column created_at set not null,
  alter column created_at set default timezone('utc', now());

alter table score_events
  drop column if exists source_table,
  drop column if exists source_id,
  drop column if exists meta;

alter table score_events
  drop constraint if exists score_events_event_type_check,
  drop constraint if exists score_events_delta_non_zero_check,
  drop constraint if exists score_events_delta_points_non_zero_check,
  drop constraint if exists score_events_related_element_instance_id_fkey,
  drop constraint if exists score_events_related_accusation_id_fkey,
  drop constraint if exists score_events_related_gm_decision_id_fkey;

alter table score_events
  add constraint score_events_event_type_check
  check (
    event_type in (
      'mission_success',
      'constraint_success',
      'combo_2',
      'combo_3',
      'mission_constraint_bonus',
      'skip_penalty',
      'constraint_break_penalty',
      'fake_bait_bonus',
      'manual_adjustment',
      'retro_validation_cancel',
      'other'
    )
  ),
  add constraint score_events_delta_points_non_zero_check check (delta_points <> 0),
  add constraint score_events_related_element_instance_id_fkey
  foreign key (related_element_instance_id)
  references element_instances(id)
  on delete set null,
  add constraint score_events_related_accusation_id_fkey
  foreign key (related_accusation_id)
  references accusations(id)
  on delete set null,
  add constraint score_events_related_gm_decision_id_fkey
  foreign key (related_gm_decision_id)
  references gm_decisions(id)
  on delete set null;

create index if not exists idx_score_events_participant_id
  on score_events(participant_id);
create index if not exists idx_score_events_session_id
  on score_events(session_id);
create index if not exists idx_score_events_related_element_instance_id
  on score_events(related_element_instance_id);
create index if not exists idx_score_events_related_accusation_id
  on score_events(related_accusation_id);
create index if not exists idx_score_events_related_gm_decision_id
  on score_events(related_gm_decision_id);
create index if not exists idx_score_events_event_type
  on score_events(event_type);
create index if not exists idx_score_events_created_at
  on score_events(created_at);
create index if not exists idx_score_events_session_created_at
  on score_events(session_id, created_at);
create index if not exists idx_score_events_participant_created_at
  on score_events(participant_id, created_at);
create index if not exists idx_score_events_session_participant_created_at
  on score_events(session_id, participant_id, created_at);
create index if not exists idx_score_events_session_event_type_created_at
  on score_events(session_id, event_type, created_at);
