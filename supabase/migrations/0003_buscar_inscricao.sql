-- ============================================================
--  0003 — Busca pública de inscrição ("Já se inscreveu?")
--
--  O anon NÃO tem SELECT em encontristas (privacidade). Esta função
--  SECURITY DEFINER roda com privilégios do dono, contorna a RLS e
--  devolve SOMENTE os campos necessários para a tela pública
--  (sem CPF, sem dados médicos). Match por CPF OU WhatsApp (só dígitos).
-- ============================================================

create or replace function buscar_inscricao(documento text)
returns table (
  id      uuid,
  nome    text,
  igreja  text,
  celula  text,
  status  encontrista_status
)
language sql
security definer
set search_path = public
as $$
  select e.id, e.nome, e.igreja, e.celula, e.status
  from encontristas e
  where regexp_replace(coalesce(e.cpf, ''), '\D', '', 'g')
          = regexp_replace(documento, '\D', '', 'g')
     or regexp_replace(coalesce(e.whatsapp, ''), '\D', '', 'g')
          = regexp_replace(documento, '\D', '', 'g')
  limit 1;
$$;

revoke all on function buscar_inscricao(text) from public;
grant execute on function buscar_inscricao(text) to anon, authenticated;
