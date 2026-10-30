-- Desempats: MVP → guanya qui tingui menys vots d'anti aquell mes; anti-MVP → se l'emporta qui tingui menys vots de MVP.
-- Si continuen empatats, guanyen tots. Idempotent: es pot executar més d'un cop.

create or replace function close_month(p_month text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Només admins'; end if;
  delete from awards where month_id = p_month;

  -- MVP: més vots de MVP i, en cas d'empat, menys vots d'anti
  insert into awards(month_id, type, member_id, votes)
  with b as (select * from ballots where month_id = p_month and not annulled),
  c as (
    select m.member_id, m.votes, (select count(*) from b where b.anti_id = m.member_id) as other
    from (select mvp_id as member_id, count(*)::int as votes from b group by 1) m
  ),
  top as (select * from c where votes = (select max(votes) from c))
  select p_month, 'mvp', member_id, votes from top
  where other = (select min(other) from top);

  -- Anti-MVP: més vots d'anti i, en cas d'empat, menys vots de MVP
  insert into awards(month_id, type, member_id, votes)
  with b as (select * from ballots where month_id = p_month and not annulled),
  c as (
    select a.member_id, a.votes, (select count(*) from b where b.mvp_id = a.member_id) as other
    from (select anti_id as member_id, count(*)::int as votes from b group by 1) a
  ),
  top as (select * from c where votes = (select max(votes) from c))
  select p_month, 'anti', member_id, votes from top
  where other = (select min(other) from top);

  update months set status = 'closed' where id = p_month;
end $$;

notify pgrst, 'reload schema';
