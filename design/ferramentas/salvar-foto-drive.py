"""Salva a foto baixada pelo Drive MCP (download_file_content) confere o ID de dentro do arquivo.
Uso: python3 design/ferramentas/salvar-foto-drive.py <arquivo-do-resultado> <id> <destino.jpg>
"""
import json,base64,io,sys,os
from PIL import Image,ImageOps
src,fid,dst=sys.argv[1:4]
d=json.load(open(src))
assert d['id']==fid,(d['id'],fid)
im=ImageOps.exif_transpose(Image.open(io.BytesIO(base64.b64decode(d['content'])))).convert('RGB')
im.thumbnail((2400,2400)); im.save(dst,quality=88); os.remove(src); print(dst,im.size)
