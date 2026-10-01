#!/usr/bin/env python3
"""Reels "Pause a tela e descubra" (teste de modelo, 01/10/2026).

Uso (na raiz): python3 design/pecas/2026-10-instagram/TESTE-MODELO-PAUSE/gera-reels.py
Capa (PAUSE-N.png, 2,5 s) → telas com foto + uma frase (tempo_tela em reels.json, padrão 1 s; fusão suave entre cenas)
→ fecho com logo e "Reserve pelo link da bio" (2 s). Zoom lento em cada tela. Sai REELS-PAUSE.mp4
(1080 x 1920, 30 fps, sem áudio: a música em alta é escolhida no app, na hora de publicar).
Precisa do ffmpeg do pacote imageio-ffmpeg (pip install imageio-ffmpeg).
"""
import html, json, os, subprocess
from PIL import Image
import imageio_ffmpeg

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "../../../.."))
R = json.load(open(os.path.join(AQUI, "reels.json"), encoding="utf-8"))
TMP = os.path.join(AQUI, "reels-telas"); os.makedirs(TMP, exist_ok=True)
FPS, W, H = 30, 1080, 1920

BASE = """<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link rel="stylesheet" href="../../../modelos/marca.css">
<style>
.foto {{ object-position: {pos}; }}
.veu {{ position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(20,14,8,.35), rgba(20,14,8,.05) 35%, rgba(20,14,8,.05) 55%, rgba(20,14,8,.55)); }}
.moldura {{ position: absolute; left: 50px; right: 50px; top: 170px; bottom: 200px; border: 3px solid var(--creme); border-radius: 46px;
  -webkit-mask: linear-gradient(to right, #000 calc(50% - 130px), transparent calc(50% - 130px), transparent calc(50% + 130px), #000 calc(50% + 130px)) top / 100% 12px no-repeat, linear-gradient(#000, #000) 0 12px / 100% 100% no-repeat;
  mask: linear-gradient(to right, #000 calc(50% - 130px), transparent calc(50% - 130px), transparent calc(50% + 130px), #000 calc(50% + 130px)) top / 100% 12px no-repeat, linear-gradient(#000, #000) 0 12px / 100% 100% no-repeat; }}
.selo {{ position: absolute; left: 50%; top: 170px; transform: translate(-50%, -50%); }}
.selo img {{ height: 118px; display: block; filter: drop-shadow(0 2px 8px rgba(0,0,0,.35)); }}
.palavra {{ position: absolute; left: 120px; right: 120px; bottom: 310px; text-align: center; font-family: "Josefin Sans", sans-serif; font-weight: 600;
  font-size: 38px; line-height: 1.3; letter-spacing: .08em; text-transform: uppercase; color: var(--creme);
  text-shadow: 0 2px 16px rgba(0,0,0,.6), 0 0 4px rgba(0,0,0,.35); }}
.fim {{ position: absolute; inset: 0; background: rgba(20,14,8,.55); }}
.fim-box {{ position: absolute; left: 100px; right: 100px; top: 700px; text-align: center; }}
.fim-box img {{ height: 230px; }}
.fim-box .local {{ margin-top: 40px; font-family: "Josefin Sans", sans-serif; font-weight: 600; font-size: 38px; letter-spacing: .3em; }}
.fim-box .chamada {{ margin-top: 70px; font-family: "Playfair Display", serif; font-style: italic; font-size: 64px; color: var(--creme); }}
</style></head><body><div class="peca story">
  <img class="foto" src="../fotos/{foto}" alt="">
  {miolo}
</div></body></html>"""

LOGO = "../../../../../contexto/marca/logo-hotel-cabanas-branco.png"


def render(nome, foto, pos, miolo):
    arq = os.path.join(TMP, nome + ".html")
    open(arq, "w", encoding="utf-8").write(BASE.format(foto=foto, pos=pos, miolo=miolo).replace("../../../modelos/", "../../../../modelos/"))
    png = os.path.join(TMP, nome + ".png")
    subprocess.run(["node", os.path.join(RAIZ, "design/ferramentas/renderizar.js"), arq, png, "story"], check=True, stdout=subprocess.DEVNULL)
    return png


cenas = [(os.path.join(AQUI, R["capa"]), 2.5)]
for i, t in enumerate(R["telas"], 1):
    miolo = (f'<div class="veu"></div><div class="moldura"></div><div class="selo"><img src="{LOGO}" alt=""></div>'
             f'<div class="palavra">{html.escape(t["texto"])}</div>')
    cenas.append((render(f"tela-{i:02d}", t["foto"], t.get("pos", "center"), miolo), R.get("tempo_tela", 1.0)))
fim = (f'<div class="fim"></div><div class="fim-box"><img src="{LOGO}" alt="Hotel Cabanas">'
       f'<div class="local">BONITO - MS</div><div class="chamada">Reserve pelo link da bio</div></div>')
cenas.append((render("fim", R.get("foto_fim", "aerea-hotel.jpg"), "50% center", fim), 2.0))

saida = os.path.join(AQUI, "REELS-PAUSE.mp4")
cmd = [imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20", "-movflags", "+faststart", saida]
ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
FUSAO = round(R.get("fusao", 0.2) * FPS)  # quadros de transição suave entre as cenas
ultimo = None
for png, dur in cenas:
    im = Image.open(png).convert("RGB")
    n = round(dur * FPS)
    for k in range(n):
        z = 1 + 0.05 * k / max(n - 1, 1)  # zoom lento
        cw, ch = W / z, H / z
        x, y = (W - cw) / 2, (H - ch) / 2
        q = im.crop((round(x), round(y), round(x + cw), round(y + ch))).resize((W, H), Image.LANCZOS)
        if ultimo is not None and k < FUSAO:
            q = Image.blend(ultimo, q, (k + 1) / (FUSAO + 1))
        ff.stdin.write(q.tobytes())
    ultimo = q
ff.stdin.close(); ff.wait()
print(f"{saida}: {sum(d for _, d in cenas):.1f} s, {len(cenas)} cenas")
