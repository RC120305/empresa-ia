"""Acesso à API da Meta (graph.facebook.com) para o Hotel Cabanas.

A chave NÃO fica no código: o ambiente aplica a credencial `META_IG_TOKEN` sozinho nas chamadas
a graph.facebook.com. Ela pode ser de dois tipos, e este módulo funciona com os dois:
- chave da **Página** (a de 28/09/2026): serve para publicar, responder comentários e direct;
- chave de **usuário** estendida (com ads_management/ads_read): serve também para anúncios. Neste
  caso, as chamadas "da Página" (fotos não publicadas, mensagens) usam a chave da Página, obtida na
  hora em /me/accounts e passada como `access_token` só naquela chamada (o parâmetro na URL tem
  prioridade sobre a credencial do ambiente). Ela nunca é impressa nem gravada.
"""
import json, urllib.error, urllib.parse, urllib.request

API = "https://graph.facebook.com/v21.0"
PAGINA, IG, CONTA_ANUNCIOS = "158244147578036", "17841403994091310", "act_432014510158521"
_chave_pagina = None  # None = ainda não verificado; "" = a credencial já é a da Página


def _abrir(req):
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            resp = json.load(r)
            # a Meta às vezes devolve erro com HTTP 200 (ex.: "Autentique sua conta", código 31)
            return "error" not in resp, resp
    except urllib.error.HTTPError as e:
        try:
            return False, json.loads(e.read() or b"{}")
        except ValueError:
            return False, {"error": {"message": f"HTTP {e.code}"}}


def get(caminho, pagina=False, **q):
    if pagina and chave_pagina():
        q["access_token"] = chave_pagina()
    ok, r = _abrir(urllib.request.Request(f"{API}/{caminho}?" + urllib.parse.urlencode(q)))
    if not ok:
        raise RuntimeError(json.dumps(r)[:400])
    return r


def post(caminho, corpo, pagina=False):
    """POST com corpo JSON. Devolve (ok, resposta)."""
    url = f"{API}/{caminho}"
    if pagina and chave_pagina():
        url += "?" + urllib.parse.urlencode({"access_token": chave_pagina()})
    req = urllib.request.Request(url, data=json.dumps(corpo).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    return _abrir(req)


def chave_pagina():
    """'' se a credencial do ambiente já é a da Página; senão, a chave da Página (só em memória)."""
    global _chave_pagina
    if _chave_pagina is None:
        eu = get("me", fields="id")
        if eu.get("id") == PAGINA:
            _chave_pagina = ""
        else:
            contas = get("me/accounts", fields="id,access_token").get("data", [])
            achou = [c["access_token"] for c in contas if c.get("id") == PAGINA]
            if not achou:
                raise RuntimeError("A chave de usuário não dá acesso à Página Hotel Cabanas (158244147578036).")
            _chave_pagina = achou[0]
    return _chave_pagina


def tipo_da_chave():
    return "Página" if chave_pagina() == "" else "usuário"
