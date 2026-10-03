# Reels de teste com drone (pedido de 03/10/2026)

Dois Reels de teste em estilos diferentes, montados com os brutos `DJI_0113` e `DJI_0114` (pasta de mídia da agência Ecotrip). As imagens mostram **um passeio da região de Bonito, não o hotel**. O Cabanas só aparece no fecho, como a base da viagem.

- **Refazer:** `python3 design/videos/2026-10/teste-drone/montar.py` (ou `... montar.py cinematico` / `... montar.py rapido`). O script tem os cortes, os textos, a correção de cor e o fecho. Os brutos precisam estar em `design/videos/brutos/`, que fica fora do git.
- **Descoberta técnica:** os brutos parecem 3840x2160, mas têm metadado de rotação de 90°. Ou seja, foram **filmados na vertical** (2160x3840, já em 9:16). Por isso não houve recorte: o quadro inteiro do drone foi mantido e só reduzido para 1080x1920 a 30 fps.
- **Cor:** correção leve e igual em todos os trechos (`eq` com brilho +0,03, contraste 1,08, saturação 1,10 e gama 1,12). A cena não foi alterada e não houve IA.
- **Trecho escuro evitado:** do 0113 só usei até 19,2 s (ele escurece a partir de ~27 s).
- **Conferido:** `folha-quadros-cinematico.jpg` e `folha-quadros-ritmo-rapido.jpg`. O texto está legível, fora dos 250 px de cima e de baixo, e nunca aparece junto com outro texto.

## 1. Cinemático: `REELS-DRONE-CINEMATICO.mp4` (12,8 s, 1080x1920, sem áudio)
Fusão de 0,4 s entre os trechos. O texto entra depois da fusão e sai antes dela.

| # | Tempo | Texto na tela | Trecho do bruto |
|---|---|---|---|
| 1 | 3,6 s | ISSO É BONITO - MS (gancho, aparece em 0,05 s) | 0113, de 0,5 a 4,1 s: cânion, paredão e rio turquesa |
| 2 | 3,6 s | PAREDÕES DE PEDRA E MATA | 0114, de 15,0 a 18,6 s: paredão, rio, botes amarelos |
| 3 | 3,4 s | +40 ATRATIVOS NA REGIÃO | 0113, de 15,0 a 18,4 s: rio com corredeira na mata |
| fecho | 3,4 s | SUA BASE PARA EXPLORAR + logo + BONITO - MS + "Reserve pelo link da bio" | 0114, de 25,6 a 29,0 s, com véu escuro |

## 2. Ritmo rápido: `REELS-DRONE-RITMO-RAPIDO.mp4` (9,7 s, 1080x1920, sem áudio)
Cortes secos, alternando os dois vídeos.

| # | Tempo | Texto na tela | Trecho do bruto |
|---|---|---|---|
| 1 | 1,5 s | PRÓXIMA VIAGEM: BONITO - MS (gancho) | 0114, 1,5 s: corredeira e paredão |
| 2 | 1,2 s | PAREDÕES DE PEDRA | 0113, 2,0 s: cânion |
| 3 | 1,2 s | RIO NO MEIO DA MATA | 0114, 16,0 s: botes na margem |
| 4 | 1,2 s | +40 ATRATIVOS NA REGIÃO | 0113, 12,0 s: rio reto na mata |
| 5 | 1,2 s | VAGAS LIMITADAS POR DIA | 0114, 21,0 s: paredão em curva |
| 6 | 1,2 s | PLANEJE COM ANTECEDÊNCIA | 0113, 18,0 s: corredeira |
| fecho | 2,2 s | SUA BASE PARA EXPLORAR + logo + BONITO - MS + "Reserve pelo link da bio" | 0114, 26,0 s, com véu escuro |

**Fontes dos fatos (`contexto/destino-bonito.md`):** "+40 atrativos" vem de "mais de 40 pontos turísticos na Serra da Bodoquena" (segundo as agências). "Vagas limitadas por dia" vem da capacidade de carga diária. "Planeje com antecedência" vem da recomendação das agências de reservar com até 2 meses de antecedência na alta temporada. Não usei distâncias, tempos nem "melhor".

**Música:** o arquivo vai sem áudio. Para o cinemático, sugiro trilha instrumental ambiente/cinemática suave (piano ou cordas, 70 a 90 BPM, sem voz), ou som de rio. Para o ritmo rápido, percussão orgânica ou violão dedilhado mais animado (110 a 125 BPM, sem voz), com os cortes no tempo. Use só faixa livre para uso comercial (Pixabay, Mixkit) ou escolha a música no app do Instagram na hora de publicar.

## [a confirmar com o dono]
- **Nome e local do passeio** (provavelmente Cânion do Salobra / Serra da Bodoquena). Por isso não aparece na tela. A legenda também não deve citar o nome sem a sua confirmação.
- **Direito de uso das imagens da Ecotrip** no perfil do Cabanas e se é preciso dar crédito (ex.: "Imagens: Ecotrip" na legenda).
- **Pessoas e botes** aparecem pequenos e sem rosto identificável (0114, em torno de 15 a 22 s). Mesmo assim, confirme se a agência tem autorização de imagem.
- **Legenda (Marketing):** deixar claro que é um passeio externo da região, contratado à parte, e não uma atividade do hotel.
- Os textos ficam só na faixa de baixo. Durante os trechos não há logo nem moldura, para não dar a entender que a cena é dentro do Cabanas. O logo aparece só no fecho.
