# Banco do CRM (Supabase, São Paulo)

Projeto `cabanas-crm` (sa-east-1), URL `https://gpvhnclniolxxxjkslkf.supabase.co`.

## Migrações
Arquivos numerados, aplicados em ordem no **SQL Editor** do Supabase (New query → colar → Run). Todos podem rodar de novo sem estragar nada.

| Arquivo | O que cria | Aplicado em |
|---|---|---|
| `001_inicial.sql` | contatos, identificadores, conversas, mensagens, eventos de entrada; funções `registrar_entrada_whatsapp` e `registrar_status_whatsapp` (só o servidor pode chamar) | pendente |

## Segurança
- RLS ligada em todas as tabelas, sem políticas por enquanto: só o servidor (chave secreta) acessa. As políticas por papel (§3.10 da especificação) entram junto com o login da equipe.
- Chaves só no Secret Manager: `supabase-secret-key` (servidor) e `supabase-db-password` (migrações automáticas, mais adiante).
- Teste local: as migrações são testadas num Postgres 16 local antes de ir para o Supabase (rodar 2 vezes, idempotência, e permissão negada para `anon`).
