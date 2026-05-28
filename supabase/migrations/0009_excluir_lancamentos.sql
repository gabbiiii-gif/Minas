-- 0009_excluir_lancamentos.sql
-- RPCs para excluir lançamento com motivo (mínimo 5 caracteres).
-- Operador exclui só o próprio do dia. Caixa fechado bloqueia (admin reabre).
-- Vendas/despesas: SOFT-DELETE (deleted_at) + motivo append em observacao/descricao.
-- Recebimentos: HARD-DELETE (trigger tg_recalc_promissoria reabre saldo automaticamente)
--               com auditoria explícita gravando motivo antes do DELETE.
-- Venda forma='promissoria' bloqueada — exige fluxo admin (preserva integridade do saldo).

create or replace function public.excluir_venda(
  p_venda_id uuid,
  p_motivo   text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_op uuid := auth.uid();
        v_venda public.vendas%rowtype;
        v_fech_status fechamento_status;
begin
  if v_op is null then raise exception 'Nao autenticado' using errcode = '28000'; end if;
  if p_motivo is null or length(trim(p_motivo)) < 5 then
    raise exception 'Motivo obrigatorio (minimo 5 caracteres)' using errcode = '22023';
  end if;

  select * into v_venda from public.vendas where id = p_venda_id and deleted_at is null;
  if v_venda.id is null then
    raise exception 'Venda nao encontrada' using errcode = '02000';
  end if;
  if not public.is_admin() and v_venda.operador_id <> v_op then
    raise exception 'Apenas o operador que lancou ou admin pode excluir' using errcode = '42501';
  end if;
  if not public.is_admin() and v_venda.data <> (now() at time zone 'America/Belem')::date then
    raise exception 'Operador so pode excluir lancamento do dia atual' using errcode = '42501';
  end if;

  select status into v_fech_status from public.fechamentos_caixa
    where data = v_venda.data and operador_id = v_venda.operador_id;
  if v_fech_status = 'fechado' and not public.is_admin() then
    raise exception 'Caixa fechado. Pedir reabertura ao admin.' using errcode = '55000';
  end if;

  if v_venda.forma_pagamento = 'promissoria' then
    raise exception 'Venda do tipo promissoria nao pode ser excluida aqui. Use a tela de promissorias (admin).'
      using errcode = '0A000';
  end if;

  update public.vendas
  set deleted_at = now(),
      observacao = coalesce(observacao, '') || E'\n[EXCLUIDO ' || to_char(now() at time zone 'America/Belem','YYYY-MM-DD HH24:MI') || ' por ' || v_op::text || ']: ' || trim(p_motivo)
  where id = p_venda_id;
end; $$;
revoke all on function public.excluir_venda(uuid, text) from anon, public;
grant execute on function public.excluir_venda(uuid, text) to authenticated;


create or replace function public.excluir_despesa(
  p_despesa_id uuid,
  p_motivo     text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_op uuid := auth.uid();
        v_desp public.despesas%rowtype;
        v_fech_status fechamento_status;
begin
  if v_op is null then raise exception 'Nao autenticado' using errcode = '28000'; end if;
  if p_motivo is null or length(trim(p_motivo)) < 5 then
    raise exception 'Motivo obrigatorio (minimo 5 caracteres)' using errcode = '22023';
  end if;

  select * into v_desp from public.despesas where id = p_despesa_id and deleted_at is null;
  if v_desp.id is null then raise exception 'Despesa nao encontrada' using errcode = '02000'; end if;
  if not public.is_admin() and v_desp.operador_id <> v_op then
    raise exception 'Apenas o operador que lancou ou admin pode excluir' using errcode = '42501';
  end if;
  if not public.is_admin() and v_desp.data <> (now() at time zone 'America/Belem')::date then
    raise exception 'Operador so pode excluir lancamento do dia atual' using errcode = '42501';
  end if;

  select status into v_fech_status from public.fechamentos_caixa
    where data = v_desp.data and operador_id = v_desp.operador_id;
  if v_fech_status = 'fechado' and not public.is_admin() then
    raise exception 'Caixa fechado. Pedir reabertura ao admin.' using errcode = '55000';
  end if;

  update public.despesas
  set deleted_at = now(),
      descricao = descricao || E'\n[EXCLUIDO ' || to_char(now() at time zone 'America/Belem','YYYY-MM-DD HH24:MI') || ' por ' || v_op::text || ']: ' || trim(p_motivo)
  where id = p_despesa_id;
end; $$;
revoke all on function public.excluir_despesa(uuid, text) from anon, public;
grant execute on function public.excluir_despesa(uuid, text) to authenticated;


create or replace function public.excluir_recebimento(
  p_recebimento_id uuid,
  p_motivo         text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_op uuid := auth.uid();
        v_rec public.recebimentos_promissoria%rowtype;
        v_fech_status fechamento_status;
begin
  if v_op is null then raise exception 'Nao autenticado' using errcode = '28000'; end if;
  if p_motivo is null or length(trim(p_motivo)) < 5 then
    raise exception 'Motivo obrigatorio (minimo 5 caracteres)' using errcode = '22023';
  end if;

  select * into v_rec from public.recebimentos_promissoria where id = p_recebimento_id;
  if v_rec.id is null then raise exception 'Recebimento nao encontrado' using errcode = '02000'; end if;
  if not public.is_admin() and v_rec.operador_id <> v_op then
    raise exception 'Apenas o operador que lancou ou admin pode excluir' using errcode = '42501';
  end if;
  if not public.is_admin() and v_rec.data <> (now() at time zone 'America/Belem')::date then
    raise exception 'Operador so pode excluir lancamento do dia atual' using errcode = '42501';
  end if;

  select status into v_fech_status from public.fechamentos_caixa
    where data = v_rec.data and operador_id = v_rec.operador_id;
  if v_fech_status = 'fechado' and not public.is_admin() then
    raise exception 'Caixa fechado. Pedir reabertura ao admin.' using errcode = '55000';
  end if;

  insert into public.auditoria (tabela, registro_id, acao, ator, payload)
  values ('recebimentos_promissoria_motivo_exclusao', p_recebimento_id, 'UPDATE', v_op,
          jsonb_build_object('motivo', trim(p_motivo), 'recebimento', row_to_json(v_rec)));

  delete from public.recebimentos_promissoria where id = p_recebimento_id;
end; $$;
revoke all on function public.excluir_recebimento(uuid, text) from anon, public;
grant execute on function public.excluir_recebimento(uuid, text) to authenticated;
