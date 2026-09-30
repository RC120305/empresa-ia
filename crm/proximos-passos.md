# CRM Cabanas: próximos passos (30/09/2026)

## Onde estamos
Desenho praticamente fechado: entrevista (P1–P53), funcionalidades validadas, análise crítica e da jornada aprovadas, protótipo v25, API da Silbeck lida (swagger).

## 1. Fechar o desenho (curto)
- Protótipo: pergunta "reserva em nome de uma pessoa ou separada" (G3) e tela **Setores** (G12).
- Decisões do dono: crianças (até que idade não paga), página do orçamento ou só mensagem, tarifa de agência (comissionada ou líquida).
- Teste do dono no computador e últimos ajustes.

## 2. Pendências com terceiros (em paralelo)
| Quem | O quê |
|---|---|
| Silbeck (Pedro) | Respostas da mensagem (`silbeck/mensagem-pedro.md`): endpoints liberados, ambiente de teste, origem da reserva, API do motor |
| Márcio | Túnel seguro com o servidor do Silbeck; API do sistema interno de atividades |
| Meta | Conta do WhatsApp Business no portfólio; coexistência do 99117; migração do 99110 (só no fim) |
| Banco do Brasil | Acesso à API Pix (cobrança e leitura, nunca envio) e certificado |
| Cielo | Credenciais da API do link de pagamento |
| Asksuite | Exportar questionário, biblioteca e histórico antes de cancelar |
| Google Cloud / Supabase | Conta de faturamento do projeto e projeto novo do Supabase (São Paulo) |

## 3. Especificação técnica
Documento com modelo de dados, telas, integrações, regras do Gilberto, alertas e segurança. O dono aprova antes da construção.

## 4. Construção por fases (ordem aprovada em P18)
1. **Caixa única e funil:** WhatsApp 99117 (coexistência), Instagram e Messenger; contatos, funil, tarefas, nova conversa, respostas rápidas, alertas, login da equipe. Roda em paralelo com a Asksuite.
2. **Gilberto em treino e painel:** biblioteca, questionário, revisão, banco de imagens completo, follow-up, métricas.
3. **Silbeck e pagamentos:** vagas, orçamento, reserva, Pix BB e Cielo, reservas a receber, régua de pré e pós-estadia, upsell e atividades.
4. **Gilberto sozinho à noite** (após 90% de acerto), migração do 99110 e saída da Asksuite.

Cada fase: construir → testar em ambiente de teste → equipe usa de verdade → ajustes.

## 5. Ajustes depois de pronto
O sistema é do hotel: qualquer ajuste pode ser pedido a qualquer momento. Textos, respostas, modelos, produtos, regras do Gilberto e prazos a própria equipe muda nas telas de Ajustes, sem programação. Mudanças de tela ou de regra de negócio são pedidas no chat, testadas no ambiente de teste e só então publicadas.
