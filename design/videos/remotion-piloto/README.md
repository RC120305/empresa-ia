# Piloto Remotion: Reels com copy animada (05/10/2026)

Teste pedido pelo dono para comparar o Remotion com o kit atual (`design/ferramentas/reels-de-fotos.py`).

## Como rodar
```
cd design/videos/remotion-piloto && npm install && node render.mjs out/REELS.mp4
```
- Roteiro em `src/roteiro.ts` (telas com foto, texto, palavra de destaque, apoio, contador e movimento; fecho; música).
- Composição em `src/ReelsCopy.tsx`: copy palavra por palavra com mola, destaque em laranja (#F58634), contador animado, zoom/deslize nas fotos, selo do logo, fecho com logo + BONITO - MS + "Reserve pelo link da bio".
- Usa o Chromium já instalado (`/opt/pw-browsers/.../headless_shell`), sem baixar navegador. Render de 15 s em ~50 s.
- `public/fotos/` e `public/musica.mp3` ficam fora do git (fotos do banco do Drive, música livre do Pixabay).

## Teste técnico
| Item | Resultado |
|---|---|
| Remotion 4.0.290 (npm) | OK: instala e renderiza 1080x1920, 30 fps, com áudio |
| Whisper (legenda de fala) | **Bloqueado**: os modelos ficam em huggingface.co / openaipublic.azureedge.net, negados pela rede do ambiente. Liberar `huggingface.co` e `cdn-lfs.huggingface.co` (ou `*.hf.co`) em Acesso à rede para testar. |

## Licença
Remotion é grátis para pessoas físicas e empresas com até 3 pessoas; para uso comercial do hotel, provavelmente exige a licença de empresa (confirmar preço em remotion.pro antes de usar nos posts). Este piloto não foi publicado.
