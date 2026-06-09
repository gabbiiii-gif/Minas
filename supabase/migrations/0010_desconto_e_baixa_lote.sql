-- 0010_desconto_e_baixa_lote.sql
-- Duas melhorias no recebimento de promissórias:
--   1. DESCONTO / ABATIMENTO: write-off de centavos. A promissória é liquidada
--      pelo total (valor recebido em dinheiro + desconto), mas SÓ o valor entra
--      no caixa como dinheiro/pix/etc. O desconto não é receita nem cash.
--   2. BAIXA EM LOTE: receber várias promissórias do mesmo cliente num único
--      lançamento (uma forma de pagamento, uma data).
-- Também habilita recebimento retroativo (admin) via p_data, igual vendas/despesas.

-- ============ 1. coluna desconto ============
alter table public.recebimentos_promissoria
  add column if not exists desconto bigint not null default 0
  check (desconto >= 0);

-- ============ 2. recalc considerando desconto ============
-- valor_pago da promissória = soma de (valor recebido + desconto concedido).
-- Assim, pagar 640,00 + desconto 0,85 quita uma nota de 640,85.
create or replace function public.tg_recalc_promissoria()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare v_pago bigint;
        v_original bigint;
        v_pid uuid := coalesce(new.promissoria_id, old.promissoria_id);
begin
  select coalesce(sum(valor + desconto), 0) into v_pago
  from public.recebimentos_promissoria
  where promissoria_id = v_pid;

  select valor_original into v_original
  from public.promissorias
  where id = v_pid;

  if v_pago > v_original then
    raise exception 'Recebimento+desconto excede saldo da promissória (liquidado=%, original=%)', v_pago, v_original
      using errcode = '23514';
  end if;

  update public.promissorias
  set valor_pago = v_pago,
      status = case
        when v_pago = 0 then 'aberta'::promissoria_status
        when v_pago < v_original then 'parcial'::promissoria_status
        else 'quitada'::promissoria_status
      end
  where id = v_pid;

  return coalesce(new, old);
end; $$;

-- ============ 3. RPC baixa em lote (com desconto + data) ============
-- p_itens: jsonb array de objetos { "promissoria_id": uuid, "valor": bigint, "desconto": bigint }
--   - valor    = dinheiro/pix/etc que entra no caixa (> 0)
--   - desconto = abatimento concedido (>= 0)
--   - valor + desconto não pode exceder o saldo da nota
-- p_forma: forma de pagamento (qualquer menos 'promissoria')
-- p_data : data do lançamento. NULL = hoje. Data passada exige admin (caixa reaberto).
-- Retorna a quantidade de recebimentos lançados.
create or replace function public.receber_promissorias_lote(
  p_itens jsonb,
  p_forma forma_pagamento,
  p_data  date default null
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_op uuid := auth.uid();
        v_hoje date := (now() at time zone 'America/Belem')::date;
        v_data date;
        v_item jsonb;
        v_pid uuid;
        v_valor bigint;
        v_desc bigint;
        v_saldo bigint;
        v_count integer := 0;
begin
  if v_op is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if p_forma = 'promissoria' then
    raise exception 'Forma de pagamento inválida para recebimento' using errcode = '22023';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Nenhuma promissória selecionada' using errcode = '22023';
  end if;

  v_data := coalesce(p_data, v_hoje);
  if v_data <> v_hoje and not public.is_admin() then
    raise exception 'Apenas admin pode lançar recebimento em data retroativa' using errcode = '42501';
  end if;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_pid   := (v_item->>'promissoria_id')::uuid;
    v_valor := coalesce((v_item->>'valor')::bigint, 0);
    v_desc  := coalesce((v_item->>'desconto')::bigint, 0);

    if v_valor <= 0 then
      raise exception 'Valor deve ser maior que zero' using errcode = '22023';
    end if;
    if v_desc < 0 then
      raise exception 'Desconto não pode ser negativo' using errcode = '22023';
    end if;

    select (valor_original - valor_pago) into v_saldo
    from public.promissorias
    where id = v_pid
    for update;

    if v_saldo is null then
      raise exception 'Promissória não encontrada' using errcode = '02000';
    end if;
    if v_valor + v_desc > v_saldo then
      raise exception 'Valor (%) + desconto (%) excede saldo devedor (%)', v_valor, v_desc, v_saldo
        using errcode = '23514';
    end if;

    insert into public.recebimentos_promissoria
      (promissoria_id, valor, desconto, forma_pagamento, data, operador_id)
    values (v_pid, v_valor, v_desc, p_forma, v_data, v_op);

    v_count := v_count + 1;
  end loop;

  return v_count;
end; $$;

revoke all on function public.receber_promissorias_lote(jsonb, forma_pagamento, date) from anon, public;
grant execute on function public.receber_promissorias_lote(jsonb, forma_pagamento, date) to authenticated;

-- ============ 4. criar_venda_com_promissoria: honrar data retroativa ============
-- Antes ignorava a data e gravava sempre "hoje", quebrando edição de dia reaberto.
-- Remove a assinatura antiga (4 args) p/ não criar overload ambíguo.
drop function if exists public.criar_venda_com_promissoria(bigint, uuid, date, text);

create or replace function public.criar_venda_com_promissoria(
  p_valor      bigint,
  p_cliente_id uuid,
  p_vencimento date,
  p_observacao text,
  p_data       date default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_venda_id uuid;
        v_op uuid := auth.uid();
        v_hoje date := (now() at time zone 'America/Belem')::date;
        v_data date;
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

  v_data := coalesce(p_data, v_hoje);
  if v_data <> v_hoje and not public.is_admin() then
    raise exception 'Apenas admin pode lançar promissória em data retroativa' using errcode = '42501';
  end if;

  insert into public.vendas (data, valor_total, forma_pagamento, operador_id, cliente_id, observacao)
  values (v_data, p_valor, 'promissoria', v_op, p_cliente_id, p_observacao)
  returning id into v_venda_id;

  insert into public.promissorias (venda_id, cliente_id, valor_original, vencimento)
  values (v_venda_id, p_cliente_id, p_valor, p_vencimento);

  return v_venda_id;
end; $$;

revoke all on function public.criar_venda_com_promissoria(bigint, uuid, date, text, date) from anon, public;
grant execute on function public.criar_venda_com_promissoria(bigint, uuid, date, text, date) to authenticated;
