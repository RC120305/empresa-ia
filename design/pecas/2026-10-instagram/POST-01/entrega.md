# Entrega: POST-01 (outubro/2026), Carrossel Cabana Casal v3 em 3:4

## Peça
- **Formato:** carrossel de 5 telas, feed orgânico **3:4 (1080 × 1440, modo `feed`)**.
- **Pilar:** 1 (Contemplação). **Persona:** Casais.
- **Origem:** Carrossel Cabana Casal **v3 (Ajuste 3)**, aprovado pelo dono, em `design/pecas/2026-10-carrossel-cabana-casal/`. **As duas variantes v3 existiam** (faixa discreta e sem faixa); gerei as duas em 3:4.
- **Textos:** idênticos à v3 nas 5 telas (nenhuma palavra mudou; nenhum texto novo na tela 4, a das pétalas).

## Arquivos
| Variante | PNGs | Fonte editável |
|---|---|---|
| Faixa discreta | `POST-01-faixa-1.png` a `-5.png` | `peca-faixa-1.html` a `-5.html` + `carrossel-faixa.css` |
| Sem faixa | `POST-01-sem-faixa-1.png` a `-5.png` | `peca-sem-faixa-1.html` a `-5.html` + `carrossel-sem-faixa.css` |

Um HTML por tela (o carrossel tem 5 telas diferentes); `foto-1.jpg` a `foto-5.jpg` são cópias das fotos da v3.

## Fotos (pasta Drive "Cabana casal", `1jerV3-wB_-vNUdXCv5m4mRPLH4DOJfb2`)
1. `cabana_casal_01_externa`: https://drive.google.com/file/d/1_Cf1QkCCiHqsQqZZWLz1297xB0x0SQzm/view
2. `cabana_casal_03_externa`: https://drive.google.com/file/d/1XMr0j853KISaSUSB1c4AwqBYSB2esEnU/view
3. `cabana_casal_03_varanda`: https://drive.google.com/file/d/1_0gOD83XvwgWT_b-CO08T2nCmUNOf9F2/view
4. `cabana_casal_01_interna`: https://drive.google.com/file/d/10Q-YmdPemEE4y5n1c5VrCJzeYjxwDjtt/view
5. `cabana_casal_01_eterna`: https://drive.google.com/file/d/1tq2O31hdmfhn2ucJ3PzumJ9M5akGt0YM/view

## Decisões (adaptação 4:5 → 3:4)
- **Faixa discreta:** mesma faixa marrom de 290 px (agora 20% da altura, dentro do limite de ~22%), mesma tipografia (título 54 px, logo 104 px). Os 90 px a mais foram para a foto (1080 × 1150). Recortes: tela 1 `48%`, telas 2 a 4 centro, tela 5 `45%`. Tudo o que é essencial aparece inteiro (cabana, escada, rede e poltronas, cama e teto). **Tela 5:** as duas cabanas continuam no quadro, mas perdem um pouco das pontas (a parede esquerda da primeira e o pilar direito da segunda), porque a foto é 4:3 e a área 3:4 mostra 70% da largura.
- **Sem faixa:** mesmos recortes, posições e sombras da v3 (as sombras de baixo desceram 90 px para acompanhar o texto). A tela cheia 3:4 mostra 56% da largura (era 60% no 4:5): na tela 1 somem as pontas do beiral, na tela 4 o sofá vermelho e o closet ficam cortados, e na tela 5 a segunda cabana aparece só em parte, como na v3.
- **Recomendação (a mesma da v3):** a **faixa discreta**. São fotos claras de dia, e na faixa tudo se lê bem no celular. Na versão sem faixa, a numeração sobre o céu e o "HOTEL" do logo sobre o cascalho (tela 1) ficam fracos.

## Texto alternativo
1. Cabana Casal de madeira suspensa sobre pilares no meio da mata, com a frase "Aqui, a pressa fica no chão".
2. Escada de madeira que sobe até a varanda de uma cabana elevada entre as árvores, com a frase "Cada degrau deixa a cidade mais longe".
3. Varanda de madeira com rede armada e duas poltronas, aberta para a mata, com a frase "Na rede, o tempo balança devagar".
4. Quarto com cama king e teto de madeira aparente, com a frase "Adormecer na madeira, acordar entre árvores".
5. Cabanas de madeira elevadas vistas por entre folhas de palmeira, com a frase "Seu lugar de conexão espera por você" e os contatos do site e do WhatsApp.

## Checklist
- [x] Fotos reais do banco oficial (as mesmas da v3 aprovada)
- [x] Textos de 5 a 7 palavras, iguais à v3, sem fato novo; nenhum texto novo na tela das pétalas
- [x] Regra de cor pela luz: faixa marrom em foto clara (versão recomendada); nenhum texto sobre verde sem sombra; nenhuma foto escurecida por inteiro
- [x] Texto legível e fora do ponto focal (a versão sem faixa tem as ressalvas acima)
- [x] Margem segura (72 px nas laterais; nada a menos de 60 px da borda)
- [x] Assinatura em todas as telas: linha laranja + BONITO · MS + logo branco (104 px / 100 px)
- [x] 1080 × 1440 nas 10 telas
- [x] Os 10 PNGs abertos e conferidos
- [x] Pessoas ou crianças: nenhuma
- [x] Texto alternativo de 1 frase por tela

## A confirmar com você (dono)
1. **Qual variante vai ao ar** (faixa discreta ou sem faixa). Na mesma variante nas 5 telas.
2. **Tela 4 (toalhas em cisne com pétalas):** a arte não traz texto novo. Confira se a legenda do POST-01 diz "decoração especial (opcional)", contratada à parte (Marketing).
3. Continua valendo a pendência da v3: confirmar que as fotos "03" (telas 2 e 3) são mesmo da Cabana Casal.


## TESTE de estilo "caixa central" (2026-09-27), não substitui a versão sem faixa
- **Arquivos:** `POST-01-caixa-1.png` + `peca-caixa-1.html`; estilo em `../estilo-caixa-central.css` e modelo em `../modelo-caixa-central.html` (proposta para `design/modelos/`, a copiar se você aprovar).
- **Estilo:** inspirado nas referências da Reserva Rio de Contas: caixa sólida marrom #847059 (a paleta não tem terracota; é a cor oficial das faixas), título em Playfair itálico 56 px numa linha, apoio em Playfair itálico 28 px abaixo da caixa, logo branco 104 px centralizado com fio laranja · BONITO · MS.
- **Decisões:** selo na base (ref. 1); caixa sobre a copa das árvores, acima do telhado; a cabana inteira fica livre.
- **Negrito do título:** saiu (estilo todo em itálico); a ênfase da palavra-chave se perde.
- **Texto alternativo:** Cabana Casal de madeira sobre palafitas, na mata, com o título numa caixa marrom no alto.
- **Checklist:** [x] mesma foto real · [x] mesmo texto (sem fato novo) · [x] caixa marrom, nada branco sobre verde · [x] fora de rostos e do ponto principal · [x] margem 60 px · [x] logo ≥ 100 px + BONITO · MS + fio laranja · [x] 1080 × 1440 · [x] PNG conferido
