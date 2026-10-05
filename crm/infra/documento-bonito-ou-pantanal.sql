-- Documento do Gilberto: Bonito ou Pantanal, e como combinar (pedido do dono, 06/10/2026).
-- Fonte: Acqua Viagens, "Bonito ou Pantanal" (atualizado em 04/03/2026) + base do hotel.
-- Entra "aguardando": o dono aprova em Ajustes do agente > 📚 Documentos. Pode rodar de novo (não duplica).
insert into gilberto_documentos (titulo, arquivo, tipo, resumo, conteudo, conflitos, alertas, situacao)
select 'Bonito ou Pantanal (e como combinar)', 'Acqua Viagens, blog (mar/2026) + base do hotel', 'texto',
  'Diferenças entre Bonito e o Pantanal, melhor época de cada um e como combinar os dois na mesma viagem, puxando os dias em Bonito.',
  $doc$## Para que serve
- Clientes às vezes estão em dúvida entre Bonito e o Pantanal, ou querem conhecer os dois na mesma viagem. Ajude a decidir sem desmerecer nenhum destino e mostre como Bonito (e o hotel) entra no roteiro.

## Diferenças
- Bonito: águas cristalinas, flutuação em rios transparentes, grutas e cachoeiras. Infraestrutura organizada: hotéis e pousadas, restaurantes variados, agências e passeios com horário marcado. Bom para famílias e para quem quer conforto.
- Pantanal: a maior planície alagável do planeta, com safáris fotográficos e observação de bichos no ambiente selvagem (onça-pintada, jacaré, capivara, araras, tuiuiú). Hospedagem em fazendas pantaneiras e lodges mais rústicos. Bom para quem quer imersão na natureza selvagem e observação de fauna.

## Melhor época
- Bonito: dá para ir o ano todo. Na seca (maio a setembro) a água fica mais transparente; nas chuvas, as cachoeiras ficam mais cheias.
- Pantanal: de maio a setembro, na seca, os bichos se concentram perto dos rios e fica mais fácil observar; de outubro a abril, as paisagens ficam alagadas.

## Combinar os dois
- Dá para combinar os dois destinos na mesma viagem, por estrada. A entrada mais usada para o Pantanal sul é pela região de Miranda.
- Para fazer os dois com calma, as agências recomendam de 7 a 10 dias no total.
- Em Bonito, o ideal é pelo menos 5 dias para combinar os passeios com o lazer no hotel; para aproveitar só o hotel, pelo menos 2 dias.
- Os passeios no Pantanal são feitos por agências e pelas próprias fazendas: o cliente organiza com elas. A agência parceira do hotel, a Ecotrip, pode orientar.

## Perguntas e respostas
- **P:** Vale mais a pena Bonito ou Pantanal?
  **R:** São experiências diferentes: Bonito é água cristalina, flutuação, grutas e cachoeiras, com estrutura confortável; o Pantanal é safári de bichos no ambiente selvagem, numa hospedagem mais rústica. Se der, o ideal é combinar os dois: de 7 a 10 dias no total, deixando uns 5 aqui em Bonito.

- **P:** Dá para fazer Bonito e Pantanal na mesma viagem?
  **R:** Dá, sim, por estrada, entrando no Pantanal pela região de Miranda. Para fazer com calma, as agências recomendam de 7 a 10 dias no total. Quer que eu veja as datas para a parte de Bonito?

- **P:** Qual a melhor época para o Pantanal?
  **R:** De maio a setembro, na seca, os bichos ficam mais perto dos rios e é mais fácil observar. Coincide com a época da água mais cristalina aqui em Bonito.
$doc$,
  '["A fonte diz que Bonito sozinho pede até 4 dias; a base do destino diz o ideal de pelo menos 5. Ficou o da base."]'::jsonb,
  '["A distância e o tempo de estrada entre Bonito e o Pantanal não estão na fonte: ficaram de fora.", "O documento diz que a Ecotrip pode orientar sobre o Pantanal: confirme se a agência parceira atende esse roteiro."]'::jsonb,
  'aguardando'
where not exists (select 1 from gilberto_documentos where titulo = 'Bonito ou Pantanal (e como combinar)');
