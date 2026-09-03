-- ============================================================
--  Rastreabilidade do pagamento do servo
--
--  O ramo de encontrista do webhook já guardava `pagamento_id` (0004); o de
--  servo não guardava nada. Resultado prático: quando o Samuel pagou duas
--  vezes, não deu para saber pelo banco quais pagamentos do Mercado Pago
--  tinham marcado quem — foi preciso comprovante em PDF e uma consulta à
--  API do MP.
--
--  Com estas colunas dá para distinguir "pago pelo gateway" de "marcado à
--  mão pela liderança" e detectar pagamento duplicado.
-- ============================================================
alter table profiles
  add column if not exists pagamento_id  text,   -- id do payment no Mercado Pago
  add column if not exists pagamento_via text;   -- 'gateway' | 'manual'

comment on column profiles.pagamento_id is
  'id do pagamento no Mercado Pago (null quando marcado manualmente)';
comment on column profiles.pagamento_via is
  'origem da baixa: gateway (webhook do MP) ou manual (liderança)';

-- quem já está pago hoje foi marcado antes desta coluna existir: o único
-- caso conhecido de gateway é o do Samuel, mas não dá para inferir os
-- demais — deixamos null, que significa "origem desconhecida".
