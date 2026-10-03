#!/usr/bin/env python3
"""Monta um Reels (MP4 9:16) a partir de fotos reais, no padrão visual do Cabanas.

Uso (na raiz): python3 design/ferramentas/reels-de-fotos.py <roteiro.json>

roteiro.json (caminhos relativos à pasta do roteiro):
{
  "saida": "REELS.mp4",
  "capa": {"png": "capa.png", "tempo": 2.5},            # opcional: arte pronta (ex.: do Designer)
  "telas": [{"foto": "fotos/piscina.jpg", "pos": "40% center", "texto": "Piscina climatizada"}, ...],
  "tempo_tela": 1.1, "fusao": 0.2, "zoom": 0.05,         # segundos por tela, transição, zoom lento
  "moldura": true,                                       # moldura fina com o logo no alto
  "fim": {"foto": "fotos/aerea.jpg", "linha1": "BONITO - MS", "linha2": "Reserve pelo link da bio", "tempo": 2.0},
  "musica": {"arquivo": "musica.mp3", "volume": 0.8, "inicio": 0}   # opcional: só faixa com licença
}
Texto da tela: Josefin Sans 600, caixa alta, 38 px, como o "BONITO - MS" do modelo "Pause a tela".
A fusão mistura só as fotos; o texto entra depois dela (nunca há dois textos sobrepostos).
Gera as telas em <pasta>/reels-telas/ (não vão para o git) e o MP4. Depois de gerar, confira com
design/ferramentas/quadros-video.py.
"""
import html, json, os, subprocess, sys
from PIL import Image
import imageio_ffmpeg

ROT = os.path.abspath(sys.argv[1]); PASTA = os.path.dirname(ROT)
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
R = json.load(open(ROT, encoding="utf-8"))
TMP = os.path.join(PASTA, "reels-telas"); os.makedirs(TMP, exist_ok=True)
FPS, W, H = 30, 1080, 1920
MARCA = os.path.relpath(os.path.join(RAIZ, "design/modelos/marca.css"), TMP)
LOGO = os.path.relpath(os.path.join(RAIZ, "contexto/marca/logo-hotel-cabanas-branco.png"), TMP)

BASE = """<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link rel="stylesheet" href="{marca}">
<style>
.foto {{ object-position: {pos}; }}
.veu {{ position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(20,14,8,.35), rgba(20,14,8,.05) 35%, rgba(20,14,8,.05) 55%, rgba(20,14,8,.55)); }}
.moldura {{ position: absolute; left: 50px; right: 50px; top: 170px; bottom: 200px; border: 3px solid var(--creme); border-radius: 46px;
  -webkit-mask: linear-gradient(to right, #000 calc(50% - 130px), transparent calc(50% - 130px), transparent calc(50% + 130px), #000 calc(50% + 130px)) top / 100% 12px no-repeat, linear-gradient(#000, #000) 0 12px / 100% 100% no-repeat;
  mask: linear-gradient(to right, #000 calc(50% - 130px), transparent calc(50% - 130px), transparent calc(50% + 130px), #000 calc(50% + 130px)) top / 100% 12px no-repeat, linear-gradient(#000, #000) 0 12px / 100% 100% no-repeat; }}
.selo {{ position: absolute; left: 50%; top: 170px; transform: translate(-50%, -50%); }}
.selo img {{ height: 118px; display: block; filter: drop-shadow(0 2px 8px rgba(0,0,0,.35)); }}
.texto {{ position: absolute; left: 120px; right: 120px; bottom: 310px; text-align: center; font-family: "Josefin Sans", sans-serif; font-weight: 600;
  font-size: 38px; line-height: 1.3; letter-spacing: .08em; text-transform: uppercase; color: var(--creme);
  text-shadow: 0 2px 16px rgba(0,0,0,.6), 0 0 4px rgba(0,0,0,.35); }}
.fim {{ position: absolute; inset: 0; background: rgba(20,14,8,.55); }}
.fim-box {{ position: absolute; left: 100px; right: 100px; top: 700px; text-align: center; }}
.fim-box img {{ height: 230px; }}
.fim-box .l1 {{ margin-top: 40px; font-family: "Josefin Sans", sans-serif; font-weight: 600; font-size: 38px; letter-spacing: .3em; }}
.fim-box .l2 {{ margin-top: 70px; font-family: "Playfair Display", serif; font-style: italic; font-size: 64px; color: var(--creme); }}
</style></head><body><div class="peca story">
  <img class="foto" src="{foto}" alt="">
  {miolo}
</div></body></html>"""


def render(nome, foto, pos, miolo):
    arq = os.path.join(TMP, nome + ".html")
    src = os.path.relpath(os.path.join(PASTA, foto), TMP)
    open(arq, "w", encoding="utf-8").write(BASE.format(marca=MARCA, foto=src, pos=pos, miolo=miolo))
    png = os.path.join(TMP, nome + ".png")
    subprocess.run(["node", os.path.join(RAIZ, "design/ferramentas/renderizar.js"), arq, png, "story"], check=True, stdout=subprocess.DEVNULL)
    return png


moldura = R.get("moldura", True)
cab = (f'<div class="moldura"></div><div class="selo"><img src="{LOGO}" alt=""></div>' if moldura else "")
# Cada cena tem a versão com texto e a versão "limpa" (só foto e moldura): a fusão mistura as limpas,
# e o texto entra quando a fusão termina, para nunca sobrepor o texto de duas telas.
cenas = []
if R.get("capa"):
    capa = os.path.join(PASTA, R["capa"]["png"])
    cenas.append((capa, capa, R["capa"].get("tempo", 2.5)))
for i, t in enumerate(R["telas"], 1):
    pos, base = t.get("pos", "center"), f'<div class="veu"></div>{cab}'
    cenas.append((render(f"tela-{i:02d}", t["foto"], pos, base + f'<div class="texto">{html.escape(t.get("texto", ""))}</div>'),
                  render(f"tela-{i:02d}-limpa", t["foto"], pos, base), t.get("tempo", R.get("tempo_tela", 1.1))))
if R.get("fim"):
    f = R["fim"]; pos = f.get("pos", "50% center")
    miolo = (f'<div class="fim"></div><div class="fim-box"><img src="{LOGO}" alt="Hotel Cabanas">'
             f'<div class="l1">{html.escape(f.get("linha1", "BONITO - MS"))}</div><div class="l2">{html.escape(f.get("linha2", "Reserve pelo link da bio"))}</div></div>')
    cenas.append((render("fim", f["foto"], pos, miolo), render("fim-limpa", f["foto"], pos, '<div class="fim"></div>'), f.get("tempo", 2.0)))

exe = imageio_ffmpeg.get_ffmpeg_exe()
saida = os.path.join(PASTA, R.get("saida", "REELS.mp4"))
mudo = saida + ".mudo.mp4"
ff = subprocess.Popen([exe, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20", "-movflags", "+faststart", mudo], stdin=subprocess.PIPE)
FUSAO, ZOOM, ultimo = round(R.get("fusao", 0.2) * FPS), R.get("zoom", 0.05), None


def quadro(im, k, n):
    z = 1 + ZOOM * k / max(n - 1, 1)
    cw, ch = W / z, H / z; x, y = (W - cw) / 2, (H - ch) / 2
    return im.crop((round(x), round(y), round(x + cw), round(y + ch))).resize((W, H), Image.LANCZOS)


for png, limpa, dur in cenas:
    im, iml = Image.open(png).convert("RGB"), Image.open(limpa).convert("RGB"); n = round(dur * FPS)
    for k in range(n):
        if ultimo is not None and k < FUSAO:
            q = Image.blend(ultimo, quadro(iml, k, n), (k + 1) / (FUSAO + 1))
        else:
            q = quadro(im, k, n)
        ff.stdin.write(q.tobytes())
    ultimo = quadro(iml, n - 1, n)
ff.stdin.close(); ff.wait()
total = sum(d for *_, d in cenas)
if R.get("musica"):
    m = R["musica"]; arq = os.path.join(PASTA, m["arquivo"])
    subprocess.run([exe, "-y", "-loglevel", "error", "-i", mudo, "-ss", str(m.get("inicio", 0)), "-i", arq, "-map", "0:v", "-map", "1:a",
                    "-af", f"volume={m.get('volume', 0.8)},afade=t=in:d=0.5,afade=t=out:st={max(total - 1.2, 0):.2f}:d=1.2",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", saida], check=True)
    os.remove(mudo)
else:
    os.replace(mudo, saida)
print(f"OK: {saida} ({total:.1f} s, {len(cenas)} cenas{', com música' if R.get('musica') else ', sem música'})")
