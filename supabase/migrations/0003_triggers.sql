-- 0003_triggers.sql — triggers de integridade e auditoria

-- ============ updated_at universal ============
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'profiles','clientes','vendas','promissorias',
    'recebimentos_promissoria','despesas','fechamentos_caixa'
  ]) loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.tg_set_updated_at()', t);
  end loop;
end $$;

-- ============ bloqueio se caixa fechado ============
create or replace function public.tg_bloquear_se_fechado()
returns trigger language plpgsql as $$
declare v_status fechamento_status;
        v_operador uuid;
        v_data date;
begin
  if tg_op = 'INSERT' then
    v_operador := new.operador_id;
    v_data := new.data;
  else
    v_operador := coalesce(new.operador_id, old.operador_id);
    v_data := coalesce(new.data, old.data);
  end if;

  select status into v_status
  from public.fechamentos_caixa
  where data = v_data and operador_id = v_operador
  limit 1;

  if v_status = 'fechado' then
    raise exception 'Caixa do operador % no dia % já está FECHADO. Lançamento bloqueado.', v_operador, v_data
      using errcode = '55000';
  end if;

  return new;
end; $$;

drop trigger if exists bloquear_fechado_vendas on public.vendas;
create trigger bloquear_fechado_vendas
  before insert or update on public.vendas
  for each row execute function public.tg_bloquear_se_fechado();

drop trigger if exists bloquear_fechado_recebimentos on public.recebimentos_promissoria;
create trigger bloquear_fechado_recebimentos
  before insert or update on public.recebimentos_promissoria
  for each row execute function public.tg_bloquear_se_fechado();

drop trigger if exists bloquear_fechado_despesas on public.despesas;
create trigger bloquear_fechado_despesas
  before insert or update on public.despesas
  for each row execute function public.tg_bloquear_se_fechado();

-- ============ recalc promissoria após recebimento ============
create or replace function public.tg_recalc_promissoria()
returns trigger language plpgsql as $$
declare v_pago bigint;
        v_original bigint;
begin
  select coalesce(sum(valor), 0) into v_pago
  from public.recebimentos_promissoria
  where promissoria_id = coalesce(new.promissoria_id, old.promissoria_id);

  select valor_original into v_original
  from public.promissorias
  where id = coalesce(new.promissoria_id, old.promissoria_id);

  if v_pago > v_original then
    raise exception 'Recebimento excede saldo da promissória (pago=%, original=%)', v_pago, v_original
      using errcode = '23514';
  end if;

  update public.promissorias
  set valor_pago = v_pago,
      status = case
        when v_pago = 0 then 'aberta'::promissoria_status
        when v_pago < v_original then 'parcial'::promissoria_status
        else 'quitada'::promissoria_status
      end
  where id = coalesce(new.promissoria_id, old.promissoria_id);

  return coalesce(new, old);
end; $$;

drop trigger if exists recalc_promissoria_ai on public.recebimentos_promissoria;
create trigger recalc_promissoria_ai
  after insert or update or delete on public.recebimentos_promissoria
  for each row execute function public.tg_recalc_promissoria();

-- ============ auditoria ============
create or replace function public.tg_auditoria()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_payload jsonb;
        v_id uuid;
begin
  if tg_op = 'DELETE' then
    v_payload := to_jsonb(old);
    v_id := old.id;
  else
    v_payload := to_jsonb(new);
    v_id := new.id;
  end if;

  insert into public.auditoria (tabela, registro_id, acao, ator, payload)
  values (tg_table_name, v_id, tg_op, auth.uid(), v_payload);

  return coalesce(new, old);
end; $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'vendas','promissorias','recebimentos_promissoria',
    'despesas','fechamentos_caixa'
  ]) loop
    execute format('drop trigger if exists audit_changes on public.%I', t);
    execute format(
      'create trigger audit_changes
         after insert or update or delete on public.%I
         for each row execute function public.tg_auditoria()', t);
  end loop;
end $$;
