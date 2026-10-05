-- Documentos do Gilberto: alimentação, clima e segurança contra golpes (pedido do dono, 06/10/2026).
-- Entram "aguardando": o dono aprova em Ajustes do agente > 📚 Documentos. Pode rodar de novo (não duplica).

insert into gilberto_documentos (titulo, arquivo, tipo, resumo, conteudo, conflitos, alertas, situacao)
select 'Almoço e alimentação: no hotel e em Bonito', 'base do hotel + Acqua Viagens (restaurantes, 2024 a 2026)', 'texto',
  'Café, lanchonete, jantar e o que o hotel não serve (almoço), passeios com refeição incluída e restaurantes do centro, com a comida típica.',
  $doc$## No hotel
- Café da manhã incluso na diária, todos os dias, das 6h30 às 9h30, em buffet com pães, bolos, tortas e frutas, num salão ao lado da piscina (quase sempre com a visita dos macacos). Se precisar tomar mais cedo, é só avisar a recepção.
- Almoço: o hotel não serve almoço. No horário do almoço funciona a lanchonete, com lanches e porções.
- Lanchonete e bar: de segunda a sábado, das 11h às 21h; domingo, das 11h às 17h. Entrega no quarto, na piscina e nos decks do Rio Formosinho. O bar serve sucos, refrigerantes, cervejas, vinhos e drinks o dia todo.
- Jantar: restaurante à la carte de segunda a sábado, das 19h às 21h, sem precisar reservar. Comida caseira, feita na hora, com gostinho de comida de vó. Domingo à noite o restaurante não abre.
- Cardápio do hotel: cabanasaventura.com.br/cardapio
- Dietas: há opções sem glúten e sem lactose no café e no restaurante, pedidas na reserva.
- Levar comida e bebida: alimentos que não temos no cardápio ou de restrição alimentar, pode. Bebidas, só as que não temos, para a acomodação; caixa térmica com bebida não pode nas áreas sociais (recepção, piscina e decks). Garrafa de tereré pode.

## Almoço nos dias de passeio
- Vários passeios da região já incluem almoço ou refeição no ingresso (por exemplo, atrativos de cachoeiras como a Estância Mimosa, a Boca da Onça e a Ceita Corê). A agência confirma o que cada passeio inclui.
- Quem passa o dia no hotel almoça na lanchonete, com lanches e porções, e pode pedir no quarto, na piscina ou nos decks do rio.

## No centro de Bonito (a 6 km, todo o caminho em asfalto)
- A cidade tem muitas opções de restaurante para o almoço e para o jantar, inclusive no domingo à noite, quando o restaurante do hotel fecha. No domingo também dá para pedir pizza entregue no hotel.
- Comida típica da região (pantaneira): peixes de rio, como o pacu e o pintado (moqueca de pintado, pacu na brasa), a traíra sem espinha e o filé de jacaré.
- Restaurantes conhecidos no centro, citados por agências de turismo: Juanita (perto da Praça da Liberdade, comida pantaneira, almoço e jantar), Casa do João (centro histórico, peixes de rio, almoço e jantar), La Bonita (comida regional com música ao vivo), Baru (cozinha pantaneira criativa), Marco Velho, O Casarão, Pantanal Grill e Espaço Jack.
- Na alta temporada, vale reservar mesa.
- São referências de terceiros: horários, preços e se o restaurante está aberto mudam. Não prometa nada em nome deles.

## Perguntas e respostas
- **P:** O hotel tem almoço?
  **R:** Almoço não servimos, mas a lanchonete funciona das 11h às 21h (domingo até as 17h), com lanches e porções, e entrega no quarto, na piscina e até nos decks do rio. Nos dias de passeio, vários atrativos já incluem almoço no ingresso, e o centro, a 6 km, tem ótimos restaurantes.

- **P:** O que está incluso na alimentação?
  **R:** A diária inclui o café da manhã, das 6h30 às 9h30. Lanchonete e jantar são à parte, pagos no consumo.

- **P:** O hotel tem jantar?
  **R:** Tem, sim: restaurante à la carte de segunda a sábado, das 19h às 21h, sem precisar reservar, com comida caseira feita na hora. Domingo à noite ele não abre; dá para jantar no centro, a 6 km, ou pedir pizza entregue no hotel.

- **P:** Onde almoçar em Bonito?
  **R:** O centro, a 6 km, tem várias opções com a comida típica da região, como pacu e pintado. Alguns bem conhecidos são o Juanita e a Casa do João. E muitos passeios já incluem almoço no ingresso.

- **P:** Qual a comida típica de Bonito?
  **R:** A pantaneira: peixes de rio como o pacu e o pintado, a traíra sem espinha e o filé de jacaré. Vale provar também o sorvete de guavira, fruta da região.

- **P:** Tem cardápio do restaurante?
  **R:** Tem: cabanasaventura.com.br/cardapio
$doc$,
  '[]'::jsonb,
  '["CONFIRMAR: o cardápio online (cabanasaventura.com.br/cardapio) não pôde ser lido daqui; os horários e a descrição vieram da base do hotel. Se algo mudou, edite antes de aprovar.", "Os restaurantes do centro são citados por uma agência (Acqua Viagens): o Gilberto fala deles como referência, sem prometer horário ou preço. Tire algum se o hotel não quiser indicá-lo."]'::jsonb,
  'aguardando'
where not exists (select 1 from gilberto_documentos where titulo = 'Almoço e alimentação: no hotel e em Bonito');

insert into gilberto_documentos (titulo, arquivo, tipo, resumo, conteudo, conflitos, alertas, situacao)
select 'Clima mês a mês e o que levar na mala', 'Acqua Viagens (clima, melhor época, o que levar; 2025 e 2026) + base do hotel', 'texto',
  'Como é o tempo em cada época, temperatura da água, o que o hotel oferece no calor e no frio, a chuva e o que pôr na mala.',
  $doc$## Resumo
- Bonito tem duas estações bem definidas: o verão quente e chuvoso (de outubro/dezembro a março) e o inverno seco (de maio a setembro). A média do ano fica em torno de 23 °C.
- A água dos rios e nascentes fica numa temperatura agradável o ano todo, em torno de 20 a 24 °C, então dá para entrar na água até no inverno. Em vários passeios de flutuação a roupa de neoprene ajuda.

## Mês a mês
- Dezembro, janeiro e fevereiro: os meses mais quentes e chuvosos. O calor pode passar dos 34 °C (às vezes perto dos 40 °C) e as chuvas costumam passar de 200 mm por mês. Cachoeiras cheias e vegetação muito verde. A chuva pode deixar a água menos transparente em alguns dias. Alta temporada nas férias de janeiro e no fim do ano.
- Março: ainda pode chover bastante; o calor vai baixando. Carnaval é alta temporada.
- Abril: transição, com chuvas mais raras e clima agradável.
- Maio: quase sem chuva; começa a seca e a água fica cada vez mais transparente. Mês tranquilo, de baixa temporada.
- Junho, julho e agosto: o inverno. Dias de sol, umidade baixa e noites frias: em geral entre 15 e 20 °C, e em frentes frias a mínima pode cair abaixo de 10 °C. É a época da água mais cristalina. Julho é alta temporada (férias).
- Setembro: ainda seco, com a água transparente e o calor voltando.
- Outubro e novembro: primavera, dias ensolarados e as primeiras chuvas; vegetação bonita e noites mais frescas. Baixa temporada, fora os feriados.

## No hotel, em qualquer época
- No calor: os dois rios dentro do hotel, os decks de banho, a piscina e as atividades na água.
- No frio: piscina climatizada, hidromassagem aquecida, sauna, e ar-condicionado quente e frio em todas as acomodações. As duchas têm aquecimento solar e a gás.
- Chuva: os rios do hotel raramente enchem a ponto de parar as atividades, e a estrutura (piscina climatizada, sauna, sala de jogos) continua à disposição.

## O que levar na mala
- Para a água: várias roupas de banho, chinelo e uma sandália que possa molhar.
- Para as trilhas: tênis com amortecimento ou bota de trilha, bermuda ou calça leve, camiseta e blusa UV.
- Proteção: boné ou chapéu, óculos de sol, protetor solar e repelente (de corpo e de tomada). Nas flutuações, a regra do protetor solar é de cada atrativo: a agência orienta.
- No inverno (maio a setembro): casaco ou jaqueta e moletom para as noites frias, além de calça comprida.
- No verão: roupas leves e uma capa de chuva ou guarda-chuva pequeno.
- Úteis: garrafinha de água, câmera (uma câmera à prova d'água é ótima para as flutuações), carregadores e remédios de uso pessoal.
- Para cavalgadas na região: calça jeans e bota de cano alto.

## Perguntas e respostas
- **P:** Como é o clima em Bonito?
  **R:** São duas estações bem marcadas: de outubro a março é quente e chuvoso, com tudo muito verde e as cachoeiras cheias; de maio a setembro é seco, com dias de sol, noites frias e a água mais cristalina do ano. A água dos rios fica agradável o ano todo.

- **P:** Novembro é um bom mês para ir?
  **R:** É, sim: é primavera, com dias de sol, vegetação bonita e as primeiras chuvas, e é baixa temporada, fora os feriados, então os passeios ficam mais tranquilos. Em alguns dias a chuva pode deixar a água um pouco menos transparente.

- **P:** Faz frio em Bonito? Dá para entrar no rio no inverno?
  **R:** No inverno, de junho a agosto, os dias são de sol e as noites esfriam, em geral entre 15 e 20 °C, e em frentes frias pode cair abaixo de 10 °C. A água dos rios fica numa temperatura agradável o ano todo, e aqui no hotel tem piscina climatizada, hidromassagem aquecida e sauna.

- **P:** Chove muito? A chuva atrapalha?
  **R:** As chuvas se concentram de dezembro a fevereiro. Aqui no hotel os rios raramente enchem a ponto de parar as atividades, e a estrutura continua à disposição. Em alguns passeios de flutuação, a chuva pode diminuir a transparência da água em certos dias.

- **P:** Qual a melhor época para a água mais cristalina?
  **R:** De maio a setembro, na seca: é quando a transparência fica no auge. Maio, junho, agosto e setembro ainda são de baixa temporada.

- **P:** O que levo na mala?
  **R:** Roupas de banho, tênis para trilha, chinelo, boné, protetor solar e repelente. No inverno, um casaco para as noites, e no verão roupas leves e uma capa de chuva. Uma câmera à prova d'água faz sucesso nas flutuações!
$doc$,
  '["As fontes divergem no frio do inverno (mínimas de 8 a 15 °C) e na temperatura da água (20 a 24 °C): ficaram faixas (\"em geral 15 a 20 °C; em frentes frias abaixo de 10 °C\"; água de 20 a 24 °C).", "Uma fonte põe o verão de dezembro a março e outra de outubro a março; ficou \"outubro/dezembro a março\", como na base do destino."]'::jsonb,
  '["Temperaturas são médias de agências, não da meteorologia oficial: o Gilberto fala em faixas, sem prometer."]'::jsonb,
  'aguardando'
where not exists (select 1 from gilberto_documentos where titulo = 'Clima mês a mês e o que levar na mala');

insert into gilberto_documentos (titulo, arquivo, tipo, resumo, conteudo, conflitos, alertas, situacao)
select 'Segurança: como evitar golpes', 'canais oficiais da base do hotel + dados do Pix do CRM', 'texto',
  'Canais oficiais do hotel e da Ecotrip, como o hotel recebe (Pix em nome de Hotel Cabanas Ltda, cartão só por link), sinais de golpe e o que fazer na dúvida.',
  $doc$## Para que serve
- Clientes às vezes têm medo de golpe na hora de pagar ou quando outra pessoa entra em contato (por exemplo, a agência de passeios). Responda com tranquilidade, mostre os canais oficiais e como conferir o pagamento. Isso dá confiança para fechar a reserva.

## Canais oficiais do Hotel Cabanas
- Site: hotelcabanas.com.br
- Reservas online (motor de reservas do hotel): sbreserva.silbeck.com.br/hotelcabanas
- Telefone (ligação comum, não pelo WhatsApp): (67) 99110-7635
- E-mail: contato@hotelcabanas.com.br
- Instagram: @hotelcabanasbonito
- WhatsApp: este número, em que você está conversando com o hotel.
- Agência parceira para passeios fora do hotel: Ecotrip (Portal Ecotrip), biolink-cabanas-bonito.ai.studio, telefone (67) 99341-4734.

## Como o hotel recebe pagamento
- O hotel só manda os dados de pagamento depois de a reserva estar feita no sistema, pela própria conversa com o hotel.
- Pix: o recebedor é sempre Hotel Cabanas Ltda, no Banco do Brasil, agência 1031-6, conta corrente 8583-9. Antes de pagar, o cliente confere no app do banco o nome do recebedor.
- Cartão: só por link de pagamento enviado pelo hotel. O hotel nunca pede número do cartão, código de segurança ou senha por mensagem ou por ligação.
- Depois do pagamento, o hotel confirma a reserva pela conversa.

## Sinais de golpe (oriente o cliente a desconfiar)
- Preço muito abaixo do normal ou "promoção relâmpago" com pressa para pagar.
- Pedido de Pix para conta em nome de pessoa física ou de outra empresa que não seja Hotel Cabanas Ltda.
- Perfis ou números que não estão na lista acima, sites com endereço parecido mas diferente, ou mensagens com erros e links estranhos.
- Pedido de dados do cartão por mensagem ou ligação.
- Reservas feitas em sites de viagem conhecidos (como Booking) são legítimas e seguem as regras desses sites.

## Se o cliente tiver dúvida ou desconfiar
- Diga que é muito bom conferir e ofereça confirmar pelo telefone do hotel, (67) 99110-7635.
- Se ele recebeu proposta de pagamento por outro canal, oriente a não pagar e chame a equipe com abrir_alerta (motivo segurança).
- Nunca peça nem aceite dados de cartão na conversa.

## Perguntas e respostas
- **P:** Como sei que é mesmo o hotel e não um golpe?
  **R:** Ótima pergunta, é sempre bom conferir! Os nossos canais oficiais são o site hotelcabanas.com.br, o Instagram @hotelcabanasbonito, o telefone (67) 99110-7635 e este WhatsApp. No Pix, o recebedor que aparece no seu banco é sempre Hotel Cabanas Ltda, Banco do Brasil. Se quiser, pode ligar no nosso telefone para confirmar.

- **P:** O rapaz da Ecotrip é de vocês mesmo?
  **R:** A Ecotrip é a nossa agência parceira para os passeios fora do hotel: o link oficial é biolink-cabanas-bonito.ai.studio e o telefone é (67) 99341-4734. Se o contato veio de outro número, confira por esse telefone antes de pagar qualquer coisa.

- **P:** Posso passar o número do meu cartão por aqui?
  **R:** Por segurança, nunca pedimos dados de cartão por mensagem. Se preferir pagar no cartão, mandamos um link de pagamento seguro.

- **P:** Recebi uma oferta mais barata de outro número dizendo ser do hotel. É verdade?
  **R:** Não pague nada fora dos nossos canais oficiais: site hotelcabanas.com.br, Instagram @hotelcabanasbonito, telefone (67) 99110-7635 e este WhatsApp. Me conta o que te mandaram que eu verifico com a equipe.
$doc$,
  '[]'::jsonb,
  '["Canais oficiais confirmados pelo dono em 06/10/2026: telefone (67) 99110-7635 para ligação comum e este WhatsApp (o número do Gilberto).", "Os dados do Pix (Hotel Cabanas Ltda, BB ag. 1031-6, c/c 8583-9) são os mesmos que o CRM já manda junto de cada Pix."]'::jsonb,
  'aguardando'
where not exists (select 1 from gilberto_documentos where titulo = 'Segurança: como evitar golpes');
