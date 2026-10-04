-- CRM Cabanas · migração 020: reservas criadas pelo CRM no Silbeck (Gilberto ou equipe).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run. Pode rodar de novo.
-- Fluxo (dono, 04/10/2026; P46): o cliente escolhe a acomodação e a forma de pagamento → o CRM confere vaga e preço
-- e cria a reserva NÃO CONFIRMADA no Silbeck → manda o Pix (ou o link do cartão) → quando o pagamento cai, o CRM
-- lança o adiantamento no Silbeck e a reserva confirma sozinha. Pix vencido: a equipe decide (novo Pix ou cancelar
-- no Silbeck, que não tem cancelamento pela API). Só o servidor grava; a equipe lê.

create table if not exists reservas (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid references conversas(id) on delete set null,
  negocio_id uuid references negocios(id) on delete set null,
  orcamento_id uuid references orcamentos(id) on delete set null,
  silbeck_id text not null,                 -- número da reserva no Silbeck
  silbeck_item_id text,                     -- item da reserva (recebe o pagamento)
  fonte text not null default 'silbeck' check (fonte in ('silbeck','simulador')),
  codigo text not null,                     -- tipo de acomodação (ex.: BGE)
  acomodacao text,
  data_entrada date not null,
  data_saida date not null,
  adultos int not null,
  criancas_idades int[] not null default '{}',
  titular text not null,
  email text,
  valor_total numeric(12,2) not null,
  forma_pagamento text check (forma_pagamento in ('pix','cartao')),
  percentual int check (percentual in (50,100)),
  situacao text not null default 'nao_confirmada' check (situacao in ('nao_confirmada','confirmada','cancelada')),
  confirmada_em timestamptz,
  criado_por text,                          -- 'gilberto' ou id do usuário
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists reservas_conversa on reservas (conversa_id, criado_em desc);
alter table cobrancas add column if not exists reserva_id uuid references reservas(id) on delete set null;

alter table reservas enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'reservas' and policyname = 'equipe le reservas') then
    create policy "equipe le reservas" on reservas for select to authenticated using (usuario_ativo()); end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'reservas') then
      alter publication supabase_realtime add table reservas; end if;
  end if;
end $$;
