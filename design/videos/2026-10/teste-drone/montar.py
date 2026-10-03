#!/usr/bin/env python3
"""Monta os 2 Reels de teste com os brutos de drone (DJI_0113 e DJI_0114).

Uso (na raiz): python3 design/videos/2026-10/teste-drone/montar.py [cinematico|rapido]   (sem argumento = os dois)

Observação técnica: os brutos são 3840x2160 com metadado de rotação de 90 graus, ou seja, foram
filmados na VERTICAL (2160x3840 = 9:16 exato). Não é preciso recortar: o ffmpeg gira sozinho e
basta reduzir para 1080x1920. Nada da cena é cortado.

Etapas: (1) converte as fontes da marca (woff2) para TTF; (2) gera os textos em PNG transparente
(Josefin Sans 600, caixa alta, 38 px, faixa inferior fora dos 250 px da interface) e a tela de fecho;
(3) corta cada trecho, reduz, corrige a cor de leve (eq) e sobrepõe o texto, que só aparece depois da
fusão e some antes da próxima (nunca há dois textos ao mesmo tempo); (4) junta os trechos (fusão no
cinemático, corte seco no rápido). Arquivos intermediários em reels-telas/ (fora do git).
Os brutos ficam em design/videos/brutos/ (fora do git) e não são alterados.
"""
import os, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import imageio_ffmpeg

PASTA = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(PASTA, "../../../.."))
BRUTOS = os.path.join(RAIZ, "design/videos/brutos")
TMP = os.path.join(PASTA, "reels-telas"); os.makedirs(TMP, exist_ok=True)
FONTES = os.path.join(RAIZ, "contexto/marca/fontes")
LOGO = os.path.join(RAIZ, "contexto/marca/logo-hotel-cabanas-branco.png")
FF = imageio_ffmpeg.get_ffmpeg_exe()
W, H, FPS = 1080, 1920, 30
CREME = (245, 239, 226)  # creme da marca (aprox. do --creme do marca.css)
COR = "eq=brightness=0.03:contrast=1.08:saturation=1.10:gamma=1.12"  # correção leve, sem mudar a cena

# ---------- roteiros ----------
ROTEIROS = {
    "cinematico": {
        "saida": "REELS-DRONE-CINEMATICO.mp4", "fusao": 0.4,
        "trechos": [
            {"bruto": "DJI_0113", "ss": 0.5, "dur": 3.6, "texto": "ISSO É BONITO - MS"},
            {"bruto": "DJI_0114", "ss": 15.0, "dur": 3.6, "texto": "PAREDÕES DE PEDRA E MATA"},
            {"bruto": "DJI_0113", "ss": 15.0, "dur": 3.4, "texto": "+40 ATRATIVOS NA REGIÃO"},
            {"bruto": "DJI_0114", "ss": 25.6, "dur": 3.4, "fim": True},
        ],
    },
    "rapido": {
        "saida": "REELS-DRONE-RITMO-RAPIDO.mp4", "fusao": 0.0,
        "trechos": [
            {"bruto": "DJI_0114", "ss": 1.5, "dur": 1.5, "texto": "PRÓXIMA VIAGEM: BONITO - MS"},
            {"bruto": "DJI_0113", "ss": 2.0, "dur": 1.2, "texto": "PAREDÕES DE PEDRA"},
            {"bruto": "DJI_0114", "ss": 16.0, "dur": 1.2, "texto": "RIO NO MEIO DA MATA"},
            {"bruto": "DJI_0113", "ss": 12.0, "dur": 1.2, "texto": "+40 ATRATIVOS NA REGIÃO"},
            {"bruto": "DJI_0114", "ss": 21.0, "dur": 1.2, "texto": "VAGAS LIMITADAS POR DIA"},
            {"bruto": "DJI_0113", "ss": 18.0, "dur": 1.2, "texto": "PLANEJE COM ANTECEDÊNCIA"},
            {"bruto": "DJI_0114", "ss": 26.0, "dur": 2.2, "fim": True},
        ],
    },
}


# ---------- fontes e telas ----------
def ttf(nome):
    dst = os.path.join(TMP, nome + ".ttf")
    if not os.path.exists(dst):
        from fontTools.ttLib import TTFont
        f = TTFont(os.path.join(FONTES, nome + ".woff2")); f.flavor = None; f.save(dst)
    return dst


def escreve(im, txt, fonte, cy, espaco, cor=CREME, sombra=True):
    """Texto centrado em cy com espaçamento entre letras (letter-spacing) e sombra suave."""
    larg = [fonte.getlength(c) for c in txt]
    total = sum(larg) + espaco * (len(txt) - 1)
    x0 = (W - total) / 2
    asc, desc = fonte.getmetrics(); y = cy - (asc + desc) / 2
    camada = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(camada)
    sombra_l = Image.new("RGBA", im.size, (0, 0, 0, 0)); ds = ImageDraw.Draw(sombra_l)
    x = x0
    for c, l in zip(txt, larg):
        d.text((x, y), c, font=fonte, fill=cor + (255,))
        ds.text((x, y + 2), c, font=fonte, fill=(0, 0, 0, 255))
        x += l + espaco
    if sombra:
        larga = sombra_l.filter(ImageFilter.GaussianBlur(14)); larga.putalpha(larga.getchannel("A").point(lambda a: int(a * .75)))
        perto = sombra_l.filter(ImageFilter.GaussianBlur(3)); perto.putalpha(perto.getchannel("A").point(lambda a: int(a * .45)))
        im.alpha_composite(larga); im.alpha_composite(perto); im.alpha_composite(larga)
    im.alpha_composite(camada)


def png_texto(txt, nome):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    f = ImageFont.truetype(ttf("josefin-sans-latin-600-normal"), 38)
    escreve(im, txt.upper(), f, 1585, 38 * .08)  # mesma faixa do kit (bottom: 310 px), fora dos 250 px de baixo
    arq = os.path.join(TMP, nome + ".png"); im.save(arq); return arq


def png_fim(nome):
    im = Image.new("RGBA", (W, H), (20, 14, 8, 140))  # véu escuro do fecho do kit (rgba(20,14,8,.55))
    jos = ImageFont.truetype(ttf("josefin-sans-latin-600-normal"), 38)
    pf = ImageFont.truetype(ttf("playfair-display-latin-400-italic"), 64)
    escreve(im, "SUA BASE PARA EXPLORAR", jos, 640, 38 * .12)
    logo = Image.open(LOGO).convert("RGBA"); lw = round(logo.width * 230 / logo.height)
    logo = logo.resize((lw, 230), Image.LANCZOS); im.alpha_composite(logo, ((W - lw) // 2, 700))
    escreve(im, "BONITO - MS", jos, 1000, 38 * .3)
    escreve(im, "Reserve pelo link da bio", pf, 1120, 0)
    arq = os.path.join(TMP, nome + ".png"); im.save(arq); return arq


def roda(args):
    subprocess.run([FF, "-y", "-hide_banner", "-loglevel", "error", *args], check=True)


# ---------- montagem ----------
def monta(chave):
    R = ROTEIROS[chave]; xf = R["fusao"]; n = len(R["trechos"]); partes = []
    for i, t in enumerate(R["trechos"]):
        dur = t["dur"]
        png = png_fim(f"{chave}-fim") if t.get("fim") else png_texto(t["texto"], f"{chave}-texto-{i + 1:02d}")
        # janela do texto: entra depois da fusão de entrada e sai antes da fusão de saída
        ini = 0.05 if i == 0 else (xf + 0.1 if xf else 0.05)
        fim = dur if i == n - 1 else (dur - xf - 0.1 if xf else dur)
        ent = 0.3 if t.get("fim") else (0.15 if xf else 0.1)
        alpha = f"fade=in:st={ini:.2f}:d={ent}:alpha=1"
        if fim < dur:
            alpha += f",fade=out:st={fim - 0.15:.2f}:d=0.15:alpha=1"
        saida = os.path.join(TMP, f"{chave}-parte-{i + 1:02d}.mp4")
        roda(["-ss", str(t["ss"]), "-t", str(dur), "-i", os.path.join(BRUTOS, t["bruto"] + ".mp4"),
              "-loop", "1", "-t", str(dur), "-i", png,
              "-filter_complex", f"[0:v]scale={W}:{H}:flags=lanczos,fps={FPS},{COR},setsar=1[v];"
                                 f"[1:v]format=rgba,{alpha}[t];[v][t]overlay=0:0:format=auto,format=yuv420p[o]",
              "-map", "[o]", "-an", "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-t", str(dur), saida])
        partes.append((saida, dur))
    out = os.path.join(PASTA, R["saida"])
    if xf:
        ins, fc, ant, acc = [], [], "0:v", partes[0][1]
        for p, _ in partes:
            ins += ["-i", p]
        for k in range(1, n):
            lab = f"x{k}"
            fc.append(f"[{ant}][{k}:v]xfade=transition=fade:duration={xf}:offset={acc - xf:.3f}[{lab}]")
            ant, acc = lab, acc + partes[k][1] - xf
        roda([*ins, "-filter_complex", ";".join(fc), "-map", f"[{ant}]", "-an", "-c:v", "libx264", "-crf", "18",
              "-preset", "medium", "-pix_fmt", "yuv420p", "-r", str(FPS), "-movflags", "+faststart", out])
        total = acc
    else:
        lista = os.path.join(TMP, f"{chave}-lista.txt")
        open(lista, "w").write("".join(f"file '{p}'\n" for p, _ in partes))
        roda(["-f", "concat", "-safe", "0", "-i", lista, "-an", "-c:v", "libx264", "-crf", "18", "-preset", "medium",
              "-pix_fmt", "yuv420p", "-r", str(FPS), "-movflags", "+faststart", out])
        total = sum(d for _, d in partes)
    print(f"OK: {out} ({total:.1f} s, {n} trechos, sem áudio)")


for chave in (sys.argv[1:] or list(ROTEIROS)):
    monta(chave)
