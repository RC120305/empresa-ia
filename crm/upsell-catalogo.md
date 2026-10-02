# Upsell: catálogo de produtos e reserva de atividades

> **Implementado em 02/10/2026 (Etapa C2):** catálogo completo, painel 🛍 na conversa (indicados, oferecer, aceitou/recusou, registrar venda), ofertas do Gilberto registradas, extras selecionáveis na página do orçamento. Decisões do dono (02/10): **todo produto vai para a conta do hóspede e é acertado no check-out** (tarefa "Lançar na conta do hóspede"); **decoração = um produto com duas variações** (Simples e Completa).
> **Oferta no WhatsApp (dono, 02/10/2026):** cada produto tem uma **foto representativa**; a oferta sai numa mensagem só com foto, descrição, valor e botões de resposta ("Eu aceito" / "Não, obrigado"; com 2 opções, "Quero a Simples" / "Quero a Completa"). O toque do cliente marca a oferta e, se aceitou, cria a tarefa "Registrar venda". Só dentro da janela de 24 h (fora dela, só com modelo aprovado pela Meta).
> **Aceite dispara a reserva pela equipe (dono, 02/10/2026):** quando o cliente aceita (botão no WhatsApp ou extra marcado na página do orçamento), o CRM registra a **venda** sozinho (opção tocada, pessoas do orçamento, valor, conta do hóspede) e cria as tarefas para o responsável da conversa: **Agendar** (atividades) / **Preparar** (decoração) / **Pedir horário ao parceiro** (massagem) + **Lançar na conta do hóspede**. Se faltar a opção ou o número de pessoas, cria **Confirmar e registrar venda**. Ao cliente, nenhuma mensagem automática: quem responde é a equipe.
> **Sino e etiquetas (dono, 02/10/2026):** alertas com som no sino do topo: **Cliente pediu produto** (na hora do aceite) e **Lançar na conta do hóspede** (8h do dia do check-in; "✓ Lançado na conta" marca a venda e conclui a tarefa). No card do lead (lista de conversas e funil): etiqueta de **origem**, **etapa do funil**, **🛍 produtos comprados** ("falta lançar" enquanto não lançado) e destaque vermelho com alerta aberto. Notificação no celular: depois (com o app/PWA).
> **Oferta por link (dono, 02/10/2026):** a oferta passa a ser por **páginas de extras** (/e/<token>), em dois temas: **Aventuras no Rio Formoso** (combo, boia cross, arvorismo) e **Momentos especiais** (decoração e massagem). Cada produto com galeria (foto representativa + fotos da categoria no Banco de fotos), opções, adicionais, pessoas e dia dentro da estadia; total ao vivo. No WhatsApp vai com foto e botão "Ver as aventuras"/"Ver as opções" (dentro da janela de 24 h é gratuito e não precisa de modelo aprovado). A escolha vira venda na conta do hóspede + tarefas + alerta no sino. O link conta como a oferta da conversa (1 por conversa). O Gilberto oferece com a ferramenta `enviar_link_extras`.

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
| MASS | Massagem (parceiro Massagem 360): Massagem360, relaxante ou linfática | R$ 220 cada (adicionais: máscara de argila R$ 50 · reflexologia 15 min R$ 50 · cone hindu R$ 80 · +30 min R$ 150 · pedras quentes R$ 50) | Terceiro: pedido ao parceiro pelo WhatsApp | 5 |
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

## 2b. Massagem: pedido à parceira pelo WhatsApp (dono, 29/09; revisto em 01/10/2026, combinado com a Natália)
1. **Lado do cliente:** pelo **link de agendamento**, uma página como a do orçamento (`crm.hotelcabanas.com.br/m/…`, exemplo: https://claude.ai/artifact/PFzy7ZxGDHhcFhAxvrfF7D), o hóspede escolhe **tipo**, **onde** (à beira do rio ou no quarto), **dia** (dentro da estadia) e **horário**, além dos adicionais. Os horários já ocupados aparecem riscados. O Gilberto ou a equipe envia o link. Também dá para fazer o pedido pela conversa. São **6 horários por dia: 8h, 9h, 10h, 14h, 15h e 16h**. Tipos: Massagem360, relaxante ou linfática (R$ 220), com adicionais opcionais.
2. **Mensagem interna do sistema** para o WhatsApp da Natália, pelo número oficial do hotel, com modelo de utilidade aprovado pela Meta: "Reserva de massagem para hóspede do Hotel Cabanas: Massagem360 · 16/11 às 15h. Confirma?" com botões **[Confirmo] [Não posso]**.
3. **Confirmo:** a confirmação aparece no CRM e o sistema avisa o hóspede no WhatsApp e na página. **Não se pergunta sobre pagamento** (dono, 01/10/2026): o valor vai **sempre para a conta do hóspede**, acertada no check-out. Tudo fica no histórico do cliente.
4. **Lançamento na comanda:**
   - A conta do hóspede fica no **sistema de comandas do hotel**, separado do Silbeck, e o lançamento é **manual**.
   - Na confirmação, o CRM cria a tarefa **"Lançar na comanda"** (tipo, data e valor), para quem está de plantão.
   - **Alertas para não esquecer:**
     - **no dia do check-in do hóspede** (dono, 01/10/2026): alerta **no sino**, com som e notificação no celular, "Lançar massagem na comanda". Toca às 8h, quando a conta do hóspede já existe no sistema de comandas. Se a massagem for confirmada com o hóspede já hospedado, toca na hora. O alerta sai com o botão "✓ Lançado na comanda";
     - na manhã do check-out, a lista de **lançamentos pendentes** do hóspede aparece para a recepção antes de fechar a conta.
   - Concluir = botão "Lançado na comanda".
5. **Não posso:**
   - o sistema **pergunta à Natália quais datas e horários têm vaga** (dentro dos 6 horários; ela responde em texto ou por lista);
   - as opções aparecem para o hóspede na página e no WhatsApp, e ele escolhe;
   - o horário escolhido vira um **novo pedido** com os mesmos botões;
   - os horários indicados por ela ficam guardados para aquele hóspede por 2 h.
6. **Sem resposta em 2 h** no expediente: alerta para a equipe.

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
- **Massagem (parceiro Massagem 360):** Massagem360, Massagem relaxante e Massagem linfática, a R$ 220 cada (dono confirmou os 3 tipos em 01/10/2026; a "desportiva" da lista de preços saiu). Adicionais: máscara de argila R$ 50, reflexologia 15 min R$ 50, cone hindu R$ 80, acréscimo de 30 min R$ 150, pedras quentes R$ 50.
- **Descrições (do arquivo do dono):** Massagem360 é um mix de massagem relaxante, shiatsu, drenagem, reflexologia e alongamentos básicos. A Massagem relaxante aplica pressão suave a moderada nos músculos e tecidos, para relaxar e aliviar o estresse. A Massagem linfática é suave, com movimentos leves que estimulam a circulação da linfa e reduzem a sensação de inchaço e retenção de líquidos; boa para quem busca leveza e bem-estar.
- ✅ **Os valores são os do hóspede** (dono, 01/10/2026). A Natália paga uma **comissão ao hotel**: o CRM gera o relatório mensal de massagens realizadas para a conferência. Percentual: [a confirmar com o dono].
