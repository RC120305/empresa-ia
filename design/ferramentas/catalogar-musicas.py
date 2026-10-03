#!/usr/bin/env python3
"""Catálogo de músicas (faixas livres da pasta do Drive "Trilhas sonoras free") para o Editor de Vídeos.

Uso (na raiz):
  python3 design/ferramentas/catalogar-musicas.py analisar [arquivo.mp3 ...]
      Mede cada MP3 de design/videos/musicas/ (ou só os indicados) e atualiza design/videos/catalogo/musicas.json:
      duração, BPM, energia (1 a 5), brilho do som, em quantos segundos "começa forte", melhor trecho de 15 s
      para Reels, corte sugerido (no ritmo da batida) e a classificação de uso (clima, instrumentos, combina com).
      Campos que alguém ajustou à mão ficam em "manual" e nunca são sobrescritos.
  python3 design/ferramentas/catalogar-musicas.py previas <pasta>
      Gera a prévia de 30 s (MP4 de áudio, o asset da Central não aceita MP3) a partir do melhor trecho.
  python3 design/ferramentas/catalogar-musicas.py tabela
      Mostra o catálogo resumido no terminal.

Como a equipe não "ouve", a classificação junta medidas objetivas (BPM, energia, brilho) com as palavras do nome
da faixa no Pixabay (ex.: "acoustic", "piano", "rock", "nature", "whistle"). Ela é um ponto de partida:
o dono confirma ouvindo na aba Músicas da Central (favoritar ou marcar "não usar").
Requer: numpy e imageio-ffmpeg (pip install numpy imageio-ffmpeg).
"""
import json, os, re, subprocess, sys
from datetime import date
import numpy as np
import imageio_ffmpeg

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
PASTA = os.path.join(RAIZ, "design/videos/musicas")
ARQ = os.path.join(RAIZ, "design/videos/catalogo/musicas.json")
FF = imageio_ffmpeg.get_ffmpeg_exe()
SR, HOP, NFFT = 22050, 512, 2048

# Palavras do nome (Pixabay) -> instrumentos e clima. Só pistas; a energia medida decide o resto.
PISTAS = [
    (r"piano", "piano", "emotivo"), (r"acoustic|guitar|violao", "violão", None), (r"rock|indie", "guitarra e bateria", "aventura"),
    (r"whistl", "assobio", "alegre"), (r"nature|ambient", "ambiente", "calmo"), (r"cinematic|journey", "orquestral", "emotivo"),
    (r"energetic|action|sport", "batida eletrônica", "energético"), (r"adventure", None, "aventura"), (r"vlog|upbeat|happy|summer|pop|drinks", None, "alegre"),
    (r"calm|soft|warm", None, "calmo"),
]
COMBINA = {  # clima -> o que o hotel tem (contexto/hotel-operacional.md)
    "energético": ["boia cross", "arvorismo", "tirolesa", "passeios de aventura"],
    "aventura": ["boia cross", "arvorismo", "trilha", "caiaque", "passeios de aventura"],
    "alegre": ["caiaque", "stand up paddle", "piscina", "famílias", "programação inclusa", "café da manhã"],
    "calmo": ["cabanas", "redário", "hidromassagem", "rio e decks", "aves e fauna", "amanhecer"],
    "emotivo": ["casais", "Cabana Master", "drone e paisagens", "pôr do sol"],
}


def carregar():
    return json.load(open(ARQ, encoding="utf-8")) if os.path.exists(ARQ) else {"atualizado_em": "", "musicas": []}


def salvar(c):
    c["atualizado_em"] = date.today().isoformat()
    os.makedirs(os.path.dirname(ARQ), exist_ok=True)
    json.dump(c, open(ARQ, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def pcm(arq):
    raw = subprocess.run([FF, "-v", "error", "-i", arq, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def analisar_sinal(x):
    dur = len(x) / SR
    n = 1 + (len(x) - NFFT) // HOP
    idx = np.arange(NFFT)[None, :] + HOP * np.arange(n)[:, None]
    quadros = x[idx] * np.hanning(NFFT)[None, :]
    mag = np.abs(np.fft.rfft(quadros, axis=1))
    rms = np.sqrt((quadros ** 2).mean(axis=1)) + 1e-9
    db = 20 * np.log10(rms)
    freqs = np.fft.rfftfreq(NFFT, 1 / SR)
    brilho = float((mag * freqs).sum(axis=1).sum() / (mag.sum() + 1e-9))
    # onset (fluxo espectral) -> BPM por autocorrelação e densidade de batidas
    fluxo = np.maximum(np.diff(np.log1p(mag), axis=0), 0).sum(axis=1)
    fluxo = (fluxo - fluxo.mean()) / (fluxo.std() + 1e-9)
    fps = SR / HOP
    ac = np.correlate(fluxo, fluxo, mode="full")[len(fluxo) - 1:]
    lags = np.arange(len(ac)); bpm_lag = (lags >= fps * 60 / 180) & (lags <= fps * 60 / 70)
    pesos = np.exp(-0.5 * (np.log2((60 * fps / np.maximum(lags, 1)) / 115)) ** 2)  # leve preferência por ~115 BPM
    lag = int(lags[bpm_lag][np.argmax((ac * pesos)[bpm_lag])])
    bpm = round(60 * fps / lag)
    picos = ((fluxo[1:-1] > fluxo[:-2]) & (fluxo[1:-1] > fluxo[2:]) & (fluxo[1:-1] > 1.0)).sum() / dur
    # curva de energia por segundo
    seg = int(fps)
    por_seg = np.array([db[i:i + seg].mean() for i in range(0, len(db) - seg + 1, seg)])
    forte = np.percentile(por_seg, 60)
    inicio = next((i for i, v in enumerate(por_seg) if v >= forte - 3), 0)
    # melhor trecho de 15 s: mais energia e batida, sem silêncio
    w = 15; melhor, nota = 0, -1e9
    for i in range(0, max(1, len(por_seg) - w)):
        trecho = por_seg[i:i + w]
        sc = trecho.mean() - 0.5 * trecho.std()
        if sc > nota:
            melhor, nota = i, sc
    alto = float(np.percentile(por_seg, 75))
    # energia 1-5, calibrada nas faixas do Pixabay (03/10/2026): todas vêm masterizadas altas, então o que separa
    # piano/violão suave de rock e batida é o brilho do som (centróide espectral); depois, batidas por segundo e volume.
    e = (np.clip((brilho - 500) / 2000, 0, 1) * 2) + (np.clip((picos - 2.3) / 1.7, 0, 1) * 1.5) + (np.clip((alto + 23) / 11, 0, 1) * 1.5)
    energia = int(np.clip(round(e), 1, 5))
    return dict(duracao_s=round(dur, 1), bpm=bpm, energia=energia, batidas_por_s=round(float(picos), 2),
                brilho_hz=int(brilho), volume_db=round(alto, 1), comeca_forte_s=int(inicio),
                melhor_trecho_s=[int(melhor), int(min(melhor + w, dur))],
                curva=[int(np.clip((v + 40) * 2.5, 0, 100)) for v in por_seg[::max(1, len(por_seg) // 60)]])


def classificar(nome, m):
    instr, climas = [], []
    for rx, ins, cl in PISTAS:
        if re.search(rx, nome, re.I):
            if ins and ins not in instr: instr.append(ins)
            if cl and cl not in climas: climas.append(cl)
    if m["energia"] >= 4 and "energético" not in climas and "aventura" not in climas:
        climas.insert(0, "energético" if m["bpm"] >= 120 else "aventura")
    if m["energia"] <= 2 and "calmo" not in climas and "emotivo" not in climas:
        climas.insert(0, "calmo")
    if not climas:
        climas = ["alegre"]
    if m["energia"] >= 4:  # nome "calmo" mas medida forte: a medida vence
        climas = [c for c in climas if c != "calmo"] or ["alegre"]
    combina = []
    for c in climas:
        combina += [x for x in COMBINA.get(c, []) if x not in combina]
    beat = 60 / m["bpm"]
    corte = round(beat * (2 if m["bpm"] >= 100 else 1) * (2 if m["bpm"] < 80 else 1), 2)
    usos = []
    if m["energia"] >= 4: usos.append("Reels de ritmo rápido")
    if m["energia"] <= 3: usos.append("Reels cinemático")
    if m["energia"] == 3: usos.append("Reels hora a hora")
    usos.append("stories e fundo")
    return dict(climas=climas[:3], instrumentos=instr or ["instrumental"], combina_com=combina[:6], usos=usos,
                corte_sugerido_s=corte, voz="assobio (sem letra)" if "assobio" in instr else "instrumental (sem voz)")


def nome_legivel(arq):
    base = re.sub(r"-\d{5,6}$", "", os.path.splitext(arq)[0])
    autor, _, resto = base.partition("-")
    palavras = []
    for p in resto.replace("_", " ").split("-"):
        if p and (not palavras or p.lower() != palavras[-1].lower()):
            palavras.append(p)
    titulo = " ".join(palavras).replace("no copyright music", "").strip()
    return (titulo[:1].upper() + titulo[1:]) or base, autor


def analisar(arquivos):
    c = carregar(); por_id = {m["id"]: m for m in c["musicas"]}
    for arq in arquivos:
        mid = os.path.splitext(os.path.basename(arq))[0]
        med = analisar_sinal(pcm(arq))
        titulo, autor = nome_legivel(os.path.basename(arq))
        f = por_id.get(mid) or {"id": mid, "arquivo": os.path.basename(arq), "manual": {}, "id_drive": "", "previa": ""}
        f.update(nome=titulo, autor=autor, fonte="Pixabay (livre para uso comercial)", medidas=med, **classificar(titulo, med))  # pistas só no título, nunca no autor (ex.: "rockymetal")
        f.update(f.get("manual", {}))  # ajustes humanos têm a palavra final
        por_id[mid] = f
        print(f"{mid[:48]:48} {med['duracao_s']:6.1f}s  {med['bpm']:3d} BPM  energia {med['energia']}  forte em {med['comeca_forte_s']}s  {', '.join(f['climas'])}")
    nomes = [m["nome"] for m in por_id.values()]
    for m in por_id.values():  # títulos repetidos no Pixabay ("Acoustic music"): acrescenta o autor
        if nomes.count(m["nome"]) > 1 and "nome" not in m.get("manual", {}):
            m["nome"] = f"{m['nome']} ({m['autor']})"
    nomes = [m["nome"] for m in por_id.values()]
    for m in por_id.values():  # mesmo autor e mesmo título: acrescenta o número da faixa no Pixabay
        if nomes.count(m["nome"]) > 1 and "nome" not in m.get("manual", {}):
            m["nome"] = m["nome"][:-1] + " " + m["id"].rsplit("-", 1)[-1] + ")"
    c["musicas"] = sorted(por_id.values(), key=lambda m: (-m["medidas"]["energia"], m["nome"]))
    salvar(c)


def previas(saida):
    os.makedirs(saida, exist_ok=True)
    for m in carregar()["musicas"]:
        ini = max(0, m["medidas"]["melhor_trecho_s"][0] - 3)
        subprocess.run([FF, "-y", "-v", "error", "-ss", str(ini), "-i", os.path.join(PASTA, m["arquivo"]), "-t", "30", "-vn",
                        "-af", "afade=t=in:d=0.5,afade=t=out:st=27:d=3", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
                        os.path.join(saida, f"musica-{m['id']}.mp4")], check=True)
    print("OK:", saida)


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    if a[0] == "analisar":
        analisar([os.path.join(PASTA, x) if not os.path.isabs(x) else x for x in a[1:]] or
                 sorted(os.path.join(PASTA, x) for x in os.listdir(PASTA) if x.lower().endswith(".mp3") and "(1)" not in x))
    elif a[0] == "previas":
        previas(a[1])
    elif a[0] == "tabela":
        for m in carregar()["musicas"]:
            print(f"{m['nome'][:34]:34} E{m['medidas']['energia']} {m['medidas']['bpm']:3d}BPM {', '.join(m['climas']):28} {', '.join(m['combina_com'][:3])}")
    else:
        sys.exit(__doc__)
