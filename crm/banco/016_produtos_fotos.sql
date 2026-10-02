-- CRM Cabanas · migração 016: fotos escolhidas para cada produto (tela Produtos → 🖼 Fotos).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run. Pode rodar de novo.
-- Lista ordenada de fotos do Banco de fotos (a primeira é a capa). Vazia = usa a foto representativa + a categoria.
alter table produtos add column if not exists fotos text[] not null default '{}';
