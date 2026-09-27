---
name: alterar-conteudo
description: >-
  Altera ou refaz posts que JÁ EXISTEM no conteúdo mensal do Instagram do Hotel
  Cabanas: mostra o que está hoje, sugere tema novo + 2 alternativas, espera o OK
  do dono e só então reescreve (texto e, se preciso, arte), sem mexer nos outros
  posts. É a dupla da conteudo-mensal. Use SEMPRE que o dono pedir para alterar,
  mudar, trocar, refazer ou substituir posts de um mês — ex.: "altera o post 3
  de novembro", "muda o tema dos posts 5 e 7", "refaz todos os carrosséis",
  "troca o post 8 para Reels", "ajusta só a legenda do post 2", "a arte do post
  4 ficou escura". Cobre seleção por número, intervalo, formato ou "todos". NÃO
  usar para criar o mês do zero (ver conteudo-mensal) nem para métricas (ver
  relatorio-metricas).
---

# Alterar Conteúdo — Hotel Cabanas

Refaz posts **que já existem** no mês: localiza, mostra o estado atual, sugere o novo e, **depois do OK**, reescreve só o que foi pedido. Nada de apagar posts nem mexer nos outros.

## Dupla da `conteudo-mensal`
Não duplicar regras aqui. Leia sempre:
- `../conteudo-mensal/references/perfil-cabanas.md` (voz, tabus, CTA, rotação)
- `../conteudo-mensal/references/formatos.md` (mecânica dos formatos)
- `../conteudo-mensal/references/estrutura-drive.md` (onde está cada coisa e como versionar no Drive)

## Pedidos vindos da Central de Aprovação
Se o dono disser "tem correções na central" (ou similar), leia os pedidos na página do mês (`../conteudo-mensal/references/central-de-aprovacao.md`): cada pedido `novo` já traz o post, a tela/legenda e, às vezes, uma foto nova. Um pedido claro é a própria aprovação daquela mudança: aplique sem nova pausa; se for vago ou mudar o tema, proponha e espere o OK. Ao terminar, republique a central e marque o pedido como `feito` com uma resposta curta.

## O que o dono fornece
- **Mês** (ex.: "novembro") e **quais posts** (por número "post 3", intervalo "do 3 ao 8", formato "todos os carrosséis", ou "todos"). Se não disser quais, **pergunte**.
- **O que mudar** (opcional): tema, formato, só legenda, só arte, data. Sem indicação = trocar o **tema** (e, por consequência, textos e arte).

## Fluxo
1. **Localizar:** abra `social/conteudo/AAAA-MM/conteudo.md` (e `pauta.md`). Se o mês não existir no repositório, avise: talvez precise da `conteudo-mensal`.
2. **Mostrar o estado atual** dos posts selecionados: `POST NN I [formato] tema` + resumo de 1 linha + status (texto pronto, arte pronta, aprovado, publicado).
   - ⚠️ Se algum post já estiver **publicado** no Instagram, avise o dono antes de continuar (alterar aqui não altera o que está no ar).
3. **Propor o novo (no chat) — PAUSA OBRIGATÓRIA.** Acione o **Estrategista** (`social-media-trafego`) para sugerir, por post, **tema novo + 2 alternativas**, distinto do antigo, coerente com pilar, persona, mix do mês e sazonalidade. Apresente numa tabela:
   `POST NN | Formato | Tema atual → Tema novo | Alternativas`
   **Espere o OK.** O dono escolhe, ajusta ou pede mais opções. Não escreva nada antes disso.
   - Se o pedido for **só legenda** ou **só arte**, pule a sugestão de tema e mostre a proposta do trecho a mudar.
4. **Aplicar (só depois do OK):**
   - **Textos:** acione o **Marketing** (`marketing-anuncios`) para reescrever o bloco do post no mesmo formato (briefing de arte + legenda; Reels: briefing da produtora + legenda). Substitua **apenas** esses blocos em `conteudo.md` e renomeie para `POST NN I [formato] tema novo`. Mantenha data, pilar e persona, salvo pedido.
   - **Artes:** se o texto da arte mudou (ou o pedido é sobre a arte), acione o **Designer** (`designer-criativos`) com o novo briefing de arte. Ele salva a nova versão em `design/pecas/AAAA-MM-instagram/POST-NN/` **sem apagar** a anterior (sufixo `-v2`, `-v3`).
   - **Reels já enviados à produtora:** se o briefing mudar, sinalize ao dono que a produtora precisa receber a nova versão.
5. **Publicar:** nova versão do `Conteúdo <Mês>` (e do `Briefing produtora`, se mudou) no Drive; a anterior vai para `antigas`. Atualize o status na `Calendário`. Envie as artes novas com `SendUserFile`.
6. **Commit e push.**

## Casos especiais
- **Trocar formato** ("o post 7 vira Reels"): muda formato e tema; reescreve no template do novo formato; ajusta o nome. Verifique se a troca desequilibra o mix do mês (ex.: ficar com 0 imagens únicas) e avise.
- **"Refaz todos os carrosséis"**: filtre os `[carrossel]` do mês, proponha numa tabela única e siga o fluxo.
- **Mudar data**: confira se a nova data mantém 3 posts por semana e se não conflita com outro post.

## Regras transversais
- Só mexer nos posts pedidos; o resto fica **exatamente** como está.
- O tema novo é **distinto** do antigo (não é reformular o mesmo).
- Voz, CTA, tabus e fatos: iguais à `conteudo-mensal`. Nada de fato inventado nem imagem de IA.
- Nunca apagar versões anteriores (repositório e Drive).
