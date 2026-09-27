# Plano de mídia paga (Meta Ads): Hotel Cabanas, out/2026 a set/2027 (v2.3)

> **Autor:** Estrategista de Social Media e Tráfego · **Data:** 27/09/2026 · **Skill:** `campanha-anuncios`, Fase 1 · **Status:** PROPOSTA v2.3, aguardando o seu OK (nada foi subido nem ativado).
> **Decisões suas já aplicadas (27/09/2026):** teto de **R$ 1.500 por mês**; gargalo = **domingo a quinta e baixa temporada**; chave da Meta ainda não configurada (subida manual, pelo kit, ou pela API depois); sem pixel nem UTM no motor; **sem campanha de feriado, Réveillon ou Carnaval**; 40% a 60% dos hóspedes são de MS (Campo Grande, Dourados e entorno), que fica no máximo 2 noites, geralmente no fim de semana, e aproveita muito o próprio hotel; em janeiro e julho cai MS e sobe o público de fora; piores meses: maio e junho (frio).
> **Novo nesta v2.3 (decisões suas de 27/09/2026, registradas em `hotel-cabanas.md` §9 e `social/anuncios/README.md`):**
> - **O hóspede de MS decide com 15 a 20 dias de antecedência** (o de fora: 45 a 50).
> - **MS o ano todo, exceto em feriados e férias**, e **Fora do estado caminhando junto o ano todo**. A estrutura passa a ser só **3 campanhas permanentes: MS + Fora do estado + Remarketing**. Acabaram as pontuais.
> - **Voo direto (V1 a V5) e prospecção (P01 a P12) viram criativos dentro da "Fora do estado"**. A 1ª quinzena de dezembro (D1 a D5) vira **rodízio da MS em novembro**; as férias de janeiro (J1 a J5), **rodízio da Fora em novembro e dezembro**; as janelas de ouro 2027, **rodízio da Fora**.
> - **Sai o gatilho de tempo ruim** da v2.2: quem decide com 15 a 20 dias de antecedência não reage à previsão do fim de semana. M5 e M6 ficam só no calendário (maio e junho).
> **Bases:** `meta-ads.md` e `social-e-trafego.md` (Andromeda, 1 conjunto amplo, "segmentar só quando a mensagem for incompatível", 10 a 15 conceitos: 26/09/2026, revisar em dez/2026 [confirmar se a regra continua valendo]); caderno Bárbara Bruna (26/09/2026: janela de 7 dias, concentrar verba, qualidade do contato, post vencedor); `hotel-operacional.md` (antecedência de 45 a 50 dias; pacote de Réveillon 29/12 a 02/01; crianças; 8 km do Aeroporto de Bonito; não há transfer; check-out até 13h com uso da estrutura depois; piscina, hidromassagem e sauna das 7h às 22h; ar quente e frio em todas as acomodações); `hotel-cabanas.md` §9; `destino-bonito.md` §3 e §5; `inventario-imagens.md` (27/09/2026).

---

## 0. As 2 decisões que preciso de você agora

1. **Finados e Consciência Negra de 2026 entram na pausa da MS?** A regra aplicada neste plano pausa a MS de 11 a 18/10 (vende Finados, 31/10 a 02/11) e de 31/10 a 07/11 (vende 20 a 22/11). Na prática, a MS só começaria em **19/10** e pararia 8 dias depois de 12 dias no ar. Só que, em 27/09, você disse que **esses dois feriados ainda têm vagas**. *Alternativa (a que eu recomendo):* só em 2026, MS rodando direto de **06/10 a 28/11**, sem falar de feriado (+R$ 294 em outubro e +R$ 147 em novembro, ainda abaixo do teto). A regra completa vale a partir de 2027.
2. **Confirma o que conta como "feriado e férias" para pausar a MS?** Usei: **férias de 19/12/2026 a 31/01/2027 e de 01 a 31/07/2027** [confirmar o calendário escolar de MS 2027]; feriados nacionais que formam **fim de semana prolongado**; **Corpus Christi (27 a 30/05) entra**, mesmo sendo ponto facultativo e maio sendo o pior mês. **Não entram:** Tiradentes (quarta-feira, 21/04), 1º de maio (sábado), 15/11/2026 (domingo) e o aniversário de Campo Grande (26/08/2027, quinta-feira, feriado municipal [confirmar]).

---

## 1. Resumo em 3 linhas
- **Objetivo:** encher as noites de **domingo a quinta**, a **baixa temporada** e os meses fracos (**maio e junho**) com reservas diretas pelo WhatsApp de reservas, para mover a **taxa de ocupação** (meta: 60% de média mensal, contra 50% em 2025) e a participação do canal direto.
- **Estadia × venda:** **MS** vende a estadia **15 a 20 dias à frente** e pausa quando essa estadia cai em feriado prolongado ou férias. **Fora do estado** vende **45 a 50 dias à frente** (conversão paga forte de ~60 a ~45 dias) e nunca pausa: troca de criativos conforme a estadia que está vendendo. **Remarketing** vende todas as datas, o ano todo.
- **Indicadores:** custo por conversa e % qualificada por anúncio; % das conversas de MS que pedem domingo a terça; **antecedência real** por origem (para confirmar os 15 a 20 dias); ocupação de domingo a quinta, de maio e junho e da 1ª quinzena de dezembro contra 2025 [a medir].

---

## 2. Arquitetura anual

### 2.1 As 3 campanhas permanentes
| Campanha (nome na conta) | Quando roda | Estadia que vende | Público e região | Estrutura |
|---|---|---|---|---|
| **`perm-ms-o-hotel-e-o-passeio`** | O ano todo, **menos** nas pausas da seção 2.2 | **15 a 20 dias à frente**: domingo a terça (esticar o fim de semana) o ano todo; fim de semana curto em maio e junho; 1ª quinzena de dezembro em novembro | **Campo Grande e Dourados, com raio do entorno** (~40 a 50 km [confirmar raio no Gerenciador]); **excluir Bonito e vizinhas** [confirmar a lista, ex.: Jardim, Bodoquena, Guia Lopes da Laguna]; idade e interesses abertos | Engajamento → conversas no WhatsApp de reservas; **1 conjunto**; rodízio M1 a M6 e D1 a D5 (seção 2.4) |
| **`perm-fora-do-estado`** | O ano todo, **nunca pausa** | **45 a 50 dias à frente** (baixa: domingo a quinta; férias: famílias; janelas de ouro: seca) | **Conjunto 1 `brasil-sem-ms`:** Brasil, excluindo o estado de MS; amplo. **Conjunto 2 `raio-sp-campinas`:** pins + raio (~40 km) em Guarulhos, Congonhas e Viracopos [confirmar no Gerenciador], **só nas pausas longas da MS** | Orçamento **por conjunto** (para o conjunto 2 ter verba própria, sem mexer no 1) [confirmar o nome atual da opção no Gerenciador]; rodízio P01 a P12, V1 a V5, J1 a J5 e variações de seca das janelas de ouro |
| **`perm-remarketing`** | O ano todo, nunca pausa | Todas as datas | Quem interagiu com o Instagram ou o Facebook (365 dias) ou viu 50% dos Reels; Brasil | R1 a R4 (R4 pausado nas férias, porque fala de baixa temporada) |

**Saem da conta (não serão criadas):** `perm-voo-direto-sp-campinas`, `perm-prospeccao-meio-de-semana`, `2026-12-primeira-quinzena`, `2027-01-ferias-de-janeiro`, `2027-03-janela-de-ouro-1` e `2027-06-janela-de-ouro-2`. Os criativos delas continuam todos, redistribuídos.

**Por que o voo direto fica como criativo e não como conjunto próprio (decisão pelo teto):** com R$ 1.500/mês (~R$ 48 a 50/dia), a Fora do estado recebe ~R$ 21/dia no mês normal. Dividida em dois conjuntos, cada um ficaria com ~R$ 10, abaixo do **piso de R$ 20/dia** (concentrar verba, caderno Bárbara Bruna, 26/09/2026). Por isso, **no mês normal, V1 a V5 rodam dentro do conjunto 1** (Brasil sem MS): no Andromeda a segmentação está no criativo, e "sai de Campinas, Congonhas ou Guarulhos" tende a ser entregue a quem é de SP (26/09/2026 [confirmar se a regra continua valendo]). **O conjunto 2 (raio SP/Campinas) só liga quando a MS pausa por 14 dias ou mais**: aí a verba da MS (R$ 21/dia) vira o piso dele, e os V saem do conjunto 1 nesse período. A localização se justifica porque "voo direto" só é verdade para quem sai desses aeroportos ("segmentar só quando a mensagem for incompatível", `social-e-trafego.md`, 26/09/2026).

**Público e região:**
- **MS e Fora não se sobrepõem:** a Fora exclui o estado inteiro de MS; a MS exclui Bonito e vizinhas (quem mora ali não se hospeda; o teste de boia cross e arvorismo para não hóspedes segue fora do teto, só com a sua decisão).
- O conjunto 2 não é excluído do conjunto 1, para não editar a localização de um conjunto ativo (isso reinicia o aprendizado [confirmar no Gerenciador]); a sobreposição é só de SP e dura as pausas longas.
- Remarketing é Brasil (quem já nos conhece).

**Critério de revisão (30 dias após a MS entrar, ~18/11, ou ~06/11 se você aprovar a alternativa da decisão 1):** se as conversas de MS pedirem quase só sábado (que já enche com tempo bom), a Marketing troca os ganchos; se o custo por conversa qualificada da MS ficar acima do dobro do da Fora (ou o contrário), eu proponho mover até ~20% da verba entre elas, com o seu OK.

### 2.2 Regra de pausa da MS (como interpretei a sua decisão)
**A MS pausa quando a estadia que ela está vendendo (15 a 20 dias à frente) cai em feriado prolongado ou férias escolares; fora disso, roda sempre.** Na conta: **a pausa começa 20 dias antes do 1º dia do feriado e termina 15 dias antes do último dia.** Os anúncios nunca falam de feriado; a pausa só evita gastar para vender datas que já lotam sozinhas e que, nas férias, o público de MS pouco compra.

| Estadia que não se vende para MS | Datas da estadia | **MS pausada (veiculação)** | Observação |
|---|---|---|---|
| Nossa Senhora Aparecida 2026 | 10 a 12/10 | — | Já lotado; a janela de venda (20 a 27/09) é anterior à estreia |
| Finados | sáb 31/10 a seg 02/11/2026 | **11 a 18/10/2026** | Ainda com vagas em 27/09 (decisão 1) |
| Consciência Negra | sex 20/11 a dom 22/11/2026 | **31/10 a 07/11/2026** | Ainda com vagas em 27/09 (decisão 1) |
| Férias de fim de dezembro e janeiro + Carnaval | 19/12/2026 a 31/01/2027 [confirmar calendário escolar] + sáb 06/02 a qua 10/02/2027 | **29/11/2026 a 26/01/2027** (contínua: a janela de venda das férias termina em 16/01 e a do Carnaval começa em 17/01) | Inclui Natal e o pacote de Réveillon (29/12 a 02/01) |
| Semana Santa / Páscoa | sex 26/03 a dom 28/03/2027 | **06 a 13/03/2027** | |
| Corpus Christi | qui 27/05 a dom 30/05/2027 | **07 a 15/05/2027** | Ponto facultativo nacional; entra (decisão 2) |
| Férias de julho | 01 a 31/07/2027 [confirmar calendário escolar] | **11/06 a 16/07/2027** | |
| Independência | sáb 04/09 a ter 07/09/2027 (com a emenda de segunda) | **15 a 23/08/2027** | |
| Criação de MS (11/10, estadual) + Aparecida (12/10) | sáb 09/10 a ter 12/10/2027 | **19 a 27/09/2027** | Feriado estadual: pesa justamente em MS |
| *Não pausam:* Tiradentes (qua 21/04/2027), 1º de maio (sáb), 15/11/2026 (dom), aniversário de Campo Grande (qui 26/08/2027 [confirmar]) | | | Decisão 2 |

**Com a alternativa da decisão 1 (recomendada para 2026):** a MS roda de **06/10 a 28/11/2026** sem interrupção e as pausas começam em 29/11.

**Pausas de mais de 7 dias podem fazer a campanha voltar ao aprendizado** [confirmar se a regra continua valendo]: na volta (27/01 e 17/07), os primeiros 7 dias não servem para cortar anúncio.

### 2.3 Verba: divisão típica e o que acontece quando a MS pausa [verba a definir pelo dono]
**Divisão típica (MS ligada):** **MS R$ 21/dia + Fora R$ 21/dia + Remarketing R$ 6/dia = R$ 48/dia** → R$ 1.440 em mês de 30 dias e R$ 1.488 em mês de 31 (sempre ≤ R$ 1.500). Em **maio e junho**, a MS sobe para **R$ 25/dia** (+19%, dentro do limite de ~20% por mudança) com M5 e M6.

**Quando a MS pausa:**
- **Pausa curta (feriado, 8 a 9 dias):** a verba da MS **não vai para a Fora; fica sem gastar** (~R$ 170 a R$ 190 por pausa). Motivos: dobrar a Fora por uma semana é mudança bem acima de ~20% e bagunça o aprendizado; e a Fora vende 45 a 50 dias à frente, não o feriado. O teto não é meta.
- **Pausa longa (férias: 29/11 a 26/01 e 11/06 a 16/07):** a verba da MS **vai para a Fora**, no **conjunto 2 (raio SP/Campinas), com R$ 21/dia**, sem mexer no conjunto 1. É justamente quando o público de fora sobe (você, 27/09/2026). Em 2027, o conjunto 2 liga em **16/06** (e não 11/06), junto com a janela de ouro 2; os 5 dias entre uma e outra ficam sem gastar.

**Regras que continuam:** piso de **R$ 20/dia** por conjunto de venda; remarketing **nunca pausa** (frequência acima de ~4 em 7 dias = criativos novos); mudanças de até ~20% por vez, sempre com o seu OK; orçamento com data de fim; sobra não passa para o mês seguinte sem o seu OK; sugestão: **limite de gastos da conta** em R$ 1.500/mês, definido por você.

### 2.4 Conta de antecedência (por que cada criativo está onde está)
| Estadia | Público | Venda (antecedência) | Campanha e criativos |
|---|---|---|---|
| Domingo a terça, fim de out. a meados de nov. | MS | 19 a 30/10 (15 a 20 dias) | MS: M1 a M4 |
| Domingo a quinta, fim de nov. a meados de dez. | Fora | 06 a 31/10 (45 a 50 dias) | Fora: P + V |
| **01 a 15/12** (baixa + início das chuvas) | **MS** | **11 a 28/11** | MS: **D1 a D5** |
| 19/12 a 31/01 (férias) | **Fora** | **01/11 a 16/12** | Fora: **J1 a J5** (conjunto 2 a partir de 29/11: J1, J3, J5, V2, V3) |
| Fevereiro (depois do Carnaval) e março | Fora | 17/12 a meados de fev. | Fora: P de chuva/verde + V (conjunto 2 até 26/01) |
| Fevereiro e março | MS | a partir de 27/01 | MS: M1 a M4 |
| **Maio e junho** (janela de ouro 1: seca + baixa) | Fora | **15/03 a 15/05** | Fora: rodízio **janela de ouro 1** |
| Maio e junho, fim de semana curto no frio | MS | 16/05 a 10/06 | MS: M1, M2, **M5, M6** |
| Julho (férias) | Fora | 16/05 a 15/06 | Fora: J1, J3, J4, J5 + P07 (versão julho) |
| **Agosto e setembro** (janela de ouro 2) | Fora | **16/06 a 15/08** | Fora: rodízio **janela de ouro 2**; conjunto 2 (V1 a V5) de 16/06 a 16/07 |
| Agosto e setembro | MS | a partir de 17/07 | MS: M1 a M4 |
| Outubro e novembro de 2027 | Fora | 16/08 a 30/09 | Fora: P + V |

---

## 3. Os próximos 90 dias (outubro, novembro e dezembro de 2026) [verba a definir pelo dono]

**Produção:** plano aprovado até 29/09 → textos 30/09 a 01/10 → artes 02 a 04/10 → subida **pausada** em 05/10 → **ativação da Fora e do Remarketing em 06/10 com o seu OK** → MS em 19/10 (ou 06/10, se aprovar a alternativa da decisão 1). J1 a J5 e D1 a D5: textos até 20/10, artes até 25/10, entram em 01/11 (J) e 11/11 (D). Conjunto 2: sobe pausado em 25/11, liga em 29/11 com o seu OK.

### Plano (regra de pausa aplicada)
| Campanha / conjunto | Período | R$/dia | Dias | Total | Estadia que vende |
|---|---|---|---|---|---|
| Fora · conj. 1 (P + V) | 06 a 31/10 | 21 | 26 | **R$ 546** | Domingo a quinta, fim de nov. a meados de dez. |
| MS (M1 a M4) | 19 a 30/10 | 21 | 12 | **R$ 252** | Domingo a terça, fim de out. a meados de nov. |
| Remarketing | 06 a 31/10 | 6 | 26 | **R$ 156** | Todas |
| **Total de outubro** | | | | **R$ 954** | |
| Fora · conj. 1 (J1 a J5) | 01 a 30/11 | 21 | 30 | **R$ 630** | Férias (19/12 a 31/01) |
| MS (M1 a M4 até 10/11; D1 a D5 + M4 de 11 a 28/11) | 08 a 28/11 | 21 | 21 | **R$ 441** | Fim de nov. e **01 a 15/12** |
| Fora · conj. 2 SP/Campinas (J1, J3, J5, V2, V3) | 29 a 30/11 | 21 | 2 | **R$ 42** | Janeiro |
| Remarketing | 01 a 30/11 | 6 | 30 | **R$ 180** | Todas |
| **Total de novembro** | | | | **R$ 1.293** | |
| Fora · conj. 1 (J até 16/12; P de chuva/verde de 17 a 31/12) | 01 a 31/12 | 21 | 31 | **R$ 651** | Janeiro; depois fev. (pós-Carnaval) e mar. |
| Fora · conj. 2 SP/Campinas (J1, J3, J5, V2, V3 até 16/12; V1 a V5 de 17 a 31/12) | 01 a 31/12 | 21 | 31 | **R$ 651** | Idem |
| MS | pausada | — | — | R$ 0 | — |
| Remarketing (R4 pausado) | 01 a 31/12 | 6 | 31 | **R$ 186** | Todas |
| **Total de dezembro** | | | | **R$ 1.488** | |

**Com a alternativa da decisão 1 (MS direto de 06/10 a 28/11):** MS = R$ 546 em outubro e R$ 588 em novembro → **outubro R$ 1.248; novembro R$ 1.440**; dezembro igual (R$ 1.488).

**Cenário conservador (mesmas datas):** MS R$ 20, Fora R$ 20 por conjunto, Remarketing R$ 5 → **outubro R$ 890; novembro R$ 1.210; dezembro R$ 1.395**.

**Leitura honesta:** outubro fica ~R$ 550 abaixo do teto por causa da regra de pausa; não proponho gastar a diferença só para chegar ao teto. Com ~R$ 21/dia e 6 a 8 criativos ligados, a Meta concentra a entrega em 2 a 3 anúncios; o que não recebeu verba em 7 dias volta no rodízio seguinte. **Nenhum resultado está prometido:** custo por conversa, % qualificada e taxa de fechamento são **[a medir]**.

**A conta antes de gastar (fechar com números reais em 13/10):** conversas = verba ÷ custo por conversa [a medir] → qualificadas = conversas × % qualificada [a medir] → reservas = qualificadas × taxa de fechamento [a medir]. Se não fechar, o problema pode ser a **oferta** (hoje não há condição para quem estica até terça nem para a 1ª quinzena de dezembro [a confirmar com o dono]; eu não defino preço) ou o **tempo de resposta** no WhatsApp, e não o anúncio. Se janeiro estiver com ocupação alta em 30/11, os J saem e a verba do conjunto 2 não é gasta sem o seu OK.

**Configuração (todas):** objetivo **Engajamento → Conversas, local da conversão: WhatsApp** [confirmar o nome atual do menu no Gerenciador]; posicionamentos Advantage+; cada anúncio em **4:5 e 9:16**; **mensagem pronta com código** (ex.: "Olá! Sou de Campo Grande e quero datas de domingo a terça. #M1"; "Quero datas de domingo a quinta, vindo no voo direto. #V1"; "Sou de [cidade] e quero datas na 1ª quinzena de dezembro. #D2"; "Quero datas em janeiro para a família. #J1", em julho: "Quero datas em julho para a família. #J1"). Sem hashtags nos anúncios.

---

## 4. Calendário de rotação de criativos (out/2026 a set/2027) e verba do ano
Cada mês é reaprovado com os números do anterior. Em cada campanha, no máximo ~8 criativos ligados ao mesmo tempo.

| Mês | MS | Fora · conj. 1 (Brasil sem MS) | Fora · conj. 2 (SP/Campinas) | Remarketing | Total [verba a definir pelo dono] |
|---|---|---|---|---|---|
| **out/26** | M1 a M4 (19 a 30/10) | P01, P02, P04, P05, P10 + V1, V3, V4 | — | R1 a R4 | R$ 954 |
| **nov/26** | pausa 01 a 07/11; M1 a M4 (08 a 10/11); **D1 a D5 + M4** (11 a 28/11); pausa a partir de 29/11 | **J1 a J5** | J1, J3, J5, V2, V3 (a partir de 29/11) | R1 a R4 | R$ 1.293 |
| **dez/26** | pausada | J1 a J5 até 16/12; **P01, P02, P05, P06, P11, P12** a partir de 17/12 | J1, J3, J5, V2, V3 até 16/12; **V1 a V5** a partir de 17/12 | R1 a R3 | R$ 1.488 |
| **jan/27** | pausada até 26/01; M1 a M4 a partir de 27/01 | P01, P02, P05, P06, P11, P12 | V1 a V5 até 26/01 | R1 a R3; R4 volta em 27/01 | R$ 1.488 |
| **fev/27** | M1 a M4 (+ M7, post vencedor, com o seu OK) | P03, P04, P08, P09, P10, P11 + V1, V4, V5 | — | R1 a R4 | R$ 1.344 |
| **mar/27** | M1 a M4; pausa 06 a 13/03 | até 14/03 como em fev.; a partir de 15/03 **janela de ouro 1**: P03, P05, P08, P09 (versões "seca") + P04 + V1, V4 | — | R1 a R4 | R$ 1.320 |
| **abr/27** | M1 a M4 | janela de ouro 1 | — | R1 a R4 | R$ 1.440 |
| **mai/27** | M1 a M4 (01 a 06/05); pausa 07 a 15/05; **M1, M2, M5, M6** a R$ 25 (16 a 31/05) | janela de ouro 1 até 15/05; **J1, J3, J4, J5 + P07** (férias de julho) a partir de 16/05 | — | R1 a R4 | R$ 1.363 |
| **jun/27** | M1, M2, M5, M6 (01 a 10/06); pausa a partir de 11/06 | J (julho) até 15/06; **janela de ouro 2** a partir de 16/06: P03, P05, P08, P09 (seca) + P06, P11 | **V1 a V5** a partir de 16/06 | R1 a R3 (R4 pausa em 11/06) | R$ 1.375 |
| **jul/27** | pausada até 16/07; M1 a M4 a partir de 17/07 | janela de ouro 2 | V1 a V5 até 16/07 | R1 a R3; R4 volta em 17/07 | R$ 1.488 |
| **ago/27** | M1 a M4; pausa 15 a 23/08 | janela de ouro 2 até 15/08; **P01, P02, P04, P10, P11 + V1, V3, V4** a partir de 16/08 | — | R1 a R4 | R$ 1.299 |
| **set/27** | M1 a M4; pausa 19 a 27/09 | P01, P02, P04, P10, P11 + V1, V3, V4 | — | R1 a R4 | R$ 1.251 |

*Verba mês a mês:* MS R$ 21/dia nos dias ligados (R$ 25 de 16/05 a 10/06); Fora conj. 1 R$ 21/dia o ano todo; conj. 2 R$ 21/dia nas pausas longas; Remarketing R$ 6/dia. Todos os meses ≤ R$ 1.500.

**Regras do rodízio:**
- Nas férias e no verão (dez a mar), nada de "água cristalina"; janeiro e julho nunca como "baixa"; na janela de ouro, "águas mais transparentes na seca" como fato do destino, nunca "garantida".
- As versões "seca" de P03, P05, P08 e P09 são **variações de texto e gancho sobre as mesmas fotos** (a Marketing escreve em fev/2027); nenhum criativo novo, nenhuma foto nova.
- J em julho: sai J2 (fala de chuva); a Marketing confere que J1, J3, J4 e J5 não citam "janeiro" nem chuva.
- Post vencedor: em 13/10 e 20/10 (e todo mês), o orgânico com mais envios por alcance é avaliado para entrar como M7 (MS) ou P13 (Fora), com o seu OK.

---

## 5. Criativos da MS (`perm-ms-o-hotel-e-o-passeio`)

### 5.1 M1 a M6 (o ano todo; M5 e M6 só em maio e junho)
**Como falar com quem é de MS:** de igual para igual, como quem conhece Bonito e já veio ("você que é daqui", "Bonito fica logo ali", "sem pegar avião"); o argumento é **o hotel é o passeio**: 40 hectares entre o Formoso e o Formosinho, com a programação inclusa com monitor, sem precisar sair. Marcas regionais (expressões, hábitos) a Marketing sugere e **você valida**. Voz "nós". Regras:
- **Sem preço, sem prometer vaga, sem "últimas vagas".** "O hotel fica mais tranquilo de domingo a quinta" é a frase aprovada.
- **Opcionais marcados:** boia cross, arvorismo e decoração especial sempre com "(opcional)".
- **Distâncias:** de Campo Grande (cidade) ou de Dourados até o hotel: **[confirmar distância]**; na dúvida, "Bonito fica logo ali", sem número.
- **Frio sem prometer calor:** piscina **climatizada**, hidromassagem **aquecida**, sauna a vapor, ar-condicionado **quente e frio** em todas as acomodações, das 7h às 22h; nunca "quentinho garantido". Não há foto de frio no banco: a estação vai no texto.
- **M5 e M6 só de 16/05 a 10/06.** M1 a M4 nunca falam de mês.
- Não mostrar Cabana Casal nem Tripla em peça com criança (não acomodam menores de 5 anos).

| AD | Persona | Ângulo | Formato | Gancho (1º quadro, 0 a 3 s) | Foto do inventário (arquivo, início do ID) |
|---|---|---|---|---|---|
| **M1** | 55+ / aposentados | **Esticar:** quem pode escolher o dia vem no domingo e volta na terça; o hotel fica mais tranquilo de domingo a quinta; café incluso, piscina climatizada, hidromassagem aquecida e sauna das 7h às 22h | carrossel (5) | "Domingo a terça, *sem* **pressa** de voltar" | `cabana_master_varanda_cadeiras (1r0GZ4)` · `piscina (13dzTW)` · `espaco_relaxamento_spa_hidro_externa (1iL6CV)` · `area_espaco_relaxamento_sauna (1O9epH)` · `imagem_redario_casal_sorrindo (1EkScr)`. Sem falar de acessibilidade nem de almoço |
| **M2** | Casais | **Esticar o fim de semana de sempre:** as 2 noites viram domingo a terça; segunda e terça com a programação inclusa com monitor | imagem | "E se o **fim de semana** fosse de *domingo a terça*?" | `Cabana Master / cabana_master_varanda _balanco (1hx24E)` (também no V1, que não roda em MS) |
| **M3** | Jovens aventureiros (quem tem folga no meio da semana) | **Folga na segunda = dia de rio:** arco e flecha (8h30), trilha com tirolesa e SUP (14h), caiaque (15h30), inclusos, "os horários podem variar conforme a temporada"; arvorismo e boia cross **(opcionais)**, segurança em primeiro lugar | vídeo de fotos 9:16 (ou carrossel 4:5) | "Folga na **segunda**? Segunda é *dia de rio*" | `imagem_standup_formosinho_mulher (1E3nBm)` · `imagem_caiaque_rio_formoso (1VLR1u)` · `imagem_arco_flecha_mulher_sorrindo (1fbDfq)` · `Arvorismo / arvorismo_tirolesa_vista_externa_close_pessoa (1L8G1W)` · `Boia Cross / boia_close_adultos_sorrindo (18liRI)` |
| **M4** | Todas (Casais e 55+ à frente) | **O hotel é o passeio:** para quem é de MS e já fez os passeios da cidade, a volta é pelo hotel: dois rios, 40 hectares, decks, redário, programação inclusa | carrossel (5) | "Você já **fez** os passeios. Agora o *passeio* é o hotel" | `imagem_area_caiaque_rio_formoso (16g-Ga)` · `imagem_deck_rio_formosinho (1LzEkM)` · `imagem_redario_balneario_rio_formosinho (1jimO_)` · `imagem_tirelosa_formosinho_casal (1oNPVm)` · `piscina (1hkm1s)`. O texto não fala da cor da água |
| **M5** *(16/05 a 10/06)* | Casais | **Fim de semana curto no frio:** hidromassagem aquecida, sauna, piscina climatizada e a cabana com ar quente e frio; café incluso | carrossel (5) | "Esfriou? A **hidro** está *aquecida*" | `espaco_relaxamento_spa_hidro_externa (1BqjEq)` · `area_espaco_relaxamento_sauna (1tv2Uh)` · `piscina (1WkaPv)` · `Cabana Master / cabana_master_interna_ambiente_casal (1EdQA5)` · `casal_cafe_manha (14kua8)` |
| **M6** *(16/05 a 10/06)* | Famílias (2ª: 55+) | **Fim de semana curto em família, no frio:** piscina climatizada, playground, Bangalô Especial para até 4 com ar quente e frio; check-out até 13h e a estrutura continua liberada depois | carrossel (4) | "Frio lá fora, **piscina** *climatizada* aqui dentro" | `Infraestrutura / piscina (1wy7Eb)` · `Bangalô Especial / bangalo_especial_area_com_rede (1xXd9J)` · `bangalo_especial_interna (1bh-GK)` · `play_ground (1fikC1)`. **Não há recreação infantil** |

### 5.2 D1 a D5: 1ª quinzena de dezembro, rodízio da MS de 11 a 28/11/2026
**Estadia:** 01 a 15/12/2026, prioridade de domingo a quinta. **Venda:** 11 a 28/11 (15 a 20 dias antes; a pausa das férias começa em 29/11). **Réguas:** baixa + início das chuvas: sem promessa de água cristalina. Sem Natal, Réveillon, preço ou "últimas vagas". Linguagem de quem é do estado ("antes da correria de fim de ano, Bonito fica logo ali") e convite a **esticar até terça**; D4 é o carro-chefe. SP e o resto do Brasil já recebem essas datas em outubro, pela Fora (P + V). Mensagem pronta: "Sou de [cidade] e quero datas na 1ª quinzena de dezembro. #D1".

| AD | Persona | Ângulo | Formato | Gancho | Foto do inventário |
|---|---|---|---|---|---|
| **D1** | Casais | Pausa a dois antes da correria de fim de ano: Cabana Master com banheira para 2; decoração **(opcional)** | imagem | "Antes da *correria*, **uma pausa** a dois" | `cabana_master_banheira (1Kpp5M)` |
| **D2** | 55+ (2ª: Casais) | Com a chuva, a mata fica mais verde; piscina climatizada, hidromassagem aquecida e sauna das 7h às 22h | carrossel (5) | "Com a chuva, a **mata** fica *mais verde*" | `imagem_redario_balneario_rio_formosinho (1jimO_)` · `piscina (1WkaPv)` · `espaco_relaxamento_spa_hidro_externa (1bayxD)` · `area_espaco_relaxamento (1Q2jhE)` · `imagem_deck_balneario_formosinho (1riWSE)` |
| **D3** | Jovens aventureiros (2ª: Casais) | O calor pede rio: boia cross **(opcional)**, 5 anos e 1,15 m | vídeo (ou imagem) | "O **calor** pede *rio*" | Vídeo da produtora ou `boia_close_adultos_sorrindo (18liRI)` |
| **D4** | Casais e 55+ | Um dia inteiro já incluso, com monitor; "os horários podem variar conforme a temporada" | carrossel (5) | "Um dia **inteiro** *já incluso*" | `casal_cafe_manha (1BHhSN)` · `imagem_arco_flecha_mulher_sorrindo (1fbDfq)` · `imagem_standup_rio_formoso_mulher (1Mt4QV)` · `imagem_caiaques_sem_pessoas (11CIuu)` · `imagem_deck_balneario_formosinho (1X1mqX)` |
| **D5** | Casais | Chuva no telhado, rede na varanda: Cabana Casal elevada a 3 m | imagem | "Chuva no *telhado*, **rede** na varanda" | `cabana_casal_01_varanda (1ieD_L)`. Não acomoda menores de 5 anos |

---

## 6. Criativos da Fora do estado (`perm-fora-do-estado`)
Todos com CTA "Enviar mensagem" (WhatsApp de reservas (67) 99117-1648) e "valores com desconto para quem reserva direto". Nenhum preço. Nenhum mês no texto (menos os J, que falam de férias sem citar feriado). Todas as fotos do banco são autorizadas (dono, 27/09/2026); o Designer abre cada foto antes de usar.

### 6.1 P01 a P12: prospecção (baixa, domingo a quinta; base das janelas de ouro)
| AD | Persona | Ângulo | Formato | Gancho (texto da arte, 1º quadro) | Foto do banco (arquivo, início do ID) ou vídeo |
|---|---|---|---|---|---|
| **P01** | Casais | Contemplação: cabana de madeira elevada a 3 m, varanda com rede (reaproveita o carrossel Cabana Casal v3) | carrossel (5) | "Aqui, a *pressa* **fica** no chão" | `cabana_casal_01_externa (1_Cf1Q)` · `cabana_casal_03_externa (1XMr0j)` · `cabana_casal_03_varanda (1_0gOD)` · `cabana_casal_01_interna (10Q-Yd)` (pétalas = "decoração especial (opcional)") · `cabana_casal_01_eterna (1tq2O3)`. Não acomoda menores de 5 anos |
| **P02** | Casais | Cabana Master, 85 m², a única com banheira de hidromassagem para 2 | imagem | "Uma quarta a dois, *sem* **pressa**" | `Cabana Master / cabana_master_banheira (1yyTKu)` |
| **P03** | Casais (2ª: Aventureiros) | Custo-benefício: programação diária com monitor na diária; "Melhor custo-benefício de Bonito" (frase aprovada) | vídeo | "Terça-feira, **8h30**, na *mira*" | Vídeo da produtora ou plano B: `imagem_arco_flecha_mulher_atirando (1nG8A1)` · `imagem_tirelosa_formosinho_casal (1oNPVm)` · `imagem_caiaque_rio_formoso (1VLR1u)` · `imagem_standup_formosinho_casal (1iYdKL)` · `imagem_deck_balneario_formosinho (17YGi-)` |
| **P04** | 55+ | Tranquilidade de domingo a quinta; piscina climatizada, hidromassagem aquecida e sauna das 7h às 22h; Bangalô que não divide paredes | carrossel (5) | "Domingo a quinta, no *ritmo* **seu**" | `piscina (13dzTW)` · `espaco_relaxamento_spa_hidro_externa (1iL6CV)` · `area_espaco_relaxamento_sauna (1tv2Uh)` · `imagem_casal_caminhando_trilha (1NnMQQ)` · `bangalo_quadruplo_varanda_com_rede (1c3Ru5)` |
| **P05** | Todas | "O único hotel de Bonito cercado por dois rios", 40 hectares | imagem | "Entre **dois** *rios*" | `imagem_drone_caiaque_rio_formoso (10EvC_)`. Sem falar da cor da água (menos na versão "seca", como fato do destino) |
| **P06** | Eco-consciente | Coleta seletiva, compostagem, nenhum copo descartável, biólogo na gestão; fauna | imagem | "Aqui, os **primeiros** *moradores* são eles" | `animal_cutia (1AdK8O)` (reserva: `animal_macaco_prego (1llYUU)`). Sem prometer avistamento |
| **P07** | Famílias | Aventura sem sair do hotel; boia cross e arvorismo (opcionais, 5 anos e 1,15 m); playground | carrossel (5) | "A *aventura* mora **aqui** dentro" | `boia_close_crianca (18ZtbxgB)` · `arvorismo_estacao_crianca (1cNHeX)` · `play_ground_criancas (15dgI8)` · `piscina (1hkm1s)` · `bangalo_especial_area_com _rede (1mKjyI)`. Sem recreação infantil. Roda só nas férias de julho |
| **P08** | Jovens aventureiros | Arvorismo (opcional): 18 obstáculos + 2 tirolesas, a última aquática | imagem | "**18** obstáculos e o *Formoso* lá embaixo" | `arvorismo_tirolesa_vista_externa_close_pessoa (1L8G1W)` |
| **P09** | Jovens aventureiros (2ª: Famílias acima de 5 anos) | Boia cross (opcional): 1.200 m de corredeiras e cachoeiras | vídeo (ou imagem) | "**1.200** metros de *corredeira*" | Vídeo da produtora; plano B `boia_adulto_cachoeira (1wDyWd)` ou `boia_drone (1yZX3k)` |
| **P10** | 55+ e Casais | "Fica longe?": 6 km do centro, acesso em asfalto, 8 km do aeroporto | imagem | "Longe da **pressa**, a *6 km* do centro" | `recepcao_externa (1srwNX)` (reserva: `recepcao_lago (15DZs9)`) |
| **P11** | Casais (2ª: 55+) | "Uma quarta-feira em cinco sentidos" | carrossel (5) | "Uma quarta em **cinco** *sentidos*" | `cafe_manha_detalhe_cesta_frutas (1VVhs7)` · `espaco_relaxamento_spa_hidro_externa (132BgB)` · `imagem_deck_rio_formosinho (1LzEkM)` · `area_espaco_relaxamento_sauna (1O9epH)` · `imagem_redario_mulher_sorrindo (1DFdy_)` |
| **P12** | Casais e 55+ | "Uma quarta-feira qualquer entre dois rios" | vídeo | "Uma quarta-feira *qualquer*" | Vídeo da produtora ou plano B: `casal_cafe_manha (1JrEIf)` · `cabana_triplo_varanda_com_rede (1Tiqig)` · `imagem_pergolado_balneario_formosinho (1zg_cs)` · `imagem_redario_casal_sorrindo (1EkScr)` · `piscina (1VxqQZ)` |

### 6.2 V1 a V5: voo direto (no conjunto 1 no mês normal; no conjunto 2, SP/Campinas, nas pausas longas da MS)
**Fatos (`destino-bonito.md` §5, pesquisa de 27/09/2026, conferir a cada 3 meses):** Azul de Viracopos (terça, quinta e domingo), Gol de Congonhas (terça, sábado e domingo), Latam de Guarulhos (quarta, sexta e domingo; 3 por semana a partir de 25/10/2026). O hotel fica a 8 km do aeroporto, de táxi ou carro alugado; **não há transfer do hotel**. Check-in a partir das 15h; check-out até 13h, com a estrutura liberada depois.

**Regras:** companhias, origens e dias só com "[confirmar malha vigente]" no rascunho; nunca preço de passagem, "voo incluso", parceria, logos ou "transfer"; sem foto de avião (não há no banco; nada de IA). V1, V4 e V5 falam de domingo a quinta: só rodam quando a estadia vendida é baixa; V2 e V3 servem também para as férias.

| AD | Persona | Ângulo | Formato | Gancho | Foto do inventário |
|---|---|---|---|---|---|
| **V1** | Casais (2ª: 55+) | Voo de domingo → 4 noites → voo de quinta [confirmar malha vigente] | carrossel (5) | "**Domingo** a quinta, *voando* direto" | `cabana_master_varanda _balanco (1hx24E)` · `casal_cafe_manha (12B8bP)` · `imagem_tirelosa_formosinho_casal (1oNPVm)` · `espaco_relaxamento_spa_hidro_externa (1bayxD)` · `imagem_redario_mulher_sorrindo (105qsG)` |
| **V2** | Todas | "8 km do aeroporto", de táxi ou carro alugado | imagem | "Do **avião** à *rede*: 8 km" | `cabana_casal_01_varanda (1ieD_L)` (reserva: `cabana_triplo_varanda_com_rede (1Tiqig)`) |
| **V3** | Casais e Aventureiros | "Sai de Campinas, Congonhas ou Guarulhos" | imagem | "Sai de *Campinas*, **Congonhas** ou Guarulhos" | `imagem_drone_caiaque_rio_formoso (10EvC_)` |
| **V4** | 55+ (2ª: Casais) | Quem pode escolher o dia, vem no domingo | carrossel (5) | "Quem **pode** escolher, *vem* no domingo" | `cabana_master_varanda_cadeiras (1r0GZ4)` · `piscina (1JLKLY)` · `area_espaco_relaxamento_sauna (1tv2Uh)` · `imagem_casal_observando_natureza (1AbONV)` · `imagem_redario_casal_sorrindo (1EkScr)` |
| **V5** | Jovens aventureiros (2ª: Casais) | "Chega domingo, segunda já está no rio"; opcionais marcados | vídeo de fotos 9:16 (ou carrossel 4:5) | "Pousa **domingo**. Segunda, *no rio*" | `imagem_standup_formosinho_casal (1iYdKL)` · `imagem_caiaque_rio_formoso_mulher (1EGIkZ)` · `imagem_arco_flecha_casal (1sO8Ca)` · `arvorismo_tirolesa_vista_externa_close_pessoa (1L8G1W)` · `boia_close_adultos_sorrindo (18liRI)` |

*M1 e V4 usam a mesma foto (`1r0GZ4`) e M2 e V1 a mesma (`1hx24E`): MS e Fora não se cruzam, então ninguém vê as duas.*

### 6.3 J1 a J5: férias (Fora de 01/11 a 16/12/2026 e de 16/05 a 15/06/2027)
**Estadia:** férias de janeiro (e fim de dezembro), fora das datas do pacote de Réveillon (29/12 a 02/01); em 2027, também as férias de julho (sem J2). **Réguas:** **alta**; em janeiro, chuva e calor; em julho, seca e frio. Público fora do estado: nas férias, o perfil fica parecido com o do destino (SP ~30%, PR, RJ, RS, SC, MG; OTEB, ago/2026). J5 sobe de importância: quem vem de fora fica mais noites e combina os passeios da cidade com o hotel. Sem recreação infantil; idades mínimas das atividades inclusas [a confirmar com o dono].

| AD | Persona | Ângulo | Formato | Gancho | Foto do inventário |
|---|---|---|---|---|---|
| **J1** | Famílias | Férias com a agenda pronta: programação diária inclusa com monitor ou guia | carrossel (5) | "Férias com a *agenda* **pronta**" | `imagem_arco_flecha_guia_mulher (1W8swZ)` · `imagem_tirelosa_formosinho_homem (1oFEG8)` · `imagem_atividade_standup_adulto_rio_formosinho (1G0i-V)` · `imagem_caiaque_rio_formoso_mulher (11kdRW)` · `imagem_deck_balneario_rio_formosinho (1Im-BhO)` |
| **J2** *(só dez/jan)* | Famílias | Choveu? As férias continuam: piscina climatizada, hidromassagem aquecida, salão de jogos, playground | imagem | "Choveu? As **férias** *continuam*" | `piscina (1wy7Eb)` (reserva: `play_ground (1fikC1)`) |
| **J3** | Famílias | A família toda no mesmo lugar: Bangalô Especial para até 4; Cabana Master e Conjugado para até 5; crianças até 5 anos não pagam na cama dos pais | carrossel (5) | "A **família** toda, *no mesmo* lugar" | `bangalo_especial_area_com_rede (1xXd9J)` · `bangalo_especial_interna (1Ro_o5)` · `conjugado_externa (1jPdT5)` · `conjugado_interna_piso_inferior_solteiro (1K7sJz)` · `cabana_master_interna_ambiente_camas_solteiro (1z_82u)` |
| **J4** | Famílias com filhos a partir de 5 anos (2ª: Aventureiros) | Arvorismo e boia cross, **opcionais**, com guias; 5 anos e 1,15 m | carrossel (4) | "Com **5 anos** e 1,15 m, *já dá*" | `arvorismo_condutor_equipando_cliente (1T_TCt)` · `arvorismo_estacao_crianca (1654o4)` · `boia_briefing_inicial (1IPZ-w)` · `boia_close_crianca (1Z_VrcE)` |
| **J5** | Famílias (2ª: Casais) | Base para as férias: 6 km do centro, asfalto, 8 km do aeroporto; passeio de manhã, rio do hotel à tarde | imagem | "Passeio de **manhã**, *rio do hotel* à tarde" | `imagem_area_balneario_formosinho (16xoP5)` (reserva: `recepcao_lago (15DZs9)`) |

*M6 e J2 usam a mesma piscina (`1wy7Eb`), em épocas e regiões diferentes.*

### 6.4 Janelas de ouro 2027 (rodízio da Fora, sem criativo novo)
- **Janela 1:** venda **15/03 a 15/05/2027** → estadia **maio e junho** (seca + baixa), domingo a quinta.
- **Janela 2:** venda **16/06 a 15/08/2027** → estadia **agosto e setembro** (seca + baixa).
- Ângulo: "águas mais transparentes na seca" (fato do destino, nunca "garantida"), em versões de texto de **P03, P05, P08 e P09**, com P04, P06, P11 e V1, V4 de apoio (seção 4). A Marketing escreve as versões em fev/2027 (janela 1) e revisa em mai/2027 (janela 2).

---

## 7. Remarketing (`perm-remarketing`): 4 criativos de decisão
| AD | Persona | Ângulo | Formato | Gancho | Foto |
|---|---|---|---|---|---|
| R1 | Todas | Prova social: Google 4,7 (1.015) · Booking 9,3 (318) · TripAdvisor 4,5 (349), **set/2026** | imagem | "**4,7** no Google, com *mais de mil* avaliações" | `imagem_redario_casal_sorrindo (1EkScr)` |
| R2 | Todas | O que está na diária + desconto para quem reserva direto | carrossel (5) | "O que já *vem* na **sua** diária" | `casal_cafe_manha (12qEQI)` · `piscina (1JLKLY)` · `imagem_arco_flecha_casal (1sO8Ca)` · `imagem_caiaque_rio_formoso_mulher (1EGIkZ)` · `area_espaco_relaxamento_academia (1iqJ9n)` |
| R3 | Casais e 55+ (serve muito a MS) | "Não acho vaga": troque o fim de semana por domingo a quinta, sem prometer vaga | imagem | "E se a **viagem** fosse numa *terça*?" | `imagem_balneario_formosinho_deck_rede (1zW97n)` |
| R4 | Todas | Baixa temporada, reserva sem aperto: desconto direto, sinal de 50%, até 6x, reembolso integral com 30 dias [confirmar política vigente]. **Pausado de 29/11 a 26/01 e de 11/06 a 16/07** (férias não são baixa) | imagem | "Baixa temporada, **reserva** *sem aperto*" | `imagem_casal_observando_natureza (1AbONV)` |

---

## 8. Medição e rotina

### O que precisa estar configurado (antes de 06/10)
| Item | Status |
|---|---|
| Conta de anúncios, Página, Instagram e **WhatsApp Business** conectados | [a confirmar com o dono] |
| **Limite de gastos da conta** (sugestão: R$ 1.500/mês), definido por você | [a confirmar com o dono] |
| **Localização MS:** Campo Grande e Dourados com raio do entorno; excluir Bonito e vizinhas | raio e lista de vizinhas [confirmar no Gerenciador e com você] |
| **Localização Fora:** conjunto 1 = Brasil excluindo MS; conjunto 2 = 3 pins com ~40 km (Guarulhos, Congonhas, Viracopos) | [confirmar no Gerenciador] |
| **Orçamento por conjunto** na Fora do estado | configurar na subida |
| **Públicos personalizados** (engajou em 365 dias; viu 50% dos vídeos) | criar agora, de graça |
| **Mensagem pronta com código** (#M1 a #M7, #D1 a #D5, #P01 a #P12, #V1 a #V5, #J1 a #J5, #R1 a #R4) | a Marketing escreve na Fase 2 |
| **Planilha da recepção:** data do contato · código · qualificada (data + nº de pessoas + idades das crianças) · **cidade de origem** · noites e dias da semana pedidos · **antecedência** (dias entre o contato e o check-in) · vem de avião? · virou reserva? · valor | [a confirmar com o dono] |
| Pixel / API de conversões no Silbeck + UTM | [a confirmar com o dono] |
| **Tempo de resposta** no WhatsApp | meta [a definir pelo dono] |
| **Lembrete das pausas da MS** (seção 2.2) na agenda de quem opera a conta; pausar e religar sempre com o seu OK | configurar na aprovação |

### Rotina
| Quando | O que olhar | O que fazer |
|---|---|---|
| **3 a 5 dias** após cada início ou volta (09 a 11/10 Fora; 22 a 24/10 MS; 04 a 06/11 J; 14 a 16/11 D; 02 a 04/12 conj. 2; 20 a 22/12 P de verão; 30/01 a 01/02 MS volta) | Gasto, conversas com código, reprovação, WhatsApp quebrado | Não mexer (aprendizado), salvo erro: pausar e avisar você no mesmo dia |
| **Semanal** (segunda, blocos de 7 dias: 13/10, 20/10…) | Custo por conversa e % qualificada por anúncio · CTR · frequência · retenção de 3 s · dias da semana pedidos nas conversas de MS | **Pausar:** custo por conversa ≥ 2× a média, gasto ≥ 2× o custo médio sem conversa, ou conversas que nunca qualificam. **Reforçar:** variação do mesmo ângulo |
| **4 semanas** após a MS entrar | **Antecedência real de MS e de fora** (a planilha confirma ou não os 15 a 20 e os 45 a 50 dias) | Se mudar, recalculo as datas de pausa e de rodízio |
| **30 dias** após a MS entrar | Custo por conversa qualificada: MS × Fora | Critério de revisão (seção 2.1), com o seu OK |
| Checagem de ocupação (16/11 e 30/11) | 1ª quinzena de dezembro e janeiro | D ou J saem se as datas estiverem cheias; verba não é gasta sem o seu OK |
| Trimestral | Malha de voos | Ajustar V1, V3 e V4 |
| **Mensal** (1º dia útil) | Reservas por código e origem · % de reservas de MS e de fora · noites médias por origem · % de domingo a quinta · custo por reserva [a medir] | Reaprovar o mês seguinte com você; registrar em `social/anuncios/README.md` |

### O que NÃO dá para concluir sem UTM, código e a pergunta "como nos conheceu?"
- Que o anúncio trouxe a reserva (pode ter ido por agência ou OTA).
- Se o anúncio de MS **esticou** a estadia ou só vendeu o fim de semana que já viria.
- Custo por reserva e retorno: só custo por conversa.
- Qual persona compra: a Meta mostra quem clicou, não quem reservou.

---

## 9. Pedidos à equipe (depois do seu OK)
- **Marketing (`marketing-anuncios`):** **até 01/10:** M1 a M4 (linguagem de quem é do estado, "nós", "Bonito fica logo ali"; distâncias de cidades com "[confirmar distância]"; sem preço, sem prometer vaga; opcionais marcados) + roteiro de M3 (0 a 3 s, 15 a 30 s, 9:16) + V1 a V5 + P01, P02, P04, P05, P10 + R1 a R4. **Até 20/10:** D1 a D5 (MS) + J1 a J5 (fora do estado). **Até 01/12:** P06, P11, P12. **Até 10/02/2027:** P03, P08, P09 + versões "seca" de P03, P05, P08 e P09 (janela 1). **Até 30/04/2027:** M5, M6 + J1, J3, J4, J5 e P07 revisados para julho. Formato: texto principal até ~125, título até ~40, descrição até ~30, com a contagem + mensagem pronta com código. Obrigatório: nada de feriado, Natal, Réveillon, concorrente ou urgência; nada de água cristalina de dezembro a março; janeiro e julho nunca como "baixa"; nada de recreação infantil.
- **Designer (`designer-criativos`):** cada peça em `feed45` (1080 × 1350) e `story` (1080 × 1920). **Até 04/10:** MS: 1 imagem (M2) + 2 carrosséis (M1, M4) + 1 vídeo de fotos 9:16 (M3, com carrossel 4:5 de reserva); Fora: V (2 imagens + 2 carrosséis + 1 vídeo de fotos) + P (3 imagens: P02, P05, P10; 2 carrosséis: P01, P04); remarketing: 3 imagens + 1 carrossel. **Até 25/10:** D (3 imagens + 2 carrosséis) e J (2 imagens + 3 carrosséis). **Até 08/12:** P06 (imagem), P11 (carrossel), P12 (plano B). **Até 25/02/2027:** P03 (plano B), P08, P09 + ganchos das versões "seca". **Até 05/05/2027:** M5, M6 (carrosséis) e P07. Gancho legível no 1º quadro (0 a 3 s); só fotos reais; em M5 e M6, a estação vai no texto.
- **Você → produtora:** vídeo da boia cross (P09, D3) e Reels 1 e 4 de outubro (P03, P12). Se houver gravação em maio ou junho: hidromassagem e sauna em uso num dia frio (1º quadro de M5 e M6).

## 10. A confirmar com o dono (para depois)
1. **Há condição para quem estica até terça** ou para a 1ª quinzena de dezembro? Sem isso, nenhum anúncio fala de preço (e eu não defino preço).
2. A equipe de reservas pode anotar **cidade de origem, noites, dias da semana e antecedência** de cada conversa?
3. Raio do entorno de Campo Grande e Dourados e a lista de municípios vizinhos de Bonito a excluir.
4. Distâncias de Campo Grande (cidade) e de Dourados até o hotel, se quiser usá-las nos anúncios.
5. Marcas regionais que você gosta de ver na comunicação para MS (expressões, hábitos).
6. Ocupação atual da 1ª quinzena de dezembro, de janeiro e de domingo a quinta em novembro.
7. Idade mínima das atividades inclusas (J1); política de cancelamento e parcelamento (R4); o Silbeck aceita pixel e UTM?
8. Tarifário de alta e baixa, para ajustar as janelas de 2027.
9. Teste pequeno para não hóspedes da região (boia cross e arvorismo)? Fora do teto; só com a sua decisão.
10. Malha de voos (dias de volta; chegada no domingo a tempo do check-in).

## 11. Autorrevisão
- [x] Objetivo ligado a indicadores do hotel (ocupação de domingo a quinta, da baixa e de maio/junho; reservas diretas)
- [x] Duas réguas: janelas de ouro = seca + baixa; dezembro a março com chuva (sem água cristalina); janeiro e julho = alta; maio/junho com frio (aconchego sem prometer calor)
- [x] Duas antecedências separadas: MS 15 a 20 dias × fora 45 a 50 dias (dono, 27/09/2026); cada rodízio posicionado pela estadia que vende
- [x] Estrutura só com 3 permanentes (MS + Fora + Remarketing); sem campanhas pontuais nem de feriado; pausas da MS com datas e regra explícita
- [x] Voo como criativo na Fora; conjunto SP/Campinas só quando cabe no piso de R$ 20/dia
- [x] Verba ≤ R$ 1.500 em todos os meses, [verba a definir pelo dono], com cenário conservador; nenhum resultado prometido
- [x] Criativos mantidos (M1 a M6, V1 a V5, P01 a P12, R1 a R4, D1 a D5, J1 a J5), só reorganizados; sem preço, sem feriado, opcionais marcados
- [x] Destino: WhatsApp de reservas com mensagem codificada; o que medir e o que configurar
- [x] Post vencedor (M7/P13); qualidade do contato definida; lista de peças para Marketing e Designer
- [x] Nenhum fato do hotel inventado; datas de feriado calculadas do calendário (conferir), férias escolares [a confirmar]; nada de imagem de IA
