"""Robô "comente RESERVA e receba o link no direct" (Hotel Cabanas).

Uso:
  python3 ferramentas/robo-comentarios/robo.py                       # TESTE: lista o que faria (últimas 24 h)
  python3 ferramentas/robo-comentarios/robo.py --horas 48            # TESTE com outra janela
  python3 ferramentas/robo-comentarios/robo.py --agendado --enviar   # a rotina: envia de verdade

Regras (aprovadas pelo dono em 28/09/2026, ver social/publicacao/robo-comentarios.md):
- Olha os posts do @hotelcabanasbonito dos últimos 7 dias (o Instagram só aceita resposta
  privada a comentários de até 7 dias).
- Responde só a comentários curtos (até 4 palavras) com a palavra-chave (RESERVA, sem diferenciar
  maiúsculas nem acento), nunca a comentários do próprio hotel.
- No máximo uma resposta por pessoa em cada post (só o 1º comentário dela com a palavra).
- Sem arquivo de estado: cada rodada agendada cuida só dos comentários que chegaram desde o
  horário anterior da rotina (janelas que não se sobrepõem), então ninguém recebe duas respostas.
A chave da Meta é aplicada pelo ambiente nas chamadas a graph.facebook.com (não vai no código);
ferramentas/meta/meta.py cuida de chave da Página ou de usuário.
"""
import datetime, json, os, sys, unicodedata, urllib.parse

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "meta"))
import meta  # noqa: E402  (acesso à Meta; funciona com chave da Página ou de usuário)

PAGINA, IG = meta.PAGINA, meta.IG
PALAVRA = "reserva"
MOTOR = "https://sbreserva.silbeck.com.br/hotelcabanas?utm_source=instagram&utm_medium=direct&utm_campaign=comente-reserva"
WHATS = "https://wa.me/5567991171648?text=" + urllib.parse.quote("Olá! Vim pelo Instagram e quero saber das datas.")


def texto(nome):
    oi = f"Oi, {nome}!" if nome else "Oi!"
    return (f"{oi} Que bom que você quer vir pro Cabanas.\n"
            "Reservando direto, garantimos o melhor preço. Escolha como prefere:")


def get(caminho, **q):
    return meta.get(caminho, pagina=True, **q)


def post(caminho, corpo):
    return meta.post(caminho, corpo, pagina=True)


def sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


def tem_palavra(s):
    # comentário curto (até 4 palavras) com a palavra-chave: "RESERVA", "quero reserva!", "reserva 🙌"
    palavras = ["".join(c for c in p if c.isalnum()) for p in sem_acento(s).replace("#", " ").split()]
    palavras = [p for p in palavras if p]
    return (PALAVRA in palavras or PALAVRA + "s" in palavras) and len(palavras) <= 4


def responder(cid, nome):
    base = {"recipient": {"comment_id": cid}}
    botoes = {"attachment": {"type": "template", "payload": {"template_type": "button", "text": texto(nome), "buttons": [
        {"type": "web_url", "url": MOTOR, "title": "Reservar online"},
        {"type": "web_url", "url": WHATS, "title": "Falar no WhatsApp"}]}}}
    ok, r = post(f"{PAGINA}/messages", {**base, "message": botoes})
    if ok:
        return ok, r, "botões"
    # se a resposta privada não aceitar botões, manda o mesmo texto com os links
    simples = {"text": texto(nome) + f"\n\nReservar online: {MOTOR}\nFalar no WhatsApp: {WHATS}"}
    ok2, r2 = post(f"{PAGINA}/messages", {**base, "message": simples})
    return ok2, (r2 if ok2 else {"botoes": r, "texto": r2}), "texto"


# horários da rotina (hora de Campo Grande, UTC-4, sem horário de verão): 7h52, 9h52, ..., 21h52
HORARIOS = [(h, 52) for h in range(7, 22, 2)]
FUSO = datetime.timezone(datetime.timedelta(hours=-4))


def janela(agora):
    """Janela da rodada agendada: do horário anterior até o horário atual da rotina.
    Cada comentário cai em uma janela só, então ninguém recebe duas respostas."""
    local = agora.astimezone(FUSO)
    slots = []
    for d in (-1, 0):
        dia = (local + datetime.timedelta(days=d)).date()
        slots += [datetime.datetime(dia.year, dia.month, dia.day, h, m, tzinfo=FUSO) for h, m in HORARIOS]
    passados = [x for x in slots if x <= local]
    return passados[-2], passados[-1]


def quando(ts):
    return datetime.datetime.fromisoformat(ts.replace("+0000", "+00:00"))


def main():
    enviar = "--enviar" in sys.argv
    agora = datetime.datetime.now(datetime.timezone.utc)
    limite = agora - datetime.timedelta(days=7)
    if "--agendado" in sys.argv:
        ini, fim = janela(agora)
    else:  # rodada manual: últimas N horas (padrão 24)
        horas = int(sys.argv[sys.argv.index("--horas") + 1]) if "--horas" in sys.argv else 24
        ini, fim = agora - datetime.timedelta(hours=horas), agora
    ini = max(ini, limite)
    midias = [m for m in get(f"{IG}/media", fields="id,timestamp,permalink", limit=25).get("data", []) if quando(m["timestamp"]) >= limite]
    novos, erros = [], []
    for m in midias:
        # 1º comentário com a palavra de cada pessoa neste post (nos últimos 7 dias)
        primeiro = {}
        for c in get(f"{m['id']}/comments", fields="id,text,timestamp,username", limit=100).get("data", []):
            quem = c.get("username", "")
            if quem == "hotelcabanasbonito" or not tem_palavra(c.get("text", "")) or quando(c["timestamp"]) < limite:
                continue
            if quem not in primeiro or quando(c["timestamp"]) < quando(primeiro[quem]["timestamp"]):
                primeiro[quem] = c
        for quem, c in primeiro.items():
            if not (ini <= quando(c["timestamp"]) < fim):
                continue  # já foi atendido numa rodada anterior, ou fica para a próxima
            if not enviar:
                novos.append((m["permalink"], c["id"], "(teste: não enviado)"))
                continue
            ok, r, forma = responder(c["id"], quem)
            (novos.append((m["permalink"], c["id"], f"enviado ({forma})")) if ok else erros.append((c["id"], r)))
    print(f"{'ENVIO' if enviar else 'TESTE'} · janela {ini.astimezone(FUSO):%d/%m %H:%M} a {fim.astimezone(FUSO):%d/%m %H:%M} (Campo Grande) · "
          f"posts dos últimos 7 dias: {len(midias)} · respostas: {len(novos)} · erros: {len(erros)}")
    for p_, cid, st in novos:
        print(" ", p_, cid, st)
    for cid, r in erros:
        print("  ERRO", cid, json.dumps(r)[:300])


if __name__ == "__main__":
    main()
