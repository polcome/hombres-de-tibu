-- =====================================================================
--  Fotos per carta especial (TOTM, Icona, Pilota d'Or…)
--  Supabase → SQL Editor → enganxa-ho → Run (només cal fer-ho un cop)
-- =====================================================================

create table if not exists card_photos (
  member_id uuid not null references members(id) on delete cascade,
  card_key  text not null,          -- ex: 'totm:2026-07', 'icona:2026-09', 'bdo:2026'
  url       text not null,
  primary key (member_id, card_key)
);

alter table card_photos enable row level security;
drop policy if exists "read card photos" on card_photos;
drop policy if exists "admin card photos" on card_photos;
create policy "read card photos"  on card_photos for select using (true);
create policy "admin card photos" on card_photos for all using (is_admin()) with check (is_admin());
