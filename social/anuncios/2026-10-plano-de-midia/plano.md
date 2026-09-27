# Plano de mídia paga (Meta Ads): Hotel Cabanas, out/2026 a set/2027 (v2)

> **Autor:** Estrategista de Social Media e Tráfego · **Data:** 27/09/2026 · **Skill:** `campanha-anuncios`, Fase 1 · **Status:** PROPOSTA v2, aguardando o seu OK (nada foi subido nem ativado).
> **Decisões suas já aplicadas (27/09/2026):** teto de **R$ 1.500 por mês**; **duas camadas** (permanentes + pontuais); gargalo = **domingo a quinta e baixa temporada**; chave da Meta ainda não configurada (a subida será manual, pelo kit, ou pela API depois); sem pixel nem UTM no motor.
> **Nova decisão sua (27/09/2026):** *"Não precisa de campanha para Réveillon e nenhum feriado. Em novembro podemos pensar numa campanha para as férias de janeiro e uma campanha para a primeira quinzena de dezembro, que normalmente é mais parada. E nas campanhas duradouras [mantém]."* Aplicado nesta v2: **saíram** as campanhas de Réveillon e Carnaval, o gatilho de feriado com vaga e o R4 do feriado de 20/11. **Entraram** duas pontuais: 1ª quinzena de dezembro e férias de janeiro. As permanentes (prospecção e remarketing) continuam.
> **Bases:** `meta-ads.md` e `social-e-trafego.md` (Andromeda, 10 a 15 conceitos, conjunto amplo: 26/09/2026, revisar em dez/2026 [confirmar se a regra continua valendo]); caderno Bárbara Bruna (26/09/2026: janela de 7 dias, concentrar verba, qualidade do contato, post vencedor); `hotel-operacional.md` (antecedência de 45 a 50 dias; política de cancelamento; crianças); `hotel-cabanas.md` §9; `destino-bonito.md` §3 (dezembro e janeiro = chuva; janeiro = alta; 1ª quinzena de dezembro = baixa); `perfil-cabanas.md`; `inventario-imagens.md` (27/09/2026); pauta e textos de outubro/2026 (aprovados).

---

## 0. As 2 decisões que preciso de você agora

1. **Quando começa a campanha da 1ª quinzena de dezembro?** Pela antecedência do seu hóspede (45 a 50 dias), quem vem de 01 a 15/12 reserva **entre 12/10 e 31/10**. Se a campanha começar em 01/11, ela já pega o check-in de 01/12 com só 30 dias de antecedência e o de 15/12 com 44: perde a maior parte da janela.
   - **Opção 1 (o seu pedido):** de 01/11 a 30/11. Em outubro, a prospecção permanente já vende **domingo a quinta** dessa quinzena (cobre parte do problema).
   - **Opção 2 (pela antecedência, a que eu recomendo pelos números):** de **13/10 a 30/11**, com R$ 20/dia saindo da prospecção de outubro. O total de outubro continua abaixo de R$ 1.500.
2. **Em novembro, com as duas pontuais no ar, a prospecção pausa?** Recomendo **pausar a prospecção de 01 a 30/11** (ela continua criada na conta e volta em 01/12). Motivo: o que ela venderia em novembro são estadias de meados de dezembro a meados de janeiro, que já são **alta temporada** e estão cobertas pela pontual de janeiro. Alternativa: prospecção a R$ 20/dia só de 01 a 15/11 e a pontual de janeiro começando em 16/11 (seção 3).

---

## 1. Resumo em 3 linhas
- **Objetivo:** encher as noites de **domingo a quinta**, os meses de **baixa temporada** e, nas duas pontuais, a **1ª quinzena de dezembro** (baixa, "normalmente mais parada") e **janeiro** (alta, férias escolares), com **reservas diretas** (WhatsApp de reservas), para mover a **taxa de ocupação** (meta: 60% de média mensal, contra 50% em 2025) e a participação do canal direto.
- **Estadia × venda:** a permanente vende o meio de semana da baixa ~45 a 60 dias à frente, o ano todo. Dezembro (estadias de 01 a 15/12): venda **13/10 ou 01/11 até 30/11**. Janeiro (estadias em jan/2027): venda **01/11 a 16/12**. Janelas de ouro de 2027 (maio/junho e agosto/setembro): venda de 15/03 a 15/05 e de 15/06 a 15/08.
- **Indicadores:** custo por conversa, % de conversas qualificadas, reservas diretas por origem (a medir), ocupação de domingo a quinta, da 1ª quinzena de dezembro e de janeiro contra 2025 (a medir).

---

## 2. Arquitetura anual

### 2.1 As campanhas
| Camada | Campanha (nome na conta) | Quando roda | Estadia que vende | Objetivo e destino | Estrutura |
|---|---|---|---|---|---|
| **Permanente 1** | `perm-prospeccao-meio-de-semana` | O ano todo (**pausada em nov/2026**, se você aprovar a decisão 2) | **Domingo a quinta** na baixa temporada, ~45 a 60 dias à frente; 6 personas | Engajamento → **conversas no WhatsApp de reservas** | 1 campanha, 1 conjunto amplo (Brasil; público Advantage+; posicionamentos automáticos), 12 criativos (seção 4) |
| **Permanente 2** | `perm-remarketing` | O ano todo | Todas as datas; quem já **interagiu com o Instagram ou o Facebook** (365 dias) ou **viu os Reels** (sem pixel, ainda não dá para usar quem visitou o motor) | Conversas no WhatsApp | 1 conjunto com públicos personalizados de engajamento, 4 criativos de **decisão**: prova social, o que está na diária, domingo a quinta, reserva direta sem aperto (novo R4) |
| Pontual | `2026-12-primeira-quinzena` | **Opção 1:** 01 a 30/11/2026 · **Opção 2:** 13/10 a 30/11/2026 | **01 a 15/12/2026** (baixa + início das chuvas), todos os dias da semana | Conversas no WhatsApp | 1 conjunto amplo, 5 criativos (seção 5) |
| Pontual | `2027-01-ferias-de-janeiro` | **01/11 a 16/12/2026** | **Janeiro/2027** (alta + chuva), foco em **famílias**; fora das datas do pacote de Réveillon ([a confirmar com o dono]) | Conversas no WhatsApp | 1 conjunto amplo, 5 criativos (seção 6) |
| Pontual (futura) | `2027-03-janela-de-ouro-1` | **15/03 a 15/05/2027** | **Maio e junho** (seca + baixa), prioridade de domingo a quinta | Conversas no WhatsApp | Idem, com o ângulo "águas mais transparentes na seca" (fato do destino, nunca "garantida"). Criativos em fev/2027 |
| Pontual (futura) | `2027-06-janela-de-ouro-2` | **15/06 a 15/08/2027** | **Agosto e setembro** (seca + baixa) | Conversas no WhatsApp | Idem. Criativos em mai/2027 |

**Sem campanha paga (decisão sua, 27/09/2026):** Réveillon, Carnaval e **todos os feriados** (Finados, 20/11, Páscoa, Tiradentes, Corpus Christi, 7/9, 12/10). Nenhum anúncio fala de feriado nem de pacote. Se quiser, eles aparecem só no orgânico.

**Conta de antecedência (45 a 50 dias, `hotel-operacional.md`):**
| Estadia | Pico de reserva (45 a 50 dias antes) | Veiculação proposta |
|---|---|---|
| 01/12 | 12 a 16/10 | Opção 2 começa em 13/10; a Opção 1 (01/11) chega com 30 dias |
| 15/12 | 26 a 31/10 | Coberta só se a campanha já estiver no ar em outubro (Opção 2) |
| 04/01 (depois do Réveillon, [a confirmar datas do pacote]) | 15 a 20/11 | 01/11 dá ~64 dias de antecedência: aquece e já converte |
| 31/01 | 12 a 16/12 | Fim em 16/12 |
| 01/05 e 30/06 (janela 1) | 12/03 a 16/05 | 15/03 a 15/05 |
| 01/08 e 30/09 (janela 2) | 12/06 a 16/08 | 15/06 a 15/08 |

### 2.2 Regra de divisão dos R$ 1.500
| Tipo de mês | Prospecção permanente | Remarketing permanente | Pontual(is) | Total |
|---|---|---|---|---|
| **Sem pontual** | R$ 1.200 (80%) · R$ 40/dia | R$ 300 (20%) · R$ 10/dia | — | R$ 1.500 |
| **Um pontual o mês todo** | R$ 600 (40%) · R$ 20/dia | R$ 300 (20%) · R$ 10/dia | R$ 600 (40%) · R$ 20/dia | R$ 1.500 |
| **Dois pontuais ao mesmo tempo** | **Pausada** (R$ 0) | R$ 300 · R$ 10/dia | R$ 600 + R$ 600 · R$ 20/dia cada | R$ 1.500 |
| **Pontual em parte do mês** | Fica com o resto (mínimo R$ 20/dia, ou pausa) | R$ 7 a R$ 10/dia | R$ 20/dia nos dias em que roda | ≤ R$ 1.500 |

**Regras:**
1. A verba do pontual sai da **prospecção**; o remarketing só cede (até R$ 7/dia) para manter uma campanha no piso.
2. **Piso:** nenhuma campanha de prospecção ou pontual abaixo de **R$ 20/dia** (abaixo disso a Meta mal sai da fase de aprendizado com vários criativos). Se o dinheiro não der para o piso, a campanha não liga: é melhor concentrar (caderno Bárbara Bruna, 26/09/2026).
3. **Até dois pontuais ao mesmo tempo (mudou).** Na v1 a regra era "nunca dois pontuais", porque Réveillon e Carnaval vendiam pacotes diferentes e dividiriam uma verba curta. Agora, a venda da 1ª quinzena de dezembro e a de janeiro **se sobrepõem em novembro** por causa da antecedência. Com R$ 1.500 (R$ 50/dia), três campanhas no piso + remarketing dariam R$ 67/dia (R$ 2.010 no mês): não cabe. Por isso, **quando há dois pontuais, a prospecção pausa** (só quando a estadia que ela venderia já está coberta pelos pontuais, como em novembro). Três pontuais ao mesmo tempo, nunca.
4. O remarketing fica entre R$ 7 e R$ 10/dia e **nunca pausa**. Se a frequência passar de ~4 em 7 dias, ele cai para R$ 7/dia e a diferença volta para a campanha principal do mês.
5. **O teto não é meta:** o que sobrar no mês não passa para o mês seguinte sem o seu OK.
6. Orçamento **total por campanha, com data de fim**, para a soma nunca passar do teto. Mudanças de até ~20% por vez, sempre com o seu OK. Sugestão: **limite de gastos da conta** em R$ 1.500/mês, definido por você, como trava.

### 2.3 Calendário do ano (desenho; cada mês é reaprovado por você com os números do anterior)
| Mês | Pontual no ar | Prospecção | Remarketing | Pontual | Total |
|---|---|---|---|---|---|
| out/26 | Opção 1: nenhum · Opção 2: dezembro a partir de 13/10 | R$ 1.170 · R$ 858 | R$ 312 · R$ 260 | — · R$ 380 | R$ 1.482 · R$ 1.498 |
| nov/26 | Dezembro + janeiro (o mês todo) | **pausada** | R$ 300 | R$ 600 + R$ 600 | R$ 1.500 |
| dez/26 | Janeiro de 01 a 16/12 | R$ 930 | R$ 248 | R$ 320 | R$ 1.498 |
| jan/27 | — | R$ 1.200 | R$ 300 | — | R$ 1.500 |
| fev/27 | — | R$ 1.200 | R$ 300 | — | R$ 1.500 |
| mar/27 | Janela 1 a partir de 15/03 | R$ 860 | R$ 300 | R$ 340 | R$ 1.500 |
| abr/27 | Janela 1 | R$ 600 | R$ 300 | R$ 600 | R$ 1.500 |
| mai/27 | Janela 1 até 15/05 | R$ 900 | R$ 300 | R$ 300 | R$ 1.500 |
| jun/27 | Janela 2 a partir de 15/06 | R$ 880 | R$ 300 | R$ 320 | R$ 1.500 |
| jul/27 | Janela 2 | R$ 600 | R$ 280 | R$ 620 | R$ 1.500 |
| ago/27 | Janela 2 até 15/08 | R$ 900 | R$ 300 | R$ 300 | R$ 1.500 |
| set/27 | — | R$ 1.200 | R$ 300 | — | R$ 1.500 |

---

## 3. Os próximos 90 dias em detalhe (outubro, novembro e dezembro de 2026) [verba a definir pelo dono]

**Por que é assim:** em outubro, a prospecção vende **domingo a quinta** de meados de novembro a meados de dezembro (baixa). Em novembro, as duas pontuais vendem a 1ª quinzena de dezembro (reta final) e janeiro; a prospecção pausa porque o que ela venderia (meados de dezembro a meados de janeiro) é alta temporada. Em dezembro, a pontual de janeiro faz a reta final até 16/12 e a prospecção volta, vendendo **domingo a quinta de fevereiro (fora do Carnaval) e início de março**.

**Produção:** plano aprovado até 29/09 → textos (Marketing) 30/09 a 01/10 → artes (Designer) 02 a 04/10 → kit de subida ou API, campanhas **pausadas**, em 05/10 → **ativação em 06/10 com o seu OK**.
- Dezembro, Opção 2: textos até 06/10, artes até 10/10, subida pausada em 12/10, ativação em **13/10** com o seu OK.
- Dezembro, Opção 1, e janeiro: textos até 20/10, artes até 25/10, subida pausada em 30/10, ativação em **01/11** com o seu OK.

### Opção 1 (o seu pedido: dezembro começa em novembro)
| Campanha | Período | R$/dia | Dias | Total | Estadia que vende |
|---|---|---|---|---|---|
| Prospecção meio de semana | 06 a 31/10 | 45 | 26 | **R$ 1.170** | Domingo a quinta, meados de nov. a meados de dez. |
| Remarketing | 06 a 31/10 | 12 | 26 | **R$ 312** | Todas as datas |
| **Total de outubro** | | | | **R$ 1.482** | |
| Pontual 1ª quinzena de dezembro | 01 a 30/11 | 20 | 30 | **R$ 600** | 01 a 15/12 |
| Pontual férias de janeiro | 01 a 30/11 | 20 | 30 | **R$ 600** | Janeiro/2027 |
| Remarketing | 01 a 30/11 | 10 | 30 | **R$ 300** | Todas as datas |
| Prospecção | pausada | — | — | R$ 0 | — |
| **Total de novembro** | | | | **R$ 1.500** | |
| Pontual férias de janeiro | 01 a 16/12 | 20 | 16 | **R$ 320** | Janeiro/2027 (reta final) |
| Prospecção meio de semana | 01 a 31/12 | 30 | 31 | **R$ 930** | Domingo a quinta, fev. (fora do Carnaval) e início de mar. |
| Remarketing | 01 a 31/12 | 8 | 31 | **R$ 248** | Todas as datas |
| **Total de dezembro** | | | | **R$ 1.498** | |

### Opção 2 (pela antecedência: dezembro começa em 13/10). Novembro e dezembro iguais à Opção 1
| Campanha | Período | R$/dia | Dias | Total | Estadia que vende |
|---|---|---|---|---|---|
| Prospecção meio de semana | 06 a 31/10 | 33 | 26 | **R$ 858** | Domingo a quinta, meados de nov. a meados de dez. |
| Pontual 1ª quinzena de dezembro | 13 a 31/10 (segue em novembro) | 20 | 19 | **R$ 380** | 01 a 15/12 (pico de reserva: 12 a 31/10) |
| Remarketing | 06 a 31/10 | 10 | 26 | **R$ 260** | Todas as datas |
| **Total de outubro** | | | | **R$ 1.498** | |
| **Novembro** | como na Opção 1 | | | **R$ 1.500** | |
| **Dezembro** | como na Opção 1 | | | **R$ 1.498** | |
| **Total da pontual de dezembro** | 13/10 a 30/11 | 20 | 49 | **R$ 980** | |

### Alternativa de novembro (se você não quiser pausar a prospecção)
| Campanha | Período | R$/dia | Total |
|---|---|---|---|
| Prospecção | 01 a 15/11 | 20 | R$ 300 |
| Pontual 1ª quinzena de dezembro | 01 a 30/11 | 20 | R$ 600 |
| Pontual férias de janeiro | **16/11** a 30/11 (segue até 16/12) | 20 | R$ 300 |
| Remarketing | 01 a 30/11 | 10 | R$ 300 |
| **Total** | | | **R$ 1.500** |
*Custo: janeiro perde as duas primeiras semanas de aquecimento e chega em cima do pico de reserva das estadias do início do mês (15 a 20/11).*

### Cenário conservador (mesmas datas, verba menor)
| Mês | Prospecção | Remarketing | Pontuais | Total |
|---|---|---|---|---|
| out/26 | R$ 35/dia = R$ 910 | R$ 10/dia = R$ 260 | — (Opção 1) | R$ 1.170 |
| nov/26 | pausada | R$ 7/dia = R$ 210 | R$ 20/dia cada = R$ 1.200 | R$ 1.410 |
| dez/26 | R$ 25/dia = R$ 775 | R$ 7/dia = R$ 217 | janeiro R$ 20/dia × 16 = R$ 320 | R$ 1.312 |

**Leitura honesta:** com R$ 20 a R$ 45 por dia e 5 a 12 criativos, a Meta vai concentrar a entrega em 2 a 4 anúncios. Anúncio que não recebeu verba em 7 dias não foi "reprovado": ele volta no rodízio seguinte. **Nenhum resultado está prometido:** custo por conversa, taxa de qualificação e taxa de fechamento são **[a medir]** na primeira semana.

**A conta antes de gastar (para fechar com números reais em 13/10):** conversas no mês = verba ÷ custo por conversa [a medir] → qualificadas = conversas × % qualificada [a medir] → reservas = qualificadas × taxa de fechamento da equipe [a medir]. Se a conta não fechar, o problema pode ser a **oferta** (não há condição específica para domingo a quinta nem para a 1ª quinzena de dezembro, [a confirmar com o dono]) ou o **tempo de resposta** no WhatsApp, e não o anúncio. Em janeiro (alta), a pergunta é outra: se a ocupação já estiver alta na metade de novembro, a pontual de janeiro para e a verba volta para o remarketing ou fica sem gastar ([a medir] com a ocupação que você enviar).

**Configuração (todas as campanhas):** objetivo **Engajamento → Conversas, local da conversão: WhatsApp** [confirmar o nome atual do menu no Gerenciador]; conjunto amplo, Brasil (SP, PR, RJ e Sul entram como sinal pelos criativos e pela linguagem, não como trava; 35% dos turistas de Bonito vêm de SP, `destino-bonito.md` §5, [confirmar fonte atual]); posicionamentos Advantage+; cada anúncio com **4:5 e 9:16**; **mensagem pronta por anúncio** terminando com o código (ex.: "Olá! Vi o anúncio do Cabanas e quero datas de domingo a quinta. #P03"; "Quero datas na 1ª quinzena de dezembro. #D2"; "Quero datas em janeiro para a família. #J1"). Sem hashtags nos anúncios.

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
| **R4 (novo)** | Todas (Casais e 55+ à frente) | **Baixa temporada, reserva sem aperto:** reserva direta com desconto, sinal de 50%, cartão em até 6x e **reembolso integral cancelando com 30 dias de antecedência** (política das reservas diretas; agência e canal online seguem a deles). Remove a última objeção de quem já conhece o hotel e está planejando com antecedência. Sem urgência, sem "últimas vagas" | imagem | "Baixa temporada, **reserva** *sem aperto*" | `imagem_casal_observando_natureza (1AbONV)`. Texto: política e parcelamento com "[confirmar política vigente]" |

*O antigo R4 (feriado de 20 a 22/11) saiu, pela sua decisão de 27/09/2026.*

---

## 5. Pontual: 1ª quinzena de dezembro (`2026-12-primeira-quinzena`)
**Estadia:** 01 a 15/12/2026, todos os dias da semana. **Venda:** Opção 1, 01 a 30/11; Opção 2, 13/10 a 30/11 (decisão 1). **Réguas:** baixa temporada (a alta começa na 2ª semana de dezembro, `destino-bonito.md` §3) + **início das chuvas**: nenhuma promessa de água cristalina; o rio pode aparecer, sem falar da cor. **Sem feriado, sem Natal, sem Réveillon, sem preço, sem "últimas vagas".** A escola ainda está em aula nessa quinzena: o foco é **Casais e 55+**. Mensagem pronta: "Quero datas na 1ª quinzena de dezembro. #D1".

| AD | Persona | Ângulo | Formato | Gancho (1º quadro, 0 a 3 s) | Foto do inventário |
|---|---|---|---|---|---|
| **D1** | Casais | Uma pausa a dois antes da correria de fim de ano: Cabana Master, 85 m², a única com banheira de hidromassagem para 2, varanda com balanço; decoração especial **(opcional)** | imagem | "Antes da *correria*, **uma pausa** a dois" | `Cabana Master / cabana_master_banheira (1Kpp5M)` (diferente da P02). Se aparecer decoração: "(opcional)" |
| **D2** | 55+ (2ª: Casais) | Quando chove, a mata fica mais verde (fato do destino): trilhas e redário dentro do hotel e, se a chuva apertar, piscina climatizada, hidromassagem aquecida e sauna das 7h às 22h | carrossel (5) | "Com a chuva, a **mata** fica *mais verde*" | `imagem_redario_balneario_rio_formosinho (1jimO_)` · `piscina (1WkaPv)` · `espaco_relaxamento_spa_hidro_externa (1bayxD)` · `area_espaco_relaxamento (1Q2jhE)` · `imagem_deck_balneario_formosinho (1riWSE)`. O Designer confere se as fotos não mostram seca evidente |
| **D3** | Jovens aventureiros (2ª: Casais) | O calor pede rio: boia cross **(opcional)**, 1.200 m de corredeiras e cachoeiras do Rio Formoso, com guias treinados; a partir de 6 anos e 1,15 m | vídeo (ou imagem) | "O **calor** pede *rio*" | **Vídeo da produtora** (o mesmo da P09) ou plano B `Boia Cross / boia_close_adultos_sorrindo (18liRI)`. "Segurança em primeiro lugar" |
| **D4** | Casais e 55+ | O que já vem na diária, num dia da quinzena: café (6h30 às 9h30) → arco e flecha (8h30) → trilha no Formosinho com tirolesa e SUP (14h) → caiaque no Formoso (15h30), com monitor; "os horários podem variar conforme a temporada" | carrossel (5) | "Um dia **inteiro** *já incluso*" | `casal_cafe_manha (1BHhSN)` · `imagem_arco_flecha_mulher_sorrindo (1fbDfq)` · `imagem_standup_rio_formoso_mulher (1Mt4QV)` · `imagem_caiaques_sem_pessoas (11CIuu)` · `imagem_deck_balneario_formosinho (1X1mqX)` |
| **D5** | Casais | Sensorial da chuva: Cabana Casal de madeira elevada a 3 m, varanda privativa com rede; a chuva vira programa, não problema | imagem | "Chuva no *telhado*, **rede** na varanda" | `Cabana casal / cabana_casal_01_varanda (1ieD_L)`. Texto: não acomoda menores de 5 anos |

**Distribuição:** Casais em 4 (D1, D3 2ª, D4, D5) · 55+ em 2 (D2, D4) · Aventureiros em 1 (D3). Formatos: 2 imagens, 2 carrosséis, 1 vídeo (imagem como plano B).

---

## 6. Pontual: férias de janeiro (`2027-01-ferias-de-janeiro`, 01/11 a 16/12/2026)
**Estadia:** janeiro/2027, fora das datas do pacote de Réveillon ([a confirmar com o dono]; a campanha não fala do pacote). **Venda:** 01/11 a 16/12 (pico de 15/11 a 16/12). **Réguas:** **alta temporada** (férias escolares) + **chuva e calor**: nada de "baixa", nada de "água cristalina garantida"; lazer interno e conforto em primeiro plano (`destino-bonito.md` §3). **Foco: famílias e o que está incluso.** **Não há recreação infantil:** o monitor é das atividades da programação, para os hóspedes; nada que sugira cuidar das crianças. Idades mínimas das atividades **inclusas**: [a confirmar com o dono]. Sem preço, sem "últimas vagas". Mensagem pronta: "Quero datas em janeiro para a família. #J1".

| AD | Persona | Ângulo | Formato | Gancho (1º quadro, 0 a 3 s) | Foto do inventário |
|---|---|---|---|---|---|
| **J1** | Famílias | Férias com a agenda pronta: programação diária **inclusa**, com monitor ou guia (arco e flecha, trilha com tirolesa, SUP, caiaque, decks de banho); "os horários podem variar conforme a temporada" | carrossel (5) | "Férias com a *agenda* **pronta**" | `imagem_arco_flecha_guia_mulher (1W8swZ)` · `imagem_tirelosa_formosinho_homem (1oFEG8)` · `imagem_atividade_standup_adulto_rio_formosinho (1G0i-V)` · `imagem_caiaque_rio_formoso_mulher (11kdRW)` · `imagem_deck_balneario_rio_formosinho (1Im-BhO)` |
| **J2** | Famílias | Choveu? As férias continuam: piscina climatizada, hidromassagem aquecida, salão de jogos (tênis de mesa, bilhar, pebolim) e playground, tudo incluso; piscina e salão das 7h às 22h | imagem | "Choveu? As **férias** *continuam*" | `Infraestrutura / piscina (1wy7Eb)` (reserva: `play_ground (1fikC1)`). O texto não fala da cor da água |
| **J3** | Famílias | A família toda no mesmo lugar: Bangalô Especial para até 4 (2 camas king, não divide paredes); Cabana Master e Apartamento Conjugado para até 5; crianças até 5 anos não pagam dormindo na cama dos pais; berço mediante agendamento | carrossel (5) | "A **família** toda, *no mesmo* lugar" | `Bangalô Especial / bangalo_especial_area_com_rede (1xXd9J)` · `bangalo_especial_interna (1Ro_o5)` · `Conjugado / conjugado_externa (1jPdT5)` · `conjugado_interna_piso_inferior_solteiro (1K7sJz)` · `Cabana Master / cabana_master_interna_ambiente_camas_solteiro (1z_82u)`. Não mostrar Cabana Casal nem Tripla (não aceitam menores de 5 anos) |
| **J4** | Famílias com filhos a partir de 6 anos (2ª: Aventureiros) | Aventura com segurança, dentro do hotel: arvorismo com tirolesa aquática e boia cross, **opcionais**, com guias treinados e equipamento conferido; a partir de 6 anos e 1,15 m | carrossel (4) | "Com **6 anos** e 1,15 m, *já dá*" | `Arvorismo / arvorismo_condutor_equipando_cliente (1T_TCt)` · `arvorismo_estacao_crianca (1654o4)` · `Boia Cross / boia_briefing_inicial (1IPZ-w)` · `boia_close_crianca (1Z_VrcE)`. "Segurança em primeiro lugar" |
| **J5** | Famílias (2ª: Casais) | Base para as férias em Bonito: a 6 km do centro, todo o acesso em asfalto, 8 km do aeroporto; passeio da cidade de manhã, o rio do hotel à tarde (programação inclusa das 14h e das 15h30) | imagem | "Passeio de **manhã**, *rio do hotel* à tarde" | `imagem_area_balneario_formosinho (16xoP5)` (reserva: `recepcao_lago (15DZs9)`) |

**Distribuição:** Famílias em 5 (J1 a J5) · Aventureiros e Casais como 2ª persona (J4, J5). Formatos: 2 imagens, 3 carrosséis.

---

## 7. Medição e rotina

### O que precisa estar configurado (antes de 06/10)
| Item | Status |
|---|---|
| Conta de anúncios, Página, Instagram e **WhatsApp Business** conectados | [a confirmar com o dono] |
| **Limite de gastos da conta** (sugestão: R$ 1.500/mês), definido por você | [a confirmar com o dono] |
| **Públicos personalizados** (engajou com o Instagram e o Facebook em 365 dias; viu 50% dos vídeos) | criar agora, de graça; o tamanho é [a medir] |
| **Mensagem pronta com código** por anúncio (#P01 a #P13, #R1 a #R4, #D1 a #D5, #J1 a #J5) | a Marketing escreve na Fase 2 |
| **Planilha da recepção:** data do contato · código · qualificada (data + nº de pessoas + idades das crianças) · data da estadia (domingo a quinta? 1ª quinzena de dez.? janeiro?) · virou reserva? · valor | [a confirmar com o dono] (seção 9, item 1) |
| **Pixel / API de conversões no motor Silbeck** + UTM (`?utm_source=meta&utm_medium=paid-social&utm_campaign=<campanha>&utm_content=<ad>`) | [a confirmar com o dono se o Silbeck aceita]. Sem isso, não há remarketing de quem visitou o motor nem campanha para o site |
| **Tempo de resposta** no WhatsApp durante as campanhas (em novembro, duas pontuais ao mesmo tempo) | meta de tempo [a definir pelo dono] |

### Rotina
| Quando | O que olhar | O que fazer |
|---|---|---|
| **3 a 5 dias** após cada início (09 a 11/10; 16 a 18/10 na Opção 2; 04 a 06/11; 04 a 06/12 na volta da prospecção) | Se está gastando; conversas chegando com o código; anúncio reprovado; link ou WhatsApp quebrado | **Não mexer** (fase de aprendizado), salvo erro. Erro = pausar o anúncio e avisar você no mesmo dia |
| **Semanal** (segunda, em blocos de 7 dias: 13/10, 20/10, 27/10…) | Custo por conversa por anúncio · % de conversas qualificadas por anúncio · CTR do link · frequência (remarketing) · retenção de 3 s nos vídeos · envios por alcance do orgânico | **Pausar:** anúncio com custo por conversa ≥ 2× a média da campanha, ou com gasto ≥ 2× o custo médio e nenhuma conversa, ou com conversas que nunca qualificam. **Reforçar:** o vencedor ganha uma variação do mesmo ângulo (não um público mais estreito). Frequência > ~4 no remarketing = criativos novos ou R$ 7/dia. Verba: só com o seu OK e ~20% por vez |
| **Checagem de ocupação** (16/11 e 30/11) | Ocupação da 1ª quinzena de dezembro e de janeiro que você enviar | Se uma das pontuais já estiver cheia, ela para e a verba não é gasta sem o seu OK |
| **Mensal** (1º dia útil) | Reservas por código e por "como nos conheceu?" · % de reservas de domingo a quinta · reservas da 1ª quinzena de dez. e de janeiro · custo por reserva direta [a medir] | Redistribuir o mês seguinte dentro da regra da seção 2.2; registrar o aprendizado em `social/anuncios/README.md` |

### O que NÃO dá para concluir sem UTM, código e a pergunta "como nos conheceu?"
- Que o anúncio **trouxe a reserva** (a pessoa pode ter visto o anúncio e reservado por agência ou OTA).
- Se o anúncio vende **domingo a quinta** ou só fim de semana.
- **Custo por reserva** e retorno sobre a verba: só custo por conversa, que é o passo do meio.
- Quem visitou o motor e não reservou (sem pixel, não há como medir nem fazer remarketing).
- Qual persona compra: a Meta mostra idade e região de quem **clicou**, não de quem **reservou**.

---

## 8. Pedidos à equipe (depois do seu OK)
- **Marketing (`marketing-anuncios`):** textos de 12 anúncios da prospecção + 4 do remarketing (R4 novo) + 5 de dezembro (D1 a D5) + 5 de janeiro (J1 a J5) (texto principal até ~125, título até ~40, descrição até ~30, com a contagem) + mensagem pronta com código + roteiros de vídeo para P03, P09, P12 e D3 (gancho em 0 a 3 s, 15 a 30 s, 9:16). Obrigatório: "(opcional)" em boia cross, arvorismo e decoração; nenhum preço sem "[confirmar valor vigente]"; política de cancelamento e parcelamento do R4 com "[confirmar política vigente]"; notas com "set/2026"; nada de concorrente, de urgência, de feriado, de Natal ou Réveillon; nada de água cristalina em dezembro e janeiro; janeiro nunca como "baixa"; nada que sugira recreação infantil. Prazos: prospecção e remarketing até 01/10; dezembro até 06/10 (Opção 2) ou 20/10 (Opção 1); janeiro até 20/10.
- **Designer (`designer-criativos`):** cada anúncio de imagem ou carrossel em `feed45` (1080 × 1350) e `story` (1080 × 1920, zonas seguras). Prospecção: 6 imagens (P02, P05, P06, P08, P09 plano B, P10) + 4 carrosséis (P01 adaptado, P04, P07, P11). Remarketing: 3 imagens (R1, R3, R4) + 1 carrossel (R2). Dezembro: 3 imagens (D1, D3 plano B, D5) + 2 carrosséis (D2, D4). Janeiro: 2 imagens (J2, J5) + 3 carrosséis (J1, J3, J4). Planos B em vídeo de fotos: P03, P12. Só fotos reais, gancho legível no 1º quadro. Prazos: prospecção e remarketing até 04/10; dezembro até 10/10 (Opção 2) ou 25/10 (Opção 1); janeiro até 25/10.
- **Você → produtora:** vídeo da boia cross (P09 e D3) e os Reels 1 e 4 do briefing de outubro (P03, P12).

## 9. A confirmar com o dono (para depois)
1. **A equipe de reservas pode anotar a origem de cada conversa?** Perguntar "como nos conheceu?" e anotar o código do anúncio, se a conversa é qualificada, a data da estadia e se virou reserva. Sem isso, dá para saber quanto custa cada conversa, mas não se o anúncio vende.
2. Datas do pacote de Réveillon, só para a campanha de janeiro não vender essas noites.
3. Ocupação atual da 1ª quinzena de dezembro, de janeiro e de domingo a quinta em novembro, para medir contra 2025 e saber se janeiro precisa mesmo de verba.
4. Há condição ou tarifa diferente para domingo a quinta ou para a 1ª quinzena de dezembro? (Sem isso, nenhum anúncio fala de preço.)
5. Idade mínima das atividades inclusas (arco e flecha, tirolesa, SUP, caiaque), para o J1.
6. A política de cancelamento (30 dias) e o parcelamento em até 6x continuam valendo, para o R4.
7. O Silbeck aceita pixel da Meta e guarda UTM?
8. O tarifário de alta e baixa do hotel, para ajustar as janelas de 2027.
9. Você autoriza um teste pequeno para o público da região (boia cross e arvorismo para não hóspedes)? Hoje fica fora do teto; só com a sua decisão.

## 10. Autorrevisão
- [x] Objetivo ligado a indicadores do hotel (ocupação de domingo a quinta, da 1ª quinzena de dezembro e de janeiro; reservas diretas)
- [x] Duas réguas: dezembro e janeiro com chuva e sem promessa de água; 1ª quinzena de dez. = baixa; janeiro = alta (não chamado de baixa); janelas de ouro na seca + baixa
- [x] Datas separadas: estadia × veiculação, com a conta de 45 a 50 dias (dezembro deveria começar em outubro: decisão 1)
- [x] Sem campanha de feriado, Réveillon ou Carnaval; R4 de feriado substituído
- [x] Personas nos seus canais (Instagram e Facebook); segmentação pelo criativo (Andromeda, 26/09/2026)
- [x] Destino: WhatsApp de reservas com mensagem codificada
- [x] Verba em opções e cenário conservador, no máximo R$ 1.500 por mês, [verba a definir pelo dono]; nenhum resultado prometido; a conta está montada com [a medir]
- [x] Regra de dois pontuais explicada; piso de R$ 20/dia mantido; remarketing nunca pausa
- [x] Post vencedor previsto (P13); qualidade do contato definida; verba concentrada na janela de venda
- [x] Fotos do inventário com nome e ID; opcionais marcados; sem recreação infantil; sem concorrentes, preço ou urgência
- [x] Lista de peças para o Marketing e o Designer
