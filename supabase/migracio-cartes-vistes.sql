-- Cartes que cada membre ja ha "obert" (animació del sobre). Cadascú només veu i apunta les seves.
-- La fila especial '__init__' vol dir que ja s'han marcat com a vistes les cartes que tenia abans d'estrenar els sobres.
-- Idempotent: es pot executar més d'un cop.

create table if not exists seen_cards (
  member_id uuid not null references members(id) on delete cascade,
  card_key  text not null,
  seen_at   timestamptz not null default now(),
  primary key (member_id, card_key)
);
alter table seen_cards enable row level security;
drop policy if exists "own seen cards read" on seen_cards;
drop policy if exists "own seen cards insert" on seen_cards;
create policy "own seen cards read" on seen_cards for select using (member_id = current_member_id());
create policy "own seen cards insert" on seen_cards for insert with check (member_id = current_member_id());

notify pgrst, 'reload schema';
