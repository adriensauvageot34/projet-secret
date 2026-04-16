-- Add public participant slug for player-facing share links.
alter table participants
  add column if not exists public_slug text;

with slug_candidates as (
  select
    id,
    coalesce(
      nullif(
        regexp_replace(lower(display_name), '[^a-z0-9]+', '-', 'g'),
        ''
      ),
      'player'
    ) as slug_base,
    substring(replace(id::text, '-', '') from 1 for 4) as slug_suffix
  from participants
)
update participants p
set public_slug = concat(sc.slug_base, '-', sc.slug_suffix)
from slug_candidates sc
where p.id = sc.id
  and (p.public_slug is null or p.public_slug = '');

alter table participants
  alter column public_slug set not null,
  add constraint participants_public_slug_unique unique (public_slug),
  add constraint participants_public_slug_format_check
    check (public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{4}$');

create index if not exists idx_participants_public_slug
  on participants(public_slug);
