# CRM Cabanas: próximos passos (atualizado em 02/10/2026)

## Onde estamos
- **Desenho fechado:**
  - entrevista até a P58;
  - 16 decisões (D1–D16);
  - análise da jornada;
  - protótipo v30.
- **Silbeck:** API lida e respondida pela Silbeck.
- **Gilberto:** contratado (v1.1, nota 4,42), com base de conhecimento do questionário e formação em vendas (Tevah e Thaize).
- **WhatsApp:** plano definido: número de teste da Meta → 99117 por coexistência (modo observação) → saída da Asksuite → 99110.
- **No ar (01/10/2026):** Google Cloud `cabanas-crm` com publicação automática pelo GitHub (sem chaves); app "Cabanas CRM" na Meta; **webhook do WhatsApp de teste recebendo mensagens no CRM** (texto e status enviado/entregue/lido, assinatura conferida); **banco Supabase em São Paulo gravando contatos, conversas e mensagens** (migração `crm/banco/001_inicial.sql`).
- **Caixa de entrada no ar (02/10/2026):** login da equipe por link no e-mail, conversas ao vivo e **resposta pelo WhatsApp** (janela de 24 h). Endereço: https://crm-377803250649.southamerica-east1.run.app/caixa
- **Gilberto cota pelo Silbeck (02/10/2026):** na sugestão, o Gilberto chama `consultar_disponibilidade` e o CRM consulta o Silbeck (vagas + tarifa por tipo, regras de criança do hotel). Por enquanto no **simulador** (valores fictícios, com aviso na caixa); para o real, trocar `SILBECK_MODO=simulador` por `real` no `crm-deploy.yml` depois que `/saude/silbeck` mostrar "tudo certo".
- **Transcrição de áudio (02/10/2026, testada pelo dono):** áudios viram texto na caixa e o Gilberto lê; acima de 1 min, o ffmpeg corta em pedaços de 50 s (até ~8 min).
- **Etapa A do modelo (02/10/2026):** a caixa virou o CRM no visual do protótipo v30: barra lateral com as seções (as que ainda não existem mostram o que vem e em que etapa), Conversas em 3 colunas (Abertas/Resolvidas/Arquivadas, filtros, responsável e situação), ficha do cliente, montar orçamento pela equipe e vagas por dia. **Etapa B (02/10):** Funil com 6 etapas (arrastar, motivo da perda, novo lead, filtros, "parado há"), ficha do negócio com Dados/Tarefas/Histórico, seção Tarefas (atrasadas, hoje, próximas) e etapa + tarefas dentro da conversa; o card anda sozinho na 1ª resposta e no orçamento. **Etapa C (02/10):** Produtos (o Gilberto e a página do orçamento leem do banco), Agências, Ajustes do agente (revisão das sugestões com acerto da semana, biblioteca de respostas com atalhos "/" e respostas fixas, testar o agente, regras). Próximas: D, E e F dependem do Silbeck real, dos bancos e do 99117.
- **Banco de fotos gerenciável (02/10/2026):** na caixa, 🖼 Banco de fotos → ⚙ Gerenciar: tirar e devolver fotos de cada categoria e **trazer fotos do Drive** ("Imagens do hotel cabanas"; recorte automático 4:3, 1200x900, com descrição para o Gilberto). Falta o dono: rodar `crm/banco/011_fotos_biblioteca.sql`, rodar `crm/infra/ligar-drive.txt` e compartilhar a pasta com `crm-runtime@cabanas-crm.iam.gserviceaccount.com` (Leitor).
- **Na caixa (02/10/2026):** sugestão do Gilberto, balões enviados um por vez com pausa de digitação e **fotos, vídeos, áudios e documentos** (recebidos guardados no Storage; envio pelo 📎; envio de foto testado pelo dono).

## 1. O que depende do dono
| # | O quê | Por quê |
|---|---|---|
| 1 | ~~Projeto no Google Cloud~~ (feito 01/10). Falta: dar acesso de administrador à equipe | Manutenção |
| 2 | ~~App "Cabanas CRM" na Meta + webhook~~ (feito 01/10) | Caixa de entrada e testes do WhatsApp |
| 2a | ~~Projeto no Supabase (São Paulo)~~ (feito 01/10) | Banco de dados e login da caixa de entrada |
| 2b | Responder as perguntas P59–P73 (regras das conversas reais) | Base do Gilberto com uma regra só |
| 3 | **Exportar da Asksuite** a biblioteca de respostas e 30 a 50 conversas | Teste real do Gilberto e ajuste fino do tom |
| 4 | Acesso de administrador no portfólio da Meta (aguardando a empresa) → mandar os 6 pedidos | Decidir os pedidos com segurança |
| 5 | Preços da **decoração** e da **massagem** (cadastro de Produtos, D4) e uma foto de massagem | Gilberto e página do orçamento |

## 2. Pendências com terceiros
| Quem | O quê |
|---|---|
| Márcio | **SMTP do e-mail do hotel para os links de acesso do CRM** (`crm/infra/email-acesso-supabase.md`); Túnel ou VPN com o servidor do Silbeck; mapa de IDs (`silbeck/mapa-ids.md`); portal "CRM WhatsApp" no Silbeck; API do sistema de atividades |
| Banco do Brasil | API Pix (só cobrança e leitura) e certificado |
| Cielo | Credenciais do link de pagamento (mais adiante) |
| Supabase | Projeto novo (região São Paulo) |
| Silbeck (opcional) | Pedido de webhooks e de endpoints de cancelar e alterar |

## 2b. O que a equipe faz agora (não depende de ninguém)
1. **Especificação técnica** para o dono aprovar.
2. **Simulador da API do Silbeck**, para construir sem tocar no sistema real.
3. **Protótipo:** "reserva em um nome ou separada" (G3) e a tela Setores simplificada (D12).
4. **Prompt de sistema do Gilberto para o CRM**, gerado a partir de `.claude/agents/gilberto-vendas.md` + base de conhecimento.

## 2c. Para estudar no futuro
- **"Digitando…" no WhatsApp (02/10/2026):** o CRM pede o indicador à Meta antes de cada balão e a Meta responde `success: true`, mas no **número de teste** o balão de digitando não aparece no celular do dono. Conferir no **99117** (número real) logo na troca; se não aparecer, abrir chamado com a Meta. Os balões já saem um por vez, com pausa proporcional ao texto.
- **Lançamento automático na comanda** (dono, 01/10/2026): ver se o sistema de contas e comandas do hotel aceita lançamentos automáticos (API ou importação), para o CRM lançar a massagem sozinho e acabar com a tarefa manual "Lançar na comanda". Conversar com o Márcio depois da fase 3.

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
