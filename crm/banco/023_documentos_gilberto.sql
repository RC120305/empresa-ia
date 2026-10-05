-- CRM Cabanas · migração 023: documentos que ensinam o Gilberto (Ajustes do agente > Documentos).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run. Pode rodar de novo.
-- Qualquer pessoa da equipe envia um PDF ou texto; o CRM prepara (fatos e perguntas e respostas, com os
-- conflitos com a base do hotel apontados) e o documento fica "aguardando". Só o dono aprova: a partir daí o
-- Gilberto usa o conteúdo. O arquivo original não é guardado, só o texto preparado.

create table if not exists gilberto_documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  arquivo text,                              -- nome do arquivo enviado (ou "texto colado")
  tipo text not null default 'texto' check (tipo in ('pdf','texto')),
  resumo text,
  conteudo text not null,                    -- o que o Gilberto lê (preparado pela IA; o dono pode editar)
  conflitos jsonb not null default '[]',     -- pontos que contradizem a base do hotel
  alertas jsonb not null default '[]',       -- dado pessoal, informação duvidosa ou velha etc.
  situacao text not null default 'aguardando' check (situacao in ('aguardando','aprovado','recusado','desligado')),
  motivo text,                               -- motivo da recusa
  enviado_por uuid references usuarios(id) on delete set null,
  aprovado_por uuid references usuarios(id) on delete set null,
  aprovado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists gilberto_documentos_situacao on gilberto_documentos (situacao, criado_em desc);

alter table gilberto_documentos enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'gilberto_documentos' and policyname = 'equipe le documentos') then
    create policy "equipe le documentos" on gilberto_documentos for select to authenticated using (usuario_ativo()); end if;
end $$;
