-- ============================================================
--  Remove o módulo de Uniformes
--  O Submergidos não terá pedido de uniforme. A tabela estava vazia
--  (0 linhas) quando removida — nenhum dado perdido.
-- ============================================================

drop trigger if exists trg_uniformes_pagamento on uniformes;
drop function if exists uniformes_guard_pagamento();
drop table if exists uniformes;

delete from app_config where key = 'uniformes';

-- tira a tela do catálogo de permissões dos perfis, se alguém já tinha
update roles set telas = array_remove(telas, 'uniforme') where 'uniforme' = any(telas);
update profiles set telas_extra = array_remove(telas_extra, 'uniforme')
  where 'uniforme' = any(telas_extra);
