"""Gera a Central de Aprovação de um mês (página com db + assets).

Uso: python3 ferramentas/central-aprovacao/gerar.py 2026-10 <pasta-de-saida>
Lê social/conteudo/AAAA-MM/calendario-vN.csv (o de maior N) e as artes
design/pecas/AAAA-MM-instagram/POST-NN/final/*.png; grava <saida>/index.html
e <saida>/img/*.jpg. Publique com o Artifact tool (files = img/*,
capabilities {"db":{}, "assets":{}}). WEEKS e textos do cabeçalho do modelo
são de outubro/2026: ajuste-os no index.html gerado para cada mês.
"""
import csv, glob, json, os, sys
from PIL import Image

mes, out = sys.argv[1], sys.argv[2]
os.makedirs(f"{out}/img", exist_ok=True)
cal = sorted(glob.glob(f"social/conteudo/{mes}/calendario-v*.csv"))[-1]
dias = {"0": "domingo", "1": "segunda", "2": "terça", "3": "quarta", "4": "quinta", "5": "sexta", "6": "sábado"}
posts = []
for r in csv.DictReader(open(cal)):
    nn = r["Post"].split()[1]
    imgs = []
    for p in sorted(glob.glob(f"design/pecas/{mes}-instagram/POST-{nn}/final/*.png")):
        im = Image.open(p).convert("RGB"); im.thumbnail((1080, 1440))
        name = os.path.basename(p)[:-4] + ".jpg"
        im.save(f"{out}/img/{name}", quality=78, optimize=True, progressive=True)
        imgs.append(f"img/{name}")
    posts.append(dict(n=nn, data=r["Data"], dia=r["Dia"], hora=r["Horário"], fmt=r["Formato"],
                      tema=r["Tema"], leg=r["Legenda final (com hashtags)"], imgs=imgs, status=r["Status"]))
tpl = open(os.path.join(os.path.dirname(__file__), "modelo.html")).read()
data = json.dumps(posts, ensure_ascii=False).replace("</", "<\\/")
open(f"{out}/index.html", "w").write(tpl.replace("__DATA__", data).replace("__MES__", mes))
print(f"{len(posts)} posts -> {out}/index.html")
