-- 0008_unaccent_clientes.sql — busca acento-insensitiva em clientes
-- Habilita unaccent + recria índice trigram normalizado.

create extension if not exists unaccent with schema extensions;

create or replace function public.imutable_unaccent(text)
returns text language sql immutable parallel safe as $$
  select extensions.unaccent('extensions.unaccent', $1);
$$;

drop index if exists public.idx_clientes_nome_trgm;
drop index if exists public.idx_clientes_nome;
create index idx_clientes_nome_norm on public.clientes
  using gin (public.imutable_unaccent(lower(nome)) extensions.gin_trgm_ops);
