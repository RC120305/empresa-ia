"""Prepara os vídeos da aba Vídeos da Central: cópia leve (720x1280, ~5 a 10 MB) e capa (JPG).

Uso: python3 ferramentas/central-aprovacao/videos-prep.py <pasta-de-saida>
Lê ferramentas/central-aprovacao/videos/lista.json ([{id, titulo, grupo, arquivo, musica, nota}]) e grava
<saida>/<id>.mp4 e <saida>/<id>.jpg. Depois suba os dois como assets da Central (Artifact, asset: true)
e grave as urls em videos/urls.json ({id: {video, capa}}); o gerar.py junta tudo na aba Vídeos.
"""
import json, os, subprocess, sys, re
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
base = os.path.dirname(os.path.abspath(__file__))
for v in json.load(open(f"{base}/videos/lista.json", encoding="utf-8")):
    mp4, jpg = f"{out}/{v['id']}.mp4", f"{out}/{v['id']}.jpg"
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", v["arquivo"], "-vf", "scale=720:-2", "-c:v", "libx264", "-crf", "25",
                    "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", mp4], check=True)
    subprocess.run([FF, "-y", "-loglevel", "error", "-ss", "1.0", "-i", v["arquivo"], "-frames:v", "1", "-vf", "scale=540:-2", "-q:v", "4", jpg], check=True)
    info = subprocess.run([FF, "-hide_banner", "-i", v["arquivo"]], capture_output=True, text=True).stderr
    h, m, s = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info).groups()
    print(v["id"], f"{os.path.getsize(mp4)/1e6:.1f} MB", f"{int(m)*60+float(s):.1f} s", "áudio" if "Audio:" in info else "sem áudio")
