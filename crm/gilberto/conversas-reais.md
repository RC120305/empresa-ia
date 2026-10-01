# Gilberto: lições de 47 conversas reais do WhatsApp (01/10/2026)

Fonte: exportação do WhatsApp do hotel enviada pelo dono ao Drive (pasta "Conversa no WhatsApp", 47 conversas, ago. a out./2026, atendimento humano). **Sem dados pessoais:** as conversas originais ficam só no Drive; aqui entram apenas padrões, fatos e casos de teste anonimizados (A1…D14 = códigos internos).

## 1. Números
- 47 pastas, 46 com conversa (1 só com avisos do sistema).
- A maioria chega pelo **robô de cotação do site** ("Olá, fiz uma cotação no robô…"), principalmente do MS; também SP, PR, MT, MG, TO, SC e Paraguai.
- Fecharam (reserva ou remarcação): cerca de metade. **As perdas quase nunca foram por preço**: foram por demora, cotação não enviada e falta de follow-up.

## 2. Por que se perdem vendas (o que o Gilberto resolve)
1. **Demora na 1ª resposta:** 9 a 20 h fora do expediente (canal humano: seg. a sáb., 8h às 17h); até 5 h dentro do expediente.
2. **Sem pergunta de fechamento e sem follow-up** depois da cotação (em todos os grupos). Um cliente chegou a perguntar "esse + boia cross, parcela em quantas vezes?" e não houve retorno.
3. **Cotação não enviada** a quem já deu datas e pessoas, ou cliente que perguntou logística/alimentação e não recebeu preço.
4. **Erros de leitura:** Réveillon cotado no lugar de janeiro/outubro; datas e acomodação erradas na reserva; card com mês errado; template "de R$ X por R$ X" com o mesmo valor.
5. **Sem alternativa** quando a preferida está esgotada (só existe 1 Cabana Master) ou o produto não existe (day use).
6. **Link de pagamento e confirmação lentos:** link de 2 h a 36 dias; confirmação do Financeiro de 14 h a mais de 1 mês, com o cliente cobrando.
7. Respostas secas ("Não temos") sem alternativa; respostas em áudio; mensagem automática de "fora do horário" disparando no meio de conversa ativa.

## 3. O que a equipe faz bem (o Gilberto copia)
- Abertura: "único hotel de Bonito entre dois rios, a 6 km de asfalto do centro" + lista "Incluso na diária".
- Cotar **3 ou 4 categorias**, cada uma com vídeo, período e total; Cabana Master como âncora alta.
- Oferecer **1 quarto para 4** quando 2 duplos parecem caros (fechou venda).
- Mostrar a vantagem de 2 noites frente a 1; sugerir a noite anterior para quem chega tarde.
- Escassez real ("é a última unidade"); negar desconto com valor ("a tarifa direta já é a melhor").
- Pedir o mínimo para reservar (nome, e-mail, telefone); 4 opções de pagamento claras.
- Converter reserva de OTA (Booking) em reserva direta.
- Na remarcação, aproveitar o valor pago (upgrade) em vez de devolver.

## 4. Perguntas mais frequentes
1. Preço para datas e nº de pessoas; valor por noite x total.
2. Pagamento: % de sinal, parcelamento, Pix, desconto no Pix.
3. O que está incluso; **almoço** (aparece em quase toda conversa; não há almoço nem café da tarde).
4. Crianças: quem paga, cama extra, atividades por idade.
5. Grupos de 5 a 6 ("todos no mesmo quarto?").
6. Cancelamento, troca de data, crédito.
7. Passeios fora do hotel (agência parceira dentro do hotel), aeroporto, clima/chuva.
8. Aniversário: decoração, brinde.

## 5. Pontos para o dono confirmar (antes de entrar na base do Gilberto)
Ver lista em `crm/entrevista.md` (perguntas P59 em diante). Até a resposta, o Gilberto segue a base atual e, na dúvida, **passa para a equipe** em vez de inventar.

## 6. Casos de teste (simulado do Gilberto)
Cada caso traz a(s) mensagem(ns) do cliente e o comportamento esperado. Itens marcados como "a confirmar" dependem das respostas do dono.

### Grupo A

**T-A1: família estrangeira comparando datas e pedindo 3 quartos**
- Cliente (Paraguai, sábado 7h50): "Bom dia. Gostaria de saber os preços para uma família de 2 adultos e 2 crianças (de 10 e 8 anos) de 31 de janeiro a 4 de fevereiro. Poderia me informar o preço exato por noite? E é possível pagar via Western Union?"
- Esperado do Gilberto: responder na hora; confirmar 4 noites e as idades (as duas pagam); cotar opções para 4 com **total e valor por noite**; dizer que janeiro é alta e a tarifa cai a partir de 10/02; sinal de 50% no ato, por cartão de crédito (Western Union não, ou "vou confirmar com a equipe", sem inventar); perguntar se quer bloquear e mandar o link; agendar follow-up. Não confundir com o pacote de réveillon.

**T-A2: lead do robô que só pergunta logística**
- Cliente: "Olá, fiz uma cotação no robô de atendimento para o período: 25/11 até 29/11 - 2 adultos e 0 crianças… gostaria de saber sobre passeios fora do hotel, qual o aeroporto mais próximo e se novembro é um bom mês."
- Esperado: responder as 3 dúvidas com os fatos da base (aeroporto de Bonito a 8 km; sem transfer próprio, indicamos quem faça; agência parceira para passeios; novembro é verão, com chuvas, sem prometer tempo seco) **e já mandar a cotação para 25 a 29/11** com o próximo passo ("posso reservar para vocês?").

**T-A3: família com crianças de 4 anos pedindo cama extra e atividades**
- Cliente: "Vamos eu, meu esposo e dois filhos de 4 anos, de 11 a 14 de outubro. Dá para colocar um colchão extra? Quais atividades servem para criança de 4 anos?"
- Esperado: crianças até 5 anos não pagam dormindo com os pais; não há cama nem colchão extra (berço sob agendamento); listar o incluso com honestidade e **não afirmar idade mínima da tirolesa sem confirmação** (até o dono definir); boia cross e arvorismo só a partir de 5 anos e 1,15 m; mandar as opções de pagamento e pedir os dados.

**T-A4: reagendamento com crédito e data esgotada**
- Cliente (7h05): "Tenho um haver de uma reserva cancelada. Quero usar de 4 a 7 de dezembro, 2 quartos, 4 adultos e um bebê de 1 ano."
- Esperado: acolher; registrar como **alerta para a equipe** (crédito e reagendamento são confirmados no sistema); se a data estiver esgotada, oferecer outra; avisar que o reagendamento só pode ser feito uma vez e que diferença de tarifa é paga à parte; **não oferecer Cabana Casal** por causa do bebê; fora do horário, dizer que a equipe confere pela manhã.

**T-A5: comprovante enviado à noite e cliente ansioso**
- Cliente (18h01, depois sábado 17h45): "[comprovante]" … "Boa noite. Estou aguardando a confirmação da reserva."
- Esperado: agradecer, explicar que o Financeiro confere o pagamento e dar um prazo realista; registrar alerta para a equipe; na mensagem seguinte não repetir só a automática: dizer o status e quando a confirmação chega; nunca confirmar a reserva antes da baixa no sistema.

### Grupo B

**T-B1: cliente quente fora do horário (base: B1)**
- Mensagens (sábado, 20h10): "Olá" / "Gostaria de fazer um orçamento para 18/02 até 21/02" / (depois) "2 pessoas" / (depois da cotação) "Esse + boia cross p duas pessoas, parcela em quantas vezes?"
- Esperado do Gilberto: responder na hora, mesmo fora do expediente; perguntar o nº de pessoas (e crianças) se faltar; cotar 3 ou 4 categorias com o que está incluso; somar a boia cross (R$ 100/pessoa, paga no check-out), mostrar o parcelamento com valor da parcela (até 6x sem juros; sinal no cartão até 3x) e pedir os dados para reservar; agendar follow-up se o cliente sumir.

**T-B2: pedido de desconto à vista / "condições especiais" (base: B7 e B11)**
- Mensagens: "Hospedagem dos dias 12 a 16 de novembro, para casal. Gostaria de saber das condições especiais" / "valor pago no pix tem desconto?" / "esse valor à vista é o melhor que pode ser feito?"
- Esperado: **não dar desconto** nem inventar condição; explicar com valor (direto é o melhor preço; café, os dois rios e as atividades com monitor inclusos); oferecer 6x sem juros com o valor da parcela; propor o próximo passo ("quer que eu reserve?"); não repetir o "10% no Pix" do caso B11.

**T-B3: grupo de 4 adultos achando caro (base: B6)**
- Mensagens: "Entrada 18/08, saída 21/08, 04 adultos. Poderia ser 2 quartos, um casal e dois solteiros" / "To achando muito caro os quartos duplos" / "E serve almoço?"
- Esperado: conferir as datas na cotação; oferecer as opções de quarto único para 4 (Quádruplo Standard/Superior, Bangalô Especial, Cabana Master) como alternativa mais econômica ou com mais valor; responder com honestidade que não há almoço (lanchonete das 11h às 21h, jantar à noite, centro a 6 km); não ofertar flutuação.

**T-B4: família com criança e aniversário (base: B10)**
- Mensagens (sexta, 23h33): "Gostaria de verificar valor de hospedagem nos dias 25/9 a 27/9, para dois adultos e uma criança 6 anos" / "E qual é a cabana master? Ela pode ser com criança?" / "E como funciona eventual cancelamento ou troca de data?" / "Será que o pessoal enfeita a cabana p aniversário de casamento e do marido?"
- Esperado: cotar opções que aceitam criança de 6 anos (inclusive Cabana Tripla e Master); dizer que a Master aceita criança; política de cancelamento **completa** (30 dias integral, 15 dias 50% do sinal, menos de 15 sem reembolso); oferecer decoração Simples R$ 350 ou Completa R$ 600 com 3 dias de antecedência, sem prometer decoração gratuita; não prometer early check-in.

**T-B5: day use e agência de passeios (base: B2 e B9)**
- Mensagens: "Vocês têm day use?" / (outro cliente) "Esse moço da agência Ecotrip é de vocês mesmo? Tô com medo de golpe" / "Qual a diferença entre o bangalô e as cabanas? Tem varanda?"
- Esperado: negar day use com honestidade e oferecer uma diária como alternativa (e, se o dono confirmar, a boia cross/arvorismo avulsos); sobre o agente, não confirmar nome/telefone de terceiro por conta própria: passar para a equipe validar (ou usar a lista oficial de contatos da agência, se o dono cadastrar); explicar bangalô x cabana com os fatos da base (varanda com rede nos dois, bangalô sem parede compartilhada, cabana de madeira elevada a 3 m com garagem) antes de pedir os dados.



### Grupo C

**T-C1: Grupo de 6 adultos no Réveillon, "todos no mesmo quarto"**
Cliente: "Tem disponibilidade p final do ano? 6 pessoas? Pode ser todos no mesmo quarto se possível. E valor" (depois: "29 a 02, todas maiores de 18").
Esperado: responder em segundos; explicar que o máximo é 5 por acomodação (Cabana Master/Conjugado) e propor 2 quartos com combinações (ex.: quádruplo + duplo, ou 2 triplos) com o **total de cada um** e a disponibilidade real; destacar a escassez do Réveillon; condições (50% de sinal, Pix ou cartão); próximo passo claro ("Quer que eu segure as duas unidades?"). Se o grupo encolher, perguntar pelos demais e **agendar follow-up**. Sem desconto.

**T-C2: Pedido de desconto no Pix / morador do MS / cliente antigo**
Cliente: "Tem desconto no pix? Ou pra quem é do MS?" e, em outra conversa: "Consegue o mesmo desconto de 20% que me deram da última vez?"
Esperado: dizer com gentileza que o valor direto já é o melhor e não há desconto (nem para Pix nem para residente); ancorar o valor (café, dois rios, atividades com monitor) e oferecer o parcelamento em 6x; no caso do cliente fiel com desconto anterior, **não prometer**: agradecer a fidelidade e passar para a equipe decidir.

**T-C3: Lead qualificado que só pergunta de alimentação**
Mensagem do robô: "Olá, fiz uma cotação no robô de atendimento para o período: 23/11 até 26/11 - 3 adultos e 0 crianças..." + "Gostaria de saber valores de alimentação, infraestrutura, passeios. Precisamos de uma base pra saber os gastos."
Esperado: responder às 3 perguntas (café incluso; lanchonete e jantar à parte, horários e cardápio; estrutura; passeios inclusos com monitor + opcionais com preço) **e** mandar a cotação das acomodações para 3 adultos com o total das 3 noites; fechar com uma pergunta ("Qual opção fica melhor para vocês?"); follow-up em 24h se o cliente sumir.

**T-C4: Aniversariante pede presente e negocia a decoração**
Cliente (já reservado): "Já vou pedir meu presente, afinal vai ser meu aniversário dia 18" → depois "Vocês decoram o quarto?" → "Vamos negociar, faz 500?"
Esperado: parabenizar; apresentar as 2 decorações com preço e prazo (conforme a regra confirmada pelo dono: 2 ou 3 dias) e oferecer fotos; manter o preço sem desconto e sugerir a **Simples (R$ 350)** como alternativa; **não prometer cortesia** (atividade grátis) sem regra: se o dono tiver um benefício definido, aplicá-lo; senão, passar para a equipe.

**T-C5: Cabana Master esgotada, check-in amanhã, mensagem às 19h**
Cliente (sexta): "Quero me hospedar na Cabana Master. Tem disponibilidade para quais datas na semana que vem?" → (segunda, 18h56) "Quero fazer essa reserva, nessas datas" (entrada amanhã).
Esperado: explicar que há só 1 Master e dar as datas livres **e** na mesma mensagem oferecer alternativas (Cabana Casal, Bangalô, Superior) com preço; no "quero reservar" fora do expediente, coletar os dados na hora, gerar o link do sinal (prazo de 2h, porque o check-in é em até 3 dias) e alertar a equipe como prioridade; mandar a localização junto com a confirmação.

### Grupo D

**T-D1. Lead do robô, 1 diária, fora do horário**
> Cliente (21h): "Olá, fiz uma cotação no robô de atendimento para o período: 26/09/26 até 27/09/26 - 2 adultos e 0 crianças, e queria conversar sobre a proposta." … "Casal"
- **Esperado:** responder na hora; cotar 1 diária **e** 2 noites lado a lado (mostrar a vantagem de ficar mais); dizer o que a diária inclui (café, rios, atividades com monitor); perguntar o motivo da viagem; fechar com "quer que eu reserve?"; agendar follow-up de 24 h se não responder.

**T-D2. Família de 5 com crianças pequenas pergunta de cabana e chuva**
> "No caso são 2 adultos e 3 crianças, uma de 4, outra de 7 e outra de 8 anos. Disponibilidade, valores e se tem café incluso?" … "As cabanas não estão disponíveis ou não comportam o número de pessoas?" … "Nesses dias estão com previsão de chuva, como funciona o hotel? Tem local raso para as crianças?"
- **Esperado:** cotar **nas datas pedidas**; aplicar a regra da criança (4 anos não paga, dorme na cama existente, sem cama extra); oferecer opções para 5 (Cabana Master, Conjugado) e não dizer "cabanas só para casais"; chuva: o que funciona (piscina climatizada, sauna, sala de jogos) sem prometer o clima; local raso só se estiver na base (senão, passar para a equipe); próximo passo claro.

**T-D3. Idosa e escadas**
> "Esse quarto fica embaixo? Vou estar com uma idosa." … "Cabana para duas pessoas ainda tem?" … "Dá pra separar a cama?"
- **Esperado:** honestidade (Superior só no andar de cima, cabanas elevadas com escada, cama de casal não separa, se confirmado na base); **não prometer acessibilidade**; perguntar a necessidade e passar para a equipe; oferecer o vídeo para a família avaliar.

**T-D4. Remarcação fora do prazo, com diferença de valor**
> "Gostaria de reagendar minha reserva por causa da previsão de frio, com crianças é complicado. Pode ser de 18 a 20 de setembro?" … "Qual seria o valor excedente?"
- **Esperado:** acolher; pedir número da reserva ou titular (sem CPF); explicar a regra (alteração gratuita até X dias; fora disso, sem estorno, diferença vira crédito), **sem confirmar sozinho**: alerta para a equipe; sugerir alternativa que aproveite o valor pago (mesmo nº de noites ou upgrade); avisar que a confirmação vem depois de alterado no sistema.

**T-D5. Pedido de desconto + noite extra em feriado**
> (Sábado 16h40) "Já liguei e aparece que a empresa não aceita ligação." … "09/10 a 11/10, 4 pessoas." … "Tem desconto?" … (21h) "Se a saída ficar para 12/10, quanto mais acrescentaria?"
- **Esperado:** pedir desculpas pelo problema da ligação e seguir por escrito; cotar; escassez só se for real; negar desconto com âncora de valor (direto já é o melhor preço; o que está incluído); responder a noite extra **na hora**, com o valor e um motivo para ficar (feriado), e perguntar se quer segurar; mandar o link conforme a regra de prazo.
