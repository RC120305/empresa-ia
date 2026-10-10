-- 027: agências e operadoras sincronizadas com o cadastro de Empresas do Silbeck (dono, 10/10/2026, opção 2)
-- O CRM traz todas as empresas do Silbeck; a aba Agências mostra só as que a equipe marcar como agência/operadora.
-- Pode rodar de novo sem estragar nada.
alter table agencias add column if not exists silbeck_id text;            -- id da empresa no Silbeck (GET /v1/Empresa)
alter table agencias add column if not exists eh_agencia boolean not null default true; -- aparece na aba Agências
alter table agencias add column if not exists sincronizado_em timestamptz; -- última vez que veio do Silbeck
create unique index if not exists agencias_silbeck_id on agencias (silbeck_id) where silbeck_id is not null;
create index if not exists agencias_cnpj on agencias (cnpj);
