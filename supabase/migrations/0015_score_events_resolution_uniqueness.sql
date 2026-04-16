-- MVP guardrail: avoid duplicate score ledger writes for the same element resolution.

with duplicate_resolution_events as (
  select id
  from (
    select
      id,
      row_number() over (
        partition by related_element_instance_id, event_type
        order by created_at asc, id asc
      ) as rn
    from score_events
    where related_element_instance_id is not null
      and event_type in ('mission_success', 'constraint_success', 'skip_penalty', 'constraint_break_penalty')
  ) ranked
  where rn > 1
)
delete from score_events
where id in (select id from duplicate_resolution_events);

create unique index if not exists idx_score_events_resolution_unique_per_instance_event
  on score_events(related_element_instance_id, event_type)
  where related_element_instance_id is not null
    and event_type in ('mission_success', 'constraint_success', 'skip_penalty', 'constraint_break_penalty');
