-- =====================================================================
--  Fotos de prova dels entrenos + validació del grup
--  Supabase → SQL Editor → enganxa-ho → Run (només cal fer-ho un cop)
-- =====================================================================

alter table trainings add column if not exists photo_url text;

-- Validacions: cada membre pot marcar un entreno d'un altre com a vàlid (ok) o dubtós (fake)
create table if not exists training_votes (
  training_id uuid not null references trainings(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  vote        text not null check (vote in ('ok','fake')),
  primary key (training_id, member_id)
);
alter table training_votes enable row level security;
drop policy if exists "read training votes" on training_votes;
drop policy if exists "own training votes" on training_votes;
create policy "read training votes" on training_votes for select using (true);
create policy "own training votes" on training_votes for all
  using (member_id = current_member_id())
  with check (
    member_id = current_member_id()
    and not exists (select 1 from trainings t where t.id = training_id and t.member_id = current_member_id())
  );

-- Bucket per a les fotos de prova: cadascú puja a la seva carpeta
insert into storage.buckets (id, name, public) values ('proofs', 'proofs', true)
  on conflict (id) do nothing;
drop policy if exists "public proofs" on storage.objects;
drop policy if exists "own proofs upload" on storage.objects;
drop policy if exists "own proofs delete" on storage.objects;
create policy "public proofs" on storage.objects for select using (bucket_id = 'proofs');
create policy "own proofs upload" on storage.objects for insert
  with check (bucket_id = 'proofs' and ((storage.foldername(name))[1] = current_member_id()::text or is_admin()));
create policy "own proofs delete" on storage.objects for delete
  using (bucket_id = 'proofs' and ((storage.foldername(name))[1] = current_member_id()::text or is_admin()));
