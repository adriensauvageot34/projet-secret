-- Guardrail: one accusation_correct token reward max per accusation.
create unique index if not exists uq_token_events_accusation_correct_once
  on token_events(related_accusation_id)
  where event_type = 'accusation_correct' and related_accusation_id is not null;
