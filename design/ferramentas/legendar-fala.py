"""Kit de vídeo com fala: transcreve (Whisper), corta silêncios, nivela o volume e acelera a fala.

  python3 design/ferramentas/legendar-fala.py limpar <video> <saida.mp4> [--pausa 0.6] [--folga 0.15] [--acelerar 1.0]
      Corta as pausas maiores que --pausa s (usa as palavras do Whisper), deixa --folga s antes e depois da fala,
      nivela o áudio (-16 LUFS, padrão das redes) e, se pedido, acelera até 1,25x (voz sem ficar "esquilo").
  python3 design/ferramentas/legendar-fala.py transcrever <video> <saida.json> [--modelo small]
      Palavra por palavra com início e fim: {"idioma", "palavras":[{"p","ini","fim"}], "texto"}.
      Revise o JSON (nomes próprios: Cabanas, Bonito, Formoso...) antes de legendar.
Depois: modelo "legenda-fala" do Animador (design/ferramentas/animador/), roteiro com "video" e "transcricao".
Requer: pip install faster-whisper imageio-ffmpeg (o modelo vem do huggingface.co na 1ª vez, ~500 MB, gratuito).
"""
import argparse, json, os, subprocess, tempfile
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
VOCAB = "Hotel Cabanas, Bonito, Mato Grosso do Sul, Rio Formoso, Cabana Master, bangalô, boia cross, arvorismo, tirolesa, flutuação, Gruta do Lago Azul"


def palavras(video, modelo="small"):
    from faster_whisper import WhisperModel
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, "a.wav")
        subprocess.run([FF, "-y", "-loglevel", "error", "-i", video, "-vn", "-ac", "1", "-ar", "16000", wav], check=True)
        m = WhisperModel(modelo, device="cpu", compute_type="int8")
        segs, info = m.transcribe(wav, language="pt", word_timestamps=True, vad_filter=True, initial_prompt=VOCAB)
        ws = [{"p": w.word.strip(), "ini": round(w.start, 2), "fim": round(w.end, 2)} for s in segs for w in (s.words or []) if w.word.strip()]
    return ws, info.language


ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest="cmd", required=True)
t = sub.add_parser("transcrever"); t.add_argument("video"); t.add_argument("saida"); t.add_argument("--modelo", default="small")
l = sub.add_parser("limpar"); l.add_argument("video"); l.add_argument("saida"); l.add_argument("--pausa", type=float, default=0.6)
l.add_argument("--folga", type=float, default=0.15); l.add_argument("--acelerar", type=float, default=1.0); l.add_argument("--modelo", default="small")
a = ap.parse_args()
if a.cmd == "transcrever":
    ws, lang = palavras(a.video, a.modelo)
    json.dump({"idioma": lang, "palavras": ws, "texto": " ".join(w["p"] for w in ws)}, open(a.saida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(ws)} palavras ({lang}): {' '.join(w['p'] for w in ws)[:300]}")
else:
    if not 1.0 <= a.acelerar <= 1.25:
        raise SystemExit("--acelerar entre 1.0 e 1.25")
    ws, _ = palavras(a.video, a.modelo)
    if not ws:
        raise SystemExit("nenhuma fala encontrada")
    trechos = []  # junta palavras separadas por pausas menores que --pausa
    for w in ws:
        ini, fim = max(0, w["ini"] - a.folga), w["fim"] + a.folga
        if trechos and ini - trechos[-1][1] < a.pausa:
            trechos[-1][1] = max(trechos[-1][1], fim)
        else:
            trechos.append([ini, fim])
    sel = "+".join(f"between(t,{i:.2f},{f:.2f})" for i, f in trechos)
    vf = f"select='{sel}',setpts=N/FRAME_RATE/TB" + (f",setpts=PTS/{a.acelerar}" if a.acelerar != 1 else "")
    af = f"aselect='{sel}',asetpts=N/SR/TB" + (f",atempo={a.acelerar}" if a.acelerar != 1 else "") + ",loudnorm=I=-16:TP=-1.5:LRA=11"
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", a.video, "-vf", vf, "-af", af, "-c:v", "libx264", "-crf", "18", "-preset", "medium",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", a.saida], check=True)
    antes = ws[-1]["fim"]; depois = sum(f - i for i, f in trechos) / a.acelerar
    print(f"OK {a.saida}: {len(trechos)} trecho(s) de fala, ~{depois:.1f} s (fala ia até {antes:.1f} s). Transcreva de novo o vídeo limpo para legendar.")
