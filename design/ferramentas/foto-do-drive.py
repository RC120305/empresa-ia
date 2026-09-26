#!/usr/bin/env python3
"""Converte o resultado de mcp__Google_Drive__download_file_content em arquivo de imagem.

Uso: python3 design/ferramentas/foto-do-drive.py <arquivo-do-resultado.txt> <saida.jpg>

Quando a foto é grande, o resultado da ferramenta do Drive é salvo num arquivo .txt
(JSON com os campos content em base64, id, mimeType e title). O caminho aparece na
mensagem "Output has been saved to ...". Este script decodifica esse arquivo.
"""
import base64
import json
import sys

if len(sys.argv) != 3:
    sys.exit(__doc__)

with open(sys.argv[1]) as f:
    dados = json.load(f)
if isinstance(dados, list):  # alguns resultados vêm como lista de blocos de texto
    dados = json.loads(dados[0]["text"])

with open(sys.argv[2], "wb") as f:
    f.write(base64.b64decode(dados["content"]))
print(f"OK: {dados.get('title')} ({dados.get('mimeType')}) -> {sys.argv[2]}")
