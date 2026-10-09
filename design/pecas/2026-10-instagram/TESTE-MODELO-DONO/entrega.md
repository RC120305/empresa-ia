# Entrega: Cabana Master para casais (teste do modelo do dono "meu-faixa-escura-x1")

## Peça
- **Formato:** carrossel 3:4 (1080 × 1440), **4 telas** = 3 telas com texto + a tela final do modelo (`final: true`).
- **Pilar:** 3 (editorial sensorial) com toque do 1 (contemplação). **Persona:** Casais (Os Namorados do Paraíso).
- **Modelo:** do dono, `meu-faixa-escura-x1` (animador `carrossel`), com a config **exatamente como veio** do db `modelos_custom`:
  `{"capa":"baixo","posicao":"meio","destaque":"#F2C14E","fonte":"josefin","tamanho":"m","fundo":"faixa","escurecer":0.35,"moldura":true,"numeracao":true,"seta":true,"logo":true,"final":true}`
- **Fonte editável:** `roteiro.json` (gerado com `node design/ferramentas/animador/animar.mjs roteiro.json telas --png`, sem `--previa`).

## Arquivos
| Tela | PNG | Foto | Texto (destaque em amarelo) | Apoio |
|---|---|---|---|---|
| 1 (capa) | `cabana-master-casais-1.png` | `fotos/1.jpg`, fachada da cabana elevada entre as árvores | UM REFÚGIO ENTRE AS **ÁRVORES** | CABANA MASTER |
| 2 | `cabana-master-casais-2.png` | `fotos/3.jpg`, banheira de hidromassagem | SEM PRESSA, SÓ VOCÊS **DOIS** | BANHEIRA DE HIDROMASSAGEM PARA 2 |
| 3 | `cabana-master-casais-3.png` | `fotos/2.jpg`, sala toda em madeira | UMA CASA DE **MADEIRA** SÓ PARA VOCÊS | 85 M² · DOIS AMBIENTES |
| 4 (final) | `cabana-master-casais-4.png` | `fotos/4.jpg`, varanda com balanço | Logo + BONITO · MS + *Reserve direto pelo link da bio* | — |

Cópia bruta do gerador em `telas/01.png` a `04.png` (mesmas imagens).

## Fotos
- Origem: as 4 amostras da Central (`ferramentas/central-aprovacao/amostras/1.jpg` a `4.jpg`), copiadas para `fotos/`. **Não têm nome nem link do Drive** (pedido: não usar o Drive).
- Sem pessoas nas fotos (não precisa de autorização de imagem).
- Recorte: o padrão do modelo (cobrir a tela, centralizado); nenhum assunto principal ficou cortado.

## Decisões de design
- **Ordem das fotos:** na 1ª versão, a varanda era a tela 3 e a sala era o fundo da tela final. Troquei por dois motivos: (a) com `posicao: meio`, a faixa escura cobria o **balanço**, que é o assunto da foto; (b) na tela final, o texto caía sobre a TV clara da sala e ficava confuso. Agora a sala leva a faixa (sem ponto focal único) e o balanço aparece inteiro na tela final.
- **"4 telas" com `final: true`:** contei a tela final como a 4ª, para não passar de 4 nem mudar a config. Assim as 4 fotos entram.
- **Faixa escura** do modelo garante a leitura nas 3 telas; o modelo não escurece a foto inteira (gradiente leve de 0,35 + faixa só atrás do texto).
- **Textos imersivos**, de 4 a 7 palavras, sem fato inventado; os fatos ficam só no apoio (banheira para 2, 85 m², dois ambientes), todos confirmados em `hotel-operacional.md`.
- **Logo:** `"logo": "recursos/logo.png"` (o caminho é lido a partir da pasta do animador, ou seja, `design/ferramentas/animador/recursos/logo.png`; um caminho relativo ao roteiro não funcionaria, porque o animador só converte `foto` e `video`).

## Texto alternativo
1. Fachada de uma cabana de madeira elevada sobre troncos, cercada por árvores altas, num dia de céu azul.
2. Banheira de hidromassagem com pétalas vermelhas na água, ao lado de uma janela com vista para folhagens.
3. Sala de cabana toda em madeira, com teto alto inclinado, estante com cerâmicas e porta aberta para o banheiro.
4. Varanda de madeira com um balanço suspenso de fibra e almofada clara, banco com almofadas de folhas e mata ao fundo.

## Checklist
- [x] Foto real do hotel (amostras da Central; ver "a confirmar" sobre a acomodação)
- [x] Texto da arte de 3 a 8 palavras, sem fato não confirmado; opcionais não parecem inclusos no texto (ver pétalas abaixo)
- [x] Leitura garantida pela faixa escura do modelo; nada de branco sobre verde
- [x] Texto legível no celular, fora do ponto focal (após a troca de ordem)
- [x] Margem segura de 60 px (texto e numeração dentro da moldura)
- [~] Assinatura: o modelo do dono usa logo branco no alto da capa (96 px) e logo grande + BONITO · MS na tela final, **sem a linha laranja**; mantive o desenho do dono, como manda a regra do modelo
- [x] Tamanho exato 1080 × 1440 (conferido com `file`)
- [x] As 4 PNG abertas e conferidas
- [x] Sem pessoas
- [x] Texto alternativo de 1 frase por tela

## A confirmar com o dono
1. **Pétalas na banheira (tela 2):** pela regra do hotel, pétalas são da **decoração especial (opcional)**. A arte não fala delas, mas a **legenda precisa indicar "decoração especial (opcional)"** (aviso ao Marketing). Se preferir, troco por uma foto da banheira sem pétalas.
2. **As 4 amostras são mesmo da Cabana Master?** A sala tem a banheira ao fundo e a varanda tem balanço, o que bate com a Master, mas as amostras não têm nome de arquivo. O apoio "85 M²" só vale se a sala for da Master. [a confirmar com o dono]
3. **Resolução:** as amostras têm só 540 × 960 px e foram ampliadas para 1080 × 1440 (dá para ver leve perda de nitidez). Para publicar, refazer com os **originais do Drive** (mesmo roteiro, só trocar as fotos).
4. **Sugestões de ajuste no modelo (não apliquei; preciso do seu OK):** logo da capa com 96 px (nosso padrão é ≥ 100 px); a tela final cobre bastante a foto (escurecimento fixo de 0,75 + véu), o que funciona em foto calma, mas pesa em foto clara; os títulos ficariam melhores com quebra de linha controlada (hoje o navegador quebra sozinho, ex.: "SÓ PARA / VOCÊS" na tela 3).
