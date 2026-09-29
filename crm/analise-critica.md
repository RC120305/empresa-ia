# Análise crítica do CRM Cabanas (v3)

> 29/09/2026. Feita antes do teste do dono no PC. Base: `entrevista.md`, `funcionalidades.md` (validada), protótipo v3 e o contexto do hotel (`contexto/hotel-cabanas.md`, `hotel-operacional.md`, `cultura.md`).
> Critério: o que falta para o CRM ajudar a **bater a meta de 60% de ocupação** (gargalo: domingo a quinta e baixa temporada), **reduzir a dependência do Booking** e **proteger a operação**. Cada ponto traz uma proposta e uma prioridade: 🔴 incluir antes de construir · 🟡 incluir na fase indicada · ⚪ depois.

## A. Lacunas que afetam venda e receita

### A1. 🔴 Etapa "Aguardando pagamento" e link de pagamento
Hoje o funil pula de "Orçamento enviado" para "Reservado". Mas a reserva só vale com **50% de sinal** (`hotel-operacional.md`). Sem essa etapa, lead que aceitou e não pagou some no meio do caminho.
- Nova etapa **Aguardando pagamento**, com prazo (ex.: 24 h) e lembrete automático.
- O agente envia o **link de pagamento** (do motor da Silbeck, se ele aceitar reserva com sinal, ou um link Pix/cartão). Confirmar com a Silbeck o que o motor aceita.
- O card só vai para **Reservado** quando o sinal cai (conciliação pela API).

### A2. 🔴 Orçamento estruturado (proposta)
"Orçamento enviado" é só uma etapa, sem o orçamento em si. Proposta:
- Montar a proposta dentro do CRM com tarifa **puxada do Silbeck** (acomodação, datas, hóspedes, valor, validade), opcionais sugeridos (combo boia cross + arvorismo) e **link do motor já preenchido**.
- Guarda o que foi ofertado: permite medir "qual acomodação mais perde por preço" e "quanto o upsell soma por reserva".

### A3. 🔴 Lista de espera para datas lotadas
"Não há vaga quando procuro" é a **objeção nº 3** do hotel e, no painel de exemplo, o principal motivo de perda. Hoje esse lead vira "Perdido" e acabou.
- Motivo "sem vaga" oferece: (1) **datas alternativas de domingo a quinta** (o agente consulta o Silbeck) e (2) **entrar na lista de espera**.
- Quando surgir cancelamento naquelas datas, o CRM **avisa quem está na fila** (primeiro da lista primeiro).
- Relatório **"demanda não atendida"**: datas mais pedidas sem vaga → sinal para o dono ajustar tarifa nos picos.

### A4. 🔴 Mapa de vagas (ocupação dos próximos 60 dias)
O endpoint **Ocupacao** da Silbeck **já está liberado**. Um painel simples mostrando as noites vagas nos próximos 60 dias, com destaque para domingo a quinta, deixa claro **onde vender** — e alimenta campanhas (A6) e o agente (sugerir datas com vaga).

### A5. 🟡 Base histórica de hóspedes (fase 3)
O Silbeck guarda **anos de hóspedes**. Importar essa base (nome, telefone, e-mail, estadias, valor gasto) transforma o CRM numa máquina de recompra desde o primeiro dia:
- Segmentos prontos: hóspedes de MS, famílias, casais, quem veio em baixa temporada, quem veio pelo Booking, quem não volta há 1 ano.
- Classificação por **recência, frequência e valor** para priorizar os melhores clientes.
- Só dispara marketing para quem **consentiu** (ver C1).

### A6. 🟡 Campanhas para listas filtradas (já é o item 7.4)
Reforço: é a ferramenta que mais ajuda no gargalo. Ex.: "hóspedes de MS que vieram em fim de semana, convite para domingo a quinta em novembro". Ligar ao mapa de vagas (A4).

### A7. 🟡 Gerador de links rastreáveis
A origem automática só funciona se cada peça tiver um link com código. Uma tela para gerar links `wa.me` e do motor **com código por campanha, post, influenciador, agência ou QR code** (ex.: QR na recepção, no cardápio, no folder). Sem isso, muita origem cai em "não identificada".

### A8. ⚪ Prioridade do lead
Ordenar a fila por **chance e valor**: check-in próximo (o hóspede de MS decide de 15 a 20 dias antes), valor alto, hóspede que volta, lead quente (respondeu há pouco).

## B. Lacunas na operação e no atendimento

### B1. 🔴 Hóspede durante a estadia (o 99117 também é da recepção)
O 99117 atende **hóspedes hospedados**. O CRM hoje só pensa em "antes" e "depois".
- Status **Hospedado** (vindo do Silbeck) muda o comportamento: o agente não tenta vender; responde dúvidas da estadia e **encaminha pedidos** (manutenção, toalhas, restaurante) para o setor certo com aviso.
- **Reclamação durante a estadia** vira alerta imediato para Renata/Jagles: resolver antes que vire avaliação negativa (NPS por setor, indicador do Código de Cultura).
- Upsell na estadia com vaga real: "amanhã às 14h ainda tem boia cross".

### B2. 🔴 Passagem do agente para a equipe (madrugada)
Quando o agente passa uma conversa às 2h, quem fica sabendo e em quanto tempo responde?
- Fila **"Aguardando a equipe"** com prazo, aviso no celular às 7h30 e o agente avisa o cliente com honestidade ("nossa equipe responde a partir das 7h30").
- Métrica: **tempo de resposta humana depois da passagem**.

### B3. 🟡 Avaliações do Google e do TripAdvisor
Trazer as avaliações novas para o CRM, **ligadas ao hóspede** quando possível, com alerta nas notas baixas e modelo de resposta (tom definido no manual de voz). É indicador do Código de Cultura e hoje fica fora do sistema.

### B4. ⚪ Agências: comissão a pagar
Relatório de reservas por agência e **comissão devida no mês**, para a conta fechar sem planilha.

## C. Riscos que precisam de regra desde o início

### C1. 🔴 Consentimento, descadastro e limite de disparos
- Registro de **consentimento** para marketing; resposta "SAIR" ou "PARE" **descadastra na hora**.
- **Limite de frequência** por contato (ex.: no máximo 2 mensagens de marketing por mês) e **sem marketing à noite**.
- Motivo: se muitas pessoas bloquearem ou denunciarem, a **Meta rebaixa a qualidade do número e pode restringir o WhatsApp do hotel**. O painel deve mostrar a **nota de qualidade do número** na Meta.

### C2. 🔴 Testes do agente antes de cada mudança
Toda edição na fonte de conhecimento muda o comportamento do agente. Proposta: uma **bateria fixa de ~30 perguntas reais** (preço, criança na boia cross, pet, cancelamento, "fica longe?") que roda sozinha a cada mudança e mostra se alguma resposta piorou, **antes** de valer para os clientes.
- Regra de preço: o agente **sempre cota pelo Silbeck**, nunca por texto da fonte.

### C3. 🔴 Plano B quando algo cai
- **Ponte com o Silbeck fora do ar** (luz ou internet do hotel): o agente não inventa disponibilidade; diz que vai confirmar e cria tarefa para a equipe.
- **WhatsApp ou Meta fora do ar**: aviso no painel.
- **Custo**: alerta quando o mês chegar a 80% do teto de R$ 800.

### C4. 🟡 LGPD e segurança
- Login com **verificação em duas etapas**; registro de quem viu e mudou o quê (já é o 8.3).
- **Atender pedido de exclusão de dados** do cliente; prazo de guarda das conversas definido.
- Backup diário (Supabase Pro) e exportação completa a qualquer momento.

## D. Implantação e adoção

### D1. 🔴 Migração dos contatos atuais
Importar os contatos do 99117 e o histórico exportado da Asksuite, **juntando duplicados**, antes de ligar o CRM. Sem isso, o sistema começa "sem memória" e o agente não reconhece o hóspede que volta.

### D2. 🟡 Treinamento da equipe
Jagles e quem cobre o 99117 vão mudar de ferramenta (do app do celular para o CRM). Um roteiro curto de treinamento e **uma semana com os dois rodando em paralelo** evitam perder conversas.

## Resumo para decisão
| # | Item | Prioridade | Fase sugerida |
|---|---|---|---|
| A1 | Etapa "Aguardando pagamento" + link de pagamento | 🔴 | 1 (link na 3) |
| A2 | Orçamento estruturado com tarifa do Silbeck | 🔴 | 3 |
| A3 | Lista de espera + datas alternativas + demanda não atendida | 🔴 | 3 |
| A4 | Mapa de vagas dos próximos 60 dias | 🔴 | 2 (endpoint já liberado) |
| A5 | Base histórica de hóspedes do Silbeck | 🟡 | 3 |
| A6 | Campanhas para listas filtradas ligadas às vagas | 🟡 | 3 |
| A7 | Gerador de links rastreáveis e QR codes | 🟡 | 1 |
| A8 | Prioridade do lead | ⚪ | 4 |
| B1 | Hóspede durante a estadia (status Hospedado, pedidos, reclamações) | 🔴 | 3 |
| B2 | Passagem do agente para a equipe com prazo e aviso | 🔴 | 2 |
| B3 | Avaliações Google/TripAdvisor no CRM | 🟡 | 4 |
| B4 | Comissão das agências | ⚪ | 4 |
| C1 | Consentimento, descadastro, limite de disparos, qualidade do número | 🔴 | 1 |
| C2 | Bateria de testes do agente | 🔴 | 2 |
| C3 | Plano B (Silbeck, Meta, custo) | 🔴 | 2 |
| C4 | LGPD e segurança (2 etapas, exclusão de dados, backup) | 🟡 | 1 |
| D1 | Migração dos contatos atuais | 🔴 | 1 |
| D2 | Treinamento e semana em paralelo | 🟡 | 1 |
