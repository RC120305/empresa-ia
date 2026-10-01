-- CRM Cabanas · migração 001 (fase 1, início): contatos, conversas e mensagens do WhatsApp.
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run.
-- Pode rodar de novo sem estragar nada (tudo usa "if not exists" / "or replace").
-- Segurança: RLS ligada em todas as tabelas e nenhuma política ainda, ou seja, só o servidor
-- (chave secreta) lê e grava. As políticas por papel entram junto com o login da equipe.

create extension if not exists pgcrypto;

create table if not exists contatos (
  id uuid primary key default gen_random_uuid(),
  nome text,                         -- nome do perfil do WhatsApp (pode ser trocado pela equipe)
  observacoes text,
  etiquetas text[] not null default '{}',
  excluido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists contato_identificadores (
  id uuid primary key default gen_random_uuid(),
  contato_id uuid not null references contatos(id) on delete cascade,
  tipo text not null check (tipo in ('whatsapp','telefone','email','ig_scoped_id','psid_messenger')),
  valor text not null,               -- WhatsApp em E.164 (+5567...)
  verificado boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (tipo, valor)
);

create table if not exists conversas (
  id uuid primary key default gen_random_uuid(),
  contato_id uuid not null references contatos(id) on delete cascade,
  canal text not null check (canal in ('wa','ig','fb','email')),
  numero_id text not null,           -- ID do número da Meta que recebeu (teste, 99117, 99110)
  status text not null default 'aberta' check (status in ('aberta','resolvida','arquivada')),
  atribuida_a uuid,
  modo_gilberto text not null default 'herdar' check (modo_gilberto in ('herdar','desligado','sugestao','automatico')),
  ultima_msg_cliente_em timestamptz,  -- janela de 24 h da Meta
  ultima_msg_em timestamptz,
  nao_lidas int not null default 0,
  etiquetas text[] not null default '{}',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (contato_id, canal, numero_id)
);
create index if not exists conversas_lista on conversas (status, ultima_msg_em desc);

create table if not exists mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references conversas(id) on delete cascade,
  direcao text not null check (direcao in ('entrada','saida')),
  autor text not null,               -- cliente, gilberto, sistema, app_externo ou id do usuário
  tipo text not null,                -- text, image, audio, video, document, location, button, reaction…
  corpo text,
  midia_id text,                     -- ID da mídia na Meta (download na próxima etapa)
  id_externo text unique,            -- wamid da Meta: impede gravar a mesma mensagem duas vezes
  status_entrega text,               -- sent, delivered, read, failed (mensagens de saída)
  erro text,
  enviada_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);
create index if not exists mensagens_conversa on mensagens (conversa_id, enviada_em);

create table if not exists eventos_entrada (
  id uuid primary key default gen_random_uuid(),
  fonte text not null,               -- meta, cielo, bb
  chave_idempotencia text not null unique,
  tipo text,
  recebido_em timestamptz not null default now(),
  processado_em timestamptz,
  erro text
);

alter table contatos enable row level security;
alter table contato_identificadores enable row level security;
alter table conversas enable row level security;
alter table mensagens enable row level security;
alter table eventos_entrada enable row level security;

-- Grava uma mensagem recebida do WhatsApp (contato + conversa + mensagem) numa única transação.
-- Idempotente: se a Meta reenviar o mesmo evento, nada é duplicado.
create or replace function registrar_entrada_whatsapp(
  p_numero_id text, p_de text, p_nome text, p_wamid text, p_tipo text,
  p_corpo text, p_midia_id text, p_quando timestamptz
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_tel text := '+' || regexp_replace(p_de, '\D', '', 'g');
  v_quando timestamptz := coalesce(p_quando, now());
  v_contato uuid; v_conversa uuid; v_msg uuid;
begin
  select contato_id into v_contato from contato_identificadores where tipo = 'whatsapp' and valor = v_tel;
  if v_contato is null then
    insert into contatos (nome) values (nullif(p_nome, '')) returning id into v_contato;
    insert into contato_identificadores (contato_id, tipo, valor, verificado)
      values (v_contato, 'whatsapp', v_tel, true)
      on conflict (tipo, valor) do nothing;
    select contato_id into v_contato from contato_identificadores where tipo = 'whatsapp' and valor = v_tel;
  end if;

  insert into conversas (contato_id, canal, numero_id)
    values (v_contato, 'wa', p_numero_id)
    on conflict (contato_id, canal, numero_id) do nothing;
  select id into v_conversa from conversas where contato_id = v_contato and canal = 'wa' and numero_id = p_numero_id;

  insert into mensagens (conversa_id, direcao, autor, tipo, corpo, midia_id, id_externo, enviada_em)
    values (v_conversa, 'entrada', 'cliente', p_tipo, p_corpo, p_midia_id, p_wamid, v_quando)
    on conflict (id_externo) do nothing
    returning id into v_msg;

  if v_msg is not null then
    update conversas set
      status = 'aberta',
      ultima_msg_cliente_em = greatest(coalesce(ultima_msg_cliente_em, v_quando), v_quando),
      ultima_msg_em = greatest(coalesce(ultima_msg_em, v_quando), v_quando),
      nao_lidas = nao_lidas + 1,
      atualizado_em = now()
    where id = v_conversa;
  end if;

  return jsonb_build_object('conversa_id', v_conversa, 'mensagem_id', v_msg, 'nova', v_msg is not null);
end $$;

-- Atualiza o status de uma mensagem enviada (enviado, entregue, lido, falhou).
create or replace function registrar_status_whatsapp(p_wamid text, p_status text, p_erro text)
returns void language sql security definer set search_path = public as $$
  update mensagens set status_entrega = p_status, erro = coalesce(p_erro, erro)
  where id_externo = p_wamid
    and coalesce(status_entrega, '') <> 'read';  -- "lido" não volta para "entregue"
$$;

-- Só o servidor (chave secreta) pode chamar as funções; visitantes e usuários logados não.
revoke all on function registrar_entrada_whatsapp(text,text,text,text,text,text,text,timestamptz) from public, anon, authenticated;
revoke all on function registrar_status_whatsapp(text,text,text) from public, anon, authenticated;
grant execute on function registrar_entrada_whatsapp(text,text,text,text,text,text,text,timestamptz) to service_role;
grant execute on function registrar_status_whatsapp(text,text,text) to service_role;
