-- Guardrail: one shop_purchase token event per purchased advantage instance.

with duplicate_shop_purchase_events as (
  select id
  from (
    select
      id,
      row_number() over (
        partition by related_advantage_instance_id
        order by created_at asc, id asc
      ) as rn
    from token_events
    where event_type = 'shop_purchase'
      and related_advantage_instance_id is not null
  ) ranked
  where rn > 1
)
delete from token_events
where id in (select id from duplicate_shop_purchase_events);

create unique index if not exists uq_token_events_shop_purchase_once_per_instance
  on token_events(related_advantage_instance_id)
  where event_type = 'shop_purchase'
    and related_advantage_instance_id is not null;
