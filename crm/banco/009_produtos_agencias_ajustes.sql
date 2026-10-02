-- CRM Cabanas · migração 009: Produtos, Agências e Ajustes do agente (biblioteca de respostas e revisão das sugestões).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run.
-- Pode rodar de novo sem estragar nada. Só o servidor grava; a equipe lê (RLS).

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  descricao text,
  preco text not null,                          -- como o cliente lê: "R$ 170 por pessoa", "R$ 350 ou R$ 600"
  tipo_reserva text not null default 'simples' check (tipo_reserva in ('ativ','terc','simples')),
  regras text,                                  -- idade, altura, restrições
  quando_oferecer text,
  antecedencia_dias int not null default 0,
  prioridade int not null default 9,
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now()
);
insert into produtos (codigo, nome, descricao, preco, tipo_reserva, regras, quando_oferecer, antecedencia_dias, prioridade) values
  ('COMBO', 'Combo boia cross + arvorismo', 'As duas aventuras dentro do hotel, com guias.', 'R$ 170 por pessoa', 'ativ', '5 anos ou mais e 1,15 m; sem gestantes e sem álcool', 'Na cotação', 0, 1),
  ('BOIA', 'Boia cross', '1 h, 1.200 m de corredeiras e cachoeiras do Rio Formoso, com guias.', 'R$ 100 por pessoa', 'ativ', '5 anos ou mais e 1,15 m; sem gestantes e sem álcool', 'Cotação e estadia', 0, 2),
  ('ARVO', 'Arvorismo', '18 obstáculos e 2 tirolesas, a última aquática no Rio Formoso (1 h 15).', 'R$ 120 por pessoa', 'ativ', '5 anos ou mais e 1,15 m; sem gestantes e sem álcool', 'Cotação e estadia', 0, 3),
  ('DECO', 'Decoração especial', 'Simples (balão personalizável e até 8 fotos polaroid) ou Completa (com pétalas, tábua de frios e espumante), preparada no quarto.', 'Simples R$ 350 ou Completa R$ 600', 'simples', 'Pedir com 3 dias de antecedência', 'Na cotação', 3, 4),
  ('MASS', 'Massagem', 'Massagem360, relaxante ou linfática, com a parceira Natália (Massagem 360); lançada na conta do hóspede.', 'R$ 220', 'terc', 'Horários: 8h, 9h, 10h, 14h, 15h e 16h', 'Durante a estadia', 0, 5)
on conflict (codigo) do nothing;

create table if not exists agencias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  telefone text,
  email text,
  comissao numeric(5,2),
  codigo_silbeck text,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists respostas (
  id uuid primary key default gen_random_uuid(),
  pergunta text not null,
  resposta text not null,
  atalho text,                                  -- usado com "/" na conversa (ex.: /local)
  fixa boolean not null default false,          -- o Gilberto envia exatamente este texto
  valida_ate date,
  usos int not null default 0,
  ativo boolean not null default true,
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index if not exists respostas_atalho on respostas (lower(atalho)) where atalho is not null and ativo;

-- Cada sugestão do Gilberto fica registrada para a revisão (Ajustes do agente → Revisão)
create table if not exists sugestoes (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid references conversas(id) on delete cascade,
  pergunta text,                                -- última mensagem do cliente
  mensagem text not null,
  notas_internas text,
  precisa_equipe boolean not null default false,
  modelo text,
  ferramentas jsonb,                            -- cotações, orçamentos e fotos usados
  pedida_por text,
  situacao text not null default 'pendente' check (situacao in ('pendente','usada','descartada','aprovada','reprovada')),
  motivo text,
  revisada_por text,
  revisada_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists sugestoes_situacao on sugestoes (situacao, criado_em desc);

alter table produtos enable row level security;
alter table agencias enable row level security;
alter table respostas enable row level security;
alter table sugestoes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'produtos' and policyname = 'equipe le produtos') then
    create policy "equipe le produtos" on produtos for select to authenticated using (usuario_ativo()); end if;
  if not exists (select 1 from pg_policies where tablename = 'agencias' and policyname = 'equipe le agencias') then
    create policy "equipe le agencias" on agencias for select to authenticated using (usuario_ativo()); end if;
  if not exists (select 1 from pg_policies where tablename = 'respostas' and policyname = 'equipe le respostas') then
    create policy "equipe le respostas" on respostas for select to authenticated using (usuario_ativo()); end if;
  if not exists (select 1 from pg_policies where tablename = 'sugestoes' and policyname = 'equipe le sugestoes') then
    create policy "equipe le sugestoes" on sugestoes for select to authenticated using (usuario_ativo()); end if;
end $$;
