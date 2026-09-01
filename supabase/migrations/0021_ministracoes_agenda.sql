-- ============================================================
--  Ministrações ligadas à AGENDA — uma fonte de verdade só.
--
--  O horário e o ministrante viviam duplicados nas duas tabelas, e foi
--  exatamente aí que a Pra. Priscila divergiu (10h40 x 11h00). Agora a
--  agenda manda: quando a ministração tem `agenda_id`, a tela lê dia,
--  hora e ministrante de lá. As colunas `quando`/`ministrante` continuam
--  como fallback para ministração ainda sem horário fechado na agenda.
--
--  on delete set null: apagar o item da agenda não apaga a ministração,
--  ela só volta a exibir o texto livre.
-- ============================================================
alter table ministracoes
  add column if not exists agenda_id uuid references agenda(id) on delete set null;

-- vincula as 7 ministrações aos horários já publicados na agenda
with vinculo(ordem, dia, hora) as (values
  (1, 'sexta',   '23:00'::time),  -- Chamados para as águas profundas
  (2, 'sabado',  '09:30'::time),  -- Não volte à superfície
  (3, 'sabado',  '11:00'::time),  -- Identidade revelada nas profundezas
  (4, 'sabado',  '17:30'::time),  -- A profundidade de quem é Jesus
  (5, 'sabado',  '20:00'::time),  -- Sem volta
  (6, 'domingo', '10:00'::time),  -- Renovados pelo poder do Espírito
  (7, 'domingo', '15:00'::time)   -- Encerramento
)
update ministracoes m
   set agenda_id = a.id
  from vinculo v
  join agenda a on a.dia = v.dia and a.hora = v.hora
 where m.ordem = v.ordem;
