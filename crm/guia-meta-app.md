# Passo a passo: criar o app "Cabanas CRM" na Meta

> **Nunca** colar no chat nem no repositório: token de acesso, chave secreta do app (App Secret), senha. O **ID do app** não é segredo.

1. Acesse **https://developers.facebook.com/apps** com o Facebook pessoal que administra o portfólio **Hotel Cabanas** (ID 531727826009907). Se for o primeiro acesso, aceite os termos de desenvolvedor e confirme o celular.
2. Clique em **Criar app**.
   - **Nome do app:** `Cabanas CRM` · **E-mail de contato:** o do hotel.
   - **Caso de uso:** **"Conectar-se com clientes pelo WhatsApp"**. Instagram e Messenger entram depois, no mesmo app.
   - **Portfólio empresarial:** **Hotel Cabanas**, o portfólio verificado.
   - Revise e clique em **Criar app**. Se pedir, digite a senha do Facebook.
3. No painel do app: **Casos de uso → WhatsApp → Personalizar → Configuração da API** (API Setup).
   - Aparece um **número de teste** da Meta, gratuito, que manda mensagens para até 5 números cadastrados.
   - Em **"Para"**, clique em **Gerenciar lista de números de telefone**, adicione o seu celular e confirme pelo código. Depois, dá para incluir os do Márcio e do Jagles.
   - **Não copie** o "token de acesso temporário": ele não é usado.
4. Mande no chat **só o ID do app**, o número que aparece no topo do painel.
5. Próximo passo (a equipe prepara): o endereço de webhook do CRM e a conta de sistema com token permanente. O token vai **direto para o Secret Manager**, nunca para o chat.

Obs.: o número de teste fica numa conta de WhatsApp de teste. O 99117 (coexistência) e o 99110 entram depois, numa conta em **reais (BRL)**.
