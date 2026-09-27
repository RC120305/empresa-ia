# Estrutura: repositório (versão oficial) + Google Drive (aprovação do dono)

Mesma lógica da `conteudo-mensal` (ver `../../conteudo-mensal/references/estrutura-drive.md`): o repositório é a versão oficial; o Drive é a vitrine para o dono aprovar (nova versão a cada rodada, a anterior vai para `antigas`); os PNGs são enviados na conversa.

## Repositório
```
social/anuncios/
├── README.md                          # quem opera a conta, aprendizados de cada campanha
└── AAAA-MM-<campanha>/                # ex.: 2026-11-reveillon (AAAA-MM = mês de início da veiculação)
    ├── plano.md                       # Fase 1 (aprovado)
    ├── textos.md                      # Fase 2: um bloco por anúncio
    ├── briefing-produtora.md          # vídeos, se houver
    ├── kit-subida.md                  # Fase 3: passo a passo ou briefing da agência
    └── resultados.md                  # Fase 4
design/pecas/anuncios/AAAA-MM-<campanha>/AD-NN/   # AD-NN-45.png, AD-NN-916.png, peca.html, entrega.md
```

### Bloco de cada anúncio em `textos.md`
```
## AD NN I persona I ângulo I [imagem|carrossel|video]
- Status: plano aprovado | texto pronto | arte pronta | aprovado | no ar | pausado
- Texto principal (NNN caracteres): …
- Título (NN): …
- Descrição (NN): …
- Botão: Enviar mensagem | Reservar agora | Saiba mais
- URL: <link com UTM>  ·  Mensagem pronta do WhatsApp: …

### Briefing de arte
GANCHO: … · FATO: … · (foto: <cena desejada>)

### A confirmar com o dono
- …
```

## Google Drive
- Pasta **"Anúncios"** dentro de "Hotel Cabanas" (ID `1_Q2ymOhEdEhJOC1nnP56P77EprGvATdQ`). Na primeira campanha, crie-a com `create_file` (`application/vnd.google-apps.folder`) e registre o ID aqui: **ID da pasta Anúncios: [criar na primeira campanha]**.
- Para cada campanha: subpasta `AAAA-MM <Campanha>` (ex.: `2026-11 Réveillon`) + subpasta `antigas`. Registre os IDs no topo de `plano.md`.

| Arquivo | Como criar | Conteúdo |
|---|---|---|
| `Plano <Campanha> vN` | markdown → Documento | cópia de `plano.md` |
| `Textos <Campanha> vN` | markdown → Documento | cópia de `textos.md` |
| `Anúncios <Campanha> vN` | CSV → Planilha | colunas: AD, Persona, Ângulo, Formato, Arquivo 4:5, Arquivo 9:16, Texto principal, Título, Descrição, Botão, URL com UTM, Status |
| `Kit de subida <Campanha> vN` | markdown → Documento | cópia de `kit-subida.md` |
| `Briefing produtora <Campanha> vN` | markdown → Documento | se houver vídeos |
- Nunca apagar versões.
