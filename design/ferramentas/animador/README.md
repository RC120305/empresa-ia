# Animador Cabanas

Nosso "Remotion" feito em casa: transforma um **roteiro JSON** em **MP4 9:16** (1080x1920, 30 fps), quadro a quadro.
Sem licença paga e sem baixar nada novo: usa o Chromium do ambiente (Playwright) e o ffmpeg do `imageio-ffmpeg`.

```bash
node design/ferramentas/animador/animar.mjs <roteiro.json> [saida.mp4] [--previa] [--trabalhadores 4]
```
`--previa` gera em 540x960 para conferir rápido. O Reels de 15 s leva cerca de 45 s.

## Como funciona
1. `motor.html` abre no Chromium com o tamanho do vídeo e carrega o **modelo** pedido no roteiro (`modelos/<modelo>.js`).
2. O modelo monta a cena uma vez (fotos, textos, logo) e expõe `quadro(f)`: cada quadro é **função do número do quadro**, então o resultado é sempre igual (dá para refazer só um pedaço, paralelizar e corrigir sem surpresa).
3. `animar.mjs` fotografa os quadros em paralelo, monta o MP4 e junta a música (com início, volume e fade de saída do roteiro).

Ferramentas do motor para os modelos (`Anim`): `interp` (valor por quadro, com easing), `spring` (mola, igual à do Remotion), `ease`, `el` (cria elementos), `CORES` (creme, laranja, marrom da marca) e `sombra`. Fontes e logo em `recursos/`.

## Modelos
| Modelo | Arquivo | O que faz |
|---|---|---|
| Copy que acende | `modelos/copy-que-acende.js` | Foto com zoom ou deslize, copy palavra por palavra com a palavra-chave em laranja, contador opcional, selo do logo e fecho com chamada. |
| Legenda da fala | `modelos/legenda-fala.js` | Vídeo de alguém falando com a legenda palavra por palavra (1 a 3 palavras por vez; a palavra falada acende em laranja). Roteiro com `video` e `transcricao` (JSON de `design/ferramentas/legendar-fala.py`), `destaques`, `selo`, `fecho`. A fala do vídeo vai para o MP4; `musica` entra baixinha por baixo (volume padrão 0,15). |

Exemplo de roteiro: `design/videos/2026-10/piloto-legendas/roteiro-animador.json`.

## Vídeo de fundo
O Chromium do ambiente não decodifica H.264, então o `animar.mjs` extrai os quadros do `video` com o ffmpeg antes de animar (`roteiro.quadrosVideo`); o modelo mostra o quadro certo com `Anim.quadroVideo(img, r.quadrosVideo, f)`.

## Criar um modelo novo
1. Copie `modelos/copy-que-acende.js` para `modelos/<id>.js` e registre `MODELOS["<id>"] = (palco, roteiro, {fps, w, h}) => ({duracao, quadro})`.
2. Faça um roteiro de exemplo, renderize com `--previa`, depois completo.
3. Cadastre o modelo no mostruário da Central (`ferramentas/central-aprovacao/modelos.json`, com `"animador": "<id>"` e o vídeo de exemplo na aba Vídeos) para o dono aprovar e sugerir ajustes.

Regras de sempre: só fotos e vídeos reais do hotel, fatos só de `contexto/hotel-operacional.md`, música só livre (pasta "Trilhas sonoras free"), e nada é publicado sem o "Aprovado" do dono.
