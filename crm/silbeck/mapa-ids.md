# Mapa de IDs e códigos do Silbeck para o CRM

> A Silbeck (Marcos, 30/09/2026) orientou coletar os IDs **dentro do próprio sistema**, porque mudam de hotel para hotel. Alguns o CRM lê sozinho pela API; os outros alguém com acesso ao Silbeck (Márcio ou Renata) preenche aqui. **Nada de senha ou chave neste arquivo.**

| O quê | Para que serve no CRM | Como obter | Valor |
|---|---|---|---|
| Tipos de acomodação (id e código de cada um: CBD, CBT, CBM, BG, BGE, STD, CST, SUP, CJ, QST, QES) | Orçamento e reserva | API `GET /v1/TipoApartamento` (conferir se os códigos batem) | via API |
| Pensão das reservas diretas (ex.: "Só Café" = 4) | `idTipoPensao` no preço e na reserva | Silbeck → cadastro de pensões (ou API `TipoPensao`) | ___ |
| Tarifário vigente das reservas diretas | `idTarifario` no preço e na reserva | Silbeck → tarifários (qual é o de balcão/WhatsApp) | ___ |
| Tarifário de agências (se for outro) | Reservas de agência | Silbeck → tarifários | ___ |
| Faturamento **particular** | `idFaturamento` das reservas diretas | Silbeck → tipos de faturamento | ___ |
| Faturamento **empresa** | `idFaturamento` das reservas de agência (obrigatório para a comissão sair certa) | Silbeck → tipos de faturamento | ___ |
| Categorias de hóspede (adulto, criança até 5 anos, criança pagante…) | Preço e capacidade por idade | API `GET /v1/CategoriaHospede` | via API |
| Portal **"CRM WhatsApp"** (criar no Silbeck) | `idReservaPortal`: origem das reservas do CRM nos relatórios | Silbeck → cadastro de portais (criar e anotar o ID) | ___ |
| Bandeiras de cartão (Visa, Master, Elo…) | `bandeiraCartao` no adiantamento pago pela Cielo | Silbeck → cadastro de bandeiras | ___ |
| Forma de pagamento Pix | `tipoFormaPagamento` = 8 (confirmar a conta corrente do BB, se exigida) | Silbeck → formas de pagamento | 8 |
| Códigos das agências e operadoras | `codigoEmpresa` na reserva | API `GET /v1/Empresa` (sincroniza sozinho) | via API |
