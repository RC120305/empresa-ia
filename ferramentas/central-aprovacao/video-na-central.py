"""Coloca UM vídeo na aba Vídeos da Central (usado pela skill editar-video).

1) python3 ferramentas/central-aprovacao/video-na-central.py preparar <id> <arquivo.mp4> --titulo "..." --grupo "..." \
       [--musica "..."] [--nota "..."] [--antes <id-que-vem-depois>]
   Gera a cópia leve (720p) e a capa em ferramentas/central-aprovacao/videos/subir/<id>.mp4|.jpg (fora do git)
   e grava/atualiza o item em videos/lista.json (duração medida no arquivo). Imprime os 2 caminhos para subir.
2) Suba os 2 arquivos como assets da Central (Artifact, url da Central, asset: true, file_paths).
3) python3 ferramentas/central-aprovacao/video-na-central.py urls <id> <url-do-video> <url-da-capa>
   Grava em videos/urls.json. Depois: gerar.py e republicar a Central (mesma url).
"""
import argparse, json, os, re, subprocess
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
BASE = os.path.dirname(os.path.abspath(__file__)); V = f"{BASE}/videos"
ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest="cmd", required=True)
p = sub.add_parser("preparar"); p.add_argument("id"); p.add_argument("arquivo"); p.add_argument("--titulo", required=True)
p.add_argument("--grupo", required=True); p.add_argument("--musica", default="sem música"); p.add_argument("--nota", default=""); p.add_argument("--antes")
u = sub.add_parser("urls"); u.add_argument("id"); u.add_argument("video"); u.add_argument("capa")
a = ap.parse_args()
if not re.fullmatch(r"[a-z0-9-]+", a.id):
    raise SystemExit("id só com letras minúsculas, números e hífen")
if a.cmd == "preparar":
    os.makedirs(f"{V}/subir", exist_ok=True); mp4, jpg = f"{V}/subir/{a.id}.mp4", f"{V}/subir/{a.id}.jpg"
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", a.arquivo, "-vf", "scale=720:-2", "-c:v", "libx264", "-crf", "25", "-preset", "medium",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", mp4], check=True)
    subprocess.run([FF, "-y", "-loglevel", "error", "-ss", "1.0", "-i", a.arquivo, "-frames:v", "1", "-vf", "scale=540:-2", "-q:v", "4", jpg], check=True)
    info = subprocess.run([FF, "-hide_banner", "-i", a.arquivo], capture_output=True, text=True).stderr
    h, m, s = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info).groups(); dur = int(h) * 3600 + int(m) * 60 + float(s)
    item = {"id": a.id, "titulo": a.titulo, "grupo": a.grupo, "arquivo": os.path.relpath(os.path.abspath(a.arquivo)),
            "musica": a.musica, "nota": a.nota, "duracao": f"{dur:.1f}".rstrip("0").rstrip(".").replace(".", ",")}
    L = [x for x in json.load(open(f"{V}/lista.json", encoding="utf-8")) if x["id"] != a.id]
    pos = next((i for i, x in enumerate(L) if x["id"] == a.antes), 0) if a.antes else 0
    L.insert(pos, item); json.dump(L, open(f"{V}/lista.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"OK {a.id}: {dur:.1f} s, {os.path.getsize(mp4) / 1e6:.1f} MB, {'com áudio' if 'Audio:' in info else 'sem áudio'}")
    print("Suba como assets da Central:"); print(mp4); print(jpg)
else:
    U = json.load(open(f"{V}/urls.json", encoding="utf-8")); U[a.id] = {"video": a.video, "capa": a.capa}
    json.dump(U, open(f"{V}/urls.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1); print("urls gravadas para", a.id)
