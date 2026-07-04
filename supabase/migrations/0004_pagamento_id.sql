-- ============================================================
--  0004 — id do pagamento (Mercado Pago)
--  Guarda o payment id retornado pelo webhook. Permite distinguir
--  "pago pelo app" (tem id) de "pago fora do app" (status pago, sem id),
--  igual ao projeto original.
-- ============================================================

alter table encontristas
  add column if not exists pagamento_id text;
