#!/usr/bin/env python3
"""Entra em um curso online (com a SUA conta) e extrai o conteúdo das aulas para estudo.

Subcomandos:
  sessao   Abre o navegador para VOCÊ fazer login e salva a sessão (cookies). Rode no seu computador.
  mapear   Lista as aulas do curso a partir da página do curso.
  extrair  Visita cada aula e salva texto da página, legendas/transcrição, PDFs e links de vídeo.

Exemplos:
  python3 ferramentas/curso/estudar_curso.py sessao  meu-curso https://plataforma.com/login
  python3 ferramentas/curso/estudar_curso.py mapear  meu-curso https://plataforma.com/curso/123
  python3 ferramentas/curso/estudar_curso.py extrair meu-curso --limite 50

Saída (fora do git): conhecimento/cursos/<nome>/{indice.json, aulas/NN-titulo.md, anexos/}
Senhas NUNCA passam por este script nem pelo chat: o login é feito por você no navegador.
Requisitos: pip install playwright (o Chromium já vem no ambiente).
"""
import argparse
import json
import os
import re
import sys
from urllib.parse import urljoin, urlparse

BASE = "conhecimento/cursos"
EXT_LEGENDA = (".vtt", ".srt")
EXT_ANEXO = (".pdf", ".docx", ".pptx", ".xlsx", ".zip")
PADRAO_AULA = re.compile(r"(aula|lesson|licao|lição|modulo|módulo|video|vídeo|class|watch|player|content|conteudo|conteúdo|/l/|/lectures?/)", re.I)
SEL_TEXTO = "main, article, [role=main], .lesson, .aula, .content, .conteudo"


def slug(t, n=50):
    t = re.sub(r"[^\w\s-]", "", t.lower(), flags=re.UNICODE)
    return re.sub(r"[\s_]+", "-", t).strip("-")[:n] or "sem-titulo"


def pasta(nome):
    p = os.path.join(BASE, nome)
    os.makedirs(os.path.join(p, "aulas"), exist_ok=True)
    os.makedirs(os.path.join(p, "anexos"), exist_ok=True)
    return p


def sessao_arquivo(nome):
    return os.path.join(BASE, "_sessoes", f"{nome}.json")


def lancar(pw, headless=True):
    """Usa o Chromium pré-instalado do ambiente, se existir; senão o do Playwright."""
    exe = "/opt/pw-browsers/chromium"
    if os.path.isfile(exe):
        return pw.chromium.launch(headless=headless, executable_path=exe)
    return pw.chromium.launch(headless=headless)


def abrir(pw, nome, headless=True):
    arq = sessao_arquivo(nome)
    if not os.path.exists(arq):
        sys.exit(f"Sem sessão salva para '{nome}'. Rode primeiro o subcomando 'sessao' (veja --help).")
    b = lancar(pw, headless)
    return b, b.new_context(storage_state=arq, accept_downloads=True)


def cmd_sessao(a):
    from playwright.sync_api import sync_playwright
    os.makedirs(os.path.dirname(sessao_arquivo(a.nome)), exist_ok=True)
    with sync_playwright() as pw:
        b = lancar(pw, headless=False)
        ctx = b.new_context()
        pg = ctx.new_page()
        pg.goto(a.url_login)
        input("Faça o login no navegador (inclusive código de verificação, se houver) "
              "e, com o curso aberto, volte aqui e aperte ENTER... ")
        ctx.storage_state(path=sessao_arquivo(a.nome))
        b.close()
    os.chmod(sessao_arquivo(a.nome), 0o600)
    print(f"Sessão salva em {sessao_arquivo(a.nome)} (fora do git; trate como senha).")


def cmd_mapear(a):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b, ctx = abrir(pw, a.nome)
        pg = ctx.new_page()
        pg.goto(a.url_curso, wait_until="networkidle")
        if re.search(r"login|signin|entrar|auth", pg.url, re.I) and not re.search(r"login|signin|entrar|auth", a.url_curso, re.I):
            sys.exit("A sessão expirou (fui levado para o login). Refaça o subcomando 'sessao'.")
        pg.wait_for_timeout(1500)
        achados = pg.eval_on_selector_all(
            "a[href]", "els => els.map(e => ({href: e.href, texto: (e.innerText||'').trim().replace(/\\s+/g,' ')}))")
        host = urlparse(a.url_curso).netloc
        vistos, aulas = set(), []
        for x in achados:
            u = x["href"].split("#")[0]
            if urlparse(u).netloc != host or u in vistos or u.rstrip("/") == a.url_curso.rstrip("/"):
                continue
            if not (a.todos or PADRAO_AULA.search(u) or PADRAO_AULA.search(x["texto"])):
                continue
            vistos.add(u)
            aulas.append({"n": len(aulas) + 1, "titulo": x["texto"][:120] or f"aula-{len(aulas)+1}", "url": u})
        p = pasta(a.nome)
        with open(os.path.join(p, "indice.json"), "w", encoding="utf-8") as f:
            json.dump({"curso_url": a.url_curso, "aulas": aulas}, f, ensure_ascii=False, indent=2)
        b.close()
    print(f"{len(aulas)} aulas encontradas -> {p}/indice.json")
    print("CONFIRA o índice (ordem, módulos, links sobrando). Edite o JSON se precisar; use --todos se vier vazio.")


def consertar_acentos(t):
    """Sites sem charset na legenda chegam como Latin-1 ('Ã©'); desfaz isso quando for o caso."""
    try:
        return t.encode("latin-1").decode("utf-8")
    except UnicodeError:
        return t


def limpar_vtt(t):
    out, ant = [], None
    for l in t.splitlines():
        l = l.strip()
        if not l or l == "WEBVTT" or "-->" in l or re.match(r"^(\d+|NOTE.*|Kind.*|Language.*)$", l):
            continue
        l = re.sub(r"<[^>]+>", "", l)
        if l and l != ant:
            out.append(l)
            ant = l
    return " ".join(out)


def cmd_extrair(a):
    from playwright.sync_api import sync_playwright
    p = pasta(a.nome)
    indice = json.load(open(os.path.join(p, "indice.json"), encoding="utf-8"))
    aulas = indice["aulas"][a.inicio - 1:a.inicio - 1 + a.limite]
    resumo = []
    with sync_playwright() as pw:
        b, ctx = abrir(pw, a.nome)
        for au in aulas:
            pg = ctx.new_page()
            legendas, anexos, streams = [], set(), set()

            def ao_responder(r, legendas=legendas, anexos=anexos, streams=streams):
                u = r.url.split("?")[0].lower()
                try:
                    if u.endswith(EXT_LEGENDA) and r.ok:
                        legendas.append(limpar_vtt(consertar_acentos(r.body().decode('utf-8', 'replace'))))
                    elif u.endswith(EXT_ANEXO):
                        anexos.add(r.url)
                    elif u.endswith(".m3u8") or u.endswith(".mpd"):
                        streams.add(r.url)
                except Exception:
                    pass
            pg.on("response", ao_responder)
            try:
                pg.goto(au["url"], wait_until="networkidle", timeout=60000)
                pg.wait_for_timeout(a.espera * 1000)  # dá tempo de o player pedir a legenda
                for sel in ("button:has-text('Transcrição')", "button:has-text('Transcript')", "button:has-text('Legendas')"):
                    try:
                        pg.click(sel, timeout=800)
                        pg.wait_for_timeout(800)
                    except Exception:
                        pass
                texto = " ".join(pg.eval_on_selector_all(SEL_TEXTO, "els => els.map(e => e.innerText)")) or pg.inner_text("body")
                embeds = pg.eval_on_selector_all(
                    "iframe[src], video[src], source[src]", "els => els.map(e => e.src)")
                pdfs = pg.eval_on_selector_all(
                    "a[href]", "els => els.map(e => e.href).filter(h => /\\.(pdf|docx|pptx|xlsx)(\\?|$)/i.test(h))")
                anexos.update(pdfs)
            except Exception as e:
                resumo.append((au["n"], au["titulo"], f"ERRO: {e}"))
                pg.close()
                continue
            baixados = []
            for i, url in enumerate(sorted(anexos)):
                try:
                    r = ctx.request.get(url)
                    nome_arq = f"{au['n']:02d}-{i+1}-{slug(os.path.basename(urlparse(url).path))}{os.path.splitext(urlparse(url).path)[1]}"
                    open(os.path.join(p, "anexos", nome_arq), "wb").write(r.body())
                    baixados.append(nome_arq)
                except Exception:
                    pass
            transcricao = max(legendas, key=len) if legendas else ""
            situacao = "transcrição" if transcricao else ("SEM TRANSCRIÇÃO (só vídeo)" if (streams or embeds) else "só texto")
            md = [f"# {au['titulo']}", f"> Aula {au['n']} · {au['url']} · situação: {situacao}", ""]
            if transcricao:
                md += ["## Transcrição", transcricao, ""]
            md += ["## Texto da página", re.sub(r"\n{3,}", "\n\n", texto.strip()), ""]
            if embeds or streams:
                md += ["## Vídeos encontrados", *[f"- {u}" for u in dict.fromkeys(list(embeds) + sorted(streams))], ""]
            if baixados:
                md += ["## Anexos baixados", *[f"- anexos/{x}" for x in baixados], ""]
            open(os.path.join(p, "aulas", f"{au['n']:02d}-{slug(au['titulo'])}.md"), "w", encoding="utf-8").write("\n".join(md))
            resumo.append((au["n"], au["titulo"], situacao))
            pg.close()
        b.close()
    print(f"\nConteúdo em {p}/aulas/")
    for n, t, s in resumo:
        print(f"  {n:02d} {t[:60]:60} {s}")
    sem = [n for n, _, s in resumo if s.startswith("SEM") or s.startswith("ERRO")]
    if sem:
        print(f"\nAtenção: aulas {sem} sem texto utilizável. Não invente o conteúdo delas.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    s = sp.add_parser("sessao"); s.add_argument("nome"); s.add_argument("url_login"); s.set_defaults(f=cmd_sessao)
    m = sp.add_parser("mapear"); m.add_argument("nome"); m.add_argument("url_curso")
    m.add_argument("--todos", action="store_true", help="aceita todos os links do mesmo site"); m.set_defaults(f=cmd_mapear)
    e = sp.add_parser("extrair"); e.add_argument("nome")
    e.add_argument("--limite", type=int, default=100); e.add_argument("--inicio", type=int, default=1)
    e.add_argument("--espera", type=int, default=4, help="segundos esperando o player em cada aula"); e.set_defaults(f=cmd_extrair)
    a = ap.parse_args()
    a.f(a)


if __name__ == "__main__":
    main()
