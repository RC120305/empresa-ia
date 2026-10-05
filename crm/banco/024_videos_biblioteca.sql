-- CRM Cabanas · migração 024: vídeos no banco de imagens (dono, 06/10/2026).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run. Pode rodar de novo.
-- A tabela fotos_biblioteca só aceitava arquivos .jpg; passa a aceitar também .mp4 (vídeos trazidos do Drive).
alter table fotos_biblioteca drop constraint if exists fotos_biblioteca_arquivo_check;
alter table fotos_biblioteca add constraint fotos_biblioteca_arquivo_check check (arquivo ~ '^[A-Za-z0-9_.-]+\.(jpg|mp4)$');
