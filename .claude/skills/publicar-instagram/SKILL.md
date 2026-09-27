---
name: publicar-instagram
description: >-
  Publica no Instagram do Hotel Cabanas (@hotelcabanasbonito) os posts do
  conteúdo mensal que o dono marcou "Aprovado" na planilha Calendário do Drive,
  na data e no horário previstos, pela API oficial da Meta. Use quando o
  agendamento automático disparar, ou quando o dono pedir "publica os posts
  aprovados", "publica o post 3 agora", "testa a publicação". Nunca publica
  post sem "Aprovado" e nunca mexe em anúncios nem gasta verba. NÃO usar para
  criar conteúdo (ver conteudo-mensal) nem para anúncios (ver campanha-anuncios).
---

# Publicar no Instagram — Hotel Cabanas

> **Status: em implantação (Etapa 2).** Enquanto a chave e a rede não estiverem prontas, a publicação é feita pelo dono no agendador do Meta Business Suite (Etapa 1) a partir do pacote da `conteudo-mensal`. Configuração: `social/publicacao/passo-a-passo-meta.md`.

## Regra de ouro
**Só sai o que o dono aprovou.** Um post é publicado apenas se estiver **aprovado na Central de Aprovação** do mês (`../conteudo-mensal/references/central-de-aprovacao.md`, coleção `decisoes`, `status: "aprovado"`) **ou**, na planilha `Calendário <Mês>` mais recente do Drive, a coluna **Status** diz **"Aprovado"** (sem ressalva) e a data e o horário já chegaram. Qualquer dúvida (texto de ajuste na coluna, arte faltando, legenda diferente do repositório, "[a confirmar]" ou "[confirmar valor vigente]" no texto) → **não publica** e avisa o dono.

## Requisitos (checar no início; se faltar, parar e avisar)
- Variável de ambiente `META_IG_TOKEN` (chave de publicação criada pelo dono; **nunca** pedir no chat nem gravar em arquivo ou log).
- Rede liberada para `graph.facebook.com`.
- `social/publicacao/config.md` com o **ID da conta do Instagram** (descoberto no primeiro teste) e o **método de hospedagem das imagens**.
- Conector do Google Drive (para ler a planilha).

## Fluxo
1. **Ler a aprovação:** encontre a pasta do mês em "Conteúdo Instagram" (`../conteudo-mensal/references/estrutura-drive.md`), abra o `Calendário <Mês> vN` de maior N (`read_file_content`) e liste os posts com Status **Aprovado** cuja data e horário já passaram e que **não** constam em `social/conteudo/AAAA-MM/publicacoes.md`.
2. **Conferir cada post:** legenda da planilha = legenda de `conteudo.md`; arte(s) existem em `design/pecas/AAAA-MM-instagram/POST-NN/`; sem marcações pendentes. Reels: só com o vídeo final da produtora e a capa.
3. **Preparar a mídia:** converter PNG → **JPEG** (qualidade 90; a API aceita só JPEG para imagens) e hospedar numa **URL pública** pelo método de `config.md`.
   - ⚠️ A API documenta proporção de 4:5 a 1,91:1; o feed do Cabanas é **3:4**. Validar no teste; se a API recusar, usar a versão 4:5 da arte e avisar o dono.
4. **Publicar pela API** (`https://graph.facebook.com/<versão>/`):
   - Imagem: `POST /{ig-user-id}/media` com `image_url` + `caption` → `POST /{ig-user-id}/media_publish` com `creation_id`.
   - Carrossel: um contêiner por tela com `is_carousel_item=true` → contêiner `media_type=CAROUSEL` com `children` + `caption` → `media_publish`.
   - Reels: `media_type=REELS` com `video_url` (+ `cover_url`) → aguardar `status_code=FINISHED` → `media_publish`.
   - Erro → não repetir mais de 1 vez; registrar e avisar.
5. **Registrar:** em `social/conteudo/AAAA-MM/publicacoes.md` (post, data e hora, link, ID da mídia) e avisar o dono com o link. A planilha do Drive não é editável pela ferramenta: o status "Publicado" entra na próxima versão da `Calendário`. Commit e push.
6. **Posts aprovados que não saíram** (arte faltando, erro): avisar o dono no mesmo dia.

## Agendamento automático
Depois de 1 publicação de teste aprovada pelo dono, criar uma rotina (Routine) que abre uma sessão nova nos dias de postagem (terça, quinta e sábado), no horário da pauta, com o conector do Google Drive, e executa esta skill. Horário e fuso: America/Campo_Grande.

## Nunca
- Publicar sem "Aprovado"; apagar ou editar posts já publicados sem pedido do dono; responder comentários ou mensagens; impulsionar; mexer em anúncios ou verba.
- Expor a chave (`META_IG_TOKEN`) em arquivo, commit, mensagem ou log.
