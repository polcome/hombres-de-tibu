-- Recompte inicial 2026 definitiu: entrenos fins al 31/10/2026 (gym, fora del gym).
-- Els de novembre en endavant s'apunten a l'app perquè comptin al mes.
-- Substitueix el recompte inicial que hi hagi; no toca els entrenos apuntats a l'app.

delete from trainings where baseline and date >= '2026-01-01';

insert into trainings (member_id, date, kind, count, baseline, note)
select m.id, date '2026-10-31', v.kind, v.n, true, 'Recompte inicial 2026'
from (values
  ('josep','gym',139),
  ('marc','gym',154),   ('marc','fora',29),
  ('eduard','gym',159), ('eduard','fora',35),
  ('come','gym',131),   ('come','fora',114),
  ('bernat','gym',159), ('bernat','fora',44),
  ('policho','gym',52), ('policho','fora',34),
  ('deig','gym',100),   ('deig','fora',143),
  ('jordi','gym',70),   ('jordi','fora',18),
  ('polsy','gym',88),   ('polsy','fora',73),
  ('pena','gym',32),    ('pena','fora',42),
  ('ferran','gym',43),  ('ferran','fora',2),
  ('fq','gym',47),      ('fq','fora',3),
  ('gerard','gym',16)
) as v(slug, kind, n)
join members m on m.slug = v.slug;

-- Comprovació: recompte inicial i entrenos ja apuntats a l'app aquest any
select m.name,
       sum(t.count) filter (where t.baseline and t.kind = 'gym')      as inicial_gym,
       sum(t.count) filter (where t.baseline and t.kind = 'fora')     as inicial_fora,
       sum(t.count) filter (where not t.baseline and t.kind = 'gym')  as app_gym,
       sum(t.count) filter (where not t.baseline and t.kind = 'fora') as app_fora
from members m left join trainings t on t.member_id = m.id and t.date >= '2026-01-01'
group by m.name order by m.name;
