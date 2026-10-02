-- CRM Cabanas · migração 007: ficha do cliente na caixa de entrada (e-mail do contato).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run.
-- Pode rodar de novo sem estragar nada. Quem grava é o servidor (a equipe edita pela caixa, com login).

alter table contatos add column if not exists email text;
