#!/usr/bin/env python3
"""Converte o resultado de mcp__Google_Drive__download_file_content (arquivo .txt com JSON e base64) num vídeo.

Uso: python3 design/ferramentas/video-do-drive.py <resultado.txt> <saida.mp4>
Vídeos grandes podem não caber na ferramenta do Drive: se o download falhar, peça ao dono uma versão
menor (ou só o trecho) e registre a limitação na entrega.
"""
import base64, json, sys

d = json.load(open(sys.argv[1]))
if isinstance(d, list):
    d = json.loads(d[0]["text"])
open(sys.argv[2], "wb").write(base64.b64decode(d["content"]))
print(f"OK: {d.get('title')} ({d.get('mimeType')}) -> {sys.argv[2]}")
