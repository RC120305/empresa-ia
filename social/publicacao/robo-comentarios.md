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

## Montagem (28/09/2026)
- Programa: `ferramentas/robo-comentarios/robo.py`. Sem `--enviar` ele só **lista** o que faria (teste); com `--enviar` responde de verdade.
- Regra da palavra-chave: comentário **curto (até 4 palavras)** com "reserva" ou "reservas", sem diferenciar maiúsculas nem acento ("RESERVA", "quero reserva!", "reserva 🙌"). Comentários longos que só citam a palavra ("fiz uma reserva ano passado") não recebem direct.
- Vale para **todos os posts dos últimos 7 dias**; nunca responde ao próprio hotel; uma resposta por pessoa por post.
- Nome na saudação: o @ da pessoa (é o que o Instagram informa).
- Tenta primeiro a mensagem com os 2 botões; se o Instagram não aceitar botões na resposta privada, manda o mesmo texto com os 2 links escritos.
- Estado: `ferramentas/robo-comentarios/respondidos.txt` guarda só os IDs dos comentários respondidos.
- Teste feito em 28/09 (modo teste): 1 post nos últimos 7 dias, nenhum comentário com a palavra, nada enviado.
- **Falta para ligar:** (1) teste real com o dono: ele comenta RESERVA num post, pela conta pessoal, e o robô responde; (2) a rotina que roda o robô de tempos em tempos (frequência a definir pelo dono); (3) os posts passarem a pedir "comente RESERVA".
