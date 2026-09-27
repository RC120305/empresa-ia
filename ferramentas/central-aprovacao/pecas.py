"""Empacota as peças HTML editáveis (3 estilos) para a Central de Aprovação.

Uso: python3 ferramentas/central-aprovacao/pecas.py 2026-10 <pasta-de-saida>
Copia, mantendo os caminhos do repositório, cada peca-*.html usada nos
estilos 1 (sem faixa), 2 (caixa central) e 3 (faixa embaixo) de cada post,
com CSS, fontes, logo e fotos (reduzidas). Em cada HTML copiado injeta um
ouvinte de postMessage para a prévia ao vivo do texto da arte.
Grava <saida>/pecas.json: {"NN": {"1": [html...], "2": [...], "3": [...]}}.
"""
import glob, json, os, re, shutil, sys
from PIL import Image

mes, out = sys.argv[1], sys.argv[2]
base = f"design/pecas/{mes}-instagram"
SCRIPT = """<script>
(function(){
  var t=document.querySelector('h1.titulo'), a=document.querySelector('.apoio, .cc-apoio');
  function send(){ parent.postMessage({tipo:'peca-textos', src:location.pathname, titulo:t?t.innerHTML:'', apoio:a?a.textContent:'', caixa:!!document.querySelector('.cc-caixa')}, '*'); }
  window.addEventListener('message', function(e){ var d=e.data||{}; if(d.tipo!=='peca-set') return;
    if(t && typeof d.titulo==='string') t.innerHTML=d.titulo; if(a && typeof d.apoio==='string') a.textContent=d.apoio; });
  if(document.readyState==='complete') send(); else window.addEventListener('load', send);
})();
</script>"""


def pick(post, n, k):
    d = f"{base}/POST-{post}"
    if k == "1":
        c = [f"{d}/peca-sem-faixa-{n}-ioga.html"] if (post == "10" and n == 1) else []
        c += [f"{d}/peca-sem-faixa-{n}-v2.html", f"{d}/peca-sem-faixa-{n}.html"]
    elif k == "2":
        c = [f"{d}/peca-caixa-{n}-ioga.html"] if (post == "10" and n == 1) else []
        c += [f"{d}/peca-caixa-{n}.html"]
    else:
        c = [f"{d}/peca-{n}-ioga.html"] if (post == "10" and n == 1) else []
        c += [f"{d}/peca-faixa-{n}.html", f"{d}/peca-{n}.html"]
    for x in c:
        if os.path.exists(x):
            return x
    return None


def copy_asset(path):
    dst = os.path.join(out, path)
    if os.path.exists(dst) or not os.path.exists(path):
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if path.lower().endswith((".jpg", ".jpeg")):
        im = Image.open(path).convert("RGB"); im.thumbnail((1600, 1600))
        im.save(dst, quality=80, optimize=True, progressive=True)
    else:
        shutil.copy(path, dst)
        if path.endswith(".css"):
            for u in re.findall(r'url\("?([^")]+)"?\)', open(path).read()):
                copy_asset(os.path.normpath(os.path.join(os.path.dirname(path), u)))


res = {}
for d in sorted(glob.glob(f"{base}/POST-*/estilos")):
    post = d.split("POST-")[1][:2]
    n_telas = len(glob.glob(f"{d}/estilo-1/*.png"))
    res[post] = {}
    for k in "123":
        lst = []
        for n in range(1, n_telas + 1):
            h = pick(post, n, k)
            if not h:
                lst = []; break
            html = open(h).read()
            for ref in re.findall(r'(?:src|href)="([^"#:]+)"', html):
                copy_asset(os.path.normpath(os.path.join(os.path.dirname(h), ref)))
            dst = os.path.join(out, h); os.makedirs(os.path.dirname(dst), exist_ok=True)
            open(dst, "w").write(html.replace("</body>", SCRIPT + "\n</body>"))
            lst.append(h)
        if lst:
            res[post][k] = lst
json.dump(res, open(f"{out}/pecas.json", "w"), ensure_ascii=False)
print({p: {k: len(v) for k, v in s.items()} for p, s in res.items()})
