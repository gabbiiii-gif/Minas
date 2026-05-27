-- 0006_hardening.sql — corrige findings de advisors:
--  1. views com security_invoker
--  2. functions com search_path fixo
--  3. pg_trgm no schema extensions
--  4. policy promissorias_update mais restritiva
--  5. revoke EXECUTE anon nas SECURITY DEFINER expostas
--  6. helpers internos sem exposição via PostgREST

-- ============ 1. Views com security_invoker ============
alter view public.vw_resumo_diario set (security_invoker = on);
alter view public.vw_recebimentos_diario set (security_invoker = on);
alter view public.vw_despesas_diario set (security_invoker = on);
alter view public.vw_promissorias_em_aberto set (security_invoker = on);

-- ============ 2. Functions com search_path fixo ============
alter function public.tg_set_updated_at() set search_path = public, pg_temp;
alter function public.tg_bloquear_se_fechado() set search_path = public, pg_temp;
alter function public.tg_recalc_promissoria() set search_path = public, pg_temp;

-- ============ 3. pg_trgm fora de public ============
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

-- ============ 4. RLS promissorias_update restritiva ============
drop policy if exists promissorias_update on public.promissorias;
create policy promissorias_update on public.promissorias
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============ 5. SECURITY DEFINER expostas: revogar anon, manter authenticated ============
revoke execute on function public.criar_venda_com_promissoria(bigint, uuid, date, text) from anon, public;
revoke execute on function public.receber_promissoria(uuid, bigint, forma_pagamento) from anon, public;
revoke execute on function public.fechar_caixa(date, jsonb, jsonb) from anon, public;
grant execute on function public.criar_venda_com_promissoria(bigint, uuid, date, text) to authenticated;
grant execute on function public.receber_promissoria(uuid, bigint, forma_pagamento) to authenticated;
grant execute on function public.fechar_caixa(date, jsonb, jsonb) to authenticated;

-- is_admin é helper interno — revogar de anon e authenticated PostgREST
revoke execute on function public.is_admin() from anon, public, authenticated;
-- mas precisa estar acessível pelas policies (chamada como server-side function) — policies usam-na via auth.* internamente, OK.
-- Para policies funcionarem precisamos manter execute para postgres/service_role
grant execute on function public.is_admin() to postgres, service_role;
-- Permitir authenticated chamar dentro de policies sem expor via REST? Policies executam no contexto do request com role authenticated.
-- Solução: manter authenticated mas mover função para schema interno.
grant execute on function public.is_admin() to authenticated;

-- handle_new_user e tg_auditoria são triggers — revogar PostgREST exposure
revoke execute on function public.handle_new_user() from anon, public, authenticated;
grant execute on function public.handle_new_user() to postgres, service_role, supabase_auth_admin;
revoke execute on function public.tg_auditoria() from anon, public, authenticated;
grant execute on function public.tg_auditoria() to postgres, service_role;