-- CRM Cabanas · migração 021: Gilberto automático (responde sozinho) com pausa por conversa.
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run. Pode rodar de novo.
-- O liga/desliga geral fica em config ('gilberto_auto'). Em cada conversa, a equipe pode assumir (pausa o Gilberto)
-- e devolver. Responder à mão ou tocar em "Assumir" num alerta também pausa o Gilberto naquela conversa.

alter table conversas add column if not exists gilberto_pausado boolean not null default false;
alter table conversas add column if not exists gilberto_pausado_por uuid references usuarios(id) on delete set null;
alter table conversas add column if not exists gilberto_pausado_em timestamptz;
