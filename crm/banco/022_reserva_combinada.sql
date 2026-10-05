-- CRM Cabanas · migração 022: reserva de grupo em mais de uma acomodação (combinação).
-- Como aplicar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run. Pode rodar de novo.
-- Uma reserva no Silbeck com um item por acomodação. Em "itens" ficam o código, o item do Silbeck, quem fica
-- em cada acomodação e o valor de cada uma: quando o Pix cai, o CRM divide o pagamento entre os itens.

alter table reservas add column if not exists itens jsonb;
