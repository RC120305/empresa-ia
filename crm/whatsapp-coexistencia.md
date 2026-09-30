# Ligar o 99117-1648 ao CRM pelo modo coexistência

> Preparado em 30/09/2026. **Nada foi feito ainda na Meta.** O token disponível para a equipe é o de publicação do Instagram (app "Cabanas Publicação", 1043672718685119) e **não tem permissão de WhatsApp**: a leitura das contas de WhatsApp pela API foi recusada. O WhatsApp fica num acesso separado, criado para o CRM.

## Por que não ligar hoje
1. **A importação do histórico acontece uma vez só.** Depois de conectar, o sistema tem **24 horas** para pedir o histórico (até 6 meses) e os contatos do app, que chegam pelo *webhook* (o endereço do CRM que recebe as mensagens). Sem o servidor do CRM no ar, o histórico se perde e não dá para pedir de novo.
2. **A coexistência só é ligada pelo "cadastro incorporado" (Embedded Signup) de um app da Meta.** É uma tela de conexão da Meta que abre dentro de uma página nossa, com leitura de QR code no celular. Ela precisa de uma página em HTTPS e do servidor que troca o código de acesso, ou seja, do CRM.
3. **Conectar sem o CRM não traz ganho.** O app continuaria igual no celular, e as mensagens não teriam para onde ir.

## Ordem proposta
| # | Etapa | Quem | Depende de |
|---|---|---|---|
| 1 | Criar o projeto no **Google Cloud** (conta pessoal do dono, D16) e dar acesso de administrador à equipe | Dono | — |
| 2 | Criar o app **"Cabanas CRM"** na Meta (tipo Empresa, no portfólio Hotel Cabanas) com os produtos WhatsApp e "Login do Facebook para Empresas" (configuração do cadastro incorporado) | Dono, com o passo a passo abaixo | — |
| 3 | Subir o **mínimo do CRM**: página de conexão + webhook + gravação das mensagens no Supabase | Equipe | 1 e 2 |
| 4 | **Dia da conexão:** no computador, abrir a página de conexão do CRM → "Conectar WhatsApp Business app" → entrar com o Facebook do dono → criar a **conta nova em Real (BRL)**, fuso de São Paulo → informar o 99117 → **ler o QR code com o celular da recepção** (WhatsApp Business → Configurações → Dispositivos conectados) → aceitar o compartilhamento do histórico | Dono + celular da recepção | 3 |
| 5 | O CRM pede, na hora, o **histórico e os contatos** e confere se chegaram | Equipe | 4 |
| 6 | Teste: mensagem de um celular de fora → aparece no app **e** no CRM; resposta pelo app aparece no CRM | Dono + equipe | 5 |

## Antes do dia da conexão (checklist do celular da recepção)
- [ ] WhatsApp Business **atualizado** (loja de apps).
- [ ] O 99117 em uso no app há bastante tempo (a Meta pede número ativo, não recém-cadastrado).
- [ ] Nome do perfil igual à marca ("Hotel Cabanas") e categoria "Hotel".
- [ ] Alguém com o celular em mãos no dia (o QR code é lido na hora).

## O que muda no celular depois de ligado
- O app **continua funcionando**: a recepção responde normalmente, e o que ela responde aparece no CRM.
- O app precisa ser **aberto pelo menos a cada 14 dias**, senão a Meta desconecta a coexistência.
- Algumas funções do app mudam (por exemplo, mensagens temporárias e de visualização única ficam desligadas, e listas de transmissão têm limites). **Conferir a lista atual da Meta no dia**, porque ela muda.
- **Custos:** o que a recepção responde pelo app continua sem custo. As mensagens enviadas pela API (Gilberto e CRM) seguem a tabela da Meta: respostas dentro de 24h da mensagem do cliente não pagam; modelos de marketing e de utilidade pagam, cobrados em reais no cartão do hotel.

## O que não fazer
- Não aprovar nem recusar os 6 pedidos antigos em Configurações → Pedidos.
- Não mexer na conta do 99110 nem no parceiro Text Wave: a Asksuite segue até o CRM passar nos testes.
- Não colocar no chat nem no repositório token, senha ou chave secreta do app. Isso vai direto para o Secret Manager do Google Cloud.
