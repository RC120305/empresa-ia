# Plano de mídia paga (Meta Ads): Hotel Cabanas, out/2026 a set/2027

> **Autor:** Estrategista de Social Media e Tráfego · **Data:** 27/09/2026 · **Skill:** `campanha-anuncios`, Fase 1 · **Status:** PROPOSTA, aguardando o seu OK (nada foi subido nem ativado).
> **Decisões suas já aplicadas (27/09/2026):** teto de **R$ 1.500 por mês**; **duas camadas** (permanentes + pontuais); gargalo = **domingo a quinta e baixa temporada** (feriados lotam sozinhos: 10 a 12/10 lotado; Finados e 20 a 22/11 com vagas); pacotes de 4 noites só no Réveillon e no Carnaval (valor: [confirmar valor vigente]); chave da Meta ainda não configurada (a subida será manual, pelo kit, ou pela API depois); sem pixel nem UTM no motor.
> **Bases:** `meta-ads.md` e `social-e-trafego.md` (Andromeda, 10 a 15 conceitos, conjunto amplo: 26/09/2026, revisar em dez/2026 [confirmar se a regra continua valendo]); caderno Bárbara Bruna (26/09/2026: janela de 7 dias, concentrar verba, qualidade do contato, post vencedor); `hotel-operacional.md`; `hotel-cabanas.md` §9; `destino-bonito.md` §3; `perfil-cabanas.md`; `inventario-imagens.md` (27/09/2026); pauta e textos de outubro/2026 (aprovados).

---

## 0. As 3 decisões que preciso de você agora

1. **Qual distribuição da verba?** Recomendo o **Cenário A (equilibrado)**: outubro todo na campanha permanente (R$ 1.482); novembro dividido em prospecção R$ 600 + remarketing R$ 300 + Réveillon R$ 600. Os cenários B (conservador) e C (concentrado) estão na seção 3. Nos três casos, cada campanha sobe com **orçamento total e data de fim**, para a soma do mês nunca passar de R$ 1.500. Também sugiro que você defina o **limite de gastos da conta** em R$ 1.500 por mês, como trava.
2. **Réveillon: preciso de valor, datas das 4 noites e do que o pacote inclui até 20/10.** Sem isso, a campanha começa em 01/11 só com os 4 anúncios que não dependem de preço, e os 2 que dependem (RV4 e RV5) entram quando você confirmar. Confirme também se ainda há vagas para o Réveillon.
3. **A equipe de reservas pode anotar a origem de cada conversa?** Isso significa perguntar **"como nos conheceu?"** e anotar numa planilha simples o código do anúncio (vem na mensagem pronta), se a conversa é **qualificada** (data + nº de pessoas + idades das crianças), se a data é **de domingo a quinta** e se virou reserva. Sem isso, dá para saber quanto custa cada conversa, mas não se o anúncio vende.

---

## 1. Resumo em 3 linhas
- **Objetivo:** encher as noites de **domingo a quinta** e os meses de **baixa temporada** com **reservas diretas** (WhatsApp de reservas), para mover a **taxa de ocupação** (meta: 60% de média mensal, contra 50% em 2025) e a participação do canal direto.
- **Estadia × venda:** a permanente vende o meio de semana da baixa ~45 a 60 dias à frente, o ano todo. As pontuais vendem pacotes e janelas (Réveillon, Carnaval e as duas janelas de ouro), sempre com a veiculação terminando ~45 dias antes da estadia.
- **Indicadores:** custo por conversa, % de conversas qualificadas, reservas diretas por origem (a medir), ocupação de domingo a quinta contra 2025 (a medir).

---

## 2. Arquitetura anual

### 2.1 As campanhas
| Camada | Campanha (nome na conta) | Quando roda | Para quem / o quê | Objetivo e destino | Estrutura |
|---|---|---|---|---|---|
| **Permanente 1** | `perm-prospeccao-meio-de-semana` | O ano todo | Quem não conhece o hotel: estadias **de domingo a quinta** na baixa temporada, 6 personas | Engajamento → **conversas no WhatsApp de reservas** | 1 campanha, 1 conjunto amplo (Brasil; público Advantage+; posicionamentos automáticos), 12 criativos (seção 4) |
| **Permanente 2** | `perm-remarketing` | O ano todo | Quem já **interagiu com o Instagram ou o Facebook** (365 dias) ou **viu os Reels** (sem pixel, ainda não dá para usar quem visitou o motor) | Conversas no WhatsApp | 1 conjunto com públicos personalizados de engajamento, 4 criativos de **decisão**: prova social, o que está na diária, reserva direta, feriado com vaga |
| Pontual | `2026-11-reveillon` | **01/11 a 10/12/2026** | Pacote de 4 noites (datas: [a confirmar com o dono]; o Réveillon cai numa quinta) | Conversas no WhatsApp | 1 conjunto amplo, 6 criativos (seção 5) |
| Pontual | `2026-12-carnaval` | **11/12/2026 a 20/01/2027** | Pacote de 4 noites. Carnaval 2027: terça, 09/02 (datas do pacote: [a confirmar com o dono]) | Conversas no WhatsApp | Idem, 4 a 6 criativos |
| Pontual | `2027-03-janela-de-ouro-1` | **15/03 a 15/05/2027** | Estadias de **maio e junho** (seca + baixa), prioridade de domingo a quinta | Conversas no WhatsApp | Idem, com o ângulo "águas mais transparentes na seca" (fato do destino, nunca "garantida") |
| Pontual | `2027-06-janela-de-ouro-2` | **15/06 a 15/08/2027** | Estadias de **agosto e setembro** (seca + baixa) | Conversas no WhatsApp | Idem |
| Gatilho | Feriado com vaga | Só se, **50 dias antes**, você disser que há vaga sobrando | Ex.: 20 a 22/11/2026 | Vira **1 criativo no remarketing**, não uma campanha nova | — |

**Sem campanha paga:** Finados (31/10 a 02/11): faltam 34 dias e a janela de venda (12 a 17/09) já passou; fica no orgânico e nos stories, com vaga reconfirmada. Os demais feriados (Páscoa, Tiradentes, Corpus Christi, 7/9 e 12/10) também ficam de fora, porque lotam sozinhos, salvo o gatilho acima. Férias de julho e de janeiro são alta temporada: nelas o foco é converter quem já pesquisou (remarketing).

### 2.2 Divisão típica dos R$ 1.500
| Tipo de mês | Prospecção permanente | Remarketing permanente | Pontual | Total |
|---|---|---|---|---|
| **Sem pontual** | R$ 1.200 (80%) · R$ 40/dia | R$ 300 (20%) · R$ 10/dia | — | R$ 1.500 |
| **Com pontual o mês todo** | R$ 600 (40%) · R$ 20/dia | R$ 300 (20%) · R$ 10/dia | R$ 600 (40%) · R$ 20/dia | R$ 1.500 |
| **Pontual em parte do mês** | O pontual recebe R$ 20/dia nos dias em que roda; a prospecção fica com o resto | R$ 300 | Proporcional aos dias | ≤ R$ 1.500 |

**Regras:**
1. A verba do pontual sai da **prospecção**; o remarketing só cede (até R$ 7/dia) para manter a prospecção no piso.
2. **Piso:** nenhuma campanha de prospecção ou pontual abaixo de **R$ 20/dia** (abaixo disso a Meta mal sai da fase de aprendizado com vários criativos). Se o dinheiro não der para o piso, a campanha não liga: é melhor concentrar (caderno Bárbara Bruna, 26/09/2026).
3. **Nunca dois pontuais ao mesmo tempo** (Réveillon termina em 10/12, Carnaval começa em 11/12).
4. O remarketing fica entre R$ 7 e R$ 10/dia. Se a frequência passar de ~4 em 7 dias, ele cai para R$ 7/dia e a diferença volta para a prospecção.
5. **O teto não é meta:** o que sobrar no mês não passa para o mês seguinte sem o seu OK.
6. Orçamento **total por campanha, com data de fim**, para a soma nunca passar do teto. Mudanças de até ~20% por vez, sempre com o seu OK.

### 2.3 Calendário do ano (Cenário A)
| Mês | Pontual no ar | Prospecção | Remarketing | Pontual | Total |
|---|---|---|---|---|---|
| out/26 | — (começa em 06/10) | R$ 1.170 | R$ 312 | — | R$ 1.482 |
| nov/26 | Réveillon (o mês todo) | R$ 600 | R$ 300 | R$ 600 | R$ 1.500 |
| dez/26 | Réveillon 01 a 10/12 + Carnaval 11 a 31/12 | R$ 600 | R$ 280 | R$ 620 | R$ 1.500 |
| jan/27 | Carnaval 01 a 20/01 | R$ 800 | R$ 300 | R$ 400 | R$ 1.500 |
| fev/27 | — | R$ 1.200 | R$ 300 | — | R$ 1.500 |
| mar/27 | Janela 1 a partir de 15/03 | R$ 860 | R$ 300 | R$ 340 | R$ 1.500 |
| abr/27 | Janela 1 | R$ 600 | R$ 300 | R$ 600 | R$ 1.500 |
| mai/27 | Janela 1 até 15/05 | R$ 900 | R$ 300 | R$ 300 | R$ 1.500 |
| jun/27 | Janela 2 a partir de 15/06 | R$ 880 | R$ 300 | R$ 320 | R$ 1.500 |
| jul/27 | Janela 2 | R$ 600 | R$ 280 | R$ 620 | R$ 1.500 |
| ago/27 | Janela 2 até 15/08 | R$ 900 | R$ 300 | R$ 300 | R$ 1.500 |
| set/27 | — | R$ 1.200 | R$ 300 | — | R$ 1.500 |
*(Os valores de 2027 são o desenho; cada mês é reaprovado por você com os números do mês anterior.)*

---

## 3. Os próximos 60 dias em detalhe (outubro e novembro de 2026)

**Por que é assim:** o que roda em outubro vende estadias de **meados de novembro a meados de dezembro** (baixa, fora 20/11). O que roda em novembro vende a **1ª quinzena de dezembro** (curta) e, com mais antecedência, **fevereiro depois do Carnaval a abril**. De meados de dezembro a janeiro é alta temporada, então em novembro a prospecção cai e o Réveillon entra.
**Produção:** plano aprovado até 29/09 → textos (Marketing) 30/09 a 01/10 → artes (Designer) 02 a 04/10 → kit de subida ou API, com as campanhas **pausadas**, em 05/10 → **ativação em 06/10 com o seu OK**. Réveillon: textos e artes até 25/10, subida pausada em 30/10, ativação em 01/11 com o seu OK.

### Cenário A (recomendado: equilibrado)
| Campanha | Período | R$/dia | Dias | Total | O que vende |
|---|---|---|---|---|---|
| Prospecção meio de semana | 06 a 31/10 | 45 | 26 | **R$ 1.170** | Domingo a quinta, meados de nov. a meados de dez. |
| Remarketing | 06 a 31/10 | 12 | 26 | **R$ 312** | Idem + 20 a 22/11 (criativo R4, só com vaga) |
| **Total de outubro** | | | | **R$ 1.482** | |
| Prospecção meio de semana | 01 a 30/11 | 20 | 30 | **R$ 600** | 1ª quinzena de dez.; fev. a abr. |
| Remarketing | 01 a 30/11 | 10 | 30 | **R$ 300** | Idem (R4 sai em 13/11) |
| Réveillon | 01 a 30/11 (segue até 10/12 com a verba de dezembro) | 20 | 30 | **R$ 600** | Pacote de 4 noites |
| **Total de novembro** | | | | **R$ 1.500** | |

### Cenário B (conservador: começa baixo e só sobe com custo comprovado)
| Campanha | Outubro (06 a 31) | Novembro (01 a 30) |
|---|---|---|
| Prospecção | R$ 35/dia = R$ 910 | R$ 20/dia = R$ 600 |
| Remarketing | R$ 10/dia = R$ 260 | R$ 8/dia = R$ 240 |
| Réveillon | — | R$ 15/dia = R$ 450 (abaixo do piso: aceito só por ser um pacote de ticket alto) |
| **Total** | **R$ 1.170** (sobram R$ 330, que não são gastos) | **R$ 1.290** (sobram R$ 210) |

### Cenário C (concentrado: mais peso no Réveillon)
| Campanha | Outubro (06 a 31) | Novembro |
|---|---|---|
| Prospecção | R$ 50/dia = R$ 1.300 | só de 16 a 30/11, R$ 20/dia = R$ 300 (vende fev. a abr.) |
| Remarketing | R$ 7/dia = R$ 182 | R$ 10/dia = R$ 300 |
| Réveillon | — | R$ 30/dia de 01 a 30/11 = R$ 900 |
| **Total** | **R$ 1.482** | **R$ 1.500** |

**Leitura honesta:** com R$ 20 a R$ 45 por dia e 12 criativos, a Meta vai concentrar a entrega em 2 a 4 anúncios. Anúncio que não recebeu verba em 7 dias não foi "reprovado": ele volta no rodízio do mês seguinte. **Nenhum resultado está prometido:** custo por conversa, taxa de qualificação e taxa de fechamento são **[a medir]** na primeira semana.

**A conta antes de gastar (para fechar com números reais em 13/10):** conversas no mês = verba ÷ custo por conversa [a medir] → qualificadas = conversas × % qualificada [a medir] → reservas = qualificadas × taxa de fechamento da equipe [a medir]. Se a conta não fechar, o problema pode ser a **oferta** (não há condição específica para domingo a quinta, [a confirmar com o dono]) ou o **tempo de resposta** no WhatsApp, e não o anúncio.

**Configuração (todas as campanhas):** objetivo **Engajamento → Conversas, local da conversão: WhatsApp** [confirmar o nome atual do menu no Gerenciador]; conjunto amplo, Brasil (SP, PR, RJ e Sul entram como sinal pelos criativos e pela linguagem, não como trava; 35% dos turistas de Bonito vêm de SP, `destino-bonito.md` §5, [confirmar fonte atual]); posicionamentos Advantage+; cada anúncio com **4:5 e 9:16**; **mensagem pronta por anúncio** terminando com o código (ex.: "Olá! Vi o anúncio do Cabanas e quero datas de domingo a quinta. #P03"). Sem hashtags nos anúncios.

---

## 4. Criativos da permanente principal (`perm-prospeccao-meio-de-semana`)
Todos com CTA "Enviar mensagem" (WhatsApp de reservas (67) 99117-1648) e o argumento "valores com desconto para quem reserva direto". Nenhum preço. Nenhum mês no texto (a campanha roda o ano todo): o texto fala de **domingo a quinta** e de **baixa temporada**. Todas as fotos do banco são autorizadas (dono, 27/09/2026); o Designer abre cada foto antes de usar (o inventário foi feito pelos nomes).

| AD | Persona | Ângulo | Formato | Gancho (texto da arte, 1º quadro) | Foto do banco (arquivo, início do ID) ou vídeo |
|---|---|---|---|---|---|
| **P01** | Casais | Contemplação: cabana de madeira elevada a 3 m, varanda com rede (**reaproveita o carrossel Cabana Casal v3**, já feito em 4:5) | carrossel (5) | "Aqui, a *pressa* **fica** no chão" | `cabana_casal_01_externa (1_Cf1Q)` · `cabana_casal_03_externa (1XMr0j)` · `cabana_casal_03_varanda (1_0gOD)` · `cabana_casal_01_interna (10Q-Yd)` (pétalas = "decoração especial (opcional)") · `cabana_casal_01_eterna (1tq2O3)`. Texto: não acomoda menores de 5 anos |
| **P02** | Casais | Editorial sensorial: Cabana Master, 85 m², a única com banheira de hidromassagem para 2 | imagem | "Uma quarta a dois, *sem* **pressa**" | `Cabana Master / cabana_master_banheira (1yyTKu)`. Se aparecer decoração: "(opcional)" |
| **P03** | Casais (2ª: Aventureiros) | Custo-benefício: programação diária com monitor na diária (arco e flecha, tirolesa, caiaque, SUP). Responde a "está caro". "Melhor custo-benefício de Bonito" (frase aprovada) | vídeo (reaproveita o Reels 2 de out.) | "Terça-feira, **8h30**, na *mira*" | **Vídeo da produtora** (briefing de out., Reels 1) ou plano B: `imagem_arco_flecha_mulher_atirando (1nG8A1)` · `imagem_tirelosa_formosinho_casal (1oNPVm)` · `imagem_caiaque_rio_formoso (1VLR1u)` · `imagem_standup_formosinho_casal (1iYdKL)` · `imagem_deck_balneario_formosinho (17YGi-)`. "Os horários podem variar conforme a temporada" |
| **P04** | 55+ | Tranquilidade: "o hotel fica mais tranquilo de domingo a quinta"; piscina climatizada, hidromassagem aquecida e sauna das 7h às 22h; Bangalô que não divide paredes | carrossel (5) | "Domingo a quinta, no *ritmo* **seu**" | `Infraestrutura / piscina (13dzTW)` · `espaco_relaxamento_spa_hidro_externa (1iL6CV)` · `area_espaco_relaxamento_sauna (1tv2Uh)` · `imagem_casal_caminhando_trilha (1NnMQQ)` · `Bangalô / bangalo_quadruplo_varanda_com_rede (1c3Ru5)`. Sem falar de acessibilidade nem de almoço |
| **P05** | Todas (Casais e 55+ à frente) | Diferencial aprovado: "o único hotel de Bonito cercado por dois rios", Formoso e Formosinho, 40 hectares | imagem | "Entre **dois** *rios*" | `imagem_drone_caiaque_rio_formoso (10EvC_)`. A foto é da seca: o texto não fala da cor da água |
| **P06** | Eco-consciente | Manifesto com prova: coleta seletiva, compostagem, nenhum copo descartável, biólogo na gestão; fauna (macacos, araras, cotias, quatis, tatus) | imagem | "Aqui, os **primeiros** *moradores* são eles" | `Infraestrutura / animal_cutia (1AdK8O)` (reserva: `animal_macaco_prego (1llYUU)`). Sem números de sustentabilidade; sem prometer avistamento |
| **P07** | Famílias | "Atividades de aventura sem sair do hotel", com guias treinados; boia cross e arvorismo (opcionais, a partir de 6 anos e 1,15 m); playground | carrossel (5) | "A *aventura* mora **aqui** dentro" | `Boia Cross / boia_close_crianca (18ZtbxgB)` · `Arvorismo / arvorismo_estacao_crianca (1cNHeX)` · `Infraestrutura / play_ground_criancas (15dgI8)` · `piscina (1hkm1s)` · `Bangalô Especial / bangalo_especial_area_com _rede (1mKjyI)`. **Não há recreação infantil**: nada que sugira monitor para as crianças fora das atividades |
| **P08** | Jovens aventureiros | Arvorismo (opcional): 18 obstáculos + 2 tirolesas, a última aquática, no Rio Formoso; equipamento conferido | imagem | "**18** obstáculos e o *Formoso* lá embaixo" | `Arvorismo / arvorismo_tirolesa_vista_externa_close_pessoa (1L8G1W)`. "Segurança em primeiro lugar", nunca "radical sem limites" |
| **P09** | Jovens aventureiros (2ª: Famílias com filhos acima de 6 anos) | Boia cross (opcional): 1.200 m de corredeiras e cachoeiras do Rio Formoso, com guias treinados | vídeo (ou imagem) | "**1.200** metros de *corredeira*" | **Vídeo da produtora** (a encomendar); plano B imagem: `Boia Cross / boia_adulto_cachoeira (1wDyWd)` ou `boia_drone (1yZX3k)` |
| **P10** | 55+ e Casais | Objeção "fica longe": 6 km do centro, todo o acesso em asfalto, 8 km do aeroporto; a natureza fica do lado de dentro | imagem | "Longe da **pressa**, a *6 km* do centro" | `Infraestrutura / recepcao_externa (1srwNX)` (reserva: `recepcao_lago (15DZs9)`) |
| **P11** | Casais (2ª: 55+) | Editorial sensorial: "uma quarta-feira em cinco sentidos": café incluso (6h30 às 9h30), hidromassagem aquecida, deck no rio, sauna, redário (reaproveita o post 6 de out.) | carrossel (5) | "Uma quarta em **cinco** *sentidos*" | `cafe_manha_detalhe_cesta_frutas (1VVhs7)` · `espaco_relaxamento_spa_hidro_externa (132BgB)` · `imagem_deck_rio_formosinho (1LzEkM)` · `area_espaco_relaxamento_sauna (1O9epH)` · `imagem_redario_mulher_sorrindo (1DFdy_)` |
| **P12** | Casais e 55+ | Contemplação em movimento: "uma quarta-feira qualquer entre dois rios", do café à piscina (reaproveita o Reels 11 de out.) | vídeo | "Uma quarta-feira *qualquer*" (1º quadro: café sendo servido) | **Vídeo da produtora** (briefing de out., Reels 4) ou plano B: `casal_cafe_manha (1JrEIf)` · `Cabanas triplo / cabana_triplo_varanda_com_rede (1Tiqig)` · `imagem_pergolado_balneario_formosinho (1zg_cs)` · `imagem_redario_casal_sorrindo (1EkScr)` · `piscina (1VxqQZ)` |

**Distribuição:** Casais à frente em 6 (P01, P02, P03, P05, P11, P12) · 55+ em 2 (P04, P10; 2ª persona em P05, P11, P12) · Aventureiros em 2 (P08, P09) · Famílias em 1 (P07) · Eco em 1 (P06). Formatos: 6 imagens, 4 carrosséis, 2 vídeos (+ P09 em vídeo quando a produtora entregar). Ciclista e Ornitólogo ficam de fora (não há foto de ciclovia nem de aves no banco).
**Post vencedor:** em 13/10 e 20/10, o post orgânico de outubro com mais **envios por alcance** entra como **P13**, no lugar do anúncio com pior custo por conversa (com o seu OK).

### Remarketing (`perm-remarketing`): 4 criativos de decisão
| AD | Persona | Ângulo | Formato | Gancho | Foto |
|---|---|---|---|---|---|
| R1 | Todas | Prova social: Google 4,7 (1.015 avaliações) · Booking 9,3 (318) · TripAdvisor 4,5 (349), **set/2026** | imagem | "**4,7** no Google, com *mais de mil* avaliações" | `imagem_redario_casal_sorrindo (1EkScr)` |
| R2 | Todas | O que está na diária + desconto para quem reserva direto | carrossel (5) | "O que já *vem* na **sua** diária" | `casal_cafe_manha (12qEQI)` · `piscina (1JLKLY)` · `imagem_arco_flecha_casal (1sO8Ca)` · `imagem_caiaque_rio_formoso_mulher (1EGIkZ)` · `area_espaco_relaxamento_academia (1iqJ9n)` |
| R3 | Casais e 55+ | Objeção "não acho vaga": troque o fim de semana por domingo a quinta ("o hotel fica mais tranquilo", sem prometer vaga) | imagem | "E se a **viagem** fosse numa *terça*?" | `imagem_balneario_formosinho_deck_rede (1zW97n)` |
| R4 | Casais e Famílias | 20 a 22/11 esticado até segunda (reaproveita o post 3 de out.). **Só de 06/10 a 13/11 e só enquanto você confirmar vaga**; sem "últimas vagas" | carrossel (5) | "**Feriado** entre *dois rios*" | `piscina (1WkaPv)` · `imagem_arco_flecha_casal (1sO8Ca)` · `arvorismo_tirolesa_vista_externa (12qaM9)` (opcional) · `detalhe_lanche (1B3R4B)` · `casal_cafe_manha (14kua8)` |

---

## 5. Pontual mais próximo: Réveillon (`2026-11-reveillon`, 01/11 a 10/12/2026)
**Estadia:** pacote de 4 noites em torno de 31/12/2026 (quinta) (datas: [a confirmar com o dono]). **Venda:** 01/11 (~58 dias antes) a 10/12; o pico é de 01 a 20/11 (45 a 50 dias antes). **Régua:** dezembro é chuva + alta: **nenhuma promessa de água cristalina**; o rio pode aparecer, sem falar da cor. O restaurante funciona normalmente no Réveillon, mas **não há ceia nem programação especial confirmada**: não prometer. Sem "últimas vagas".

| AD | Persona | Ângulo | Formato | Gancho | Foto do banco ou vídeo | Depende do valor? |
|---|---|---|---|---|---|---|
| RV1 | Casais | Virar o ano na natureza, no único hotel de Bonito cercado por dois rios | imagem | "O ano **novo** começa *entre dois rios*" | `imagem_area_balneario_formosinho (1Ja3KH)` | Não |
| RV2 | Famílias | 4 noites, um dia por tela: check-in e piscina climatizada → arco e flecha e trilha com tirolesa → caiaque e SUP → 31/12 com o restaurante aberto → café e check-out | carrossel (5) | "**4** noites, *um rio* por dia" | `piscina (1hkm1s)` · `imagem_arco_flecha_guia_mulher (1W8swZ)` · `imagem_tirelosa_formosinho_casal (1oNPVm)` · `imagem_caiaque_rio_formoso_mulher (11kdRW)` · `casal_cafe_manha (12B8bP)` | Datas sim; valor não |
| RV3 | Casais | Cabana Master a dois: banheira de hidromassagem, varanda com balanço; decoração especial (opcional) | imagem | "O **primeiro** banho do ano, *a dois*" | `Cabana Master / cabana_master_banheira (1Kpp5M)` (a outra foto da banheira, diferente da P02) | Não |
| RV4 | Todas | **Oferta:** pacote de 4 noites a partir de R$ [confirmar valor vigente] + o que inclui [a confirmar com o dono] + desconto para quem reserva direto | imagem | "Réveillon em **4** *noites*" | `imagem_area_caiaque_rio_formoso (16g-GaR)` | **Sim: só entra com o valor confirmado** |
| RV5 | Famílias | Família de até 5 na Cabana Master ou no Apartamento Conjugado (as únicas para 5); Bangalô Especial para até 4 | imagem | "A **família** toda, *no mesmo* lugar" | `Bangalô Especial / bangalo_especial_area_com_rede (1xXd9J)` (reserva: `Conjugado / conjugado_externa (1jPdT5)`) | **Sim: valor e vaga por tipo de acomodação** [a confirmar com o dono] |
| RV6 | Aventureiros (2ª: Famílias com filhos acima de 6 anos) | Começar o ano descendo o rio: boia cross (opcional, guias treinados) | vídeo (ou imagem) | "Comece **2027** na *correnteza*" | **Vídeo da produtora** ou plano B `Boia Cross / boia_grupo_boia_rio (1RW2SE)` | Não |

---

## 6. Medição e rotina

### O que precisa estar configurado (antes de 06/10)
| Item | Status |
|---|---|
| Conta de anúncios, Página, Instagram e **WhatsApp Business** conectados | [a confirmar com o dono] |
| **Limite de gastos da conta** (sugestão: R$ 1.500/mês), definido por você | [a confirmar com o dono] |
| **Públicos personalizados** (engajou com o Instagram e o Facebook em 365 dias; viu 50% dos vídeos) | criar agora, de graça; o tamanho é [a medir] |
| **Mensagem pronta com código** por anúncio (#P01 a #P13, #R1 a #R4, #RV1 a #RV6) | a Marketing escreve na Fase 2 |
| **Planilha da recepção:** data do contato · código · qualificada (data + nº de pessoas + idades das crianças) · domingo a quinta? · virou reserva? · valor | decisão 3 |
| **Pixel / API de conversões no motor Silbeck** + UTM (`?utm_source=meta&utm_medium=paid-social&utm_campaign=<campanha>&utm_content=<ad>`) | [a confirmar com o dono se o Silbeck aceita]. Sem isso, não há remarketing de quem visitou o motor nem campanha para o site |
| **Tempo de resposta** no WhatsApp durante as campanhas | meta de tempo [a definir pelo dono] |

### Rotina
| Quando | O que olhar | O que fazer |
|---|---|---|
| **3 a 5 dias** após cada início (09 a 11/10; 04 a 06/11) | Se está gastando; conversas chegando com o código; anúncio reprovado; link ou WhatsApp quebrado | **Não mexer** (fase de aprendizado), salvo erro. Erro = pausar o anúncio e avisar você no mesmo dia |
| **Semanal** (segunda, em blocos de 7 dias: 13/10, 20/10, 27/10…) | Custo por conversa por anúncio · % de conversas qualificadas por anúncio · CTR do link · frequência (remarketing) · retenção de 3 s nos vídeos · envios por alcance do orgânico | **Pausar:** anúncio com custo por conversa ≥ 2× a média da campanha, ou com gasto ≥ 2× o custo médio e nenhuma conversa, ou com conversas que nunca qualificam. **Reforçar:** o vencedor ganha uma variação do mesmo ângulo (não um público mais estreito). Frequência > ~4 no remarketing = criativos novos ou R$ 7/dia. Verba: só com o seu OK e ~20% por vez |
| **Mensal** (1º dia útil) | Reservas por código e por "como nos conheceu?" · % de reservas de domingo a quinta · custo por reserva direta · ocupação de domingo a quinta contra 2025 [a medir] | Redistribuir o mês seguinte dentro da regra da seção 2.2; registrar o aprendizado em `social/anuncios/README.md` |

### O que NÃO dá para concluir sem UTM, código e a pergunta "como nos conheceu?"
- Que o anúncio **trouxe a reserva** (a pessoa pode ter visto o anúncio e reservado por agência ou OTA).
- Se o anúncio vende **domingo a quinta** ou só fim de semana e feriado.
- **Custo por reserva** e retorno sobre a verba: só custo por conversa, que é o passo do meio.
- Quem visitou o motor e não reservou (sem pixel, não há como medir nem fazer remarketing).
- Qual persona compra: a Meta mostra idade e região de quem **clicou**, não de quem **reservou**.

---

## 7. Pedidos à equipe (depois do seu OK)
- **Marketing (`marketing-anuncios`):** textos de 12 anúncios da prospecção + 4 do remarketing + 6 do Réveillon (texto principal até ~125, título até ~40, descrição até ~30, com a contagem) + mensagem pronta com código + roteiros de vídeo para P03, P09, P12 e RV6 (gancho em 0 a 3 s, 15 a 30 s, 9:16). Obrigatório: "(opcional)", nenhum preço sem "[confirmar valor vigente]", notas com "set/2026", nada de concorrente, nada de urgência, nada de água cristalina em meses de chuva.
- **Designer (`designer-criativos`):** cada anúncio de imagem ou carrossel em `feed45` (1080 × 1350) e `story` (1080 × 1920, zonas seguras). Prospecção: 6 imagens (P02, P05, P06, P08, P09 plano B, P10) + 4 carrosséis (P01 adaptado, P04, P07, P11). Remarketing: 2 imagens (R1, R3) + 2 carrosséis (R2, R4). Réveillon: 4 imagens (RV1, RV3, RV4, RV5) + 1 carrossel (RV2). Planos B em vídeo de fotos: P03, P12, RV6. Só fotos reais, gancho legível no 1º quadro.
- **Você → produtora:** vídeos da boia cross (P09, RV6) e os Reels 1 e 4 do briefing de outubro (P03, P12).

## 8. A confirmar com o dono (para depois)
1. Vagas em 20 a 22/11 a cada semana (o R4 sai quando lotar ou em 13/11).
2. Ocupação atual de domingo a quinta em novembro, dezembro e janeiro, para medir contra 2025 e saber se o meio de semana de janeiro precisa de ajuda.
3. Há condição ou tarifa diferente para domingo a quinta? (Sem isso, nenhum anúncio fala de preço.)
4. Carnaval 2027: datas, valor e o que inclui o pacote, até 01/12.
5. O Silbeck aceita pixel da Meta e guarda UTM?
6. O tarifário de alta e baixa do hotel, para ajustar as janelas de 2027.
7. Você autoriza um teste pequeno para o público da região (boia cross e arvorismo para não hóspedes)? Hoje fica fora do teto; só com a sua decisão.

## 9. Autorrevisão
- [x] Objetivo ligado a indicadores do hotel (ocupação de domingo a quinta, reservas diretas)
- [x] Duas réguas: out. a mar. chuva sem promessa de água; janelas de ouro na seca + baixa
- [x] Personas nos seus canais (Instagram e Facebook); segmentação pelo criativo (Andromeda, 26/09/2026)
- [x] Destino: WhatsApp de reservas com mensagem codificada
- [x] Verba em cenários dentro do teto de R$ 1.500; nenhum resultado prometido; a conta está montada com [a medir]
- [x] Post vencedor previsto (P13); qualidade do contato definida; verba concentrada na janela de venda
- [x] Fotos do inventário com nome e ID; opcionais marcados; notas com fonte e set/2026; sem concorrentes, preço ou urgência
- [x] Lista de peças para o Marketing e o Designer
