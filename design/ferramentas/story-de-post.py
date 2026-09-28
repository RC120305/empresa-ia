"""Gera stories 9:16 (1080x1920) a partir das artes finais do feed (3:4), com espaço livre
para a figurinha de link, que o dono coloca no aplicativo do Instagram (a API não põe figurinha).

Uso: python3 design/ferramentas/story-de-post.py social/conteudo/AAAA-MM/stories.json
stories.json: lista de {"id": "STORY-0710", "arte": "design/pecas/.../final/POST-01-1.png",
                        "titulo": "Reserve a *sua* cabana", "apoio": "Toque no link abaixo"}
Saída: design/pecas/AAAA-MM-instagram/stories/<id>.png (e o .html ao lado).
Layout: fundo = a própria arte desfocada e escurecida; arte inteira no alto (840 x 1120);
título e apoio logo abaixo; faixa de ~1560 a 1720 px livre para a figurinha; topo (240 px) e
base (200 px) livres para a interface do Instagram.
"""
import html, json, os, re, subprocess, sys

cfg = json.load(open(sys.argv[1], encoding="utf-8"))
mes = os.path.basename(os.path.dirname(os.path.abspath(sys.argv[1])))
out = f"design/pecas/{mes}-instagram/stories"
os.makedirs(out, exist_ok=True)


def md(t):
    h = html.escape(t.strip(), quote=False)
    h = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", h)
    return re.sub(r"\*(.+?)\*", r"<i>\1</i>", h)


for s in cfg:
    arte = os.path.relpath(s["arte"], out)
    doc = f"""<!doctype html>
<!-- {s['id']} · story 9:16 · arte: {s['arte']} · figurinha de link: {s.get('link', '')} -->
<html lang="pt-BR"><head><meta charset="utf-8">
<link rel="stylesheet" href="../../../modelos/marca.css">
<style>
html, body {{ margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: var(--marrom); }}
.fundo {{ position: absolute; inset: -60px; background: url("{arte}") center / cover; filter: blur(38px) brightness(.55); }}
.arte {{ position: absolute; left: 120px; top: 230px; width: 840px; height: 1120px; border-radius: 18px;
        box-shadow: 0 18px 60px rgba(0,0,0,.45); object-fit: cover; }}
.txt {{ position: absolute; left: 90px; right: 90px; top: 1388px; text-align: center; color: var(--creme); }}
.titulo {{ font-family: "Playfair Display", serif; font-weight: 400; font-size: 52px; line-height: 1.12; margin: 0;
          text-shadow: 0 2px 10px rgba(0,0,0,.35); }}
.titulo b {{ font-weight: 700; }}
.linha {{ width: 70px; height: 2px; background: var(--laranja); margin: 20px auto 16px; }}
.apoio {{ font-family: "Josefin Sans", sans-serif; font-size: 25px; letter-spacing: .2em; text-transform: uppercase; margin: 0; }}
</style></head><body>
<div class="fundo"></div>
<img class="arte" src="{arte}" alt="">
<div class="txt"><h1 class="titulo">{md(s['titulo'])}</h1><div class="linha"></div><p class="apoio">{html.escape(s['apoio'])}</p></div>
</body></html>
"""
    h = f"{out}/{s['id']}.html"
    open(h, "w", encoding="utf-8").write(doc)
    subprocess.run(["node", "design/ferramentas/renderizar.js", h, f"{out}/{s['id']}.png", "story"], check=True)
print(len(cfg), "stories em", out)
