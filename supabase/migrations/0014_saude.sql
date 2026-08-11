-- ============================================================
--  Saúde — registros manuais de condições/necessidades especiais
--
--  No original o registro manual nem persistia (estado local, sumia no
--  reload). Aqui vira tabela. Dado de saúde é sensível: leitura/escrita
--  restritas a gestão OU quem tem a tela 'saude' concedida no Back
--  Office (roles.telas / profiles.telas_extra) — inclusive no RLS.
-- ============================================================

create table saude_registros (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  quarto      text,
  condicao    text not null,
  obs         text,
  criado_por  uuid references profiles(id),
  created_at  timestamptz default now()
);

alter table saude_registros enable row level security;

-- helper: quem pode acessar o módulo de saúde
create or replace function pode_saude()
returns boolean language sql stable security definer set search_path = public as $$
  select
    current_role_slug() in ('admin', 'lider_geral', 'pastor')
    or 'saude' = any(coalesce((select r.telas from roles r where r.slug = current_role_slug()), '{}'))
    or 'saude' = any(coalesce((select p.telas_extra from profiles p where p.id = auth.uid()), '{}'));
$$;

create policy saude_read on saude_registros
  for select to authenticated using (pode_saude());
create policy saude_write on saude_registros
  for insert to authenticated with check (pode_saude() and criado_por = auth.uid());
create policy saude_delete on saude_registros
  for delete to authenticated using (pode_saude());
