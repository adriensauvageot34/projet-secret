-- Guardrail: avoid duplicate GM decision ledger writes for manual adjustments.

with duplicate_score_events as (
  select id
  from (
    select
      id,
      row_number() over (
        partition by related_gm_decision_id
        order by created_at asc, id asc
      ) as rn
    from score_events
    where related_gm_decision_id is not null
      and event_type = 'manual_adjustment'
  ) ranked
  where rn > 1
), duplicate_token_events as (
  select id
  from (
    select
      id,
      row_number() over (
        partition by related_gm_decision_id
        order by created_at asc, id asc
      ) as rn
    from token_events
    where related_gm_decision_id is not null
      and event_type = 'manual_adjustment'
  ) ranked
  where rn > 1
)
delete from score_events
where id in (select id from duplicate_score_events);

delete from token_events
where id in (select id from duplicate_token_events);

create unique index if not exists uq_score_events_manual_adjustment_once_per_gm_decision
  on score_events(related_gm_decision_id)
  where related_gm_decision_id is not null
    and event_type = 'manual_adjustment';

create unique index if not exists uq_token_events_manual_adjustment_once_per_gm_decision
  on token_events(related_gm_decision_id)
  where related_gm_decision_id is not null
    and event_type = 'manual_adjustment';
