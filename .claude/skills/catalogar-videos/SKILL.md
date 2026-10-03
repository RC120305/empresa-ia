---
name: catalogar-videos
description: Cataloga os vídeos novos (e registra as músicas novas da pasta "Trilhas sonoras free") que o dono coloca na pasta "Vídeos novos (para catalogar)" do Drive do Hotel Cabanas - baixa, divide em trechos, descreve cada trecho no catálogo de vídeos, renomeia no padrão, move para a subpasta certa e lista o que falta confirmar. Use quando o agendamento diário disparar ou quando o dono pedir "cataloga os vídeos novos", "/catalogar-videos". Não edita vídeos (ver o Editor de Vídeos) e nunca publica.
---

# Catalogar vídeos novos (rotina)

O catálogo é feito **antes de qualquer edição**: todo vídeo que entra no acervo ganha uma ficha com a descrição de cada trecho, para o Editor achar as cenas sem abrir os brutos.

## Pastas no Drive (dentro de "Vídeos do hotel cabanas", ID `1n6gPXQ1_dBkvIizIyWsPFsrTnH4k2QZw`)
| Pasta | ID | Uso |
|---|---|---|
| **Vídeos novos (para catalogar)** | `10wWUgG7JzHkNF3Zz0iG5H1ug9TTMap7p` | Entrada: o dono solta os vídeos aqui. Fica com "qualquer pessoa com o link" para o download funcionar. |
| Atividades (arco e flecha, tirolesa, caiaque, SUP, arvorismo) | `1RknauTZaERal9tyiNp2kb6bPyDMLcDy9` | Destino: atividades do hotel |
| Cabana Master e acomodações | `1-o4gc8-ZLAt1tUMDn_PM8xY3whPaQb-R` | Destino: acomodações |
| Rio, amanhecer, café e decks | `1MbWp9LeM-sfwSKj9Aig-wjrO2gVOfWBy` | Destino: rio, café, decks, áreas de lazer |
| Aves, fauna e trilhas | `1EW_DaWKTHApsByjawJ9wKBmfRa6P1quV` | Destino: fauna e trilhas |
| Passeios da região | `1mOQvZTC6gexstXUjj2a6mcWzfiksrapq` | Destino: passeios fora do hotel (ex.: Cânion do Salobra) |
| Outros | `1QVId-zrPIejlgnyoDqKqkafmclGyfc-7` | Destino: o que não se encaixa |
| Trilhas sonoras free | `1Rdg2OufStjaFQs0UDSujcvl3lPsu9mUH` | Músicas livres (não catalogar aqui) |

Planilha para o dono: **"Catálogo de vídeos"** (ID `1Tu3XLD71IlG0w1CChR8Mm51l_PzW9plAcwD59xrgDaA`).

## Passo a passo
1. **Branch:** trabalhe no branch onde o catálogo vive (hoje `claude/fervent-allen-rum82j`; depois de juntado, `main`). `git fetch` e `git checkout` dele antes de tudo.
2. **Listar a entrada:** Drive `search_files` com `parentId = '10wWUgG7JzHkNF3Zz0iG5H1ug9TTMap7p'`. Ignore pastas e o que não for vídeo. Pule IDs que já estão em `design/videos/catalogo/catalogo.json`. **Nada novo → encerre em silêncio** (sem commit, sem mensagem).
3. **Para cada vídeo novo** (no máximo 10 por rodada):
   1. `pip install -q imageio-ffmpeg` se faltar.
   2. `python3 design/ferramentas/catalogar-videos.py baixar <id> <arquivo-original>`. Se o Drive pedir login, o arquivo não está com "qualquer pessoa com o link": anote para o dono e siga para o próximo.
   3. `python3 design/ferramentas/catalogar-videos.py preparar <id> <arquivo> --titulo "<nome atual no Drive>"`.
   4. Abra a folha de quadros (`design/videos/catalogo/quadros/<nome>.jpg`) e preencha a ficha no `catalogo.json` seguindo **"Como catalogar um vídeo novo"** em `.claude/agents/editor-videos.md` (ou acione o funcionário `editor-videos` para isso). Fatos do hotel só de `contexto/hotel-operacional.md`; o que a imagem não prova vai para `a_confirmar`.
   5. **Renomeie** no Drive (`update_file`, só `title`) com o `nome_sugerido` no padrão `AAAA-MM_local_assunto_camera_NN.mp4` (data de gravação da ficha; se o local não é certo, use um termo genérico, ex.: `cabana`, nunca um nome inventado).
   6. **Mova** (`update_file`, só `parentId`) para a subpasta de destino da tabela.
   7. Apague o bruto local depois de catalogar (`rm -f "design/videos/brutos/${ARQ:?}"`): o original fica no Drive.
4. `python3 design/ferramentas/catalogar-videos.py validar` (zero pendências) e `planilha`.
5. **Planilha do Drive:** se o conector Google Sheets estiver disponível, acrescente as linhas novas na mesma planilha (não crie outra). Sem ele, deixe o CSV no repositório e avise.
6. **Commit e push** no branch do passo 1 (`git add design/videos/catalogo && git commit && git push`), com o rodapé de coautoria do projeto.
7. **Aviso ao dono** (curto, em português, tratando por "você"): quantos vídeos entraram, nome novo e pasta de cada um, e a lista do que confirmar (ex.: "qual cabana aparece no vídeo X?", autorização de imagem de crianças).

## Limites
- Nunca apaga nem esvazia arquivos no Drive; só renomeia e move vídeos que saíram da pasta de entrada.
- Nunca publica, nunca muda compartilhamento de arquivos, nunca gera imagem com IA.
- Descreve o que se vê, nunca quem as pessoas são.

## Músicas novas (na mesma rodada)
1. Drive `search_files` com `parentId = '1Rdg2OufStjaFQs0UDSujcvl3lPsu9mUH'` (pasta "Trilhas sonoras free"; pagine até o fim). Compare com `design/videos/catalogo/musicas.json` (campo `id` = nome do arquivo sem `.mp3`). Ignore cópias "(1)". Nada novo → siga em silêncio.
2. Para cada MP3 novo (até 10 MB): `download_file_content` (o resultado grande fica salvo em arquivo; decodifique o base64 para `design/videos/musicas/<nome>.mp3`, fora do git). `pip install -q numpy imageio-ffmpeg` se faltar.
3. `python3 design/ferramentas/catalogar-musicas.py analisar <nome>.mp3 ...`: mede BPM, energia (1 a 5), quando começa forte, melhor trecho e classifica clima, instrumentos, "combina com" e uso. Grave o `id_drive` da faixa na ficha.
4. `python3 design/ferramentas/catalogar-musicas.py previas ferramentas/central-aprovacao/videos/subir/musicas` (30 s do melhor trecho, MP4 de áudio). Suba só as novas como assets da Central (`Artifact`, `url` da Central, `asset: true`, `file_paths`) e grave a url em `previa` na ficha.
5. `python3 ferramentas/central-aprovacao/gerar.py 2026-10 <pasta da prévia>` e republique a Central (mesma url). A música aparece na aba **Músicas** e no passo "Música" do "+ Novo pedido".
6. A **nota do dono (0 a 5)** fica no db da Central, coleção `musicas` (doc = id da faixa: `{musica, nota, favorita (nota ≥ 4), naoUsar (nota 0)}`; `nota: null` = sem nota). Ao escolher música para um vídeo: maior nota primeiro (5 → 4 → sem nota → 3 → 2 → 1), nunca nota 0.
