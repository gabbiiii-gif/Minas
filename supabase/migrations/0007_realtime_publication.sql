-- 0007_realtime_publication.sql — habilita Realtime nas tabelas transacionais.
-- Sem isso o useRealtimeTable subscribe não recebe eventos postgres_changes.

alter publication supabase_realtime add table public.vendas;
alter publication supabase_realtime add table public.recebimentos_promissoria;
alter publication supabase_realtime add table public.despesas;
alter publication supabase_realtime add table public.promissorias;
alter publication supabase_realtime add table public.fechamentos_caixa;

-- REPLICA IDENTITY FULL: necessário para UPDATEs/DELETEs entregarem `old` completo
-- (Realtime usa pra montar payload).
alter table public.vendas replica identity full;
alter table public.recebimentos_promissoria replica identity full;
alter table public.despesas replica identity full;
alter table public.promissorias replica identity full;
alter table public.fechamentos_caixa replica identity full;
