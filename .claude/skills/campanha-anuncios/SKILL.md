---
name: campanha-anuncios
description: >-
  Planeja e produz uma campanha paga no Meta Ads (Instagram e Facebook) para o
  Hotel Cabanas, orquestrando a equipe (Estrategista → Marketing → Designer)
  com aprovação do dono entre as etapas: plano com 10 a 15 criativos
  realmente diferentes por persona, cenários de verba, textos dentro dos limites
  do Meta, artes 4:5 e 9:16, links com UTM e o kit pronto para subir na conta.
  Use SEMPRE que o dono pedir anúncio pago, campanha, tráfego pago, impulsionar
  ou "anunciar" um feriado, pacote ou período — ex.: "/campanha-anuncios
  réveillon", "campanha da baixa temporada", "vamos anunciar o Carnaval",
  "transforma o post vencedor em anúncio", "analisa os números da campanha".
  NÃO usar para o conteúdo orgânico do mês (ver conteudo-mensal), para alterar
  posts (ver alterar-conteudo) nem para o relatório do Instagram (ver
  relatorio-metricas).
---

# Campanha de Anúncios (Meta Ads) — Hotel Cabanas

Produz uma campanha paga em **4 fases**: **Fase 1** plano (OK do dono) → **Fase 2** textos (OK do dono) → **Fase 3** artes e kit de subida → **Fase 4** acompanhamento (com os números que o dono enviar).

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
| Kit de subida, Drive e repositório | você (a skill) | planilha de anúncios, passo a passo ou briefing da agência; commit |

Passe a cada funcionário **só o necessário** e peça que leia os próprios arquivos de contexto. Trate o dono por "você".

## O que o dono fornece (pergunte só o que faltar, numa mensagem só)
1. **Campanha**: qual data, pacote ou período (ex.: "Réveillon, pacote de 4 noites", "baixa temporada nov/dez").
2. **Oferta**: valor, o que inclui, condições. Sem valor → os textos usam "[confirmar valor vigente]" e nada vai ao ar sem o dono confirmar.
3. **Quem opera a conta do Meta Ads**: o dono, uma agência ou ainda ninguém (define o formato da entrega na Fase 3). Guarde a resposta em `social/anuncios/README.md` para não perguntar de novo.
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
   - **Calendário de veiculação** (início, reforço no pico, fim) e **quando olhar os números** (Fase 4).
   - Abrir com "as 3 decisões que preciso de você agora", se houver.
3. Apresente ao dono: resumo (objetivo, datas, estrutura), a **tabela completa dos criativos** e os cenários de verba. Nunca uma amostra.
4. **PAUSA OBRIGATÓRIA.** O dono escolhe o cenário de verba, corta ou troca criativos. Só avance com OK explícito.
5. Com o OK: salve `social/anuncios/<AAAA-MM>-<campanha>/plano.md` e publique `Plano <Campanha> v1` no Drive (ver `estrutura-campanha.md`).

## Fase 2 — Textos
1. Acione o **Marketing** com o plano aprovado. Para cada `AD NN`:
   - **Texto principal** com gancho na 1ª linha (até ~125 caracteres antes do "ver mais"), **título** (até ~40) e **descrição** (até ~30), **com a contagem**; **botão (CTA)** sugerido (ver `meta-ads.md`).
   - **Briefing de arte:** texto da arte (gancho imersivo de 3 a 8 palavras + 1 fato concreto; o CTA vai no botão e, se couber, numa linha curta), foto desejada.
   - Vídeo: **briefing para a produtora** (gancho nos 3 primeiros segundos, cenas, duração 15 a 30 s, legendas na tela, 9:16).
   - O próprio checklist: fatos, "(opcional)", "[confirmar valor vigente]", atributos por persona, nada de concorrente, nada de urgência falsa, "sujeito às condições do rio" em meses de chuva.
2. **Revisão rápida (sua):** compare com `hotel-operacional.md`; confira limites e contagens; confira que cada anúncio tem link com UTM.
3. **PAUSA 2:** mostre um resumo (AD NN + gancho + título) e publique `Textos <Campanha> v1` no Drive. Avance com o OK (o dono pode dizer "pode seguir direto para as artes").

## Fase 3 — Artes e kit de subida
1. Acione o **Designer** com o briefing de arte de cada anúncio de imagem ou carrossel. Cada anúncio sai em **dois tamanhos**: `feed45` (1080 × 1350) e `story` (1080 × 1920), respeitando as **zonas seguras** do 9:16. Layouts oficiais (com ou sem faixa), só fotos reais. Salva em `design/pecas/anuncios/<AAAA-MM>-<campanha>/AD-NN/`.
2. Envie os PNGs ao dono com `SendUserFile` (agrupados por persona).
3. Monte o **kit de subida** em `social/anuncios/<AAAA-MM>-<campanha>/kit-subida.md` e publique no Drive a planilha `Anúncios <Campanha> vN` (colunas em `estrutura-campanha.md`):
   - **Dono opera a conta:** passo a passo curto no Gerenciador de Anúncios (criar campanha, conjunto amplo, subir cada anúncio com os dois tamanhos, colar textos e URL com UTM, orçamento do cenário escolhido). Deixe claro: **quem publica e define a verba é você**.
   - **Agência opera:** briefing para a agência (objetivo, cenário aprovado, criativos, textos, UTMs, o que queremos receber de relatório e quando).
   - **Ninguém ainda:** recomende a opção mais simples e registre a pendência.
4. Publique `Briefing produtora <Campanha> v1` se houver vídeos. **Commit e push.**

## Fase 4 — Acompanhamento (quando o dono enviar os números)
O dono envia prints do Gerenciador de Anúncios (ou da agência) de 3 a 5 dias depois do início, e de novo no fim.
1. Acione o **Estrategista** com os números extraídos (**nunca invente números**; valor lido de gráfico vai com "~").
2. Ele responde com as regras de `meta-ads.md`: o que está funcionando (por criativo), o que pausar, o que reforçar, se a frequência está alta, se é hora de criativos novos, e o que **não** dá para concluir (ex.: reservas sem UTM/pergunta).
3. Registre em `social/anuncios/<AAAA-MM>-<campanha>/resultados.md` e, no fim, uma linha de **aprendizado** (qual ângulo e persona venceram) em `social/anuncios/README.md`, para a próxima campanha.
4. Mudanças na campanha são **recomendações**: quem aplica é o dono ou a agência.

## Atalho: post vencedor → anúncio
"Transforma o post vencedor em anúncio": pule a Fase 1 completa. Marketing adapta os textos ao formato de anúncio, Designer gera `feed45` + `story`, e o post entra na campanha em andamento ou numa campanha de "sempre ligada" [o dono decide].

## Regras transversais
- **Ninguém publica, impulsiona, mexe na conta de anúncios ou gasta verba.** A equipe entrega pronto; a decisão é do dono.
- Nunca pedir nem guardar **senhas ou acesso** à conta de anúncios.
- Voz, CTA e tabus: `perfil-cabanas.md`. Fatos: só do `contexto/`. O que faltar: "[a confirmar com o dono]". Preço: "[confirmar valor vigente]" até a confirmação.
- **Nunca citar concorrentes**, nem comparar preços em público. Notas do Google, Booking e TripAdvisor podem aparecer com fonte e mês.
- Nada de urgência falsa, promessa absoluta ou de saúde, imagem de IA.
- Português do Brasil.
