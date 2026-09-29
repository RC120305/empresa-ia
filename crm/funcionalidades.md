# CRM Cabanas: lista de funcionalidades (para o dono validar)

> Versão 1, 29/09/2026. Junta o que já foi decidido na entrevista (`entrevista.md`), os pedidos do dono sobre o protótipo e o que um CRM de hotel costuma ter.
> **Legenda:** ✅ decidido na entrevista · 🆕 pedido do dono no protótipo · 💡 sugestão da equipe (o dono aprova ou corta) · Fase = ordem de construção aprovada (1 a 4).
> **Validada pelo dono em 29/09/2026** (página de validação): **61 itens mantidos, 1 cortado (1.12)**, nenhum item novo em "falta". Comentários do dono incorporados abaixo (💬).

## 1. Funil de vendas
| # | Funcionalidade | Status | Fase |
|---|---|---|---|
| 1.1 | Colunas por etapa (Novo, Em atendimento, Orçamento enviado, Reservado, Perdido) | ✅ | 1 |
| 1.2 | **Arrastar e soltar** o card entre as etapas | 🆕 | 1 |
| 1.3 | **Mudar a etapa dentro do card** (o card se move sozinho) | 🆕 | 1 |
| 1.4 | **Clicar no card abre a ficha completa** do cliente | 🆕 | 1 |
| 1.5 | Ao mover para **Perdido**, pedir o **motivo** (lista fixa + outro) | ✅ | 1 |
| 1.6 | Ao mover para **Reservado**, ligar ao número da reserva no Silbeck (automático na fase 3). 💬 *Integração pela API: quando a reserva é feita no Silbeck, o sistema busca os dados e concilia com o lead do CRM.* | ✅ | 1/3 |
| 1.7 | Filtros do funil: responsável, origem, perfil, datas da estadia, canal | 💡 | 1 |
| 1.8 | Busca por nome, telefone ou e-mail | 💡 | 1 |
| 1.9 | Valor previsto por card e soma por coluna | 💡 | 1 |
| 1.10 | Alerta visual de lead parado (ex.: sem resposta há 24 h) | 💡 | 1 |
| 1.11 | Etapas editáveis (criar, renomear, reordenar) | 💡 | 2 |
| ~~1.12~~ | ~~Funis separados (ex.: Hospedagem × Agências × Eventos/grupos)~~ **Cortado pelo dono** | 💡 | — |
| 1.13 | Visão em lista/tabela, além das colunas | 💡 | 2 |

## 2. Ficha do cliente (lead / contato)
| # | Funcionalidade | Status | Fase |
|---|---|---|---|
| 2.1 | **Editar dados** do cliente (nome, telefones, e-mail, cidade/estado, data de nascimento, observações) | 🆕 | 1 |
| 2.2 | **Trocar o responsável** (qual usuário assume o lead) | 🆕 | 1 |
| 2.3 | **Agendar atividades/tarefas** (ligar, enviar proposta, lembrete) com data, hora e responsável | 🆕 | 1 |
| 2.4 | Histórico completo: todas as conversas (WhatsApp, direct, Messenger), mudanças de etapa, tarefas e reservas | 💡 | 1 |
| 2.5 | Perfil detectado (casal, família, grupo, 55+...) editável | ✅ | 1 |
| 2.6 | Origem real + canal de entrada (editáveis, com registro de quem mudou) | ✅ | 1 |
| 2.7 | Pedido da estadia: datas, hóspedes (adultos/crianças com idades), acomodação desejada | ✅ | 1 |
| 2.8 | Reservas anteriores (vindas do Silbeck) e valor gasto no total | ✅ | 3 |
| 2.9 | Etiquetas livres (ex.: "aniversário de casamento", "VIP") | 💡 | 1 |
| 2.10 | Anotações internas (não vão para o cliente) | 💡 | 1 |
| 2.11 | Juntar contatos duplicados (mesma pessoa no direct e no WhatsApp) | ✅ | 1 |
| 2.12 | Consentimento para mensagens de marketing (sim/não, data) — exigência da LGPD e da Meta | 💡 | 1 |
| 2.13 | Cadastro de **agência** (contatos, comissão, reservas feitas) | ✅ | 2 |

## 3. Tarefas e agenda
| # | Funcionalidade | Status | Fase |
|---|---|---|---|
| 3.1 | Lista "Minhas tarefas de hoje" / atrasadas | 💡 | 1 |
| 3.2 | Agenda (dia/semana) com as tarefas de todos | 💡 | 2 |
| 3.3 | Aviso da tarefa no celular/no sistema na hora marcada | 💡 | 2 |
| 3.4 | Tarefas automáticas (ex.: agendamento de massagem com o terceiro, decoração a encomendar) | ✅ | 3 |

## 4. Conversas (caixa de entrada)
| # | Funcionalidade | Status | Fase |
|---|---|---|---|
| 4.1 | WhatsApp 99110 + 99117 + direct do Instagram + Messenger numa fila só | ✅ | 1 |
| 4.2 | Agente responde direto nos horários definidos; equipe assume a qualquer momento | ✅ | 2 |
| 4.3 | Transferir conversa para outro usuário | 💡 | 1 |
| 4.4 | Respostas rápidas (atalhos de texto da equipe) | 💡 | 1 |
| 4.5 | Enviar foto, PDF, áudio e localização; ouvir áudio do cliente (e transcrição) | 💡 | 1 |
| 4.7 | Botão "Enviar do banco de imagens e vídeos" na conversa, com busca por etiqueta | 🆕 | 2 |
| 4.6 | Filtros: aguardando, com o agente, minhas, por canal | ✅ | 1 |

## 5. Agente de IA (aba Ajustes do agente)
| # | Funcionalidade | Status | Fase |
|---|---|---|---|
| 5.1 | Revisão depois: Aprovar / Corrigir / Reprovar; correção vira resposta de referência | 🆕 | 2 |
| 5.2 | Fonte de conhecimento (arquivos, textos, links por tema). 💬 *Todos os campos editáveis; poder acrescentar informações dentro de cada tema e criar novos temas.* | 🆕 | 2 |
| 5.3 | Regras: horários, o que passa para pessoa, o que nunca faz | ✅ | 2 |
| 5.4 | Identificação automática do perfil pela fala | ✅ | 2 |
| 5.5 | Consulta de disponibilidade e **reserva no Silbeck**. 💬 *Via API da Silbeck.* | ✅ | 3 |
| 5.6 | % de acerto e meta de 90% | ✅ | 2 |
| 5.7 | **Banco de imagens e vídeos** (importado do Drive, com etiquetas e descrição da cena) | 🆕 | 2 |
| 5.8 | Agente envia as fotos/vídeos certos conforme a pergunta (acomodação, atividade, perfil) | 🆕 | 2 |
| 5.9 | Mídias favoritas por tema; desativar sem apagar | 💡 | 2 |
| 5.10 | **Biblioteca de respostas** (pergunta → resposta), alimentada pelas correções da revisão, cadastro manual e importação da Asksuite | 🆕 | 2 |
| 5.11 | **Resposta fixa** (o agente envia o texto exatamente igual) | 🆕 | 2 |
| 5.12 | **Validade** da resposta (deixa de valer depois da data) | 🆕 | 2 |
| 5.13 | **Contador de usos** e **alerta de conflito** entre respostas e fontes | 🆕 | 2 |
| 5.14 | Questionário por tópicos com progresso; rascunho × publicado; painel "Testar o agente" | 🆕 | 2 |

## 6. Painel e relatórios
| # | Funcionalidade | Status | Fase |
|---|---|---|---|
| 6.1 | Filtro por data em todos os indicadores | ✅ | 2 |
| 6.2 | Leads, conversão, faturamento e diária média por origem | ✅ | 2 |
| 6.3 | Direta × OTA; noites domingo a quinta; motivos de perda | ✅ | 2 |
| 6.4 | Desempenho por atendente (e agente) | 💡 | 2 |
| 6.5 | Custo do mês (Meta + IA + servidor) × R$ 800 | ✅ | 2 |
| 6.6 | Resumo automático toda segunda de manhã | ✅ | 2 |
| 6.7 | Exportar para planilha | 💡 | 2 |

## 7. Régua de mensagens
| # | Funcionalidade | Status | Fase |
|---|---|---|---|
| 7.1 | Cadastro de mensagens com gatilho, público, conteúdo e número de envio | ✅ | 3 |
| 7.2 | Pré-chegada (pré-check-in, localização, o que trazer, upsell) e pós-estadia (NPS, avaliação, volta, Booking → direto). 💬 *Cada mensagem com seu campo de edição e possibilidade de cadastrar outras.* | ✅ | 3 |
| 7.3 | Follow-up: 1ª tentativa na janela de 24 h, 2ª em 3 dias com foto do perfil | ✅ | 2 |
| 7.4 | Campanhas avulsas para uma lista filtrada (ex.: hóspedes de MS para um feriado com vagas) | 💡 | 3 |

## 8. Usuários e configurações
| # | Funcionalidade | Status | Fase |
|---|---|---|---|
| 8.1 | Login individual (dono, Renata, Jagles, Márcio, outros atendentes) | ✅ | 1 |
| 8.2 | Permissões por papel (ex.: atendente não apaga lead, não vê faturamento) | 💡 | 1 |
| 8.3 | Registro de quem fez o quê (auditoria) | 💡 | 1 |
| 8.4 | Funciona no computador e no celular (app instalável pelo navegador) | ✅ | 1 |
| 8.5 | Notificações de nova conversa e de lead parado | 💡 | 1 |

## 9. Pagamentos (acrescentado em 29/09/2026)
| # | Funcionalidade | Status | Fase |
|---|---|---|---|
| 9.1 | Cobrança **Pix dinâmica pela API do Banco do Brasil** enviada no WhatsApp, com confirmação automática | 🆕 | 3 |
| 9.2 | Ao confirmar o Pix: criar/atualizar a reserva e **lançar o adiantamento no Silbeck**; avisar o cliente; card em Reservado | 🆕 | 3 |
| 9.3 | **Cartão por link da Cielo** gerado pelo CRM (até 6x), com confirmação automática e lançamento no Silbeck; link do motor da Silbeck como alternativa | 🆕 | 3 |
| 9.4 | **Sincronizar as reservas do motor da Silbeck** (e do Booking/agências): entram no CRM, casam com o lead existente e ficam como **pago** (cartão) ou **aguardando pagamento** (Pix) | 🆕 | 3 |
| 9.6 | Confirmar sozinho o **Pix do motor** pelos Pix recebidos no BB (1 clique quando houver dúvida); lembrete ao cliente e alerta de vencido | 🆕 | 3 |
| 9.5 | Etapa "Aguardando pagamento" com prazo e lembrete (A1) | ✅ | 1 |
| 9.7 | Reservas do **Booking**: card "a cobrar", tarefa de cobrança com prazo, lista de pendentes e baixa automática quando o pagamento aparece no Silbeck. **Sem dados de cartão no CRM** | 🆕 | 3 |
