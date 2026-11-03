-- Actualitza el recompte d'entrenos 2026 a 3/11/2026 (s'executa UN COP al SQL Editor de Supabase).
-- El recompte inicial (baseline) s'ajusta perquè el TOTAL de l'any (recompte inicial + entrenos apuntats a l'app)
-- quedi igual que el recompte del WhatsApp. Els entrenos apuntats a l'app no es toquen.

begin;

create temp table objectiu (slug text, kind text, n int) on commit drop;
insert into objectiu values
  ('josep','gym',139),  ('josep','fora',0),
  ('marc','gym',155),   ('marc','fora',29),
  ('eduard','gym',160), ('eduard','fora',35),
  ('come','gym',132),   ('come','fora',115),
  ('bernat','gym',161), ('bernat','fora',44),
  ('policho','gym',52), ('policho','fora',34),
  ('deig','gym',101),   ('deig','fora',144),
  ('jordi','gym',70),   ('jordi','fora',18),
  ('polsy','gym',88),   ('polsy','fora',73),
  ('pena','gym',32),    ('pena','fora',42),
  ('ferran','gym',43),  ('ferran','fora',2),
  ('fq','gym',47),      ('fq','fora',3),
  ('gerard','gym',16),  ('gerard','fora',0);

-- Recompte inicial nou = objectiu − el que ja s'ha apuntat a l'app aquest any
create temp table nou on commit drop as
select m.id as member_id, o.kind, o.n as objectiu,
       coalesce((select sum(t.count) from trainings t
                 where t.member_id = m.id and t.kind = o.kind and not t.baseline and t.date >= '2026-01-01'), 0)::int as app
from objectiu o join members m on m.slug = o.slug;

delete from trainings where baseline and date >= '2026-01-01';
insert into trainings (member_id, date, kind, count, baseline, note)
select member_id, date '2026-11-03', kind, objectiu - app, true, 'Recompte inicial 2026'
from nou where objectiu - app > 0;

-- Resultat: total de l'any per membre (ha de quadrar amb el WhatsApp)
select m.name, n.kind, n.objectiu, n.app as apuntats_app, greatest(n.objectiu - n.app, 0) as recompte_inicial,
       case when n.app > n.objectiu then '⚠️ a l''app n''hi ha més que al recompte' else '' end as avis
from nou n join members m on m.id = n.member_id
order by m.name, n.kind;

commit;
