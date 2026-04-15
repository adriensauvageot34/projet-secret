-- GM decisions governance hardening.
-- gm_decisions stores arbitration decisions only.
-- score_events/token_events keep official accounting effects.

alter table if exists score_events
  add column if not exists notes text,
  add column if not exists related_gm_decision_id uuid;

alter table score_events
  drop constraint if exists score_events_related_gm_decision_id_fkey;

alter table score_events
  add constraint score_events_related_gm_decision_id_fkey
  foreign key (related_gm_decision_id)
  references gm_decisions(id)
  on delete set null;

create index if not exists idx_score_events_related_gm_decision_id
  on score_events(related_gm_decision_id);

alter table if exists gm_decisions
  add column if not exists assigned_player_id uuid,
  add column if not exists reason text,
  add column if not exists notes text,
  add column if not exists score_impact integer,
  add column if not exists token_impact integer,
  add column if not exists is_retroactive boolean not null default false,
  add column if not exists related_element_instance_id uuid,
  add column if not exists target_element_instance_id uuid,
  add column if not exists target_accusation_id uuid,
  add column if not exists target_score_event_id uuid;

update gm_decisions
set
  reason = coalesce(reason, rationale, 'No reason provided'),
  score_impact = coalesce(score_impact, 0),
  token_impact = coalesce(token_impact, 0),
  decision_label = case
    when coalesce(decision_label, '') = '' then coalesce(rationale, decision_type, 'GM decision')
    else decision_label
  end,
  target_accusation_id = coalesce(target_accusation_id, accusation_id),
  target_element_instance_id = coalesce(target_element_instance_id, element_instance_id),
  status = case
    when status in ('recorded', 'draft') then 'logged'
    when status = 'void' then 'cancelled'
    else status
  end,
  decision_type = case
    when decision_type = 'accusation_adjudication' then 'accusation_arbitration'
    when decision_type = 'element_validation' then 'validation_override'
    when decision_type = 'manual_adjustment' then 'other'
    else decision_type
  end
where true;

alter table gm_decisions
  alter column made_by_participant_id set not null,
  alter column decision_label set not null,
  alter column reason set not null,
  alter column score_impact set default 0,
  alter column score_impact set not null,
  alter column token_impact set default 0,
  alter column token_impact set not null,
  alter column status set default 'logged';

alter table gm_decisions
  drop column if exists payload,
  drop column if exists rationale,
  drop column if exists accusation_id,
  drop column if exists element_instance_id,
  drop column if exists applied_at;

alter table gm_decisions
  drop constraint if exists gm_decisions_status_check,
  drop constraint if exists gm_decisions_decision_type_check,
  drop constraint if exists gm_decisions_assigned_player_id_fkey,
  drop constraint if exists gm_decisions_target_accusation_id_fkey,
  drop constraint if exists gm_decisions_target_score_event_id_fkey,
  drop constraint if exists gm_decisions_related_element_instance_id_fkey,
  drop constraint if exists gm_decisions_target_element_instance_id_fkey;

alter table gm_decisions
  add constraint gm_decisions_assigned_player_id_fkey
  foreign key (assigned_player_id)
  references players(id)
  on delete set null,
  add constraint gm_decisions_target_accusation_id_fkey
  foreign key (target_accusation_id)
  references accusations(id)
  on delete set null,
  add constraint gm_decisions_target_score_event_id_fkey
  foreign key (target_score_event_id)
  references score_events(id)
  on delete set null,
  add constraint gm_decisions_related_element_instance_id_fkey
  foreign key (related_element_instance_id)
  references element_instances(id)
  on delete set null,
  add constraint gm_decisions_target_element_instance_id_fkey
  foreign key (target_element_instance_id)
  references element_instances(id)
  on delete set null,
  add constraint gm_decisions_status_check
  check (status in ('logged', 'applied', 'cancelled')),
  add constraint gm_decisions_decision_type_check
  check (
    decision_type in (
      'validation_override',
      'accusation_arbitration',
      'retro_cancel',
      'fake_element_resolution',
      'abuse_correction',
      'manual_bonus',
      'manual_penalty',
      'other'
    )
  ),
  add constraint gm_decisions_target_participants_distinct_check
  check (
    target_participant_id is null
    or other_target_participant_id is null
    or target_participant_id <> other_target_participant_id
  ),
  add constraint gm_decisions_target_elements_distinct_check
  check (
    related_element_instance_id is null
    or target_element_instance_id is null
    or related_element_instance_id <> target_element_instance_id
  );

create index if not exists idx_gm_decisions_session_id on gm_decisions(session_id);
create index if not exists idx_gm_decisions_made_by_participant_id on gm_decisions(made_by_participant_id);
create index if not exists idx_gm_decisions_assigned_player_id on gm_decisions(assigned_player_id);
create index if not exists idx_gm_decisions_target_participant_id on gm_decisions(target_participant_id);
create index if not exists idx_gm_decisions_other_target_participant_id on gm_decisions(other_target_participant_id);
create index if not exists idx_gm_decisions_related_element_instance_id on gm_decisions(related_element_instance_id);
create index if not exists idx_gm_decisions_target_element_instance_id on gm_decisions(target_element_instance_id);
create index if not exists idx_gm_decisions_target_accusation_id on gm_decisions(target_accusation_id);
create index if not exists idx_gm_decisions_target_score_event_id on gm_decisions(target_score_event_id);
create index if not exists idx_gm_decisions_target_token_event_id on gm_decisions(target_token_event_id);
create index if not exists idx_gm_decisions_decision_type on gm_decisions(decision_type);
create index if not exists idx_gm_decisions_status on gm_decisions(status);
create index if not exists idx_gm_decisions_created_at on gm_decisions(created_at);
create index if not exists idx_gm_decisions_session_created_at on gm_decisions(session_id, created_at);
create index if not exists idx_gm_decisions_session_type_status on gm_decisions(session_id, decision_type, status);
