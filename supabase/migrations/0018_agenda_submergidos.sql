-- ============================================================
--  Agenda do Submergidos — cronograma enviado pela pastora.
--
--  "Ministração — Pr. Fulano" entra separado: titulo = "Ministração",
--  ministrante = "Pr. Fulano" (a UI já concatena os dois na exibição).
--
--  As atividades da madrugada (00h30 e 01h00) ficam em SEXTA, como no
--  cronograma original — a ordenação em shared.ts trata hora < 05:00
--  como continuação da noite anterior.
--
--  Guardado por "not exists": rodar de novo não duplica a programação.
-- ============================================================
insert into agenda (dia, hora, ordem, titulo, ministrante, aviso)
select * from (values
  -- ---------- SEXTA ----------
  ('sexta',   '19:30'::time,  10, 'Chegada à igreja',            null,           null),
  ('sexta',   '20:00'::time,  20, 'Orientações e organização',   null,           null),
  ('sexta',   '21:30'::time,  30, 'Organização para embarque',   null,           null),
  ('sexta',   '22:00'::time,  40, 'Saída para o sítio',          null,           null),
  ('sexta',   '23:00'::time,  50, 'Ministração',                 'Pr. Eliel',    null),
  ('sexta',   '00:30'::time,  60, 'Jantar',                      null,           null),
  ('sexta',   '01:00'::time,  70, 'Descanso',                    null,           null),

  -- ---------- SÁBADO ----------
  ('sabado',  '08:00'::time,  10, 'Café da manhã',               null,           null),
  ('sabado',  '09:00'::time,  20, 'Organização / Tempo livre',   null,           null),
  ('sabado',  '09:30'::time,  30, 'Ministração',                 'Pr. Tiago',    null),
  ('sabado',  '10:30'::time,  40, 'Pausa',                       null,           null),
  ('sabado',  '11:00'::time,  50, 'Ministração',                 'Pra. Priscila',null),
  ('sabado',  '13:00'::time,  60, 'Almoço',                      null,           null),
  ('sabado',  '14:00'::time,  70, 'Lazer / Comunhão',            null,           'Sem piscina'),
  ('sabado',  '16:30'::time,  80, 'Café da tarde',               null,           null),
  ('sabado',  '17:30'::time,  90, 'Ministração',                 'Pr. André',    null),
  ('sabado',  '20:00'::time, 100, 'Ministração',                 'Pra. Thamires',null),
  ('sabado',  '21:30'::time, 110, 'Comunhão / Momento livre / Louvorzão', null,  null),
  ('sabado',  '22:30'::time, 120, 'Descanso',                    null,           null),

  -- ---------- DOMINGO ----------
  ('domingo', '08:30'::time,  10, 'Café da manhã',               null,           null),
  ('domingo', '10:00'::time,  20, 'Ministração',                 'Pra. Thamires',null),
  ('domingo', '11:30'::time,  30, 'Piscina / Futebol / Lazer',   null,           null),
  ('domingo', '13:00'::time,  40, 'Almoço',                      null,           null),
  ('domingo', '15:00'::time,  50, 'Encerramento',                'Pr. Eliel',    null),
  ('domingo', '16:00'::time,  60, 'Organização / Despedida',     null,           null),
  ('domingo', '16:30'::time,  70, 'Retorno',                     null,           null)
) as v(dia, hora, ordem, titulo, ministrante, aviso)
where not exists (select 1 from agenda);
