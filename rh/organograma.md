# Organograma: Equipe de IA do Hotel Cabanas

```
Dono(a) do Hotel  (aprova tudo que é público, financeiro ou de contratação)
   └── RH (Diretora de Pessoas)
         └── Especialista em Marketing e Anúncios (marketing-anuncios)
```

## Equipe ativa
| Cargo | Arquivo | Status | Desde | Objetivo | Nota na experiência |
|---|---|---|---|---|---|
| RH (Diretora de Pessoas) | `.claude/skills/rh/SKILL.md` | Ativa (aprovada no processo seletivo) | 2026-09-26 | Montar uma equipe enxuta e alinhada à estratégia | 4,6 (ver `rh/testes-do-rh.md`) |
| Especialista em Marketing e Anúncios | `.claude/agents/marketing-anuncios.md` | **Ativo, v2.3 (aprovado)** | 2026-09-26 | Reduzir o marketing genérico e tornar visível o valor dos 4 diferenciais | 4,0 → 4,33 → **4,5** (R3 final); ver `rh/avaliacoes/marketing-anuncios.md` |

## Matriz RACI (decisões da empresa)
| Decisão | R (executa) | A (aprova) | C (consultado) | I (informado) |
|---|---|---|---|---|
| Abrir vaga / contratar | RH | Dono | — | Equipe |
| Ajustar instruções / alterar escopo / desligar | RH | Dono | Funcionário afetado | Equipe |
| Preparar conteúdo externo (rascunho) | Funcionário responsável | Dono | RH (se envolver tom e valores) | — |
| Publicar conteúdo externo | Dono (funcionários de IA nunca publicam) | Dono | Funcionário responsável | — |
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
