#!/usr/bin/env python3
"""Folha de contato de um vídeo: N quadros espaçados num único JPG, para conferir o vídeo com os olhos.

Uso: python3 design/ferramentas/quadros-video.py <video.mp4> <saida.jpg> [quadros=8]
Também imprime a duração, a resolução e se há áudio. Use antes de editar um bruto e depois de
renderizar (todo Reels é conferido assim antes da entrega).
"""
import io, json, os, re, subprocess, sys
from PIL import Image, ImageDraw
import imageio_ffmpeg

video, saida = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 8
exe = imageio_ffmpeg.get_ffmpeg_exe()
info = subprocess.run([exe, "-hide_banner", "-i", video], capture_output=True, text=True).stderr
m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info)
dur = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else 0
res = re.search(r"Video:.*?(\d{2,5})x(\d{2,5})", info)
audio = "Audio:" in info
print(json.dumps({"duracao_s": round(dur, 2), "resolucao": f"{res.group(1)}x{res.group(2)}" if res else "?", "audio": audio}))
quadros = []
for i in range(n):
    t = dur * (i + 0.5) / n
    png = subprocess.run([exe, "-hide_banner", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", video, "-frames:v", "1",
                          "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
    if png:
        im = Image.open(io.BytesIO(png)).convert("RGB"); im.thumbnail((360, 640))
        d = ImageDraw.Draw(im); d.rectangle((0, 0, 70, 22), fill="black"); d.text((4, 4), f"{t:.1f}s", fill="white")
        quadros.append(im)
if not quadros:
    sys.exit("Não consegui extrair quadros.")
w, h = max(q.width for q in quadros), max(q.height for q in quadros)
cols = min(4, len(quadros)); rows = (len(quadros) + cols - 1) // cols
folha = Image.new("RGB", (cols * (w + 8), rows * (h + 8)), "white")
for i, q in enumerate(quadros):
    folha.paste(q, ((i % cols) * (w + 8), (i // cols) * (h + 8)))
os.makedirs(os.path.dirname(os.path.abspath(saida)), exist_ok=True)
folha.save(saida, quality=85)
print(f"OK: {saida} ({len(quadros)} quadros)")
