---
name: campanha-anuncios
description: >-
  Planeja e produz uma campanha paga no Meta Ads (Instagram e Facebook) para o
  Hotel Cabanas, orquestrando a equipe (Estrategista → Marketing → Designer)
  com aprovação do dono entre as etapas: plano com 10 a 15 criativos
  realmente diferentes por persona, cenários de verba, textos dentro dos limites
  do Meta, artes 4:5 e 9:16, links com UTM; sobe a campanha PAUSADA na conta
  pela API da Meta e só ativa com o OK do dono, dentro da verba aprovada.
  Use SEMPRE que o dono pedir anúncio pago, campanha, tráfego pago, impulsionar
  ou "anunciar" um feriado, pacote ou período — ex.: "/campanha-anuncios
  réveillon", "campanha da baixa temporada", "vamos anunciar o Carnaval",
  "transforma o post vencedor em anúncio", "analisa os números da campanha".
  NÃO usar para o conteúdo orgânico do mês (ver conteudo-mensal), para alterar
  posts (ver alterar-conteudo) nem para o relatório do Instagram (ver
  relatorio-metricas).
---

# Campanha de Anúncios (Meta Ads) — Hotel Cabanas

Produz uma campanha paga em **5 fases**: **Fase 1** plano e verba (OK do dono) → **Fase 2** textos (OK do dono) → **Fase 3** artes (OK do dono) → **Fase 4** subida **pausada** na conta e **ativação só com o OK do dono** → **Fase 5** acompanhamento.

> **Status da subida pela API: em implantação.** Enquanto a chave da Meta (com permissão de anúncios) e a rede não estiverem prontas, a Fase 4 entrega o kit de subida para o dono subir manualmente. Configuração: `social/publicacao/passo-a-passo-meta.md`.

**Orgânico × pago:** o orgânico (`conteudo-mensal`) encanta quem já segue, em 3:4, com ritmo mensal. O pago faz **quem não conhece reservar**: formatos 4:5 e 9:16, gancho imersivo + 1 fato concreto + CTA, **por campanha** (feriado, pacote, período) e com 45 a 50 dias de antecedência da estadia.

## Leia antes de tudo
1. `references/meta-ads.md`: formatos, limites de texto, zonas seguras, estrutura de campanha (Andromeda), UTM, métricas e regras de otimização.
2. `references/estrutura-campanha.md`: onde salvar (repositório + Drive), nomes e versões.
3. `../conteudo-mensal/references/perfil-cabanas.md`: voz ("nós", tratando por "você"), tabus, CTA, provas sociais e objeções.
4. Fatos: `contexto/hotel-operacional.md`, `contexto/hotel-cabanas.md` (§9: objeções, notas, metas), `contexto/destino-bonito.md` (duas réguas de sazonalidade), `contexto/social-e-trafego.md`, `contexto/cultura.md` §8 (cuidados em anúncios).

## Quem faz o quê (funcionários, via ferramenta Agent)
| Etapa | Funcionário (`subagent_type`) | Entrega |
|---|---|---|
| Plano da campanha | `social-media-trafego` (Estrategista) | objetivo, calendário de veiculação, 10 a 15 criativos, cenários de verba, UTMs, métricas de sucesso |
| Textos | `marketing-anuncios` (Marketing) | texto principal, título, descrição e botão de cada anúncio + briefing de arte |
| Artes | `designer-criativos` (Designer) | PNGs 4:5 (`feed45`) e 9:16 (`story`) |
| Vídeos | produtora do dono | a partir do briefing do Marketing |
| Subida pausada, ativação com OK, Drive e repositório | você (a skill) | campanha pausada na conta (API) ou kit de subida; commit |

Passe a cada funcionário **só o necessário** e peça que leia os próprios arquivos de contexto. Trate o dono por "você".

## O que o dono fornece (pergunte só o que faltar, numa mensagem só)
1. **Campanha**: qual data, pacote ou período (ex.: "Réveillon, pacote de 4 noites", "baixa temporada nov/dez").
2. **Oferta**: valor, o que inclui, condições. Sem valor → os textos usam "[confirmar valor vigente]" e nada vai ao ar sem o dono confirmar.
3. **Operação da conta:** a equipe sobe as campanhas pela API (decisão do dono em 2026-09-27), com aprovação em cada etapa. Se a API ainda não estiver configurada, entregar o kit de subida.
4. **Verba**: um teto, ou "quero cenários".
5. Opcional: se há **post vencedor** do orgânico a reaproveitar (ver o último relatório em `social/relatorios/`).

## Fase 1 — Plano (no chat)
1. Calcule as datas: **período da estadia** e **período de venda** (começa ~45 a 50 dias antes; pico ~30 a 45 dias antes). Se a janela já estiver curta, diga isso com números.
2. Acione o **Estrategista** pedindo, conforme `meta-ads.md`:
   - **Objetivo** e evento de sucesso (conversa no WhatsApp de reservas ou clique no motor de reservas) e como medir (UTM + pergunta "como nos conheceu?").
   - **Estrutura simples:** 1 campanha, 1 conjunto amplo (Advantage+), segmentação feita **pelo criativo**. Conjunto separado só quando a mensagem for incompatível (ex.: morador da região para boia cross/arvorismo).
   - **10 a 15 criativos realmente diferentes** (não variações de cor ou de frase): para cada um, `AD NN | persona | ângulo | formato (imagem, carrossel, vídeo) | gancho | foto/vídeo do banco (ou "precisa produzir")`. Distribuir entre as personas que fazem sentido para a campanha e entre ângulos (contemplação, aventura, família, custo-benefício pelo que está incluído, prova social, objeção respondida).
   - **Reaproveitar o post vencedor**, se houver.
   - **Cenários de verba** (econômico, recomendado, forte) com valor diário, período e o que se espera de cada um em faixas, dizendo o que é estimativa.
   - **Calendário de veiculação** (início, reforço no pico, fim) e **quando olhar os números** (Fase 5).
   - Abrir com "as 3 decisões que preciso de você agora", se houver.
3. Apresente ao dono: resumo (objetivo, datas, estrutura), a **tabela completa dos criativos** e os cenários de verba. Nunca uma amostra.
4. **PAUSA OBRIGATÓRIA.** O dono escolhe o cenário de verba, corta ou troca criativos. Só avance com OK explícito.
5. Com o OK: salve `social/anuncios/<AAAA-MM>-<campanha>/plano.md` e publique `Plano <Campanha> v1` no Drive (ver `estrutura-campanha.md`).

## Fase 2 — Textos
1. Acione o **Marketing** com o plano aprovado. Para cada `AD NN`:
   - **Texto principal** com gancho na 1ª linha (até ~125 caracteres antes do "ver mais"), **título** (até ~40) e **descrição** (até ~30), **com a contagem**; **botão (CTA)** sugerido (ver `meta-ads.md`).
   - **Briefing de arte:** texto da arte (gancho imersivo de 3 a 8 palavras + 1 fato concreto; o CTA vai no botão e, se couber, numa linha curta), foto desejada.
   - Vídeo: **briefing para a produtora** (gancho nos 3 primeiros segundos, cenas, duração 15 a 30 s, legendas na tela, 9:16).
   - O próprio checklist: fatos, "(opcional)", "[confirmar valor vigente]", atributos por persona, nada de concorrente, nada de urgência falsa; nunca "água cristalina garantida" em meses de chuva.
2. **Revisão rápida (sua):** compare com `hotel-operacional.md`; confira limites e contagens; confira que cada anúncio tem link com UTM.
3. **PAUSA 2:** mostre um resumo (AD NN + gancho + título) e publique `Textos <Campanha> v1` no Drive. Avance com o OK (o dono pode dizer "pode seguir direto para as artes").

## Fase 3 — Artes
1. Acione o **Designer** com o briefing de arte de cada anúncio de imagem ou carrossel. Cada anúncio sai em **dois tamanhos**: `feed45` (1080 × 1350) e `story` (1080 × 1920), respeitando as **zonas seguras** do 9:16. Layouts oficiais (com ou sem faixa), só fotos reais. Salva em `design/pecas/anuncios/<AAAA-MM>-<campanha>/AD-NN/`.
2. Envie os PNGs ao dono com `SendUserFile` (agrupados por persona) e publique no Drive a planilha `Anúncios <Campanha> vN` (colunas em `estrutura-campanha.md`), com a coluna **Status** para o dono marcar **"Aprovado"** por anúncio. Vídeos: `Briefing produtora <Campanha> v1`.
3. **PAUSA 3:** só anúncios com **"Aprovado"** seguem para a conta.

## Fase 4 — Subida pausada e ativação
**Requisitos:** `META_IG_TOKEN` com permissões de anúncios (`ads_management`, `ads_read`), `graph.facebook.com` liberado, e em `social/publicacao/config.md` o **ID da conta de anúncios**, o ID da Página e o **limite de gastos da conta** definido pelo dono. Faltou algo → entregar o kit de subida (item 4) e avisar.
1. **Subir tudo PAUSADO** pela Marketing API: campanha (objetivo aprovado) → conjunto amplo (Advantage+, orçamento e datas **exatamente** do cenário aprovado) → um anúncio por `AD NN` aprovado, com os dois tamanhos, textos, botão e URL com UTM. Nomes: `<AAAA-MM>-<campanha>` / `AD NN persona ângulo`.
2. **Conferir e mostrar ao dono:** como a campanha ficou na conta (objetivo, orçamento diário e total, datas, nº de anúncios, links) + prévia de 2 ou 3 anúncios. Registre os IDs em `social/anuncios/<AAAA-MM>-<campanha>/conta.md`.
3. **PAUSA 4 (ativação):** a campanha só é **ativada** com um OK explícito do dono **nesta conversa** ("pode ativar"). Sem OK, fica pausada.
4. **Kit de subida (plano B, sem API):** `kit-subida.md` com passo a passo curto no Gerenciador de Anúncios para o dono subir.
5. Commit e push.

## Fase 5 — Acompanhamento
3 a 5 dias depois do início, e de novo no fim, leia os números pela API (`ads_read`) ou pelos prints que o dono enviar (**nunca invente números**; valor lido de gráfico vai com "~").
1. Acione o **Estrategista** com os números: o que está funcionando (por criativo), o que pausar, o que reforçar, frequência, hora de criativos novos, e o que **não** dá para concluir (ex.: reservas sem UTM/pergunta). Regras em `meta-ads.md`.
2. **Sem perguntar, só o que reduz gasto:** **pausar** um anúncio com erro (link quebrado, texto errado, reprovado pela Meta) e avisar o dono no mesmo dia.
3. **Todo o resto precisa do OK do dono:** aumentar orçamento, estender datas, novos criativos, novo público, reativar campanha. Apresente a recomendação com o impacto em R$.
4. Registre em `resultados.md` e, no fim, uma linha de **aprendizado** em `social/anuncios/README.md`.

## Atalho: post vencedor → anúncio
"Transforma o post vencedor em anúncio": pule a Fase 1 completa. Marketing adapta os textos ao formato de anúncio, Designer gera `feed45` + `story`, e o post entra na campanha em andamento ou numa campanha de "sempre ligada" [o dono decide].

## Regras transversais
- **Dinheiro só com o OK do dono:** campanhas sobem **pausadas**; ativar, aumentar orçamento ou estender datas exige aprovação explícita. O orçamento nunca passa do cenário aprovado. O **limite de gastos da conta** é uma trava definida pelo dono: a equipe nunca o altera.
- Nunca pedir nem guardar **senhas ou chaves** no chat; a chave fica só nas configurações do ambiente.
- Não mexer em campanhas que a equipe não criou, nem em forma de pagamento ou dados da conta.
- Voz, CTA e tabus: `perfil-cabanas.md`. Fatos: só do `contexto/`. O que faltar: "[a confirmar com o dono]". Preço: "[confirmar valor vigente]" até a confirmação.
- **Nunca citar concorrentes**, nem comparar preços em público. Notas do Google, Booking e TripAdvisor podem aparecer com fonte e mês.
- Nada de urgência falsa, promessa absoluta ou de saúde, imagem de IA.
- Português do Brasil.
