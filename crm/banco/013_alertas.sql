-- CRM Cabanas · migração 013: alertas da equipe (o sino no topo do CRM, com som).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run. Pode rodar de novo.
-- Tipos nesta fase:
--   produto_pedido : o cliente aceitou uma oferta ou marcou um extra na página do orçamento → a equipe reserva/prepara;
--   lancar_conta   : no dia do check-in (8h, horário de Bonito), lançar na conta do hóspede o que ele comprou.
-- O alerta aparece quando "quando" chega e some quando alguém resolve. Só o servidor grava; a equipe lê (RLS).

create table if not exists alertas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('produto_pedido','lancar_conta')),
  conversa_id uuid references conversas(id) on delete cascade,
  negocio_id uuid references negocios(id) on delete set null,
  venda_id uuid references vendas(id) on delete cascade,
  tarefa_id uuid references tarefas(id) on delete set null,
  titulo text not null,
  info text,
  quando timestamptz not null default now(),     -- a partir de quando toca
  situacao text not null default 'aberto' check (situacao in ('aberto','resolvido')),
  resolvido_por uuid references usuarios(id) on delete set null,
  resolvido_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists alertas_abertos on alertas (situacao, quando);
create index if not exists alertas_venda on alertas (venda_id);

alter table alertas enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'alertas' and policyname = 'equipe le alertas') then
    create policy "equipe le alertas" on alertas for select to authenticated using (usuario_ativo()); end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'alertas') then
      alter publication supabase_realtime add table alertas; end if;
  end if;
end $$;
