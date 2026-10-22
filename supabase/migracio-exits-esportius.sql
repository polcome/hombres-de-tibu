-- =====================================================================
--  Èxits esportius (cartes manuals: ascens, mitja marató, marató, hyrox)
--  Supabase → SQL Editor → enganxa-ho → Run (només cal fer-ho un cop)
-- =====================================================================

create table if not exists achievements (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members(id) on delete cascade,
  kind       text not null check (kind in ('ascens','mitja','marato','hyrox')),
  event      text not null check (char_length(event) between 2 and 80),
  date       date not null,
  created_at timestamptz not null default now()
);

alter table achievements enable row level security;
drop policy if exists "read achievements" on achievements;
drop policy if exists "admin achievements" on achievements;
create policy "read achievements"  on achievements for select using (true);
create policy "admin achievements" on achievements for all using (is_admin()) with check (is_admin());
