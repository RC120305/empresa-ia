#!/usr/bin/env python3
"""Catálogo de vídeos do Hotel Cabanas: dados técnicos, trechos (cenas) e descrição de cada vídeo do Drive,
para o Editor de Vídeos escolher os trechos sem baixar e assistir tudo de novo.

Uso (na raiz):
  python3 design/ferramentas/catalogar-videos.py baixar <id_drive> <arquivo.mp4>
      Baixa o vídeo para design/videos/brutos/ (fora do git). Vídeo grande: o arquivo precisa estar com
      "qualquer pessoa com o link" e a rede liberar drive.usercontent.google.com.
  python3 design/ferramentas/catalogar-videos.py preparar <id_drive> <arquivo.mp4> [--titulo "nome no Drive"]
      Lê os dados técnicos, detecta as trocas de cena, divide em trechos de até 6 s e gera a folha de
      quadros por trecho em design/videos/catalogo/quadros/. Cria (ou atualiza) a ficha no catálogo com
      os campos técnicos preenchidos e os descritivos vazios ("" = a preencher).
  python3 design/ferramentas/catalogar-videos.py validar
      Confere as fichas: campos obrigatórios, vocabulário e o que falta confirmar com o dono.
  python3 design/ferramentas/catalogar-videos.py planilha
      Gera design/videos/catalogo/catalogo.csv (um trecho por linha) para a planilha "Catálogo de vídeos".

Quem descreve: o Editor olha a folha de quadros e preenche a ficha em design/videos/catalogo/catalogo.json,
usando só o VOCABULÁRIO abaixo. Regras: descrever o que se vê ("2 adultos", "adulto com criança"), nunca
quem as pessoas são; o que não dá para saber pela imagem (qual acomodação, qual rio, qual passeio) vai
para "a_confirmar" até o dono responder. A chave de cada ficha é o ID do Drive: renomear o arquivo não quebra nada.
"""
import io, json, os, re, subprocess, sys, csv
from datetime import date
from PIL import Image, ImageDraw
import imageio_ffmpeg

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BRUTOS = os.path.join(RAIZ, "design/videos/brutos")
CAT = os.path.join(RAIZ, "design/videos/catalogo")
ARQ = os.path.join(CAT, "catalogo.json")
FF = imageio_ffmpeg.get_ffmpeg_exe()
MAX_TRECHO = 6.0   # segundos; plano contínuo (drone) é dividido em janelas deste tamanho
LIMIAR_CENA = 0.35  # sensibilidade da detecção de troca de cena (0 a 1)

# Vocabulário fechado (fatos de contexto/hotel-operacional.md). Novo termo só com o dono.
VOCAB = {
    "local_tipo": ["hotel", "passeio externo", "destino (cidade/região)"],
    "ambiente": ["interno", "externo", "aéreo (drone)", "subaquático"],
    "acomodacao": ["", "Cabana Casal", "Cabana Tripla", "Cabana Master", "Bangalô", "Bangalô Especial",
                   "Apartamento Conjugado", "Apartamento Superior", "Apartamento Standard", "a confirmar"],
    "area_hotel": ["", "piscina", "hidromassagem", "sauna", "academia", "salão de jogos", "redário", "quadra de areia",
                   "playground", "balneário", "restaurante/café", "recepção", "trilha", "deck do rio", "jardins/mata",
                   "estacionamento", "vista geral do hotel", "a confirmar"],
    "atividade": ["arco e flecha", "trilha", "tirolesa", "stand up paddle", "caiaque", "banho de rio", "boia cross",
                  "arvorismo", "flutuação", "ioga", "piscina", "hidromassagem", "café da manhã", "descanso/rede",
                  "observação de aves/fauna", "passeio externo", "nenhuma"],
    "pessoas": ["sem pessoas", "1 adulto", "2 adultos", "casal", "família com criança", "grupo de adultos",
                "crianças", "guia/equipe", "pessoas ao longe (sem rosto)"],
    "luz": ["amanhecer", "dia", "fim de tarde", "noite", "sombra/escuro"],
    "camera": ["drone", "câmera parada", "câmera em movimento", "celular na mão", "GoPro", "subaquática"],
    "uso_sugerido": ["gancho", "meio", "fecho", "fundo para texto", "não usar"],
    "qualidade": ["boa", "escura", "tremida", "fora de foco", "superexposta"],
    "dono_imagem": ["Hotel Cabanas", "produtora", "Ecotrip (agência)", "terceiro", "a confirmar"],
}


def carregar():
    if os.path.exists(ARQ):
        return json.load(open(ARQ, encoding="utf-8"))
    return {"atualizado_em": "", "videos": []}


def salvar(c):
    c["atualizado_em"] = date.today().isoformat()
    os.makedirs(CAT, exist_ok=True)
    json.dump(c, open(ARQ, "w", encoding="utf-8"), ensure_ascii=False, indent=2)


def info_tecnica(video):
    s = subprocess.run([FF, "-hide_banner", "-i", video], capture_output=True, text=True).stderr
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", s)
    dur = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    w, h = map(int, re.search(r"Video:.*?(\d{3,5})x(\d{3,5})", s).groups())
    rot = re.search(r"rotat(?:e|ion of)\s*:?\s*(-?[\d.]+)", s)
    if rot and abs(round(float(rot.group(1)))) % 180 == 90:
        w, h = h, w  # gravado na vertical (metadado de rotação)
    fps = re.search(r"([\d.]+) fps", s)
    data = re.search(r"creation_time\s*:\s*(\d{4}-\d{2}-\d{2})", s)
    return {"duracao_s": round(dur, 2), "resolucao": f"{w}x{h}",
            "orientacao": "vertical" if h > w else ("quadrado" if h == w else "horizontal"),
            "fps": round(float(fps.group(1))) if fps else None, "audio": "Audio:" in s,
            "data_gravacao": data.group(1) if data else ""}


def cortes(video, dur):
    """Trocas de cena (detecção do ffmpeg, em baixa resolução) + janelas de até MAX_TRECHO."""
    s = subprocess.run([FF, "-hide_banner", "-i", video, "-an", "-vf", f"scale=320:-2,select='gt(scene,{LIMIAR_CENA})',showinfo",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
    pts = sorted(float(t) for t in re.findall(r"pts_time:([\d.]+)", s) if 0.5 < float(t) < dur - 0.5)
    marcas = [0.0] + pts + [dur]
    trechos = []
    for a, b in zip(marcas, marcas[1:]):
        n = max(1, int((b - a) // MAX_TRECHO + (1 if (b - a) % MAX_TRECHO > 1.5 else 0)))
        passo = (b - a) / n
        trechos += [(round(a + i * passo, 1), round(a + (i + 1) * passo, 1)) for i in range(n)]
    return trechos, len(pts)


def quadro(video, t, alt=320):
    png = subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", video, "-frames:v", "1",
                          "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
    im = Image.open(io.BytesIO(png)).convert("RGB"); im.thumbnail((alt, alt))
    return im


def folha(video, trechos, saida):
    """Uma linha por trecho: 3 quadros (início, meio, fim) + rótulo T1, T2..."""
    linhas = []
    for i, (a, b) in enumerate(trechos, 1):
        qs = [quadro(video, t) for t in (a + 0.2, (a + b) / 2, max(a + 0.3, b - 0.3))]
        w, h = sum(q.width for q in qs) + 8 * 2 + 120, max(q.height for q in qs)
        lin = Image.new("RGB", (w, h), "white"); d = ImageDraw.Draw(lin)
        d.text((8, h // 2 - 16), f"T{i}", fill="black"); d.text((8, h // 2), f"{a:.1f}-{b:.1f}s", fill="black")
        x = 120
        for q in qs:
            lin.paste(q, (x, 0)); x += q.width + 8
        linhas.append(lin)
    W = max(l.width for l in linhas); H = sum(l.height + 8 for l in linhas)
    img = Image.new("RGB", (W, H), "white"); y = 0
    for l in linhas:
        img.paste(l, (0, y)); y += l.height + 8
    os.makedirs(os.path.dirname(saida), exist_ok=True)
    img.save(saida, quality=82)


def ficha_vazia(id_drive, arquivo, titulo):
    return {
        "id_drive": id_drive, "arquivo_local": arquivo, "titulo_drive": titulo, "nome_sugerido": "",
        "tecnico": {}, "origem": {"dono_imagem": "", "credito": ""},
        "local": {"tipo": "", "nome": "", "confirmado": False},
        "ambiente": [], "acomodacao": "", "area_hotel": [], "atividades": [], "pessoas": [],
        "criancas": False, "rostos_identificaveis": False, "luz": "", "camera": "", "qualidade": "",
        "descricao": "", "melhores_trechos": [], "trechos": [], "a_confirmar": [],
        "folha_quadros": "", "catalogado_em": "", "status": "a descrever",
    }


def preparar(id_drive, arquivo, titulo=""):
    video = arquivo if os.path.isabs(arquivo) or os.path.exists(arquivo) else os.path.join(BRUTOS, arquivo)
    c = carregar()
    f = next((v for v in c["videos"] if v["id_drive"] == id_drive), None)
    if not f:
        f = ficha_vazia(id_drive, os.path.relpath(video, RAIZ), titulo); c["videos"].append(f)
    f["tecnico"] = info_tecnica(video)
    trechos, n = cortes(video, f["tecnico"]["duracao_s"])
    antigos = {(t["ini"], t["fim"]): t for t in f["trechos"]}
    f["trechos"] = [antigos.get((a, b)) or {"id": f"T{i}", "ini": a, "fim": b, "descricao": "", "ambiente": "", "pessoas": "",
                                            "atividade": "", "uso_sugerido": [], "qualidade": ""}
                    for i, (a, b) in enumerate(trechos, 1)]
    nome = re.sub(r"[^\w.-]", "_", os.path.splitext(os.path.basename(video))[0])
    saida = os.path.join(CAT, "quadros", nome + ".jpg")
    folha(video, trechos, saida)
    f["folha_quadros"] = os.path.relpath(saida, RAIZ)
    salvar(c)
    print(json.dumps({"id_drive": id_drive, **f["tecnico"], "trocas_de_cena": n, "trechos": len(trechos),
                      "folha": f["folha_quadros"]}, ensure_ascii=False))


def validar():
    c, problemas = carregar(), 0
    for v in c["videos"]:
        erros = []
        for campo in ("descricao", "luz", "camera", "qualidade"):
            if not v.get(campo):
                erros.append(f"falta {campo}")
        checks = [("local_tipo", [v["local"]["tipo"]]), ("ambiente", v["ambiente"]), ("acomodacao", [v["acomodacao"]]),
                  ("area_hotel", v["area_hotel"]), ("atividade", v["atividades"]), ("pessoas", v["pessoas"]),
                  ("luz", [v["luz"]]), ("camera", [v["camera"]]), ("qualidade", [v["qualidade"]]),
                  ("dono_imagem", [v["origem"]["dono_imagem"]])]
        for t in v["trechos"]:
            checks += [("uso_sugerido", t["uso_sugerido"]), ("qualidade", [t["qualidade"]] if t["qualidade"] else [])]
            if not t["descricao"]:
                erros.append(f"{t['id']} sem descrição")
        for chave, valores in checks:
            erros += [f"'{x}' fora do vocabulário ({chave})" for x in valores if x and x not in VOCAB[chave]]
        if v["criancas"] or v["rostos_identificaveis"]:
            if not any("autoriza" in a.lower() for a in v["a_confirmar"]):
                erros.append("há criança ou rosto identificável: incluir a autorização de imagem em a_confirmar")
        if v["local"]["tipo"] != "hotel" and v["local"]["tipo"] and not v["origem"]["dono_imagem"]:
            erros.append("imagem de fora do hotel: informar o dono da imagem")
        status = "OK" if not erros else f"{len(erros)} pendência(s)"
        print(f"- {v['titulo_drive'] or v['id_drive']}: {status}")
        for e in erros:
            print(f"    · {e}")
        for a in v["a_confirmar"]:
            print(f"    ? a confirmar com o dono: {a}")
        problemas += len(erros)
    print(f"{len(c['videos'])} vídeo(s), {problemas} pendência(s).")
    return problemas


def planilha():
    c = carregar(); saida = os.path.join(CAT, "catalogo.csv")
    cols = ["id_drive", "titulo_drive", "nome_sugerido", "trecho", "ini_s", "fim_s", "descricao_trecho", "uso_sugerido",
            "local", "local_confirmado", "ambiente", "acomodacao", "area_hotel", "atividades", "pessoas", "criancas",
            "luz", "camera", "qualidade", "duracao_s", "resolucao", "orientacao", "data_gravacao", "dono_imagem",
            "a_confirmar", "link"]
    with open(saida, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh); w.writerow(cols)
        for v in c["videos"]:
            t0, j = v["tecnico"], lambda x: ", ".join(x) if isinstance(x, list) else x
            for t in v["trechos"]:
                w.writerow([v["id_drive"], v["titulo_drive"], v["nome_sugerido"], t["id"], t["ini"], t["fim"], t["descricao"],
                            j(t["uso_sugerido"]), f"{v['local']['tipo']}: {v['local']['nome']}", "sim" if v["local"]["confirmado"] else "não",
                            t["ambiente"] or j(v["ambiente"]), v["acomodacao"], j(v["area_hotel"]), t["atividade"] or j(v["atividades"]),
                            t["pessoas"] or j(v["pessoas"]), "sim" if v["criancas"] else "não", v["luz"], v["camera"], t["qualidade"] or v["qualidade"],
                            t0.get("duracao_s"), t0.get("resolucao"), t0.get("orientacao"), t0.get("data_gravacao"),
                            v["origem"]["dono_imagem"], " | ".join(v["a_confirmar"]),
                            f"https://drive.google.com/file/d/{v['id_drive']}/view"])
    print(f"OK: {os.path.relpath(saida, RAIZ)}")


def baixar(id_drive, arquivo):
    os.makedirs(BRUTOS, exist_ok=True); destino = os.path.join(BRUTOS, arquivo)
    subprocess.run(["curl", "-sS", "-L", "--fail", "-o", destino,
                    f"https://drive.usercontent.google.com/download?id={id_drive}&export=download&confirm=t"], check=True)
    with open(destino, "rb") as fh:
        if fh.read(15).lower().startswith(b"<!doctype html"):
            os.remove(destino)
            sys.exit("O Drive pediu login: deixe o arquivo com 'qualquer pessoa com o link' e tente de novo.")
    print(f"OK: {os.path.relpath(destino, RAIZ)} ({os.path.getsize(destino) / 1e6:.0f} MB)")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    if a[0] == "baixar":
        baixar(a[1], a[2])
    elif a[0] == "preparar":
        tit = a[a.index("--titulo") + 1] if "--titulo" in a else ""
        preparar(a[1], a[2], tit)
    elif a[0] == "validar":
        sys.exit(1 if validar() else 0)
    elif a[0] == "planilha":
        planilha()
    else:
        sys.exit(__doc__)
