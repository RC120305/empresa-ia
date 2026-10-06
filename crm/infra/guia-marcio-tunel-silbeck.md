# Túnel do Silbeck para o CRM: guia do Márcio (Windows)

Objetivo: o CRM (no Google Cloud) falar com a API do Silbeck (192.168.132.242:8366) por um túnel criptografado
WireGuard que **sai do hotel**. Não é preciso abrir porta no roteador nem ter IP fixo no hotel.

```
CRM (nuvem) → ponte no Google Cloud (10.99.0.1) ⇄ túnel WireGuard ⇄ servidor Silbeck (10.99.0.2) → porta 8366
```

**Onde instalar:** de preferência **no próprio servidor do Silbeck (192.168.132.242)**, que fica ligado 24 h.
Se precisar ser outro computador da rede, veja o passo 5.

Nenhuma chave privada sai do computador do hotel: você passa só a **chave pública**.

## 1. Instalar o WireGuard
1. Baixe e instale o **WireGuard para Windows**: https://www.wireguard.com/install/
2. Abra o WireGuard → seta ao lado de **Adicionar túnel** → **Adicionar túnel vazio...** (Add empty tunnel).
3. Nome: `cabanas-crm`.
4. Na tela aparece a **Chave pública** (Public key, termina com `=`). **Copie e envie ao Ricardo.**
   Não mande a linha `PrivateKey`.
5. Deixe a janela aberta (ou salve e volte depois): vamos completar a configuração no passo 2.

## 2. Completar a configuração (depois que o Ricardo rodar o script)
O Ricardo vai te passar 2 dados: **Endpoint** (IP:51820) e **PublicKey** da ponte.
Edite o túnel `cabanas-crm` e deixe assim (a primeira linha `PrivateKey` já vem preenchida, não mexa nela):

```
[Interface]
PrivateKey = (já preenchida pelo WireGuard)
Address = 10.99.0.2/32

[Peer]
PublicKey = (PublicKey que o Ricardo passar)
AllowedIPs = 10.99.0.1/32
Endpoint = (Endpoint que o Ricardo passar, ex.: 34.95.x.x:51820)
PersistentKeepalive = 25
```

Desmarque **"Bloquear tráfego fora do túnel" (Block untunneled traffic / kill-switch)**, se aparecer marcado:
o túnel é só para o CRM, a internet do servidor continua normal.
Salve e clique em **Ativar**. O túnel fica como serviço do Windows e volta sozinho depois de reiniciar.

## 3. Liberar a porta 8366 só para a ponte (Firewall do Windows)
No PowerShell **como administrador**:

```powershell
New-NetFirewallRule -DisplayName "Silbeck via tunel do CRM" -Direction Inbound -Protocol TCP -LocalPort 8366 -RemoteAddress 10.99.0.1 -Action Allow
```

## 4. Conferir
- No WireGuard, o túnel deve mostrar **"Último handshake: há alguns segundos"** e bytes recebidos/enviados.
- Avise o Ricardo: ele abre `https://crm-377803250649.southamerica-east1.run.app/saude/silbeck`.
  O certo é aparecer **"tudo certo"** (porta aberta, login aceito e uma leitura).
- Se aparecer etapa **"porta"**: confira o handshake, a regra do passo 3 e se o Silbeck (DataSnap) escuta em todas as
  interfaces (e não só em 192.168.132.242).

## 5. Só se o túnel ficar em OUTRO computador (não no servidor do Silbeck)
Esse computador repassa a porta ao servidor. No PowerShell como administrador, depois de ativar o túnel:

```powershell
netsh interface portproxy add v4tov4 listenaddress=10.99.0.2 listenport=8366 connectaddress=192.168.132.242 connectport=8366
New-NetFirewallRule -DisplayName "Silbeck via tunel do CRM" -Direction Inbound -Protocol TCP -LocalPort 8366 -RemoteAddress 10.99.0.1 -Action Allow
```

O serviço "Auxiliar IP" (iphlpsvc) precisa estar em execução. O computador precisa ficar ligado 24 h.

## 6. Depois que der "tudo certo"
**Desfaça o direcionamento das portas 8365, 8366 e 8367 no roteador** (plano anterior): com o túnel, nada do Silbeck
fica aberto para a internet.
