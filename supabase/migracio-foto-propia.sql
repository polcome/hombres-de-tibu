-- Cadascú pot posar-se la seva foto de perfil (la de la carta base). Les fotos de les cartes especials continuen sent cosa dels admins.
-- Idempotent: es pot executar més d'un cop.

-- Pujar fitxers només dins la carpeta pròpia del bucket avatars (<member_id>/...)
drop policy if exists "own upload avatar" on storage.objects;
create policy "own upload avatar" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = current_member_id()::text);

-- Canviar la foto base: la pròpia o, si ets admin, la de qualsevol. La URL ha de ser del bucket avatars i de la carpeta del membre.
create or replace function set_member_photo(p_member uuid, p_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (p_member = current_member_id() or is_admin()) then raise exception 'Només pots canviar la teva foto'; end if;
  if p_url is not null and p_url not like '%/storage/v1/object/public/avatars/' || p_member::text || '/%' then
    raise exception 'Foto no vàlida';
  end if;
  update members set photo_url = p_url where id = p_member;
end $$;

notify pgrst, 'reload schema';
