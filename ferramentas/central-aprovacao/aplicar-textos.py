"""Aplica o texto da arte editado pelo dono na Central e gera as artes finais.

Uso: python3 ferramentas/central-aprovacao/aplicar-textos.py 2026-10 <arquivo.json>
<arquivo.json> = {"POST": "03", "textos": {"1": {"titulo": "Feriado **longo**\\nentre *rios*", "apoio": "..."}}}
(o campo `textos` do documento da Central). Para cada tela: altera o título
(h1.titulo) e o apoio (.apoio / .cc-apoio) nas peças dos 3 estilos, renderiza
os PNGs (node design/ferramentas/renderizar.js), copia para estilos/estilo-K/
e para final/ (no estilo que já estava no final). As versões anteriores ficam
no histórico do git.
"""
import html, json, os, re, shutil, subprocess, sys, hashlib

mes, arq = sys.argv[1], sys.argv[2]
d = json.load(open(arq)); post = d["POST"]
base = f"design/pecas/{mes}-instagram/POST-{post}"


def pick(n, k):
    c = []
    if k == "1": c = [f"{base}/peca-sem-faixa-{n}-ioga.html"] if (post == "10" and n == 1) else []; c += [f"{base}/peca-sem-faixa-{n}-v2.html", f"{base}/peca-sem-faixa-{n}.html"]
    if k == "2": c = [f"{base}/peca-caixa-{n}-ioga.html"] if (post == "10" and n == 1) else []; c += [f"{base}/peca-caixa-{n}.html"]
    if k == "3": c = [f"{base}/peca-{n}-ioga.html"] if (post == "10" and n == 1) else []; c += [f"{base}/peca-faixa-{n}.html", f"{base}/peca-{n}.html"]
    return next((x for x in c if os.path.exists(x)), None)


def md2html(m, so_italico):
    h = html.escape(m.strip(), quote=False)
    if so_italico:
        h = re.sub(r"\*\*(.+?)\*\*", r"\1", h); h = re.sub(r"\*(.+?)\*", r"\1", h)
    else:
        h = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", h); h = re.sub(r"\*(.+?)\*", r"<i>\1</i>", h)
    return h.replace("\n", "<br>")


md5 = lambda p: hashlib.md5(open(p, "rb").read()).hexdigest() if os.path.exists(p) else None
for tela, v in d["textos"].items():
    n = int(tela)
    final = f"{base}/final/POST-{post}-{n}.png"
    estilo_final = next((k for k in "123" if md5(f"{base}/estilos/estilo-{k}/POST-{post}-{n}.png") == md5(final)), None)
    for k in "123":
        h = pick(n, k)
        if not h:
            continue
        s = open(h).read(); caixa = 'class="cc-caixa"' in s
        tit = md2html(v["titulo"], caixa)
        duas = caixa and ("<br>" in tit)
        s = re.sub(r'(<h1 class="titulo)( duas)?(">).*?(</h1>)', lambda m: m.group(1) + (" duas" if duas else "") + m.group(3) + tit + m.group(4), s, count=1, flags=re.S)
        if v.get("apoio") is not None:
            s = re.sub(r'(<p class="(?:cc-)?apoio">).*?(</p>)', lambda m: m.group(1) + html.escape(v["apoio"].strip(), quote=False) + m.group(2), s, count=1, flags=re.S)
        open(h, "w").write(s)
        png = h.replace("peca-", f"POST-{post}-").replace(".html", ".png")
        subprocess.run(["node", "design/ferramentas/renderizar.js", h, png, "feed"], check=True)
        shutil.copy(png, f"{base}/estilos/estilo-{k}/POST-{post}-{n}.png")
        if k == estilo_final:
            shutil.copy(png, final)
    print(f"POST-{post} tela {n}: ok (final no estilo {estilo_final})")
