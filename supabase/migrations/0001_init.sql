-- ============================================================
--  SUBMERGIDOS — Migração inicial (Supabase / PostgreSQL)
--  Porta o "core" do Encontro com Deus (Firebase) para modelo relacional.
--
--  Principais mudanças de estrutura vs. Firestore:
--   - users  -> profiles (estende auth.users)
--   - perfil (string) + config/perfis_extra -> tabela roles (sistema + extras)
--   - pago/pagarDepois/desistiu (3 booleans) -> 1 enum encontrista_status
--   - quartos servos[]/enc[] (arrays) -> tabelas de junção
--   - escala (array no doc) -> tabela escalas + funcoes
--   - config/* -> app_config (key/value jsonb) + tabela agenda dedicada
--
--  Rode no SQL Editor do Supabase ou via `supabase db push`.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
--  ENUMS
-- ============================================================
create type sexo                as enum ('masculino', 'feminino');
create type encontrista_status  as enum ('pago', 'pagar_depois', 'desistiu', 'pendente');
create type aviso_publico       as enum ('todos', 'homens', 'mulheres');

-- ============================================================
--  ROLES  (substitui o campo perfil + config/perfis_extra)
-- ============================================================
create table roles (
  slug              text primary key,
  nome              text not null,
  cor               text default '#6b7280',
  isento_pagamento  boolean not null default false,
  pode_avisos       boolean not null default false,
  is_sistema        boolean not null default false,  -- false = perfil extra criado em runtime
  ordem             int default 100,
  created_at        timestamptz default now()
);

-- Seed dos 13 perfis base.
-- isento_pagamento: pastor, pastor_auxiliar, lider_geral
-- pode_avisos: admin, lider_geral, pastor, pastor_auxiliar, lider_staff, lider_templo
insert into roles (slug, nome, isento_pagamento, pode_avisos, is_sistema, ordem) values
  ('admin',           'Administrador',   false, true,  true, 1),
  ('lider_geral',     'Líder Geral',     true,  true,  true, 2),
  ('pastor',          'Pastor',          true,  true,  true, 3),
  ('pastor_auxiliar', 'Pastor Auxiliar', true,  true,  true, 4),
  ('lider_staff',     'Líder Staff',     false, true,  true, 5),
  ('lider_templo',    'Líder Templo',    false, true,  true, 6),
  ('lider_quartos',   'Líder Quartos',   false, false, true, 7),
  ('lider_midia',     'Líder Mídia',     false, false, true, 8),
  ('lider_cartas',    'Líder Cartas',    false, false, true, 9),
  ('lider_celula',    'Líder Célula',    false, false, true, 10),
  ('cozinha',         'Cozinha',         false, false, true, 11),
  ('staff',           'Staff',           false, false, true, 12),
  ('servo',           'Servo',           false, false, true, 13);

-- ============================================================
--  PROFILES  (servos/usuários — estende auth.users)
-- ============================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  email       text,
  cpf         text,
  nascimento  date,
  sexo        sexo,
  role        text not null default 'servo' references roles(slug),
  ativo       boolean not null default true,
  pago        boolean not null default false,
  primeiro    boolean not null default true,   -- primeiro acesso
  created_at  timestamptz default now()
);

-- ============================================================
--  CÉLULAS / ÔNIBUS
-- ============================================================
create table celulas (
  id        uuid primary key default uuid_generate_v4(),
  nome      text not null,
  lider_id  uuid references profiles(id)
);

create table onibus (
  id              uuid primary key default uuid_generate_v4(),
  identificacao   text not null,
  responsavel_id  uuid references profiles(id),
  capacidade      int
);

-- ============================================================
--  ENCONTRISTAS
-- ============================================================
create table encontristas (
  id              uuid primary key default uuid_generate_v4(),
  nome            text not null,
  cpf             text,
  nascimento      date,
  sexo            sexo,
  camiseta        text,
  celula_id       uuid references celulas(id),
  onibus_id       uuid references onibus(id),
  status          encontrista_status not null default 'pendente',
  chegou          boolean not null default false,
  checkin_at      timestamptz,
  emergencia      text,
  medicamento     text,
  doenca_cronica  text,
  acordo_valor    numeric(10,2),   -- valor combinado, separado do gateway de pagamento
  created_at      timestamptz default now()
);

create index idx_encontristas_status on encontristas(status);
create index idx_encontristas_sexo   on encontristas(sexo);

-- ============================================================
--  QUARTOS  (servos[] e enc[] viram tabelas de junção)
-- ============================================================
create table quartos (
  id                   uuid primary key default uuid_generate_v4(),
  numero               text not null,
  genero               sexo not null,
  is_maes              boolean not null default false,   -- "Quarto Mães"
  limite_encontristas  int not null default 0,
  limite_servos        int not null default 0
);

create table quarto_servos (
  quarto_id uuid references quartos(id) on delete cascade,
  servo_id  uuid references profiles(id) on delete cascade,
  primary key (quarto_id, servo_id)
);

create table quarto_encontristas (
  quarto_id       uuid references quartos(id) on delete cascade,
  encontrista_id  uuid references encontristas(id) on delete cascade,
  primary key (quarto_id, encontrista_id)
);

-- ============================================================
--  FUNÇÕES / ESCALAS
-- ============================================================
create table funcoes (
  id          uuid primary key default uuid_generate_v4(),
  nome        text not null,
  periodo     text,        -- ex.: Panelas/Louças/Limpeza usam período; null = sem período
  is_sistema  boolean not null default false,
  created_at  timestamptz default now()
);

create table escalas (
  id         uuid primary key default uuid_generate_v4(),
  servo_id   uuid not null references profiles(id) on delete cascade,
  funcao_id  uuid not null references funcoes(id) on delete cascade,
  dia        text not null,     -- 'sexta' | 'sabado' | 'domingo' (ou data)
  periodo    text,
  created_at timestamptz default now(),
  unique (servo_id, funcao_id, dia, periodo)
);

create index idx_escalas_servo on escalas(servo_id);

-- Regra de conflito: "Servo de Quarto" não acumula com Templo / Som / Cozinha (e vice-versa)
create or replace function check_escala_conflito()
returns trigger language plpgsql as $$
declare
  nova_funcao   text;
  conflitantes  text[] := array['Templo', 'Som', 'Cozinha'];
begin
  select nome into nova_funcao from funcoes where id = new.funcao_id;

  if nova_funcao = 'Servo de Quarto' then
    if exists (
      select 1 from escalas e
      join funcoes f on f.id = e.funcao_id
      where e.servo_id = new.servo_id and f.nome = any(conflitantes)
    ) then
      raise exception 'Conflito: Servo de Quarto não pode acumular Templo, Som ou Cozinha';
    end if;
  end if;

  if nova_funcao = any(conflitantes) then
    if exists (
      select 1 from escalas e
      join funcoes f on f.id = e.funcao_id
      where e.servo_id = new.servo_id and f.nome = 'Servo de Quarto'
    ) then
      raise exception 'Conflito: % não pode acumular com Servo de Quarto', nova_funcao;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_escala_conflito
  before insert or update on escalas
  for each row execute function check_escala_conflito();

-- ============================================================
--  AVISOS / OCORRÊNCIAS / CARTAS
-- ============================================================
create table avisos (
  id          uuid primary key default uuid_generate_v4(),
  texto       text not null,
  autor_id    uuid references profiles(id),
  publico     aviso_publico not null default 'todos',
  created_at  timestamptz default now()
);

create table ocorrencias (
  id            uuid primary key default uuid_generate_v4(),
  tipo          text,
  local         text,
  descricao     text,
  resolvido     boolean not null default false,
  resolvido_por uuid references profiles(id),
  resolvido_at  timestamptz,
  created_at    timestamptz default now()
);

create table cartas (
  id            uuid primary key default uuid_generate_v4(),
  servo_id      uuid not null references profiles(id) on delete cascade,
  quantidade    int not null default 1,
  quem_procurar text,            -- "Quem o servo deve procurar"
  retirada      boolean not null default false,
  retirada_em   timestamptz,
  created_at    timestamptz default now()
);

-- ============================================================
--  AGENDA / CONFIG / PUSH TOKENS
-- ============================================================
create table agenda (
  id          uuid primary key default uuid_generate_v4(),
  dia         text,
  ordem       int default 0,
  titulo      text not null,
  ministrante text,
  descricao   text,
  aviso       text,
  created_at  timestamptz default now()
);

create table app_config (
  key   text primary key,
  value jsonb not null default '{}'::jsonb
);

insert into app_config (key, value) values
  ('inscricoes', '{"bloqueadas": false}'::jsonb),
  ('evento',     '{"nome": "Submergidos"}'::jsonb);

create table push_tokens (
  user_id    uuid references profiles(id) on delete cascade,
  token      text not null,
  plataforma text,
  updated_at timestamptz default now(),
  primary key (user_id, token)
);

-- ============================================================
--  VIEW DE RESUMO FINANCEIRO
--  "A receber" exclui desistências; pagar_depois conta como confirmado no check-in.
-- ============================================================
create or replace view financeiro_resumo as
select
  count(*) filter (where status = 'pago')          as qtd_pagos,
  count(*) filter (where status = 'pagar_depois')  as qtd_pagar_depois,
  count(*) filter (where status = 'pendente')      as qtd_pendentes,
  count(*) filter (where status = 'desistiu')      as qtd_desistencias,
  count(*) filter (where status <> 'desistiu')     as qtd_a_receber_base,
  count(*)                                          as total_geral
from encontristas;

-- ============================================================
--  HELPERS DE RLS (security definer p/ evitar recursão de policy)
-- ============================================================
create or replace function current_role_slug()
returns text language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select current_role_slug() in ('admin', 'lider_geral');
$$;

create or replace function pode_avisos()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select pode_avisos from roles where slug = current_role_slug()), false);
$$;

create or replace function inscricoes_abertas()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((value->>'bloqueadas')::boolean, false) = false
  from app_config where key = 'inscricoes';
$$;

-- ============================================================
--  RLS  (baseline — revisar antes de produção, ver notas no chat)
-- ============================================================
alter table roles               enable row level security;
alter table profiles            enable row level security;
alter table celulas             enable row level security;
alter table onibus              enable row level security;
alter table encontristas        enable row level security;
alter table quartos             enable row level security;
alter table quarto_servos       enable row level security;
alter table quarto_encontristas enable row level security;
alter table funcoes             enable row level security;
alter table escalas             enable row level security;
alter table avisos              enable row level security;
alter table ocorrencias         enable row level security;
alter table cartas              enable row level security;
alter table agenda              enable row level security;
alter table app_config          enable row level security;
alter table push_tokens         enable row level security;

-- ROLES: todos autenticados leem; só admin escreve (inclui criar perfil extra)
create policy roles_read   on roles for select to authenticated using (true);
create policy roles_admin  on roles for all    to authenticated using (is_admin()) with check (is_admin());

-- PROFILES: autenticado lê todos; cada um edita o próprio; admin faz tudo
create policy profiles_read        on profiles for select to authenticated using (true);
create policy profiles_update_self on profiles for update to authenticated using (id = auth.uid());
create policy profiles_admin       on profiles for all    to authenticated using (is_admin()) with check (is_admin());

-- ENCONTRISTAS: autenticado lê; líderes/admin escrevem; inscrição pública (anon) se abertas
create policy enc_read       on encontristas for select to authenticated using (true);
create policy enc_admin      on encontristas for all    to authenticated
  using (is_admin() or current_role_slug() in ('lider_celula','lider_templo','lider_staff','lider_quartos'))
  with check (is_admin() or current_role_slug() in ('lider_celula','lider_templo','lider_staff','lider_quartos'));
create policy enc_insert_pub on encontristas for insert to anon
  with check (inscricoes_abertas() and status in ('pendente','pagar_depois'));

-- APP_CONFIG: anon só lê a chave 'inscricoes'; autenticado lê tudo; admin escreve
create policy config_pub_inscr on app_config for select to anon          using (key = 'inscricoes');
create policy config_read      on app_config for select to authenticated using (true);
create policy config_admin     on app_config for all    to authenticated using (is_admin()) with check (is_admin());

-- AVISOS: autenticado lê; quem tem permissão cria (como próprio autor); admin tudo
create policy avisos_read   on avisos for select to authenticated using (true);
create policy avisos_insert on avisos for insert to authenticated with check (pode_avisos() and autor_id = auth.uid());
create policy avisos_admin  on avisos for all    to authenticated using (is_admin()) with check (is_admin());

-- PUSH TOKENS: cada usuário gerencia os próprios
create policy push_self on push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- TABELAS DE OPERAÇÃO: autenticado lê; admin/líderes escrevem
-- (celulas, onibus, quartos, junções, funcoes, escalas, ocorrencias, cartas, agenda)
create policy celulas_read  on celulas for select to authenticated using (true);
create policy celulas_admin on celulas for all    to authenticated using (is_admin()) with check (is_admin());

create policy onibus_read   on onibus for select to authenticated using (true);
create policy onibus_admin  on onibus for all    to authenticated using (is_admin()) with check (is_admin());

create policy quartos_read  on quartos for select to authenticated using (true);
create policy quartos_admin on quartos for all    to authenticated
  using (is_admin() or current_role_slug() = 'lider_quartos')
  with check (is_admin() or current_role_slug() = 'lider_quartos');

create policy qserv_read  on quarto_servos for select to authenticated using (true);
create policy qserv_admin on quarto_servos for all    to authenticated
  using (is_admin() or current_role_slug() = 'lider_quartos')
  with check (is_admin() or current_role_slug() = 'lider_quartos');

create policy qenc_read  on quarto_encontristas for select to authenticated using (true);
create policy qenc_admin on quarto_encontristas for all    to authenticated
  using (is_admin() or current_role_slug() = 'lider_quartos')
  with check (is_admin() or current_role_slug() = 'lider_quartos');

create policy funcoes_read  on funcoes for select to authenticated using (true);
create policy funcoes_admin on funcoes for all    to authenticated using (is_admin()) with check (is_admin());

create policy escalas_read  on escalas for select to authenticated using (true);
create policy escalas_admin on escalas for all    to authenticated
  using (is_admin() or current_role_slug() in ('lider_staff','lider_templo'))
  with check (is_admin() or current_role_slug() in ('lider_staff','lider_templo'));

create policy ocorr_read   on ocorrencias for select to authenticated using (true);
create policy ocorr_write  on ocorrencias for insert to authenticated with check (true);
create policy ocorr_update on ocorrencias for update to authenticated using (true);
create policy ocorr_admin  on ocorrencias for all    to authenticated using (is_admin()) with check (is_admin());

create policy cartas_read  on cartas for select to authenticated using (true);
create policy cartas_admin on cartas for all    to authenticated
  using (is_admin() or current_role_slug() = 'lider_cartas')
  with check (is_admin() or current_role_slug() = 'lider_cartas');

create policy agenda_read  on agenda for select to authenticated using (true);
create policy agenda_admin on agenda for all    to authenticated using (is_admin()) with check (is_admin());

-- ============================================================
--  Trigger: cria profile automaticamente ao criar auth.user
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email), new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
