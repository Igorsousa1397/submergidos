-- ============================================================
--  0002 — Campos da inscrição pública
--  O anon NÃO consegue dar SELECT em encontristas (RLS), então a
--  checagem de duplicidade é feita por UNIQUE INDEX + tratamento
--  do erro 23505 na Server Action, não por consulta prévia.
-- ============================================================

alter table encontristas
  add column if not exists igreja          text,
  add column if not exists whatsapp        text,
  add column if not exists autoriza_imagem boolean,
  add column if not exists celula          text;   -- nome da célula (denormalizado:
                                                    -- anon não lê a tabela celulas)

create unique index if not exists uq_encontristas_cpf
  on encontristas (cpf) where cpf is not null;

create unique index if not exists uq_encontristas_whatsapp
  on encontristas (whatsapp) where whatsapp is not null;
