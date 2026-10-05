-- Confirmação do dono (06/10/2026): canais oficiais do documento de golpes. Cole numa consulta nova e vazia e clique em Run.
update gilberto_documentos set
  atualizado_em = now(),
  alertas = '["Canais oficiais confirmados pelo dono em 06/10/2026: telefone (67) 99110-7635 para ligação comum e este WhatsApp (o número do Gilberto).", "Os dados do Pix (Hotel Cabanas Ltda, BB ag. 1031-6, c/c 8583-9) são os mesmos que o CRM já manda junto de cada Pix."]'::jsonb
where titulo = 'Segurança: como evitar golpes';

select titulo, situacao, atualizado_em from gilberto_documentos where titulo = 'Segurança: como evitar golpes';
