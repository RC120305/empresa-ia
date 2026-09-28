"""Métricas dos anúncios do Hotel Cabanas no Meta Ads (SÓ LEITURA).

Uso: python3 ferramentas/meta/metricas.py [dias=7] [--json arquivo.json]
Mostra, por campanha e por anúncio (código M1, V1, PR1...): gasto, alcance, impressões, frequência,
cliques, CTR, conversas iniciadas no WhatsApp e custo por conversa. Precisa da chave de usuário com ads_read.
A leitura (o que pausar, o que reforçar) é do Estrategista de Social Media e Tráfego, com as regras do
plano (plano.md §9): pausar só com o OK do dono.
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import meta  # noqa: E402

CONVERSA = "onsite_conversion.messaging_conversation_started_7d"


def linhas(nivel, dias):
    campos = "campaign_name,ad_name,spend,reach,impressions,frequency,clicks,ctr,actions,cost_per_action_type"
    r = meta.get(f"{meta.CONTA_ANUNCIOS}/insights", level=nivel, date_preset=f"last_{dias}d" if dias in (7, 14, 28, 30, 90) else "last_7d",
                 fields=campos, limit=200)
    out = []
    for x in r.get("data", []):
        conv = sum(int(float(a["value"])) for a in x.get("actions", []) if a["action_type"] == CONVERSA)
        gasto = float(x.get("spend", 0))
        out.append({"campanha": x.get("campaign_name"), "anuncio": x.get("ad_name"), "gasto": gasto,
                    "alcance": int(x.get("reach", 0)), "impressoes": int(x.get("impressions", 0)),
                    "frequencia": round(float(x.get("frequency", 0)), 2), "cliques": int(x.get("clicks", 0)),
                    "ctr": round(float(x.get("ctr", 0)), 2), "conversas": conv,
                    "custo_conversa": round(gasto / conv, 2) if conv else None})
    return out


def main():
    dias = int(next((a for a in sys.argv[1:] if a.isdigit()), 7))
    dados = {"dias": dias, "campanhas": linhas("campaign", dias), "anuncios": linhas("ad", dias)}
    for t, chave in (("CAMPANHAS", "campanhas"), ("ANÚNCIOS", "anuncios")):
        print(f"\n{t} (últimos {dias} dias)")
        for x in dados[chave]:
            nome = x["campanha"] if chave == "campanhas" else f"{x['anuncio']:>4} · {x['campanha']}"
            cc = f"R$ {x['custo_conversa']:.2f}" if x["custo_conversa"] else "—"
            print(f"  {nome} · gasto R$ {x['gasto']:.2f} · alcance {x['alcance']} · freq. {x['frequencia']} · CTR {x['ctr']}% · conversas {x['conversas']} · custo/conversa {cc}")
    if "--json" in sys.argv:
        json.dump(dados, open(sys.argv[sys.argv.index("--json") + 1], "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
