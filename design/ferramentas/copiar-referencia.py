"""Copiar um vídeo de referência com as nossas imagens (pedido "copiar referência" da Central).

1) python3 design/ferramentas/copiar-referencia.py analisar <referencia.mp4> <pasta>
   Mede a duração, acha os cortes (troca de cena), gera <pasta>/folha.jpg (um quadro a cada 0,5 s, com o tempo
   em cada um, para ler os textos e o jeito que entram) e <pasta>/receita-base.json com as cenas da referência.
2) Preencha a receita: para cada cena, a "fonte" (trecho do catálogo de vídeos ou foto do banco, com o mesmo tipo
   de plano), o movimento e os textos (mesmo tempo, lugar, tamanho e entrada da referência, com o conteúdo
   adaptado ao hotel: fatos só de contexto/hotel-operacional.md).
3) python3 design/ferramentas/copiar-referencia.py montar <receita.json> [saida.mp4] [--previa]
   Corta e enquadra cada cena em 9:16 (com zoom, se pedido), junta tudo e passa pelo Animador (modelo "receita")
   para os textos e a música.

Receita: {"formato": {"w":1080,"h":1920,"fps":30},
  "cenas": [{"fonte": "design/videos/brutos/X.mp4", "ini": 3.2, "dur": 2.4, "zoom": "entrar|sair|vaivem|nenhum", "foco": 0.5}
            | {"foto": "caminho.jpg", "dur": 2.0, "zoom": "entrar"}],
  "textos": [ ... campos do modelo receita, ver design/ferramentas/animador/modelos/receita.js ... ],
  "musica": {"arquivo": "...mp3", "inicioSeg": 0, "volume": 0.8}, "escurecer": 0.12, "logo": {"ini": 0, "fim": 2}}
"""
import json, os, re, subprocess, sys, tempfile
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def duracao(arq):
    info = subprocess.run([FF, "-hide_banner", "-i", arq], capture_output=True, text=True).stderr
    h, m, s = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


def analisar(ref, pasta):
    from PIL import Image, ImageDraw
    os.makedirs(pasta, exist_ok=True)
    dur = duracao(ref)
    # cortes: miniaturas em cinza a 10 quadros/s; corte = salto bem maior que o movimento normal
    # (limiar adaptativo: 3x a mediana, mínimo 12), com pelo menos 0,4 s entre cortes
    raw = subprocess.run([FF, "-loglevel", "error", "-i", ref, "-vf", "fps=10,scale=32:56,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
    tam = 32 * 56; qs = [raw[i:i + tam] for i in range(0, len(raw) - tam + 1, tam)]
    difs = [sum(abs(a - b) for a, b in zip(qs[i], qs[i - 1])) / tam for i in range(1, len(qs))]
    med = sorted(difs)[len(difs) // 2] if difs else 0
    cortes = []
    for i, dv in enumerate(difs, 1):
        if dv > max(12, med * 3) and (not cortes or i / 10 - cortes[-1] >= 0.4): cortes.append(round(i / 10, 2))
    marcas = [0.0] + [c for c in cortes if 0.3 < c < dur - 0.3] + [round(dur, 2)]
    cenas = [{"ini": a, "fim": b, "dur": round(b - a, 2)} for a, b in zip(marcas, marcas[1:])]
    with tempfile.TemporaryDirectory() as d:
        subprocess.run([FF, "-y", "-loglevel", "error", "-i", ref, "-vf", "fps=2,scale=240:-2", f"{d}/q%04d.jpg"], check=True)
        fs = sorted(os.listdir(d)); ims = [Image.open(f"{d}/{f}").convert("RGB") for f in fs]
        if ims:
            w, h = ims[0].size; cols = 8; rows = (len(ims) + cols - 1) // cols
            folha = Image.new("RGB", (cols * w, rows * (h + 22)), "white"); dr = ImageDraw.Draw(folha)
            for i, im in enumerate(ims):
                x, y = (i % cols) * w, (i // cols) * (h + 22); folha.paste(im, (x, y + 22)); dr.text((x + 4, y + 4), f"{i * 0.5:.1f} s", fill="black")
            folha.save(f"{pasta}/folha.jpg", quality=80)
    base = {"referencia": os.path.abspath(ref), "duracao": round(dur, 2), "cenas": cenas,
            "formato": {"w": 1080, "h": 1920, "fps": 30}, "textos": [], "musica": None}
    json.dump(base, open(f"{pasta}/receita-base.json", "w"), ensure_ascii=False, indent=1)
    print(f"{dur:.1f} s, {len(cenas)} cena(s): " + ", ".join(f"{c['dur']}s" for c in cenas) + f"\nfolha: {pasta}/folha.jpg")


def montar(arq, saida, previa):
    rc = json.load(open(arq, encoding="utf-8")); base = os.path.dirname(os.path.abspath(arq))
    caminho = lambda p: p if os.path.isabs(p) else (os.path.join(RAIZ, p) if os.path.exists(os.path.join(RAIZ, p)) else os.path.join(base, p))
    W, H, FPS = rc["formato"]["w"], rc["formato"]["h"], rc["formato"]["fps"]
    with tempfile.TemporaryDirectory() as d:
        partes = []
        for i, c in enumerate(rc["cenas"]):
            n = max(1, round(c["dur"] * FPS)); z = c.get("zoom", "nenhum"); fx = c.get("foco", 0.5)
            zexp = {"entrar": f"1+0.12*on/{n}", "sair": f"1.12-0.12*on/{n}", "vaivem": f"1+0.12*sin(PI*on/{n})"}.get(z, "1")
            # enquadra em 9:16 maior que a saída e aplica o zoom quadro a quadro (zoompan, 1 quadro por quadro)
            vf = (f"scale={int(W*1.5)}:{int(H*1.5)}:force_original_aspect_ratio=increase,crop={int(W*1.5)}:{int(H*1.5)}:(iw-ow)*{fx}:(ih-oh)/2,fps={FPS},"
                  f"zoompan=z='{zexp}':d=1:x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':s={W}x{H}:fps={FPS},setsar=1")
            entrada = ["-loop", "1", "-i", caminho(c["foto"])] if c.get("foto") else ["-ss", str(c.get("ini", 0)), "-i", caminho(c["fonte"])]
            p = f"{d}/c{i:02d}.mp4"
            subprocess.run([FF, "-y", "-loglevel", "error", *entrada, "-t", f"{c['dur']:.3f}", "-vf", vf, "-frames:v", str(n), "-an",
                            "-c:v", "libx264", "-crf", "17", "-preset", "veryfast", "-pix_fmt", "yuv420p", p], check=True)
            partes.append(p)
        open(f"{d}/lista.txt", "w").write("".join(f"file '{p}'\n" for p in partes))
        fundo = os.path.join(base, "fundo.mp4")
        subprocess.run([FF, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", f"{d}/lista.txt", "-c", "copy", fundo], check=True)
    total = sum(c["dur"] for c in rc["cenas"])
    rot = {"modelo": "receita", "formato": rc["formato"], "video": fundo, "audioDoVideo": False, "duracaoSeg": total,
           "textos": rc.get("textos", []), "escurecer": rc.get("escurecer", 0.12), "logo": rc.get("logo"), "crf": rc.get("crf", 23)}
    if rc.get("musica"): rot["musica"] = {**rc["musica"], "arquivo": caminho(rc["musica"]["arquivo"])}
    ra = os.path.join(base, "roteiro-animador.json"); json.dump(rot, open(ra, "w"), ensure_ascii=False, indent=1)
    cmd = ["node", os.path.join(RAIZ, "design/ferramentas/animador/animar.mjs"), ra, os.path.abspath(saida)] + (["--previa"] if previa else [])
    subprocess.run(cmd, check=True)
    os.remove(fundo)  # o fundo é intermediário (pesado); a receita refaz quando precisar


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] not in ("analisar", "montar"):
        sys.exit(__doc__)
    if a[0] == "analisar":
        analisar(a[1], a[2])
    else:
        prev = "--previa" in a; a = [x for x in a if x != "--previa"]
        montar(a[1], a[2] if len(a) > 2 else os.path.join(os.path.dirname(os.path.abspath(a[1])), "copia.mp4"), prev)
