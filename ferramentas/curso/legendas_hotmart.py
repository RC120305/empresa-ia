#!/usr/bin/env python3
"""Lê a faixa de LEGENDA (texto) dos vídeos de um curso Hotmart que você comprou.

Complementa `estudar_curso.py extrair`: o Hotmart declara a legenda numa playlist separada,
dentro do player (cf-embed.play.hotmart.com). Este script só baixa o TEXTO da legenda
(WebVTT); nunca baixa vídeo nem áudio.

Uso: python3 ferramentas/curso/legendas_hotmart.py <nome-do-curso>
Requer: aulas já extraídas (aulas/NN-*.md com o link do player) e sessão salva.
Rede: *.hotmart.com liberado (inclui *.play.hotmart.com).
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

from playwright.sync_api import sync_playwright

BASE = "conhecimento/cursos"
CA = os.environ.get("SSL_CERT_FILE") or "/root/.ccr/ca-bundle.crt"


def baixar(url, ref):
    import ssl
    ctx = ssl.create_default_context(cafile=CA) if os.path.exists(CA) else None
    req = urllib.request.Request(url, headers={"Referer": ref, "User-Agent": "Mozilla/5.0"})
    for tentativa in range(5):  # a conexão pelo proxy cai de vez em quando
        try:
            return urllib.request.urlopen(req, context=ctx, timeout=60).read().decode("utf-8", "replace")
        except Exception:
            if tentativa == 4:
                raise
            time.sleep(2 * (tentativa + 1))


def vtt_para_texto(vtt):
    linhas, ultima = [], ""
    for l in vtt.splitlines():
        l = l.strip()
        if not l or l.startswith(("WEBVTT", "X-TIMESTAMP", "NOTE")) or "-->" in l or l.isdigit():
            continue
        l = re.sub(r"<[^>]+>", "", l)
        if l != ultima:
            linhas.append(l)
            ultima = l
    return " ".join(linhas)


def legenda_do_embed(pg, embed):
    pg.goto(embed, wait_until="domcontentloaded")
    d = json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', pg.content(), re.S).group(1))
    ad = d["props"]["pageProps"]["applicationData"]
    master = ad["mediaAssets"][0]["url"]
    ref = "https://cf-embed.play.hotmart.com/"
    m = baixar(master, ref)
    mt = re.search(r'TYPE=SUBTITLES[^\n]*?URI="([^"]+)"', m)
    if not mt:
        return None
    sub = urllib.parse.urljoin(master, mt.group(1))
    pl = baixar(sub, ref)
    partes = []
    for l in pl.splitlines():
        if l and not l.startswith("#"):
            partes.append(vtt_para_texto(baixar(urllib.parse.urljoin(sub, l), ref)))
    return " ".join(p for p in partes if p)


def main(nome):
    pasta = os.path.join(BASE, nome, "aulas")
    arqs = sorted(f for f in os.listdir(pasta) if f.endswith(".md"))
    with sync_playwright() as pw:
        exe = "/opt/pw-browsers/chromium"
        b = pw.chromium.launch(headless=True, executable_path=exe if os.path.isfile(exe) else None)
        c = b.new_context(storage_state=os.path.join(BASE, "_sessoes", f"{nome}.json"))
        pg = c.new_page()
        pg.set_extra_http_headers({"Referer": "https://hotmart.com/"})
        for f in arqs:
            p = os.path.join(pasta, f)
            if os.path.exists(p.replace(".md", ".legenda.txt")):
                continue
            t = open(p, encoding="utf-8").read()
            m = re.search(r"https://cf-embed\.play\.hotmart\.com/embed/[^\s)\"]+", t)
            if not m:
                print(f"{f}: sem player")
                continue
            try:
                txt = legenda_do_embed(pg, m.group(0))
            except Exception as e:
                print(f"{f}: ERRO {str(e)[:100]}")
                continue
            if not txt:
                print(f"{f}: sem faixa de legenda")
                continue
            open(p.replace(".md", ".legenda.txt"), "w", encoding="utf-8").write(txt)
            print(f"{f}: legenda com {len(txt.split())} palavras")
        b.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
