-- Guardrail: avoid duplicate combo/mission-constraint bonus writes per resolved element instance.

with duplicate_combo_bonus_events as (
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
      and event_type in ('combo_2', 'combo_3', 'mission_constraint_bonus')
  ) ranked
  where rn > 1
)
delete from score_events
where id in (select id from duplicate_combo_bonus_events);

create unique index if not exists uq_score_events_combo_bonus_once_per_instance
  on score_events(related_element_instance_id, event_type)
  where related_element_instance_id is not null
    and event_type in ('combo_2', 'combo_3', 'mission_constraint_bonus');
