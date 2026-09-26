#!/usr/bin/env python3
"""Baixa as legendas (transcrições) de vídeos do YouTube e salva em texto limpo.

Uso:
  python3 ferramentas/youtube/transcrever.py <url> [--limite N] [--saida pasta] [--idioma pt]

<url> pode ser um vídeo, uma playlist ou um canal (ex.: https://www.youtube.com/@babruna/videos).
Em canais e playlists, pega os N vídeos mais recentes (padrão: 5).

Não baixa o vídeo, só a legenda (manual ou automática). Cada vídeo vira um arquivo .md com
título, canal, data, link e o texto corrido, em conhecimento/youtube/<canal>/ (fora do git:
a transcrição bruta é só material de estudo; o que vai para o repositório é a síntese).

Requisitos: `pip install yt-dlp` e o domínio www.youtube.com liberado na rede do ambiente.
"""
import argparse
import glob
import json
import os
import re
import subprocess
import sys
import tempfile


def limpar_vtt(texto):
    """Converte WebVTT em texto corrido, sem marcações e sem as repetições da legenda automática."""
    linhas, anterior = [], None
    for linha in texto.splitlines():
        linha = linha.strip()
        if not linha or linha == "WEBVTT" or "-->" in linha or re.match(r"^(Kind|Language|NOTE)\b", linha):
            continue
        linha = re.sub(r"<[^>]+>", "", linha)  # tags de tempo e estilo
        linha = re.sub(r"\s+", " ", linha).strip()
        if linha and linha != anterior:
            linhas.append(linha)
            anterior = linha
    return " ".join(linhas)


def slug(texto, tamanho=60):
    texto = re.sub(r"[^\w\s-]", "", texto.lower(), flags=re.UNICODE)
    return re.sub(r"[\s_]+", "-", texto).strip("-")[:tamanho] or "sem-titulo"


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("url")
    p.add_argument("--limite", type=int, default=5, help="máximo de vídeos em canal/playlist (padrão 5)")
    p.add_argument("--saida", default="conhecimento/youtube")
    p.add_argument("--idioma", default="pt", help="idioma da legenda (padrão pt; tenta pt, pt-BR e en)")
    a = p.parse_args()

    try:
        import yt_dlp  # noqa: F401
    except ImportError:
        sys.exit("Falta o yt-dlp. Rode: pip install yt-dlp")

    idiomas = f"{a.idioma},{a.idioma}-BR,{a.idioma}-orig,en"
    with tempfile.TemporaryDirectory() as tmp:
        cmd = [
            sys.executable, "-m", "yt_dlp", a.url,
            "--skip-download", "--write-subs", "--write-auto-subs",
            "--sub-langs", idiomas, "--sub-format", "vtt",
            "--write-info-json", "--playlist-end", str(a.limite),
            "--ignore-errors", "--no-warnings",
            "-o", os.path.join(tmp, "%(id)s.%(ext)s"),
        ]
        r = subprocess.run(cmd, capture_output=True, text=True)
        infos = glob.glob(os.path.join(tmp, "*.info.json"))
        if not infos:
            erro = (r.stderr or r.stdout).strip().splitlines()[-3:]
            sys.exit("Nenhum vídeo baixado. Verifique a URL e se www.youtube.com está liberado na rede.\n" + "\n".join(erro))

        salvos = 0
        for caminho in sorted(infos):
            info = json.load(open(caminho))
            if info.get("_type") == "playlist":
                continue
            vid = info["id"]
            legendas = sorted(glob.glob(os.path.join(tmp, f"{vid}.*.vtt")),
                              key=lambda c: (not re.search(rf"\.{a.idioma}(-BR)?\.vtt$", c), c))
            if not legendas:
                print(f"SEM LEGENDA: {info.get('title')} ({vid})")
                continue
            texto = limpar_vtt(open(legendas[0], encoding="utf-8").read())
            canal = info.get("uploader_id") or info.get("channel") or "canal"
            data = info.get("upload_date", "")
            data = f"{data[:4]}-{data[4:6]}-{data[6:]}" if len(data) == 8 else "sem-data"
            pasta = os.path.join(a.saida, slug(canal.lstrip("@")))
            os.makedirs(pasta, exist_ok=True)
            destino = os.path.join(pasta, f"{data}-{slug(info.get('title', vid))}.md")
            with open(destino, "w", encoding="utf-8") as f:
                f.write(f"# {info.get('title')}\n\n")
                f.write(f"- **Canal:** {info.get('channel')} ({canal})\n")
                f.write(f"- **Publicado em:** {data}\n")
                f.write(f"- **Link:** https://www.youtube.com/watch?v={vid}\n")
                f.write(f"- **Duração:** {round((info.get('duration') or 0) / 60)} min\n")
                f.write(f"- **Legenda usada:** {os.path.basename(legendas[0]).split('.', 1)[1]}\n\n")
                f.write("## Transcrição\n\n" + texto + "\n")
            print(f"OK: {destino} ({len(texto.split())} palavras)")
            salvos += 1
        print(f"\n{salvos} transcrição(ões) salva(s) em {a.saida}/")


if __name__ == "__main__":
    main()
