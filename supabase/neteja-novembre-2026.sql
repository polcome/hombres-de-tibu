-- Neteja per començar de debò (2 de novembre de 2026). S'executa UN SOL COP al SQL Editor de Supabase.
-- · Esborra tot el dossier de prova (expedients, comentaris, reaccions i límits diaris)
-- · Esborra tots els entrenos (de prova i recompte antic) i posa el recompte actual com a recompte inicial
-- · Octubre: MVP Ferran (FMDS) i anti Policho, mes tancat i novembre obert
-- Les fotos, els membres, els comptes i el palmarès de gener a setembre no es toquen.

begin;

-- 1. Dossier
delete from expedients;          -- esborra també comentaris i reaccions (on delete cascade)
delete from comments;
delete from expedient_posts;

-- 2. Entrenos: recompte acumulat 2026 fins avui (gym, fora del gym)
delete from trainings;           -- esborra també les validacions ✅/🧢
insert into trainings (member_id, date, kind, count, baseline, note)
select m.id, date '2026-11-02', v.kind, v.n, true, 'Recompte inicial 2026'
from (values
  ('josep','gym',139),
  ('marc','gym',154),   ('marc','fora',29),
  ('eduard','gym',159), ('eduard','fora',35),
  ('come','gym',131),   ('come','fora',114),
  ('bernat','gym',159), ('bernat','fora',43),
  ('policho','gym',52), ('policho','fora',34),
  ('deig','gym',100),   ('deig','fora',142),
  ('jordi','gym',70),   ('jordi','fora',18),
  ('polsy','gym',88),   ('polsy','fora',73),
  ('pena','gym',32),    ('pena','fora',42),
  ('ferran','gym',43),  ('ferran','fora',2),
  ('fq','gym',47),      ('fq','fora',3),
  ('gerard','gym',16)
) as v(slug, kind, n)
join members m on m.slug = v.slug;

-- 3. Octubre: guanyadors posats a mà, sense paperetes de prova
delete from months where id = '2025-11';  -- mes de prova de l'acta, per si encara hi és
delete from ballots where month_id = '2026-10';
delete from voters  where month_id = '2026-10';
insert into months (id, status) values ('2026-10', 'closed')
  on conflict (id) do update set status = 'closed', acta = null, acta_style = null;
delete from awards where month_id = '2026-10';
insert into awards (month_id, type, member_id, votes)
select '2026-10', 'mvp',  id, null::int from members where slug = 'ferran'
union all
select '2026-10', 'anti', id, null::int from members where slug = 'policho';

-- 4. Novembre en joc
insert into months (id, status) values ('2026-11', 'active') on conflict (id) do nothing;

commit;
