-- ============================================================
--  Agenda: campo de hora
--  O original exibe "Quinta · 20:00" — a tabela tinha só `dia` (texto).
--  `hora` permite ordenar a programação dentro do dia e destacar a
--  próxima atividade na home do servo.
-- ============================================================
alter table agenda add column if not exists hora time;
