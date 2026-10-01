# CRM Cabanas: aplicação

Fase 0: um serviço mínimo (`/saude`) para validar a publicação automática no Google Cloud Run.
Toda alteração em `crm/app/` na branch `main` é publicada pelo GitHub Actions (`.github/workflows/crm-deploy.yml`) usando a federação de identidade do Google, **sem nenhuma chave guardada**.

- **No ar:** https://crm-377803250649.southamerica-east1.run.app (/saude)
- Projeto: `cabanas-crm` · Região: `southamerica-east1` (São Paulo) · Serviço: `crm`
- Rodar local: `node server.js` → http://localhost:8080/saude
