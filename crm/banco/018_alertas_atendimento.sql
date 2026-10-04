-- CRM Cabanas · migração 018: alertas de atendimento no sino, plantão e escalonamento.
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run. Pode rodar de novo.
-- Novos alertas: o cliente pede uma pessoa, reclama, pede cancelamento ou alteração, ou o Gilberto passa para a equipe.
-- O alerta vai para quem está DE PLANTÃO; se ninguém assumir em 10 minutos, é escalado para toda a equipe.
-- Só o servidor grava; a equipe lê (RLS).

alter table alertas drop constraint if exists alertas_tipo_check;
alter table alertas add constraint alertas_tipo_check check (tipo in (
  'produto_pedido','lancar_conta','pagamento_recebido','cobranca_vencida',
  'atendimento_humano','reclamacao','cancelamento','alteracao','gilberto_passou'));
alter table alertas add column if not exists para_id uuid references usuarios(id) on delete set null;      -- de plantão quando nasceu
alter table alertas add column if not exists assumido_por uuid references usuarios(id) on delete set null;
alter table alertas add column if not exists assumido_em timestamptz;
alter table alertas add column if not exists escalado_em timestamptz;

-- Configurações simples da equipe (ex.: quem está de plantão)
create table if not exists config (
  chave text primary key,
  valor jsonb,
  atualizado_por uuid references usuarios(id) on delete set null,
  atualizado_em timestamptz not null default now()
);
alter table config enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'config' and policyname = 'equipe le config') then
    create policy "equipe le config" on config for select to authenticated using (usuario_ativo()); end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'config') then
      alter publication supabase_realtime add table config; end if;
  end if;
end $$;
