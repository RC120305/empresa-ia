# Robô "comente e receba o link no direct"

Status: **texto aprovado pelo dono em 28/09/2026**. O robô ainda não está montado nem ligado; só é ligado com o OK do dono.

## Como funciona
1. O post pede: "Comente **RESERVA** que te mando o link no direct".
2. Quando alguém comenta a palavra-chave, o hotel manda **uma** resposta privada (direct) para essa pessoa, com 2 botões.
3. Uma resposta por pessoa por post. Nada de responder a comentários sem a palavra-chave, nem de mandar mensagens repetidas.

## Mensagem aprovada (dono, 28/09/2026)
> Oi, [nome]! Que bom que você quer vir pro Cabanas.
> Reservando direto, garantimos o melhor preço. Escolha como prefere:

Botões:
- **Reservar online** → `https://sbreserva.silbeck.com.br/hotelcabanas?utm_source=instagram&utm_medium=direct&utm_campaign=comente-reserva`
  (se o motor não abrir com o `?utm_…`, usar o link sem essa parte)
- **Falar no WhatsApp** → `https://wa.me/5567991171648?text=Ol%C3%A1!%20Vim%20pelo%20Instagram%20e%20quero%20saber%20das%20datas.`

Frase do dono: **"Reservando direto, garantimos o melhor preço."** Ela vale para esta mensagem. Nos outros textos, a frase de reserva direta continua a de cada peça, até o dono pedir para trocar.

## Variações por post (opcional; cada uma precisa de aprovação)
- "Comente **FERIADO**" (posts de 20/11 e Finados): só o botão do WhatsApp, para perguntar as vagas.

## Técnica (para a montagem)
- Permissões já testadas em 28/09: `instagram_manage_comments`, `instagram_manage_messages`, `pages_manage_metadata` (ver `config.md`).
- Resposta privada: `POST /{ig-user-id}/messages` com `recipient: {comment_id}` e modelo de botões (até 3 URLs). Só vale para comentários de até 7 dias.
- Sem servidor próprio para webhooks, a opção é uma rotina que confere os comentários novos a cada hora e responde; guardar os IDs já respondidos para não repetir.
