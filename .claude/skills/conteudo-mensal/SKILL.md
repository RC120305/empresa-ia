---
name: conteudo-mensal
description: >-
  Planeja e produz o conteúdo mensal do Instagram do Hotel Cabanas em 3 fases,
  orquestrando a equipe (Estrategista → Marketing → Designer) com aprovação do
  dono entre as etapas, e publica a pauta e os textos no Google Drive. Use SEMPRE
  que o dono pedir para montar, planejar ou produzir o conteúdo de um mês — ex.:
  "monta o conteúdo de novembro", "/conteudo-mensal dezembro", "plano do mês".
  Cobre também a Fase 3 (título, legenda e capa quando a produtora entrega um
  Reels) e pedidos avulsos (um carrossel extra, uma sequência de stories). NÃO
  usar para refazer posts que já existem (ver alterar-conteudo), para
  relatório de métricas (ver relatorio-metricas) nem para anúncios pagos (ver
  campanha-anuncios).
---

# Conteúdo Mensal — Hotel Cabanas

Produz o Instagram do mês em **3 fases**: **Fase 1** pauta (no chat, com OK do dono) → **Fase 2** produção (textos, artes, briefing da produtora e publicação no Drive) → **Fase 3** reativa (Reels entregues pela produtora).

## Leia antes de tudo
1. `references/perfil-cabanas.md`: voz, tabus, CTA, **plano de postagem** (12 posts, rotação, stories) e antecedência de reserva.
2. `references/formatos.md`: mecânica de cada formato.
3. `references/estrutura-drive.md`: onde salvar (repositório + Drive) e como versionar.
4. Fatos: `contexto/hotel-operacional.md`, `contexto/destino-bonito.md` (duas réguas de sazonalidade), `contexto/guia-estilo-instagram.md` (item 0b), `contexto/banco-de-imagens.md`.

## Quem faz o quê (funcionários, via ferramenta Agent)
| Etapa | Funcionário (`subagent_type`) | Entrega |
|---|---|---|
| Pauta do mês | `social-media-trafego` (Estrategista) | tabela de 12 posts + stories |
| Textos | `marketing-anuncios` (Marketing) | briefing de arte, legendas, briefing da produtora, stories |
| Artes | `designer-criativos` (Designer) | PNGs 3:4 (e 9:16 quando for o caso) |
| Publicar no Drive e no repositório | você (a skill) | Planilha + Documentos no Drive; commit |

Passe a cada funcionário **só o necessário** (mês, posts, decisões do dono) e peça para ele ler os próprios arquivos de contexto. Trate o dono por "você".

## Fase 1 — Pauta (no chat)
1. Confirme o **mês** e se há algo especial (feriados, promoções, eventos, fotos novas). Não pergunte o que já está no contexto.
2. Acione o **Estrategista** pedindo a pauta, com estas regras:
   - **12 posts** nas datas reais (terça, quinta e sábado do mês) seguindo a **rotação** do perfil; 5 carrosséis, 4 Reels, 3 imagens únicas.
   - Para cada post: data, formato, pilar (respeitar o mix), persona, objetivo (inspirar / considerar / reservar), **tema principal + 2 alternativas**, e a foto/cena que o tema pede (existe no banco? se não, marcar "precisa foto/vídeo").
   - Considerar as **duas réguas de sazonalidade** e o **período de venda** (antecedência de 45 a 50 dias: o conteúdo do mês também vende estadias de ~2 meses depois; feriados reais com data).
   - Stories: 3 a 5 ideias **por semana**.
   - Abrir com "as 3 decisões que preciso de você agora", se houver.
3. Apresente ao dono a **tabela do mês inteiro, agrupada por semana** (`# | Data | Formato | Pilar | Persona | Tema | Alternativas`) + stories por semana. Nunca uma amostra.
4. **PAUSA OBRIGATÓRIA.** O dono troca temas (pelas alternativas), formatos ou datas. Só avance com OK explícito.
5. Com o OK: crie as pastas do mês no Drive, salve `social/conteudo/AAAA-MM/pauta.md` e publique `Calendário <Mês> v1` (Planilha) — ver `estrutura-drive.md`.

## Fase 2 — Produção
1. **Textos:** acione o **Marketing** com a pauta aprovada. Peça, no formato de `formatos.md` e no bloco de `estrutura-drive.md`:
   - carrossel e imagem única: **briefing de arte** (texto de cada tela, **imersivo**, 3 a 8 palavras, negrito/itálico indicados, foto desejada) + **legenda** informativa com CTA;
   - Reels: **briefing para a produtora** + legenda provisória;
   - stories da semana.
   O Marketing deve aplicar o próprio checklist (fatos, opcionais, preços, atributos por acomodação). Salve em `conteudo.md`, `briefing-produtora.md` e `stories.md`.
2. **Revisão rápida (sua):** confira que nada inventa fato (compare com `hotel-operacional.md`), que cada post tem CTA e que opcionais estão marcados. Corrija com o Marketing se preciso.
3. **PAUSA 2 (textos):** mostre ao dono o resumo dos textos (títulos das telas + 1ª linha das legendas) e publique `Conteúdo <Mês> v1` no Drive para ele ler completo. Avance com o OK. Se o dono disser "pode seguir direto para as artes", pule esta pausa.
4. **Artes:** acione o **Designer** com o **briefing de arte** de cada carrossel e imagem única (só o texto da arte + foto desejada + formato 3:4). Ele escolhe as fotos reais no Drive, escolhe o layout (com ou sem faixa, pela luz da foto) e salva em `design/pecas/AAAA-MM-instagram/POST-NN/`. Reels não têm arte nesta fase.
5. **Central de Aprovação:** gere e publique a página do mês (`references/central-de-aprovacao.md`) com as artes finais e legendas; é onde o dono aprova ou pede correções (com upload de foto).
6. **Pacote de publicação:** para cada post, a planilha `Calendário` traz **data, horário, formato, arquivo(s) da arte, legenda final com hashtags e Status**. O dono aprova marcando **"Aprovado"** na coluna Status (ou escreve o ajuste). Sem "Aprovado", o post não sai.
7. **Entrega ao dono:** envie os PNGs com `SendUserFile` (um card por post ou agrupado por semana), publique `Briefing produtora <Mês> v1` no Drive e atualize o `Calendário` (status). Diga o que falta: fotos a produzir, autorizações de imagem, confirmações de fatos.
8. **Commit e push** no repositório. Criar e publicar em massa é ação com efeito: **confirme com o dono antes** da publicação no Drive se ela não tiver sido combinada.

## Fase 3 — Reativa (Reels da produtora)
Quando a produtora entrega um vídeo:
1. O dono avisa e envia o **link do Drive** ou o arquivo. Vídeo não é legível direto: peça a **transcrição/descrição das cenas** (ou print), ou, se o arquivo estiver no Drive e for pequeno, baixe-o e extraia 3 a 5 quadros com `ffmpeg` (`/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux`) para ver as cenas.
2. Marketing: **título final** (nome do post: `POST NN I [reels] título`) + **legenda** ajustada ao que foi gravado.
3. Designer: **capa 9:16** com um quadro real do vídeo ou uma foto do banco.
4. Atualize `conteudo.md`, publique a nova versão do `Conteúdo` no Drive e envie a capa ao dono.

## Pedidos avulsos
Peça única (um carrossel extra, uma sequência de stories, uma legenda): leia o perfil, acione o funcionário certo com o formato de `formatos.md` e entregue no chat. Sem o fluxo de 3 fases.

## Regras transversais
- Voz, CTA e tabus: `perfil-cabanas.md`. Fatos: só do `contexto/`. O que faltar: "[a confirmar com o dono]".
- **Publicação:** só os posts que o dono marcar **"Aprovado"** na planilha `Calendário`, pela skill `publicar-instagram` (automática, quando configurada) ou pelo agendador do Meta Business Suite (Etapa 1). **Ninguém gasta verba.**
- Só fotos e vídeos reais; nada de imagem de IA.
- Português do Brasil.
