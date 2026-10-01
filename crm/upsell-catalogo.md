# Upsell: catálogo de produtos e reserva de atividades

> 29/09/2026. Desenho aprovado pelo dono (P38 em `entrevista.md`). Protótipo: aba **Produtos** e painel da conversa (v11).

## 1. Catálogo de produtos (tela "Produtos")
Um lugar único para tudo o que o hotel vende além da diária. Cada produto tem:

| Campo | Exemplo | De onde vem |
|---|---|---|
| Nome, código, descrição, fotos | Boia cross · BOIA · "1.200 m pelo Rio Formoso…" | Equipe (fotos do banco de imagens) |
| **Preço** | R$ 100 por pessoa | **Equipe, no CRM** (a API do Silbeck só traz código e nome do produto) |
| **Regras** | ≥ 5 anos e ≥ 1,15 m; sem gestantes; sem álcool | Equipe |
| **Antecedência mínima** | Decoração: 3 dias | Equipe |
| **Como se reserva** | Atividade com horário (sistema interno) · Serviço de terceiro (tarefa de agendamento) · Serviço simples (sem horário) | Equipe |
| **Quando oferecer** | Na cotação · 3 dias antes · durante a estadia | Equipe |
| **Para quem** | Perfis (família, casal, grupo, 55+), idade mínima, acomodação | Equipe |
| **Prioridade** | 1 = combo, 2 = boia cross, 3 = arvorismo | Equipe |
| **Ativo / inativo** | Piquenique: inativo | Equipe |

**Incluir mais produtos:** botão **"+ Novo produto"** ou **"Importar do Silbeck"** (traz código e nome; a equipe completa o preço, completa regras, fotos e momento).

### Catálogo inicial
| Código | Produto | Preço | Tipo de reserva | Prioridade |
|---|---|---|---|---|
| COMBO | Combo boia cross + arvorismo | R$ 170/pessoa | Atividade com horário (2 horários) | 1 |
| BOIA | Boia cross | R$ 100/pessoa | Atividade com horário | 2 |
| ARVO | Arvorismo | R$ 120/pessoa | Atividade com horário | 3 |
| FLUT | Flutuação | — | **Não é mais oferecida** (dono, 29/09) | — |
| MASS | Massagem (parceiro Massagem 360): Massagem360, desportiva ou drenagem linfática | R$ 220 cada (adicionais: máscara de argila R$ 50 · reflexologia 15 min R$ 50 · cone hindu R$ 80 · +30 min R$ 150 · pedras quentes R$ 50) | Terceiro: pedido ao parceiro pelo WhatsApp | 5 |
| DECO-C | Decoração romântica **Completa**: balão personalizável, pétalas de rosas, tábua de frios completa, espumante e até 8 fotos polaroid do casal | R$ 600 | Simples, ≥ 3 dias de antecedência | 6 |
| DECO-S | Decoração romântica **Simples**: balão personalizável e até 8 fotos polaroid do casal | R$ 350 | Simples, ≥ 3 dias de antecedência | 6 |
| PIQ | Piquenique Sunset | — | **Inativo** | — |

## 2. Reserva de atividades pelo sistema interno do hotel (API)
O hotel tem um **sistema interno de reservas da boia cross e do arvorismo que aceita API**. O CRM se liga a ele:

1. **Consultar horários e vagas** do dia (ex.: 9h · 10h30 · 14h · 15h30, com vagas por saída).
2. **Reservar**: produto, data, horário, quantidade e nomes/idades dos participantes (checagem automática de idade e altura).
3. **Cancelar ou remarcar** (se a API permitir).
4. **Conferir** o que já está reservado para aquele hóspede (evita reserva em dobro).

**Quem reserva:**
- **Equipe:** no painel da conversa (Reservas e pagamentos → Produtos → **Reservar horário**): escolhe data, vê os horários com vagas, informa quantas pessoas, confirma. O CRM grava no sistema interno e registra no card do cliente.
- **Agente:** oferece e, se o cliente aceitar, **consulta os horários reais** e propõe ("amanhã às 14h ou 15h30?"). A confirmação da reserva segue a regra definida pelo dono (ver pendência 1).

**Combo:** reserva **dois horários** (boia cross e arvorismo) em sequência compatível, no mesmo dia ou em dias diferentes.

## 2b. Massagem: pedido ao parceiro pelo WhatsApp (decisão do dono, 29/09)
1. O hóspede escolhe tipo, data e horário (com o agente ou com a equipe).
2. O CRM envia ao **parceiro** (cadastro de parceiros: nome e WhatsApp) uma mensagem pelo número oficial do hotel: "Massagem relaxante 16/11 às 15h para hóspede do Hotel Cabanas. Confirma?" com botões **[Confirmo] [Não posso] [Outro horário]** (modelo de utilidade aprovado pela Meta).
3. **Confirmo** → o CRM confirma ao hóspede sozinho, registra na reserva e cria a cobrança/lançamento. **Não posso / Outro horário** → o agente oferece outra opção ao hóspede. **Sem resposta em 2 h** (horário comercial) → alerta para a equipe.

### Cadastro de parceiros
| Parceiro | Serviço | WhatsApp |
|---|---|---|
| **Natália** | Massoterapia (massagem avulsa e pacotes) | +55 67 99228-6365 |

## 3. Pagamento e lançamento no Silbeck
- Pagamento pelo mesmo caminho da hospedagem: **Pix BB** ou **link Cielo**, com confirmação automática.
- Adiantamento lançado no Silbeck (`POST /v1/Adiantamento`).
- **Lançamento do consumo na conta do hóspede:** a API da Silbeck vista até agora só **lê** lançamentos (`GET /v1/Lancamento`). Até confirmar na documentação, o CRM cria uma **tarefa de 1 clique** para a equipe lançar no Silbeck (com tudo preenchido).
- Alternativa: se o hóspede preferir pagar no check-out, a atividade fica reservada e o valor vai para a conta (tarefa de lançamento).

## 4. Como o agente oferece (regras)
- **No máximo 1 oferta por conversa**; recusou, não insiste.
- Só oferece o que **cabe no perfil** (idades, altura) e **tem vaga** no horário (consulta ao sistema interno).
- Ordem de prioridade do catálogo; respeita antecedência mínima (ex.: decoração ≥ 3 dias).
- Durante a estadia: oferece com vaga real do dia ("hoje às 15h30 ainda tem boia cross").
- Nunca dá desconto; o combo é o preço de pacote do catálogo.

## 5. Métricas
Receita de upsell por produto · taxa de aceite por momento (cotação, pré-chegada, estadia) · vendido pelo agente × equipe · upsell por reserva (média) · ocupação dos horários das atividades.

## 6. Pendências
1. ~~O agente pode confirmar sozinho?~~ **Sim** para decoração, boia cross e arvorismo (dono, 29/09). Massagem depende do parceiro (fluxo 2b).
2. **Documentação da API do sistema interno** das atividades: com o **Márcio**. O sistema **já controla horários e limite por horário**.
3. ~~Horários e capacidade~~: controlados pelo sistema interno. Flutuação: não existe mais.
4. Preço da decoração especial e dos pacotes de massagem.

## Preços enviados pelo dono (Drive, 01/10/2026)
- **Decoração:** Completa R$ 600 · Simples R$ 350 (arquivo "Decoração romântica no quarto", pasta "CRM - material Asksuite").
- **Massagem (parceiro Massagem 360):** Massagem360, desportiva e drenagem linfática a R$ 220. Adicionais: máscara de argila R$ 50, reflexologia 15 min R$ 50, cone hindu R$ 80, acréscimo de 30 min R$ 150, pedras quentes R$ 50.
- ⚠️ A confirmar com o dono:
  - a "massagem relaxante" aparece descrita, mas sem preço;
  - os valores são os cobrados do hóspede ou o hotel acrescenta algo?
  - o contato do parceiro fica no cadastro de parceiros do CRM, fora do repositório.
