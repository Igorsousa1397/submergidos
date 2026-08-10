-- ============================================================
--  Ônibus por gênero
--  Cada ônibus atende um sexo (homens OU mulheres). No check-in, o
--  dropdown de ônibus filtra pelos que batem com o sexo do encontrista
--  e que ainda têm vaga (encontristas atribuídos < capacidade).
--
--  Nullable: a tabela pode ter registros antigos sem gênero; a futura
--  tela de Ônibus deve exigir o campo no cadastro.
-- ============================================================
alter table onibus add column if not exists genero sexo;
