-- 0001_init.sql — schema base MinasCaixa
-- Valores monetários em CENTAVOS (bigint). Datas em America/Belem.

set check_function_bodies = off;

create extension if not exists "pgcrypto";

-- ============ ENUMS ============
do $$ begin
  create type perfil_role as enum ('operador', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type forma_pagamento as enum ('dinheiro', 'pix', 'debito', 'credito', 'promissoria');
exception when duplicate_object then null; end $$;

do $$ begin
  create type promissoria_status as enum ('aberta', 'parcial', 'quitada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fechamento_status as enum ('aberto', 'conferido', 'fechado');
exception when duplicate_object then null; end $$;

-- ============ PROFILES ============
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        perfil_role not null default 'operador',
  nome        text not null,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============ CLIENTES ============
create table if not exists public.clientes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  telefone    text,
  cpf         text unique,
  criado_por  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists idx_clientes_nome_trgm on public.clientes using gin (nome gin_trgm_ops);
-- fallback simples se trgm não disponível:
create index if not exists idx_clientes_nome on public.clientes (lower(nome));

-- ============ VENDAS ============
create table if not exists public.vendas (
  id               uuid primary key default gen_random_uuid(),
  data             date not null default (now() at time zone 'America/Belem')::date,
  valor_total      bigint not null check (valor_total > 0),
  forma_pagamento  forma_pagamento not null,
  operador_id      uuid not null references public.profiles(id) on delete restrict,
  cliente_id       uuid references public.clientes(id) on delete restrict,
  observacao       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  constraint vendas_promissoria_requer_cliente
    check (forma_pagamento <> 'promissoria' or cliente_id is not null)
);
create index if not exists idx_vendas_data on public.vendas (data);
create index if not exists idx_vendas_operador_data on public.vendas (operador_id, data);
create index if not exists idx_vendas_cliente on public.vendas (cliente_id);
create index if not exists idx_vendas_forma on public.vendas (forma_pagamento);

-- ============ PROMISSORIAS ============
create table if not exists public.promissorias (
  id              uuid primary key default gen_random_uuid(),
  venda_id        uuid not null unique references public.vendas(id) on delete restrict,
  cliente_id      uuid not null references public.clientes(id) on delete restrict,
  valor_original  bigint not null check (valor_original > 0),
  valor_pago      bigint not null default 0 check (valor_pago >= 0),
  status          promissoria_status not null default 'aberta',
  vencimento      date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint promissorias_pago_lte_original check (valor_pago <= valor_original)
);
create index if not exists idx_promissorias_cliente on public.promissorias (cliente_id);
create index if not exists idx_promissorias_status on public.promissorias (status);
create index if not exists idx_promissorias_vencimento on public.promissorias (vencimento);

-- ============ RECEBIMENTOS DE PROMISSORIAS ============
create table if not exists public.recebimentos_promissoria (
  id               uuid primary key default gen_random_uuid(),
  promissoria_id   uuid not null references public.promissorias(id) on delete restrict,
  valor            bigint not null check (valor > 0),
  forma_pagamento  forma_pagamento not null,
  data             date not null default (now() at time zone 'America/Belem')::date,
  operador_id      uuid not null references public.profiles(id) on delete restrict,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint recebimentos_forma_diferente_promissoria
    check (forma_pagamento <> 'promissoria')
);
create index if not exists idx_recebimentos_data on public.recebimentos_promissoria (data);
create index if not exists idx_recebimentos_promissoria on public.recebimentos_promissoria (promissoria_id);
create index if not exists idx_recebimentos_operador_data on public.recebimentos_promissoria (operador_id, data);

-- ============ DESPESAS ============
create table if not exists public.despesas (
  id           uuid primary key default gen_random_uuid(),
  data         date not null default (now() at time zone 'America/Belem')::date,
  descricao    text not null check (length(trim(descricao)) > 0),
  valor        bigint not null check (valor > 0),
  operador_id  uuid not null references public.profiles(id) on delete restrict,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index if not exists idx_despesas_data on public.despesas (data);
create index if not exists idx_despesas_operador_data on public.despesas (operador_id, data);

-- ============ FECHAMENTOS DE CAIXA ============
create table if not exists public.fechamentos_caixa (
  id                       uuid primary key default gen_random_uuid(),
  data                     date not null,
  operador_id              uuid not null references public.profiles(id) on delete restrict,
  total_sistema_dinheiro   bigint not null default 0,
  total_sistema_pix        bigint not null default 0,
  total_sistema_debito     bigint not null default 0,
  total_sistema_credito    bigint not null default 0,
  total_caderno_dinheiro   bigint not null default 0,
  total_caderno_pix        bigint not null default 0,
  total_caderno_debito     bigint not null default 0,
  total_caderno_credito    bigint not null default 0,
  total_fisico_dinheiro    bigint not null default 0,
  total_fisico_pix         bigint not null default 0,
  total_fisico_debito      bigint not null default 0,
  total_fisico_credito     bigint not null default 0,
  diferenca_dinheiro       bigint not null default 0,
  diferenca_total          bigint not null default 0,
  status                   fechamento_status not null default 'aberto',
  observacao               text,
  fechado_em               timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint fechamentos_unico_por_dia_operador unique (data, operador_id)
);
create index if not exists idx_fechamentos_data on public.fechamentos_caixa (data);
create index if not exists idx_fechamentos_status on public.fechamentos_caixa (status);

-- ============ AUDITORIA ============
create table if not exists public.auditoria (
  id          uuid primary key default gen_random_uuid(),
  tabela      text not null,
  registro_id uuid not null,
  acao        text not null check (acao in ('INSERT', 'UPDATE', 'DELETE')),
  ator        uuid,
  payload     jsonb,
  criado_em   timestamptz not null default now()
);
create index if not exists idx_auditoria_tabela_registro on public.auditoria (tabela, registro_id);
create index if not exists idx_auditoria_ator on public.auditoria (ator);
create index if not exists idx_auditoria_criado on public.auditoria (criado_em desc);
