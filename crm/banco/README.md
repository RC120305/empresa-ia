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

## Segurança
- RLS ligada em todas as tabelas, sem políticas por enquanto: só o servidor (chave secreta) acessa. As políticas por papel (§3.10 da especificação) entram junto com o login da equipe.
- Chaves só no Secret Manager: `supabase-secret-key` (servidor) e `supabase-db-password` (migrações automáticas, mais adiante).
- Teste local: as migrações são testadas num Postgres 16 local antes de ir para o Supabase (rodar 2 vezes, idempotência, e permissão negada para `anon`).
