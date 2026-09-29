"""POST-16 (18/10/2026): carrossel "Bangalô de 40 m²", 7 telas 3:4, nos 3 estilos.
Cópia adaptada de POST-15/fonte/gera-post-15.py (que não foi alterado). Mudanças: caminho e nome POST-16;
posição, sombras, lado do bloco (sf_lado: baixo/cima) e altura da caixa por tela em textos.json;
linhas de contato na tela 7 (WhatsApp em destaque e motor de reservas menor).
Uso (na raiz do repositório): python3 design/pecas/2026-10-instagram/POST-16/fonte/gera-post-16.py design/pecas/2026-10-instagram/POST-16/fonte/textos.json [estilo-final]
"""
import json, html, re, sys, subprocess
P = "design/pecas/2026-10-instagram/POST-16"
T = json.load(open(sys.argv[1])); N = len(T)
FINAL = int(sys.argv[2]) if len(sys.argv) > 2 else 0

def md(t, so=False):
    h = html.escape(t.strip(), quote=False)
    if so: h = re.sub(r"\*\*(.+?)\*\*", r"\1", h); h = re.sub(r"\*(.+?)\*", r"\1", h)
    else: h = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", h); h = re.sub(r"\*(.+?)\*", r"<i>\1</i>", h)
    return h.replace("\\n", "<br>").replace("\n", "<br>")

def sombras(lst):
    return "".join(f'  <div class="sombra" style="left: {l}px; top: {t}px; width: {w}px; height: {h}px; --forca: {f}"></div>\n' for l, t, w, h, f in lst)

LOGO = '../../../../contexto/marca/logo-hotel-cabanas-branco.png'
for k in range(1, N + 1):
    t = T[str(k)]
    ti, ap, apcc = t["titulo"], html.escape(t["apoio"]), html.escape(t["apoio_cc"])
    num = "" if k == 1 else f'<span class="num-sf">{k}/{N}</span>'
    cont = t.get("contato")  # [whatsapp, motor]
    head = (f'<!doctype html>\n<!-- POST-16 | Carrossel "Bangalô de 40 m²" (18/10/2026) | tela {k}/{N} | Feed 3:4 -->\n'
            '<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<link rel="stylesheet" href="../../../modelos/marca.css">\n')
    sty = (f'<style>.foto {{ object-position: {t["pos"]}; }}\n'
           '.contato .zap { font-size: 32px; }\n.contato .motor { font-size: 22px; letter-spacing: .02em; }\n'
           '.cc .contato { margin-top: 18px; text-align: center; }\n</style>\n</head>\n<body>\n<div class="peca">\n'
           f'  <img class="foto" src="foto-{k}.jpg" alt="">\n')
    c_sf = c_cc = c_fx = ""
    if cont:
        linhas = (f'<span class="zap"><b>WhatsApp</b> {html.escape(cont[0])}</span><br>'
                  f'<span class="motor">{html.escape(cont[1])}</span>')
        c_sf = f'\n      <p class="contato">{linhas}</p>'
        c_cc = (f'\n    <p class="contato cc-apoio" style="font-family: \'Josefin Sans\', sans-serif; font-style: normal; font-weight: 600">'
                f'{linhas}</p>')
        c_fx = f'\n      <p class="contato"><b>WhatsApp</b> {html.escape(cont[0])}<br>{html.escape(cont[1])}</p>'
    lado = t.get("sf_lado", "baixo")
    sfb = f' style="{t["sf_bloco"]}"' if t.get("sf_bloco") else ""
    # Estilo 1: sem faixa
    open(f"{P}/peca-sem-faixa-{k}.html", "w").write(
        head + '<link rel="stylesheet" href="carrossel-sem-faixa.css">\n' + sty + sombras(t["sf_sombras"]) +
        f'  {num}\n  <div class="bloco-sf {lado}"{sfb}>\n      <p class="apoio">{ap}</p>\n      <div class="linha"></div>\n'
        f'      <h1 class="titulo">{md(ti)}</h1>{c_sf}\n  </div>\n'
        f'  <div class="assin-sf">\n    <span class="fio"></span>\n    <span class="local">Bonito · MS</span>\n'
        f'    <img src="{LOGO}" alt="Hotel Cabanas">\n  </div>\n</div>\n</body>\n</html>\n')
    # Estilo 2: caixa central
    duas = " duas" if t.get("cc_duas") else ""
    open(f"{P}/peca-caixa-{k}.html", "w").write(
        head + '<link rel="stylesheet" href="../../../modelos/estilo-caixa-central.css">\n' + sty + sombras(t["cc_sombras"]) +
        f'  {num}\n  <div class="cc" style="--topo: {t["cc_topo"]}px">\n    <div class="cc-caixa"><h1 class="titulo{duas}">{md(ti if t.get("cc_duas") else ti.replace(chr(10), " "), True)}</h1></div>\n'
        f'    <p class="cc-apoio">{apcc}</p>{c_cc}\n  </div>\n'
        f'  <div class="cc-selo base">\n    <img src="{LOGO}" alt="Hotel Cabanas">\n'
        f'    <div class="local"><i class="fio"></i><span>Bonito · MS</span><i class="fio"></i></div>\n  </div>\n</div>\n</body>\n</html>\n')
    # Estilo 3: faixa discreta embaixo
    open(f"{P}/peca-{k}.html", "w").write(
        head + '<link rel="stylesheet" href="carrossel-faixa.css">\n' + sty.replace(t["pos"], t.get("fx_pos", t["pos"])) +
        f'  <div class="rodape faixa">\n    <div class="texto">\n      <p class="apoio">{ap}</p>\n      <div class="linha"></div>\n'
        f'      <h1 class="titulo">{md(ti)}</h1>{c_fx}\n    </div>\n'
        f'    <div class="marca">\n      <span class="num">{"" if k == 1 else f"{k}/{N}"}</span>\n'
        f'      <img src="{LOGO}" alt="Hotel Cabanas">\n      <span class="local">Bonito · MS</span>\n    </div>\n  </div>\n</div>\n</body>\n</html>\n')
    for arq, e in ((f"peca-sem-faixa-{k}.html", 1), (f"peca-caixa-{k}.html", 2), (f"peca-{k}.html", 3)):
        subprocess.run(["node", "design/ferramentas/renderizar.js", f"{P}/{arq}", f"{P}/estilos/estilo-{e}/POST-16-{k}.png", "feed"], check=True, capture_output=True)
    if FINAL:
        subprocess.run(["cp", f"{P}/estilos/estilo-{FINAL}/POST-16-{k}.png", f"{P}/final/"], check=True)
print("ok", N, "final:", FINAL or "não copiado")
