-- Documento do Gilberto: como chegar em Bonito e ao hotel (pedido do dono, 06/10/2026).
-- Fontes: base do hotel (contexto/hotel-operacional.md), pesquisa de voos de 27/09/2026 (contexto/destino-bonito.md),
-- Acqua Viagens (blog, atualizado em 14/12/2025) e sites de passagens de ônibus (out/2026).
-- Entra "aguardando": o dono aprova em Ajustes do agente > 📚 Documentos. Pode rodar de novo (não duplica).
insert into gilberto_documentos (titulo, arquivo, tipo, resumo, conteudo, conflitos, alertas, situacao)
select 'Como chegar em Bonito e ao hotel', 'pesquisa: base do hotel, voos (set/2026), Acqua Viagens (dez/2025)', 'texto',
  'Voo direto para Bonito ou via Campo Grande, carro, van, ônibus e táxi até o hotel, com distâncias e perguntas e respostas prontas.',
  $doc$## Resumo para o cliente
- O Hotel Cabanas fica a 6 km do centro de Bonito/MS, com todo o acesso em asfalto.
- Há dois jeitos principais de chegar de avião: voo direto para o Aeroporto de Bonito (8 km do hotel) ou voo para Campo Grande e de lá por estrada (cerca de 280 km do aeroporto de Campo Grande até o hotel).
- O hotel não tem transfer próprio, mas indica quem faça. Do Aeroporto de Bonito e da rodoviária de Bonito, o táxi é o mais prático: todos os taxistas conhecem o hotel.

## De avião, direto para Bonito
- O Aeroporto Regional de Bonito fica a 8 km do hotel. É a forma mais rápida de chegar.
- Os voos diretos saem da região de São Paulo (pesquisa de setembro de 2026; dias e horários mudam, confirme no site da companhia):
  - Azul, de Viracopos (Campinas): terça, quinta e domingo.
  - Gol, de Congonhas (São Paulo): terça, sábado e domingo.
  - Latam, de Guarulhos (São Paulo): quarta, sexta e domingo.
- Quem mora em outras cidades pode fazer conexão em São Paulo ou Campinas.
- Do aeroporto ao hotel: táxi ou carro alugado (a Localiza tem loja no aeroporto e na cidade; vale reservar antes).
- Os voos de domingo a quinta combinam bem com estadias nesses dias, quando o hotel costuma ter mais disponibilidade.

## De avião, via Campo Grande
- O Aeroporto Internacional de Campo Grande recebe voos de muitas capitais e costuma ter passagens mais em conta.
- De lá até o hotel são cerca de 280 km de estrada, uns 3h30 a 4h30 de viagem.
- Opções a partir de Campo Grande:
  - Carro alugado: há locadoras no aeroporto. A estrada é asfaltada até o hotel. O caminho mais curto costuma ser pela BR-267 (via "Km 21"); a outra rota é pela BR-060, passando por Sidrolândia.
  - Van turística compartilhada ou carro privativo: várias agências fazem o trajeto Campo Grande–Bonito. O valor muda com a temporada: o cliente confirma com a agência.
  - Ônibus: a Viação Cruzeiro do Sul faz Campo Grande–Bonito saindo da rodoviária de Campo Grande, com cerca de 5 horas de viagem; costuma ter saídas de manhã e à tarde. Do aeroporto à rodoviária de Campo Grande é preciso táxi ou carro de aplicativo. Horários e preço: confirmar no site da empresa ou dos sites de passagens.

## De carro
- Campo Grande e Dourados ficam a cerca de 260 km de Bonito.
- Distâncias aproximadas por estrada até Bonito: São Paulo cerca de 1.180 km; Curitiba cerca de 1.150 km; Brasília cerca de 1.340 km; Rio de Janeiro cerca de 1.610 km.
- O hotel tem estacionamento amplo e arborizado, sem custo e sem reserva (as cabanas têm garagem privativa).

## De ônibus
- Chegando à rodoviária de Bonito, é só pegar um táxi até o hotel.

## Perguntas e respostas
- **P:** Como chego em Bonito?
  **R:** Tem duas formas principais: voo direto para o Aeroporto de Bonito (saindo de São Paulo ou Campinas), que fica a 8 km do hotel, ou voo para Campo Grande e de lá uns 280 km de estrada asfaltada, de carro alugado, van ou ônibus. Quer que eu te passe os detalhes da que fica melhor para você?

- **P:** Tem voo direto para Bonito?
  **R:** Tem, sim: Azul saindo de Campinas, Gol de Congonhas e Latam de Guarulhos, alguns dias por semana. Os dias e horários mudam, então vale conferir no site da companhia. Do aeroporto até o hotel são só 8 km.

- **P:** Vale mais a pena voar para Bonito ou para Campo Grande?
  **R:** Direto para Bonito é mais rápido: você chega e em poucos minutos está no hotel. Por Campo Grande a passagem costuma ser mais em conta e tem mais horários, mas depois são uns 3h30 a 4h30 de estrada até aqui.

- **P:** Como faço de Campo Grande até o hotel?
  **R:** Dá para alugar carro no aeroporto (a estrada é asfaltada até o hotel), ir de van turística ou carro privativo com uma agência, ou de ônibus pela Viação Cruzeiro do Sul, saindo da rodoviária de Campo Grande, com umas 5 horas de viagem.

- **P:** O hotel busca no aeroporto? Tem transfer?
  **R:** Não temos transfer próprio, mas indicamos quem faça. Do Aeroporto de Bonito o táxi é bem prático: são 8 km e todos os taxistas conhecem o hotel.

- **P:** Preciso de carro em Bonito?
  **R:** Não é obrigatório: dá para ir de táxi até o hotel, e aqui dentro as atividades são todas a pé. Para os passeios da região, as agências costumam oferecer transporte. Com carro você tem mais liberdade de horários.

- **P:** A estrada até o hotel é de terra?
  **R:** Não: o acesso é todo asfaltado, e o hotel fica a 6 km do centro.

- **P:** Quantas horas de carro de São Paulo?
  **R:** São cerca de 1.180 km, um dia inteiro de estrada. Muita gente prefere voar direto para Bonito ou para Campo Grande e alugar o carro lá.
$doc$,
  '["A Acqua Viagens diz que o aeroporto fica a 14 km do centro e que Campo Grande fica a 300 km; a base do hotel diz 8 km do aeroporto até o hotel e 280 km do aeroporto de Campo Grande (260 km da cidade). Ficou o que a base diz.", "A Acqua Viagens (dez/2025) lista a Azul com voos também aos sábados; a pesquisa de set/2026 tem terça, quinta e domingo. Ficou a pesquisa mais nova, com o aviso de conferir no site da companhia."]'::jsonb,
  '["Preços de táxi, van e ônibus ficaram de fora: as fontes divergem (ônibus de R$ 80 a R$ 151) e mudam com a temporada. O Gilberto diz para o cliente confirmar com a empresa.", "Dias de voo mudam: conferir a cada 3 meses."]'::jsonb,
  'aguardando'
where not exists (select 1 from gilberto_documentos where titulo = 'Como chegar em Bonito e ao hotel');
