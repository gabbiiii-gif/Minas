-- 0011_fechar_caixa_por_dia.sql
-- BUG: fechar_caixa agregava e gravava por operador_id de quem fecha (auth.uid()).
-- Como o caixa é por DIA (Caixa/ModalFechamento somam o dia inteiro), quando o admin
-- fechava um dia reaberto operado por outra pessoa:
--   1) criava uma 2ª linha (chave única (data, operador_id) diferente) -> DUPLICAÇÃO
--   2) somava só os lançamentos do admin -> totais errados / caixa negativo
--   3) a linha original do operador ficava 'aberto' pra sempre.
-- FIX: agrega o DIA inteiro (sem filtrar operador) e, se já existe fechamento do dia,
--      atualiza essa MESMA linha; senão insere uma. Garante 1 caixa por dia.

create or replace function public.fechar_caixa(
  p_data    date,
  p_caderno jsonb,
  p_fisico  jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
        v_op uuid := auth.uid();
        v_existing_id uuid;
        v_existing_status fechamento_status;
        v_din bigint := 0; v_pix bigint := 0; v_deb bigint := 0; v_cre bigint := 0;
        v_desp bigint := 0;
        v_cad_din bigint; v_cad_pix bigint; v_cad_deb bigint; v_cad_cre bigint;
        v_fis_din bigint; v_fis_pix bigint; v_fis_deb bigint; v_fis_cre bigint;
        v_diff_din bigint; v_diff_total bigint;
begin
  if v_op is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  -- Totais do DIA INTEIRO (todos os operadores). Caixa é por dia, não por operador.
  select
    coalesce(sum(case when forma_pagamento = 'dinheiro' then valor_total else 0 end), 0),
    coalesce(sum(case when forma_pagamento = 'pix' then valor_total else 0 end), 0),
    coalesce(sum(case when forma_pagamento = 'debito' then valor_total else 0 end), 0),
    coalesce(sum(case when forma_pagamento = 'credito' then valor_total else 0 end), 0)
  into v_din, v_pix, v_deb, v_cre
  from public.vendas
  where data = p_data and deleted_at is null;

  -- Recebimentos do dia
  select
    v_din + coalesce(sum(case when forma_pagamento = 'dinheiro' then valor else 0 end), 0),
    v_pix + coalesce(sum(case when forma_pagamento = 'pix' then valor else 0 end), 0),
    v_deb + coalesce(sum(case when forma_pagamento = 'debito' then valor else 0 end), 0),
    v_cre + coalesce(sum(case when forma_pagamento = 'credito' then valor else 0 end), 0)
  into v_din, v_pix, v_deb, v_cre
  from public.recebimentos_promissoria
  where data = p_data;

  -- Despesas (subtrai do dinheiro)
  select coalesce(sum(valor), 0) into v_desp
  from public.despesas
  where data = p_data and deleted_at is null;

  v_din := v_din - v_desp;

  -- Caderno / Físico
  v_cad_din := coalesce((p_caderno->>'dinheiro')::bigint, 0);
  v_cad_pix := coalesce((p_caderno->>'pix')::bigint, 0);
  v_cad_deb := coalesce((p_caderno->>'debito')::bigint, 0);
  v_cad_cre := coalesce((p_caderno->>'credito')::bigint, 0);
  v_fis_din := coalesce((p_fisico->>'dinheiro')::bigint, 0);
  v_fis_pix := coalesce((p_fisico->>'pix')::bigint, 0);
  v_fis_deb := coalesce((p_fisico->>'debito')::bigint, 0);
  v_fis_cre := coalesce((p_fisico->>'credito')::bigint, 0);

  v_diff_din := v_fis_din - v_din;
  v_diff_total := (v_fis_din + v_fis_pix + v_fis_deb + v_fis_cre)
                - (v_din + v_pix + v_deb + v_cre);

  -- Existe fechamento do dia? (independente do operador)
  select id, status into v_existing_id, v_existing_status
  from public.fechamentos_caixa
  where data = p_data
  order by created_at
  limit 1
  for update;

  if v_existing_id is not null then
    if v_existing_status = 'fechado' then
      raise exception 'Caixa do dia % já está fechado', p_data using errcode = '55000';
    end if;
    -- Atualiza a MESMA linha (mantém operador_id original; quem fechou fica na auditoria)
    update public.fechamentos_caixa set
      total_sistema_dinheiro = v_din, total_sistema_pix = v_pix,
      total_sistema_debito = v_deb, total_sistema_credito = v_cre,
      total_caderno_dinheiro = v_cad_din, total_caderno_pix = v_cad_pix,
      total_caderno_debito = v_cad_deb, total_caderno_credito = v_cad_cre,
      total_fisico_dinheiro = v_fis_din, total_fisico_pix = v_fis_pix,
      total_fisico_debito = v_fis_deb, total_fisico_credito = v_fis_cre,
      diferenca_dinheiro = v_diff_din, diferenca_total = v_diff_total,
      status = 'fechado', fechado_em = now()
    where id = v_existing_id
    returning id into v_id;
  else
    insert into public.fechamentos_caixa (
      data, operador_id,
      total_sistema_dinheiro, total_sistema_pix, total_sistema_debito, total_sistema_credito,
      total_caderno_dinheiro, total_caderno_pix, total_caderno_debito, total_caderno_credito,
      total_fisico_dinheiro,  total_fisico_pix,  total_fisico_debito,  total_fisico_credito,
      diferenca_dinheiro, diferenca_total,
      status, fechado_em
    ) values (
      p_data, v_op,
      v_din, v_pix, v_deb, v_cre,
      v_cad_din, v_cad_pix, v_cad_deb, v_cad_cre,
      v_fis_din, v_fis_pix, v_fis_deb, v_fis_cre,
      v_diff_din, v_diff_total,
      'fechado', now()
    )
    returning id into v_id;
  end if;

  return v_id;
end; $$;

revoke all on function public.fechar_caixa(date, jsonb, jsonb) from public;
grant execute on function public.fechar_caixa(date, jsonb, jsonb) to authenticated;
