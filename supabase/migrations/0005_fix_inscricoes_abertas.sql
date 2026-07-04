-- ============================================================
--  0005 — Corrige "inscrições encerradas" no envio público
--
--  Causa: sem o registro 'inscricoes' no app_config, a função
--  inscricoes_abertas() retornava NULL (sem linha), e o RLS
--  enc_insert_pub bloqueava o insert — mesmo a Welcome mostrando
--  inscrições abertas.
-- ============================================================

-- 1) Garante o registro (o seed do 0001 pode não ter rodado).
--    'do nothing' preserva a escolha do admin caso já exista (ex.: fechado).
insert into app_config (key, value)
values ('inscricoes', '{"bloqueadas": false}'::jsonb)
on conflict (key) do nothing;

-- 2) Torna a checagem determinística: sem registro = inscrições ABERTAS,
--    consistente com a leitura da tela inicial.
create or replace function inscricoes_abertas()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (
      select coalesce((value->>'bloqueadas')::boolean, false) = false
      from app_config
      where key = 'inscricoes'
    ),
    true
  );
$$;
