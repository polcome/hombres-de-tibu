-- Dossier: cadascú només pot esborrar el que ha publicat ell (amb el codi del mòbil, RPC delete_own_*).
-- Els expedients i comentaris dels altres només els pot esborrar el superadmin (el Come); els altres admins, ja no.
-- Idempotent: es pot executar més d'un cop.

create or replace function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_owner from members where auth_id = auth.uid()), false)
$$;

drop policy if exists "admin deletes expedients" on expedients;
drop policy if exists "admin deletes comments" on comments;
drop policy if exists "owner deletes expedients" on expedients;
drop policy if exists "owner deletes comments" on comments;
create policy "owner deletes expedients" on expedients for delete using (is_owner());
create policy "owner deletes comments" on comments for delete using (is_owner());

notify pgrst, 'reload schema';
