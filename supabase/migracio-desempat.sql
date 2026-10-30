-- Desempat del MVP: si n'hi ha més d'un amb el màxim de vots, guanya qui tingui menys vots d'anti aquell mes.
-- Si continuen empatats, guanyen tots. L'anti-MVP no té desempat (en cas d'empat, guanyen tots).
-- Idempotent: es pot executar més d'un cop.

create or replace function close_month(p_month text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Només admins'; end if;
  delete from awards where month_id = p_month;

  -- MVP: més vots de MVP i, en cas d'empat, menys vots d'anti
  insert into awards(month_id, type, member_id, votes)
  with b as (select * from ballots where month_id = p_month and not annulled),
  c as (
    select m.member_id, m.votes, (select count(*) from b where b.anti_id = m.member_id) as antis
    from (select mvp_id as member_id, count(*)::int as votes from b group by 1) m
  ),
  top as (select * from c where votes = (select max(votes) from c))
  select p_month, 'mvp', member_id, votes from top
  where antis = (select min(antis) from top);

  -- Anti-MVP: més vots d'anti (en cas d'empat, guanyen tots)
  insert into awards(month_id, type, member_id, votes)
  with c as (
    select anti_id as member_id, count(*)::int as votes
    from ballots where month_id = p_month and not annulled
    group by 1
  )
  select p_month, 'anti', member_id, votes from c
  where votes = (select max(votes) from c);

  update months set status = 'closed' where id = p_month;
end $$;

notify pgrst, 'reload schema';
