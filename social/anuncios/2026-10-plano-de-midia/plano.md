# Plano de mídia paga (Meta Ads): Hotel Cabanas, out/2026 a set/2027 (v2.2)

> **Autor:** Estrategista de Social Media e Tráfego · **Data:** 27/09/2026 · **Skill:** `campanha-anuncios`, Fase 1 · **Status:** PROPOSTA v2.2, aguardando o seu OK (nada foi subido nem ativado).
> **Decisões suas já aplicadas (27/09/2026):** teto de **R$ 1.500 por mês**; **duas camadas** (permanentes + pontuais); gargalo = **domingo a quinta e baixa temporada**; chave da Meta ainda não configurada (subida manual, pelo kit, ou pela API depois); sem pixel nem UTM no motor; **sem campanha de feriado, Réveillon ou Carnaval**; pontuais da **1ª quinzena de dezembro** e das **férias de janeiro** mantidas; campanha de **voo direto** (SP/Campinas) mantida.
> **Novo nesta v2.2 (dados seus de 27/09/2026, registrados em `hotel-cabanas.md` §9, "Origem dos hóspedes do Cabanas"):** **40% a 60% dos hóspedes são de MS** (Campo Grande, Dourados e entorno); em **janeiro e julho** cai MS e sobe o público de fora; o hóspede de MS fica **no máximo 2 noites, geralmente no fim de semana**, e **aproveita muito o próprio hotel**; **fins de semana com tempo bom raramente ficam abaixo de 70%**; os piores meses são **maio e junho**, pelo frio (que varia muito). O que mudou:
> - **Entrou** a permanente **`perm-ms-o-hotel-e-o-passeio`** (Campo Grande, Dourados e entorno; Bonito e vizinhas fora), com o ângulo **"esticar para o meio de semana"** (domingo a terça) o ano todo e o ângulo **"fim de semana curto"** só em **maio e junho** e em semanas de tempo ruim.
> - A prospecção do **resto do Brasil** vira **reserva**: não cabe no teto ao lado da MS e da de voo; roda só de 17/12 a 09/01 e os criativos dela abastecem as janelas de ouro (que passam a ser "fora do estado").
> - A pontual da **1ª quinzena de dezembro** passa a falar com **MS** (e vai até 10/12); a de **janeiro** passa a ser **fora do estado**.
> - Decisões pendentes da v2.1 absorvidas: a 1 (início de dezembro) vira a Opção 1 com MS (seção 5); a 2 (pausar as prospecções em novembro) está no calendário; a 3 (voo × resto do Brasil) continua como está, com o resto do Brasil na reserva.
> **Bases:** `meta-ads.md` e `social-e-trafego.md` (Andromeda, 10 a 15 conceitos, conjunto amplo: 26/09/2026, revisar em dez/2026 [confirmar se a regra continua valendo]); caderno Bárbara Bruna (26/09/2026: janela de 7 dias, concentrar verba, qualidade do contato, post vencedor, raio regional); `hotel-operacional.md` (antecedência de 45 a 50 dias; cancelamento; crianças; 8 km do Aeroporto de Bonito e **280 km do Aeroporto de Campo Grande**; não há transfer; check-out até 13h com uso da estrutura depois; piscina, hidromassagem e sauna das 7h às 22h; ar-condicionado quente e frio em todas as acomodações); `hotel-cabanas.md` §9; `destino-bonito.md` §3, §5 e perfil OTEB (ago/2026); `inventario-imagens.md` (27/09/2026); pauta e textos de outubro/2026 (aprovados).

---

## 0. As 2 decisões que preciso de você agora

1. **Aprova a MS no lugar da prospecção do resto do Brasil nos meses normais?** Com R$ 1.500 (R$ 50/dia) e o piso de R$ 20/dia, cabem **duas** campanhas de venda + remarketing. Proponho: **MS + voo SP/Campinas** fora das férias; a do resto do Brasil fica criada e só roda de 17/12 a 09/01 (vendendo fevereiro e março); o resto do Brasil continua sendo alcançado pela pontual de janeiro e pelas janelas de ouro. *Alternativa:* MS + resto do Brasil, com a de voo na reserva (perde o argumento mais concreto para domingo a quinta em SP, a maior praça de fora).
2. **A pontual da 1ª quinzena de dezembro vira MS, de 01/11 a 10/12?** O hóspede de MS mora perto e, muito provavelmente, reserva com menos antecedência que os 45 a 50 dias da média [a confirmar com o dono]; dezembro até o dia 15 é baixa e fora das férias, a época em que MS pesa mais. SP já recebe a venda desse período em outubro, pela campanha de voo. Assim, a **Opção 1** da v2.1 (começar em 01/11) passa a ser a recomendada. *Alternativa:* manter a pontual para o Brasil inteiro, de 13/10 a 30/11 (Opção 2 da v2.1).

---

## 1. Resumo em 3 linhas
- **Objetivo:** encher as noites de **domingo a quinta** e os meses fracos (**maio e junho**, pelo frio; baixa temporada), com reservas diretas pelo WhatsApp de reservas, para mover a **taxa de ocupação** (meta: 60% de média mensal, contra 50% em 2025) e a participação do canal direto. O público principal passa a ser **MS** (40% a 60% dos hóspedes), com a proposta de **esticar o fim de semana até terça**; SP (voo direto) e as pontuais completam.
- **Estadia × venda:** MS vende o meio de semana **das próximas semanas** (antecedência de MS [a medir]); voo e fora do estado vendem ~45 a 60 dias à frente. Dezembro (01 a 15/12): venda **01/11 a 10/12**, para MS. Janeiro/2027: venda **01/11 a 16/12**, fora do estado. Maio e junho: MS com "fim de semana curto" ligado de 16/05 a 30/06.
- **Indicadores:** custo por conversa e % qualificada por anúncio; **% das conversas de MS que pedem domingo a terça** e noites médias das reservas de MS (a medir); ocupação de domingo a quinta, de maio e junho, da 1ª quinzena de dezembro e de janeiro contra 2025 (a medir).

---

## 2. Arquitetura anual

### 2.1 As campanhas
| Camada | Campanha (nome na conta) | Quando roda | Estadia que vende | Público e região | Estrutura |
|---|---|---|---|---|---|
| **Permanente 1 (nova, prioridade)** | `perm-ms-o-hotel-e-o-passeio` | O ano todo, **menos** 01/11 a 09/01 (a pontual de dezembro fala com MS em nov. e início de dez.; depois, estadias de alta) e 01 a 19/07 (férias) | **Domingo a terça** (e o resto da semana) nas próximas semanas; em **maio e junho** e semanas de tempo ruim, também **fim de semana curto** | **Campo Grande e Dourados, cada uma com raio do entorno** (~40 a 50 km [confirmar raio no Gerenciador]); **excluir Bonito e municípios vizinhos** [confirmar a lista, ex.: Jardim, Bodoquena, Guia Lopes da Laguna]; idade e interesses abertos | Engajamento → conversas no WhatsApp de reservas; 1 conjunto; **4 criativos "esticar" sempre ativos + 2 "fim de semana curto" pausados**, ligados só em mai/jun e com o gatilho de tempo ruim (seção 4M) |
| **Permanente 2** | `perm-voo-direto-sp-campinas` | Fora das férias e fora das janelas de ouro (ver 2.3) | **Domingo a quinta** na baixa, ~45 a 60 dias à frente: chega no voo de domingo, volta na quarta ou quinta [confirmar malha vigente] | Pins + raio (~40 km) em Guarulhos, Congonhas e Viracopos [confirmar no Gerenciador] | 1 conjunto, 5 criativos (seção 4B) |
| **Permanente 3 (reserva)** | `perm-prospeccao-meio-de-semana` | Só **17/12/2026 a 09/01/2027** (e quando você decidir); os criativos P01 a P12 abastecem as janelas de ouro | Domingo a quinta de fevereiro (fora do Carnaval) e março | **Brasil, excluindo** os raios de voo, os raios de MS e Bonito e vizinhas | 1 conjunto amplo, 12 criativos (seção 4) |
| **Permanente 4** | `perm-remarketing` | O ano todo, nunca pausa | Todas as datas | Quem interagiu com o Instagram ou o Facebook (365 dias) ou viu os Reels; Brasil | 4 criativos de decisão (R1 a R4) |
| Pontual | `2026-12-primeira-quinzena` | **01/11 a 10/12/2026** | **01 a 15/12/2026** (baixa + início das chuvas), prioridade de domingo a quinta | **MS** (mesmos raios da permanente 1) | 5 criativos (seção 5), com linguagem de MS |
| Pontual | `2027-01-ferias-de-janeiro` | **01/11 a 16/12/2026** | **Janeiro/2027** (alta + chuva), famílias; fora das datas do pacote de Réveillon ([a confirmar com o dono]) | **Fora do estado:** Brasil, excluindo os raios de MS e Bonito e vizinhas | 5 criativos (seção 6) |
| Pontual (futura) | `2027-03-janela-de-ouro-1` | **15/03 a 15/05/2027** | **Maio e junho** (seca + baixa), domingo a quinta | **Fora do estado** (MS já tem a permanente) | Ângulo "águas mais transparentes na seca" (fato do destino, nunca "garantida"); criativos em fev/2027, a partir de P01 a P12 |
| Pontual (futura) | `2027-06-janela-de-ouro-2` | **15/06 a 15/08/2027** | **Agosto e setembro** (seca + baixa) | **Fora do estado** | Idem; criativos em mai/2027 |

**Público e região (o que muda):**
- **MS é prioridade.** 40% a 60% dos hóspedes vêm de lá, com destaque para Campo Grande, Dourados e entorno (`hotel-cabanas.md` §9, dono, 27/09/2026). No destino, MS é só 16,1% (OTEB, jan a ago/2026): o Cabanas é **mais sul-mato-grossense** que Bonito, e isso vira mensagem.
- **Por que localização, se no Meta a segmentação está no criativo** (Andromeda, 26/09/2026 [confirmar se a regra continua valendo]): "estica até terça, sem pegar avião" e a linguagem de quem é do estado só são verdade em MS, assim como o voo direto só é verdade em SP/Campinas. Idade e interesses continuam abertos.
- **Bonito e vizinhas ficam fora** de todas as campanhas de hospedagem: quem mora ali não se hospeda (a boia cross e o arvorismo para não hóspedes seguem como teste à parte, só com a sua decisão, seção 9).
- **SP (voo):** mantida, fora das férias. **Demais estados:** pela pontual de janeiro, pelas janelas de ouro e pela reserva de 17/12 a 09/01.
- **Sem sobreposição:** MS, voo e resto do Brasil excluem os raios umas das outras. Remarketing é Brasil (quem já nos conhece).

**Critério de revisão da MS (30 dias após o início, ~05/11):** se as conversas de MS pedirem quase só **sábado** (que já enche com tempo bom) e não domingo a terça, a Marketing troca os ganchos; se o custo por conversa qualificada ficar acima do dobro do da campanha de voo, a verba de MS volta a ser dividida com o resto do Brasil, com o seu OK.

**Conta de antecedência:**
| Estadia | Público | Pico de reserva | Veiculação proposta |
|---|---|---|---|
| 01 a 15/12 | MS | antecedência de MS [a medir]; provável nas semanas anteriores | 01/11 a 10/12 (pontual de dezembro) |
| 01 a 15/12 | SP | 12/10 a 31/10 (45 a 50 dias) | outubro, pela campanha de voo |
| 04 a 31/01 | Fora do estado | 15/11 a 16/12 | 01/11 a 16/12 |
| Fevereiro (fora do Carnaval) e março | Fora | 17/12 a meados de fev. | voo e resto do Brasil a partir de 17/12 |
| Fevereiro | MS | [a medir] | MS volta em 10/01 |
| Maio e junho | MS | [a medir] | MS o ano todo; "fim de semana curto" de 16/05 a 30/06 |
| Maio e junho / agosto e setembro | Fora | 12/03 a 16/05 / 12/06 a 16/08 | janelas de ouro, fora do estado |

### 2.2 Regra anual: MS × fora do estado
**Duas antecedências:** o público de fora reserva ~45 a 60 dias antes (média do hotel); o de MS, provavelmente mais perto da data [a confirmar com o dono]. Por isso a verba de MS acompanha **a estadia do próprio mês**; a de fora, **a estadia de dois meses depois**.

| Época de veiculação | O que vende | MS | Fora do estado | Por quê |
|---|---|---|---|---|
| **Fora das férias** (fev a abr, ago a out) | Domingo a quinta na baixa | **≥ 50%** da verba de venda; ângulo "esticar" (domingo a terça) | Voo SP/Campinas, ou a janela de ouro na sua janela | MS é 40% a 60% dos hóspedes e o fim de semana dele já enche |
| **Maio e junho** (piores meses, frio) | Meio de semana **e** fim de semana curto | **~70% a 75%**; M5 e M6 ligados de 16/05 a 30/06 | Só a janela de ouro (voo pausa: vende julho, que é alta) | Frio derruba o fim de semana de MS; aconchego vira argumento |
| **Novembro e início de dezembro** | 1ª quinzena de dez. (MS) e janeiro (fora) | ~50% via pontual de dezembro, até 10/12 | ~50% via pontual de janeiro | Duas estadias diferentes, dois públicos |
| **10/12 a 09/01** | Janeiro (alta) e fev./mar. | **Pausada** | **~100%** (pontual de janeiro até 16/12; voo e resto do Brasil a partir de 17/12) | Em janeiro, cai MS e sobe fora (dono, 27/09/2026) |
| **01 a 19/07** | Julho (alta) | **Pausada** (volta em 20/07 vendendo agosto) | Janela de ouro 2 | Mesmo motivo de janeiro |

**Gatilho de tempo ruim (qualquer mês fora das férias):** toda segunda-feira eu olho a previsão do fim de semana em Bonito [fonte a combinar]; se vier frio forte ou chuva, **peço o seu OK** para ligar M5 e M6 de terça a sábado, **dentro da mesma verba da MS** (sem aumento). Só funciona se o hóspede de MS reservar com poucos dias de antecedência [a medir nas 4 primeiras semanas]; se não reservar, o gatilho sai do plano.

**Regras de verba (mantidas da v2.1, ajustadas):**
1. **Piso:** nenhuma campanha de venda abaixo de **R$ 20/dia**; o que não chega ao piso não liga (concentrar, caderno Bárbara Bruna, 26/09/2026).
2. **No máximo duas campanhas de venda ao mesmo tempo** + remarketing (R$ 50/dia só comporta isso). Em maio e junho, MS sobe para R$ 30/dia.
3. Remarketing entre R$ 7 e R$ 10/dia, **nunca pausa**; frequência acima de ~4 em 7 dias = R$ 7/dia ou criativos novos.
4. **O teto não é meta:** o que sobrar não passa para o mês seguinte sem o seu OK. Orçamento **total por campanha, com data de fim**; mudanças de até ~20% por vez, sempre com o seu OK. Sugestão: **limite de gastos da conta** em R$ 1.500/mês, definido por você.

### 2.3 Calendário do ano (veiculação; cada mês é reaprovado com os números do anterior)
| Mês | MS permanente | Voo SP/Campinas | Resto do Brasil | Pontual(is) | Remarketing | Total | MS × fora (verba de venda) |
|---|---|---|---|---|---|---|---|
| out/26 | R$ 650 (25/dia, 06 a 31) | R$ 572 (22/dia) | — | — | R$ 260 | **R$ 1.482** | 53% × 47% |
| nov/26 | pausada | pausada | — | dez. MS R$ 600 + jan. fora R$ 600 | R$ 300 | **R$ 1.500** | 50% × 50% |
| dez/26 | pausada | R$ 300 (17 a 31) | R$ 300 (17 a 31) | dez. MS R$ 200 (01 a 10) + jan. R$ 320 (01 a 16) | R$ 310 | **R$ 1.430** | 18% × 82% |
| jan/27 | R$ 440 (10 a 31) | R$ 620 | R$ 180 (01 a 09) | — | R$ 248 | **R$ 1.488** | 35% × 65% |
| fev/27 | R$ 616 (22/dia) | R$ 560 | — | — | R$ 280 | **R$ 1.456** | 52% × 48% |
| mar/27 | R$ 620 | R$ 280 (01 a 14) | — | janela 1 R$ 340 (15 a 31) | R$ 248 | **R$ 1.488** | 50% × 50% |
| abr/27 | R$ 600 | pausada | — | janela 1 R$ 600 | R$ 300 | **R$ 1.500** | 50% × 50% |
| mai/27 | R$ 780 (20/dia até 15; **30/dia** de 16 a 31, com M5 e M6) | pausada | — | janela 1 R$ 300 (01 a 15) | R$ 310 | **R$ 1.390** | 72% × 28% |
| jun/27 | R$ 900 (30/dia, com M5 e M6) | pausada | — | janela 2 R$ 320 (15 a 30) | R$ 270 | **R$ 1.490** | 74% × 26% |
| jul/27 | R$ 300 (25/dia, 20 a 31) | pausada | — | janela 2 R$ 620 | R$ 310 | **R$ 1.230** | 33% × 67% |
| ago/27 | R$ 620 | R$ 320 (16 a 31) | — | janela 2 R$ 300 (01 a 15) | R$ 248 | **R$ 1.488** | 50% × 50% |
| set/27 | R$ 660 (22/dia) | R$ 600 | — | — | R$ 240 | **R$ 1.500** | 52% × 48% |

*Julho e dezembro ficam abaixo do teto de propósito: a estadia que MS compraria é alta temporada.*

---

## 3. Os próximos 90 dias em detalhe (outubro, novembro e dezembro de 2026) [verba a definir pelo dono]

**Por que é assim:** em outubro, **MS** vende domingo a terça de fim de outubro a início de dezembro e a de **voo** vende domingo a quinta de meados de novembro a meados de dezembro para SP. Em novembro, as duas pontuais: **dezembro para MS** e **janeiro para fora do estado**; MS permanente e voo pausam. Em dezembro, a pontual de MS faz a reta final até 10/12, a de janeiro até 16/12, e a partir de 17/12 **voo e resto do Brasil** vendem fevereiro (fora do Carnaval) e março (começar antes disso venderia a segunda quinzena de janeiro, que já é alta).

**Produção:** plano aprovado até 29/09 → textos de **MS (M1 a M6)**, voo e remarketing 30/09 a 01/10 → artes 02 a 04/10 → subida **pausada** em 05/10 → **ativação em 06/10 com o seu OK**. Dezembro (MS) e janeiro: textos até 20/10, artes até 25/10, subida pausada em 30/10, ativação em **01/11** com o seu OK. Resto do Brasil (P01 a P12): textos até 01/12, artes até 08/12, ativação em 17/12.

| Campanha | Período | R$/dia | Dias | Total | Estadia que vende |
|---|---|---|---|---|---|
| **MS permanente** (M1 a M4) | 06 a 31/10 | 25 | 26 | **R$ 650** | Domingo a terça, fim de out. a início de dez. |
| Voo SP/Campinas | 06 a 31/10 | 22 | 26 | **R$ 572** | Domingo a quinta, meados de nov. a meados de dez. |
| Remarketing | 06 a 31/10 | 10 | 26 | **R$ 260** | Todas as datas |
| **Total de outubro** | | | | **R$ 1.482** | |
| Pontual 1ª quinzena de dezembro (**MS**) | 01 a 30/11 | 20 | 30 | **R$ 600** | 01 a 15/12 |
| Pontual férias de janeiro (**fora do estado**) | 01 a 30/11 | 20 | 30 | **R$ 600** | Janeiro/2027 |
| Remarketing | 01 a 30/11 | 10 | 30 | **R$ 300** | Todas as datas |
| MS permanente, voo, resto do Brasil | pausadas | — | — | R$ 0 | — |
| **Total de novembro** | | | | **R$ 1.500** | |
| Pontual 1ª quinzena de dezembro (MS, reta final) | 01 a 10/12 | 20 | 10 | **R$ 200** | 01 a 15/12 |
| Pontual férias de janeiro (reta final) | 01 a 16/12 | 20 | 16 | **R$ 320** | Janeiro/2027 |
| Voo SP/Campinas | 17 a 31/12 | 20 | 15 | **R$ 300** | Domingo a quinta, fev. (fora do Carnaval) e mar. |
| Resto do Brasil | 17 a 31/12 | 20 | 15 | **R$ 300** | Idem |
| Remarketing | 01 a 31/12 | 10 | 31 | **R$ 310** | Todas as datas |
| **Total de dezembro** | | | | **R$ 1.430** | |

### Cenário conservador (mesmas datas, verba menor)
| Mês | MS | Voo | Resto do Brasil | Pontuais | Remarketing | Total |
|---|---|---|---|---|---|---|
| out/26 | R$ 20/dia = R$ 520 | R$ 20/dia = R$ 520 | — | — | R$ 7/dia = R$ 182 | **R$ 1.222** |
| nov/26 | pausada | pausada | — | R$ 20/dia cada = R$ 1.200 | R$ 7/dia = R$ 210 | **R$ 1.410** |
| dez/26 | pausada | R$ 300 (17 a 31) | não roda | dez. R$ 200 + jan. R$ 320 | R$ 7/dia = R$ 217 | **R$ 1.037** |

**Leitura honesta:** com R$ 20 a R$ 30 por dia e 4 a 6 criativos por campanha, a Meta concentra a entrega em 2 a 3 anúncios; o que não recebeu verba em 7 dias volta no rodízio seguinte. **Nenhum resultado está prometido:** custo por conversa, % qualificada, antecedência e taxa de fechamento de MS são **[a medir]**.

**A conta antes de gastar (para fechar com números reais em 13/10):** conversas = verba ÷ custo por conversa [a medir] → qualificadas = conversas × % qualificada [a medir] → reservas = qualificadas × taxa de fechamento [a medir]. Se a conta não fechar, o problema pode ser a **oferta**: hoje não há condição para quem estica até terça nem para a 1ª quinzena de dezembro ([a confirmar com o dono]; eu não defino preço) ou o **tempo de resposta** no WhatsApp, e não o anúncio. Em janeiro (alta), se a ocupação já estiver alta na metade de novembro, a pontual para e a verba não é gasta sem o seu OK.

**Configuração (todas):** objetivo **Engajamento → Conversas, local da conversão: WhatsApp** [confirmar o nome atual do menu no Gerenciador]; posicionamentos Advantage+; cada anúncio em **4:5 e 9:16**; **mensagem pronta com código** (ex.: "Olá! Sou de Campo Grande e quero datas de domingo a terça. #M1"; "Quero datas de domingo a quinta, vindo no voo direto. #V1"; "Quero datas na 1ª quinzena de dezembro. #D2"; "Quero datas em janeiro para a família. #J1"). Sem hashtags nos anúncios.

---

## 4M. Criativos de MS (`perm-ms-o-hotel-e-o-passeio`)

**Como falar com quem é de MS:** de igual para igual, como quem conhece Bonito e já veio ("você que é daqui", "Bonito fica logo ali", "sem pegar avião"); o argumento é **o hotel é o passeio**: 40 hectares entre o Formoso e o Formosinho, com a programação inclusa com monitor, sem precisar sair. Marcas regionais (expressões, hábitos) a Marketing sugere e **você valida**. Voz "nós". Regras:
- **Sem preço, sem prometer vaga, sem "últimas vagas".** "O hotel fica mais tranquilo de domingo a quinta" é a frase aprovada.
- **Opcionais marcados:** boia cross, arvorismo e decoração especial sempre com "(opcional)".
- **Distâncias:** só "280 km do Aeroporto de Campo Grande" está no contexto. De Campo Grande (cidade) ou de Dourados até o hotel: **[confirmar distância]**; na dúvida, "Bonito fica logo ali", sem número.
- **Frio sem prometer calor:** citar os fatos (piscina **climatizada**, hidromassagem **aquecida**, sauna a vapor, ar-condicionado **quente e frio** em todas as acomodações; das 7h às 22h); nunca "quentinho garantido" nem "temperatura ideal". A foto de frio não existe no banco: a estação vai no texto.
- **M5 e M6 só ligados** de 16/05 a 30/06 e com o gatilho de tempo ruim (seção 2.2). M1 a M4 nunca falam de mês.
- Não mostrar Cabana Casal nem Tripla em peça com criança (não acomodam menores de 5 anos).

| AD | Persona | Ângulo | Formato | Gancho (1º quadro, 0 a 3 s) | Foto do inventário (arquivo, início do ID) |
|---|---|---|---|---|---|
| **M1** | 55+ / aposentados | **Esticar:** quem pode escolher o dia vem no domingo e volta na terça; o hotel fica mais tranquilo de domingo a quinta; café incluso, piscina climatizada, hidromassagem aquecida e sauna das 7h às 22h | carrossel (5) | "Domingo a terça, *sem* **pressa** de voltar" | `cabana_master_varanda_cadeiras (1r0GZ4)` · `piscina (13dzTW)` · `espaco_relaxamento_spa_hidro_externa (1iL6CV)` · `area_espaco_relaxamento_sauna (1O9epH)` · `imagem_redario_casal_sorrindo (1EkScr)`. Sem falar de acessibilidade nem de almoço |
| **M2** | Casais | **Esticar o fim de semana de sempre:** as 2 noites viram domingo a terça; segunda e terça com a programação inclusa com monitor | imagem | "E se o **fim de semana** fosse de *domingo a terça*?" | `Cabana Master / cabana_master_varanda _balanco (1hx24E)` (também no V1, mas em outra região: ninguém vê os dois) |
| **M3** | Jovens aventureiros (quem tem folga no meio da semana) | **Folga na segunda = dia de rio:** arco e flecha (8h30), trilha com tirolesa e SUP (14h), caiaque (15h30), inclusos, "os horários podem variar conforme a temporada"; arvorismo e boia cross **(opcionais)**, segurança em primeiro lugar | vídeo de fotos 9:16 (ou carrossel 4:5) | "Folga na **segunda**? Segunda é *dia de rio*" | `imagem_standup_formosinho_mulher (1E3nBm)` · `imagem_caiaque_rio_formoso (1VLR1u)` · `imagem_arco_flecha_mulher_sorrindo (1fbDfq)` · `Arvorismo / arvorismo_tirolesa_vista_externa_close_pessoa (1L8G1W)` · `Boia Cross / boia_close_adultos_sorrindo (18liRI)` |
| **M4** | Todas (Casais e 55+ à frente) | **O hotel é o passeio:** para quem é de MS e já fez os passeios da cidade, a volta é pelo hotel: dois rios, 40 hectares, decks, redário, programação inclusa | carrossel (5) | "Você já **fez** os passeios. Agora o *passeio* é o hotel" | `imagem_area_caiaque_rio_formoso (16g-Ga)` · `imagem_deck_rio_formosinho (1LzEkM)` · `imagem_redario_balneario_rio_formosinho (1jimO_)` · `imagem_tirelosa_formosinho_casal (1oNPVm)` · `piscina (1hkm1s)`. Fotos da seca: o texto não fala da cor da água |
| **M5** *(só mai/jun e tempo ruim)* | Casais | **Fim de semana curto no frio:** hidromassagem aquecida, sauna, piscina climatizada e a cabana com ar quente e frio; café incluso | carrossel (5) | "Esfriou? A **hidro** está *aquecida*" | `espaco_relaxamento_spa_hidro_externa (1BqjEq)` · `area_espaco_relaxamento_sauna (1tv2Uh)` · `piscina (1WkaPv)` · `Cabana Master / cabana_master_interna_ambiente_casal (1EdQA5)` · `casal_cafe_manha (14kua8)` |
| **M6** *(só mai/jun e tempo ruim)* | Famílias (2ª: 55+) | **Fim de semana curto em família, no frio:** piscina climatizada, playground, Bangalô Especial para até 4 com ar quente e frio; check-out até 13h e a estrutura continua liberada depois (vestiários, duchas, guarda-volumes): o domingo rende | carrossel (4) | "Frio lá fora, **piscina** *climatizada* aqui dentro" | `Infraestrutura / piscina (1wy7Eb)` · `Bangalô Especial / bangalo_especial_area_com_rede (1xXd9J)` · `bangalo_especial_interna (1bh-GK)` · `play_ground (1fikC1)`. **Não há recreação infantil** |

**Distribuição:** 55+ em 2 (M1, M6 2ª) · Casais em 3 (M2, M4, M5) · Aventureiros em 1 (M3) · Famílias em 1 (M6, só no frio: no resto do ano, domingo a terça cai em dia de aula). Formatos: 1 imagem, 4 carrosséis, 1 vídeo de fotos. **Post vencedor:** em 13/10 e 20/10, o orgânico com mais envios por alcance entra como **M7** (com o seu OK).

---

## 4. Criativos da prospecção do resto do Brasil (`perm-prospeccao-meio-de-semana`, reserva: 17/12 a 09/01 e base das janelas de ouro)
Todos com CTA "Enviar mensagem" (WhatsApp de reservas (67) 99117-1648) e "valores com desconto para quem reserva direto". Nenhum preço. Nenhum mês no texto. Todas as fotos do banco são autorizadas (dono, 27/09/2026); o Designer abre cada foto antes de usar.

| AD | Persona | Ângulo | Formato | Gancho (texto da arte, 1º quadro) | Foto do banco (arquivo, início do ID) ou vídeo |
|---|---|---|---|---|---|
| **P01** | Casais | Contemplação: cabana de madeira elevada a 3 m, varanda com rede (reaproveita o carrossel Cabana Casal v3) | carrossel (5) | "Aqui, a *pressa* **fica** no chão" | `cabana_casal_01_externa (1_Cf1Q)` · `cabana_casal_03_externa (1XMr0j)` · `cabana_casal_03_varanda (1_0gOD)` · `cabana_casal_01_interna (10Q-Yd)` (pétalas = "decoração especial (opcional)") · `cabana_casal_01_eterna (1tq2O3)`. Não acomoda menores de 5 anos |
| **P02** | Casais | Cabana Master, 85 m², a única com banheira de hidromassagem para 2 | imagem | "Uma quarta a dois, *sem* **pressa**" | `Cabana Master / cabana_master_banheira (1yyTKu)` |
| **P03** | Casais (2ª: Aventureiros) | Custo-benefício: programação diária com monitor na diária; "Melhor custo-benefício de Bonito" (frase aprovada) | vídeo | "Terça-feira, **8h30**, na *mira*" | Vídeo da produtora ou plano B: `imagem_arco_flecha_mulher_atirando (1nG8A1)` · `imagem_tirelosa_formosinho_casal (1oNPVm)` · `imagem_caiaque_rio_formoso (1VLR1u)` · `imagem_standup_formosinho_casal (1iYdKL)` · `imagem_deck_balneario_formosinho (17YGi-)` |
| **P04** | 55+ | Tranquilidade de domingo a quinta; piscina climatizada, hidromassagem aquecida e sauna das 7h às 22h; Bangalô que não divide paredes | carrossel (5) | "Domingo a quinta, no *ritmo* **seu**" | `piscina (13dzTW)` · `espaco_relaxamento_spa_hidro_externa (1iL6CV)` · `area_espaco_relaxamento_sauna (1tv2Uh)` · `imagem_casal_caminhando_trilha (1NnMQQ)` · `bangalo_quadruplo_varanda_com_rede (1c3Ru5)` |
| **P05** | Todas | "O único hotel de Bonito cercado por dois rios", 40 hectares | imagem | "Entre **dois** *rios*" | `imagem_drone_caiaque_rio_formoso (10EvC_)`. Sem falar da cor da água |
| **P06** | Eco-consciente | Coleta seletiva, compostagem, nenhum copo descartável, biólogo na gestão; fauna | imagem | "Aqui, os **primeiros** *moradores* são eles" | `animal_cutia (1AdK8O)` (reserva: `animal_macaco_prego (1llYUU)`). Sem prometer avistamento |
| **P07** | Famílias | Aventura sem sair do hotel; boia cross e arvorismo (opcionais, 6 anos e 1,15 m); playground | carrossel (5) | "A *aventura* mora **aqui** dentro" | `boia_close_crianca (18ZtbxgB)` · `arvorismo_estacao_crianca (1cNHeX)` · `play_ground_criancas (15dgI8)` · `piscina (1hkm1s)` · `bangalo_especial_area_com _rede (1mKjyI)`. Sem recreação infantil |
| **P08** | Jovens aventureiros | Arvorismo (opcional): 18 obstáculos + 2 tirolesas, a última aquática | imagem | "**18** obstáculos e o *Formoso* lá embaixo" | `arvorismo_tirolesa_vista_externa_close_pessoa (1L8G1W)` |
| **P09** | Jovens aventureiros (2ª: Famílias acima de 6 anos) | Boia cross (opcional): 1.200 m de corredeiras e cachoeiras | vídeo (ou imagem) | "**1.200** metros de *corredeira*" | Vídeo da produtora; plano B `boia_adulto_cachoeira (1wDyWd)` ou `boia_drone (1yZX3k)` |
| **P10** | 55+ e Casais | "Fica longe?": 6 km do centro, acesso em asfalto, 8 km do aeroporto | imagem | "Longe da **pressa**, a *6 km* do centro" | `recepcao_externa (1srwNX)` (reserva: `recepcao_lago (15DZs9)`) |
| **P11** | Casais (2ª: 55+) | "Uma quarta-feira em cinco sentidos" | carrossel (5) | "Uma quarta em **cinco** *sentidos*" | `cafe_manha_detalhe_cesta_frutas (1VVhs7)` · `espaco_relaxamento_spa_hidro_externa (132BgB)` · `imagem_deck_rio_formosinho (1LzEkM)` · `area_espaco_relaxamento_sauna (1O9epH)` · `imagem_redario_mulher_sorrindo (1DFdy_)` |
| **P12** | Casais e 55+ | "Uma quarta-feira qualquer entre dois rios" | vídeo | "Uma quarta-feira *qualquer*" | Vídeo da produtora ou plano B: `casal_cafe_manha (1JrEIf)` · `cabana_triplo_varanda_com_rede (1Tiqig)` · `imagem_pergolado_balneario_formosinho (1zg_cs)` · `imagem_redario_casal_sorrindo (1EkScr)` · `piscina (1VxqQZ)` |

---

## 4B. Criativos da prospecção de voo direto (`perm-voo-direto-sp-campinas`)
**Fatos (`destino-bonito.md` §5, pesquisa de 27/09/2026, conferir a cada 3 meses):** Azul de Viracopos (terça, quinta e domingo), Gol de Congonhas (terça, sábado e domingo), Latam de Guarulhos (quarta, sexta e domingo; 3 por semana a partir de 25/10/2026). Domingo tem as três. O hotel fica a 8 km do aeroporto, de táxi ou carro alugado; **não há transfer do hotel**. Check-in a partir das 15h; check-out até 13h, com a estrutura liberada depois.

**Regras:** companhias, origens e dias só com "[confirmar malha vigente]" no rascunho; nunca preço de passagem, "voo incluso", parceria, logos ou "transfer"; sem foto de avião (não há no banco; nada de IA). Mensagem pronta: "Quero datas de domingo a quinta, vindo no voo direto. #V1".

| AD | Persona | Ângulo | Formato | Gancho | Foto do inventário |
|---|---|---|---|---|---|
| **V1** | Casais (2ª: 55+) | Voo de domingo → 4 noites → voo de quinta [confirmar malha vigente] | carrossel (5) | "**Domingo** a quinta, *voando* direto" | `cabana_master_varanda _balanco (1hx24E)` · `casal_cafe_manha (12B8bP)` · `imagem_tirelosa_formosinho_casal (1oNPVm)` · `espaco_relaxamento_spa_hidro_externa (1bayxD)` · `imagem_redario_mulher_sorrindo (105qsG)` |
| **V2** | Todas | "8 km do aeroporto", de táxi ou carro alugado | imagem | "Do **avião** à *rede*: 8 km" | `cabana_casal_01_varanda (1ieD_L)` (reserva: `cabana_triplo_varanda_com_rede (1Tiqig)`) |
| **V3** | Casais e Aventureiros | "Sai de Campinas, Congonhas ou Guarulhos" | imagem | "Sai de *Campinas*, **Congonhas** ou Guarulhos" | `imagem_drone_caiaque_rio_formoso (10EvC_)` |
| **V4** | 55+ (2ª: Casais) | Quem pode escolher o dia, vem no domingo | carrossel (5) | "Quem **pode** escolher, *vem* no domingo" | `cabana_master_varanda_cadeiras (1r0GZ4)` · `piscina (1JLKLY)` · `area_espaco_relaxamento_sauna (1tv2Uh)` · `imagem_casal_observando_natureza (1AbONV)` · `imagem_redario_casal_sorrindo (1EkScr)` |
| **V5** | Jovens aventureiros (2ª: Casais) | "Chega domingo, segunda já está no rio"; opcionais marcados | vídeo de fotos 9:16 (ou carrossel 4:5) | "Pousa **domingo**. Segunda, *no rio*" | `imagem_standup_formosinho_casal (1iYdKL)` · `imagem_caiaque_rio_formoso_mulher (1EGIkZ)` · `imagem_arco_flecha_casal (1sO8Ca)` · `arvorismo_tirolesa_vista_externa_close_pessoa (1L8G1W)` · `boia_close_adultos_sorrindo (18liRI)` |

*M1 e V4 usam a mesma foto de varanda (`1r0GZ4`) e M2 e V1 a mesma (`1hx24E`): as regiões não se cruzam, então ninguém vê as duas.*

### Remarketing (`perm-remarketing`): 4 criativos de decisão
| AD | Persona | Ângulo | Formato | Gancho | Foto |
|---|---|---|---|---|---|
| R1 | Todas | Prova social: Google 4,7 (1.015) · Booking 9,3 (318) · TripAdvisor 4,5 (349), **set/2026** | imagem | "**4,7** no Google, com *mais de mil* avaliações" | `imagem_redario_casal_sorrindo (1EkScr)` |
| R2 | Todas | O que está na diária + desconto para quem reserva direto | carrossel (5) | "O que já *vem* na **sua** diária" | `casal_cafe_manha (12qEQI)` · `piscina (1JLKLY)` · `imagem_arco_flecha_casal (1sO8Ca)` · `imagem_caiaque_rio_formoso_mulher (1EGIkZ)` · `area_espaco_relaxamento_academia (1iqJ9n)` |
| R3 | Casais e 55+ (serve muito a MS) | "Não acho vaga": troque o fim de semana por domingo a quinta, sem prometer vaga | imagem | "E se a **viagem** fosse numa *terça*?" | `imagem_balneario_formosinho_deck_rede (1zW97n)` |
| R4 | Todas | Baixa temporada, reserva sem aperto: desconto direto, sinal de 50%, até 6x, reembolso integral com 30 dias [confirmar política vigente] | imagem | "Baixa temporada, **reserva** *sem aperto*" | `imagem_casal_observando_natureza (1AbONV)` |

---

## 5. Pontual: 1ª quinzena de dezembro (`2026-12-primeira-quinzena`), agora para MS
**Estadia:** 01 a 15/12/2026, prioridade de domingo a quinta (o fim de semana com tempo bom já tende a encher). **Venda:** **01/11 a 10/12**. **Público:** **MS** (Campo Grande, Dourados e entorno), no lugar do Brasil inteiro; SP já recebe esse período em outubro pela campanha de voo. **Réguas:** baixa + início das chuvas: sem promessa de água cristalina. Sem Natal, Réveillon, preço ou "últimas vagas". **O que muda à luz de MS:**
- Os textos de D1 a D5 ganham a linguagem de quem é do estado ("antes da correria de fim de ano, Bonito fica logo ali") e o convite a **esticar até terça**; as fotos continuam as mesmas.
- D4 ("um dia inteiro já incluso") vira o carro-chefe: é o "o hotel é o passeio" de MS com data.
- Se a sua antecedência de MS for longa (parecida com a média de 45 a 50 dias), a pontual volta a começar em 13/10 [a confirmar com o dono].
- Mensagem pronta: "Sou de [cidade] e quero datas na 1ª quinzena de dezembro. #D1".

| AD | Persona | Ângulo | Formato | Gancho | Foto do inventário |
|---|---|---|---|---|---|
| **D1** | Casais | Pausa a dois antes da correria de fim de ano: Cabana Master com banheira para 2; decoração **(opcional)** | imagem | "Antes da *correria*, **uma pausa** a dois" | `cabana_master_banheira (1Kpp5M)` |
| **D2** | 55+ (2ª: Casais) | Com a chuva, a mata fica mais verde; piscina climatizada, hidromassagem aquecida e sauna das 7h às 22h | carrossel (5) | "Com a chuva, a **mata** fica *mais verde*" | `imagem_redario_balneario_rio_formosinho (1jimO_)` · `piscina (1WkaPv)` · `espaco_relaxamento_spa_hidro_externa (1bayxD)` · `area_espaco_relaxamento (1Q2jhE)` · `imagem_deck_balneario_formosinho (1riWSE)` |
| **D3** | Jovens aventureiros (2ª: Casais) | O calor pede rio: boia cross **(opcional)**, 6 anos e 1,15 m | vídeo (ou imagem) | "O **calor** pede *rio*" | Vídeo da produtora ou `boia_close_adultos_sorrindo (18liRI)` |
| **D4** | Casais e 55+ | Um dia inteiro já incluso, com monitor; "os horários podem variar conforme a temporada" | carrossel (5) | "Um dia **inteiro** *já incluso*" | `casal_cafe_manha (1BHhSN)` · `imagem_arco_flecha_mulher_sorrindo (1fbDfq)` · `imagem_standup_rio_formoso_mulher (1Mt4QV)` · `imagem_caiaques_sem_pessoas (11CIuu)` · `imagem_deck_balneario_formosinho (1X1mqX)` |
| **D5** | Casais | Chuva no telhado, rede na varanda: Cabana Casal elevada a 3 m | imagem | "Chuva no *telhado*, **rede** na varanda" | `cabana_casal_01_varanda (1ieD_L)`. Não acomoda menores de 5 anos |

---

## 6. Pontual: férias de janeiro (`2027-01-ferias-de-janeiro`, 01/11 a 16/12/2026), agora fora do estado
**Estadia:** janeiro/2027, fora das datas do pacote de Réveillon ([a confirmar com o dono]). **Réguas:** **alta** + chuva e calor. **O que muda à luz de MS:**
- **Público fora do estado** (Brasil, excluindo os raios de MS e Bonito e vizinhas): em janeiro, MS cai e o perfil fica parecido com o do destino (SP ~30%, PR, RJ, RS, SC, MG; OTEB, ago/2026).
- **J5** ("passeio de manhã, rio do hotel à tarde") sobe de importância: quem vem de fora fica mais noites e combina os passeios da cidade com o hotel.
- A MS permanente fica **pausada de 01/11 a 09/01**: não compete com a pontual e não gasta verba vendendo alta temporada para quem, em janeiro, viaja menos para cá.
- Sem recreação infantil; idades mínimas das atividades inclusas [a confirmar com o dono]. Mensagem pronta: "Quero datas em janeiro para a família. #J1".

| AD | Persona | Ângulo | Formato | Gancho | Foto do inventário |
|---|---|---|---|---|---|
| **J1** | Famílias | Férias com a agenda pronta: programação diária inclusa com monitor ou guia | carrossel (5) | "Férias com a *agenda* **pronta**" | `imagem_arco_flecha_guia_mulher (1W8swZ)` · `imagem_tirelosa_formosinho_homem (1oFEG8)` · `imagem_atividade_standup_adulto_rio_formosinho (1G0i-V)` · `imagem_caiaque_rio_formoso_mulher (11kdRW)` · `imagem_deck_balneario_rio_formosinho (1Im-BhO)` |
| **J2** | Famílias | Choveu? As férias continuam: piscina climatizada, hidromassagem aquecida, salão de jogos, playground | imagem | "Choveu? As **férias** *continuam*" | `piscina (1wy7Eb)` (reserva: `play_ground (1fikC1)`) |
| **J3** | Famílias | A família toda no mesmo lugar: Bangalô Especial para até 4; Cabana Master e Conjugado para até 5; crianças até 5 anos não pagam na cama dos pais | carrossel (5) | "A **família** toda, *no mesmo* lugar" | `bangalo_especial_area_com_rede (1xXd9J)` · `bangalo_especial_interna (1Ro_o5)` · `conjugado_externa (1jPdT5)` · `conjugado_interna_piso_inferior_solteiro (1K7sJz)` · `cabana_master_interna_ambiente_camas_solteiro (1z_82u)` |
| **J4** | Famílias com filhos a partir de 6 anos (2ª: Aventureiros) | Arvorismo e boia cross, **opcionais**, com guias; 6 anos e 1,15 m | carrossel (4) | "Com **6 anos** e 1,15 m, *já dá*" | `arvorismo_condutor_equipando_cliente (1T_TCt)` · `arvorismo_estacao_crianca (1654o4)` · `boia_briefing_inicial (1IPZ-w)` · `boia_close_crianca (1Z_VrcE)` |
| **J5** | Famílias (2ª: Casais) | Base para as férias: 6 km do centro, asfalto, 8 km do aeroporto; passeio de manhã, rio do hotel à tarde | imagem | "Passeio de **manhã**, *rio do hotel* à tarde" | `imagem_area_balneario_formosinho (16xoP5)` (reserva: `recepcao_lago (15DZs9)`) |

*M6 e J2 usam a mesma piscina (`1wy7Eb`), em épocas e regiões diferentes.*

---

## 7. Medição e rotina

### O que precisa estar configurado (antes de 06/10)
| Item | Status |
|---|---|
| Conta de anúncios, Página, Instagram e **WhatsApp Business** conectados | [a confirmar com o dono] |
| **Limite de gastos da conta** (sugestão: R$ 1.500/mês), definido por você | [a confirmar com o dono] |
| **Localização MS:** Campo Grande e Dourados com raio do entorno; **excluir Bonito e vizinhas**; voo e resto do Brasil excluem esses raios | configurar na subida; raio e lista de vizinhas [confirmar no Gerenciador e com você] |
| **Localização voo:** 3 pins com ~40 km | [confirmar no Gerenciador] |
| **Públicos personalizados** (engajou em 365 dias; viu 50% dos vídeos) | criar agora, de graça |
| **Mensagem pronta com código** (#M1 a #M7, #P01 a #P12, #V1 a #V5, #R1 a #R4, #D1 a #D5, #J1 a #J5) | a Marketing escreve na Fase 2 |
| **Planilha da recepção:** data do contato · código · qualificada (data + nº de pessoas + idades das crianças) · **cidade de origem** · **noites pedidas e dias da semana** · **antecedência** (dias entre o contato e o check-in) · vem de avião? · virou reserva? · valor | [a confirmar com o dono] |
| Pixel / API de conversões no Silbeck + UTM | [a confirmar com o dono] |
| **Tempo de resposta** no WhatsApp (em novembro, duas pontuais) | meta [a definir pelo dono] |
| **Previsão do tempo** para o gatilho de M5 e M6 | fonte [a combinar]; o gatilho sempre com o seu OK |

### Rotina
| Quando | O que olhar | O que fazer |
|---|---|---|
| **3 a 5 dias** após cada início (09 a 11/10; 04 a 06/11; 20 a 22/12; 13 a 15/01) | Gasto, conversas com código, reprovação, link ou WhatsApp quebrado | Não mexer (aprendizado), salvo erro: pausar e avisar você no mesmo dia |
| **Semanal** (segunda, blocos de 7 dias: 13/10, 20/10…) | Custo por conversa e % qualificada por anúncio · CTR · frequência · retenção de 3 s · **dias da semana pedidos nas conversas de MS** · previsão do fim de semana | **Pausar:** custo por conversa ≥ 2× a média, gasto ≥ 2× o custo médio sem conversa, ou conversas que nunca qualificam. **Reforçar:** variação do mesmo ângulo. Gatilho de tempo ruim: pedir o seu OK |
| **4 semanas** após o início da MS (~03/11) | **Antecedência média de MS** e % que pede domingo a terça | Confirmar ou mudar a data da pontual de dezembro e o gatilho de tempo ruim |
| **30 dias** após o início (~05/11) | Custo por conversa qualificada: MS × voo | Critério de revisão (seção 2.1), com o seu OK |
| Checagem de ocupação (16/11 e 30/11) | 1ª quinzena de dezembro e janeiro | Pontual cheia para; verba não é gasta sem o seu OK |
| Trimestral | Malha de voos | Ajustar V1, V3 e V4 |
| **Mensal** (1º dia útil) | Reservas por código e origem · **% de reservas de MS e de fora** · noites médias por origem · % de domingo a quinta · custo por reserva [a medir] | Redistribuir o mês seguinte pela regra da seção 2.2; registrar em `social/anuncios/README.md` |

### O que NÃO dá para concluir sem UTM, código e a pergunta "como nos conheceu?"
- Que o anúncio trouxe a reserva (pode ter ido por agência ou OTA).
- Se o anúncio de MS **esticou** a estadia ou só vendeu o fim de semana que já viria.
- Custo por reserva e retorno: só custo por conversa.
- Qual persona compra: a Meta mostra quem clicou, não quem reservou.

---

## 8. Pedidos à equipe (depois do seu OK)
- **Marketing (`marketing-anuncios`):** **até 01/10:** 6 textos de MS (M1 a M6; linguagem de quem é do estado, "nós", "Bonito fica logo ali"; distâncias de cidades com "[confirmar distância]"; frio só com os fatos: climatizada, aquecida, sauna, ar quente e frio; sem preço, sem prometer vaga; opcionais marcados) + roteiro de M3 (0 a 3 s, 15 a 30 s, 9:16) + 5 de voo (V1 a V5) + 4 de remarketing. **Até 20/10:** D1 a D5 reescritos para MS + J1 a J5 para fora do estado. **Até 01/12:** P01 a P12 (resto do Brasil). Formato: texto principal até ~125, título até ~40, descrição até ~30, com a contagem + mensagem pronta com código. Obrigatório: nada de feriado, Natal, Réveillon, concorrente ou urgência; nada de água cristalina em dezembro e janeiro; janeiro nunca como "baixa"; nada de recreação infantil.
- **Designer (`designer-criativos`):** cada peça em `feed45` (1080 × 1350) e `story` (1080 × 1920). **Até 04/10:** MS: 1 imagem (M2) + 4 carrosséis (M1, M4, M5, M6) + 1 vídeo de fotos 9:16 (M3, com carrossel 4:5 de reserva); voo: 2 imagens + 2 carrosséis + 1 vídeo de fotos; remarketing: 3 imagens + 1 carrossel. **Até 25/10:** dezembro (3 imagens + 2 carrosséis) e janeiro (2 imagens + 3 carrosséis). **Até 08/12:** P01 a P12 (6 imagens + 4 carrosséis + planos B de P03 e P12). Gancho legível no 1º quadro (0 a 3 s); só fotos reais; em M5 e M6, a estação vai no texto (não há foto de frio no banco).
- **Você → produtora:** vídeo da boia cross (P09, D3) e Reels 1 e 4 de outubro (P03, P12). Se houver gravação em maio ou junho: hidromassagem e sauna em uso num dia frio (daria o 1º quadro de M5 e M6).

## 9. A confirmar com o dono (para depois)
1. **Com quanta antecedência o hóspede de MS reserva?** (Muda a data da pontual de dezembro e decide se o gatilho de tempo ruim funciona.)
2. **Há condição para quem estica até terça** ou para a 1ª quinzena de dezembro? Sem isso, nenhum anúncio fala de preço (e eu não defino preço).
3. A equipe de reservas pode anotar **cidade de origem, noites, dias da semana e antecedência** de cada conversa?
4. Raio do entorno de Campo Grande e Dourados e a lista de municípios vizinhos de Bonito a excluir.
5. Distâncias de Campo Grande (cidade) e de Dourados até o hotel, se quiser usá-las nos anúncios.
6. Marcas regionais que você gosta de ver na comunicação para MS (expressões, hábitos), para a Marketing não chutar.
7. Datas do pacote de Réveillon (para a pontual de janeiro não vender essas noites).
8. Ocupação atual da 1ª quinzena de dezembro, de janeiro e de domingo a quinta em novembro.
9. Idade mínima das atividades inclusas (J1); política de cancelamento e parcelamento (R4); Silbeck aceita pixel e UTM?
10. Tarifário de alta e baixa do hotel, para ajustar as janelas de 2027.
11. Teste pequeno para não hóspedes da região (boia cross e arvorismo)? Fora do teto; só com a sua decisão.
12. Malha de voos (dias de volta; chegada no domingo a tempo do check-in).

## 10. Autorrevisão
- [x] Objetivo ligado a indicadores do hotel (ocupação de domingo a quinta e de maio/junho; reservas diretas)
- [x] Duas réguas: maio/junho = seca + baixa + **frio** (aconchego sem prometer calor); dezembro e janeiro com chuva; janeiro = alta
- [x] Datas separadas (estadia × veiculação), com **duas antecedências** (MS [a medir] × fora 45 a 50 dias)
- [x] MS como prioridade, com localização justificada; Bonito e vizinhas fora; sem sobreposição entre campanhas
- [x] Verba ≤ R$ 1.500 em todos os meses, piso de R$ 20/dia, no máximo duas campanhas de venda por vez, [verba a definir pelo dono]; nenhum resultado prometido
- [x] Sem feriado, Réveillon ou Carnaval; pontuais de dezembro e janeiro mantidas e revistas
- [x] Criativos de MS sem preço, sem prometer vaga, opcionais marcados; distância só a do contexto (280 km do Aeroporto de Campo Grande), as outras [confirmar distância]
- [x] Destino: WhatsApp de reservas com mensagem codificada; o que medir e o que configurar
- [x] Post vencedor (M7); qualidade do contato definida; lista de peças para Marketing e Designer
- [x] Nenhum fato inventado; nada de imagem de IA
