-- =====================================================================
--  LOS HOMBRES DE TIBU · esquema de base de dades (Supabase / Postgres)
--  Enganxa aquest fitxer sencer a Supabase → SQL Editor → Run.
--  Després executa seed.sql.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Taules
-- ---------------------------------------------------------------------

create table if not exists members (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null check (slug ~ '^[a-z0-9_-]{2,30}$'),
  name       text not null,
  nickname   text,
  photo_url  text,
  is_admin   boolean not null default false,
  active     boolean not null default true,
  auth_id    uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Codis d'activació: només els veu l'admin
create table if not exists member_secrets (
  member_id   uuid primary key references members(id) on delete cascade,
  invite_code text not null
);

create table if not exists months (
  id       text primary key check (id ~ '^\d{4}-\d{2}$'),  -- 'YYYY-MM'
  status   text not null default 'active' check (status in ('active','voting','closed')),
  deadline timestamptz,
  acta     text
);

create table if not exists trainings (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members(id) on delete cascade,
  date       date not null default current_date,
  kind       text not null check (kind in ('gym','fora')),
  count      int  not null default 1 check (count between 1 and 1000),
  baseline   boolean not null default false,
  note       text,
  created_at timestamptz not null default now()
);

create table if not exists awards (
  id        uuid primary key default gen_random_uuid(),
  month_id  text not null references months(id) on delete cascade,
  type      text not null check (type in ('mvp','anti')),
  member_id uuid not null references members(id) on delete cascade,
  votes     int
);

create table if not exists expedients (
  id         uuid primary key default gen_random_uuid(),
  month_id   text not null,
  target_id  uuid not null references members(id) on delete cascade,
  kind       text not null check (kind in ('merit','falta')),
  text       text not null check (char_length(text) between 3 and 1000),
  author     text check (author is null or char_length(author) <= 40),
  reactions  jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists comments (
  id           uuid primary key default gen_random_uuid(),
  expedient_id uuid not null references expedients(id) on delete cascade,
  author       text check (author is null or char_length(author) <= 40),
  text         text not null check (char_length(text) between 1 and 500),
  created_at   timestamptz not null default now()
);

-- Paperetes: SENSE votant i SENSE data → no es poden relacionar amb ningú
create table if not exists ballots (
  id          uuid primary key default gen_random_uuid(),
  month_id    text not null references months(id) on delete cascade,
  mvp_id      uuid not null references members(id),
  mvp_reason  text not null,
  anti_id     uuid not null references members(id),
  anti_reason text not null,
  annulled    boolean not null default false
);

-- Qui ha votat (sense saber què)
create table if not exists voters (
  month_id  text not null references months(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  primary key (month_id, member_id)
);

-- ---------------------------------------------------------------------
-- Funcions auxiliars
-- ---------------------------------------------------------------------

create or replace function current_member_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from members where auth_id = auth.uid()
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from members where auth_id = auth.uid()), false)
$$;

-- Activació de compte: quan algú es registra, ha de portar slug + codi vàlids
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m_id uuid;
begin
  select m.id into m_id
  from members m join member_secrets s on s.member_id = m.id
  where m.slug = new.raw_user_meta_data->>'slug'
    and s.invite_code = new.raw_user_meta_data->>'code'
    and m.auth_id is null;
  if m_id is null then
    raise exception 'Codi d''activació incorrecte';
  end if;
  update members set auth_id = new.id where id = m_id;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------

create or replace function cast_vote(p_month text, p_mvp uuid, p_mvp_reason text, p_anti uuid, p_anti_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := current_member_id();
begin
  if me is null then raise exception 'Has d''iniciar sessió'; end if;
  if not exists (select 1 from months where id = p_month and status = 'voting') then
    raise exception 'La votació d''aquest mes no està oberta';
  end if;
  if exists (select 1 from voters where month_id = p_month and member_id = me) then
    raise exception 'Ja has votat aquest mes';
  end if;
  if p_mvp = me or p_anti = me then raise exception 'No et pots votar a tu mateix, crack'; end if;
  if p_mvp = p_anti then raise exception 'El MVP i l''anti no poden ser la mateixa persona'; end if;
  if char_length(trim(p_mvp_reason)) < 15 or char_length(trim(p_anti_reason)) < 15 then
    raise exception 'Els motius han de tenir mínim 15 caràcters';
  end if;
  insert into voters(month_id, member_id) values (p_month, me);
  insert into ballots(month_id, mvp_id, mvp_reason, anti_id, anti_reason)
    values (p_month, p_mvp, trim(p_mvp_reason), p_anti, trim(p_anti_reason));
end $$;

create or replace function close_month(p_month text)
returns void language plpgsql security definer set search_path = public as $$
declare
  t text;
begin
  if not is_admin() then raise exception 'Només admins'; end if;
  delete from awards where month_id = p_month;
  foreach t in array array['mvp','anti'] loop
    insert into awards(month_id, type, member_id, votes)
    with c as (
      select case when t = 'mvp' then mvp_id else anti_id end as member_id, count(*)::int as votes
      from ballots where month_id = p_month and not annulled
      group by 1
    )
    select p_month, t, member_id, votes from c
    where votes = (select max(votes) from c);
  end loop;
  update months set status = 'closed' where id = p_month;
end $$;

create or replace function react(p_expedient uuid, p_emoji text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_emoji not in ('😂','🔥','💀','👏','🤡') then raise exception 'Emoji no permès'; end if;
  update expedients
    set reactions = jsonb_set(reactions, array[p_emoji], to_jsonb(coalesce((reactions->>p_emoji)::int, 0) + 1))
    where id = p_expedient;
end $$;

create or replace function admin_reset_member(p_member uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  a uuid;
  c text := upper(substr(md5(gen_random_uuid()::text), 1, 6));
begin
  if not is_admin() then raise exception 'Només admins'; end if;
  select auth_id into a from members where id = p_member;
  update members set auth_id = null where id = p_member;
  if a is not null then delete from auth.users where id = a; end if;
  insert into member_secrets(member_id, invite_code) values (p_member, c)
    on conflict (member_id) do update set invite_code = excluded.invite_code;
  return c;
end $$;

-- Codi automàtic per a cada membre nou
create or replace function new_member_secret() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into member_secrets(member_id, invite_code)
    values (new.id, upper(substr(md5(gen_random_uuid()::text), 1, 6)))
    on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_member_created on members;
create trigger on_member_created after insert on members
  for each row execute function new_member_secret();

-- ---------------------------------------------------------------------
-- Seguretat (Row Level Security)
-- ---------------------------------------------------------------------

alter table members        enable row level security;
alter table member_secrets enable row level security;
alter table months         enable row level security;
alter table trainings      enable row level security;
alter table awards         enable row level security;
alter table expedients     enable row level security;
alter table comments       enable row level security;
alter table ballots        enable row level security;
alter table voters         enable row level security;

-- Lectura pública (qualsevol amb l'enllaç)
create policy "read members"    on members    for select using (true);
create policy "read months"     on months     for select using (true);
create policy "read trainings"  on trainings  for select using (true);
create policy "read awards"     on awards     for select using (true);
create policy "read expedients" on expedients for select using (true);
create policy "read comments"   on comments   for select using (true);
create policy "read voters"     on voters     for select using (true);
-- Paperetes: visibles quan el mes està tancat (l'admin les veu sempre, anònimes)
create policy "read ballots" on ballots for select
  using (is_admin() or exists (select 1 from months m where m.id = month_id and m.status = 'closed'));

-- Expedients i comentaris: qualsevol, fins i tot sense sessió
create policy "anyone writes expedients" on expedients for insert with check (reactions = '{}'::jsonb);
create policy "anyone writes comments"   on comments   for insert with check (true);
create policy "admin deletes expedients" on expedients for delete using (is_admin());
create policy "admin deletes comments"   on comments   for delete using (is_admin());

-- Entrenaments: cadascú els seus (l'admin, de tothom)
create policy "own trainings insert" on trainings for insert
  with check ((member_id = current_member_id() and baseline = false) or is_admin());
create policy "own trainings delete" on trainings for delete
  using ((member_id = current_member_id() and baseline = false) or is_admin());

-- Admin
create policy "admin members"  on members        for all using (is_admin()) with check (is_admin());
create policy "admin secrets"  on member_secrets for select using (is_admin());
create policy "admin months"   on months         for all using (is_admin()) with check (is_admin());
create policy "admin awards"   on awards         for all using (is_admin()) with check (is_admin());
create policy "admin ballots"  on ballots        for update using (is_admin()) with check (is_admin());
create policy "admin voters"   on voters         for delete using (is_admin());

-- ---------------------------------------------------------------------
-- Fotos (Storage)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy "public avatars"      on storage.objects for select using (bucket_id = 'avatars');
create policy "admin upload avatar" on storage.objects for insert with check (bucket_id = 'avatars' and is_admin());
create policy "admin update avatar" on storage.objects for update using (bucket_id = 'avatars' and is_admin());
create policy "admin delete avatar" on storage.objects for delete using (bucket_id = 'avatars' and is_admin());
