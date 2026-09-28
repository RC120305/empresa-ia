"""Robô "comente RESERVA e receba o link no direct" (Hotel Cabanas).

Uso:
  python3 ferramentas/robo-comentarios/robo.py            # TESTE: só lista o que faria (padrão)
  python3 ferramentas/robo-comentarios/robo.py --enviar   # envia de verdade (só com o robô ligado pelo dono)

Regras (aprovadas pelo dono em 28/09/2026, ver social/publicacao/robo-comentarios.md):
- Olha os posts do @hotelcabanasbonito dos últimos 7 dias (o Instagram só aceita resposta
  privada a comentários de até 7 dias).
- Responde só a comentários curtos (até 4 palavras) com a palavra-chave (RESERVA, sem diferenciar
  maiúsculas nem acento), nunca a comentários do próprio hotel.
- Uma resposta privada por comentário, e no máximo uma por pessoa em cada post.
- Guarda só os IDs dos comentários já respondidos (sem nomes) em respondidos.txt.
A chave da Meta é aplicada pelo ambiente nas chamadas a graph.facebook.com (não vai no código).
"""
import datetime, json, os, sys, unicodedata, urllib.parse, urllib.request

API = "https://graph.facebook.com/v21.0"
PAGINA, IG = "158244147578036", "17841403994091310"
PALAVRA = "reserva"
AQUI = os.path.dirname(os.path.abspath(__file__))
ESTADO = os.path.join(AQUI, "respondidos.txt")
MOTOR = "https://sbreserva.silbeck.com.br/hotelcabanas?utm_source=instagram&utm_medium=direct&utm_campaign=comente-reserva"
WHATS = "https://wa.me/5567991171648?text=" + urllib.parse.quote("Olá! Vim pelo Instagram e quero saber das datas.")


def texto(nome):
    oi = f"Oi, {nome}!" if nome else "Oi!"
    return (f"{oi} Que bom que você quer vir pro Cabanas.\n"
            "Reservando direto, garantimos o melhor preço. Escolha como prefere:")


def get(caminho, **q):
    url = f"{API}/{caminho}?" + urllib.parse.urlencode(q)
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)


def post(caminho, corpo):
    req = urllib.request.Request(f"{API}/{caminho}", data=json.dumps(corpo).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return True, json.load(r)
    except urllib.error.HTTPError as e:
        return False, json.loads(e.read() or b"{}")


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


def main():
    enviar = "--enviar" in sys.argv
    feitos = set(open(ESTADO).read().split()) if os.path.exists(ESTADO) else set()
    limite = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)
    midias = get(f"{IG}/media", fields="id,timestamp,permalink", limit=25).get("data", [])
    novos, erros = [], []
    for m in midias:
        if datetime.datetime.fromisoformat(m["timestamp"].replace("+0000", "+00:00")) < limite:
            continue
        pessoas = set()
        for c in get(f"{m['id']}/comments", fields="id,text,timestamp,username", limit=100).get("data", []):
            quem = c.get("username", "")
            if c["id"] in feitos or quem == "hotelcabanasbonito" or not tem_palavra(c.get("text", "")):
                continue
            if datetime.datetime.fromisoformat(c["timestamp"].replace("+0000", "+00:00")) < limite or quem in pessoas:
                continue
            pessoas.add(quem)
            if not enviar:
                novos.append((m["permalink"], c["id"], "(teste: não enviado)"))
                continue
            ok, r, forma = responder(c["id"], quem)
            if ok:
                feitos.add(c["id"]); novos.append((m["permalink"], c["id"], f"enviado ({forma})"))
            else:
                erros.append((c["id"], r))
    if enviar:
        open(ESTADO, "w").write("\n".join(sorted(feitos)) + "\n")
    print(f"{'ENVIO' if enviar else 'TESTE'} · posts dos últimos 7 dias: "
          f"{sum(1 for m in midias if m['timestamp'] >= limite.strftime('%Y-%m-%dT%H:%M:%S'))} · respostas: {len(novos)} · erros: {len(erros)}")
    for p, cid, st in novos:
        print(" ", p, cid, st)
    for cid, r in erros:
        print("  ERRO", cid, json.dumps(r)[:300])


if __name__ == "__main__":
    main()
