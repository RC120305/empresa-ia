"""Confere a conexão com a Meta SÓ LENDO (não publica, não envia, não altera nada).

Uso: python3 ferramentas/meta/conferir.py
Mostra: tipo da chave; Página; Instagram ligado; leitura de comentários; acesso ao direct;
e, se a chave for de usuário, a conta de anúncios (status, moeda, limite de gastos).
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import meta


def linha(nome, f):
    try:
        print(f"OK   {nome}: {f()}")
    except Exception as e:  # noqa: BLE001
        print(f"FALHA {nome}: {str(e)[:250]}")


linha("tipo da chave", meta.tipo_da_chave)
linha("Página", lambda: meta.get(meta.PAGINA, pagina=True, fields="name")["name"])
linha("Instagram", lambda: meta.get(meta.PAGINA, pagina=True, fields="instagram_business_account{username}")["instagram_business_account"]["username"])
linha("comentários", lambda: f"{len(meta.get(f'{meta.IG}/media', pagina=True, fields='id,comments_count', limit=5)['data'])} posts lidos")
linha("direct", lambda: f"{len(meta.get(f'{meta.PAGINA}/conversations', pagina=True, platform='instagram', limit=1).get('data', []))} conversa(s) lida(s)")
if meta.tipo_da_chave() == "usuário":
    def conta():
        c = meta.get(meta.CONTA_ANUNCIOS, fields="name,account_status,currency,spend_cap,amount_spent")
        cap = int(c.get("spend_cap") or 0) / 100
        return (f"{c.get('name')} · status {c.get('account_status')} (1 = ativa) · {c.get('currency')} · "
                f"limite de gastos: {'sem limite' if not cap else f'R$ {cap:,.2f}'} · já gasto: R$ {int(c.get('amount_spent') or 0) / 100:,.2f}")
    linha("conta de anúncios", conta)
else:
    print("--   conta de anúncios: a chave atual é da Página (sem permissão de anúncios)")
