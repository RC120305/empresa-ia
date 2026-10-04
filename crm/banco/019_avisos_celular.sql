-- CRM Cabanas · migração 019: avisos no celular (notificações push do CRM instalado na tela inicial).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run. Pode rodar de novo.
-- Cada aparelho que ativa os avisos vira uma inscrição (endereço do serviço de push do navegador + chaves públicas do aparelho).
-- Só o servidor lê e grava as inscrições (sem regra de leitura para a equipe).

create table if not exists push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  aparelho text,                                   -- ex.: "Android · Chrome" (para a pessoa reconhecer)
  criado_em timestamptz not null default now(),
  ultimo_envio_em timestamptz
);
create index if not exists push_inscricoes_usuario on push_inscricoes (usuario_id);
alter table push_inscricoes enable row level security;

-- Quando o alerta já foi avisado no celular (os que já existem não são avisados de novo)
alter table alertas add column if not exists notificado_em timestamptz;
do $$ begin
  if not exists (select 1 from push_inscricoes) then
    update alertas set notificado_em = coalesce(notificado_em, now()) where notificado_em is null;
  end if;
end $$;
create index if not exists alertas_a_notificar on alertas (quando) where notificado_em is null and situacao = 'aberto';
