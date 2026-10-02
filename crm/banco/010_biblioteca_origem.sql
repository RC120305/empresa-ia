-- CRM Cabanas · migração 010: de onde veio cada resposta da biblioteca (equipe, questionário ou revisão).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run. Pode rodar de novo.
-- As que vêm do questionário já estão na base do Gilberto: servem de resposta rápida para a equipe e não são repetidas para ele.

alter table respostas add column if not exists origem text not null default 'equipe';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'respostas_origem_check') then
    alter table respostas add constraint respostas_origem_check check (origem in ('equipe','questionario','revisao'));
  end if;
end $$;
