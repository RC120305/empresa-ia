-- CRM Cabanas · migração 025: pedidos de massagem para a parceira (Natália) pelo WhatsApp (dono, 06/10/2026).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run. Pode rodar de novo.
-- O hóspede escolhe tipo, local, dia e horário na página de extras; o CRM manda o pedido no WhatsApp da parceira
-- com [Confirmo] [Não posso]. Se ela não puder, indica até 3 horários pela página dela e o hóspede escolhe um.
-- Sem resposta em 3 h: aviso para a equipe. Em 24 h o pedido expira (o CRM não manda mais nada para ela).
-- Só o servidor grava; a equipe lê (RLS).

create table if not exists pedidos_parceiro (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid references vendas(id) on delete set null,
  conversa_id uuid references conversas(id) on delete cascade,
  negocio_id uuid references negocios(id) on delete set null,
  produto_codigo text not null,
  servico text not null,                     -- ex.: Massagem relaxante
  adicionais jsonb not null default '[]',
  local text,                                -- À beira do rio | No quarto
  data date not null,
  horario text not null,                     -- 08:00 … 16:00
  hospede text,                              -- primeiro nome (vai para a parceira)
  situacao text not null default 'aguardando_parceiro' check (situacao in
    ('aguardando_parceiro','opcoes_enviadas','confirmado','sem_opcao','expirado','cancelado')),
  opcoes jsonb not null default '[]',        -- até 3 {data, horario} indicados pela parceira
  token_parceiro text unique not null,
  token_cliente text unique,
  enviado_em timestamptz,
  respondido_em timestamptz,
  avisado_3h_em timestamptz,
  expira_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists pedidos_parceiro_situacao on pedidos_parceiro (situacao, enviado_em);
create index if not exists pedidos_parceiro_data on pedidos_parceiro (data);

alter table pedidos_parceiro enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'pedidos_parceiro' and policyname = 'equipe le pedidos parceiro') then
    create policy "equipe le pedidos parceiro" on pedidos_parceiro for select to authenticated using (usuario_ativo()); end if;
end $$;

-- Novos avisos no sino: parceira sem resposta (3 h / expirou) e massagem confirmada
alter table alertas drop constraint if exists alertas_tipo_check;
alter table alertas add constraint alertas_tipo_check check (tipo in (
  'produto_pedido','lancar_conta','pagamento_recebido','cobranca_vencida',
  'atendimento_humano','reclamacao','cancelamento','alteracao','gilberto_passou',
  'parceiro_sem_resposta','parceiro_confirmou'));

-- A parceira da massagem (o número fica no banco, não no código)
insert into config (chave, valor) values ('parceira_massagem', '{"nome": "Natália", "whatsapp": "+5567992286365"}'::jsonb)
on conflict (chave) do nothing;
