-- ============================================================
--  Banheiro passa a pedir período (Manhã/Tarde/Noite)
--
--  Até aqui `funcoes.periodo` só assumia 'almoco_jantar' — o conjunto que
--  faz sentido para Refeitório, Louças, Panelas. O Banheiro precisa de
--  turnos do dia, então o campo passa a guardar QUAL conjunto a função
--  pede, e a UI monta as opções a partir disso (TIPOS_PERIODO em
--  features/backoffice/shared.ts).
-- ============================================================
update funcoes set periodo = 'manha_tarde_noite' where nome = 'Banheiro';
