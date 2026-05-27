-- seed.sql — usuários de teste + clientes fictícios
-- Aplicar SOMENTE em ambiente de dev. Senhas temporárias devem ser trocadas no primeiro login.
--
-- Senha padrão: TrocarLogo!2026
--
-- IDs fixos para facilitar e2e:
--   operador  → 11111111-1111-1111-1111-111111111111  (operador@minas.local)
--   admin     → 22222222-2222-2222-2222-222222222222  (admin@minas.local)

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'authenticated','authenticated','operador@minas.local',
   crypt('TrocarLogo!2026', gen_salt('bf')),
   now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"nome":"Caixa Operador","role":"operador"}'::jsonb,
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-2222-2222-222222222222',
   'authenticated','authenticated','admin@minas.local',
   crypt('TrocarLogo!2026', gen_salt('bf')),
   now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"nome":"Gabriel ADM","role":"admin"}'::jsonb,
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
)
values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"operador@minas.local","email_verified":true}'::jsonb,
   'email','operador@minas.local', now(), now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"admin@minas.local","email_verified":true}'::jsonb,
   'email','admin@minas.local', now(), now(), now())
on conflict (provider_id, provider) do nothing;

update public.profiles set role = 'admin', nome = 'Gabriel ADM'
  where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set role = 'operador', nome = 'Caixa Operador'
  where id = '11111111-1111-1111-1111-111111111111';

insert into public.clientes (nome, telefone, cpf, criado_por) values
  ('João da Silva',    '(93) 99999-0001', '111.222.333-44', '22222222-2222-2222-2222-222222222222'),
  ('Maria Oliveira',   '(93) 99999-0002', '222.333.444-55', '22222222-2222-2222-2222-222222222222'),
  ('Carlos Pereira',   '(93) 99999-0003', null,             '22222222-2222-2222-2222-222222222222'),
  ('Ana Souza',        '(93) 99999-0004', '444.555.666-77', '22222222-2222-2222-2222-222222222222'),
  ('Pedro Mecânico',   '(93) 99999-0005', null,             '22222222-2222-2222-2222-222222222222')
on conflict (cpf) do nothing;
