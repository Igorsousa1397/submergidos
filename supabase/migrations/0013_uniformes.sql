-- ============================================================
--  Uniformes — pedido de uniforme do servo (camiseta/calça/blusa)
--
--  Modelo do original (Firebase: uniformes/{userId}) portado para
--  tabela com 1 linha por servo. Diferenças:
--   - pago_sinal/pago_integral são marcados MANUALMENTE pelo admin
--     (PIX fora do app; no original era webhook do Mercado Pago)
--   - trigger impede não-admin de alterar os campos de pagamento
--     (no original o setDoc sem merge até apagava os flags — bug)
--
--  status: 'bloqueado' (pedido feito, travado) → 'pendente' (servo
--  pediu alteração) → 'aberto' (admin aprovou, editável) → 'bloqueado'.
-- ============================================================

create table uniformes (
  servo_id       uuid primary key references profiles(id) on delete cascade,
  nao_quer       boolean not null default false,
  nome_camiseta  text,
  camisa         text,
  qtd_camisas    int not null default 0,
  calca          text,
  qtd_calcas     int not null default 0,
  blusa          text,
  qtd_blusas     int not null default 0,
  valor_total    numeric(10,2) not null default 0,
  status         text not null default 'bloqueado',
  pago_sinal     boolean not null default false,
  pago_integral  boolean not null default false,
  atualizado_em  timestamptz default now()
);

alter table uniformes enable row level security;

-- todos os logados leem (admin lista tudo; resumo por tamanho)
create policy uniformes_read on uniformes
  for select to authenticated using (true);

-- o servo gerencia o PRÓPRIO pedido; admin gerencia todos
create policy uniformes_self on uniformes
  for all to authenticated
  using (servo_id = auth.uid()) with check (servo_id = auth.uid());
create policy uniformes_admin on uniformes
  for all to authenticated using (is_admin()) with check (is_admin());

-- pagamento só muda pela mão do admin
create or replace function uniformes_guard_pagamento()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.pago_sinal is distinct from old.pago_sinal
      or new.pago_integral is distinct from old.pago_integral)
     and not is_admin() then
    raise exception 'Apenas administradores alteram o pagamento do uniforme';
  end if;
  return new;
end;
$$;

create trigger trg_uniformes_pagamento
  before update on uniformes
  for each row execute function uniformes_guard_pagamento();

-- datas do módulo (limite de solicitação, prazo do pedido, prazo do restante)
insert into app_config (key, value)
values ('uniformes', '{"data_limite": null, "data_limite_pedido": null, "data_limite_restante": null}'::jsonb)
on conflict (key) do nothing;
