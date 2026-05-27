-- 0005_rpcs.sql — RPCs transacionais

-- ============ criar_venda_com_promissoria ============
create or replace function public.criar_venda_com_promissoria(
  p_valor      bigint,
  p_cliente_id uuid,
  p_vencimento date,
  p_observacao text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_venda_id uuid;
        v_op uuid := auth.uid();
        v_hoje date := (now() at time zone 'America/Belem')::date;
begin
  if v_op is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if p_valor <= 0 then
    raise exception 'Valor deve ser maior que zero' using errcode = '22023';
  end if;
  if p_cliente_id is null then
    raise exception 'Cliente obrigatório para promissória' using errcode = '22023';
  end if;

  insert into public.vendas (data, valor_total, forma_pagamento, operador_id, cliente_id, observacao)
  values (v_hoje, p_valor, 'promissoria', v_op, p_cliente_id, p_observacao)
  returning id into v_venda_id;

  insert into public.promissorias (venda_id, cliente_id, valor_original, vencimento)
  values (v_venda_id, p_cliente_id, p_valor, p_vencimento);

  return v_venda_id;
end; $$;

revoke all on function public.criar_venda_com_promissoria(bigint, uuid, date, text) from public;
grant execute on function public.criar_venda_com_promissoria(bigint, uuid, date, text) to authenticated;

-- ============ receber_promissoria ============
create or replace function public.receber_promissoria(
  p_promissoria_id uuid,
  p_valor          bigint,
  p_forma          forma_pagamento
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
        v_saldo bigint;
        v_op uuid := auth.uid();
        v_hoje date := (now() at time zone 'America/Belem')::date;
begin
  if v_op is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if p_forma = 'promissoria' then
    raise exception 'Forma de pagamento inválida para recebimento' using errcode = '22023';
  end if;
  if p_valor <= 0 then
    raise exception 'Valor deve ser maior que zero' using errcode = '22023';
  end if;

  select (valor_original - valor_pago) into v_saldo
  from public.promissorias
  where id = p_promissoria_id
  for update;

  if v_saldo is null then
    raise exception 'Promissória não encontrada' using errcode = '02000';
  end if;
  if p_valor > v_saldo then
    raise exception 'Valor (%) excede saldo devedor (%)', p_valor, v_saldo using errcode = '23514';
  end if;

  insert into public.recebimentos_promissoria
    (promissoria_id, valor, forma_pagamento, data, operador_id)
  values (p_promissoria_id, p_valor, p_forma, v_hoje, v_op)
  returning id into v_id;

  return v_id;
end; $$;

revoke all on function public.receber_promissoria(uuid, bigint, forma_pagamento) from public;
grant execute on function public.receber_promissoria(uuid, bigint, forma_pagamento) to authenticated;

-- ============ fechar_caixa ============
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
        v_din bigint := 0; v_pix bigint := 0; v_deb bigint := 0; v_cre bigint := 0;
        v_desp bigint := 0;
        v_cad_din bigint; v_cad_pix bigint; v_cad_deb bigint; v_cad_cre bigint;
        v_fis_din bigint; v_fis_pix bigint; v_fis_deb bigint; v_fis_cre bigint;
        v_diff_din bigint; v_diff_total bigint;
begin
  if v_op is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  -- Totais sistema (vendas - despesas para dinheiro)
  select
    coalesce(sum(case when forma_pagamento = 'dinheiro' then valor_total else 0 end), 0),
    coalesce(sum(case when forma_pagamento = 'pix' then valor_total else 0 end), 0),
    coalesce(sum(case when forma_pagamento = 'debito' then valor_total else 0 end), 0),
    coalesce(sum(case when forma_pagamento = 'credito' then valor_total else 0 end), 0)
  into v_din, v_pix, v_deb, v_cre
  from public.vendas
  where data = p_data and operador_id = v_op and deleted_at is null;

  -- Adicionar recebimentos do dia
  select
    v_din + coalesce(sum(case when forma_pagamento = 'dinheiro' then valor else 0 end), 0),
    v_pix + coalesce(sum(case when forma_pagamento = 'pix' then valor else 0 end), 0),
    v_deb + coalesce(sum(case when forma_pagamento = 'debito' then valor else 0 end), 0),
    v_cre + coalesce(sum(case when forma_pagamento = 'credito' then valor else 0 end), 0)
  into v_din, v_pix, v_deb, v_cre
  from public.recebimentos_promissoria
  where data = p_data and operador_id = v_op;

  -- Despesas (subtrai do dinheiro)
  select coalesce(sum(valor), 0) into v_desp
  from public.despesas
  where data = p_data and operador_id = v_op and deleted_at is null;

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

  insert into public.fechamentos_caixa (
    data, operador_id,
    total_sistema_dinheiro, total_sistema_pix, total_sistema_debito, total_sistema_credito,
    total_caderno_dinheiro, total_caderno_pix, total_caderno_debito, total_caderno_credito,
    total_fisico_dinheiro,  total_fisico_pix,  total_fisico_debito,  total_fisico_credito,
    diferenca_dinheiro, diferenca_total,
    status, fechado_em
  )
  values (
    p_data, v_op,
    v_din, v_pix, v_deb, v_cre,
    v_cad_din, v_cad_pix, v_cad_deb, v_cad_cre,
    v_fis_din, v_fis_pix, v_fis_deb, v_fis_cre,
    v_diff_din, v_diff_total,
    'fechado', now()
  )
  on conflict (data, operador_id) do update
    set status = 'fechado',
        total_sistema_dinheiro = excluded.total_sistema_dinheiro,
        total_sistema_pix      = excluded.total_sistema_pix,
        total_sistema_debito   = excluded.total_sistema_debito,
        total_sistema_credito  = excluded.total_sistema_credito,
        total_caderno_dinheiro = excluded.total_caderno_dinheiro,
        total_caderno_pix      = excluded.total_caderno_pix,
        total_caderno_debito   = excluded.total_caderno_debito,
        total_caderno_credito  = excluded.total_caderno_credito,
        total_fisico_dinheiro  = excluded.total_fisico_dinheiro,
        total_fisico_pix       = excluded.total_fisico_pix,
        total_fisico_debito    = excluded.total_fisico_debito,
        total_fisico_credito   = excluded.total_fisico_credito,
        diferenca_dinheiro     = excluded.diferenca_dinheiro,
        diferenca_total        = excluded.diferenca_total,
        fechado_em             = now()
    where public.fechamentos_caixa.status <> 'fechado'
  returning id into v_id;

  if v_id is null then
    raise exception 'Caixa do dia % já está fechado', p_data using errcode = '55000';
  end if;

  return v_id;
end; $$;

revoke all on function public.fechar_caixa(date, jsonb, jsonb) from public;
grant execute on function public.fechar_caixa(date, jsonb, jsonb) to authenticated;

-- ============ handle_new_user ============
-- Cria profile automaticamente quando auth.users.insert acontece via signUp.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::perfil_role, 'operador')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
