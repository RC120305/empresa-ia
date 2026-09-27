# Outubro/2026: versão final dos posts de fotos (2026-09-27)

Regra do dono (27/09): **sem faixa** sempre que todas as telas lerem bem; se não, primeiro melhorar posição/sombra sem faixa; depois **caixa central**; **faixa discreta** só como último recurso. **Um carrossel = um layout só.**
Os arquivos de cada `POST-NN/final/` (`POST-NN-1.png`, `-2.png`…) são **cópias** dos PNGs escolhidos; nada foi apagado. Todos 1080 × 1440 (feed 3:4), abertos e conferidos.

| Post | Layout escolhido | Por quê (1 linha) | Arquivos finais |
|---|---|---|---|
| POST-01 | Sem faixa (v2) | As 5 telas leem bem sem faixa; a v2 só firmou as sombras da numeração e do logo sobre céu e cascalho claros (a ressalva antiga). | `POST-01/final/POST-01-1.png` a `-5.png` (de `POST-01-sem-faixa-N-v2.png`) |
| POST-03 | Sem faixa (v2) | As telas fracas foram resolvidas sem faixa: na 3 o título subiu para a mata escura do alto, e na 5 a sombra ficou mais firme só atrás do texto e dos contatos. | `POST-03/final/POST-03-1.png` a `-5.png` (de `POST-03-sem-faixa-N-v2.png`) |
| POST-04 | Sem faixa | Título sobre a mata escura, longe do rosto, e o rio sem véu: leitura boa. | `POST-04/final/POST-04-1.png` (de `POST-04-sem-faixa-1.png`) |
| POST-06 | Caixa central | A caixa foi a melhor opção na tela 1 (frutas claras) e funciona nas 6 telas, sem cobrir o rio nem o rosto; a versão sem faixa tinha a tela 3 fraca. | `POST-06/final/POST-06-1.png` a `-6.png` (de `POST-06-caixa-N.png`) |
| POST-07 | Sem faixa (v2) | As 6 telas leem bem sem faixa; na v2 a numeração ficou marrom sobre o teto branco da sauna (tela 3) e as sombras da assinatura e da tela 5 ficaram mais firmes. | `POST-07/final/POST-07-1.png` a `-6.png` (de `POST-07-sem-faixa-N-v2.png`) |
| POST-09 | Sem faixa | Texto sobre a mata da margem, rio e caiaques sem véu, verde só no detalhe: leitura boa. | `POST-09/final/POST-09-1.png` (de `POST-09-sem-faixa-1.png`) |
| POST-10 | Sem faixa (v2) | As telas fracas foram resolvidas sem faixa: na 3 o título subiu para a mata escura, e na 6 a sombra ficou mais firme atrás dos contatos e a numeração ficou marrom sobre a parede clara. | `POST-10/final/POST-10-1.png` a `-6.png` (de `POST-10-sem-faixa-N-v2.png`) |
| POST-12 | Sem faixa | Texto sobre a camiseta azul, bem abaixo do rosto, e logo sobre o cascalho escuro: leitura boa. | `POST-12/final/POST-12-1.png` (de `POST-12-sem-faixa-1.png`) |

## Fontes editáveis
- Telas v2: `POST-NN/peca-sem-faixa-N-v2.html` + `carrossel-sem-faixa.css` da pasta. Os HTML originais (sem `-v2`) continuam intactos.
- POST-06: `POST-06/peca-caixa-1.html` a `-6.html`. As telas 2 a 6 usam o kit oficial (`design/modelos/estilo-caixa-central.css`); a tela 1 usa a cópia de teste `../estilo-caixa-central.css`, que tem o mesmo conteúdo.

## Notas por post
- **POST-06 (caixa central):** o título fica todo em itálico, sem negrito (é o estilo da caixa). Apoios em itálico no formato "Sentido: lugar" ("Calor: hidromassagem aquecida", "Som: deck do Rio Formosinho", "Vapor: sauna", "Balanço: redário", "Reserve direto"), com o mesmo conteúdo do briefing. O logo fica em cima nas telas 1, 2, 3, 5 e 6 e embaixo na 4 (sauna: o teto é branco, e a caixa fica sobre a parede de madeira). Na tela 6, os contatos vêm logo abaixo do apoio. Na tela 2, o apoio cruza uma viga do pergolado, mas continua legível.
- **POST-07, tela 5:** o apoio continua **"BANGALÔ · 40 M²"**. Para trocar, edite a linha marcada com o comentário `APOIO A CONFIRMAR PELO DONO` em `POST-07/peca-sem-faixa-5-v2.html` e rode `node design/ferramentas/renderizar.js design/pecas/2026-10-instagram/POST-07/peca-sem-faixa-5-v2.html design/pecas/2026-10-instagram/POST-07/POST-07-sem-faixa-5-v2.png feed`. Depois, copie o PNG para `POST-07/final/POST-07-5.png`.

## A confirmar com você (dono)
1. **POST-07:** o bangalô das telas 5 e 6 é o Bangalô (40 m²) ou o Bangalô Especial (45 m²)? A varanda da tela 6 tem rede **e banco estofado**, que é a descrição do Especial.
2. **Autorização de imagem** (continua pendente): POST-03 telas 2, 3 e 5; POST-04; POST-06 tela 5; POST-07 tela 4; POST-10 telas 2, 3, 4 e 6; POST-12.
3. **POST-01, tela 4 (pétalas):** a legenda precisa dizer que a decoração especial é **opcional**, contratada à parte (Marketing).
4. **POST-03:** só publicar se houver vaga confirmada de 20 a 23/11.
