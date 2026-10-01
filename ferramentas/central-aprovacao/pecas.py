"""Empacota as peças HTML editáveis (3 estilos) para a Central de Aprovação.

Uso: python3 ferramentas/central-aprovacao/pecas.py 2026-10 <pasta-de-saida>
Copia, mantendo os caminhos do repositório, cada peca-*.html usada nos
estilos 1 (sem faixa), 2 (caixa central) e 3 (faixa embaixo) de cada post,
com CSS, fontes, logo e fotos (reduzidas). Em cada HTML copiado injeta um
ouvinte de postMessage para a prévia ao vivo do texto da arte.
Grava <saida>/pecas.json: {"NN": {"1": [html...], "2": [...], "3": [...]}}.
Anúncios (design/pecas/anuncios/AAAA-MM-*/<COD>/): grava <saida>/pecas-ads.json
{"COD": {"f": [html feed 4:5...], "s": [html story 9:16...]}} (estilo sem faixa).
"""
import base64, glob, hashlib, io, json, os, re, shutil, sys
from PIL import Image

mes, out = sys.argv[1], sys.argv[2]
base = f"design/pecas/{mes}-instagram"
SCRIPT = """<script>
(function(){
  var t=document.querySelector('h1.titulo'), a=document.querySelector('.apoio, .cc-apoio, .fato');
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


CSS_UNICO = {}  # md5 do CSS -> primeiro caminho copiado (CSS repetido entre posts vira um arquivo só)


def dedup_css(html, h):
    for ref in set(re.findall(r'href="([^"#:]+\.css)"', html)):
        src = os.path.normpath(os.path.join(os.path.dirname(h), ref))
        if not os.path.exists(src):
            continue
        k = hashlib.md5(open(src, "rb").read()).hexdigest()
        canon = CSS_UNICO.setdefault(k, src)
        if canon != src:
            html = html.replace(f'href="{ref}"', f'href="{os.path.relpath(canon, os.path.dirname(h))}"')
    return html


def embute_fotos(html, h):
    for ref in set(re.findall(r'src="([^"#:]+\.jpe?g)"', html)):
        src = os.path.normpath(os.path.join(os.path.dirname(h), ref))
        if os.path.exists(src):
            im = Image.open(src).convert("RGB"); im.thumbnail((1400, 1400)); buf = io.BytesIO()
            im.save(buf, "JPEG", quality=76, optimize=True, progressive=True)
            html = html.replace(f'"{ref}"', '"data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode() + '"')
    return html


res = {}
import csv  # noqa: E402
cal = sorted(glob.glob(f"social/conteudo/{mes}/calendario-v*.csv"))
publicados = {r["Post"].split()[1] for r in csv.DictReader(open(cal[-1])) if r["Status"].startswith("Publicado")} if cal else set()
for d in sorted(glob.glob(f"{base}/POST-*/estilos")):
    post = d.split("POST-")[1][:2]
    if post in publicados:
        continue  # já está no Instagram: sai da Central
    n_telas = len(glob.glob(f"{d}/estilo-1/*.png"))
    res[post] = {}
    for k in "123":
        lst = []
        for n in range(1, n_telas + 1):
            h = pick(post, n, k)
            if not h:
                lst = []; break
            html = dedup_css(open(h).read(), h)
            for ref in re.findall(r'(?:src|href)="([^"#:]+)"', html):
                copy_asset(os.path.normpath(os.path.join(os.path.dirname(h), ref)))
            dst = os.path.join(out, h); os.makedirs(os.path.dirname(dst), exist_ok=True)
            open(dst, "w").write(html.replace("</body>", SCRIPT + "\n</body>"))
            lst.append(h)
        if lst:
            res[post][k] = lst
# stories com enquete: {"E1": {"1": [sem faixa], "3": [com faixa]}}
for h1 in sorted(glob.glob(f"{base}/STORIES-ENQUETE/ENQUETE-*-sem-faixa.html")):
    i = re.search(r"ENQUETE-(\d+)-sem-faixa", h1).group(1)
    res[f"E{i}"] = {}
    for k, h in (("1", h1), ("3", h1.replace("-sem-faixa", ""))):
        if not os.path.exists(h):
            continue
        html = embute_fotos(dedup_css(open(h).read(), h), h)
        for ref in re.findall(r'(?:src|href)="([^"#:]+)"', html):
            copy_asset(os.path.normpath(os.path.join(os.path.dirname(h), ref)))
        dst = os.path.join(out, h); os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, "w").write(html.replace("</body>", SCRIPT + "\n</body>"))
        res[f"E{i}"][k] = [h]
json.dump(res, open(f"{out}/pecas.json", "w"), ensure_ascii=False)
print({p: {k: len(v) for k, v in s.items()} for p, s in res.items()})


# anúncios: um HTML por tela (o mesmo serve aos dois formatos) ou um por formato
def pick_ad(d, cod, n, fmt):
    suf = "feed45" if fmt == "f" else "story"
    for x in (f"{d}/{cod}-{n}-{suf}.html", f"{d}/{cod}-{n}.html", f"{d}/peca-{n}-{suf}.html", f"{d}/peca-{suf}.html" if n == 1 else ""):
        if x and os.path.exists(x):
            return x
    return None


ads = {}
for d in sorted(glob.glob(f"design/pecas/anuncios/{mes}-*/*/")):
    d = d.rstrip("/"); cod = os.path.basename(d)
    n_telas = len(glob.glob(f"{d}/{cod}-*-feed45.png"))
    if not n_telas:
        continue
    ads[cod] = {}
    for k in "fs":
        lst = []
        for n in range(1, n_telas + 1):
            h = pick_ad(d, cod, n, k)
            if not h:
                lst = []; break
            dst = os.path.join(out, h)
            if not os.path.exists(dst):
                html = open(h).read()
                for ref in set(re.findall(r'(?:src|href)="([^"#:]+)"', html)):
                    src = os.path.normpath(os.path.join(os.path.dirname(h), ref))
                    if src.lower().endswith((".jpg", ".jpeg")) and os.path.exists(src):
                        # foto embutida no HTML: poupa arquivos (a página aceita ~510)
                        im = Image.open(src).convert("RGB"); im.thumbnail((1400, 1400)); buf = io.BytesIO()
                        im.save(buf, "JPEG", quality=76, optimize=True, progressive=True)
                        html = html.replace(f'"{ref}"', '"data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode() + '"')
                    else:
                        copy_asset(src)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                open(dst, "w").write(html.replace("</body>", SCRIPT + "\n</body>"))
            lst.append(h)
        if lst:
            ads[cod][k] = lst
json.dump(ads, open(f"{out}/pecas-ads.json", "w"), ensure_ascii=False)
print("anúncios:", {c: {k: len(v) for k, v in s.items()} for c, s in ads.items()})
