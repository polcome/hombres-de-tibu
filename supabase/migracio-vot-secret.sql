-- Vot secret de debò: ningú (ni l'admin des de l'app) veu les paperetes fins que es tanca el mes,
-- i l'admin pot esborrar un vot perquè la persona torni a votar (s'esborra també la seva papereta).
-- Idempotent: es pot executar més d'un cop.

-- Enllaç ocult votant → papereta. Sense cap política de lectura: des de l'app no el pot llegir ningú,
-- només les funcions de més avall. En tancar el mes s'esborra i el vot queda anònim per sempre.
create table if not exists ballot_links (
  month_id  text not null references months(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  ballot_id uuid not null references ballots(id) on delete cascade,
  primary key (month_id, member_id)
);
alter table ballot_links enable row level security;

-- Paperetes: només visibles quan el mes està tancat (abans les veia l'admin)
drop policy if exists "read ballots" on ballots;
create policy "read ballots" on ballots for select
  using (exists (select 1 from months m where m.id = month_id and m.status = 'closed'));

-- Els votants només es poden esborrar amb admin_remove_vote (així s'esborra també la papereta)
drop policy if exists "admin voters" on voters;
-- Anul·lar paperetes ja no té sentit (l'admin no les veu)
drop policy if exists "admin ballots" on ballots;

create or replace function cast_vote(p_month text, p_mvp uuid, p_mvp_reason text, p_anti uuid, p_anti_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := current_member_id();
  b uuid;
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
    values (p_month, p_mvp, trim(p_mvp_reason), p_anti, trim(p_anti_reason))
    returning id into b;
  insert into ballot_links(month_id, member_id, ballot_id) values (p_month, me, b);
end $$;

-- Esborra el vot d'algú (votant + papereta) perquè pugui tornar a votar
create or replace function admin_remove_vote(p_month text, p_member uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Només admins'; end if;
  if exists (select 1 from months where id = p_month and status = 'closed') then
    raise exception 'Aquest mes ja està tancat';
  end if;
  delete from ballots where id in (select ballot_id from ballot_links where month_id = p_month and member_id = p_member);
  delete from ballot_links where month_id = p_month and member_id = p_member;
  delete from voters where month_id = p_month and member_id = p_member;
end $$;

-- Comprovació per a l'admin: cada votant té la seva papereta guardada? (no diu quina)
create or replace function vote_check(p_month text)
returns table(member_id uuid, ok boolean) language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Només admins'; end if;
  return query
    select v.member_id, exists (
      select 1 from ballot_links l join ballots b on b.id = l.ballot_id
      where l.month_id = v.month_id and l.member_id = v.member_id
    )
    from voters v where v.month_id = p_month;
end $$;

-- En tancar el mes es calculen els guanyadors i s'esborra l'enllaç: ja no es pot saber qui ha votat què
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
  delete from ballot_links where month_id = p_month;
end $$;

notify pgrst, 'reload schema';
