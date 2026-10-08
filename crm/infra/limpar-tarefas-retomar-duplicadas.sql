-- CRM Cabanas: fecha as tarefas "Retomar orçamento" duplicadas (dono, 08/10/2026).
-- Para cada negócio, mantém aberta só a mais recente; as outras ficam como feitas (nada é apagado).
-- Como aplicar: Supabase > SQL Editor > New query > colar > Run.
update tarefas set feita = true, feita_em = now()
where tipo = 'Retomar orçamento' and feita = false
  and id not in (
    select distinct on (negocio_id) id from tarefas
    where tipo = 'Retomar orçamento' and feita = false
    order by negocio_id, criado_em desc
  );
