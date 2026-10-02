-- CRM Cabanas · migração 012: oferta e venda de produtos (Etapa C2).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run. Pode rodar de novo.
-- 1) Produto completo: para quem (perfis, idade e altura mínimas), preço em número, variações e adicionais, fotos.
-- 2) Ofertas: cada produto oferecido numa conversa (pela equipe ou pelo Gilberto) e a resposta do cliente.
--    No WhatsApp a oferta sai com a foto do produto e os botões "Eu aceito" / "Não, obrigado"; o toque do cliente marca a resposta.
--    Regra do dono: no máximo 1 oferta por conversa; recusou, não insiste.
-- 3) Vendas: o que o cliente aceitou. Nesta fase tudo vai para a conta do hóspede e é acertado no check-out
--    (dono, 02/10/2026); o CRM cria a tarefa "Lançar na conta do hóspede" para ninguém esquecer.
-- Só o servidor grava; a equipe lê (RLS).

alter table produtos add column if not exists perfis text[] not null default '{}';          -- vazio = todos os perfis
alter table produtos add column if not exists idade_minima int;
alter table produtos add column if not exists altura_minima_cm int;
alter table produtos add column if not exists preco_valor numeric(10,2);                    -- sem variação: o preço em número
alter table produtos add column if not exists unidade text not null default 'unidade';
alter table produtos add column if not exists variacoes jsonb not null default '[]';        -- [{nome, preco, descricao}]
alter table produtos add column if not exists adicionais jsonb not null default '[]';       -- [{nome, preco}]
alter table produtos add column if not exists grupo_fotos text;                             -- categoria do Banco de fotos
alter table produtos add column if not exists foto text;                                    -- foto representativa (vai na oferta pelo WhatsApp)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'produtos_unidade_check') then
    alter table produtos add constraint produtos_unidade_check check (unidade in ('pessoa','unidade'));
  end if;
end $$;

-- Catálogo inicial completo (só preenche o que ainda está vazio: não desfaz o que a equipe editou)
update produtos set preco_valor = 170, unidade = 'pessoa', perfis = '{Casal,"Família com filhos","Grupo de amigos"}', idade_minima = 5, altura_minima_cm = 115, grupo_fotos = 'BOIA'
  where codigo = 'COMBO' and preco_valor is null and perfis = '{}' and variacoes = '[]';
update produtos set preco_valor = 100, unidade = 'pessoa', perfis = '{"Família com filhos","Grupo de amigos"}', idade_minima = 5, altura_minima_cm = 115, grupo_fotos = 'BOIA'
  where codigo = 'BOIA' and preco_valor is null and perfis = '{}' and variacoes = '[]';
update produtos set preco_valor = 120, unidade = 'pessoa', perfis = '{Casal,"Família com filhos","Grupo de amigos"}', idade_minima = 5, altura_minima_cm = 115, grupo_fotos = 'ARVO'
  where codigo = 'ARVO' and preco_valor is null and perfis = '{}' and variacoes = '[]';
update produtos set unidade = 'unidade', perfis = '{Casal}', grupo_fotos = 'DECO',
  variacoes = '[{"nome":"Simples","preco":350,"descricao":"Balão personalizável e até 8 fotos polaroid do casal"},{"nome":"Completa","preco":600,"descricao":"Balão personalizável, pétalas de rosas, tábua de frios completa, espumante e até 8 fotos polaroid do casal"}]'
  where codigo = 'DECO' and preco_valor is null and perfis = '{}' and variacoes = '[]';
update produtos set unidade = 'pessoa', perfis = '{Casal,55+}',
  variacoes = '[{"nome":"Massagem360","preco":220,"descricao":"Mix de relaxante, shiatsu, drenagem, reflexologia e alongamentos básicos"},{"nome":"Massagem relaxante","preco":220,"descricao":"Pressão suave a moderada, para relaxar e aliviar o estresse"},{"nome":"Massagem linfática","preco":220,"descricao":"Movimentos leves que estimulam a circulação e reduzem o inchaço"}]',
  adicionais = '[{"nome":"Máscara de argila","preco":50},{"nome":"Reflexologia (15 min)","preco":50},{"nome":"Cone hindu","preco":80},{"nome":"Mais 30 minutos","preco":150},{"nome":"Pedras quentes","preco":50}]'
  where codigo = 'MASS' and preco_valor is null and perfis = '{}' and variacoes = '[]';

-- Foto representativa de cada produto (do Banco de fotos); a equipe troca na tela Produtos
update produtos set foto = 'BOIA-1.jpg' where codigo in ('COMBO','BOIA') and foto is null;
update produtos set foto = 'ARVO-1.jpg' where codigo = 'ARVO' and foto is null;
update produtos set foto = 'DECO-1.jpg' where codigo = 'DECO' and foto is null;

create table if not exists ofertas (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references conversas(id) on delete cascade,
  negocio_id uuid references negocios(id) on delete set null,
  produto_codigo text not null,
  produto_nome text not null,
  por text not null default 'equipe' check (por in ('equipe','gilberto','pagina')),   -- pagina = o cliente marcou na página do orçamento
  autor_id uuid references usuarios(id) on delete set null,
  situacao text not null default 'oferecido' check (situacao in ('oferecido','aceito','recusado')),
  criado_em timestamptz not null default now(),
  respondido_em timestamptz
);
create index if not exists ofertas_conversa on ofertas (conversa_id, criado_em desc);

create table if not exists vendas (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid references conversas(id) on delete set null,
  negocio_id uuid references negocios(id) on delete set null,
  oferta_id uuid references ofertas(id) on delete set null,
  produto_codigo text not null,
  produto_nome text not null,
  variacao text,
  adicionais jsonb not null default '[]',                       -- [{nome, preco}]
  quantidade int not null default 1 check (quantidade between 1 and 50),
  valor_unitario numeric(10,2) not null,
  valor_total numeric(12,2) not null,
  data_uso date,
  horario text,
  observacoes text,
  pagamento text not null default 'conta_hospede',              -- nesta fase: sempre na conta do hóspede (check-out)
  situacao text not null default 'vendido' check (situacao in ('vendido','lancado','cancelado')),
  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  lancado_em timestamptz,
  lancado_por uuid references usuarios(id) on delete set null
);
create index if not exists vendas_conversa on vendas (conversa_id, criado_em desc);
create index if not exists vendas_negocio on vendas (negocio_id);

alter table ofertas enable row level security;
alter table vendas enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'ofertas' and policyname = 'equipe le ofertas') then
    create policy "equipe le ofertas" on ofertas for select to authenticated using (usuario_ativo()); end if;
  if not exists (select 1 from pg_policies where tablename = 'vendas' and policyname = 'equipe le vendas') then
    create policy "equipe le vendas" on vendas for select to authenticated using (usuario_ativo()); end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'ofertas') then
      alter publication supabase_realtime add table ofertas; end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'vendas') then
      alter publication supabase_realtime add table vendas; end if;
  end if;
end $$;
