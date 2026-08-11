-- ============================================================
--  Achados & Perdidos
--  No original o registro vivia em estado local (sumia no reload).
--  Padrão igual a ocorrências: qualquer servo logado registra um item
--  encontrado e marca a entrega; excluir é só admin.
-- ============================================================

create table achados (
  id           uuid primary key default gen_random_uuid(),
  item         text not null,
  local        text,
  dono         text,
  entregue     boolean not null default false,
  entregue_at  timestamptz,
  criado_por   uuid references profiles(id),
  created_at   timestamptz default now()
);

alter table achados enable row level security;

create policy achados_read on achados
  for select to authenticated using (true);
create policy achados_insert on achados
  for insert to authenticated with check (criado_por = auth.uid());
create policy achados_update on achados
  for update to authenticated using (true);
create policy achados_admin on achados
  for all to authenticated using (is_admin()) with check (is_admin());
