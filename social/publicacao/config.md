# Configuração da publicação automática

- ID da conta do Instagram (@hotelcabanasbonito): 17841403994091310 (confirmado pela API em 27/09/2026)
- Chave: chave da Página guardada pelo dono em **Credenciais de API** do ambiente, nome `META_IG_TOKEN` (28/09/2026; as sessões usam sem ver o valor; nunca registrar o valor aqui). Só vale em sessão nova.
- Rede: `graph.facebook.com` liberado (confirmado em 28/09/2026: a API responde)
- Hospedagem das imagens (URL pública exigida pela Meta): [a definir no teste: (a) Drive com link público; (b) outro serviço de hospedagem indicado pelo dono]
- Horário padrão das postagens: [definido pelo Estrategista na pauta; fuso America/Campo_Grande]
- ID da conta de anúncios (act_…): [descobrir no primeiro teste]
- ID da Página do Facebook: 158244147578036 (facebook.com/hotelcabanasms; ligada ao @hotelcabanasbonito)
- Limite de gastos da conta (trava definida pelo dono no Gerenciador de Anúncios): [pendente]
- Proporção 3:4 aceita pela API? [validar no teste]
- App: "Cabanas Publicação", **ID 1043672718685119** (é o app da chave gerada em 28/09/2026; antes estava anotado o 1825674138454665, uma das cópias com o mesmo nome)
- Usuário do sistema: "Publicador Cabanas" (função Employee, ID 61577402477573), com Controle total só no app; Página, Instagram e conta de anúncios atribuídos pelo dono (anúncios: Gerenciar campanhas, sem pagamentos)
- Caminho adotado (27/09/2026): **plano B**. A Página e a conta de anúncios (432014510158521) estão na conta pessoal do dono, não no portfólio "Hotel Cabanas"; mover foi adiado até a verificação da empresa sair. A chave de publicação é uma **chave de Página que não expira**, gerada pela conta do dono (administrador) no app Cabanas Publicação, e fica só na variável `META_IG_TOKEN` do ambiente.
- Anúncios pela API: pendentes (decidir depois da verificação: mover a conta de anúncios e a Página para o portfólio, ou usar chave de usuário de 60 dias).
- Arrumação pendente: há 3 apps "Cabanas Publicação" (o certo agora é **1043672718685119**, NÃO apagar; os outros são tentativas repetidas); o app foi removido do portfólio e pode ser reconectado em Apps → Adicionar → Conectar um ID do app.

- 28/09/2026: dono refez a chave no Explorer (app 1043672718685119, token de usuário estendido: "Expira: Nunca", escopos pages_show_list, pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish, business_management; acesso aos dados expira em ~3 meses). Próximo: chave da Página (me/accounts) em `META_IG_TOKEN`, liberar `graph.facebook.com`, sessão nova e "testa a publicação".
