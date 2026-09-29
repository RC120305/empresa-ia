# Entrevista do CRM: Hotel Cabanas

> Registro das respostas do dono para estruturar o CRM. Uma pergunta por vez; cada resposta vira fato do projeto.
> Início: 29/09/2026. Briefing de origem: dores (origem dos leads, métricas por canal, upsell e follow-up), sistemas (Silbeck PMS + motor + channel manager; Asksuite chatbot + CRM; RD Station Marketing; RD Advisor no marketing desde set/2024) e o princípio "o CRM não duplica o PMS" (cuida do antes e do depois da estadia; a chave de ligação é o telefone ou o e-mail do hóspede).

## Respostas

### P1. Qual número está na Asksuite e qual é o WhatsApp Business comum? (29/09/2026)
- **(67) 99110-7635:** número **oficial na Asksuite** (API da Meta).
- **(67) 99117-1648:** **WhatsApp Business comum**, fora da Asksuite.

**Consequência (achado da equipe):** o 99117-1648 é o número divulgado como "WhatsApp de reservas" em **todo o marketing**: botão de WhatsApp da Página do Facebook (número principal), anúncios do Meta, robô "comente RESERVA" (`wa.me/5567991171648`), legendas, banco de objeções, manual de voz e calendário. Ou seja, **o tráfego pago e o orgânico caem hoje no número sem funil e sem métrica**, e não só as agências, os hóspedes antigos e a recepção. O 99110-7635 aparece nos materiais só como "Telefone".
- O 3º número ligado à Página, (67) 8166-9955, ainda não tem papel definido.

### P2. Qual número vira a porta única de entrada? (29/09/2026)
**Decisão do dono:** a **Asksuite não será mantida**. Os **dois números** (99110-7635 e 99117-1648) serão **integrados ao CRM que vamos construir**.

**Consequências para o projeto (a validar nas próximas perguntas):**
- O CRM passa a ser também a **caixa de entrada do WhatsApp**, e não só o registro de leads. Isso exige a **API oficial do WhatsApp (Cloud API da Meta)** nos dois números.
- **99110-7635:** já está na API, via Asksuite. Precisa ser **migrado da Asksuite para a conta do hotel** (a Meta permite migrar o número entre provedores), sem perder o número.
- **99117-1648:** hoje é o app WhatsApp Business. Opção a checar: a **"coexistência"** da Meta, que liga o número à API e mantém o app no celular funcionando ao mesmo tempo (as mensagens chegam ao CRM e a recepção continua no celular). Confirmar se está disponível para o número antes de decidir.
- **O que a Asksuite faz hoje e precisa de substituto ou decisão:** o chatbot (atendimento automático fora do horário), o AskFlow (follow-up automático e instruções de check-in e check-out) e o módulo de atribuição (conversa → reserva no PMS).
- **Antes de cancelar:** exportar da Asksuite os contatos e o histórico de conversas (a base de hóspedes para recompra), e ver o prazo do contrato.

### P3. "Construir" = sistema próprio ou CRM pronto configurado? (29/09/2026)
**Decisão do dono: opção A, sistema sob medida, feito por nós** (app web próprio, ligado direto à API do WhatsApp e ao Silbeck).
- O hotel **não usa mais o RD Station** (corrige o briefing: não há integração Silbeck → RD em uso).
- **Novo escopo, pedido pelo dono:** um **agente de IA que responde o WhatsApp**, treinado para responder **como um humano** (natural, no tom da casa) e que **faz reservas** no Silbeck **via API**.

**Pontos de desenho que isso cria (propostas, a confirmar):**
- **Honestidade (Código de Cultura: Integridade e Transparência):** o agente escreve com naturalidade e no tom do Cabanas, mas **não se passa por pessoa**: se o hóspede perguntar se está falando com um robô, ele diz a verdade e oferece a equipe. As regras da Meta para o WhatsApp Business também pedem que o atendimento automatizado seja do próprio negócio e que haja caminho para um humano.
- **Reserva pelo agente:** depende de a Silbeck liberar uma **API de disponibilidade, tarifa e criação de reserva** (a confirmar). Pagamento: 50% antecipado; cartão (até 6x), débito ou depósito; sem boleto (`hotel-operacional.md`).
- **Limites do agente:** não dá desconto (só o dono), não promete o que o hotel não entrega, passa para a equipe os casos sensíveis (reclamação, grupo grande, agência, exceção de política).
- O agente é um novo "funcionário" de IA: o cargo passa pela RH e pela aprovação do dono (regra do `CLAUDE.md`).
