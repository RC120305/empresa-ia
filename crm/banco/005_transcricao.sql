-- CRM Cabanas · migração 005: transcrição dos áudios (Speech-to-Text do Google).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run.
-- Pode rodar de novo sem estragar nada.
-- O texto fica na própria mensagem; só o servidor grava (chave secreta). A equipe lê pelas regras que já existem.

alter table mensagens add column if not exists transcricao text;
alter table mensagens add column if not exists transcricao_status text; -- ok · vazio · longo · falhou
