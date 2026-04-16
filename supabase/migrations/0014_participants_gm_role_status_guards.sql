-- Guardrails for session bootstrap coherence:
-- - one GM participant max per session
-- - GM role must always expose GM status (and inverse for players)

alter table participants
  add constraint participants_role_status_coherence_check
  check (
    (role = 'gm' and current_status = 'gm')
    or
    (role = 'player' and current_status in ('ready', 'active', 'waiting', 'investigating', 'finished'))
  );

create unique index if not exists uq_participants_one_gm_per_session
  on participants(session_id)
  where role = 'gm';
