-- =====================================================================
--  Palmarès històric 2025 (només per al palmarès: no dona cartes, CARDS_FROM = '2026-01')
--  L'anti-MVP es va començar a votar al març.
--  Supabase → SQL Editor → enganxa-ho → Run
--  Es pot executar més d'un cop: esborra i torna a crear aquests mesos.
-- =====================================================================

insert into months (id, status) values
  ('2025-01','closed'), ('2025-02','closed'), ('2025-03','closed'),
  ('2025-04','closed'), ('2025-05','closed'), ('2025-06','closed'),
  ('2025-07','closed'), ('2025-08','closed'), ('2025-09','closed'),
  ('2025-10','closed'), ('2025-11','closed'), ('2025-12','closed')
on conflict (id) do update set status = 'closed';

delete from awards where month_id between '2025-01' and '2025-12';

insert into awards (month_id, type, member_id)
select v.month_id, v.type, m.id
from (values
  ('2025-01','mvp','deig'),                                   -- Arnau Deig
  ('2025-02','mvp','jordi'),                                  -- Jordi Borderies
  ('2025-03','mvp','bernat'),  ('2025-03','anti','marc'),     -- Bernat Aloy / Marc Sierra
  ('2025-04','mvp','deig'),    ('2025-04','anti','policho'),  -- Arnau Deig / Pol Guerra
  ('2025-05','mvp','come'),    ('2025-05','anti','josep'),    -- Pol Come / Josep Pareja
  ('2025-06','mvp','policho'), ('2025-06','anti','pena'),     -- Pol Guerra / Andrés Peña
  ('2025-07','mvp','polsy'),   ('2025-07','anti','bernat'),   -- Pol Sainz / Bernat Aloy
  ('2025-08','mvp','bernat'),  ('2025-08','anti','marc'),     -- Bernat Aloy / Marc Sierra
  ('2025-09','mvp','ferran'),  ('2025-09','anti','josep'),    -- Ferran / Josep Pareja
  ('2025-10','mvp','pena'),    ('2025-10','anti','gerard'),   -- Andrés Peña / Gerard Morales
  ('2025-11','mvp','gerard'),  ('2025-11','anti','josep'),    -- Gerard Morales / Josep Pareja
  ('2025-12','mvp','bernat'),  ('2025-12','anti','jordi')     -- Bernat Aloy / Jordi Borderies
) as v(month_id, type, slug)
join members m on m.slug = v.slug;

-- Comprovació: han de sortir 22 files (12 MVPs + 10 antis)
select a.month_id, a.type, m.name from awards a join members m on m.id = a.member_id
where a.month_id between '2025-01' and '2025-12' order by a.month_id, a.type desc;
