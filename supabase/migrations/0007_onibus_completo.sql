-- ============================================================
--  Ônibus — modelo completo (espelha a tela do Encontro com Deus)
--
--  1. Tipo do ônibus: feminino | masculino | servos
--     (substitui o `genero sexo` da 0006, que não comportava "servos")
--  2. Malas: de quem são as malas que este ônibus carrega
--     (ex.: ônibus de homens pode levar as malas das mulheres)
--  3. Equipe do ônibus: responsáveis (até 2) e servos do templo (até 2),
--     vindos de profiles — junção onibus_equipe com papel.
-- ============================================================

create type onibus_tipo as enum ('feminino', 'masculino', 'servos');

-- genero (sexo) -> tipo (onibus_tipo), preservando os valores existentes
alter table onibus add column if not exists tipo onibus_tipo;
update onibus set tipo = genero::text::onibus_tipo where genero is not null and tipo is null;
alter table onibus drop column if exists genero;

-- malas que este ônibus carrega (null = não definido ainda)
alter table onibus add column if not exists malas onibus_tipo;

-- o responsavel_id único deixa de ser usado (vira onibus_equipe)
alter table onibus drop column if exists responsavel_id;

-- ============================================================
--  Equipe do ônibus (responsáveis / servos do templo)
--  Limite de 2 por papel é regra de aplicação (validado na action).
-- ============================================================
create type onibus_papel as enum ('responsavel', 'servo_templo');

create table onibus_equipe (
  onibus_id  uuid not null references onibus(id) on delete cascade,
  servo_id   uuid not null references profiles(id) on delete cascade,
  papel      onibus_papel not null,
  created_at timestamptz default now(),
  primary key (onibus_id, servo_id, papel)
);

alter table onibus_equipe enable row level security;

-- todos autenticados leem; só admin escreve (igual a onibus)
create policy oequipe_read  on onibus_equipe for select to authenticated using (true);
create policy oequipe_admin on onibus_equipe for all    to authenticated
  using (is_admin()) with check (is_admin());
