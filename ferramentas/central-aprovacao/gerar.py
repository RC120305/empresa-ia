"""Gera a Central de Aprovação de um mês (página com db + assets).

Uso: python3 ferramentas/central-aprovacao/gerar.py 2026-10 <pasta-de-saida>
Lê social/conteudo/AAAA-MM/calendario-vN.csv (o de maior N) e as artes
design/pecas/AAAA-MM-instagram/POST-NN/final/*.png; grava <saida>/index.html
e <saida>/img/*.jpg. Publique com o Artifact tool (files = img/*,
capabilities {"db":{}, "assets":{}}). WEEKS e textos do cabeçalho do modelo
são de outubro/2026: ajuste-os no index.html gerado para cada mês.
"""
import csv, glob, hashlib, json, os, shutil, sys
from PIL import Image


def jpg(src, dst):
    im = Image.open(src).convert("RGB"); im.thumbnail((1080, 1440))
    im.save(dst, quality=76, optimize=True, progressive=True)


def md5(path):
    return hashlib.md5(open(path, "rb").read()).hexdigest()

mes, out = sys.argv[1], sys.argv[2]
os.makedirs(f"{out}/img", exist_ok=True)
cal = sorted(glob.glob(f"social/conteudo/{mes}/calendario-v*.csv"))[-1]
dias = {"0": "domingo", "1": "segunda", "2": "terça", "3": "quarta", "4": "quinta", "5": "sexta", "6": "sábado"}
posts = []
for r in csv.DictReader(open(cal)):
    nn = r["Post"].split()[1]
    base = f"design/pecas/{mes}-instagram/POST-{nn}"
    finals = sorted(glob.glob(f"{base}/final/*.png"))
    estilos, padrao = {}, None
    for k in ("1", "2", "3"):
        files = sorted(glob.glob(f"{base}/estilos/estilo-{k}/*.png"))
        if not files:
            continue
        estilos[k] = []
        for i, f in enumerate(files, 1):
            name = f"POST-{nn}-e{k}-{i}.jpg"; jpg(f, f"{out}/img/{name}")
            estilos[k].append(f"img/{name}?v={md5(f)[:8]}")  # ?v= evita imagem antiga em cache
        if finals and padrao is None and md5(files[0]) == md5(finals[0]):
            padrao = k
    imgs = []
    for f in ([] if estilos else finals):
        name = os.path.basename(f)[:-4] + ".jpg"; jpg(f, f"{out}/img/{name}"); imgs.append(f"img/{name}")
    if estilos and not padrao:
        padrao = "1"
    if padrao and padrao in estilos:
        imgs = estilos[padrao]
    posts.append(dict(n=nn, data=r["Data"], dia=r["Dia"], hora=r["Horário"], fmt=r["Formato"],
                      tema=r["Tema"], leg=r["Legenda final (com hashtags)"], imgs=imgs,
                      estilos=estilos, padrao=padrao, status=r["Status"]))
pj = f"{out}/pecas.json"
if os.path.exists(pj):
    pecas = json.load(open(pj))
    for p in posts:
        if p["n"] in pecas:
            p["pecas"] = pecas[p["n"]]
tpl = open(os.path.join(os.path.dirname(__file__), "modelo.html")).read()
data = json.dumps(posts, ensure_ascii=False).replace("</", "<\\/")
ads = sorted(glob.glob(f"social/anuncios/{mes}-*/central.json"))
anuncios = "null"
if ads:
    A = json.load(open(ads[-1]))
    mz = os.path.join(os.path.dirname(ads[-1]), "matriz.json")
    if os.path.exists(mz):
        A["matriz"] = json.load(open(mz))
    tj = os.path.join(os.path.dirname(ads[-1]), "textos.json")
    if os.path.exists(tj):
        A["textos"] = json.load(open(tj, encoding="utf-8"))
    anuncios = json.dumps(A, ensure_ascii=False).replace("</", "<\\/")
bdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "banco")
banco = json.load(open(f"{bdir}/banco.json", encoding="utf-8"))
# miniaturas do banco em folhas (sprites): 8 arquivos em vez de 380 (limite de arquivos da página)
COLS, ROWS, CEL = 10, 5, 200
os.makedirs(f"{out}/banco", exist_ok=True)
com = [b for b in banco if os.path.exists(f"{bdir}/mini/{b['id']}.jpg")]
for k in range(0, len(com), COLS * ROWS):
    folha = Image.new("RGB", (COLS * CEL, ROWS * CEL), (236, 229, 216))
    for i, b in enumerate(com[k:k + COLS * ROWS]):
        im = Image.open(f"{bdir}/mini/{b['id']}.jpg").convert("RGB")
        w, h = im.size; m = min(w, h)
        im = im.crop(((w - m) // 2, (h - m) // 2, (w - m) // 2 + m, (h - m) // 2 + m)).resize((CEL, CEL))
        folha.paste(im, ((i % COLS) * CEL, (i // COLS) * CEL))
        b["f"], b["c"], b["r"] = k // (COLS * ROWS), i % COLS, i // COLS
    nome = f"banco/folha-{k // (COLS * ROWS)}.jpg"
    folha.save(f"{out}/{nome}", quality=72, optimize=True, progressive=True)
    for b in com[k:k + COLS * ROWS]:
        b["f"] = f"{nome}?v={hashlib.md5(open(f'{out}/{nome}', 'rb').read()).hexdigest()[:8]}"
banco = [dict(b, cols=COLS, rows=ROWS) for b in com]
bjs = json.dumps(banco, ensure_ascii=False).replace("</", "<\\/")
open(f"{out}/index.html", "w").write(tpl.replace("__BANCO__", bjs).replace("__DATA__", data).replace("__MES__", mes).replace("__ANUNCIOS__", anuncios))
print(f"{len(posts)} posts -> {out}/index.html")
