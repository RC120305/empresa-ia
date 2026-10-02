-- CRM Cabanas · migração 003: responder pelo CRM (mensagens de saída da equipe).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run.
-- Pode rodar de novo sem estragar nada. Só o servidor (chave secreta) chama estas funções.

-- Quem é a pessoa da equipe dona deste e-mail (o servidor confere antes de enviar).
create or replace function equipe_por_email(p_email text)
returns table (id uuid, nome text, papel text)
language sql stable security definer set search_path = public as $$
  select id, nome, papel from usuarios where lower(email) = lower(p_email) and ativo;
$$;

-- Grava a mensagem que a equipe enviou pelo CRM (depois de a Meta aceitar o envio).
create or replace function registrar_saida_whatsapp(p_conversa uuid, p_wamid text, p_corpo text, p_autor text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into mensagens (conversa_id, direcao, autor, tipo, corpo, id_externo, status_entrega)
    values (p_conversa, 'saida', p_autor, 'text', p_corpo, p_wamid, 'sent')
    on conflict (id_externo) do nothing
    returning id into v_id;
  update conversas set ultima_msg_em = now(), atualizado_em = now() where id = p_conversa;
  return v_id;
end $$;

revoke all on function equipe_por_email(text) from public, anon, authenticated;
revoke all on function registrar_saida_whatsapp(uuid, text, text, text) from public, anon, authenticated;
grant execute on function equipe_por_email(text) to service_role;
grant execute on function registrar_saida_whatsapp(uuid, text, text, text) to service_role;
