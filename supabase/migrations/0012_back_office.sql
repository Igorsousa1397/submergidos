-- ============================================================
--  Back Office — perfis, escalas e funções
--
--  Mudanças vs. original (Firebase):
--   - escala vira linhas na tabela `escalas` (funcao_id + dia + periodo)
--     em vez de strings "Panelas - Almoço" no doc do usuário
--   - permissões de telas: roles.telas (por perfil) + profiles.telas_extra
--     (por usuário) — enum de telas fica no app
--   - funções base seedadas com is_sistema=true (não removíveis;
--     no original "excluir" função nativa era um no-op que voltava no reload)
--   - funcoes.periodo = 'almoco_jantar' marca funções que pedem período
-- ============================================================

alter table roles
  add column if not exists telas text[] not null default '{}';

alter table profiles
  add column if not exists telas_extra text[] not null default '{}',
  add column if not exists lider_celula boolean not null default false,
  add column if not exists celula text;

insert into app_config (key, value)
values ('lider_map', '{}'::jsonb)
on conflict (key) do nothing;

-- Funções base do encontro (34, do app original)
insert into funcoes (nome, periodo, is_sistema)
select v.nome, v.periodo, true
from (values
  ('Som',                            null),
  ('Banheiro',                       null),
  ('Cozinha',                        null),
  ('Intercessão',                    null),
  ('Templo',                         null),
  ('Malas',                          null),
  ('Check-in',                       null),
  ('Refeitório',                     null),
  ('Cantina',                        null),
  ('Panelas',                        'almoco_jantar'),
  ('Mídia',                          null),
  ('Kit Sobrevivência',              null),
  ('Etiquetar Sacolas',              null),
  ('Dobrar Sacolas',                 null),
  ('Presentes/Cartas',               null),
  ('Camisetas',                      null),
  ('Kit Cartas+Pecado',              null),
  ('Organizar itens do Templo',      null),
  ('Itens Teatro/Dança',             null),
  ('Servir comida',                  'almoco_jantar'),
  ('Servir Comida Pastores',         'almoco_jantar'),
  ('Limpeza refeitório',             'almoco_jantar'),
  ('Quartos',                        null),
  ('Organizar itens STAFF',          null),
  ('Cartas',                         null),
  ('Preparação da Uva',              null),
  ('Decoração',                      null),
  ('Recepção Presentes/cartas',      null),
  ('Correrias',                      null),
  ('Transitar com carro no sítio',   null),
  ('Montagem da cruz',               null),
  ('Servo de Quarto',                null),
  ('Louças',                         'almoco_jantar'),
  ('Servir Ceia',                    null)
) as v(nome, periodo)
where not exists (select 1 from funcoes f where f.nome = v.nome);
