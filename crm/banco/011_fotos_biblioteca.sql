-- CRM Cabanas · migração 011: a equipe gerencia o Banco de fotos (trazer do Drive, tirar e devolver fotos).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run. Pode rodar de novo.
-- As 43 fotos da curadoria continuam no código (public/fotos); aqui ficam só os ajustes:
--   origem 'drive': foto trazida do Drive pela equipe (o arquivo fica no Storage, midias/biblioteca/<arquivo>);
--   origem 'base' : foto da curadoria que a equipe tirou (ativo = false) ou devolveu (ativo = true).
-- Nada é apagado: a foto tirada some do envio, da página do orçamento e do Gilberto, e pode voltar.
-- Só o servidor grava; a equipe lê (RLS).

create table if not exists fotos_biblioteca (
  arquivo text primary key check (arquivo ~ '^[A-Za-z0-9_.-]+\.jpg$'),
  grupo text not null,                          -- categoria: CBD, CBT, CBM, BG, BGE, CJ, SUP, STD, BOIA, ARVO, RIO, PISCINA, CAFE, DECO
  descricao text,
  etiquetas text[] not null default '{}',
  decoracao boolean not null default false,     -- mostra a decoração especial (opcional, cobrada à parte)
  drive_id text,
  origem text not null default 'drive' check (origem in ('base','drive')),
  ativo boolean not null default true,
  ordem int not null default 100,
  criado_por uuid references usuarios(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table fotos_biblioteca enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'fotos_biblioteca' and policyname = 'equipe le fotos') then
    create policy "equipe le fotos" on fotos_biblioteca for select to authenticated using (usuario_ativo()); end if;
end $$;
