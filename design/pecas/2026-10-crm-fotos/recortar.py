#!/usr/bin/env python3
"""Gera a biblioteca de fotos do CRM a partir das fotos selecionadas pelo Designer.

Uso (rodar da raiz do repositório):
    python3 design/pecas/2026-10-crm-fotos/recortar.py [destino]
Destino padrão: crm/app/public/fotos

- Corrige orientação EXIF (ImageOps.exif_transpose)
- Recorta em 4:3 e redimensiona para 1200x900 (ImageOps.fit, com centro por foto)
- JPEG qualidade 80 (baixa até 70 se passar de 250 KB)
- Copia fotos.json e descricoes.json para o destino
"""
import os, sys, shutil
from PIL import Image, ImageOps

AQUI = os.path.dirname(os.path.abspath(__file__))
ORIGEM = os.path.join(AQUI, "selecionadas")
DESTINO = sys.argv[1] if len(sys.argv) > 1 else "crm/app/public/fotos"

# Centro do recorte (x, y) de 0 a 1. Padrão (0.5, 0.5).
# Fotos verticais ou 16:9 precisam de ajuste para não cortar o essencial.
CENTRO = {
    "BOIA-2.jpg": (0.5, 0.42),   # vertical: mantém a moça na boia e o condutor
    "ARVO-2.jpg": (0.5, 0.40),   # vertical: mantém rosto, capacete e equipamento
    "CJ-3.jpg": (0.5, 0.40),     # vista de cima: prioriza as camas, corta parte da escada
    "BGE-4.jpg": (0.5, 0.5),
    "CAFE-2.jpg": (0.45, 0.5),   # 16:9: centraliza a cesta de frutas
    "PISCINA-2.jpg": (0.5, 0.5), # 16:9
}

os.makedirs(DESTINO, exist_ok=True)
for nome in sorted(os.listdir(ORIGEM)):
    if not nome.lower().endswith(".jpg"):
        continue
    im = ImageOps.exif_transpose(Image.open(os.path.join(ORIGEM, nome))).convert("RGB")
    im = ImageOps.fit(im, (1200, 900), Image.LANCZOS, centering=CENTRO.get(nome, (0.5, 0.5)))
    saida = os.path.join(DESTINO, nome)
    for q in (80, 76, 72, 70):
        im.save(saida, "JPEG", quality=q, optimize=True, progressive=True)
        if os.path.getsize(saida) <= 250_000:
            break
    print(f"{nome}: {os.path.getsize(saida)//1024} KB (q={q})")

for j in ("fotos.json", "descricoes.json"):
    shutil.copy(os.path.join(AQUI, j), os.path.join(DESTINO, j))
print("OK:", DESTINO)
