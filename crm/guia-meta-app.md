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

## 6. Guardar os 2 segredos no cofre do Google Cloud (Secret Manager)
> O valor dos segredos **não** passa pelo chat: você copia de um lugar e cola direto no cofre.

1. Abra **https://console.cloud.google.com/security/secret-manager?project=cabanas-crm**. Se pedir para ativar a API, clique em **Ativar**.
2. **Primeiro segredo, a chave secreta do app:**
   - Em outra aba: **developers.facebook.com/apps** → Cabanas CRM → **Configurações do app → Básico** → **Chave secreta do aplicativo** → **Mostrar** (pede a senha do Facebook) → copie.
   - No Secret Manager: **+ Criar secret** · **Nome:** `meta-app-secret` · **Valor do secret:** cole · **Criar secret**.
3. **Segundo segredo, a senha de verificação:**
   - **Invente** uma senha longa, sem espaços (ex.: três palavras e números juntos). **Anote num lugar seguro:** você vai digitá-la de novo na Meta, no passo 7.
   - **+ Criar secret** · **Nome:** `meta-verify-token` · **Valor do secret:** a senha inventada · **Criar secret**.
4. Avise no chat: "segredos criados" (sem os valores).

## 7. Ligar o webhook na Meta (depois que a equipe publicar com os segredos)
1. developers.facebook.com/apps → Cabanas CRM → **Casos de uso → WhatsApp → Personalizar → Configuração**.
2. Em **Webhook**:
   - **URL de retorno de chamada:** `https://crm-377803250649.southamerica-east1.run.app/webhook/meta`
   - **Verificar token:** a senha inventada do passo 6.3
   - **Verificar e salvar**.
3. Em **Campos do webhook**, ative (**Assinar**) o campo **messages**.
4. Mande "oi" do seu celular para o número de teste e confira **https://crm-377803250649.southamerica-east1.run.app/webhook/status**: deve aparecer 1 recebido.
