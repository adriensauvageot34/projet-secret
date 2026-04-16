-- MVP: make shop purchase atomic (token ledger + runtime cache + inventory instance).

create or replace function purchase_advantage_shop(
  p_participant_id uuid,
  p_template_id uuid,
  p_gm_notes text default null
)
returns advantage_instances
language plpgsql
as $$
declare
  v_participant participants%rowtype;
  v_template advantage_templates%rowtype;
  v_level levels%rowtype;
  v_instance advantage_instances%rowtype;
  v_next_tokens integer;
begin
  select *
  into v_participant
  from participants
  where id = p_participant_id
  for update;

  if not found then
    raise exception 'Participant not found';
  end if;

  select *
  into v_template
  from advantage_templates
  where id = p_template_id;

  if not found then
    raise exception 'Advantage template not found';
  end if;

  if v_participant.current_level_id is null then
    select *
    into v_level
    from levels
    where level_number = 1;

    if not found then
      raise exception 'Default level not found';
    end if;
  else
    select *
    into v_level
    from levels
    where id = v_participant.current_level_id;

    if not found then
      raise exception 'Participant level not found';
    end if;
  end if;

  if v_template.is_active is not true then
    raise exception 'Cannot purchase advantage: template_inactive';
  end if;

  if v_template.tier > v_level.shop_tier_max then
    raise exception 'Cannot purchase advantage: template_not_purchasable';
  end if;

  if v_level.level_number < v_template.min_player_level then
    raise exception 'Cannot purchase advantage: insufficient_level';
  end if;

  if v_participant.current_tokens < v_template.cost_tokens then
    raise exception 'Cannot purchase advantage: insufficient_tokens';
  end if;

  v_next_tokens := v_participant.current_tokens - v_template.cost_tokens;

  insert into advantage_instances (
    source,
    cost_paid,
    state,
    activated_at,
    expires_at,
    remaining_uses,
    gm_notes,
    advantage_template_id,
    session_id,
    assigned_player_id,
    participant_id,
    target_participant_id,
    target_element_instance_id
  )
  values (
    'shop',
    v_template.cost_tokens,
    'owned',
    null,
    null,
    v_template.max_uses,
    coalesce(p_gm_notes, ''),
    v_template.id,
    v_participant.session_id,
    v_participant.player_id,
    v_participant.id,
    null,
    null
  )
  returning * into v_instance;

  insert into token_events (
    participant_id,
    session_id,
    event_type,
    delta_tokens,
    notes,
    related_advantage_instance_id,
    related_accusation_id,
    related_gm_decision_id,
    related_element_instance_id
  )
  values (
    v_participant.id,
    v_participant.session_id,
    'shop_purchase',
    -v_template.cost_tokens,
    p_gm_notes,
    v_instance.id,
    null,
    null,
    null
  );

  update participants
  set current_tokens = v_next_tokens
  where id = v_participant.id;

  return v_instance;
end;
$$;
