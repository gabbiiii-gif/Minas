-- 0012_rls_retroativo_admin.sql
-- BUG: "new row violates row-level security policy for table vendas" ao lançar
-- retroativo. As policies de INSERT exigiam data = hoje, então admin não conseguia
-- inserir venda/despesa em dia passado (ModalVenda/ModalDespesa inserem direto,
-- sem RPC security definer). Promissória/Receber funcionavam por usarem RPC definer.
-- FIX: admin pode inserir com data retroativa; operador comum continua só no dia atual.

drop policy if exists vendas_insert on public.vendas;
create policy vendas_insert on public.vendas
  for insert to authenticated
  with check (
    operador_id = auth.uid()
    and (data = (now() at time zone 'America/Belem')::date or public.is_admin())
  );

drop policy if exists despesas_insert on public.despesas;
create policy despesas_insert on public.despesas
  for insert to authenticated
  with check (
    operador_id = auth.uid()
    and (data = (now() at time zone 'America/Belem')::date or public.is_admin())
  );

drop policy if exists recebimentos_insert on public.recebimentos_promissoria;
create policy recebimentos_insert on public.recebimentos_promissoria
  for insert to authenticated
  with check (
    operador_id = auth.uid()
    and (data = (now() at time zone 'America/Belem')::date or public.is_admin())
  );
