#!/usr/bin/env python3
"""Coloca música (faixa livre, em design/videos/musicas/) nos Reels de teste do drone.
Uso (na raiz): python3 design/videos/2026-10/teste-drone/musica.py
Volume normalizado (loudnorm -15 LUFS), entrada de 0,4 s e saída suave de 1,5 s no fim do vídeo."""
import os, re, subprocess
import imageio_ffmpeg
E = imageio_ffmpeg.get_ffmpeg_exe()
P = os.path.dirname(os.path.abspath(__file__)); M = os.path.join(P, "../../musicas"); O = os.path.join(P, "com-musica")
os.makedirs(O, exist_ok=True)
VERSOES = [  # (vídeo, faixa, início na faixa em s, saída)
    ("REELS-DRONE-CINEMATICO.mp4", "atlasaudio-ambient-cinematic-510518", 1, "CINEMATICO-ambient.mp4"),
    ("REELS-DRONE-CINEMATICO.mp4", "nastelbom-piano-cinematic-304999", 0, "CINEMATICO-piano.mp4"),
    ("REELS-DRONE-CINEMATICO-AMARELO.mp4", "nastelbom-piano-cinematic-304999", 0, "CINEMATICO-piano-amarelo.mp4"),
    ("REELS-DRONE-RITMO-RAPIDO.mp4", "the_mountain-upbeat-acoustic-593084", 0, "RAPIDO-violao-1.mp4"),
    ("REELS-DRONE-RITMO-RAPIDO.mp4", "tunetank-upbeat-acoustic-guitar-347972", 0, "RAPIDO-violao-2.mp4"),
]
for v, m, ini, out in VERSOES:
    info = subprocess.run([E, "-hide_banner", "-i", os.path.join(P, v)], capture_output=True, text=True).stderr
    h, mi, s = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info).groups(); d = int(h) * 3600 + int(mi) * 60 + float(s)
    subprocess.run([E, "-y", "-loglevel", "error", "-i", os.path.join(P, v), "-ss", str(ini), "-i", os.path.join(M, m + ".mp3"),
                    "-map", "0:v", "-map", "1:a", "-filter:a", f"loudnorm=I=-15:TP=-1.5:LRA=11,afade=t=in:d=0.4,afade=t=out:st={d - 1.5:.2f}:d=1.5",
                    "-c:v", "libx264", "-crf", "22", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "44100",
                    "-shortest", "-movflags", "+faststart", os.path.join(O, out)], check=True)
    print(f"OK: {out} ({d:.1f} s, {m})")
