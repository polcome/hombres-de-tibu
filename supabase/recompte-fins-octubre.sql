-- El recompte inicial 2026 passa a ser fins al 31/10/2026: s'hi treuen els entrenos de novembre,
-- que l'admin afegirà a mà a l'app (Admin → Afegir entrenos, sense marcar "recompte acumulat") perquè comptin al mes.
-- S'executa UN COP al SQL Editor de Supabase.

update trainings t
set count = t.count - v.n
from (values
  ('bernat','gym',2),
  ('come','gym',1), ('eduard','gym',1), ('marc','gym',1), ('deig','gym',1),
  ('come','fora',1), ('deig','fora',1)
) as v(slug, kind, n)
join members m on m.slug = v.slug
where t.member_id = m.id and t.kind = v.kind and t.baseline and t.date >= '2026-01-01';

update trainings set date = '2026-10-31' where baseline and date >= '2026-01-01';

-- Comprovació: recompte inicial (fins al 31/10) de cadascú
select m.name,
       sum(t.count) filter (where t.kind = 'gym')  as gym,
       sum(t.count) filter (where t.kind = 'fora') as fora
from members m left join trainings t on t.member_id = m.id and t.baseline and t.date >= '2026-01-01'
group by m.name order by m.name;
