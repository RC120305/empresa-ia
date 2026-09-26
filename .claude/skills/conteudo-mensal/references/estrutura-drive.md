# Estrutura: repositório (versão oficial) + Google Drive (aprovação do dono)

## Por que as duas
A ferramenta do Drive **cria** arquivos, mas **não edita** o conteúdo de um arquivo existente e não sobe as artes PNG (limite de tamanho). Então:
- **Repositório = versão oficial** (editável, com histórico).
- **Drive = vitrine para o dono aprovar no celular.** A cada rodada publica-se uma **nova versão**; a anterior vai para a subpasta `antigas`.
- **Artes:** ficam no repositório (`design/pecas/`) e são **enviadas na conversa** (`SendUserFile`).

## Repositório
```
social/conteudo/AAAA-MM/
├── pauta.md               # Fase 1: tabela do mês + stories (aprovada)
├── conteudo.md            # Fase 2: todos os posts (um bloco por post)
├── briefing-produtora.md  # Fase 2: briefings dos Reels para a produtora
└── stories.md             # Fase 2: stories por semana
design/pecas/AAAA-MM-instagram/POST-NN/   # artes de cada post (PNG + peca.html + entrega.md)
```

### Bloco de cada post em `conteudo.md`
```
## POST NN I [formato] tema
- Data: dd/mm (dia da semana) · Pilar: N · Persona: … · Objetivo: inspirar | considerar | reservar
- Status: pauta aprovada | texto pronto | arte pronta | aprovado | publicado

### Briefing de arte
TELA 1: <texto da arte> (foto: <cena desejada>)
TELA 2: …
(imagem única: FRASE: …; reels: ver briefing-produtora.md)

### Legenda
<legenda>

### A confirmar com o dono
- …
```
Nome do post: `POST NN I [formato] tema` (NN com zero à esquerda). Formatos: `[carrossel]`, `[imagem]`, `[reels]`.

## Google Drive
- Pasta raiz: **"Conteúdo Instagram"** (dentro de "Hotel Cabanas"), ID `1ogZaXssXNWdYyATqJtbCJHwDbIVBSvGQ` — https://drive.google.com/drive/folders/1ogZaXssXNWdYyATqJtbCJHwDbIVBSvGQ
- Para cada mês, criar a subpasta **`AAAA-MM <Mês>`** (ex.: `2026-11 Novembro`) com `create_file` (`contentMimeType: application/vnd.google-apps.folder`, `parentId` = pasta raiz) e, dentro dela, a subpasta **`antigas`**. Registre os IDs no topo de `pauta.md`.
- Arquivos de cada rodada (sempre com a versão no nome):
  | Arquivo | Como criar | Conteúdo |
  |---|---|---|
  | `Calendário <Mês> vN` | `create_file` com `textContent` em CSV e `contentMimeType: text/csv` → vira **Planilha** | colunas: Post, Data, Dia, Formato, Pilar, Persona, Tema, Status |
  | `Conteúdo <Mês> vN` | `create_file` com `textContent` em markdown e `contentMimeType: text/markdown` → vira **Documento** formatado | cópia de `conteudo.md` (+ stories) |
  | `Briefing produtora <Mês> vN` | idem (markdown) | cópia de `briefing-produtora.md`, pronto para encaminhar |
- Ao publicar a versão N+1: mover a versão N para `antigas` com `update_file` (`parentId` = ID de `antigas`). **Nunca apague** versões (no máximo, lixeira por pedido do dono).
- Testado em 2026-09-26: markdown → Documento formatado; CSV → Planilha.
