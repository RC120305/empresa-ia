# Passo a passo: liberar a publicação automática no Instagram

Para: Ricardo (administrador da Página e do Instagram do Hotel Cabanas). Tempo estimado: 30 a 40 minutos.
Os nomes dos menus da Meta mudam de vez em quando. Se algum não aparecer igual, mande um print (sem a chave) que eu ajusto.

> ⚠️ **A chave de acesso é como uma senha que pode publicar no Instagram do hotel.** Nunca cole no chat, no WhatsApp ou em e-mail. Ela vai só nas configurações do ambiente (passo 6).

## 1. Instagram profissional ligado à Página
- No app do Instagram: **Configurações → Tipo de conta e ferramentas**: a conta precisa ser **Empresa** (ou Criador).
- A conta do Instagram precisa estar **ligada à Página do Facebook** do hotel (Meta Business Suite → Configurações → Contas do Instagram).

## 2. Portfólio empresarial
- Em **business.facebook.com**, confira se existe o portfólio empresarial do hotel com a **Página** e a **conta do Instagram** dentro dele (Configurações → Contas).

## 3. Criar o app
- Em **developers.facebook.com** → **Meus apps → Criar app**.
- Caso de uso: o de **gerenciar conteúdo no Instagram** (tipo **Empresa**). Nome sugerido: "Cabanas Publicação".
- Ligue o app ao **portfólio empresarial** do hotel.

## 4. Usuário do sistema (chave que não expira)
- Em **business.facebook.com → Configurações → Usuários → Usuários do sistema → Adicionar**. Nome: "Publicador Cabanas"; função: **Administrador**.
- **Atribuir ativos** a ele: o **app** (controle total), a **Página** e a **conta do Instagram** (permissão de conteúdo).

## 5. Gerar a chave
- No usuário do sistema: **Gerar token** → escolha o app "Cabanas Publicação" → expiração **Nunca**.
- Marque as permissões: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `business_management`.
- Copie a chave (ela só aparece uma vez).

## 6. Guardar a chave no ambiente
- Aqui no Claude: menu do ambiente (no título da sessão) → **Edit** → variáveis de ambiente → adicione `META_IG_TOKEN=<a chave>` → salvar.

## 7. Liberar a rede
- No mesmo menu: **Network access** → adicione o domínio `graph.facebook.com` → salvar.

## 8. Avisar
- Abra uma sessão nova (as mudanças valem para sessões novas) e diga **"pronto, testa a publicação"**. Eu vou:
  1. descobrir o ID da conta do Instagram (só leitura, sem publicar);
  2. testar a hospedagem da imagem e a proporção 3:4;
  3. publicar **1 post de teste só com o seu OK**;
  4. com tudo certo, ligar o agendamento automático (terça, quinta e sábado).

Se a Meta pedir "verificação da empresa" ou "análise do app", me avise: para publicar só na conta do próprio hotel, com você como administrador, normalmente não é necessário, mas as regras da Meta mudam.
