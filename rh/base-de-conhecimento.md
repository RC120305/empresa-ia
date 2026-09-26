# Base de Conhecimento da RH: Hotel Cabanas

> A "formação" da Diretora de RH. Reúne métodos consagrados de RH e de desenho organizacional, boas práticas de construção de agentes de IA e a estrutura típica de um hotel de lazer, tudo adaptado a uma equipe de **funcionários de IA** do Hotel Cabanas.
> Fontes na seção 7.

---

## 1. Perfil de competências da RH (inspirado no SHRM e no CIPD)

O SHRM define 1 competência técnica (Expertise em RH) + 8 comportamentais. O CIPD organiza a profissão em conhecimento essencial, comportamentos essenciais e especialidades (entre elas, **Desenho e Desenvolvimento Organizacional**, a mais importante para nós).

| Competência | O que significa aqui | Como aparece no trabalho dela |
|---|---|---|
| **Visão de negócio** | Entender a estratégia do hotel e como cada cargo gera valor | Toda vaga cita a curva de valor, o ERIC, o SWOT ou as personas |
| **Avaliação crítica (evidências)** | Decidir com base em dados, não em "achismo" | Prioriza pelo impacto e pede dados quando faltam |
| **Consultoria** | Diagnosticar antes de receitar | Faz perguntas ao dono antes de propor soluções |
| **Ética** | Transparência, sem inventar, respeito aos limites | Nunca inventa informações sobre o hotel; declara incertezas |
| **Comunicação** | Clareza, objetividade, adaptação ao público | Resumos curtos, tabelas e decisões explícitas para o dono |
| **Gestão de relacionamentos** | Fazer a equipe colaborar | Define como os funcionários passam trabalho uns aos outros |
| **Liderança e navegação** | Conduzir mudanças com o apoio do dono | Propõe mudanças graduais, com aprovação |
| **Desenho organizacional** (especialidade) | Estrutura, papéis, métricas e processos | Organograma, RACI, KPIs e fluxos de trabalho |

---

## 2. Métodos de trabalho

### 2.1 Análise de cargo (job analysis)
Antes de criar qualquer vaga, responder:
1. **Qual resultado de negócio** ela deve mover? (ex.: subir a percepção de sustentabilidade de 1 para 3)
2. **Quais tarefas recorrentes** realiza? (verbo + objeto + frequência)
3. **Quais conhecimentos** exige? (personas, tom de voz, canais, dados do hotel)
4. **Quais habilidades** exige? (copywriting, análise, pesquisa, planejamento)
5. **Com quem interage** e o que recebe/entrega?
6. **O que NÃO faz?** (fronteiras claras evitam sobreposição)

> Referências de cargos reais: O*NET (EUA) e CBO (Brasil) descrevem tarefas, habilidades e conhecimentos de milhares de ocupações. Use-as como ponto de partida e adapte ao hotel.

### 2.2 Mapa de competências
Para cada cargo, separar:
- **Conhecimentos (saber):** o que o agente precisa ter à mão, como arquivos de contexto e dados.
- **Habilidades (saber fazer):** o que as instruções precisam ensinar, como um passo a passo e exemplos.
- **Atitudes (saber ser):** tom, postura e limites éticos.

### 2.3 Matriz RACI (quem decide o quê)
Para cada entrega importante, definir:
- **R (Responsável):** quem executa. Em geral, um funcionário de IA.
- **A (Aprovador):** quem decide. **Sempre o dono** para tudo que vai a público ou envolve dinheiro.
- **C (Consultado):** quem opina antes.
- **I (Informado):** quem é avisado depois.

Registrar a matriz em `rh/organograma.md`.

### 2.4 Metas e indicadores (OKR/KPI)
Todo cargo nasce com:
- **1 objetivo** ligado à estratégia (ex.: "Tornar a sustentabilidade do Cabanas visível").
- **2 ou 3 indicadores**, divididos em dois tipos:
  - **De qualidade da entrega**, medidos pelo dono: nota de 1 a 5 e percentual de entregas aprovadas sem retrabalho.
  - **De negócio**, quando houver dados: nota no Booking, taxa de ocupação, engajamento de anúncios. Se os dados não estiverem disponíveis, registrar "a medir" e pedir ao dono.

### 2.5 Desenho organizacional: Modelo Estrela de Galbraith
Ao montar ou revisar a equipe, checar 5 pontas alinhadas:
1. **Estratégia:** o que o hotel quer (contexto).
2. **Estrutura:** quais cargos existem e a quem respondem.
3. **Processos:** como o trabalho flui entre eles (seção 3).
4. **Recompensas/métricas:** como se mede o sucesso (2.4).
5. **Pessoas:** capacidades de cada agente (instruções, ferramentas, conhecimento).

### 2.6 Ciclo de vida do funcionário
Planejamento → Desenho da vaga → Aprovação → Contratação → Onboarding (leitura do contexto) → Experiência (testes) → Acompanhamento (feedback do dono) → Desenvolvimento (ajustes) → Desligamento (quando não gera valor).

---

## 3. Boas práticas de agentes de IA (Anthropic e documentação do Claude Code)

### 3.1 Princípios
- **Simplicidade primeiro:** só crie um agente se uma instrução simples não resolver. Menos agentes, bem definidos, rendem mais que muitos genéricos.
- **Responsabilidade única:** cada funcionário tem um objetivo, entradas, saídas e uma regra de passagem claros.
- **Transparência:** o agente mostra seu raciocínio e plano, e não entrega "caixa-preta".
- **Supervisão humana:** o dono aprova tudo o que for público, financeiro ou irreversível.

### 3.2 Padrões de colaboração (quando usar cada um)
| Padrão | Quando usar no hotel |
|---|---|
| **Encadeamento** (A → B) | Pesquisa de persona → redação do anúncio |
| **Roteamento** | Uma demanda chega e é encaminhada ao especialista certo |
| **Orquestrador-trabalhadores** | Uma campanha completa dividida entre vários especialistas |
| **Avaliador-otimizador** | Um agente produz e outro revisa com critérios (ex.: revisor de marca) |

### 3.3 Anatomia de um bom arquivo de funcionário (`.claude/agents/<slug>.md`)
Campos do cabeçalho mais relevantes:
- `name`: identificador único, sem acentos ou espaços (ex.: `marketing-anuncios`).
- `description`: **quando** acionar, orientada à ação, com tarefas concretas. É o que faz o Claude delegar corretamente.
- `tools`: lista mínima permitida. **Se omitida, o agente recebe todas as ferramentas**, portanto sempre declare.
- `model` (opcional): `inherit` por padrão; `haiku` para tarefas simples e repetitivas; `opus` para tarefas estratégicas.
- `memory: project` (opcional): memória persistente em `.claude/agent-memory/<name>/`, útil para o funcionário aprender com feedbacks ao longo do tempo.

Corpo: missão, leitura obrigatória do contexto, responsabilidades, passo a passo, padrões de qualidade com **exemplos de bom e ruim**, limites, formato de entrega e regra de passagem.

### 3.4 Ferramentas por perfil (menor privilégio)
| Perfil | Ferramentas típicas |
|---|---|
| Pesquisa/análise | Read, Grep, Glob, WebSearch, WebFetch |
| Produção de conteúdo | Read, Grep, Glob, Write |
| Revisão | Read, Grep, Glob (somente leitura) |
| Nenhum funcionário | Bash ou envio de mensagens externas **sem aprovação explícita do dono** |

### 3.5 Avaliação (evals)
- Testes **realistas**, com critérios de sucesso escritos **antes** de rodar.
- **Quem cria não corrige sozinho:** a nota final vem de uma avaliação separada (outro agente avaliador com rubrica) e é validada pelo dono.
- Incluir **casos difíceis e pegadinhas** (informação faltando, pedido fora do escopo, conflito com os valores).

---

## 4. Estrutura típica de um hotel de lazer (referência de cargos)

Departamentos comuns em resorts e hotéis de lazer: **Gerência geral, Recepção/Reservas, Governança, Alimentos e Bebidas (A&B), Lazer e Recreação, Eventos, Comercial/Marketing, Revenue Management, Manutenção, Financeiro e RH.**

**Onde a IA ajuda mais** (trabalho de conhecimento, não operação física):
| Área do hotel | Possíveis funções de IA | Ligação com o Guia Estratégico |
|---|---|---|
| Comercial/Marketing | Anúncios por persona, calendário de conteúdo, SEO | 6 personas com canais; ERIC: reduzir o marketing genérico |
| Reputação | Análise e resposta a avaliações (Booking, Google, TripAdvisor) | Ameaça: avaliações negativas; manter a nota 4 |
| Reservas/Atendimento | Rascunho de respostas a hóspedes, FAQ, pré-venda | Hospitalidade; eliminar burocracias |
| Revenue Management | Análise de ocupação e preço, sazonalidade | Ocupação 2,38 vs. 2,45; percepção de preço |
| Sustentabilidade | Comunicação das ações, roteiro de certificações | Lacuna crítica 1 vs. 1,7 |
| Lazer/Recreação | Desenho de programas ("Exploradores da Natureza") | Recreação infantil 0 vs. 0,5 |
| A&B | Conceito gastronômico, cardápios farm-to-table | Gastronomia 1 vs. 1,9 |
| Eventos | Propostas para grupos e corporativo | Oportunidade: eventos corporativos |

> A IA **não substitui** a equipe humana na operação (recepção física, cozinha, guias). Ela apoia com planejamento, conteúdo, análise e rascunhos para aprovação.

---

## 5. Protocolo de colaboração entre funcionários
1. **Entrada:** toda tarefa chega com objetivo, público/persona, prazo e formato.
2. **Consulta:** se precisar de outro especialista, o funcionário indica **o que precisa e de quem** na entrega. O Claude principal (ou o dono) faz a ponte.
3. **Revisão:** entregas públicas passam por verificação de tom de voz e fatos contra `contexto/hotel-cabanas.md`.
4. **Aprovação:** o dono aprova antes de qualquer publicação.
5. **Registro:** feedbacks relevantes do dono viram ajustes nas instruções, registrados no histórico.

---

## 6. Checklist de qualidade de uma contratação
- [ ] A vaga tem justificativa estratégica citada do contexto
- [ ] Não há sobreposição com o organograma atual
- [ ] Análise de cargo completa (as 6 perguntas)
- [ ] Objetivo e 2 ou 3 indicadores definidos
- [ ] RACI das principais entregas definido
- [ ] Ferramentas mínimas declaradas (campo `tools` presente)
- [ ] Instruções específicas do Cabanas, com exemplos de bom e ruim
- [ ] Limites e regra de passagem claros
- [ ] 3 testes com critérios escritos antes de rodar
- [ ] Aprovação do dono registrada

---

## 7. Fontes
- SHRM, Body of Applied Skills and Knowledge (BASK): https://www.shrm.org/credentials/certification/exam-preparation/bask
- CIPD, The Profession Map: https://www.cipd.org/en/the-people-profession/the-profession-map/
- CIPD, Organisation development and design: https://www.cipd.org/en/the-people-profession/the-profession-map/explore-the-profession-map/specialist-knowledge/organisational-development-design/
- Anthropic, Building Effective Agents: https://www.anthropic.com/engineering/building-effective-agents
- Claude Code Docs, Subagents: https://code.claude.com/docs/en/sub-agents
- O*NET (descrições de ocupações): https://www.onetonline.org/
- CBO, Classificação Brasileira de Ocupações: https://cbo.mte.gov.br/
- Hospedin, Guia de cargos e funções na hotelaria: https://blog.hospedin.com/wp-content/uploads/2020/02/guia-completo-da-hotelaria-cargos-e-funcoes-final.pdf
- HQBeds, Cargos e funções na hotelaria: https://www.hqbeds.com.br/blog/cargos-e-funcoes-na-hotelaria-conheca-os-principais-departamentos
