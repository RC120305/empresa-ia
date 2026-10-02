-- CRM Cabanas · migração 004: fotos, vídeos, áudios e documentos das conversas.
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run.
-- Pode rodar de novo sem estragar nada.
-- Os arquivos ficam no Supabase Storage, no compartimento PRIVADO "midias" (a Meta apaga os dela em 30 dias).
-- Só o servidor do CRM lê e grava ali; a tela da equipe recebe os arquivos pelo servidor, com login.

alter table mensagens add column if not exists midia_caminho text; -- caminho no compartimento "midias"
alter table mensagens add column if not exists midia_mime text;
alter table mensagens add column if not exists midia_nome text;    -- nome do arquivo (documentos)

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit)
      values ('midias', 'midias', false, 104857600)
      on conflict (id) do nothing;
  end if;
end $$;

-- Grava uma mídia que a equipe enviou pelo CRM (depois de a Meta aceitar).
create or replace function registrar_saida_midia(
  p_conversa uuid, p_wamid text, p_tipo text, p_legenda text, p_caminho text, p_mime text, p_nome text, p_autor text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into mensagens (conversa_id, direcao, autor, tipo, corpo, id_externo, status_entrega, midia_caminho, midia_mime, midia_nome)
    values (p_conversa, 'saida', p_autor, p_tipo, nullif(p_legenda, ''), p_wamid, 'sent', p_caminho, p_mime, p_nome)
    on conflict (id_externo) do nothing
    returning id into v_id;
  update conversas set ultima_msg_em = now(), atualizado_em = now() where id = p_conversa;
  return v_id;
end $$;
revoke all on function registrar_saida_midia(uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function registrar_saida_midia(uuid, text, text, text, text, text, text, text) to service_role;
