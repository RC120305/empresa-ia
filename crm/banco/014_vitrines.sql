-- CRM Cabanas · migração 014: oferta de extras por link (páginas temáticas, como a do orçamento).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run. Pode rodar de novo.
-- Dois links (dono, 02/10/2026):
--   aventuras : combo, boia cross e arvorismo;
--   momentos  : decoração especial e massagem.
-- O cliente escolhe na página (opções, adicionais, pessoas, data); a escolha vira venda na conta do hóspede,
-- tarefas e alerta no sino. Fotos de cada produto: a foto representativa + as da(s) categoria(s) do Banco de fotos.

alter table produtos add column if not exists vitrine text;          -- em qual link o produto aparece (aventuras | momentos)
update produtos set vitrine = 'aventuras' where codigo in ('COMBO','BOIA','ARVO') and vitrine is null;
update produtos set vitrine = 'momentos' where codigo in ('DECO','MASS') and vitrine is null;
-- O combo mostra as fotos das duas atividades; a massagem ganha a categoria própria no Banco de fotos
update produtos set grupo_fotos = 'BOIA,ARVO' where codigo = 'COMBO' and (grupo_fotos is null or grupo_fotos = 'BOIA');
update produtos set grupo_fotos = 'MASS' where codigo = 'MASS' and grupo_fotos is null;

create table if not exists vitrines (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,                    -- endereço público /e/<token> (128 bits)
  tema text not null check (tema in ('aventuras','momentos')),
  conversa_id uuid not null references conversas(id) on delete cascade,
  negocio_id uuid references negocios(id) on delete set null,
  por text not null default 'equipe' check (por in ('equipe','gilberto')),
  enviada boolean not null default true,         -- link do Gilberto: só conta como oferta quando a equipe envia a sugestão
  criado_por uuid references usuarios(id) on delete set null,
  aberturas int not null default 0,
  ultima_abertura_em timestamptz,
  pedido jsonb,                                  -- o que o cliente escolheu (itens)
  pedido_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists vitrines_conversa on vitrines (conversa_id, criado_em desc);

-- Abertura da página (só o servidor chama)
create or replace function registrar_abertura_vitrine(p_token text) returns void
language sql security definer set search_path = public as $$
  update vitrines set aberturas = aberturas + 1, ultima_abertura_em = now() where token = p_token;
$$;
revoke all on function registrar_abertura_vitrine(text) from public, anon, authenticated;
grant execute on function registrar_abertura_vitrine(text) to service_role;

alter table vitrines enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'vitrines' and policyname = 'equipe le vitrines') then
    create policy "equipe le vitrines" on vitrines for select to authenticated using (usuario_ativo()); end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'vitrines') then
      alter publication supabase_realtime add table vitrines; end if;
  end if;
end $$;
