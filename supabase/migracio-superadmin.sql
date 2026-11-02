-- Superadmin: el Come (slug 'come') és el propietari. Els altres admins no li poden treure l'admin,
-- desactivar-lo, reiniciar-li el compte ni esborrar-lo. I només ell pot donar o treure l'admin.
-- No surt enlloc de l'app. Des del SQL Editor (sense sessió) no hi ha cap restricció.
-- Idempotent: es pot executar més d'un cop.

alter table members add column if not exists is_owner boolean not null default false;
update members set is_owner = true, is_admin = true where slug = 'come';

create or replace function protect_owner() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  owner_me boolean := coalesce((select is_owner from members where auth_id = auth.uid()), false);
begin
  -- SQL Editor, alta de comptes, etc. (sense sessió d'usuari): permès
  if auth.uid() is null then return coalesce(new, old); end if;

  if tg_op = 'DELETE' then
    if old.is_owner then raise exception 'Aquest membre no es pot esborrar'; end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.is_owner or (new.is_admin and not owner_me) then raise exception 'Només el Come pot fer admins'; end if;
    return new;
  end if;

  if new.is_owner is distinct from old.is_owner then raise exception 'Això no es pot canviar'; end if;
  if new.is_admin is distinct from old.is_admin and not owner_me then
    raise exception 'Només el Come pot donar o treure l''admin';
  end if;
  if old.is_owner and not owner_me and (
    new.active is distinct from old.active or new.auth_id is distinct from old.auth_id or new.slug is distinct from old.slug
  ) then
    raise exception 'Al Come no li pots tocar això 😏';
  end if;
  return new;
end $$;

drop trigger if exists protect_owner on members;
create trigger protect_owner before insert or update or delete on members
  for each row execute function protect_owner();

notify pgrst, 'reload schema';
