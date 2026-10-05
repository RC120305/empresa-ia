-- Confirmações do dono (06/10/2026) nos documentos do Gilberto:
-- taxa ambiental (hotel não cobra; atividades dentro do hotel não pagam; Ecotrip ajuda nos passeios de fora),
-- pesca (proibida no hotel, Formoso e Formosinho) e alimentação (taxa de rolha R$ 100/dia).
-- Troca o texto e os alertas; mantém a situação (se já está aprovado, continua em uso). Pode rodar de novo.

update gilberto_documentos set conteudo = $doc$## O que é
- A Taxa de Conservação Ambiental (TCA), também chamada de "taxa de turismo de Bonito", é uma taxa da Prefeitura de Bonito para quem visita a cidade.
- O dinheiro vai para a conservação ambiental do município: gestão de resíduos, reflorestamento, monitoramento dos rios, manutenção de estradas e educação ambiental.
- É da Prefeitura, não do hotel: o Hotel Cabanas não cobra nem recebe essa taxa (confirmado pelo dono, 06/10/2026), e ela não entra na diária.

## Valor e quando é cobrada
- R$ 15 por pessoa, por dia de passeio turístico (não por dia de hospedagem).
- Se a pessoa fizer mais de um passeio no mesmo dia, paga uma taxa só naquele dia.
- Exemplo: um casal que fica 4 noites e faz passeios em 2 dias paga 2 x R$ 15 por pessoa, ou seja, R$ 60 no total.

## Quem não paga
- Crianças até 6 anos.
- Moradores de Bonito, com comprovação.
- Trabalhadores em serviço no município.

## Como pagar
- Online, no portal oficial Turista por Natureza: https://turistapornatureza.com.br/
- No portal, a pessoa faz o cadastro, informa o período e os dias de passeio, e paga por Pix ou cartão de crédito ou débito (sem parcelamento).
- O ideal é pagar antes de chegar, para não atrasar a saída para os passeios. A agência de turismo também orienta na hora de reservar.

## Atividades dentro do hotel (vantagem do Cabanas)
- As atividades feitas dentro do hotel (boia cross, arvorismo, trilhas, banhos de rio e decks) não pagam a taxa ambiental (confirmado pelo dono, 06/10/2026). A taxa só entra nos dias em que o hóspede fizer passeios fora do hotel.
- Use isso como argumento de venda: no Cabanas dá para curtir dias inteiros de natureza, com boia cross e arvorismo inclusos, sem pagar taxa ambiental e sem a taxa entrar na diária.
- Para os passeios fora do hotel, a nossa agência parceira, a Ecotrip, ajuda a montar o roteiro, reservar os passeios e orientar sobre a taxa: https://biolink-cabanas-bonito.ai.studio/

## Perguntas e respostas
- **P:** Tem taxa de turismo em Bonito?
  **R:** Tem, sim: é a Taxa de Conservação Ambiental, da Prefeitura de Bonito. São R$ 15 por pessoa por dia de passeio turístico (não por dia de hospedagem), e o valor vai para a preservação dos rios e da natureza da região.

- **P:** Como pago a taxa ambiental?
  **R:** É online, no portal oficial Turista por Natureza (turistapornatureza.com.br): você faz o cadastro, informa os dias de passeio e paga por Pix ou cartão. O ideal é pagar antes de chegar.

- **P:** O hotel cobra essa taxa? Ela já vem na diária?
  **R:** Não: a taxa é da Prefeitura e não entra no valor da hospedagem. Ela é paga pelo portal Turista por Natureza, nos dias em que você fizer passeios.

- **P:** Vou ficar só no hotel (ou fazer só a boia cross e o arvorismo). Preciso pagar a taxa?
  **R:** Não! As atividades dentro do hotel, como a boia cross e o arvorismo, não pagam a taxa ambiental. Ela só é cobrada nos dias em que você fizer passeios fora do hotel. E, se quiser fazer passeios pela região, a nossa agência parceira Ecotrip te ajuda com o roteiro e as reservas: https://biolink-cabanas-bonito.ai.studio/

- **P:** Criança paga a taxa?
  **R:** Crianças até 6 anos não pagam. Moradores de Bonito também são isentos.

- **P:** Se eu fizer dois passeios no mesmo dia, pago duas vezes?
  **R:** Não: é uma taxa por pessoa por dia de passeio, mesmo que você faça mais de um passeio naquele dia.
$doc$,
  alertas = '["A Acqua cita um seguro contra acidentes de até R$ 20 mil incluído na taxa; só uma fonte traz isso, então ficou de fora.", "Valor e regras são da Prefeitura e podem mudar: conferir a cada 6 meses."]'::jsonb,
  atualizado_em = now()
where titulo = 'Taxa ambiental de Bonito (TCA)';

update gilberto_documentos set conteudo = $doc$## Resumo
- Em Bonito, a pesca é proibida nos rios de água cristalina usados no turismo, como o Rio Formoso, o Rio da Prata, o Rio Sucuri e o Rio Olho D'Água. Isso protege os peixes e a água transparente que faz de Bonito o que é.
- No Hotel Cabanas não é permitido pescar, nem no Rio Formoso nem no Rio Formosinho (confirmado pelo dono, 06/10/2026). Aqui o programa é ver os peixes de perto, nos banhos de rio, nas trilhas e nos decks.
- Quem quer pescar costuma ir ao Rio Miranda, já no Pantanal, um dos poucos lugares da região com pesca esportiva permitida, em trechos específicos e com regras.

## Rio Miranda (pesca esportiva)
- Fica no Pantanal de Mato Grosso do Sul; nasce na Serra de Maracaju e corre cerca de 750 km até o Rio Paraguai. O acesso é pelas cidades da região, como Miranda.
- Peixes mais procurados: pintado, pacu, piranha, jaú e dourado.
- Temporada: de março a outubro, fora da piracema.
- O pesque e solte (devolver o peixe ao rio) é a prática incentivada.

## Regras principais
- Licença de pesca amadora é obrigatória para todos. Ela é emitida online pelo Imasul (órgão ambiental de Mato Grosso do Sul): pescaamadora.imasul.ms.gov.br
- Há tamanho mínimo dos peixes, limite de captura e equipamentos permitidos; rede e anzóis múltiplos são proibidos.
- Piracema (época da reprodução dos peixes): em Mato Grosso do Sul a pesca fica proibida, inclusive o pesque e solte, normalmente de 5 de novembro a 28 de fevereiro. As datas são definidas a cada ano: conferir no Imasul.
- Dourado: em Mato Grosso do Sul é proibido levar o dourado (a captura é proibida); ele só pode ser pescado no pesque e solte, fora da piracema.

## Perguntas e respostas
- **P:** Pode pescar em Bonito?
  **R:** Nos rios de Bonito usados no turismo, como o Formoso e o da Prata, a pesca é proibida, para proteger os peixes e a água cristalina. Quem quer pescar costuma ir ao Rio Miranda, no Pantanal, onde a pesca esportiva é permitida em trechos específicos, com licença.

- **P:** Dá para pescar no hotel?
  **R:** Aqui não: no hotel não é permitido pescar, nem no Rio Formoso nem no Formosinho. Mas dá para ver muitos peixes de perto nos banhos de rio e nos decks.

- **P:** Onde dá para pescar perto de Bonito?
  **R:** O mais procurado é o Rio Miranda, no Pantanal, com pintado, pacu, jaú e dourado (no pesque e solte). A temporada vai de março a outubro, fora da piracema, e precisa de licença de pesca amadora.

- **P:** Como tiro a licença de pesca?
  **R:** É online, pelo site do Imasul, o órgão ambiental de Mato Grosso do Sul: pescaamadora.imasul.ms.gov.br. É obrigatória para todos os pescadores.

- **P:** Posso pescar em novembro ou dezembro?
  **R:** Em Mato Grosso do Sul, a piracema normalmente vai de 5 de novembro a 28 de fevereiro, e nesse período a pesca fica proibida, inclusive o pesque e solte. Vale conferir as datas do ano no site do Imasul.
$doc$,
  alertas = '["Piracema (5/11 a 28/02) e a proibição de levar o dourado vêm da imprensa de MS e do Imasul em 2026, não do blog da Acqua. As datas mudam a cada ano: conferir no Imasul antes de cada temporada.", "Distância de Bonito até o Rio Miranda ficou de fora: as fontes não trazem."]'::jsonb,
  atualizado_em = now()
where titulo = 'Pesca em Bonito e no Rio Miranda';

update gilberto_documentos set conteudo = $doc$## No hotel
- Café da manhã incluso na diária, todos os dias, das 6h30 às 9h30, em buffet com pães, bolos, tortas e frutas, num salão ao lado da piscina (quase sempre com a visita dos macacos). Se precisar tomar mais cedo, é só avisar a recepção.
- Almoço: o hotel não serve almoço. No horário do almoço funciona a lanchonete, com lanches e porções.
- Lanchonete e bar: de segunda a sábado, das 11h às 21h; domingo, das 11h às 17h. Entrega no quarto, na piscina e nos decks do Rio Formosinho. O bar serve sucos, refrigerantes, cervejas, vinhos e drinks o dia todo.
- Jantar: restaurante à la carte de segunda a sábado, das 19h às 21h, sem precisar reservar. Comida caseira, feita na hora, com gostinho de comida de vó. Domingo à noite o restaurante não abre.
- Cardápio do hotel: cabanasaventura.com.br/cardapio
- Dietas: há opções sem glúten e sem lactose no café e no restaurante, pedidas na reserva.
- Levar comida: alimentos que não temos no cardápio ou de restrição alimentar, pode.
- Levar bebida: a garrafa de tereré está liberada. Bebidas que não temos no cardápio podem, para consumo na acomodação. Outras bebidas trazidas de fora pagam taxa de rolha de R$ 100,00 por dia (valor informado pelo dono em 06/10/2026). Caixa térmica com bebida não pode nas áreas sociais (recepção, piscina e decks).

## Cardápio do hotel (preços, pagos à parte)
#### Horário da lanchonete e do bar
- Segunda a sábado, das 11h às 21h; domingo, das 11h às 17h.

#### Pratos executivos (jantar, das 19h às 21h)
Todos os pratos acompanham 3 guarnições, à escolha: arroz, batata frita, salada, farofa, polenta frita ou mandioca frita.
- Filé mignon grelhado (200 g) · R$ 65,00
- Tilápia à milanesa (em pedaços) · R$ 55,00
- Filé de frango (200 g) · R$ 45,00
- Frango à milanesa (200 g) · R$ 47,00
- Picanha grelhada (200 g) · R$ 65,00
- Guarnição extra · R$ 15,00

#### Sanduíches
- Cabanas Burguer: pão de hambúrguer, hambúrguer artesanal e queijo · R$ 30,00
- Cabanas Salada: pão de hambúrguer, hambúrguer artesanal, queijo, alface e tomate · R$ 35,00
- Cabanas Egg: pão de hambúrguer, hambúrguer artesanal, queijo, ovo e bacon · R$ 35,00
- Cabanas Calabresa: pão de hambúrguer, hambúrguer artesanal, queijo e calabresa · R$ 35,00
- Cabanas Mignon: pão de hambúrguer, filé mignon fatiado e queijo · R$ 45,00
- Cabanas Mignon Salada: pão de hambúrguer, filé mignon fatiado, queijo, alface e tomate · R$ 47,00
- Cabanas Frango: pão de hambúrguer, queijo, peito de frango, alface e tomate · R$ 35,00
- Misto quente: pão de forma, queijo e presunto · R$ 13,00
- Bauru: pão de forma, queijo, presunto, tomate e orégano · R$ 15,00
- Adicione batata: porção de batata · R$ 30,00

#### Porções
- Batata frita · R$ 30,00
- Mandioca frita · R$ 30,00
- Polenta frita · R$ 32,00
- Calabresa frita com cebola na farofa · R$ 45,00
- Filé de tilápia (em pedaços, 500 g) · R$ 75,00
- Costelinha de pacu (400 g) · R$ 65,00
- Filé mignon (500 g) · R$ 95,00
- Picanha fatiada · R$ 95,00
- Queijo tipo mussarela · R$ 47,00
- Azeitona · R$ 40,00
- Queijo tipo mussarela e azeitona · R$ 47,00

#### Água, suco e refrigerante
- Água mineral com ou sem gás (garrafa) · R$ 6,00
- Refrigerante (lata) · R$ 8,00
- Suco de polpa natural com água · R$ 10,00 · com leite · R$ 13,00 (abacaxi com hortelã, caju, goiaba, maracujá ou uva)
- Suco de fruta natural com água · R$ 14,00 · com leite · R$ 17,00 (abacaxi, acerola ou morango)

#### Cerveja long neck
- Corona 330 ml · R$ 16,00
- Antarctica Original 300 ml · R$ 14,00
- Heineken 330 ml · R$ 16,00

#### Caipirinha (abacaxi, limão ou morango)
- De cachaça · R$ 20,00
- De vodka · R$ 23,00

#### Drinks e doses
- Campari · R$ 20,00
- Conhaque · R$ 12,00
- Martini · R$ 20,00
- Vodka · R$ 15,00
- Whisky Red Label · R$ 32,00

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

- **P:** O que tem no jantar do hotel? Quanto custa?
  **R:** São pratos executivos, das 19h às 21h, de segunda a sábado, cada um com 3 acompanhamentos à escolha (arroz, batata frita, salada, farofa, polenta ou mandioca frita): filé mignon ou picanha grelhados (200 g) por R$ 65, tilápia à milanesa por R$ 55, filé de frango por R$ 45 e frango à milanesa por R$ 47.

- **P:** O que tem na lanchonete?
  **R:** Sanduíches como o Cabanas Burguer (R$ 30) e o Cabanas Mignon (R$ 45), misto quente e bauru, e porções como batata, mandioca ou polenta fritas, costelinha de pacu, filé de tilápia, filé mignon e picanha. Ela funciona das 11h às 21h (domingo até as 17h) e entrega no quarto, na piscina e nos decks do rio.

- **P:** Posso levar bebida para o hotel?
  **R:** Garrafa de tereré pode, sem problema! Bebidas que não temos no cardápio também podem, para consumo na acomodação. As demais bebidas trazidas de fora pagam taxa de rolha de R$ 100 por dia. E o nosso bar tem sucos, refrigerantes, cervejas, vinhos e drinks.

- **P:** Tem cardápio do restaurante?
  **R:** Tem: cabanasaventura.com.br/cardapio
$doc$,
  alertas = '["Cardápio transcrito das imagens enviadas pelo dono em 06/10/2026 (pratos executivos, sanduíches, porções e bebidas). Se faltar alguma página (café da manhã, sobremesas, vinhos), mande que eu completo.", "Taxa de rolha de R$ 100/dia informada pelo dono em 06/10/2026; se o valor mudar, edite aqui e na base do hotel.", "Os restaurantes do centro são citados por uma agência (Acqua Viagens): o Gilberto fala deles como referência, sem prometer horário ou preço."]'::jsonb,
  atualizado_em = now()
where titulo = 'Almoço e alimentação: no hotel e em Bonito';

select titulo, situacao, atualizado_em from gilberto_documentos order by criado_em;
