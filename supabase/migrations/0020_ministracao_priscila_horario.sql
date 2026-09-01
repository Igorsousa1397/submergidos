-- ============================================================
--  Correção de horário: a ministração da Pra. Priscila é 11h.
--  O cronograma das ministrações trazia 10h40, divergindo da agenda
--  (que já marcava 11h00). O Igor confirmou: vale 11h.
-- ============================================================
update ministracoes
   set quando = 'Sábado — 11h'
 where quando = 'Sábado — 10h40';
