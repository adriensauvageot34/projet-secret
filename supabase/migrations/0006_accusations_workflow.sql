-- Accusations workflow hardening.
-- accusations stores social suspicion objects and arbitration metadata.
-- token_events / score_events remain accounting ledgers.

alter table if exists accusations
  rename column suspect_element_type to suspected_type;

alter table if exists accusations
  rename column suspect_template_id to suspected_template_id;

alter table if exists accusations
  rename column linked_element_instance_id to related_element_instance_id;

alter table if exists accusations
  rename column resolved_at to adjudicated_at;

alter table if exists accusations
  add column if not exists is_receivable boolean,
  add column if not exists triggered_fake_bait boolean not null default false,
  add column if not exists reward_tokens integer not null default 0,
  add column if not exists cancelled_previous_validation boolean not null default false,
  add column if not exists notes_admin text;

alter table if exists accusations
  drop column if exists impact_score_delta,
  drop column if exists impact_token_delta;

update accusations
set
  status = case
    when status = 'resolved' and decision in ('accepted') then 'validated'
    when status = 'resolved' and decision in ('rejected') then 'rejected'
    when status = 'draft' then 'submitted'
    else status
  end,
  decision = case
    when decision = 'pending' then null
    when decision = 'accepted' then 'correct'
    when decision = 'rejected' then 'incorrect'
    else decision
  end,
  verdict = case
    when verdict = 'none' then null
    when verdict = 'correct' then 'juste'
    when verdict = 'incorrect' then 'fausse'
    when verdict = 'inconclusive' then 'en arbitrage'
    else verdict
  end;

alter table accusations
  alter column created_at set not null,
  alter column created_at set default timezone('utc', now()),
  alter column session_id set not null,
  alter column accuser_participant_id set not null,
  alter column accused_participant_id set not null,
  alter column suspected_type set not null,
  alter column suspected_template_id set not null,
  alter column justification set not null,
  alter column decision drop not null,
  alter column decision drop default,
  alter column verdict drop not null,
  alter column verdict drop default;

alter table accusations
  drop constraint if exists accusations_status_check,
  drop constraint if exists accusations_decision_check,
  drop constraint if exists accusations_verdict_check,
  drop constraint if exists accusations_suspected_type_check,
  drop constraint if exists accusations_reward_tokens_non_negative,
  drop constraint if exists accusations_accuser_not_accused_check,
  drop constraint if exists accusations_fake_bait_decision_consistency_check,
  drop constraint if exists accusations_cancelled_previous_validation_check,
  drop constraint if exists accusations_adjudication_fields_consistency_check,
  drop constraint if exists accusations_workflow_consistency_check;

alter table accusations
  add constraint accusations_suspected_type_check
    check (suspected_type in ('mission', 'constraint')),
  add constraint accusations_status_check
    check (status in ('submitted', 'under_review', 'validated', 'rejected', 'cancelled')),
  add constraint accusations_decision_check
    check (decision is null or decision in ('correct', 'incorrect', 'fake_bait_triggered', 'not_receivable', 'cancelled_by_gm')),
  add constraint accusations_verdict_check
    check (verdict is null or verdict in ('reçue', 'irrecevable', 'en arbitrage', 'juste', 'fausse', 'annulée')),
  add constraint accusations_reward_tokens_non_negative
    check (reward_tokens >= 0),
  add constraint accusations_accuser_not_accused_check
    check (accuser_participant_id <> accused_participant_id),
  add constraint accusations_fake_bait_decision_consistency_check
    check (triggered_fake_bait = false or decision = 'fake_bait_triggered'),
  add constraint accusations_cancelled_previous_validation_check
    check (
      cancelled_previous_validation = false
      or decision in ('correct', 'fake_bait_triggered', 'cancelled_by_gm')
    ),
  add constraint accusations_adjudication_fields_consistency_check
    check (
      (
        decision is null
        and adjudicated_at is null
        and adjudicated_by_participant_id is null
      )
      or (
        decision is not null
        and adjudicated_at is not null
        and adjudicated_by_participant_id is not null
      )
    ),
  add constraint accusations_workflow_consistency_check
    check (
      (status = 'submitted' and decision is null)
      or (status = 'under_review' and decision is null)
      or (status = 'validated' and decision in ('correct', 'fake_bait_triggered'))
      or (status = 'rejected' and decision in ('incorrect', 'not_receivable'))
      or (status = 'cancelled' and decision = 'cancelled_by_gm')
    );

alter table accusations
  drop constraint if exists accusations_related_element_instance_id_fkey,
  add constraint accusations_related_element_instance_id_fkey
  foreign key (related_element_instance_id)
  references element_instances(id)
  on delete set null;

alter table score_events
  add column if not exists related_accusation_id uuid;

alter table score_events
  drop constraint if exists score_events_related_accusation_id_fkey;

alter table score_events
  add constraint score_events_related_accusation_id_fkey
  foreign key (related_accusation_id)
  references accusations(id)
  on delete set null;

create index if not exists idx_accusations_session_id on accusations(session_id);
create index if not exists idx_accusations_accuser_participant_id on accusations(accuser_participant_id);
create index if not exists idx_accusations_accused_participant_id on accusations(accused_participant_id);
create index if not exists idx_accusations_adjudicated_by_participant_id on accusations(adjudicated_by_participant_id);
create index if not exists idx_accusations_suspected_template_id on accusations(suspected_template_id);
create index if not exists idx_accusations_related_element_instance_id on accusations(related_element_instance_id);
create index if not exists idx_accusations_status on accusations(status);
create index if not exists idx_accusations_decision on accusations(decision);
create index if not exists idx_accusations_verdict on accusations(verdict);
create index if not exists idx_accusations_created_at on accusations(created_at);
create index if not exists idx_accusations_adjudicated_at on accusations(adjudicated_at);
create index if not exists idx_accusations_session_created_at on accusations(session_id, created_at);
create index if not exists idx_accusations_session_status on accusations(session_id, status);
create index if not exists idx_accusations_session_accused_created_at on accusations(session_id, accused_participant_id, created_at);
create index if not exists idx_accusations_session_accuser_created_at on accusations(session_id, accuser_participant_id, created_at);
create index if not exists idx_score_events_related_accusation_id on score_events(related_accusation_id);
