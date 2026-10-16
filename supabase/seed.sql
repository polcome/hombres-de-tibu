-- =====================================================================
--  Dades inicials: membres + recompte d'entrenaments 2026 + mes actual
--  Executa-ho DESPRÉS de schema.sql.
-- =====================================================================

insert into members (slug, name) values
  ('josep',   'Josep'),
  ('marc',    'Marc'),
  ('eduard',  'Eduard'),
  ('come',    'Come'),
  ('bernat',  'Bernat'),
  ('policho', 'Policho'),
  ('deig',    'Deig'),
  ('jordi',   'Jordi'),
  ('polsy',   'Polsy'),
  ('pena',    'Peña'),
  ('ferran',  'Ferran'),
  ('fq',      'FQ'),
  ('gerard',  'Gerard')
on conflict (slug) do nothing;

-- Recompte acumulat 2026 fins al 16/10 (gym, fora del gym)
insert into trainings (member_id, date, kind, count, baseline, note)
select m.id, date '2026-10-16', v.kind, v.n, true, 'Recompte inicial 2026'
from (values
  ('josep','gym',131),
  ('marc','gym',144),   ('marc','fora',28),
  ('eduard','gym',150), ('eduard','fora',33),
  ('come','gym',127),   ('come','fora',107),
  ('bernat','gym',147), ('bernat','fora',42),
  ('policho','gym',49), ('policho','fora',33),
  ('deig','gym',93),    ('deig','fora',136),
  ('jordi','gym',65),   ('jordi','fora',12),
  ('polsy','gym',86),   ('polsy','fora',67),
  ('pena','gym',32),    ('pena','fora',42),
  ('ferran','gym',35),  ('ferran','fora',2),
  ('fq','gym',47),      ('fq','fora',3),
  ('gerard','gym',16)
) as v(slug, kind, n)
join members m on m.slug = v.slug;

insert into months (id, status, deadline) values
  ('2026-10', 'active', '2026-11-01 22:00:00+01')
on conflict (id) do nothing;

-- Admin: Come
update members set is_admin = true where slug = 'come';
