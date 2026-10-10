#!/usr/bin/env python3
"""Remove repetições de legenda rolante (a mesma frase aparece 2x em cues vizinhos).
Uso: python3 ferramentas/curso/limpar_legenda.py arquivo.legenda.txt [...]  (gera .limpa.txt)"""
import sys


def limpar(t):
    w = t.split()
    mudou = True
    while mudou:
        mudou = False
        out, i = [], 0
        while i < len(w):
            # maior bloco repetido logo em seguida (k palavras), do maior para o menor
            achou = False
            for k in range(min(40, (len(w) - i) // 2), 2, -1):
                if w[i:i + k] == w[i + k:i + 2 * k]:
                    out.extend(w[i:i + k]); i += 2 * k; achou = mudou = True
                    break
            if not achou:
                out.append(w[i]); i += 1
        w = out
    return " ".join(w)


for a in sys.argv[1:]:
    s = open(a, encoding="utf-8").read()
    r = limpar(s)
    open(a.replace(".legenda.txt", ".limpa.txt"), "w", encoding="utf-8").write(r)
    print(a, len(s.split()), "->", len(r.split()))
