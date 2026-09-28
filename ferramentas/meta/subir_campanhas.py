"""Sobe as campanhas do plano de mídia no Meta Ads, SEMPRE PAUSADAS (Hotel Cabanas).

Uso:
  python3 ferramentas/meta/subir_campanhas.py social/anuncios/2026-10-plano-de-midia            # SIMULAÇÃO: só mostra o que faria
  python3 ferramentas/meta/subir_campanhas.py social/anuncios/2026-10-plano-de-midia --verificar # + checagens só de leitura na conta
  python3 ferramentas/meta/subir_campanhas.py social/anuncios/2026-10-plano-de-midia --subir     # cria tudo PAUSADO

Regras do dono (CLAUDE.md e social/anuncios/README.md):
- Tudo é criado com status PAUSED. Este programa NUNCA ativa nada, não mexe em verba de campanhas
  que não criou, não altera o limite de gastos nem a forma de pagamento.
- Só sobe se a conta tiver limite de gastos (spend_cap) definido e de no máximo R$ 2.000.
- Só sobe anúncios aprovados (na Central, coleção anuncios_artes; aqui confere a lista do subida.json).
- Não repete: se já existe campanha com o mesmo nome, pula (use o registro para conferir).
Lê: subida.json (estrutura), textos.json (textos aprovados) e as artes em design/pecas/anuncios/<plano>/<COD>/.
Grava: subida-registro.json (IDs criados), para as métricas e para ativar depois.
"""
import base64, datetime, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import meta  # noqa: E402

TETO_CENTAVOS = 200000  # R$ 2.000
DESTINO = "https://api.whatsapp.com/send"


def limpa(t):
    return re.sub(r"\s*\(\*\*\d+\*\*\)$", "", (t or "").strip()).strip('"')


def carregar(pasta):
    cfg = json.load(open(os.path.join(pasta, "subida.json"), encoding="utf-8"))
    tx = {a["cod"]: a for a in json.load(open(os.path.join(pasta, "textos.json"), encoding="utf-8"))["anuncios"]}
    artes = os.path.join("design/pecas/anuncios", os.path.basename(os.path.normpath(pasta)))
    return cfg, tx, artes


def telas(artes, cod):
    def n(f):
        return int(re.search(r"-(\d+)-feed45\.png$", f).group(1))
    fs = sorted([f for f in os.listdir(os.path.join(artes, cod)) if f.endswith("-feed45.png")], key=n)
    return [(os.path.join(artes, cod, f), os.path.join(artes, cod, f.replace("-feed45.png", "-story.png"))) for f in fs]


def boas_vindas(msg):
    return json.dumps({"type": "VISUAL_EDITOR", "version": 2, "landing_screen_type": "welcome_message",
                       "media_type": "text", "text_format": {"customer_action_type": "autofill_message",
                                                             "message": {"autofill_message": {"content": msg}}}},
                      ensure_ascii=False)


def plano(cfg, tx, artes):
    linhas, total = [], 0
    for c in cfg["campanhas"]:
        linhas.append(f"CAMPANHA {cfg['prefixo']}-{c['nome']} · Engajamento → conversas no WhatsApp · PAUSADA")
        for cj in c["conjuntos"]:
            total += cj["reais_dia"]
            linhas.append(f"  conjunto {cj['nome']} · R$ {cj['reais_dia']}/dia · início {cj['inicio']} · local {json.dumps(cj['local'], ensure_ascii=False)}"
                          + (f" · públicos {cj['publicos']}" if cj.get("publicos") else ""))
            for cod in cj["anuncios"]:
                a, t = tx[cod], telas(artes, cod)
                falta = [p for par in t for p in par if not os.path.exists(p)]
                linhas.append(f"    anúncio {cod} · {'carrossel' if len(t) > 1 else 'imagem'} ({len(t)} tela{'s' if len(t) > 1 else ''}) · "
                              f"título \"{limpa(a['titulo'])}\" · botão WhatsApp · mensagem {limpa(a['mensagem'])}"
                              + (f" · FALTA ARTE: {falta}" if falta else ""))
    linhas.append(f"TOTAL por dia se tudo estivesse ativo: R$ {total} (a MS só ativa em 08/11).")
    return linhas


def checar_conta():
    if meta.tipo_da_chave() != "usuário":
        raise SystemExit("PARADO: a chave do ambiente é da Página; anúncios precisam da chave de usuário com ads_management.")
    c = meta.get(meta.CONTA_ANUNCIOS, fields="name,account_status,currency,spend_cap,amount_spent")
    cap = int(c.get("spend_cap") or 0)
    print(f"conta: {c.get('name')} · status {c.get('account_status')} · {c.get('currency')} · limite R$ {cap / 100:,.2f} · gasto R$ {int(c.get('amount_spent') or 0) / 100:,.2f}")
    if c.get("account_status") != 1:
        raise SystemExit("PARADO: a conta de anúncios não está ativa.")
    if not cap or cap > TETO_CENTAVOS:
        raise SystemExit("PARADO: o limite de gastos da conta precisa estar definido e ser de no máximo R$ 2.000 (o dono ajusta no Gerenciador).")
    return c


def geo(nome, uf, tipo="city"):
    """Chave da Meta para a cidade (no estado certo: há Cascavel no PR e no MS) ou para o estado."""
    r = meta.get("search", type="adgeolocation", location_types=json.dumps([tipo]), q=nome, country_code="BR", limit=25).get("data", [])
    for x in r:
        if x.get("type") != tipo:
            continue
        if tipo == "region" and x.get("name") == nome:
            return x["key"]
        if tipo == "city" and x.get("region") == UF[uf] and (x.get("name") == nome or x.get("name", "").startswith((nome + " (", nome + ","))):
            return x["key"]
    raise SystemExit(f"PARADO: não achei a localização {nome} ({uf}) na Meta. Resultado: {json.dumps(r, ensure_ascii=False)[:300]}")


UF = {"PR": "Paraná", "MS": "Mato Grosso do Sul"}


def alvo(local, publicos_ids):
    t = {"age_min": 18, "publisher_platforms": ["facebook", "instagram"]}
    g = {}
    if local.get("pais"):
        g["countries"] = [local["pais"]]
    if local.get("cidades"):
        g["cities"] = [{"key": geo(n, uf), "radius": local["raio_km"], "distance_unit": "kilometer"} for n, uf in local["cidades"]]
    g["location_types"] = ["home", "recent"]
    t["geo_locations"] = g
    ex = {}
    if local.get("excluir_estados"):
        ex["regions"] = [{"key": geo(n, "", "region")} for n in local["excluir_estados"]]
    if local.get("excluir_cidades"):
        ex["cities"] = [{"key": geo(n, uf), "radius": local.get("raio_excluir_km", 25), "distance_unit": "kilometer"} for n, uf in local["excluir_cidades"]]
    if ex:
        t["excluded_geo_locations"] = ex
    if publicos_ids:
        t["custom_audiences"] = [{"id": i} for i in publicos_ids]
    return t


def publico(nome, registro):
    if nome in registro.get("publicos", {}):
        return registro["publicos"][nome]
    ano = 365 * 24 * 3600
    if nome == "engajou-instagram-365":
        regra = {"inclusions": {"operator": "or", "rules": [{"event_sources": [{"id": meta.IG, "type": "ig_business"}],
                 "retention_seconds": ano, "filter": {"operator": "and", "filters": [{"field": "event", "operator": "eq", "value": "ig_business_profile_all"}]}}]}}
    else:
        regra = {"inclusions": {"operator": "or", "rules": [{"event_sources": [{"id": meta.PAGINA, "type": "page"}],
                 "retention_seconds": ano, "filter": {"operator": "and", "filters": [{"field": "event", "operator": "eq", "value": "page_engaged"}]}}]}}
    ok, r = meta.post(f"{meta.CONTA_ANUNCIOS}/customaudiences", {"name": f"cabanas-{nome}", "rule": json.dumps(regra)})
    if not ok:
        raise SystemExit(f"PARADO ao criar público {nome}: {json.dumps(r, ensure_ascii=False)[:400]}")
    registro.setdefault("publicos", {})[nome] = r["id"]
    return r["id"]


def imagem(caminho, registro):
    chave = os.path.relpath(caminho)
    if chave in registro.setdefault("imagens", {}):
        return registro["imagens"][chave]
    b = base64.b64encode(open(caminho, "rb").read()).decode()
    ok, r = meta.post(f"{meta.CONTA_ANUNCIOS}/adimages", {"bytes": b, "name": os.path.basename(caminho)})
    if not ok:
        raise SystemExit(f"PARADO ao enviar a arte {chave}: {json.dumps(r, ensure_ascii=False)[:400]}")
    h = list(r["images"].values())[0]["hash"]
    registro["imagens"][chave] = h
    return h


def criativo(cod, a, t, registro):
    cta = {"type": "WHATSAPP_MESSAGE", "value": {"app_destination": "WHATSAPP"}}
    ld = {"message": a["texto"], "link": DESTINO, "call_to_action": cta, "page_welcome_message": boas_vindas(limpa(a["mensagem"]))}
    if len(t) == 1:
        ld.update({"image_hash": imagem(t[0][0], registro), "name": limpa(a["titulo"]), "description": limpa(a["descricao"])})
    else:
        ld["child_attachments"] = [{"image_hash": imagem(f, registro), "link": DESTINO, "name": limpa(a["titulo"]) if i == 0 else " ",
                                    "call_to_action": cta} for i, (f, _s) in enumerate(t)]
        ld["multi_share_optimized"] = False
        ld["multi_share_end_card"] = False
    spec = {"page_id": meta.PAGINA, "instagram_user_id": meta.IG, "link_data": ld}
    ok, r = meta.post(f"{meta.CONTA_ANUNCIOS}/adcreatives", {"name": f"cabanas-{cod}", "object_story_spec": spec})
    if not ok:
        raise SystemExit(f"PARADO ao criar o criativo {cod}: {json.dumps(r, ensure_ascii=False)[:500]}")
    return r["id"]


def subir(cfg, tx, artes, pasta):
    arq = os.path.join(pasta, "subida-registro.json")
    registro = json.load(open(arq)) if os.path.exists(arq) else {}
    salvar = lambda: json.dump(registro, open(arq, "w"), ensure_ascii=False, indent=1)  # noqa: E731
    existentes = {c["name"]: c["id"] for c in meta.get(f"{meta.CONTA_ANUNCIOS}/campaigns", fields="name,status", limit=200).get("data", [])}
    for c in cfg["campanhas"]:
        nome = f"{cfg['prefixo']}-{c['nome']}"
        if nome in existentes:
            print(f"já existe, pulei: {nome} ({existentes[nome]})")
            continue
        ok, r = meta.post(f"{meta.CONTA_ANUNCIOS}/campaigns", {"name": nome, "objective": "OUTCOME_ENGAGEMENT", "status": "PAUSED",
                                                               "special_ad_categories": [], "is_adset_budget_sharing_enabled": False})
        if not ok:
            raise SystemExit(f"PARADO ao criar a campanha {nome}: {json.dumps(r, ensure_ascii=False)[:500]}")
        camp = registro.setdefault("campanhas", {}).setdefault(nome, {"id": r["id"], "conjuntos": {}})
        salvar()
        print(f"campanha criada PAUSADA: {nome} ({r['id']})")
        for cj in c["conjuntos"]:
            pubs = [publico(p, registro) for p in cj.get("publicos", [])]
            corpo = {"name": cj["nome"], "campaign_id": camp["id"], "daily_budget": cj["reais_dia"] * 100, "billing_event": "IMPRESSIONS",
                     "optimization_goal": "CONVERSATIONS", "destination_type": "WHATSAPP", "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
                     "promoted_object": {"page_id": meta.PAGINA}, "targeting": alvo(cj["local"], pubs),
                     "start_time": f"{cj['inicio']}T00:00:00-0400", "status": "PAUSED"}
            ok, r = meta.post(f"{meta.CONTA_ANUNCIOS}/adsets", corpo)
            if not ok:
                raise SystemExit(f"PARADO ao criar o conjunto {cj['nome']}: {json.dumps(r, ensure_ascii=False)[:500]}")
            conj = camp["conjuntos"].setdefault(cj["nome"], {"id": r["id"], "anuncios": {}})
            salvar()
            print(f"  conjunto criado PAUSADO: {cj['nome']} ({r['id']}) · R$ {cj['reais_dia']}/dia")
            for cod in cj["anuncios"]:
                cr = criativo(cod, tx[cod], telas(artes, cod), registro)
                ok, r = meta.post(f"{meta.CONTA_ANUNCIOS}/ads", {"name": cod, "adset_id": conj["id"], "creative": {"creative_id": cr}, "status": "PAUSED"})
                if not ok:
                    raise SystemExit(f"PARADO ao criar o anúncio {cod}: {json.dumps(r, ensure_ascii=False)[:500]}")
                conj["anuncios"][cod] = r["id"]
                salvar()
                print(f"    anúncio criado PAUSADO: {cod} ({r['id']})")
    registro["subidoEm"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    salvar()
    print("Tudo PAUSADO. Nada foi ativado. Conferir no Gerenciador de Anúncios e ativar só com o OK do dono.")


def main():
    pasta = sys.argv[1]
    cfg, tx, artes = carregar(pasta)
    print("\n".join(plano(cfg, tx, artes)))
    if "--verificar" in sys.argv or "--subir" in sys.argv:
        checar_conta()
        for c in cfg["campanhas"]:
            for cj in c["conjuntos"]:
                print(f"  local {cj['nome']}: {json.dumps(alvo(cj['local'], [])['geo_locations'], ensure_ascii=False)[:200]}")
    if "--subir" in sys.argv:
        subir(cfg, tx, artes, pasta)
    elif "--verificar" not in sys.argv:
        print("\nSIMULAÇÃO: nada foi enviado à Meta. Use --verificar (só leitura) ou --subir (cria tudo PAUSADO).")


if __name__ == "__main__":
    main()
