-- ============================================================
--  Telas por perfil — semente inicial
--
--  A regra passou a ser a do original: só admin e líder geral veem tudo;
--  os demais (inclusive PASTOR) dependem de roles.telas. Sem esta semente,
--  todo mundo cairia só nas telas fixas (início, perfil, avisos, uniforme,
--  ocorrências) até alguém configurar no Back Office.
--
--  Estes são os padrões — o admin ajusta em Back Office → Perfis.
-- ============================================================

update roles set telas = v.telas
from (values
  -- edição geral do encontro (tudo, menos o Back Office)
  ('pastor', array['servos','enc','checkin','termo','quartos','onibus','agenda','achados','saude','img']),
  -- visualização ampla
  ('pastor_auxiliar', array['servos','enc','checkin','termo','quartos','onibus','agenda','achados']),
  -- operacional
  ('lider_staff',  array['servos','enc','checkin','quartos','onibus','achados']),
  ('lider_templo', array['enc','checkin','quartos','agenda','achados']),
  ('lider_quartos',array['enc','checkin','quartos','achados']),
  ('lider_midia',  array['img','checkin','quartos','achados']),
  ('lider_cartas', array['enc','checkin','quartos','achados']),
  ('lider_celula', array['enc','checkin','quartos','achados']),
  ('staff',        array['checkin','quartos','achados']),
  ('cozinha',      array['checkin','quartos','achados']),
  ('servo',        array['checkin','quartos','achados'])
) as v(slug, telas)
where roles.slug = v.slug;
