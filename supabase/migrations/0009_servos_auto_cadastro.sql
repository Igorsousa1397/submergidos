-- ============================================================
--  Auto-cadastro de servos com aprovação do admin
--
--  O servo se cadastra sozinho (nome, dados, senha própria) e fica
--  bloqueado até o admin aprovar. `aprovado` nasce false (deny by
--  default); os fluxos que criam contas confiáveis setam true:
--   - contas existentes (migradas abaixo)
--   - servos criados pelo admin na tela de Servos
-- ============================================================

alter table profiles add column if not exists aprovado boolean not null default false;

-- todo mundo que já existe continua entrando normalmente
update profiles set aprovado = true;
