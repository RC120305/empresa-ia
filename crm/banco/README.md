# Banco do CRM (Supabase, São Paulo)

Projeto `cabanas-crm` (sa-east-1), URL `https://gpvhnclniolxxxjkslkf.supabase.co`.

## Migrações
Arquivos numerados, aplicados em ordem no **SQL Editor** do Supabase (New query → colar → Run). Todos podem rodar de novo sem estragar nada.

| Arquivo | O que cria | Aplicado em |
|---|---|---|
| `001_inicial.sql` | contatos, identificadores, conversas, mensagens, eventos de entrada; funções `registrar_entrada_whatsapp` e `registrar_status_whatsapp` (só o servidor pode chamar) | 01/10/2026 (dono, SQL Editor) |
| `002_caixa_entrada.sql` | tabela `usuarios` (equipe liberada), regras de leitura só para a equipe, `marcar_conversa_lida`, tempo real em `mensagens` e `conversas` | 02/10/2026 (dono, SQL Editor) |
| `003_envio.sql` | `equipe_por_email` e `registrar_saida_whatsapp` (responder pelo CRM; só o servidor chama) | 02/10/2026 (dono) |
| `004_midias.sql` | colunas `midia_caminho`, `midia_mime`, `midia_nome` em `mensagens`; compartimento privado `midias` no Storage; `registrar_saida_midia` (só o servidor chama) | 02/10/2026 (dono) |
| `005_transcricao.sql` | colunas `transcricao` e `transcricao_status` em `mensagens` (texto dos áudios) | 02/10/2026 (dono) |
| `006_orcamentos.sql` | `orcamentos` e `orcamento_eventos` (página pública `/o/<token>`, aberturas e "Quero reservar"), `registrar_abertura_orcamento` (só o servidor) | 02/10/2026 (dono) |
| `007_ficha.sql` | coluna `email` em `contatos` (ficha do cliente na caixa) | 02/10/2026 (dono) |
| `008_funil_tarefas.sql` | `negocios` (funil), `tarefas` e `negocio_eventos` (histórico); gatilhos que movem o card sozinho (conversa nova → Novo, 1ª resposta → Em atendimento, orçamento → Orçamento enviado); cria os negócios das conversas que já existem | 02/10/2026 (dono) |
| `009_produtos_agencias_ajustes.sql` | `produtos` (já com combo, boia cross, arvorismo, decoração e massagem), `agencias`, `respostas` (biblioteca) e `sugestoes` (revisão das sugestões do Gilberto) | 02/10/2026 (dono) |
| `010_biblioteca_origem.sql` | coluna `origem` em `respostas` (equipe, questionário ou revisão) | 02/10/2026 (dono) |
| `011_fotos_biblioteca.sql` | `fotos_biblioteca`: fotos que a equipe trouxe do Drive e fotos da curadoria tiradas/devolvidas no Banco de fotos | 02/10/2026 (dono) |
| `012_produtos_vendas.sql` | produtos completos (para quem, idade e altura, preço em número, variações, adicionais, foto representativa e fotos), `ofertas` (1 por conversa) e `vendas` (na conta do hóspede, com tarefas) | até 04/10/2026 (dono, conferido) |
| `013_alertas.sql` | `alertas` (sino da equipe): "Cliente pediu produto" e "Lançar na conta do hóspede" às 8h do check-in | até 04/10/2026 (dono, conferido) |
| `014_vitrines.sql` | links de extras (`vitrines`): páginas "Aventuras no Rio Formoso" e "Momentos especiais"; campo `vitrine` nos produtos; `registrar_abertura_vitrine` | até 04/10/2026 (dono, conferido) |
| `015_correcoes_questionario.sql` | origem `correcao` nas respostas: edição das respostas do questionário (o Gilberto usa a versão corrigida) | até 04/10/2026 (dono, conferido) |
| `016_produtos_fotos.sql` | `fotos` nos produtos: fotos escolhidas (do Drive ou do Banco de fotos), a primeira é a capa | até 04/10/2026 (dono, conferido) |
| `017_cobrancas_pix.sql` | `cobrancas` (Pix do Banco do Brasil: txid, valor, prazo, copia e cola, baixa) e alertas "Pagamento recebido" / "Cobrança vencida" | até 04/10/2026 (dono, conferido) |
| `018_alertas_atendimento.sql` | alertas de atendimento (pede pessoa, reclamação, cancelamento, alteração, Gilberto passou), plantão (`config`) e escalonamento | até 04/10/2026 (dono, conferido) |
| `019_avisos_celular.sql` | `push_inscricoes` (aparelhos com avisos no celular ativados) e `alertas.notificado_em` | (pendente: rodar no SQL Editor) |
| `020_reservas.sql` | `reservas` (reserva criada pelo CRM no Silbeck: número, item, titular, valor, situação) e `cobrancas.reserva_id` | (pendente: rodar no SQL Editor) |
| `021_gilberto_automatico.sql` | `conversas.gilberto_pausado` (a equipe assumiu a conversa; o Gilberto automático não responde nela) | (pendente: rodar no SQL Editor) |
| `022_reserva_combinada.sql` | `reservas.itens` (reserva de grupo em mais de uma acomodação: um item por acomodação; o pagamento é dividido entre eles) | (pendente: rodar no SQL Editor) |
| `023_documentos_gilberto.sql` | `gilberto_documentos` (documentos que ensinam o Gilberto: a equipe envia, o dono aprova) | (pendente: rodar no SQL Editor) |
| `024_videos_biblioteca.sql` | `fotos_biblioteca` passa a aceitar vídeos (.mp4) do Drive | (pendente: rodar no SQL Editor) |
| `025_pedidos_parceiro.sql` | `pedidos_parceiro` (massagem: pedido à parceira, opções e confirmação), novos alertas `parceiro_sem_resposta`/`parceiro_confirmou` e o número da parceira em `config` | (pendente: rodar no SQL Editor) |
| `026_apartamentos.sql` | `apartamentos` (os 21 apartamentos pela numeração, com categoria e o que distingue cada um) e `fotos_biblioteca.apartamento` (foto ligada a um apartamento) | rodada pelo dono em 08/10/2026 |
| `027_agencias_silbeck.sql` | `agencias.silbeck_id`, `eh_agencia` e `sincronizado_em`: o CRM traz as Empresas do Silbeck (ligação pelo CNPJ) e a aba Agências mostra só as marcadas como agência/operadora | (pendente: rodar no SQL Editor) |

## Segurança
- RLS ligada em todas as tabelas, sem políticas por enquanto: só o servidor (chave secreta) acessa. As políticas por papel (§3.10 da especificação) entram junto com o login da equipe.
- Chaves só no Secret Manager: `supabase-secret-key` (servidor) e `supabase-db-password` (migrações automáticas, mais adiante).
- Teste local: as migrações são testadas num Postgres 16 local antes de ir para o Supabase (rodar 2 vezes, idempotência, e permissão negada para `anon`).
