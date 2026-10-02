-- CRM Cabanas · migração 015: correções da equipe às respostas do questionário (Ajustes do agente → Questionário → ✎ Editar).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run. Pode rodar de novo.
-- A correção fica na biblioteca de respostas com origem 'correcao' e vale no lugar do que a base do Gilberto diz
-- sobre a mesma pergunta. Desfazer = desativar a correção (volta a valer o texto original).

alter table respostas drop constraint if exists respostas_origem_check;
alter table respostas add constraint respostas_origem_check check (origem in ('equipe','questionario','revisao','correcao'));
