# Ligar o 99117-1648 ao CRM pelo modo coexistência

> Preparado em 30/09/2026. **Nada foi feito ainda na Meta.** O token disponível para a equipe é o de publicação do Instagram (app "Cabanas Publicação", 1043672718685119) e **não tem permissão de WhatsApp**: a leitura das contas de WhatsApp pela API foi recusada. O WhatsApp fica num acesso separado, criado para o CRM.

## Por que não ligar hoje
1. **A importação do histórico acontece uma vez só.** Depois de conectar, o sistema tem **24 horas** para pedir o histórico (até 6 meses) e os contatos do app, que chegam pelo *webhook* (o endereço do CRM que recebe as mensagens). Sem o servidor do CRM no ar, o histórico se perde e não dá para pedir de novo.
2. **A coexistência só é ligada pelo "cadastro incorporado" (Embedded Signup) de um app da Meta.** É uma tela de conexão da Meta que abre dentro de uma página nossa, com leitura de QR code no celular. Ela precisa de uma página em HTTPS e do servidor que troca o código de acesso, ou seja, do CRM.
3. **Conectar sem o CRM não traz ganho.** O app continuaria igual no celular, e as mensagens não teriam para onde ir.

## Plano do dono (30/09/2026): número de teste primeiro
1. **Número de teste** para desenvolver e testar o CRM, sem tocar nos números reais.
2. **99117 por coexistência**, em modo **observação**: o CRM só registra e o Gilberto fica desligado nesse número até ser liberado.
3. Com o CRM consolidado: **cancelar a Asksuite** (depois de exportar tudo) e **conectar o 99110** na conta do hotel em reais.

| # | Etapa | Quem | Depende de |
|---|---|---|---|
| 1 | Criar o projeto no **Google Cloud** (conta pessoal do dono, D16) e dar acesso de administrador à equipe | Dono | — |
| 2 | Criar o app **"Cabanas CRM"** na Meta (tipo Empresa, portfólio Hotel Cabanas) com o produto WhatsApp. A Meta cria junto **um número de teste gratuito**, que envia para até 5 celulares cadastrados | Dono, com o passo a passo | — |
| 3 | Subir o **mínimo do CRM**: webhook + gravação no Supabase + caixa de entrada. Testes com o número da Meta | Equipe | 1 e 2 |
| 4 | (Opcional) **Chip de teste real**: número novo, **sem WhatsApp instalado** (ou apagar a conta do app antes), para testar com qualquer pessoa, Instagram e modelos. Entra numa conta nova **em reais (BRL)** | Dono | 3 |
| 5 | Página de conexão (cadastro incorporado) + configuração no app ("Login do Facebook para Empresas") | Equipe + dono | 3 |
| 6 | **Coexistência do 99117:** abrir a página de conexão → "Conectar WhatsApp Business app" → conta **em reais**, fuso de São Paulo → informar o 99117 → **ler o QR code no celular da recepção** (WhatsApp Business → Dispositivos conectados) → aceitar o histórico. O CRM pede **na hora** o histórico (6 meses) e os contatos. **Modo observação:** Gilberto desligado no 99117 | Dono + recepção | 5 |
| 7 | Teste: mensagem de fora aparece no app **e** no CRM; resposta pelo app aparece no CRM | Dono + equipe | 6 |
| 8 | CRM consolidado: exportar da Asksuite (biblioteca, conversas, contatos) → pedir o cancelamento → a Asksuite libera o 99110 (desligar a verificação em duas etapas) → migrar o 99110 para a conta em reais → retirar o parceiro Text Wave | Dono + equipe | 7 e testes |

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
