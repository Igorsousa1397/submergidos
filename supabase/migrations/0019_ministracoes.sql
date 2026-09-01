-- ============================================================
--  MINISTRAÇÕES do Submergidos
--
--  No app original as ministrações eram HARDCODED no App.jsx — mudar uma
--  linha exigia deploy. Aqui viram tabela: a liderança edita e o servo vê
--  na hora.
--
--  `quando` é texto livre (e não `time`) porque o cronograma da pastora
--  mistura horário exato ("Sábado — 9h30") com referência relativa
--  ("Domingo — Pós-almoço"). A ordem da lista vem de `ordem`.
-- ============================================================
create table if not exists ministracoes (
  id          uuid primary key default gen_random_uuid(),
  ordem       int  not null default 0,
  titulo      text not null,
  quando      text,             -- "Sábado — 9h30", "Domingo — Pós-almoço"
  ministrante text,
  texto       text,             -- referência bíblica principal
  base        text,             -- referência de apoio
  citacao     text,             -- versículo transcrito, quando houver
  tema        text,
  ato         text,             -- ato profético
  direcao     text,             -- direção dada à equipe
  created_at  timestamptz default now()
);

alter table ministracoes enable row level security;

-- todo mundo logado lê; só admin/líder geral edita (mesma regra da agenda)
drop policy if exists ministracoes_read  on ministracoes;
drop policy if exists ministracoes_admin on ministracoes;
create policy ministracoes_read  on ministracoes for select to authenticated using (true);
create policy ministracoes_admin on ministracoes for all    to authenticated
  using (is_admin()) with check (is_admin());

-- ---------- conteúdo enviado pela pastora ----------
insert into ministracoes (ordem, titulo, quando, ministrante, texto, base, citacao, tema, ato, direcao)
select * from (values
  (1,
   'Chamados para as águas profundas',
   'Sexta-feira', 'Pr. Eliel',
   'Ezequiel 47:1-6', 'Lucas 5:2', null,
   'Do raso ao profundo.',
   E'Bacia com água.\n\nCada pessoa colocará os pés na água e sairá. Na saída, passará sobre um pano azul, representando: "Eu não ficarei no raso. Vou mergulhar no profundo de Deus."',
   null),

  (2,
   'Não volte à superfície',
   'Sábado — 9h30', 'Pr. Tiago',
   'Colossenses 3:1-3', null, null,
   'Não volte à superfície — viva submerso em Cristo.',
   'Bexiga preta.',
   null),

  (3,
   'Identidade revelada nas profundezas',
   'Sábado — 10h40', 'Pra. Priscila',
   'Isaías 43:1-2', null, null,
   null,
   'Pedra + óleo.',
   'Trabalhar identidade, pertencimento e aquilo que Deus revela quando somos levados às profundezas.'),

  (4,
   'A profundidade de quem é Jesus',
   'Sábado — 17h30', 'Pr. André',
   'João 14:5 e 9', null, null,
   'Conhecer Jesus para além da superfície.',
   null,
   null),

  (5,
   'Sem volta',
   'Sábado — 20h', 'Pra. Thamires',
   null, null, null,
   'Sem volta.',
   'Espontâneo.',
   'Um momento de decisão e entrega. Não existe mais retorno para a vida rasa depois de experimentar a profundidade de Deus.'),

  (6,
   'Renovados pelo poder do Espírito',
   'Domingo — 10h', 'Pra. Thamires',
   'João 7:37-40', null,
   'Se alguém tem sede, venha a mim e beba. Quem crer em mim, como diz a Escritura, do seu interior fluirão rios de água viva.',
   'Você não será apenas cheio — do seu interior fluirão rios.',
   'Momento das águas.',
   'O Espírito Santo não vem apenas para nos encher, mas para fazer de nós fontes pelas quais os rios de Deus fluem.'),

  (7,
   'Encerramento',
   'Domingo — Pós-almoço', 'Pr. Eliel',
   null, null, null,
   'Encerramento do Submergidos.',
   null,
   'Fechamento do encontro, consolidação daquilo que Deus ministrou e envio dos participantes para viverem fora do ambiente do retiro aquilo que receberam nas profundezas.')
) as v(ordem, titulo, quando, ministrante, texto, base, citacao, tema, ato, direcao)
where not exists (select 1 from ministracoes);
