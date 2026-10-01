# Passo a passo: criar o projeto do CRM no Google Cloud

> Conta: a **conta Google pessoal do dono** (decisão D16), a mesma do Google AI Ultra. Região: **São Paulo (southamerica-east1)**.
> **Nunca** colar no chat nem no repositório: senha, chave JSON de conta de serviço, token ou dados do cartão.

## 1. Criar o projeto (5 min)
1. Acesse **console.cloud.google.com** logado na sua conta pessoal.
2. No primeiro acesso: país **Brasil**, aceite os termos.
3. No topo, clique no seletor de projetos → **Novo projeto**.
4. **Nome do projeto:** `Cabanas CRM`. O ID é gerado sozinho: **anote o ID**. ✅ Criado em 01/10/2026: `cabanas-crm`. Local: **Sem organização**.
5. **Criar.**

## 2. Faturamento (5 min)
1. Menu ☰ → **Faturamento** → **Vincular uma conta de faturamento** (ou **Criar conta**, com o cartão).
2. Em **Faturamento → Créditos**, confira se aparecem créditos do Google AI Ultra / Google Developer Program. Se não aparecerem, me avise, e vemos como ativar.
3. **Trava de gasto:** Faturamento → **Orçamentos e alertas** → **Criar orçamento**.
   - Valor: R$ 300/mês, para começar.
   - Alertas em 50%, 90% e 100%, enviados para o seu e-mail.

## 3. Dar acesso à equipe (3 min)
Menu ☰ → **IAM e administrador** → **IAM** → **Conceder acesso**:
- **Renata** e **Márcio** (recomendação D16), papel **Proprietário**, para não depender de uma pessoa só.

## 4. Me mandar só o ID do projeto
O ID (ex.: `cabanas-crm-123456`) não é segredo. Com ele, eu preparo o próximo passo.

## 5. Próximo passo (eu preparo, você ou o Márcio executa uma vez)
**Publicação automática sem chave nenhuma:** o GitHub publica o CRM no Cloud Run usando a **federação de identidade** do Google (Workload Identity Federation). Não existe chave para guardar nem para vazar. Eu escrevo o roteiro com os comandos; leva uns 15 minutos.
Depois disso, ativamos os serviços: Cloud Run, Secret Manager, Artifact Registry, Cloud Build e Cloud Scheduler.
