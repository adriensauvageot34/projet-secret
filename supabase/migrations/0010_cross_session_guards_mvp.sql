-- MVP guardrails against cross-session inconsistencies on sensitive runtime ledgers.
-- Scope intentionally limited to score_events, token_events, and element_instances.

create or replace function trg_guard_score_events_same_session()
returns trigger as $$
begin
  if new.participant_id is not null
    and new.session_id is not null
    and not exists (
      select 1
      from participants p
      where p.id = new.participant_id
        and p.session_id = new.session_id
    ) then
    raise exception
      'score_events participant % does not belong to session %',
      new.participant_id,
      new.session_id
      using errcode = '23514';
  end if;

  if new.related_element_instance_id is not null
    and not exists (
      select 1
      from element_instances ei
      where ei.id = new.related_element_instance_id
        and ei.session_id = new.session_id
    ) then
    raise exception
      'score_events related_element_instance % does not belong to session %',
      new.related_element_instance_id,
      new.session_id
      using errcode = '23514';
  end if;

  if new.related_accusation_id is not null
    and not exists (
      select 1
      from accusations a
      where a.id = new.related_accusation_id
        and a.session_id = new.session_id
    ) then
    raise exception
      'score_events related_accusation % does not belong to session %',
      new.related_accusation_id,
      new.session_id
      using errcode = '23514';
  end if;

  if new.related_gm_decision_id is not null
    and not exists (
      select 1
      from gm_decisions gd
      where gd.id = new.related_gm_decision_id
        and gd.session_id = new.session_id
    ) then
    raise exception
      'score_events related_gm_decision % does not belong to session %',
      new.related_gm_decision_id,
      new.session_id
      using errcode = '23514';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_score_events_cross_session_guard on score_events;
create trigger trg_score_events_cross_session_guard
before insert or update on score_events
for each row
execute function trg_guard_score_events_same_session();

create or replace function trg_guard_token_events_same_session()
returns trigger as $$
begin
  if new.participant_id is not null
    and new.session_id is not null
    and not exists (
      select 1
      from participants p
      where p.id = new.participant_id
        and p.session_id = new.session_id
    ) then
    raise exception
      'token_events participant % does not belong to session %',
      new.participant_id,
      new.session_id
      using errcode = '23514';
  end if;

  if new.related_accusation_id is not null
    and not exists (
      select 1
      from accusations a
      where a.id = new.related_accusation_id
        and a.session_id = new.session_id
    ) then
    raise exception
      'token_events related_accusation % does not belong to session %',
      new.related_accusation_id,
      new.session_id
      using errcode = '23514';
  end if;

  if new.related_advantage_instance_id is not null
    and not exists (
      select 1
      from advantage_instances ai
      where ai.id = new.related_advantage_instance_id
        and ai.session_id = new.session_id
    ) then
    raise exception
      'token_events related_advantage_instance % does not belong to session %',
      new.related_advantage_instance_id,
      new.session_id
      using errcode = '23514';
  end if;

  if new.related_gm_decision_id is not null
    and not exists (
      select 1
      from gm_decisions gd
      where gd.id = new.related_gm_decision_id
        and gd.session_id = new.session_id
    ) then
    raise exception
      'token_events related_gm_decision % does not belong to session %',
      new.related_gm_decision_id,
      new.session_id
      using errcode = '23514';
  end if;

  if new.related_element_instance_id is not null
    and not exists (
      select 1
      from element_instances ei
      where ei.id = new.related_element_instance_id
        and ei.session_id = new.session_id
    ) then
    raise exception
      'token_events related_element_instance % does not belong to session %',
      new.related_element_instance_id,
      new.session_id
      using errcode = '23514';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_token_events_cross_session_guard on token_events;
create trigger trg_token_events_cross_session_guard
before insert or update on token_events
for each row
execute function trg_guard_token_events_same_session();

create or replace function trg_guard_element_instances_same_session()
returns trigger as $$
begin
  if new.participant_id is not null
    and new.session_id is not null
    and not exists (
      select 1
      from participants p
      where p.id = new.participant_id
        and p.session_id = new.session_id
    ) then
    raise exception
      'element_instances participant % does not belong to session %',
      new.participant_id,
      new.session_id
      using errcode = '23514';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_element_instances_cross_session_guard on element_instances;
create trigger trg_element_instances_cross_session_guard
before insert or update on element_instances
for each row
execute function trg_guard_element_instances_same_session();
