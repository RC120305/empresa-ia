# Entrega: POST 16, carrossel "Bangalô de 40 m²" (18/10/2026, domingo, 18h)

> **Designer de Criativos** · 29/09/2026 · Status: aguardando o OK do dono (nada foi publicado)

## Peça
- **Formato:** carrossel de 7 telas, feed 3:4 (1080 × 1440). Os 7 PNGs foram conferidos no tamanho certo.
- **Pilar:** 1 (Contemplação) · **Persona:** Famílias, "Os Aventureiros de Fim de Semana" (2ª: casais que querem mais espaço).
- **Layout final: sem faixa (estilo 1)** em todas as telas, que é a preferência do dono. Não há mistura de layouts.
  - Final: `final/POST-16-1.png` … `POST-16-7.png`
  - Alternativas para comparação: `estilos/estilo-2/` (caixa central) e `estilos/estilo-3/` (faixa discreta embaixo)
- **Fonte editável:** `fonte/textos.json` + `fonte/gera-post-16.py` (cópia adaptada do gerador do POST 15) → `peca-sem-faixa-N.html`, `peca-caixa-N.html`, `peca-N.html`.
  Para gerar de novo, rode na raiz: `python3 design/pecas/2026-10-instagram/POST-16/fonte/gera-post-16.py design/pecas/2026-10-instagram/POST-16/fonte/textos.json 1`
- As fotos originais baixadas do Drive (11, sem alteração) ficam em `brutas/`, com o ID como nome do arquivo.

## Fotos usadas (todas da pasta Bangalô `1Pu0dUQZMdbEohql-6tfu5UyfovEMvaF2`, fotos reais, sem IA)
| Tela | Foto (nome · ID) | Recorte (`object-position`) | Troca? |
|---|---|---|---|
| 1 | `bangalo_triplo_externa` · `1bcxsgpVwVIjIhTqakffLIPrF3pDZvUEi` | 62% (o bangalô inteiro, com a escada e a mata em volta) | não |
| 2 | `bangalo_externa` · `1Ys2258SPxaO5ah1XvSLWK8IqAGOCrx3C` | 47% (o bangalô isolado sob a palmeira) | não |
| 3 | `bangalo_triplo_varanda_com _rede` · `1YJx7oxm9B2-6m2riSvdhQfWdUVgpsyNo` | 50% (a rede colorida atravessando a varanda) | não |
| 4 | `bangalo_triplo_varanda` · `1WZSUdBcTUezcjnZwCvvxPKNRDwHXxKRA` | 35% (a mesa e a vista da mata no centro) | não |
| 5 | `bangalo_quadruplo_interna` · **`1d-UlWVw-I06W9AND9MgIZklVzv3hHUTl`** | 50% | **sim** (era a `1Pcz3a`) |
| 6 | `bangalo_triplo_banheiro` · **`1DpWTsbU7sOQrbOwTkBesdXu2QEsdEPLn`** | 88% (box, chuveiro, registros e janela) | **sim** (era a `1L53TA`) |
| 7 | `bangalo_triplo_externa` · `1wbIC8lY9OGlS36Qu_9X8BpDYg7b9TqvS` | 52% (lateral com a janela ampla e a escada) | não |

Links: `https://drive.google.com/file/d/<ID>/view`

### Trocas e por quê
- **Tela 5:** a `1Pcz3a` mostra a cama de casal e só uma de solteiro inteira; a outra fica cortada no canto e some no recorte 3:4. A `1r9eJt` tem o mesmo problema. A **`1d-UlW`** é a única com **a cama de casal ao centro e uma de solteiro de cada lado, no mesmo quadro**, exatamente o que o apoio "CAMA DE CASAL + 2 CAMAS DE SOLTEIRO" afirma.
- **Tela 6:** na `1L53TA`, o vaso sanitário ocupa o lado direito e fica em primeiro plano no recorte vertical. Com a alternativa **`1DpWTs`**, o recorte mostra o box de vidro, o chuveiro, os registros e a janela com verde, e o piso de tom madeira embaixo deixa o texto mais legível. Sobra só uma lasca mínima do vaso na borda esquerda, sob a sombra do texto.
- **Tela 7 (sem troca):** as duas `bangalo_triplo_externa` são do mesmo bangalô, mas **não são quase iguais**. A da capa mostra a fachada da escada e a casa inteira elevada; a da tela 7 mostra a lateral, com a janela ampla, o tronco de árvore à frente e as folhas de palmeira. Por isso mantive a indicação do briefing.
- Nenhuma foto do carrossel tem pétalas, rosa, plaquinha "LOVE" nem pessoas. As toalhas em forma de bichos da tela 5 são a arrumação padrão do hotel.

## Decisões de design
- **Sem faixa** em todas as telas, com sombra suave **só atrás do bloco de texto** e da assinatura. A foto nunca é escurecida por inteiro.
- **Texto embaixo** (telas 1, 2, 6 e 7): sobre o cascalho, a sombra do chão ou o piso, fora da fachada, da janela e do chuveiro. Na tela 1, o bloco cobre só o pé da escada.
- **Texto em cima** (telas 3, 4 e 5): sobre o telhado e o forro de madeira, que são as áreas escuras e calmas. Assim a rede, a mesa e as camas ficam livres.
- **Quebras de linha** manuais nas telas 1, 5 e 7 para equilibrar o título (sem mudar nenhuma palavra).
- **Tela 7 (CTA):** apoio "RESERVE DIRETO", título, **WhatsApp (67) 99117-1648 em destaque** (32 px) e o motor de reservas menor (22 px), como na tela 6 do POST 15.
- **Tamanhos:** título de 56 px, apoio de 20 px em caixa alta espaçada, linha fina laranja, numeração N/7 a partir da tela 2 e assinatura com fio laranja, "BONITO · MS" e logo branco de 100 px. Margem de 60 px.

## Texto alternativo final (ajustado ao que as fotos mostram)
1. "Bangalô do Hotel Cabanas, de alvenaria em tom creme e telhado de telhas, elevado do chão sobre pilares, com escada de madeira, cercado de árvores. Texto: Espaço para quatro, natureza em volta."
2. "Bangalô visto de frente, sozinho entre palmeiras e árvores, elevado do chão, com escada e varanda de madeira. Texto: Nenhuma parede em comum."
3. "Varanda do Bangalô com uma rede colorida armada, piso de madeira e a mata ao fundo. Texto: A rede espera depois da trilha."
4. "Varanda do Bangalô com mesa de madeira, banco com almofadas e vista para a mata. Texto: Conversa longa, vista verde."
5. "Quarto do Bangalô com uma cama de casal ao centro e duas camas de solteiro, uma de cada lado, com toalhas dobradas e forro de madeira. Texto: Todos juntos, cada um no seu canto."
6. "Banheiro do Bangalô com box de vidro, chuveiro e parede de ladrilhos estampados. Texto: Banho quente depois do rio."
7. "Bangalô do Hotel Cabanas visto de lado, elevado do chão, com janela ampla e escada de madeira, entre árvores e palmeiras. Texto: Seu lugar de conexão, em família. Reserve direto em sbreserva.silbeck.com.br/hotelcabanas ou pelo WhatsApp (67) 99117-1648."

## Checklist
- [x] Fotos **reais** da pasta oficial Bangalô, todas abertas e conferidas (nenhuma imagem de IA e nenhuma alteração de conteúdo, só recorte)
- [x] Textos da arte exatamente como no briefing (sem mudança de palavras); nenhum preço, "madeira", "3 m", "2 camas king" nem recreação
- [ ] **Tela 4:** o apoio diz "MESA, CADEIRAS", mas a foto mostra **mesa e banco** (ver abaixo)
- [x] Regra de cor pela luz: sombra localizada só atrás do texto; sem texto branco sobre verde
- [x] Texto legível no celular, fora do ponto principal (rede, mesa, camas, chuveiro, fachada); sem pessoas
- [x] Margem segura de 60 px
- [x] Assinatura: linha laranja + BONITO · MS + logo branco (100 px)
- [x] 7 PNGs de 1080 × 1440, abertos e conferidos (estilo 1 inteiro e amostras dos estilos 2 e 3)
- [x] Um só layout no carrossel (sem faixa)
- [x] Texto alternativo de 1 frase por tela
- [x] Autorização de imagem: não se aplica (sem pessoas)

## A confirmar com o dono
- **Banco × cadeiras na varanda (importante):** todas as fotos de varanda da pasta mostram **banco** com almofadas e mesa. As fotos são a `1WZSUd` (tela 4), a `1YJx7o` (tela 3, no canto), a `1c3Ru5` e a fachada `1Ys225`. **Em nenhuma aparecem cadeiras.** O `hotel-operacional.md` lista "mesa, cadeiras e rede" para o Bangalô e o banco só para o Bangalô Especial. Duas perguntas:
  1. O Bangalô de 40 m² tem banco na varanda?
  2. Tem cadeiras também?

  Se for só banco, o apoio da tela 4 e a legenda precisam mudar (ex.: "MESA, BANCO E VISTA PARA A NATUREZA"), porque hoje o apoio descreve algo que a foto não mostra. Por ordem do pedido, não mudei o texto. Avisar o Marketing. Enquanto isso, o recorte da tela 4 põe a mesa e a vista no centro, e o banco aparece à direita.
- **Tela 2** usa a mesma foto do POST 07 (`1Ys225`), como o briefing já previa.
- **Telas 1 e 7:** as duas fotos mostram o mesmo bangalô de ângulos diferentes. Se você preferir mais variedade no fim, a alternativa é a varanda `1c3Ru5` (também usada no POST 07, e com banco).

## O que falta e de quem
- **Dono:** OK final no carrossel e resposta sobre o banco e as cadeiras da varanda.
- **Marketing:** ajustar o apoio da tela 4 e a legenda se a resposta for "banco". Depois disso, o Designer gera de novo em 1 minuto (é só editar `fonte/textos.json`).
