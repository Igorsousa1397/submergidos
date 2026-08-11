-- ============================================================
--  Tela de Servos — pagamento como enum + cores dos perfis
--
--  No original (Firebase) o campo `pago` do servo era polimórfico:
--  true | false | 'abonado' | 'pagar_depois'. Aqui vira enum próprio,
--  com os campos de apoio do "pagar depois" (data combinada + observação)
--  e `pago_em` (quando foi pago — no original definia valor promocional).
--
--  A coluna `pago` (boolean) fica DEPRECATED: os dados são migrados e o
--  código para de usá-la; remover numa migration futura, após o deploy.
-- ============================================================

create type servo_pagamento as enum ('pendente', 'pago', 'abonado', 'pagar_depois');

alter table profiles
  add column if not exists pagamento servo_pagamento not null default 'pendente',
  add column if not exists pago_em timestamptz,
  add column if not exists pagar_depois_data date,
  add column if not exists pagar_depois_obs text;

update profiles set pagamento = 'pago', pago_em = now() where pago = true;

-- O gate de "primeiro acesso" (troca de senha) passa a valer a partir de agora.
-- Contas existentes já têm senha própria — não devem cair no gate.
update profiles set primeiro = false;

-- Cores dos perfis — paleta do app original (roles.cor estava no default cinza)
update roles set cor = c.cor
from (values
  ('admin',           '#00c851'),
  ('lider_geral',     '#0a84ff'),
  ('pastor',          '#bf5af2'),
  ('pastor_auxiliar', '#9b59b6'),
  ('lider_staff',     '#ff9f0a'),
  ('lider_templo',    '#64b5f6'),
  ('lider_quartos',   '#ff6b35'),
  ('lider_midia',     '#ffd60a'),
  ('lider_cartas',    '#ff2d55'),
  ('lider_celula',    '#ff6b35'),
  ('cozinha',         '#ff6b35'),
  ('staff',           '#ff9f0a'),
  ('servo',           '#636366')
) as c(slug, cor)
where roles.slug = c.slug;

-- Config da tela de Servos (data limite do pagamento do servo)
insert into app_config (key, value)
values ('servos', '{"data_limite_pagamento": null}'::jsonb)
on conflict (key) do nothing;
