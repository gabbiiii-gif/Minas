-- 0004_views.sql — views auxiliares

-- Resumo diário por operador + forma de pagamento
create or replace view public.vw_resumo_diario as
select
  v.data,
  v.operador_id,
  p.nome as operador_nome,
  sum(case when v.forma_pagamento = 'dinheiro' then v.valor_total else 0 end) as dinheiro,
  sum(case when v.forma_pagamento = 'pix' then v.valor_total else 0 end) as pix,
  sum(case when v.forma_pagamento = 'debito' then v.valor_total else 0 end) as debito,
  sum(case when v.forma_pagamento = 'credito' then v.valor_total else 0 end) as credito,
  sum(case when v.forma_pagamento = 'promissoria' then v.valor_total else 0 end) as promissoria,
  sum(v.valor_total) as total_vendas
from public.vendas v
join public.profiles p on p.id = v.operador_id
where v.deleted_at is null
group by v.data, v.operador_id, p.nome;

-- Recebimentos do dia por operador + forma
create or replace view public.vw_recebimentos_diario as
select
  r.data,
  r.operador_id,
  sum(case when r.forma_pagamento = 'dinheiro' then r.valor else 0 end) as dinheiro,
  sum(case when r.forma_pagamento = 'pix' then r.valor else 0 end) as pix,
  sum(case when r.forma_pagamento = 'debito' then r.valor else 0 end) as debito,
  sum(case when r.forma_pagamento = 'credito' then r.valor else 0 end) as credito,
  sum(r.valor) as total_recebimentos
from public.recebimentos_promissoria r
group by r.data, r.operador_id;

-- Promissórias em aberto (com info do cliente)
create or replace view public.vw_promissorias_em_aberto as
select
  p.id,
  p.cliente_id,
  c.nome as cliente_nome,
  c.telefone as cliente_telefone,
  p.valor_original,
  p.valor_pago,
  (p.valor_original - p.valor_pago) as saldo,
  p.status,
  p.vencimento,
  p.created_at,
  (p.vencimento is not null and p.vencimento < (now() at time zone 'America/Belem')::date
    and p.status <> 'quitada') as atrasada
from public.promissorias p
join public.clientes c on c.id = p.cliente_id
where p.status <> 'quitada' and c.deleted_at is null;

-- Despesas do dia por operador
create or replace view public.vw_despesas_diario as
select data, operador_id, sum(valor) as total
from public.despesas
where deleted_at is null
group by data, operador_id;
