-- Guarda quin estil ha fet servir la IA per a l'acta de cada mes, per triar-ne un a l'atzar sense repetir.
-- Idempotent: es pot executar més d'un cop.
alter table months add column if not exists acta_style text;

notify pgrst, 'reload schema';
