-- CRM Cabanas · migração 017: cobrança por Pix (Banco do Brasil) com baixa automática (Etapa E1).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run. Pode rodar de novo.
-- Cada cobrança tem o txid do Pix, o valor exato e o prazo (48 h; 2 h se o check-in for em até 3 dias).
-- O CRM consulta o banco a cada 2 minutos; quando o Pix entra: cobrança paga, negócio em "Reservado",
-- alerta "Pagamento recebido" no sino e tarefa de confirmar a reserva no Silbeck. Só o servidor grava; a equipe lê.

create table if not exists cobrancas (
  id uuid primary key default gen_random_uuid(),
  txid text not null unique,
  conversa_id uuid references conversas(id) on delete set null,
  negocio_id uuid references negocios(id) on delete set null,
  tipo text not null default 'sinal' check (tipo in ('sinal','total','outro')),
  descricao text,
  valor numeric(12,2) not null check (valor > 0),
  expira_em timestamptz not null,
  situacao text not null default 'ativa' check (situacao in ('ativa','paga','expirada','cancelada')),
  copia_e_cola text,
  fonte text not null default 'bb' check (fonte in ('bb','simulador')),
  valor_pago numeric(12,2),
  pago_em timestamptz,
  e2e_id text,
  pagador text,
  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists cobrancas_ativas on cobrancas (situacao, expira_em);
create index if not exists cobrancas_conversa on cobrancas (conversa_id, criado_em desc);

-- Novos tipos de alerta no sino
alter table alertas drop constraint if exists alertas_tipo_check;
alter table alertas add constraint alertas_tipo_check check (tipo in ('produto_pedido','lancar_conta','pagamento_recebido','cobranca_vencida'));
alter table alertas add column if not exists cobranca_id uuid references cobrancas(id) on delete cascade;

alter table cobrancas enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'cobrancas' and policyname = 'equipe le cobrancas') then
    create policy "equipe le cobrancas" on cobrancas for select to authenticated using (usuario_ativo()); end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'cobrancas') then
      alter publication supabase_realtime add table cobrancas; end if;
  end if;
end $$;
