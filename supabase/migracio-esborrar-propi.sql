-- Cadascú pot esborrar els seus expedients i comentaris sense trencar l'anonimat:
-- en publicar, el mòbil genera un codi secret i a la BD només se'n guarda el hash (no qui l'ha publicat).
-- Per esborrar cal tornar el codi, que només té el mòbil de qui ho va publicar.
-- Idempotent: es pot executar més d'un cop.

alter table expedients add column if not exists delete_token text;
alter table comments   add column if not exists delete_token text;

-- post_expedient amb id i hash del codi (el client tria l'id per poder recordar quins són seus)
drop function if exists post_expedient(text, uuid, text, text, text);
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
  insert into expedients(id, month_id, target_id, kind, text, author, delete_token)
    values (coalesce(p_id, gen_random_uuid()), p_month, p_target, p_kind, trim(p_text), nullif(trim(coalesce(p_author, '')), ''), p_token_hash);
end $$;

create or replace function delete_own_expedient(p_id uuid, p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from expedients where id = p_id and delete_token = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if not found then raise exception 'Només pots esborrar els teus expedients (des del mòbil on els vas publicar)'; end if;
end $$;

create or replace function delete_own_comment(p_id uuid, p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from comments where id = p_id and delete_token = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if not found then raise exception 'Només pots esborrar els teus comentaris (des del mòbil on els vas escriure)'; end if;
end $$;

notify pgrst, 'reload schema';
