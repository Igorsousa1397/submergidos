-- ============================================================
--  Avisos: quem pode publicar também pode excluir
--  Regra do original (canAvisos): admin, líder geral, pastores,
--  líder staff e líder templo apagam qualquer aviso. O RLS só
--  permitia admin — esta policy estende para pode_avisos().
-- ============================================================
create policy avisos_delete on avisos
  for delete to authenticated using (pode_avisos());
