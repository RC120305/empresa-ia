# Upsell: catálogo de produtos e reserva de atividades

> 29/09/2026. Desenho aprovado pelo dono (P38 em `entrevista.md`). Protótipo: aba **Produtos** e painel da conversa (v11).

## 1. Catálogo de produtos (tela "Produtos")
Um lugar único para tudo o que o hotel vende além da diária. Cada produto tem:

| Campo | Exemplo | De onde vem |
|---|---|---|
| Nome, código, descrição, fotos | Boia cross · BOIA · "1.200 m pelo Rio Formoso…" | Equipe (fotos do banco de imagens) |
| **Preço** | R$ 100 por pessoa | **Silbeck** (`GET /v1/Produto`), sincronizado |
| **Regras** | ≥ 5 anos e ≥ 1,15 m; sem gestantes; sem álcool | Equipe |
| **Antecedência mínima** | Decoração: 3 dias | Equipe |
| **Como se reserva** | Atividade com horário (sistema interno) · Serviço de terceiro (tarefa de agendamento) · Serviço simples (sem horário) | Equipe |
| **Quando oferecer** | Na cotação · 3 dias antes · durante a estadia | Equipe |
| **Para quem** | Perfis (família, casal, grupo, 55+), idade mínima, acomodação | Equipe |
| **Prioridade** | 1 = combo, 2 = boia cross, 3 = arvorismo | Equipe |
| **Ativo / inativo** | Piquenique: inativo | Equipe |

**Incluir mais produtos:** botão **"+ Novo produto"** ou **"Importar do Silbeck"** (traz nome e preço; a equipe completa regras, fotos e momento).

### Catálogo inicial
| Código | Produto | Preço | Tipo de reserva | Prioridade |
|---|---|---|---|---|
| COMBO | Combo boia cross + arvorismo | R$ 170/pessoa | Atividade com horário (2 horários) | 1 |
| BOIA | Boia cross | R$ 100/pessoa | Atividade com horário | 2 |
| ARVO | Arvorismo | R$ 120/pessoa | Atividade com horário | 3 |
| FLUT | Flutuação | R$ 100/pessoa | Atividade com horário | 4 |
| MASS | Massagem (avulsa ou pacote) | varia | Terceiro: tarefa de agendamento | 5 |
| DECO | Decoração especial | [a confirmar] | Simples, ≥ 3 dias de antecedência | 6 |
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
1. **O agente pode confirmar a reserva do horário sozinho** (com pagamento na hora ou na conta), ou só propõe e a equipe confirma?
2. **Documentação da API do sistema interno** das atividades (endpoints, autenticação, quem mantém).
3. Horários e capacidade por saída de cada atividade, e se a flutuação também está no sistema interno.
4. Preço da decoração especial e dos pacotes de massagem.
