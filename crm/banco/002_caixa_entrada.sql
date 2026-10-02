-- CRM Cabanas · migração 002: caixa de entrada (login da equipe e leitura das conversas).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run.
-- Pode rodar de novo sem estragar nada.
-- Regra de acesso: só quem estiver na tabela "usuarios" (ativo) lê as conversas. Visitante e
-- qualquer outra conta do Supabase não veem nada. O servidor (chave secreta) continua gravando.

create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  nome text not null,
  papel text not null default 'atendente' check (papel in ('dono','gestor','ti','atendente','recepcao')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create unique index if not exists usuarios_email on usuarios (lower(email));
alter table usuarios enable row level security;

-- A pessoa logada está liberada? (lê o e-mail do login; security definer para enxergar "usuarios")
create or replace function usuario_ativo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from usuarios
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) and ativo
  );
$$;
revoke all on function usuario_ativo() from public, anon;
grant execute on function usuario_ativo() to authenticated, service_role;

-- Cada pessoa vê o próprio cadastro (nome e papel na tela).
drop policy if exists usuarios_ver_proprio on usuarios;
create policy usuarios_ver_proprio on usuarios for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Leitura das conversas: só equipe liberada.
drop policy if exists equipe_le_contatos on contatos;
create policy equipe_le_contatos on contatos for select to authenticated using (usuario_ativo());
drop policy if exists equipe_le_identificadores on contato_identificadores;
create policy equipe_le_identificadores on contato_identificadores for select to authenticated using (usuario_ativo());
drop policy if exists equipe_le_conversas on conversas;
create policy equipe_le_conversas on conversas for select to authenticated using (usuario_ativo());
drop policy if exists equipe_le_mensagens on mensagens;
create policy equipe_le_mensagens on mensagens for select to authenticated using (usuario_ativo());

grant select on contatos, contato_identificadores, conversas, mensagens, usuarios to authenticated;

-- Abrir a conversa zera as não lidas (única escrita da tela nesta etapa).
create or replace function marcar_conversa_lida(p_conversa uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not usuario_ativo() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  update conversas set nao_lidas = 0, atualizado_em = now() where id = p_conversa and nao_lidas <> 0;
end $$;
revoke all on function marcar_conversa_lida(uuid) from public, anon;
grant execute on function marcar_conversa_lida(uuid) to authenticated;

-- Tempo real: a tela recebe mensagens novas sem recarregar (respeitando as regras acima).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'mensagens') then
      execute 'alter publication supabase_realtime add table mensagens';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'conversas') then
      execute 'alter publication supabase_realtime add table conversas';
    end if;
  end if;
end $$;

-- Liberar uma pessoa da equipe (rodar à parte, trocando o e-mail; não fica salvo no repositório):
--   insert into usuarios (email, nome, papel) values ('email@exemplo.com', 'Nome', 'dono')
--   on conflict ((lower(email))) do update set ativo = true;
