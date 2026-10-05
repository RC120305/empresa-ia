-- Confirmações do dono (06/10/2026): Pesca em Bonito e no Rio Miranda. Cole numa consulta nova e vazia e clique em Run.
update gilberto_documentos set
  atualizado_em = now(),
  alertas = '["Piracema (5/11 a 28/02) e a proibição de levar o dourado vêm da imprensa de MS e do Imasul em 2026, não do blog da Acqua. As datas mudam a cada ano: conferir no Imasul antes de cada temporada.", "Distância de Bonito até o Rio Miranda ficou de fora: as fontes não trazem."]'::jsonb,
  conteudo = '## Resumo
- Em Bonito, a pesca é proibida nos rios de água cristalina usados no turismo, como o Rio Formoso, o Rio da Prata, o Rio Sucuri e o Rio Olho D''Água. Isso protege os peixes e a água transparente que faz de Bonito o que é.
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
'
where titulo = 'Pesca em Bonito e no Rio Miranda';

select titulo, situacao, atualizado_em from gilberto_documentos where titulo = 'Pesca em Bonito e no Rio Miranda';
