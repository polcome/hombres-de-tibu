-- Fotos de prova d'una sola visualització PER USUARI: es guarda qui ha obert cada foto.
-- Cadascú només veu i apunta les seves. Idempotent: es pot executar més d'un cop.

create table if not exists training_views (
  training_id uuid not null references trainings(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  seen_at     timestamptz not null default now(),
  primary key (training_id, member_id)
);
alter table training_views enable row level security;
drop policy if exists "own training views read" on training_views;
drop policy if exists "own training views insert" on training_views;
create policy "own training views read" on training_views for select using (member_id = current_member_id());
create policy "own training views insert" on training_views for insert with check (member_id = current_member_id());

notify pgrst, 'reload schema';
