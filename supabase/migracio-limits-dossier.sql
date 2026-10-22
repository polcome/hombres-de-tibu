-- =====================================================================
--  Dossier sense spam: màxim 2 expedients al dia per usuari i
--  una sola reacció per usuari a cada expedient.
--  Supabase → SQL Editor → enganxa-ho → Run (només cal fer-ho un cop)
-- =====================================================================

-- Qui ha publicat quin dia (SENSE dir quin expedient: el xivato continua sent anònim)
create table if not exists expedient_posts (
  id        uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  day       date not null
);
alter table expedient_posts enable row level security;
drop policy if exists "own expedient posts" on expedient_posts;
create policy "own expedient posts" on expedient_posts for select using (member_id = current_member_id());

-- Ja no es pot inserir directament: només amb la funció post_expedient
drop policy if exists "anyone writes expedients" on expedients;

create or replace function post_expedient(p_month text, p_target uuid, p_kind text, p_text text, p_author text)
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
  insert into expedients(month_id, target_id, kind, text, author)
    values (p_month, p_target, p_kind, trim(p_text), nullif(trim(coalesce(p_author, '')), ''));
end $$;

-- Reaccions: una per usuari i expedient (tocar la mateixa la treu, tocar-ne una altra la canvia)
create table if not exists expedient_reactions (
  expedient_id uuid not null references expedients(id) on delete cascade,
  member_id    uuid not null references members(id) on delete cascade,
  emoji        text not null check (emoji in ('😂','🔥','💀','👏','🤡')),
  primary key (expedient_id, member_id)
);
alter table expedient_reactions enable row level security;
drop policy if exists "read expedient reactions" on expedient_reactions;
create policy "read expedient reactions" on expedient_reactions for select using (true);

create or replace function react(p_expedient uuid, p_emoji text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := current_member_id();
  cur text;
begin
  if me is null then raise exception 'Has d''entrar per reaccionar'; end if;
  if p_emoji not in ('😂','🔥','💀','👏','🤡') then raise exception 'Emoji no permès'; end if;
  select emoji into cur from expedient_reactions where expedient_id = p_expedient and member_id = me;
  if cur = p_emoji then
    delete from expedient_reactions where expedient_id = p_expedient and member_id = me;
  else
    insert into expedient_reactions(expedient_id, member_id, emoji) values (p_expedient, me, p_emoji)
      on conflict (expedient_id, member_id) do update set emoji = excluded.emoji;
  end if;
end $$;

-- Les reaccions antigues (inflades a base de clics) es posen a zero
update expedients set reactions = '{}'::jsonb;

notify pgrst, 'reload schema';
