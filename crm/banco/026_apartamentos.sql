-- CRM Cabanas · migração 026: os apartamentos do hotel pela numeração (dono, 08/10/2026).
-- Cada apartamento pertence a uma categoria; as fotos do Banco de fotos podem ser ligadas a um apartamento, para o
-- Gilberto e a página do orçamento mandarem as fotos certas (há diferenças até dentro da mesma categoria:
-- o 31, Duplo Casa Standard, só tem cama de casal; os Standard têm cama de casal e de solteiro).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run. Pode rodar de novo.
-- Só o servidor grava; a equipe lê (RLS). Sem dados de hóspedes.

create table if not exists apartamentos (
  numero int primary key check (numero between 1 and 999),
  codigo_silbeck text not null,                 -- tipo no Silbeck: CAB, CABT, CABMAS, STD, STD1, DPLS, QSTD, QSUP, CON, BANG3, BANG4, BANG4C
  categoria text not null,                      -- código do CRM: CBD, CBT, CBM, STD, CST, SUP, QST, QES, CJ, BANG3, BANG4, BGE
  descricao text,                               -- o que distingue este apartamento (camas, vista, andar...)
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now()
);
alter table apartamentos enable row level security;
drop policy if exists "equipe le apartamentos" on apartamentos;
create policy "equipe le apartamentos" on apartamentos for select to authenticated using (usuario_ativo());

-- Foto ligada a um apartamento (a categoria da foto passa a ser a do apartamento)
alter table fotos_biblioteca add column if not exists apartamento int references apartamentos(numero) on delete set null;

-- Os 21 apartamentos do mapa do Silbeck (08/10/2026). Não sobrescreve o que a equipe já editou.
insert into apartamentos (numero, codigo_silbeck, categoria, descricao) values
  (1, 'CAB', 'CBD', null), (2, 'CAB', 'CBD', null), (3, 'CAB', 'CBD', null),
  (4, 'CABT', 'CBT', null),
  (5, 'CABMAS', 'CBM', null),
  (10, 'STD', 'STD', 'Cama de casal e cama de solteiro'), (11, 'STD', 'STD', 'Cama de casal e cama de solteiro'),
  (12, 'QSTD', 'QST', null), (13, 'QSTD', 'QST', null),
  (14, 'DPLS', 'SUP', null), (15, 'DPLS', 'SUP', null),
  (20, 'STD', 'STD', 'Cama de casal e cama de solteiro'), (21, 'STD', 'STD', 'Cama de casal e cama de solteiro'),
  (22, 'STD', 'STD', 'Cama de casal e cama de solteiro'), (23, 'STD', 'STD', 'Cama de casal e cama de solteiro'),
  (30, 'CON', 'CJ', null),
  (31, 'STD1', 'CST', 'Só uma cama de casal (sem cama de solteiro)'),
  (32, 'QSUP', 'QES', null),
  (40, 'BANG4', 'BANG4', null),
  (41, 'BANG3', 'BANG3', null),
  (42, 'BANG4C', 'BGE', null)
on conflict (numero) do nothing;
