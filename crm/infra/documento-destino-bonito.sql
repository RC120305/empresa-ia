-- Documento do Gilberto: o destino Bonito (partes 1 a 4 de contexto/destino-bonito.md; OK do dono em 05/10/2026).
-- Entra "aguardando": o dono aprova em Ajustes do agente > 📚 Documentos. Pode rodar de novo (não duplica).
insert into gilberto_documentos (titulo, arquivo, tipo, resumo, conteudo, conflitos, alertas, situacao)
select 'Bonito: o destino, a melhor época e os atrativos', 'contexto/destino-bonito.md (partes 1 a 4)', 'texto',
  'Fatos sobre Bonito para responder perguntas comuns: como funcionam os passeios (voucher e limite de visitantes), melhor época, quantos dias ficar e os principais atrativos da região (fora do hotel).',
  $doc$## Bonito em resumo
- Bonito fica em Mato Grosso do Sul, na região da Serra da Bodoquena.
- É o destino de ecoturismo mais conhecido do Brasil, famoso pelos rios de águas cristalinas, grutas e flutuação.
- Foi eleito várias vezes o Melhor Destino de Ecoturismo do Brasil (não cite quantas vezes: as fontes divergem).
- Foi o primeiro destino de ecoturismo do mundo certificado como carbono neutro (certificação de 2022, mantida depois).
- A região tem mais de 40 pontos turísticos.

## Como funcionam os passeios em Bonito
- Os passeios da região só podem ser feitos com voucher, emitido por um sistema único da cidade. O voucher define data, horário, número de pessoas e guia. Ele é comprado numa agência de turismo de Bonito.
- Cada atrativo tem um limite diário de visitantes. Quando o limite do horário enche, não há mais vaga. Por isso não há filas nem multidões, e os passeios mais procurados esgotam na alta temporada.
- Na alta temporada, as agências recomendam reservar os passeios com até 2 meses de antecedência.

## Melhor época
- De maio a setembro (seca, inverno): as águas ficam mais transparentes e a flutuação está no auge. Alguns dias de inverno são bem frios.
- De outubro a março (chuvas, verão): dias mais quentes e chuvosos, vegetação mais verde, ótimo para trilhas e cachoeiras. A chuva pode deixar os rios menos transparentes em alguns dias. Nunca prometa água cristalina garantida.
- Alta temporada da cidade: a partir da 2ª semana de dezembro, as férias de janeiro e de julho e os feriados prolongados (Carnaval, Páscoa etc.).
- Baixa temporada da cidade: de março a junho e de agosto à 1ª quinzena de dezembro, fora os feriados. Maio, junho, agosto e setembro juntam água transparente com a cidade mais tranquila.

## Quantos dias ficar
- De 3 a 4 dias dão para uma visita rápida; o ideal é pelo menos 5 dias; com 6 a 10 dias dá para fazer mais passeios.
- Estadias mais longas combinam os passeios da região com dias de lazer no hotel.

## Principais atrativos da região (ficam fora do hotel)
- Gruta do Lago Azul: caverna com um lago de água azul-cristalina. A visita é só para contemplar, sem entrar na água. Foram achados fósseis de animais pré-históricos no local.
- Rio da Prata: o passeio de flutuação mais famoso, com peixes e plantas submersas; é uma reserva particular (RPPN).
- Buraco das Araras: uma enorme dolina, refúgio de araras-vermelhas.
- Outros: Rio Sucuri (flutuação), Abismo Anhumas, Lagoa Misteriosa, Cânion do Salobra, cavalgada noturna e várias cachoeiras e balneários.
- Nunca diga que esses atrativos ficam dentro do hotel. Horários, regras e preços deles são das agências e dos atrativos: diga que confirma.

## Perguntas e respostas
- **P:** Qual a melhor época para ir a Bonito?
  **R:** Depende do que vocês querem: de maio a setembro as águas ficam mais transparentes, ótimo para flutuação; de outubro a março é mais quente e tudo fica mais verde, bom para trilhas e cachoeiras. Maio, junho, agosto e setembro juntam água bonita com a cidade mais tranquila.

- **P:** Quantos dias preciso para conhecer Bonito?
  **R:** De 3 a 4 dias dá para uma visita rápida, mas o ideal é ficar pelo menos 5 dias, assim dá para combinar os passeios da região com o descanso no hotel.

- **P:** O que tem para fazer em Bonito?
  **R:** A região tem mais de 40 atrativos: flutuação em rios cristalinos como o Rio da Prata e o Rio Sucuri, a Gruta do Lago Azul, o Buraco das Araras, o Abismo Anhumas, cachoeiras e balneários.

- **P:** Preciso reservar os passeios antes?
  **R:** Sim, principalmente na alta temporada: cada atrativo tem limite de visitantes por dia e os mais procurados esgotam. Os passeios são feitos com voucher, comprado numa agência de Bonito; o ideal é reservar com antecedência.

- **P:** A água é sempre cristalina?
  **R:** Na seca, de maio a setembro, a transparência fica no auge. No verão, a chuva pode deixar os rios menos transparentes em alguns dias, então não dá para garantir.

- **P:** A Gruta do Lago Azul dá para nadar?
  **R:** Não: a visita é só para contemplar o lago, sem entrar na água.
$doc$,
  '["A fonte fala em cerca de 300 km de Campo Grande; a base do hotel diz cerca de 260 km. A distância ficou de fora do documento: vale a da base."]'::jsonb,
  '["Os números de prêmios ficaram de fora (as fontes divergem).", "A informação de preços até 30% menores na baixa temporada (de uma agência) ficou de fora: não é preço do hotel."]'::jsonb,
  'aguardando'
where not exists (select 1 from gilberto_documentos where titulo = 'Bonito: o destino, a melhor época e os atrativos');
