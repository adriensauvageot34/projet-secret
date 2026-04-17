alter table participants
  add constraint participants_session_id_id_unique unique (session_id, id);

create table participant_reserve_offers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  participant_id uuid not null,
  element_template_id uuid not null references element_templates(id),
  offered_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  replaced_by_offer_id uuid references participant_reserve_offers(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint participant_reserve_offers_participant_session_fkey
    foreign key (session_id, participant_id)
    references participants(session_id, id)
    on delete cascade,
  constraint participant_reserve_offers_revocation_order_check
    check (revoked_at is null or revoked_at >= offered_at),
  constraint participant_reserve_offers_replacement_requires_revocation_check
    check (replaced_by_offer_id is null or revoked_at is not null)
);

create unique index participant_reserve_offers_session_template_visible_unique
  on participant_reserve_offers (session_id, element_template_id)
  where revoked_at is null;

create unique index participant_reserve_offers_participant_template_visible_unique
  on participant_reserve_offers (session_id, participant_id, element_template_id)
  where revoked_at is null;

create index participant_reserve_offers_participant_visible_idx
  on participant_reserve_offers (participant_id, offered_at)
  where revoked_at is null;

create trigger trg_participant_reserve_offers_set_updated_at
before update on participant_reserve_offers
for each row
execute function set_updated_at();
