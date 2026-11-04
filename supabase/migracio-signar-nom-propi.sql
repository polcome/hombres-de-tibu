-- Dossier: o anònim o signat amb el TEU nom (ja no es pot signar com un altre).
-- Expedients: si es demana signar, el nom el posa la BD (el de qui publica). Comentaris: l'autor ha de ser buit o el teu nom.
-- El que ja hi ha escrit no es toca. Idempotent: es pot executar més d'un cop.

-- Nom amb què signa qui ha entrat (sobrenom o nom), o null si no ha entrat
create or replace function signed_name() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(nickname), ''), name) from members where auth_id = auth.uid()
$$;

create or replace function post_expedient(p_month text, p_target uuid, p_kind text, p_text text, p_author text, p_id uuid default null, p_token_hash text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := current_member_id();
  today date := (now() at time zone 'Europe/Madrid')::date;
begin
  if me is null then raise exception 'Has d''entrar per publicar (continuarà sent anònim)'; end if;
  if (select count(*) from expedient_posts where member_id = me and day = today) >= 2 then
    raise exception 'Ja has publicat 2 expedients avui. Torna demà 😉';
  end if;
  insert into expedient_posts(member_id, day) values (me, today);
  -- Signat: sempre amb el nom de qui publica, digui el que digui p_author
  insert into expedients(id, month_id, target_id, kind, text, author, delete_token)
    values (coalesce(p_id, gen_random_uuid()), p_month, p_target, p_kind, trim(p_text),
            case when nullif(trim(coalesce(p_author, '')), '') is null then null else signed_name() end, p_token_hash);
end $$;

drop policy if exists "anyone writes comments" on comments;
create policy "anyone writes comments" on comments for insert
  with check (author is null or author = signed_name());

notify pgrst, 'reload schema';
