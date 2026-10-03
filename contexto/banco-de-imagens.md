# Mapa do Banco de Imagens (Google Drive)

> Levantado em 2026-09-26. Pasta raiz: **"Imagens do hotel cabanas"**, ID `1j2JGPBtyArVGkrOpj-ZdwmJ5w0qHlsO5`.
> Para listar uma pasta: `search_files` com `parentId = '<ID>'` (a resposta vem paginada; use o `pageToken`).
> ⚠️ Os nomes dos arquivos **não descrevem a cena** (ex.: "2025.05 Hotel Cabanas Foto 189.jpg"). **Abra a foto** (download_file_content) antes de indicá-la num post.

| Pasta | ID | Observação |
|---|---|---|
| **Cabanas, apartamentos e bangalôs** | `1Fv5HDQiRrvUMGf0S_CavGBVOYLyWjVM_` | Subpastas abaixo |
| ↳ Cabana casal | `1jerV3-wB_-vNUdXCv5m4mRPLH4DOJfb2` | |
| ↳ Cabanas triplo | `1sdnJkW5eEb8F1II1jgk4UNjObsR1mFD2` | |
| ↳ Cabana Master | `1b9IhPTzgchm2dcUhDFWXT_WGHnOeW54B` | |
| ↳ Bangalô | `1Pu0dUQZMdbEohql-6tfu5UyfovEMvaF2` | **Todas as fotos são do Bangalô (40 m²)** (dono, 2026-09-27), inclusive a varanda com rede e banco (`bangalo_quadruplo_varanda_com_rede`) |
| ↳ **Bangalô Especial** | `1YUf0Owu4N_CLydXjxDFs3lRr8GXYDofA` | 45 m², até 4 pessoas (2 camas king), para famílias. Ver `hotel-operacional.md` |
| ↳ Conjugado | `1J3ER6_A3EngEuVKkWRVcEv7oHNd_Omkm` | |
| ↳ Quádruplo superior | `1Zx2uw4jUTznM1T3GXOWztxYIZ-ocepXL` | Corresponde ao Apartamento Superior (2 a 4 pessoas) |
| ↳ Apartamento Standard | `1d5hdiGRL3nVl4lrYaeb99E1TtjqqyAHr` | |
| **Atividades e balneário** | `1SFxgG3XFfYGktuGVXjKKOHBAOvwvxB-j` | Fotos soltas + subpasta |
| ↳ Formosinho | `1wZN1lviJghYGOfuTK3ZzPD_HIevfSnEO` | Rio Formosinho (decks, balneário) |
| **Boia Cross** | `1BJs4Fj2GHAa3KddhuZBDmIcAZvFTsPZ3` | |
| **Arvorismo** | `1MGgW90nv3vRj_wBz4eWhFCn_ELzenarz` | |
| **Infraestrutura** ("Insfraestrutura") | `1EH5gCO1UUt1sLLOKFOl03XD6cBIi-uOq` | |
| **Lanchonete e Café da manhã** | `18esJNehu2_dkbgIodJrgYr9JUsGL39TO` | |
| **Novos Prints 16x9** | `1HQ0Nao_bsGyzKRqjKV1ZIiA9E0HT2JC2` | Formato **16:9** (horizontal). Vários arquivos repetem os das outras pastas. Para o feed 3:4 (padrão desde 2026-09-26), é preciso recortar; confira se o recorte não corta o essencial |

## Lacunas do banco (sugestões para o dono)
- Sem pasta para **Flutuação**, **Caiaque/SUP**, **Tirolesa**, **Arco e flecha** (podem estar em "Atividades e balneário": verificar).
- Sem pasta para **Sustentabilidade** (compostagem, coleta seletiva), **Fauna**, **Pessoas autorizadas** e **Marca** (logos).
- Fotos com pessoas: **todas as imagens do banco são autorizadas** (confirmado pelo dono em 2026-09-27).

## Acervo de vídeos (Google Drive)
Pasta **"Vídeos do hotel cabanas"** (dentro de "Hotel Cabanas"), criada em 2026-09-27: https://drive.google.com/drive/folders/1n6gPXQ1_dBkvIizIyWsPFsrTnH4k2QZw (ID `1n6gPXQ1_dBkvIizIyWsPFsrTnH4k2QZw`). Os vídeos estão com a produtora; o dono sobe aos poucos. Só vídeos reais do hotel.
| Subpasta | ID |
|---|---|
| Atividades (arco e flecha, tirolesa, caiaque, SUP, arvorismo) | `1RknauTZaERal9tyiNp2kb6bPyDMLcDy9` |
| Cabana Master e acomodações | `1-o4gc8-ZLAt1tUMDn_PM8xY3whPaQb-R` |
| Aves, fauna e trilhas | `1EW_DaWKTHApsByjawJ9wKBmfRa6P1quV` |
| Rio, amanhecer, café e decks | `1MbWp9LeM-sfwSKj9Aig-wjrO2gVOfWBy` |
| Outros | `1QVId-zrPIejlgnyoDqKqkafmclGyfc-7` |
Vídeos grandes não são lidos direto: para ver as cenas, extrair 3 a 5 quadros com ffmpeg (arquivos pequenos) ou pedir ao dono a descrição das cenas.
- **Como baixar vídeos grandes (03/10/2026):** a ferramenta do Drive só baixa até 10 MB. Para vídeos maiores, o arquivo precisa estar com "qualquer pessoa com o link" e a rede libera `drive.usercontent.google.com`: `curl -L -o design/videos/brutos/<nome>.mp4 "https://drive.usercontent.google.com/download?id=<ID>&export=download&confirm=t"`. Brutos ficam em `design/videos/brutos/` (fora do git). Atalhos ("arrastar" uma pasta compartilhada para o Drive) não copiam os arquivos: baixe e suba na pasta do hotel.
- **Brutos de drone na raiz da pasta:** `DJI_20260211122523_0113_D.mp4` e `DJI_20260211122634_0114_D.mp4` (cânion com rio turquesa, passeio da região, local [a confirmar com o dono]; não é o hotel).
- **Subpasta "Trilhas sonoras free"** (ID `1Rdg2OufStjaFQs0UDSujcvl3lPsu9mUH`): músicas livres para uso comercial (Pixabay), baixadas para `design/videos/musicas/` (fora do git). Ambient/piano para vídeos calmos; violão "upbeat" para ritmo rápido.
