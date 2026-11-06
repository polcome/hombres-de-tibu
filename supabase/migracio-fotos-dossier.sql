-- Foto opcional als expedients. Es guarda a la BD (expedient_photos) i no al Storage, perquè el Storage
-- apunta qui puja cada fitxer i trencaria l'anonimat del xivato. L'app només la baixa quan algú la toca.
-- Idempotent: es pot executar més d'un cop.

alter table expedients add column if not exists has_photo boolean not null default false;

create table if not exists expedient_photos (
  expedient_id uuid primary key references expedients(id) on delete cascade,
  data text not null check (data like 'data:image/jpeg;base64,%' and length(data) < 700000)
);
alter table expedient_photos enable row level security;
drop policy if exists "read expedient photos" on expedient_photos;
create policy "read expedient photos" on expedient_photos for select using (true);
-- (sense política d'insert: només es pot afegir amb post_expedient)

drop function if exists post_expedient(text, uuid, text, text, text, uuid, text);
create or replace function post_expedient(p_month text, p_target uuid, p_kind text, p_text text, p_author text,
  p_id uuid default null, p_token_hash text default null, p_photo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := current_member_id();
  today date := (now() at time zone 'Europe/Madrid')::date;
  new_id uuid := coalesce(p_id, gen_random_uuid());
begin
  if me is null then raise exception 'Has d''entrar per publicar (continuarà sent anònim)'; end if;
  if (select count(*) from expedient_posts where member_id = me and day = today) >= 2 then
    raise exception 'Ja has publicat 2 expedients avui. Torna demà 😉';
  end if;
  insert into expedient_posts(member_id, day) values (me, today);
  -- Signat: sempre amb el nom de qui publica, digui el que digui p_author
  insert into expedients(id, month_id, target_id, kind, text, author, delete_token, has_photo)
    values (new_id, p_month, p_target, p_kind, trim(p_text),
            case when nullif(trim(coalesce(p_author, '')), '') is null then null else signed_name() end, p_token_hash, p_photo is not null);
  if p_photo is not null then
    insert into expedient_photos(expedient_id, data) values (new_id, p_photo);
  end if;
end $$;

notify pgrst, 'reload schema';
