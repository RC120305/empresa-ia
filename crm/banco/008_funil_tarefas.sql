-- CRM Cabanas · migração 008: funil de vendas (negócios), tarefas e histórico de cada negócio.
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run.
-- Pode rodar de novo sem estragar nada. Só o servidor grava; a equipe lê (RLS).
-- Automático: cada conversa nova abre um negócio em "Novo"; a 1ª resposta da equipe ou do Gilberto passa para
-- "Em atendimento"; um orçamento criado passa para "Orçamento enviado". As conversas que já existem ganham um negócio.

create table if not exists negocios (
  id uuid primary key default gen_random_uuid(),
  contato_id uuid not null references contatos(id) on delete cascade,
  conversa_id uuid references conversas(id) on delete set null,
  etapa text not null default 'novo' check (etapa in ('novo','atend','orc','pag','res','perd')),
  etapa_desde timestamptz not null default now(),
  responsavel_id uuid references usuarios(id) on delete set null,
  origem text not null default 'whatsapp' check (origem in ('whatsapp','meta','insta','google','site','ret','ind','ag','ota','ativo')),
  perfil text,
  data_entrada date,
  data_saida date,
  hospedes text,
  acomodacao text,
  valor_previsto numeric(12,2),
  motivo_perda text,
  etiquetas text[] not null default '{}',
  notas text,
  fechado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists negocios_etapa on negocios (etapa, atualizado_em desc);
create index if not exists negocios_conversa on negocios (conversa_id);
create index if not exists negocios_contato on negocios (contato_id);

create table if not exists tarefas (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  tipo text not null,
  descricao text,
  quando timestamptz not null,
  responsavel_id uuid references usuarios(id) on delete set null,
  feita boolean not null default false,
  feita_em timestamptz,
  criado_por text,
  criado_em timestamptz not null default now()
);
create index if not exists tarefas_abertas on tarefas (feita, quando);
create index if not exists tarefas_negocio on tarefas (negocio_id);

create table if not exists negocio_eventos (
  id bigserial primary key,
  negocio_id uuid not null references negocios(id) on delete cascade,
  texto text not null,
  por text,
  quando timestamptz not null default now()
);
create index if not exists negocio_eventos_neg on negocio_eventos (negocio_id, quando desc);

alter table negocios enable row level security;
alter table tarefas enable row level security;
alter table negocio_eventos enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'negocios' and policyname = 'equipe le negocios') then
    create policy "equipe le negocios" on negocios for select to authenticated using (usuario_ativo());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'tarefas' and policyname = 'equipe le tarefas') then
    create policy "equipe le tarefas" on tarefas for select to authenticated using (usuario_ativo());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'negocio_eventos' and policyname = 'equipe le historico') then
    create policy "equipe le historico" on negocio_eventos for select to authenticated using (usuario_ativo());
  end if;
end $$;

-- Conversa nova → negócio em "Novo" (se o contato não tiver um negócio em andamento)
create or replace function negocio_da_conversa() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from negocios where contato_id = new.contato_id and etapa not in ('res','perd')) then
    insert into negocios (contato_id, conversa_id) values (new.contato_id, new.id);
    insert into negocio_eventos (negocio_id, texto, por)
      select id, 'Negócio criado pela primeira mensagem no WhatsApp', 'CRM' from negocios where conversa_id = new.id order by criado_em desc limit 1;
  end if;
  return new;
end $$;
drop trigger if exists conversa_abre_negocio on conversas;
create trigger conversa_abre_negocio after insert on conversas for each row execute function negocio_da_conversa();

-- 1ª resposta (equipe ou Gilberto) → "Em atendimento"
create or replace function negocio_em_atendimento() returns trigger
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if new.direcao = 'saida' then
    update negocios set etapa = 'atend', etapa_desde = now(), atualizado_em = now()
      where conversa_id = new.conversa_id and etapa = 'novo' returning id into v;
    if v is not null then insert into negocio_eventos (negocio_id, texto, por) values (v, 'Movido para Em atendimento (primeira resposta)', 'CRM'); end if;
  end if;
  return new;
end $$;
drop trigger if exists mensagem_move_negocio on mensagens;
create trigger mensagem_move_negocio after insert on mensagens for each row execute function negocio_em_atendimento();

-- Orçamento criado → "Orçamento enviado" (de Novo ou Em atendimento), com datas, hóspedes e valor da 1ª opção
create or replace function negocio_orcamento() returns trigger
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  update negocios set etapa = case when etapa in ('novo','atend') then 'orc' else etapa end,
      etapa_desde = case when etapa in ('novo','atend') then now() else etapa_desde end,
      data_entrada = new.data_entrada, data_saida = new.data_saida,
      hospedes = new.adultos || ' adulto(s)' || case when cardinality(new.criancas_idades) > 0 then ' + ' || cardinality(new.criancas_idades) || ' criança(s)' else '' end,
      acomodacao = coalesce(new.opcoes -> 0 ->> 'nome', acomodacao),
      valor_previsto = coalesce((new.opcoes -> 0 ->> 'valor_total')::numeric, valor_previsto),
      atualizado_em = now()
    where conversa_id = new.conversa_id and etapa not in ('res','perd') returning id into v;
  if v is not null then insert into negocio_eventos (negocio_id, texto, por) values (v, 'Orçamento enviado: ' || coalesce((select string_agg(x ->> 'nome', ', ') from jsonb_array_elements(new.opcoes) x), ''), 'CRM'); end if;
  return new;
end $$;
drop trigger if exists orcamento_move_negocio on orcamentos;
create trigger orcamento_move_negocio after insert on orcamentos for each row execute function negocio_orcamento();

revoke all on function negocio_da_conversa() from public, anon, authenticated;
revoke all on function negocio_em_atendimento() from public, anon, authenticated;
revoke all on function negocio_orcamento() from public, anon, authenticated;

-- Conversas que já existem: um negócio para cada contato que ainda não tem (em atendimento se já houve resposta)
insert into negocios (contato_id, conversa_id, etapa, responsavel_id)
  select c.contato_id, c.id,
    case when exists (select 1 from orcamentos o where o.conversa_id = c.id) then 'orc'
         when exists (select 1 from mensagens m where m.conversa_id = c.id and m.direcao = 'saida') then 'atend' else 'novo' end,
    case when c.atribuida_a is not null and exists (select 1 from usuarios u where u.id = c.atribuida_a) then c.atribuida_a end
  from conversas c
  where not exists (select 1 from negocios n where n.contato_id = c.contato_id);

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'negocios') then
      alter publication supabase_realtime add table negocios;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'tarefas') then
      alter publication supabase_realtime add table tarefas;
    end if;
  end if;
end $$;
