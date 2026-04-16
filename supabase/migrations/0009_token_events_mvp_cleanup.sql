-- MVP cleanup: keep token_events on canonical ledger columns only.

alter table if exists token_events
  drop column if exists delta,
  drop column if exists source_table,
  drop column if exists source_id,
  drop column if exists meta;
