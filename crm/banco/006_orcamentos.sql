-- CRM Cabanas · migração 006: orçamentos e a página pública do orçamento (/o/<token>).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run.
-- Pode rodar de novo sem estragar nada.
-- Só o servidor grava (chave secreta). A equipe lê (para ver o orçamento e se o cliente abriu).
-- A página pública é servida pelo servidor a partir do token (128 bits aleatórios); o banco nunca é aberto ao público.

create table if not exists orcamentos (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  conversa_id uuid references conversas(id) on delete set null,
  criado_por text not null default 'gilberto',          -- 'gilberto' ou id do usuário
  fonte text not null default 'simulador',              -- 'simulador' (valores fictícios) ou 'silbeck'
  primeiro_nome text,
  frase_de_abertura text,
  persona text,
  data_entrada date not null,
  data_saida date not null,
  adultos int not null,
  criancas_idades int[] not null default '{}',
  pessoas_aptas_combo int not null default 0,
  opcoes jsonb not null,                                -- [{codigo, nome, valor_total, media_por_noite, parcela_6x, diarias, taxas}]
  numero_whatsapp text,                                 -- número do hotel para o botão "Quero reservar"
  aberturas int not null default 0,
  aberto_primeira_vez_em timestamptz,
  ultima_abertura_em timestamptz,
  escolhida text,                                       -- código da opção do "Quero reservar"
  escolhida_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists orcamentos_conversa on orcamentos (conversa_id, criado_em desc);

create table if not exists orcamento_eventos (
  id bigserial primary key,
  orcamento_id uuid not null references orcamentos(id) on delete cascade,
  tipo text not null,                                   -- aberto · quero_reservar
  dados jsonb,
  quando timestamptz not null default now()
);
create index if not exists orcamento_eventos_orc on orcamento_eventos (orcamento_id, quando);

alter table orcamentos enable row level security;
alter table orcamento_eventos enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'orcamentos' and policyname = 'equipe le orcamentos') then
    create policy "equipe le orcamentos" on orcamentos for select to authenticated
      using (usuario_ativo());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'orcamento_eventos' and policyname = 'equipe le eventos de orcamento') then
    create policy "equipe le eventos de orcamento" on orcamento_eventos for select to authenticated
      using (usuario_ativo());
  end if;
end $$;

-- Abertura da página: soma 1 e guarda o evento (chamada só pelo servidor).
create or replace function registrar_abertura_orcamento(p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  update orcamentos set aberturas = aberturas + 1,
    aberto_primeira_vez_em = coalesce(aberto_primeira_vez_em, now()), ultima_abertura_em = now()
    where token = p_token returning id into v_id;
  if v_id is not null then insert into orcamento_eventos (orcamento_id, tipo) values (v_id, 'aberto'); end if;
end $$;
revoke all on function registrar_abertura_orcamento(text) from public, anon, authenticated;
grant execute on function registrar_abertura_orcamento(text) to service_role;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'orcamentos') then
    alter publication supabase_realtime add table orcamentos;
  end if;
end $$;
