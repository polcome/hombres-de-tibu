-- =====================================================================
--  Palmarès històric 2026 (gener–setembre)
--  Supabase → SQL Editor → enganxa-ho → Run
--  Es pot executar més d'un cop: esborra i torna a crear aquests mesos.
-- =====================================================================

insert into months (id, status) values
  ('2026-01','closed'), ('2026-02','closed'), ('2026-03','closed'),
  ('2026-04','closed'), ('2026-05','closed'), ('2026-06','closed'),
  ('2026-07','closed'), ('2026-08','closed'), ('2026-09','closed')
on conflict (id) do update set status = 'closed';

delete from awards where month_id between '2026-01' and '2026-09';

insert into awards (month_id, type, member_id)
select v.month_id, v.type, m.id
from (values
  ('2026-01','mvp','come'),    ('2026-01','anti','gerard'),   -- Pol Come / Gerard Morales
  ('2026-02','mvp','eduard'),  ('2026-02','anti','marc'),     -- Eduard Papaseit / Marc Sierra
  ('2026-03','mvp','deig'),    ('2026-03','anti','josep'),    -- Arnau Deig / Josep Pareja
  ('2026-04','mvp','josep'),   ('2026-04','anti','policho'),  -- Josep Pareja / Policho
  ('2026-05','mvp','deig'),    ('2026-05','anti','fq'),       -- Arnau Deig / Ferran Quintana
  ('2026-06','mvp','polsy'),   ('2026-06','anti','fq'),       -- Pol Sainz / Ferran Quintana
  ('2026-07','mvp','come'),    ('2026-07','anti','gerard'),   -- Pol Come / Gerard Morales
  ('2026-08','mvp','ferran'),  ('2026-08','anti','deig'),     -- Ferran Mateu Dos Santos / Arnau Deig
  ('2026-09','mvp','josep'),   ('2026-09','anti','marc')      -- Josep Pareja / Marc Sierra
) as v(month_id, type, slug)
join members m on m.slug = v.slug;

-- Comprovació: han de sortir 18 files
select a.month_id, a.type, m.name from awards a join members m on m.id = a.member_id
where a.month_id between '2026-01' and '2026-09' order by 1, 2 desc;
