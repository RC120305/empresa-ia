# Análise da jornada do lead e teste de cenários (CRM Cabanas)

> 30/09/2026. Pedido do dono: analisar toda a trajetória do lead, testar se as ferramentas idealizadas estão conectadas e achar lacunas no processo.
> **Base:** `entrevista.md` (P1–P46), `funcionalidades.md`, `analise-critica.md`, `upsell-catalogo.md`, especificação oficial da API da Silbeck (`silbeck/swagger-hotel-v1.yaml`) e o protótipo v16.
> **Método:** (1) teste automático do protótipo (todas as telas e painéis, fluxo de orçamento e cobrança); (2) 24 cenários percorridos passo a passo, conferindo em cada passagem qual ferramenta age, com que dado e se a API existe.

## 1. A jornada, de ponta a ponta

| Etapa | O que acontece | Ferramentas | Situação |
|---|---|---|---|
| 1. Entrada | Mensagem chega no 99110, 99117, direct ou Messenger | Cloud API da Meta (webhook), caixa única | ✅ |
| 2. Identificação | Contato novo ou existente (telefone, e-mail, histórico do Silbeck); origem (anúncio, link rastreável, pergunta) | Junção de duplicados, links rastreáveis, base do Silbeck | ✅ (lacunas G5, G9) |
| 3. Atendimento | Gilberto (17h–7h30) ou equipe; passagem com prazo | Agente, regras, fila "Aguardando a equipe" | ✅ (lacuna G13) |
| 4. Orçamento | Datas e pessoas extraídas da conversa; vagas e preço do Silbeck; até 3 opções com fotos | `Disponibilidade`, `TipoApartamento`, `Tarifario/Valor`, banco de imagens | ⚠️ (G3, G7) |
| 5. Follow-up | 1ª tentativa em 24 h; 2ª em 3 dias com modelo pago | Régua, modelos da Meta | ⚠️ (G8, G9, G10) |
| 6. Aceite e reserva | Reserva criada no Silbeck no aceite (P46) | `POST reserva` | ⚠️ (G2, G6) |
| 7. Pagamento | Pix BB ou link Cielo; prazo 24 h / 2 h; lembretes; alerta; cancelamento manual | API Pix BB, Cielo, `Adiantamento`, painel "Reservas a receber" | ⚠️ (G1) |
| 8. Pós-reserva | Confirmação, upsell, atividades, massagem, decoração | Catálogo, sistema interno, parceira | ⚠️ (G4, G11, G16) |
| 9. Pré-chegada | Pré-check-in (ficha no Silbeck), como chegar, o que trazer | Régua, `FichaHospede` | ⚠️ (G6) |
| 10. Estadia | Status Hospedado, pedidos, reclamações, upsell do dia | `ListaEstadia`, setores | ⚠️ (G12) |
| 11. Pós-estadia | NPS, avaliação, convite para voltar, Booking → direto | Régua, modelos de marketing | ✅ (G8) |
| 12. Perda e recompra | Motivo, lista de espera, campanhas | Funil, vagas, campanhas | ⚠️ (G5) |

**Conclusão geral:** a espinha dorsal está conectada. Os dados passam de uma etapa à outra, e para quase todas as passagens existe API ou regra definida. As lacunas se concentram em três pontos: o **dinheiro depois do prazo**, as **mudanças depois da reserva** e as **regras de venda que o Silbeck não entrega pela API**.

## 2. Teste automático do protótipo (v16)
- **10 de 10 telas** abrem sem erro de programação. As 7 conversas de exemplo foram percorridas com os 5 painéis cada (reservas, histórico, orçamento, vagas, tarefas), e nenhum painel ficou vazio.
- **Fluxo testado:** orçamento (8 opções com vaga, 3 sem vaga esmaecidas) → 2 opções escolhidas → enviar → card em **Orçamento enviado** → registrar reserva → card em **Aguardando pagamento**. Funcionou.
- **O que falta no protótipo (não é erro, é desenho ainda não desenhado):**
  - não há o passo **"cliente aceitou a opção X"**: a reserva não sai preenchida a partir da opção escolhida no orçamento;
  - não há **confirmação de pagamento** levando o card a **Reservado**;
  - o desenho de P46 (**contagem regressiva**, painel **"Reservas a receber"**, tarefa **"Cancelar no Silbeck"**) ainda não está nas telas.

## 3. Cenários testados

Legenda: ✅ o desenho cobre · ⚠️ cobre com lacuna · ❌ não coberto.

| # | Cenário | Resultado | Lacuna |
|---|---|---|---|
| 1 | Casal chega por anúncio no 99117 às 21h, Gilberto cota o fim de semana, cliente aceita e paga o Pix | ⚠️ O fluxo fecha, mas não está definido **quais dados o Gilberto pede para reservar** (nome completo, e-mail, nomes dos acompanhantes) nem o envio da **política de cancelamento antes do pagamento** | G6 |
| 2 | Família (2 adultos, crianças de 3 e 8 anos) começa no direct e passa para o WhatsApp | ⚠️ A junção pelo telefone funciona. Falta saber se a **criança de 3 anos conta na capacidade** do quarto e se paga | G7 |
| 3 | Família de 6 ou grupo de 12 | ❌ O orçamento só monta **1 acomodação por opção**. A API aceita vários quartos na mesma reserva, mas o orçamento não combina 2 ou 3 acomodações | G3 |
| 4 | Feriado sem vaga | ✅ Datas alternativas e lista de espera. ⚠️ O aviso de vaga aberta sai fora da janela de 24 h e precisa de **modelo aprovado** | G10 |
| 5 | Pediu preço e sumiu | ⚠️ A 2ª tentativa é marketing e exige **consentimento**, mas não está definido **quando e como** o consentimento é pedido | G8 |
| 6 | Lead só no direct do Instagram, sem telefone, some | ❌ Fora de 24 h o direct não permite mensagem de venda: **não há 2ª tentativa possível** | G9 |
| 7 | Aceitou, reserva criada, não pagou em 24 h | ✅ P46: lembretes, alerta, tarefa de cancelamento. ⚠️ Lembretes fora da janela precisam de **modelo de utilidade** | G10 |
| 8 | **Pagou depois do prazo**, com a reserva já cancelada pela equipe | ❌ O dinheiro entra numa reserva que não existe mais. A cobrança precisa **vencer junto com o prazo** e ser **invalidada** quando a equipe cancela | G1 |
| 9 | Pagou pelo link Cielo em 6x | ✅ Adiantamento tipo 4 com NSU, autorização e parcelas | — |
| 10 | Pagou o valor total em vez do sinal, ou valor diferente | ✅ Alerta de valor diferente (P46) | — |
| 11 | Gilberto e Jagles vendem a **última vaga** ao mesmo tempo | ⚠️ O CRM confere a vaga antes de reservar, mas **não se sabe se a API do Silbeck recusa reserva sem vaga** (overbooking) | G2 |
| 12 | Orçamento enviado na segunda, aceito na sexta com o preço já mudado | ⚠️ Depende da **validade do orçamento** (decisão pendente). O CRM deve recotar no aceite e avisar se mudou | G7 |
| 13 | Cliente quer **trocar as datas** depois de pagar | ❌ A API não altera reserva. Não há fluxo definido: tarefa para a equipe, cobrança da diferença, remarcação das atividades e da régua | G4 |
| 14 | Cliente **cancela depois de pagar** | ❌ Sem fluxo: cancelamento no Silbeck, **devolução pela política** (manual), atividades e massagem desfeitas, motivo de perda próprio | G4, G11 |
| 15 | Reserva pelo motor com cartão, de quem já tinha conversado no direct | ✅ Casamento pelo telefone ou e-mail; a origem é mantida | — |
| 16 | Reserva do Booking | ✅ Card "a cobrar", tarefa, baixa automática. ⚠️ Se o Booking cancelar, a **régua precisa parar sozinha** | G11 |
| 17 | Agência reserva para um cliente | ⚠️ `codigoEmpresa` ok. Faltam o **contato do hóspede** para a pré-chegada e a decisão de tarifa comissionada ou líquida | G15 |
| 18 | Reserva feita por telefone ou no balcão, direto no Silbeck | ✅ A sincronização cria o contato; origem marcada com 1 toque | — |
| 19 | Hóspede que volta 1 ano depois | ⚠️ Não está definido se vira **novo negócio** no mesmo contato. Hoje o desenho tem um card por pessoa, e o funil misturaria a estadia antiga com a nova | G5 |
| 20 | Hospedado pede toalha pelo 99117 | ⚠️ O CRM "encaminha ao setor", mas **não está definido como o setor recebe** (usuário do CRM, grupo, telefone do setor) | G12 |
| 21 | Hospedado compra boia cross para hoje às 15h30 | ✅ Horário pelo sistema interno; lançamento por tarefa de 1 clique | — |
| 22 | Madrugada: pergunta que o Gilberto não sabe, ou "você é um robô?" | ✅ Passagem para a equipe (B2); honestidade (P41) | — |
| 23 | Ponte com o Silbeck fora do ar no momento do aceite | ✅ Sem reserva não sai cobrança; tarefa para a equipe (C3). Regra a deixar explícita: **nunca cobrar sem reserva criada** | — |
| 24 | Equipe responde pelo **app do celular** no 99117 (coexistência) enquanto o Gilberto está ligado | ⚠️ Risco de **resposta dupla**. A mensagem enviada pelo app precisa pausar o Gilberto naquela conversa | G13 |

**Placar:** 7 ✅ · 12 ⚠️ (incluindo 3 que funcionam com um detalhe a acertar) · 5 ❌.

## 4. Lacunas encontradas e propostas

### 🔴 Resolver antes de construir

**G1. Pagamento depois do prazo ou da reserva cancelada.**
- **Proposta:** a cobrança Pix (com vencimento) e o link Cielo (com validade) vencem **junto com o prazo da reserva**. "Dar mais prazo" gera **cobrança nova**. Ao marcar "Vou cancelar", o CRM **invalida a cobrança** antes de a equipe cancelar no Silbeck.
- Se ainda assim cair um pagamento numa reserva cancelada: **alerta imediato** com duas saídas. **Recriar a reserva** (se houver vaga) ou **devolver** o valor (manual, pelo banco ou pela Cielo).

**G2. Overbooking pela API.**
- **Proposta:** conferir a vaga (`Disponibilidade`) imediatamente antes do `POST reserva` e **perguntar à Silbeck se a API recusa reserva sem vaga**.
- Se não recusar, o CRM confere de novo logo depois de criar e, havendo conflito, alerta a equipe na hora. Nesse caso, a cobrança só é enviada depois da segunda conferência.

**G3. Orçamento e reserva com mais de uma acomodação.**
- **Proposta:** o orçamento passa a montar **combinações** (ex.: 2 × Apto Standard, ou Cabana Master + Apto Standard) quando o grupo não cabe num quarto só. A reserva vai com vários itens (`listaReservaItem`).
- Grupos acima de um limite (ex.: 10 pessoas) seguem indo para a equipe.

**G4. Mudanças depois da reserva (alterar datas, trocar acomodação, cancelar depois de pagar).**
- **Proposta:** botões **"Pedir alteração"** e **"Pedir cancelamento"** no card. Ambos criam uma tarefa para a equipe fazer no Silbeck.
- Depois disso, o CRM:
  - lê a reserva nova;
  - **recalcula a diferença** e envia a cobrança dela;
  - aplica a **política de cancelamento** (texto fixo) e cria a tarefa de **devolução** quando couber;
  - usa o motivo de perda próprio **"cancelou depois de pagar"**.

**G5. Contato × negócio.**
- **Proposta:** separar o **contato** (a pessoa, com todo o histórico) dos **negócios** (cada pedido de estadia).
- Um mesmo contato pode ter vários negócios ao longo dos anos, até dois ao mesmo tempo. O funil mostra **negócios**, e a ficha mostra a pessoa com todas as estadias.

**G6. Dados para reservar e aceite da política.**
- **Proposta:** no aceite, o Gilberto (ou a equipe) confirma **nome completo do titular, e-mail e nomes dos acompanhantes**. Se o cliente não souber os nomes, a reserva vai com "Acompanhante 1, 2…", e a ficha completa vem no pré-check-in.
- Junto com a cobrança vai a **política de cancelamento** (resposta fixa). O CRM **registra** que ela foi enviada.

**G7. Regras de venda que a API não traz.**
- **Proposta:** uma tela **"Regras de venda"** no CRM, lida pelo Gilberto e pelo orçamento:
  - **estadia mínima** por período (feriados e alta);
  - **pacotes fechados** (ex.: Réveillon);
  - **antecedência mínima** (1 noite);
  - **validade do orçamento**;
  - **idade até a qual a criança não paga** e se ela ocupa lugar no quarto.
- No aceite, o CRM **recota** e avisa se o preço mudou.

### 🟡 Resolver na fase indicada

**G8. Consentimento para marketing (fase 1).** Momento definido: ao enviar o orçamento, o Gilberto pergunta uma vez "Posso te avisar de novidades e condições especiais por aqui?". Também valem o "sim" na ficha de pré-check-in e o balcão. Sem consentimento, só mensagens de serviço.

**G9. Lead só no direct ou no Messenger (fase 1).** O Gilberto pede o **WhatsApp** logo no início ("para te mandar as fotos e o orçamento"). Sem telefone, o follow-up fica limitado à janela de 24 h, e o card mostra o aviso.

**G10. Kit de modelos da Meta (fase 1, antes de ligar).** Precisam estar aprovados:
- **Utilidade:**
  - confirmação de reserva;
  - lembrete de pagamento;
  - cobrança vencida;
  - pré-check-in;
  - como chegar;
  - pedido à parceira (massagem);
  - aviso de vaga da lista de espera, se aceito como utilidade.
- **Marketing:**
  - follow-up por perfil;
  - convite para voltar;
  - reserve direto;
  - campanhas.

**G11. Efeito cascata de cancelamento ou alteração (fase 3).** Quando a reserva muda ou é cancelada (seja pelo Silbeck, pelo Booking ou pela equipe), o CRM:
- **cancela as mensagens programadas** da régua;
- **desfaz ou remarca** boia cross, arvorismo, massagem (avisa a Natália) e decoração;
- avisa a lista de espera.

**G12. Pedidos do hóspede aos setores (fase 3).** Definir por setor: **usuário no CRM** (recepção, governança) com aviso no celular, ou mensagem automática para o **WhatsApp do setor**. Com prazo e confirmação de "resolvido".

**G13. Resposta pelo app do celular no 99117 (fase 1).** Mensagem enviada pelo app (coexistência) **pausa o Gilberto** naquela conversa por um tempo, igual a quando alguém assume pelo CRM.

**G14. Protótipo (antes do teste no PC).** Incluir:
- o passo **"cliente aceitou a opção X"**, com a reserva preenchida a partir da opção;
- a **confirmação de pagamento** que leva o card a **Reservado**;
- a **contagem regressiva**;
- o painel **"Reservas a receber"**;
- a tarefa **"Cancelar no Silbeck"**.

**G15. Agências (fase 2).** Pedir à agência o **WhatsApp do hóspede** para a pré-chegada (ou enviar à agência). Decisão pendente: tarifa comissionada ou líquida.

**G16. Saldo de 50% (fase 3).** A pré-chegada informa o **saldo a pagar no check-in**, com a opção de pagar antes por Pix ou link.

## 5. Perguntas novas para a Silbeck
1. O `POST reserva` recusa reserva quando não há vaga (overbooking)? (G2)
2. `maximoOcupantes` conta as crianças pequenas? (G7)
3. A API tem restrição de estadia mínima ou fechamento de venda por período? (G7)
4. O `FichaHospede` consegue incluir acompanhantes que não estavam na reserva? (G6)
