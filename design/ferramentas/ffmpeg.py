#!/usr/bin/env python3
"""Roda o ffmpeg do kit (pacote imageio-ffmpeg), sem depender de ffmpeg instalado no sistema.

Uso: python3 design/ferramentas/ffmpeg.py <argumentos do ffmpeg>
Ex.: python3 design/ferramentas/ffmpeg.py -i bruto.mp4 -ss 3 -t 5 -c copy corte.mp4
     python3 design/ferramentas/ffmpeg.py --caminho   (só mostra onde está o executável)
Se faltar o pacote: pip install imageio-ffmpeg (única instalação permitida ao editor-videos).
"""
import subprocess, sys

try:
    import imageio_ffmpeg
except ImportError:
    sys.exit("Falta o ffmpeg do kit. Rode: pip install imageio-ffmpeg")
exe = imageio_ffmpeg.get_ffmpeg_exe()
if sys.argv[1:] == ["--caminho"]:
    print(exe); sys.exit(0)
sys.exit(subprocess.call([exe, "-hide_banner", "-loglevel", "error", *sys.argv[1:]]))
