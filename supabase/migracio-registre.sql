-- Registre d'activitat: tot el que s'afegeix, es canvia o s'esborra a l'app, i qui ho ha fet.
-- Només el pot llegir el superadmin (is_owner) i ningú el pot modificar ni esborrar des de l'app.
-- Respecta l'anonimat: qui publica expedients i comentaris no queda apuntat, i si l'autor anònim
-- esborra el seu expedient/comentari (amb el codi del mòbil) també surt com a anònim. Les paperetes no es registren.
-- Idempotent: es pot executar més d'un cop.

create table if not exists audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor_id   uuid references members(id) on delete set null,
  anonymous  boolean not null default false,
  tbl        text not null,
  op         text not null,           -- INSERT, UPDATE, DELETE
  row_id     text,
  old_data   jsonb,
  new_data   jsonb
);
create index if not exists audit_log_at on audit_log (at desc);
alter table audit_log enable row level security;
drop policy if exists "owner reads audit log" on audit_log;
create policy "owner reads audit log" on audit_log for select
  using (exists (select 1 from members where auth_id = auth.uid() and is_owner));

create or replace function audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  anon boolean := (tg_table_name in ('expedients', 'comments') and tg_op = 'INSERT')
               or coalesce(current_setting('tibu.anon', true), '') = '1';
  o jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  n jsonb := case when tg_op in ('UPDATE', 'INSERT') then to_jsonb(new) end;
begin
  -- No guardem el hash del codi d'esborrar (no aporta res)
  o := o - 'delete_token';
  n := n - 'delete_token';
  if tg_op = 'UPDATE' and o = n then return new; end if;
  insert into audit_log (actor_id, anonymous, tbl, op, row_id, old_data, new_data)
  values (case when anon then null else current_member_id() end, anon, tg_table_name, tg_op,
          coalesce(n ->> 'id', o ->> 'id', n ->> 'member_id', o ->> 'member_id'), o, n);
  return coalesce(new, old);
end $$;

-- Taules que es registren
do $$
declare t text;
begin
  foreach t in array array['trainings','expedients','comments','members','months','awards','achievements','card_photos','voters'] loop
    execute format('drop trigger if exists audit_%1$s on %1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on %1$I for each row execute function audit_row()', t);
  end loop;
end $$;

-- L'autor anònim que esborra el seu expedient/comentari continua sent anònim al registre
create or replace function delete_own_expedient(p_id uuid, p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('tibu.anon', '1', true);
  delete from expedients where id = p_id and delete_token = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if not found then raise exception 'Només pots esborrar els teus expedients (des del mòbil on els vas publicar)'; end if;
  perform set_config('tibu.anon', '', true);
end $$;

create or replace function delete_own_comment(p_id uuid, p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('tibu.anon', '1', true);
  delete from comments where id = p_id and delete_token = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if not found then raise exception 'Només pots esborrar els teus comentaris (des del mòbil on els vas escriure)'; end if;
  perform set_config('tibu.anon', '', true);
end $$;

notify pgrst, 'reload schema';
