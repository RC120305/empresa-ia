"""Converte o resultado salvo de download_file_content (Drive MCP) em miniatura.

Uso: python3 salvar-miniatura.py <arquivo-do-resultado> <id-do-drive>
Grava ferramentas/central-aprovacao/banco/mini/<id>.jpg (lado maior 360 px) e
apaga o arquivo grande do resultado.
"""
import base64, io, json, os, sys
from PIL import Image, ImageOps

src, fid = sys.argv[1], sys.argv[2]
raw = open(src, encoding="utf-8").read()
try:
    d = json.loads(raw)
    if isinstance(d, list):
        d = next(x for x in d if isinstance(x, dict) and "content" in x) if any(isinstance(x, dict) and "content" in x for x in d) else json.loads(d[0]["text"])
    if "content" not in d and "text" in d:
        d = json.loads(d["text"])
    b64 = d["content"]
except Exception:
    b64 = raw.strip()
im = ImageOps.exif_transpose(Image.open(io.BytesIO(base64.b64decode(b64)))).convert("RGB")
im.thumbnail((360, 360))
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mini", f"{fid}.jpg")
os.makedirs(os.path.dirname(dst), exist_ok=True)
im.save(dst, quality=72, optimize=True, progressive=True)
os.remove(src)
print("ok", fid, os.path.getsize(dst))
