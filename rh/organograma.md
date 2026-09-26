# Organograma: Equipe de IA do Hotel Cabanas

```
Dono(a) do Hotel  (aprova tudo que é público, financeiro ou de contratação)
   └── RH (Diretora de Pessoas)
         ├── Estrategista de Social Media e Tráfego (social-media-trafego)   ← planeja: o que, quando, para quem, com quanto
         ├── Especialista em Marketing e Anúncios (marketing-anuncios)   ← escreve
         └── Designer de Criativos (designer-criativos)   ← monta as artes
```

## Equipe ativa
| Cargo | Arquivo | Status | Desde | Objetivo | Nota na experiência |
|---|---|---|---|---|---|
| RH (Diretora de Pessoas) | `.claude/skills/rh/SKILL.md` | Ativa (aprovada no processo seletivo) | 2026-09-26 | Montar uma equipe enxuta e alinhada à estratégia | 4,6 (ver `rh/testes-do-rh.md`) |
| Especialista em Marketing e Anúncios | `.claude/agents/marketing-anuncios.md` | **Ativo, v2.4 (aprovado)** | 2026-09-26 | Reduzir o marketing genérico e tornar visível o valor dos 4 diferenciais | 4,0 → 4,33 → **4,5** (R3 final); ver `rh/avaliacoes/marketing-anuncios.md` |
| Estrategista de Social Media e Tráfego | `.claude/agents/social-media-trafego.md` | **Ativo, v1.3 (aprovado)** | 2026-09-26 | Transformar Instagram e tráfego em reservas diretas | **4,81** (teste simulado); ver `rh/avaliacoes/social-media-trafego.md` |
| Designer de Criativos | `.claude/agents/designer-criativos.md` | **Efetivado, v1.2 (aprovado pelo dono)** | 2026-09-26 | Transformar a direção de arte em peças prontas (PNG) com fotos reais | **4,53** (teste simulado); ver `rh/avaliacoes/designer-criativos.md` |

## Matriz RACI (decisões da empresa)
| Decisão | R (executa) | A (aprova) | C (consultado) | I (informado) |
|---|---|---|---|---|
| Abrir vaga / contratar | RH | Dono | — | Equipe |
| Ajustar instruções / alterar escopo / desligar | RH | Dono | Funcionário afetado | Equipe |
| Preparar conteúdo externo (rascunho) | Funcionário responsável | Dono | RH (se envolver tom e valores) | — |
| Publicar conteúdo externo | Dono (funcionários de IA nunca publicam) | Dono | Funcionário responsável | — |
| Arte final das peças (PNG) | designer-criativos | Dono | marketing-anuncios | — |
| Calendário, pauta e plano de tráfego (verba em cenários) | social-media-trafego | Dono | marketing-anuncios, designer-criativos | — |
| Executar campanhas e publicar | Dono | Dono | social-media-trafego | Equipe |
| Atualizar o contexto do hotel | Dono | Dono | RH | Equipe |

## Vagas sugeridas (aguardando o diagnóstico do RH e a aprovação do dono)
| Prioridade | Vaga | Justificativa estratégica |
|---|---|---|
| ~~1~~ | ~~Especialista em Marketing e Anúncios~~ | **Contratada em 2026-09-26** (`rh/vagas/marketing-anuncios.md`) |
| 2 | Comunicador(a) de Sustentabilidade | Lacuna crítica: percepção de sustentabilidade 1 vs. 1,7, embora seja o propósito central |
| 3 | Gestor(a) de Reputação e Avaliações | Ameaça: avaliações negativas; manter a nota 4 no Booking |
| 4 | Designer de Experiências Infantis | Lacuna: recreação infantil 0 vs. 0,5; ERIC: criar "Exploradores da Natureza" |
| 5 | Consultor(a) Gastronômico(a) | Lacuna: gastronomia 1 vs. 1,9; ERIC: criar uma experiência farm-to-table |

## Indicadores da equipe
| Funcionário | Objetivo | KPIs |
|---|---|---|
| marketing-anuncios | Reduzir o marketing genérico; comunicar os 4 diferenciais e o custo-benefício | Nota do dono ≥ 4; ≥ 80% sem retrabalho; zero fatos inventados *(meta proposta, a validar)*; reservas e engajamento a medir |
| social-media-trafego | Reservas diretas via Instagram e tráfego | Nota do dono ≥ 4; zero fatos ou resultados inventados *(meta proposta, a validar)*; reservas diretas, custo por reserva direta e envios por alcance a medir |
| designer-criativos | Peças prontas, bonitas e verdadeiras, sem etapa manual | Nota do dono ≥ 4; ≥ 80% sem retrabalho; zero fatos não confirmados e zero imagens de IA *(meta proposta, a validar)*; engajamento por pilar a medir |

## Histórico
| Data | Evento | Motivo |
|---|---|---|
| 2026-09-26 | Empresa criada. RH estruturado a partir do Guia Estratégico. | Início do projeto |
| 2026-09-26 | RH recebe base de conhecimento (SHRM, CIPD, Galbraith, RACI, OKR, boas práticas de agentes, hotelaria) e instruções revisadas. | Elevar a RH ao nível sênior antes da primeira contratação |
| 2026-09-26 | Processo seletivo da RH: rodada 1 com média 4,4 (falha de governança no C8); instruções corrigidas; rodada 2 com média 4,6. Aprovada, aguardando a palavra final do dono. | Validar a RH antes da primeira contratação real |
| 2026-09-26 | Contratado o Especialista em Marketing e Anúncios, com os requisitos do dono: turismo de natureza, hotelaria, conhecimento de Bonito e leitura do público. Criada a base `contexto/destino-bonito.md`. | Prioridade 1 aprovada pelo dono |
| 2026-09-26 | Experiência do Marketing: média 4,0 (T1 4,0; T2 4,2; T3 3,8), aprovado com ressalvas. Proposta de ajuste registrada (relações implícitas, sazonalidade, justificativa de persona), aguardando o dono. | Fatos não confirmados de proximidade, horário, exclusividade e autoria |
| 2026-09-26 | Contexto ampliado pelo dono: `hotel-operacional.md` (base operacional em PDF) e sazonalidade do destino corrigida (Acqua Viagens: maio = baixa temporada + seca). Proposta de ajuste do Marketing atualizada para a v2, aguardando o dono. | Novo documento do dono e fonte de pesquisa indicada |
| 2026-09-26 | Registrado o novo site informado pelo dono (hotelcabanasbonito.ai.studio). Conteúdo não lido: domínio bloqueado na rede do ambiente. | Atualização do contexto |
| 2026-09-26 | Dono resolveu 4 divergências: bangalô até 4 (5 só na Cabana Master e no Conjugado); restaurante fechado no domingo à noite (lanchonete durante o dia); "único hotel de Bonito cercado por dois rios" aprovado para anúncios. | Atualização do contexto |
| 2026-09-26 | Código de Cultura v4 incorporado (`contexto/cultura.md`). RH passa a usar os 6 filtros de decisão e os indicadores do hotel. Proposta de ajuste do Marketing ampliada (item 8: cultura, slogan, história, provas de sustentabilidade). | Novo documento do dono |
| 2026-09-26 | Dono aprovou os ajustes do Marketing (v2) e liberou "melhor custo-benefício de Bonito" para anúncios. v1 guardada em `rh/avaliacoes/versoes/`. Reteste em andamento. | Aprovação do dono |
| 2026-09-26 | Reteste do Marketing v2: média 4,33 (R1 4,2; R2 4,8; R3 4,0). Relações implícitas resolvidas; ficou pendente atribuir a elevação à Cabana Master. Ajuste v2.1 proposto. | Aprovação condicionada do avaliador |
| 2026-09-26 | Dono confirmou que a Cabana Master é elevada. Marketing v2.1 aplicado (atributos por acomodação); R3 refeito com nota 4,5. **Especialista em Marketing aprovado.** | Conclusão do período de experiência |
| 2026-09-26 | Dono confirmou que a Cabana Master aceita crianças menores de 5 anos. Contexto e Marketing atualizados (fato liberado; a Variação B do anúncio de família fica publicável). | Resposta do dono |
| 2026-09-26 | Dono definiu o site oficial: hotelcabanas.com.br. Contexto e Marketing atualizados. | Resposta do dono |
| 2026-09-26 | Dono confirmou: a Cabana Master tem balanço, não rede. Contexto e Marketing atualizados. | Resposta do dono |
| 2026-09-26 | Guia de estilo do Instagram criado a partir das referências do dono (@riodorastroecoresort, @bosqueveneza). Proposta: o Marketing passa a usá-lo (aguardando o dono). | Novo material do dono |
| 2026-09-26 | Guia de estilo ampliado com o lote 2 (@reservariodecontas, @pousadadoengenho): 3 pilares de conteúdo (contemplação, manifesto, editorial sensorial). | Novo material do dono |
| 2026-09-26 | Logo recebido; identidade visual registrada (marrom #847059, verde #90AB49, laranja #F58634) e aplicada ao guia de estilo. | Material do dono |
| 2026-09-26 | Marketing v2.2: guia de estilo e identidade visual incluídos nas instruções, com aprovação do dono. Teste da v2.2 não executado; validar na primeira entrega real. | Aprovação do dono |
| 2026-09-26 | Dono esclareceu: as referências servem para tipografia e logo discreto, não para fotografia; as fotos virão do banco de imagens real; o logo branco monocromático será o padrão nos posts. Guia atualizado (item 0). | Esclarecimento do dono |
| 2026-09-26 | Google Drive conectado; banco de imagens definido na pasta "Imagens do hotel cabanas" (ainda vazia). | Configuração do dono |
| 2026-09-26 | Guia de estilo revisado com a aprovação do dono: pilar 4 "Aventura de dia", mix 35/30/20/15, regras de cor por luz, logo branco em todas as peças, frases reescritas, kit de produção. | Ajustes 1, 3, 4, 5 e 7 da análise do Marketing |
| 2026-09-26 | Marketing v2.3: leitura do Google Drive (banco de imagens), somente leitura e restrita à pasta oficial. | Aprovação do dono |
| 2026-09-26 | Logo branco monocromático recebido (`contexto/marca/logo-hotel-cabanas-branco.png`, PNG transparente). | Material do dono |
| 2026-09-26 | Banco de imagens preenchido pelo dono; mapa das pastas criado em `contexto/banco-de-imagens.md` e referenciado nas instruções do Marketing. | Material do dono |
| 2026-09-26 | Dono descreveu o Bangalô Especial (45 m², até 4 pessoas, 2 camas king, para famílias). Contexto, mapa do banco de imagens e Marketing atualizados. | Resposta do dono |
| 2026-09-26 | **Contratado o Designer de Criativos** (`designer-criativos`), a pedido do dono ("um profissional muito bom nessa área"). Kit criado: `design/modelos/` (CSS da marca e modelo 4:5), `design/ferramentas/` (baixar foto do Drive e renderizar PNG) e fontes livres em `contexto/marca/fontes/`. Primeiro funcionário com Bash (restrito aos scripts do kit). | Transformar a direção de arte do Marketing em peça pronta; separado do Marketing para manter o foco de cada cargo |
| 2026-09-26 | Experiência do Designer: média 4,53 (T1 4,6; T2 5,0; T3 4,0), teste simulado. Proposta de ajuste v1.1 registrada (tratamento neutro do dono, recusa curta, tamanhos mínimos, faixa-rodapé no kit), aguardando o dono. | Avaliação independente |
| 2026-09-26 | Carrossel da Cabana Casal: primeiro trabalho em dupla Marketing (copy imersiva) + Designer (arte), em 3 rodadas de ajuste com o dono. | Entrega real para a decisão final |
| 2026-09-26 | Dono aprovou **duas opções oficiais de layout** (com faixa discreta e sem faixa), títulos menores (54–56 px) e **copy imersiva, não descritiva**. Registrado no guia de estilo (item 0b); modelos no kit (`design/modelos/modelo-faixa-discreta.html` e `modelo-sem-faixa.html`). Dono confirmou: toalhas em forma de bichos são arrumação padrão (`hotel-operacional.md`). | Decisão do dono |
| 2026-09-26 | **Designer de Criativos efetivado pelo dono.** Ajuste v1.1 aplicado (tratamento por "você", recusa curta, tamanhos mínimos, duas opções de layout, opcional na arte, copy imersiva); v1 guardada em `rh/avaliacoes/versoes/`. Reteste T1 e T3 aprovado. | Palavra final do dono |
| 2026-09-26 | **Contratado o Estrategista de Social Media e Tráfego** (`social-media-trafego`), a pedido do dono (tráfego pago e orgânico, hotelaria e turismo de natureza, atualizado; referência: Bárbara Bruna). Base técnica criada com fontes e data: `contexto/social-e-trafego.md` (revisão a cada 3 meses). WebSearch oferecido como opção, fora até o "sim" do dono. | Taxa de ocupação levemente abaixo da concorrência; ninguém planejava e media o caminho até a reserva direta |
| 2026-09-26 | Experiência do Estrategista: média 4,81 (T1 4,75; T2 5,0; T3 4,67), teste simulado. Proposta v1.1 (priorizar 3 decisões, checagem antes de publicar, estadia × venda) e proposta de ajuste do Marketing (calendário e segmentação passam ao Estrategista), aguardando o dono. | Avaliação independente; evitar sobreposição |
| 2026-09-26 | Dono informou a antecedência média de reserva: 45 a 50 dias. Registrado em `hotel-operacional.md` e `social-e-trafego.md`. | Resposta do dono |
| 2026-09-26 | Dono aprovou: Estrategista v1.1 (3 decisões no topo, checagem antes de publicar, estadia × venda com 45 a 50 dias); Marketing v2.4 (calendário, público e verba passam ao Estrategista); feed orgânico em **3:4** (Designer v1.2, kit e guia atualizados). Retestes aprovados. | Aprovação do dono |
| 2026-09-26 | Criada a skill `/aprender-youtube` e a ferramenta `ferramentas/youtube/transcrever.py`: transforma vídeos em cadernos de conhecimento (`contexto/aprendizados/`) para aplicar nos funcionários, sempre com o "sim" do dono. Aguarda liberar www.youtube.com na rede. | Pedido do dono |
| 2026-09-26 | Primeiro uso do `/aprender-youtube`: 11 vídeos da @babruna lidos (6 com conteúdo técnico). Caderno em `contexto/aprendizados/2026-09-26-babruna-trafego-e-instagram.md`. Ferramenta ajustada (player incorporado) para contornar o bloqueio de "robô" do YouTube em servidores. Aplicação nos funcionários aguardando o dono. | Pedido do dono |
| 2026-09-26 | Estrategista v1.2: caderno da Bárbara Bruna incorporado à base (leitura obrigatória + checklist), com aprovação do dono. Teste aprovado. | Pedido do dono |
| 2026-09-26 | `/aprender-youtube` com o canal @AdrianoGianiniAds (Google Ads): 9 vídeos de 2026 lidos. Caderno em `contexto/aprendizados/2026-09-26-adrianogianini-google-ads.md`. Aplicação nos funcionários aguardando o dono. | Pedido do dono |
| 2026-09-26 | Estrategista v1.3: caderno do Adriano Gianini (Google Ads) incorporado, com aprovação do dono. Teste aprovado. | Pedido do dono |
| 2026-09-26 | Criadas as skills de produção do Instagram, a partir dos modelos do curso do dono (conteudo-mensal, alterar-conteudo, briefing-design, instagram-metrics-report, trend-finder): `/conteudo-mensal`, `/alterar-conteudo`, `/relatorio-metricas`. Decisões do dono: Google Drive para aprovação (pasta "Conteúdo Instagram"), 12 posts/mês + stories semanais, Reels gravados pela produtora do dono (briefing), prints → PDF, skills orquestram Estrategista → Marketing → Designer. | Pedido do dono |
| 2026-09-26 | Auditoria da base de contexto pelo Marketing (`marketing/2026-09-auditoria-contexto.md`): 3 elementos completos, 9 parciais, 3 ausentes (provas sociais, objeções, hashtags); 14 inconsistências. Corrigidos: @ do Instagram no perfil/relatório e formato 3:4 no banco de imagens. | Pedido do dono |
