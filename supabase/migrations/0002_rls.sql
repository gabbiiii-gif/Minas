-- 0002_rls.sql — Row Level Security policies

-- Helper: is_admin() retorna true se profile.role = admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and ativo = true
  );
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
as $$ select auth.uid(); $$;

-- ============ PROFILES ============
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check (public.is_admin());

-- ============ CLIENTES ============
alter table public.clientes enable row level security;

drop policy if exists clientes_select_all on public.clientes;
create policy clientes_select_all on public.clientes
  for select to authenticated
  using (deleted_at is null or public.is_admin());

drop policy if exists clientes_insert_authenticated on public.clientes;
create policy clientes_insert_authenticated on public.clientes
  for insert to authenticated
  with check (auth.uid() is not null);

drop policy if exists clientes_update_authenticated on public.clientes;
create policy clientes_update_authenticated on public.clientes
  for update to authenticated
  using (deleted_at is null or public.is_admin())
  with check (auth.uid() is not null);

drop policy if exists clientes_soft_delete_admin on public.clientes;
create policy clientes_soft_delete_admin on public.clientes
  for delete to authenticated
  using (public.is_admin());

-- ============ VENDAS ============
alter table public.vendas enable row level security;

drop policy if exists vendas_select on public.vendas;
create policy vendas_select on public.vendas
  for select to authenticated
  using (
    public.is_admin()
    or operador_id = auth.uid()
    or data = (now() at time zone 'America/Belem')::date  -- operador vê dia atual completo
  );

drop policy if exists vendas_insert on public.vendas;
create policy vendas_insert on public.vendas
  for insert to authenticated
  with check (
    operador_id = auth.uid()
    and data = (now() at time zone 'America/Belem')::date
  );

drop policy if exists vendas_update_admin on public.vendas;
create policy vendas_update_admin on public.vendas
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============ PROMISSORIAS ============
alter table public.promissorias enable row level security;

drop policy if exists promissorias_select on public.promissorias;
create policy promissorias_select on public.promissorias
  for select to authenticated using (true);

drop policy if exists promissorias_insert on public.promissorias;
create policy promissorias_insert on public.promissorias
  for insert to authenticated with check (auth.uid() is not null);

drop policy if exists promissorias_update on public.promissorias;
create policy promissorias_update on public.promissorias
  for update to authenticated
  using (true)
  with check (auth.uid() is not null);

-- ============ RECEBIMENTOS ============
alter table public.recebimentos_promissoria enable row level security;

drop policy if exists recebimentos_select on public.recebimentos_promissoria;
create policy recebimentos_select on public.recebimentos_promissoria
  for select to authenticated using (true);

drop policy if exists recebimentos_insert on public.recebimentos_promissoria;
create policy recebimentos_insert on public.recebimentos_promissoria
  for insert to authenticated
  with check (
    operador_id = auth.uid()
    and data = (now() at time zone 'America/Belem')::date
  );

-- ============ DESPESAS ============
alter table public.despesas enable row level security;

drop policy if exists despesas_select on public.despesas;
create policy despesas_select on public.despesas
  for select to authenticated
  using (
    public.is_admin()
    or operador_id = auth.uid()
    or data = (now() at time zone 'America/Belem')::date
  );

drop policy if exists despesas_insert on public.despesas;
create policy despesas_insert on public.despesas
  for insert to authenticated
  with check (
    operador_id = auth.uid()
    and data = (now() at time zone 'America/Belem')::date
  );

-- ============ FECHAMENTOS ============
alter table public.fechamentos_caixa enable row level security;

drop policy if exists fechamentos_select on public.fechamentos_caixa;
create policy fechamentos_select on public.fechamentos_caixa
  for select to authenticated
  using (public.is_admin() or operador_id = auth.uid());

drop policy if exists fechamentos_insert on public.fechamentos_caixa;
create policy fechamentos_insert on public.fechamentos_caixa
  for insert to authenticated
  with check (operador_id = auth.uid());

drop policy if exists fechamentos_update on public.fechamentos_caixa;
create policy fechamentos_update on public.fechamentos_caixa
  for update to authenticated
  using (operador_id = auth.uid() or public.is_admin())
  with check (operador_id = auth.uid() or public.is_admin());

-- ============ AUDITORIA ============
alter table public.auditoria enable row level security;

drop policy if exists auditoria_select_admin on public.auditoria;
create policy auditoria_select_admin on public.auditoria
  for select to authenticated using (public.is_admin());
-- INSERT em auditoria apenas via trigger SECURITY DEFINER (sem policy de insert).
