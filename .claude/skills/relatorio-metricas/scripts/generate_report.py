#!/usr/bin/env python3
"""
Gerador do Relatório de Métricas do Instagram — identidade visual do Hotel Cabanas.

Adaptado do modelo "instagram-metrics-report" do curso de social media com Claude
(estrutura e layout); paleta, fontes e textos trocados para a marca do Cabanas.

Uso:
    python generate_report.py dados.json saida.pdf

O ficheiro JSON descreve todas as métricas do mês. Ver references/data_schema.md
e references/exemplo_dados.json para o formato completo. Campos derivados
(índice de engajamento, ordenação por formato) são calculados automaticamente
quando não fornecidos.
"""
import sys, os, json, math

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ----------------------------------------------------------------------------
# Fontes
# ----------------------------------------------------------------------------
FONT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "fonts")

def _reg(name, file):
    pdfmetrics.registerFont(TTFont(name, os.path.join(FONT_DIR, file)))

_reg("Poppins", "JosefinSans-Regular.ttf")   # nomes internos mantidos; fontes da marca Cabanas
_reg("Poppins-Med", "JosefinSans-Regular.ttf")
_reg("Poppins-Semi", "JosefinSans-SemiBold.ttf")
_reg("Poppins-Bold", "JosefinSans-SemiBold.ttf")
_reg("Playfair", "PlayfairDisplay-Regular.ttf")
_reg("Playfair-Bold", "PlayfairDisplay-Bold.ttf")
_reg("Playfair-Black", "PlayfairDisplay-Bold.ttf")
_reg("Playfair-Italic", "PlayfairDisplay-Italic.ttf")
_reg("Sym", "Symbols.ttf")

# Caracteres que as fontes da marca não possuem → desenhados com a fonte Sym
_SYM_CHARS = set("→←↑↓↗↘✓✗•◦‹›≈")

# ----------------------------------------------------------------------------
# Paleta (Hotel Cabanas: contexto/marca/identidade.md)
# ----------------------------------------------------------------------------
def C(r, g, b):
    return (r / 255.0, g / 255.0, b / 255.0)

PLUM        = C(132, 112, 89)   # marrom madeira #847059 (cor principal)
PLUM_DARK   = C(110, 92, 72)
BROWN       = C(46, 36, 25)     # texto escuro
BROWN_CARD  = C(46, 36, 25)
CREAM       = C(247, 241, 230)  # creme #F7F1E6
CREAM2      = C(234, 225, 210)   # inner boxes / tracks
CREAM3      = C(240, 232, 219)
WHITE       = C(255, 255, 255)
LILAC       = C(144, 171, 73)   # verde folha #90AB49 (segunda cor dos gráficos)
LILAC_SOFT  = C(236, 226, 210)  # texto claro sobre o painel marrom
TRACK       = C(234, 225, 210)
GREEN       = C(144, 171, 73)
GREEN_TXT   = C(104, 128, 44)
GREEN_BOX   = C(234, 243, 234)
GREEN_BORD  = C(196, 219, 196)
RED         = C(211, 122, 122)
MUTED       = C(150, 134, 116)   # uppercase section labels
MUTED2      = C(166, 152, 136)
TEXT_SOFT   = C(120, 106, 90)
HAIRLINE    = C(206, 192, 178)
CARD_BORD   = C(222, 210, 194)

W, H = A4   # 595.27 x 841.89

# ----------------------------------------------------------------------------
# Helpers de desenho (coordenadas em "top-left": y cresce para baixo)
# ----------------------------------------------------------------------------
class Pen:
    def __init__(self, c):
        self.c = c

    def y(self, top):
        return H - top

    def rrect(self, x, top, w, h, r, fill=None, stroke=None, sw=1):
        c = self.c
        c.saveState()
        if fill:
            c.setFillColorRGB(*fill)
        if stroke:
            c.setStrokeColorRGB(*stroke)
            c.setLineWidth(sw)
        c.roundRect(x, self.y(top + h), w, h, r,
                    stroke=1 if stroke else 0, fill=1 if fill else 0)
        c.restoreState()

    def rect(self, x, top, w, h, fill=None, stroke=None, sw=1):
        c = self.c
        c.saveState()
        if fill:
            c.setFillColorRGB(*fill)
        if stroke:
            c.setStrokeColorRGB(*stroke); c.setLineWidth(sw)
        c.rect(x, self.y(top + h), w, h,
               stroke=1 if stroke else 0, fill=1 if fill else 0)
        c.restoreState()

    def line(self, x1, t1, x2, t2, color, w=1, dash=None):
        c = self.c
        c.saveState()
        c.setStrokeColorRGB(*color); c.setLineWidth(w)
        if dash:
            c.setDash(dash)
        c.line(x1, self.y(t1), x2, self.y(t2))
        c.restoreState()

    def _runs(self, s, font):
        """Divide a string em segmentos (texto, font) trocando para Sym nos glifos ausentes."""
        runs, cur, cur_sym = [], "", None
        for ch in s:
            is_sym = ch in _SYM_CHARS
            if is_sym != cur_sym and cur:
                runs.append((cur, "Sym" if cur_sym else font)); cur = ""
            cur += ch; cur_sym = is_sym
        if cur:
            runs.append((cur, "Sym" if cur_sym else font))
        return runs

    def _width(self, s, font, size, tracking=0):
        w = sum(pdfmetrics.stringWidth(t, f, size) for t, f in self._runs(s, font))
        return w + tracking * max(0, len(s) - 1)

    def text(self, x, top, s, font="Poppins", size=10, color=BROWN,
             align="l", tracking=0, baseline_from_top=True):
        c = self.c
        c.saveState()
        c.setFillColorRGB(*color)
        yy = self.y(top + size) if baseline_from_top else self.y(top)
        tw = self._width(s, font, size, tracking)
        if align == "c":
            cx = x - tw / 2
        elif align == "r":
            cx = x - tw
        else:
            cx = x
        to = c.beginText(cx, yy)
        if tracking:
            to.setCharSpace(tracking)
        for seg, f in self._runs(s, font):
            sz = size * (0.86 if f == "Sym" else 1.0)   # Sym tende a ser maior
            to.setFont(f, sz)
            to.textOut(seg)
        c.drawText(to)
        c.restoreState()

    def fit_size(self, s, font, size, maxw, minsize=5):
        """Devolve o maior tamanho <= size que faz a string caber em maxw."""
        sz = size
        while sz > minsize and self._width(s, font, sz) > maxw:
            sz -= 0.5
        return sz

    def fit(self, x, top, s, font, size, maxw, color=BROWN, align="l",
            minsize=5, tracking=0):
        """Desenha texto encolhendo o tamanho até caber em maxw (centrado no slot)."""
        sz = self.fit_size(s, font, size, maxw, minsize)
        self.text(x, top, s, font, sz, color=color, align=align, tracking=tracking)
        return sz

    def link(self, x, top, w, h, url):
        """Regista uma área clicável (URI) em coordenadas top-left."""
        if not url:
            return
        if not url.startswith(("http://", "https://")):
            url = "https://" + url.lstrip("@/")
        y0 = self.y(top + h)
        self.c.linkURL(url, (x, y0, x + w, y0 + h), relative=0, thickness=0)

    def donut(self, cx, cy_top, r_out, r_in, seg_pct, col_a, col_b,
              start=90):
        """Donut de 2 segmentos. seg_pct = fatia col_a (começa no topo)."""
        c = self.c
        cy = self.y(cy_top)
        bb = (cx - r_out, cy - r_out, cx + r_out, cy + r_out)
        def wedge(s, ext, color):
            c.saveState()
            c.setFillColorRGB(*color)
            p = c.beginPath()
            p.moveTo(cx, cy)
            p.arcTo(bb[0], bb[1], bb[2], bb[3], s, ext)
            p.close()
            c.drawPath(p, stroke=0, fill=1)
            c.restoreState()
        ext_a = -360 * (seg_pct / 100.0)   # sentido horário
        wedge(start, 360 - abs(ext_a) if False else ext_a, col_a)
        wedge(start + ext_a, -(360 - abs(ext_a)), col_b)
        # furo central
        c.saveState()
        c.setFillColorRGB(*WHITE)
        c.circle(cx, cy, r_in, stroke=0, fill=1)
        c.restoreState()

    def hbar(self, x, top, w, h, pct, fill, track=TRACK):
        self.rrect(x, top, w, h, h / 2, fill=track)
        fw = max(h, w * pct / 100.0)
        self.rrect(x, top, fw, h, h / 2, fill=fill)

    def dot(self, cx, cy_top, r, color):
        c = self.c
        c.saveState(); c.setFillColorRGB(*color)
        c.circle(cx, self.y(cy_top), r, stroke=0, fill=1)
        c.restoreState()


# ----------------------------------------------------------------------------
# Formatação numérica (pt-PT: . milhares , decimal)
# ----------------------------------------------------------------------------
def miles(n):
    try:
        return f"{int(round(n)):,}".replace(",", ".")
    except Exception:
        return str(n)

def signed(n):
    return ("+" if n >= 0 else "") + miles(n)

def compact(n):
    n = float(n)
    if n >= 1_000_000:
        return f"{n/1_000_000:.2f}".replace(".", ",") + "M"
    if n >= 1_000:
        return f"{n/1000:.1f}".replace(".", ",") + "K"
    return miles(n)

_EU2BR = {"acção": "ação", "actuais": "atuais", "actual": "atual",
          "Contacto": "Contato", "facto": "fato"}

def loc(data, s):
    """Adapta palavras de português europeu para brasileiro quando variante='pt-BR'."""
    if str(data.get("variante", "pt-BR")).lower() in ("pt-br", "br", "brasil"):
        for a, b in _EU2BR.items():
            s = s.replace(a, b)
    return s


def perfil_info(d):
    """Devolve (handle, url) a partir do campo 'perfil' (aceita @user ou URL)."""
    raw = str(d.get("perfil", "")).strip()
    if not raw:
        return None, None
    if raw.startswith("@"):
        slug = raw[1:].strip("/")
        return "@" + slug, "https://instagram.com/" + slug
    if "instagram.com" in raw:
        slug = raw.rstrip("/").split("/")[-1].split("?")[0]
        url = raw if raw.startswith("http") else "https://" + raw
        return ("@" + slug if slug else raw), url
    slug = raw.lstrip("@").strip("/")
    return "@" + slug, "https://instagram.com/" + slug


def header_handle(pen, d, x, top):
    """Desenha o @handle clicável (se houver perfil) e devolve a largura ocupada."""
    handle, url = perfil_info(d)
    if not handle:
        return 0
    hw = pen._width(handle, "Poppins-Semi", 7)
    pen.text(x, top, handle, "Poppins-Semi", 7, color=PLUM)
    pen.link(x, top - 1, hw, 11, url)
    return hw


def pct(x):
    s = f"{float(x):.1f}"
    if s.endswith(".0"):
        s = s[:-2]
    return s.replace(".", ",") + "%"


def parse_val(raw):
    """Aceita número (exacto) ou string '~35' (estimado). Devolve (float, aprox)."""
    if isinstance(raw, str):
        approx = raw.strip().startswith("~")
        return float(raw.replace("~", "").replace(",", ".").strip()), approx
    return float(raw), False


def disp_pct(raw):
    v, ap = parse_val(raw)
    return ("~" if ap else "") + pct(v)


# ============================================================================
# PÁGINA 1
# ============================================================================
def page1(c, d, pen):
    c.setFillColorRGB(*CREAM); c.rect(0, 0, W, H, fill=1, stroke=0)
    M = 40
    CW = W - 2 * M

    # --- Cabeçalho ---
    label = f"{d['cliente'].upper()} · INSTAGRAM"
    lw = pdfmetrics.stringWidth(label, "Poppins-Semi", 7) + 7 * 1.2 * (len(label) - 1) / len(label)
    pill_w = pdfmetrics.stringWidth(label, "Poppins-Semi", 7) + len(label) * 1.2 + 26
    pen.rrect(M, 38, pill_w, 17, 8.5, fill=PLUM)
    pen.text(M + 13, 43, label, "Poppins-Semi", 7, color=CREAM, tracking=1.2)
    header_handle(pen, d, M + pill_w + 12, 45)
    pen.text(M, 58, "Relatório de ", "Playfair-Black", 27, color=BROWN)
    rw = pdfmetrics.stringWidth("Relatório de ", "Playfair-Black", 27)
    pen.text(M + rw, 58, "Métricas", "Playfair-Italic", 27, color=PLUM)

    # caixa período (topo dir.)
    pb_w, pb_h = 92, 44
    pen.rrect(W - M - pb_w, 38, pb_w, pb_h, 8, fill=WHITE, stroke=CARD_BORD, sw=1)
    pen.text(W - M - pb_w / 2, 49, "P E R Í O D O", "Poppins-Semi", 6.5,
             color=MUTED, align="c", tracking=1.0)
    pen.text(W - M - pb_w / 2, 60, f"{d.get('periodo_dias',30)} dias",
             "Playfair", 15, color=BROWN, align="c")

    pen.line(M, 96, W - M, 96, HAIRLINE, 0.8)

    # --- Painel grande ameixa ---
    py, ph = 108, 86
    pen.rrect(M, py, CW, ph, 12, fill=PLUM)
    pen.text(M + 22, py + 15, "V I S U A L I Z A Ç Õ E S   T O T A I S",
             "Poppins-Semi", 7.5, color=LILAC_SOFT, tracking=1.4)
    pen.text(M + 22, py + 24, compact(d["views_total"]),
             "Playfair-Black", 38, color=WHITE)
    sub = (f"{pct(d['views_seg_pct'])} seguidores · {pct(d['views_nonseg_pct'])} "
           f"não-seguidores · {miles(d['publicacoes'])} publicações")
    pen.text(M + 23, py + 71, sub, "Poppins", 8, color=LILAC_SOFT)
    # mini boxes direita
    mb_w, mb_h = 132, 30
    mbx = W - M - 22 - mb_w
    pen.rrect(mbx, py + 14, mb_w, mb_h, 7, fill=C(110, 92, 72))
    pen.text(mbx + mb_w - 12, py + 19, "INTERAÇÕES", "Poppins-Semi", 6,
             color=LILAC_SOFT, align="r", tracking=0.8)
    pen.text(mbx + mb_w - 12, py + 28, miles(d["interacoes_total"]),
             "Playfair", 15, color=WHITE, align="r")
    pen.rrect(mbx, py + 48, mb_w, mb_h, 7, fill=C(110, 92, 72))
    pen.text(mbx + mb_w - 12, py + 52, "CONTAS ALCANÇADAS", "Poppins-Semi", 6,
             color=LILAC_SOFT, align="r", tracking=0.8)
    pen.text(mbx + mb_w - 12, py + 61, miles(d["contas_alcancadas"]),
             "Playfair", 15, color=WHITE, align="r")

    # --- 5 stat cards ---
    sy, sh = 208, 70
    gap = 9
    sw = (CW - 4 * gap) / 5
    cards = [
        ("VISUALIZAÇÕES", compact(d["views_total"]), d.get("periodo_views_curto", ""),
         BROWN, None, None),
        ("INTERAÇÕES", compact(d["interacoes_total"]),
         f"{int(d['inter_seg_pct'])}% seg · {int(d['inter_nonseg_pct'])}% não-seg",
         BROWN, None, None),
        ("NET FOLLOWERS", signed(d["net"]), None, GREEN_TXT,
         f"+{miles(d['follows'])} follows", f"-{miles(d['unfollows'])} unfollows"),
        ("NOVOS SEGUIDORES", miles(d["novos_seguidores"]),
         d.get("novos_seguidores_var", ""), GREEN_TXT, None, None),
        ("TOTAL SEGUIDORES", miles(d["total_seguidores"]),
         "conta verificada" if d.get("conta_verificada") else "", BROWN, None, None),
    ]
    for i, (lab, val, sub2, vcol, l2, l3) in enumerate(cards):
        x = M + i * (sw + gap)
        bottom_emph = (i == 4)
        pen.rrect(x, sy, sw, sh, 8, fill=WHITE, stroke=CARD_BORD, sw=1)
        if bottom_emph:
            pen.rrect(x, sy + sh - 3, sw, 3, 1.5, fill=BROWN)
        pen.text(x + 11, sy + 13, lab, "Poppins-Semi", 6, color=MUTED, tracking=0.5)
        pen.fit(x + 11, sy + 25, val, "Playfair", 17, sw - 22, color=vcol)
        yy = sy + 48
        if l2:
            pen.text(x + 11, yy, l2, "Poppins-Semi", 6.5, color=GREEN_TXT); yy += 9
            pen.text(x + 11, yy, l3, "Poppins-Semi", 6.5, color=RED)
        elif sub2:
            pen.text(x + 11, yy, sub2, "Poppins", 6, color=MUTED2)

    # --- Section: ALCANCE & ORIGEM ---
    section(pen, M, W, 300, "A L C A N C E   &   O R I G E M   D O   P Ú B L I C O")
    cy, chh = 318, 132
    cgap = 14
    ccw = (CW - cgap) / 2
    # card esquerda — Origem das Visualizações
    origem_card(pen, M, cy, ccw, chh, "Origem das Visualizações",
                f"Seguidores vs Não-Seguidores · {miles(d['views_total'])} views",
                compact(d["views_total"]) , "views",
                d["views_seg_pct"], d["views_nonseg_pct"],
                f"{miles(d['contas_alcancadas'])} contas alcançadas")
    # card direita — Origem das Interações
    origem_card(pen, M + ccw + cgap, cy, ccw, chh, "Origem das Interações",
                f"Seguidores vs Não-Seguidores · {miles(d['interacoes_total'])} interações",
                compact(d["interacoes_total"]), "interações",
                d["inter_seg_pct"], d["inter_nonseg_pct"],
                f"Alto engajamento externo ({int(d['inter_nonseg_pct'])}%)")

    # --- Section: VIEWS & INTERAÇÕES POR FORMATO ---
    section(pen, M, W, 452, "V I E W S   &   I N T E R A Ç Õ E S   P O R   F O R M A T O")
    fy, fhh = 470, 150
    vf = order_fmt(d["views_formato"])
    inf = order_fmt(d["inter_formato"])
    formato_card(pen, M, fy, ccw, fhh, "Views por Formato",
                 f"{vf[0][0]} lideram · {miles(d['views_total'])} views totais", vf)
    formato_card(pen, M + ccw + cgap, fy, ccw, fhh, "Interações por Formato",
                 f"{inf[0][0]} lideram · {miles(d['interacoes_total'])} interações totais", inf)

    # --- Section: CRESCIMENTO ---
    mes_ano = f"{d['mes_ref'][:3].upper()} {d['ano']}"
    section(pen, M, W, 636, f"C R E S C I M E N T O   D E   S E G U I D O R E S   ·   {mes_ano}")
    gy, ghh = 654, 150
    growth_card(pen, M, gy, ccw, ghh, d)
    base_card(pen, M + ccw + cgap, gy, ccw, ghh, d)

    # rodapé
    foot = (f"Views e Interações: {d.get('periodo_views','')} · "
            f"Seguidores: {d.get('periodo_seguidores','')}")
    pen.text(M, H - 24, foot, "Poppins", 6.5, color=MUTED2, baseline_from_top=False)


def section(pen, M, Wp, top, label):
    pen.text(M, top, label, "Poppins-Semi", 7, color=MUTED, tracking=1.2)
    lw = pdfmetrics.stringWidth(label.replace(" ", ""), "Poppins-Semi", 7) + label.count(" ") * 1.2 + 14
    pen.line(M + lw + 8, top + 4, Wp - M, top + 4, HAIRLINE, 0.6)


def origem_card(pen, x, top, w, h, title, subtitle, center_val, center_lab,
                seg_pct, nonseg_pct, badge):
    pen.rrect(x, top, w, h, 10, fill=WHITE, stroke=CARD_BORD, sw=1)
    pen.text(x + 18, top + 18, title, "Playfair", 14, color=BROWN)
    pen.text(x + 18, top + 33, subtitle, "Poppins", 6.8, color=MUTED2)
    # donut
    dcx, dcy = x + 50, top + 72
    pen.donut(dcx, dcy, 28, 19, seg_pct, PLUM, LILAC)
    pen.fit(dcx, dcy - 9, center_val, "Poppins-Semi", 8.5, 30, color=BROWN, align="c")
    pen.fit(dcx, dcy + 1, center_lab, "Poppins", 5.5, 30, color=MUTED2, align="c")
    # legenda
    lx = x + 100
    pen.dot(lx, top + 56, 3.2, PLUM)
    pen.text(lx + 9, top + 53, "Seguidores", "Poppins-Med", 8.5, color=BROWN)
    pen.text(x + w - 18, top + 52, pct(seg_pct), "Poppins-Bold", 12, color=BROWN, align="r")
    pen.dot(lx, top + 76, 3.2, LILAC)
    pen.text(lx + 9, top + 70, "Não-", "Poppins-Med", 8.5, color=BROWN)
    pen.text(lx + 9, top + 80, "seguidores", "Poppins-Med", 8.5, color=BROWN)
    pen.text(x + w - 18, top + 73, pct(nonseg_pct), "Poppins-Bold", 12, color=BROWN, align="r")
    # badge verde
    pen.rrect(x + 18, top + h - 24, w - 36, 16, 5, fill=GREEN_BOX, stroke=GREEN_BORD, sw=0.7)
    pen.text(x + 26, top + h - 20, "✓  " + badge, "Poppins-Med", 7, color=GREEN_TXT)


def order_fmt(dct):
    return sorted(dct.items(), key=lambda kv: parse_val(kv[1])[0], reverse=True)


def formato_card(pen, x, top, w, h, title, subtitle, items):
    pen.rrect(x, top, w, h, 10, fill=WHITE, stroke=CARD_BORD, sw=1)
    pen.text(x + 18, top + 18, title, "Playfair", 14, color=BROWN)
    pen.text(x + 18, top + 33, subtitle, "Poppins", 6.8, color=MUTED2)
    yy = top + 52
    for name, val in items:
        v, _ = parse_val(val)
        pen.text(x + 18, yy, name, "Poppins-Med", 8.5, color=BROWN)
        pen.text(x + w - 18, yy, disp_pct(val), "Poppins-Bold", 9.5,
                 color=BROWN, align="r")
        pen.hbar(x + 18, yy + 14, w - 36, 6, v, PLUM)
        yy += 31


def growth_card(pen, x, top, w, h, d):
    pen.rrect(x, top, w, h, 10, fill=WHITE, stroke=CARD_BORD, sw=1)
    pen.text(x + 18, top + 18, "Ganho vs. Perda de Seguidores", "Playfair", 14, color=BROWN)
    pen.text(x + 18, top + 33,
             f"Net: {signed(d['net'])} · Follows +{miles(d['follows'])} · Unfollows -{miles(d['unfollows'])}",
             "Poppins", 6.8, color=MUTED2)
    bars = [("FOLLOWS", d["follows"], GREEN, f"+{miles(d['follows'])}", GREEN_TXT),
            ("UNFOLLOWS", -d["unfollows"], RED, f"-{miles(d['unfollows'])}", RED),
            ("NET", d["net"], GREEN, signed(d["net"]), GREEN_TXT)]
    maxv = max(abs(b[1]) for b in bars) or 1
    base_y = top + h - 26
    col_w = (w - 60) / 3
    max_h = 56
    for i, (lab, val, col, vlab, vcol) in enumerate(bars):
        cx = x + 30 + i * col_w + col_w / 2
        bh = max(10, max_h * abs(val) / maxv)
        bw = 46
        pen.rrect(cx - bw / 2, base_y - bh, bw, bh, 5, fill=col)
        pen.text(cx, base_y - bh - 13, vlab, "Poppins-Bold", 12, color=vcol, align="c")
        pen.text(cx, base_y + 8, lab, "Poppins-Semi", 6, color=MUTED, align="c", tracking=0.5)


def base_card(pen, x, top, w, h, d):
    pen.rrect(x, top, w, h, 10, fill=WHITE, stroke=CARD_BORD, sw=1)
    pen.text(x + 18, top + 18, "Contexto da Base", "Playfair", 14, color=BROWN)
    pen.text(x + 18, top + 33, loc(d, "Dados actuais · conta verificada"), "Poppins", 6.8, color=MUTED2)
    bw = (w - 36 - 12) / 2
    bh = 42
    cells = [
        (miles(d["total_seguidores"]), PLUM, WHITE, "TOTAL SEGUIDORES"),
        (miles(d["contas_alcancadas"]), GREEN_BOX, GREEN_TXT, "ALCANCE", GREEN_BORD),
        (miles(d["publicacoes"]), CREAM2, BROWN, "PUBLICAÇÕES"),
        (signed(d["net"]), GREEN_BOX, GREEN_TXT, "NET", GREEN_BORD),
    ]
    positions = [(x + 18, top + 50), (x + 18 + bw + 12, top + 50),
                 (x + 18, top + 50 + bh + 10), (x + 18 + bw + 12, top + 50 + bh + 10)]
    for (cx, cy), cell in zip(positions, cells):
        val, bg, fg = cell[0], cell[1], cell[2]
        bord = cell[4] if len(cell) > 4 else None
        pen.rrect(cx, cy, bw, bh, 8, fill=bg, stroke=bord, sw=0.8)
        pen.fit(cx + bw / 2, cy + (bh - 19) / 2, val, "Playfair", 19, bw - 24,
                color=fg, align="c")


# ============================================================================
# PÁGINA 2
# ============================================================================
def page2(c, d, pen):
    c.setFillColorRGB(*CREAM); c.rect(0, 0, W, H, fill=1, stroke=0)
    M = 40
    CW = W - 2 * M

    # cabeçalho
    label = f"{d['cliente'].upper()} · INSTAGRAM"
    pill_w = pdfmetrics.stringWidth(label, "Poppins-Semi", 7) + len(label) * 1.2 + 26
    pen.rrect(M, 38, pill_w, 17, 8.5, fill=PLUM)
    pen.text(M + 13, 43, label, "Poppins-Semi", 7, color=CREAM, tracking=1.2)
    pen.text(W - M, 42, f"{d.get('periodo_views','')} · {d.get('periodo_dias',30)} dias",
             "Poppins", 7, color=MUTED2, align="r")
    pen.text(M, 60, "Relatório de Métricas", "Playfair-Italic", 13, color=PLUM)
    header_handle(pen, d, M + pen._width("Relatório de Métricas", "Playfair-Italic", 13) + 12, 64)
    pen.line(M, 84, W - M, 84, HAIRLINE, 0.8)

    # SECTION comparativo
    section(pen, M, W, 98, "C O M P A R A T I V O   S E G U I D O R E S   V S   N Ã O - S E G U I D O R E S")
    cy, chh = 114, 152
    pen.rrect(M, cy, CW, chh, 12, fill=WHITE, stroke=CARD_BORD, sw=1)
    pen.text(M + 24, cy + 20, "Origem do Público — Views & Interações", "Playfair", 14, color=BROWN)
    pen.text(M + 24, cy + 35, "Distribuição detalhada entre audiência própria e alcance externo",
             "Poppins", 6.8, color=MUTED2)

    half = (CW - 48) / 2 - 12
    stack_compare(pen, M + 24, cy + 50, half, f"Views — {miles(d['views_total'])}",
                  d["views_seg_pct"], d["views_nonseg_pct"])
    note_box(pen, M + 24, cy + 96, half, 52, "✓ ALCANCE EXPRESSIVO",
             f"{pct(d['views_nonseg_pct'])} das views chegam a não-seguidores — o conteúdo "
             f"está a alcançar novos públicos de forma consistente.")
    rx = M + 24 + half + 24
    pen.text(rx, cy + 46, f"Interações — {miles(d['interacoes_total'])}",
             "Poppins-Med", 8, color=BROWN)
    stack_compare(pen, rx, cy + 50, half, None,
                  d["inter_seg_pct"], d["inter_nonseg_pct"], show_title=False)
    note_box(pen, rx, cy + 96, half, 52, "✓ ENGAJAMENTO EXTERNO EXCEPCIONAL",
             f"{pct(d['inter_nonseg_pct'])} das interações de não-seguidores — resultado raro "
             f"e muito positivo, indica conteúdo com alto poder de conversão.")

    # SECTION desempenho por formato
    section(pen, M, W, 270, "D E S E M P E N H O   P O R   F O R M A T O")
    fy, fhh = 286, 126
    fgap = 14
    fcw = (CW - 2 * fgap) / 3
    vf = dict(d["views_formato"]); inf = dict(d["inter_formato"])
    perf = [
        ("Reels", "motor de interações ✓", PLUM, WHITE, LILAC_SOFT),
        ("Posts", "maior volume de views", BROWN_CARD, WHITE, C(190, 172, 150)),
        ("Stories", "fidelização da base", WHITE, BROWN, MUTED2),
    ]
    for i, (name, tag, bg, fg, sub) in enumerate(perf):
        x = M + i * (fcw + fgap)
        inner_dark = (bg != WHITE)
        pen.rrect(x, fy, fcw, fhh, 10, fill=bg,
                  stroke=None if inner_dark else CARD_BORD, sw=1)
        pen.text(x + 18, fy + 22, name, "Playfair", 16, color=fg)
        pen.text(x + 18, fy + 37, tag, "Poppins", 7, color=sub)
        ib = C(110, 92, 72) if name == "Reels" else (C(72, 58, 44) if name == "Posts" else CREAM)
        ibf = WHITE if inner_dark else BROWN
        pen.rrect(x + 14, fy + 49, fcw - 28, 33, 6, fill=ib,
                  stroke=None if inner_dark else CARD_BORD, sw=0.8)
        pen.text(x + 24, fy + 55, "VIEWS", "Poppins-Semi", 6, color=sub, tracking=0.8)
        pen.fit(x + 24, fy + 64, disp_pct(vf.get(name, 0)), "Playfair", 15, fcw - 52, color=ibf)
        pen.rrect(x + 14, fy + 86, fcw - 28, 33, 6, fill=ib,
                  stroke=None if inner_dark else CARD_BORD, sw=0.8)
        pen.text(x + 24, fy + 92, "INTERAÇÕES", "Poppins-Semi", 6, color=sub, tracking=0.8)
        pen.fit(x + 24, fy + 101, disp_pct(inf.get(name, 0)), "Playfair", 15, fcw - 52, color=ibf)

    # SECTION resumo comparativo (tabela índice)
    section(pen, M, W, 426, "R E S U M O   C O M P A R A T I V O   P O R   F O R M A T O")
    ty, thh = 442, 150
    pen.rrect(M, ty, CW, thh, 12, fill=WHITE, stroke=CARD_BORD, sw=1)
    pen.text(M + 24, ty + 20, "Views vs Interações — Índice de Engajamento por Formato",
             "Playfair", 14, color=BROWN)
    pen.text(M + 24, ty + 35,
             loc(d, "Índice = % Interações ÷ % Views · Acima de 1.0 indica alta conversão de alcance em acção"),
             "Poppins", 6.8, color=MUTED2)
    cols = [M + 42, M + CW * 0.42, M + CW * 0.66, W - M - 24]
    hy = ty + 52
    pen.text(cols[0], hy, "FORMATO", "Poppins-Semi", 6.5, color=MUTED, tracking=0.6)
    pen.text(cols[1], hy, "% VIEWS", "Poppins-Semi", 6.5, color=MUTED, align="c", tracking=0.6)
    pen.text(cols[2], hy, "% INTERAÇÕES", "Poppins-Semi", 6.5, color=MUTED, align="c", tracking=0.6)
    pen.text(cols[3], hy, "ÍNDICE ENG.", "Poppins-Semi", 6.5, color=MUTED, align="r", tracking=0.6)
    rows = []
    for name in set(list(vf) + list(inf)):
        v = parse_val(vf.get(name, 0))[0]; ii = parse_val(inf.get(name, 0))[0]
        idx = (ii / v) if v else 0
        rows.append((name, vf.get(name, 0), inf.get(name, 0), idx))
    rows.sort(key=lambda r: r[3], reverse=True)
    ry = hy + 22
    dotcols = {"Reels": PLUM, "Posts": BROWN_CARD, "Stories": LILAC}
    for name, v, ii, idx in rows:
        pen.line(M + 24, ry - 7, W - M - 24, ry - 7, C(232, 222, 208), 0.6)
        pen.dot(M + 30, ry + 3, 3, dotcols.get(name, PLUM))
        pen.text(cols[0], ry, name, "Poppins-Med", 8.5, color=BROWN)
        pen.text(cols[1], ry, disp_pct(v), "Poppins", 8.5, color=TEXT_SOFT, align="c")
        pen.text(cols[2], ry, disp_pct(ii), "Poppins", 8.5, color=TEXT_SOFT, align="c")
        pen.text(cols[3], ry, f"{idx:.2f}".replace(".", ",") + "×",
                 "Poppins-Bold", 11, color=PLUM, align="r")
        ry += 24
    top_idx = rows[0]
    pen.text(M + 24, ty + thh - 13,
             f"* {top_idx[0]} com índice {top_idx[3]:.2f}×".replace(".", ",")
             + f" — cada % de alcance de {top_idx[0]} gera {top_idx[3]:.2f}×".replace(".", ",")
             + " mais interações do que a média. Formato prioritário para crescimento.",
             "Poppins", 6.3, color=MUTED2)

    # destaques + recomendações
    by, bhh = 602, 158
    bgap = 14
    bcw = (CW - bgap) / 2
    bullets_box(pen, M, by, bcw, bhh, "✓ DESTAQUES DO PERÍODO",
                d.get("destaques", default_destaques(d)), GREEN_BOX, GREEN_BORD, GREEN_TXT)
    bullets_box(pen, M + bcw + bgap, by, bcw, bhh, "RECOMENDAÇÕES",
                d.get("recomendacoes", default_recomendacoes(d, rows)), CREAM3, CARD_BORD, PLUM)

    # rodapé
    pen.text(M, H - 24,
             f"Dados extraídos do Instagram Insights · Views/Interações: {d.get('periodo_views','')}",
             "Poppins", 6.5, color=MUTED2, baseline_from_top=False)
    pen.text(W - M, H - 24, f"{d['cliente']} · {d['mes_ref']} {d['ano']} · pág. 2 de {d['_npages']}",
             "Poppins-Semi", 6.5, color=PLUM, align="r", baseline_from_top=False)



def stack_compare(pen, x, top, w, title, seg, nonseg, show_title=True):
    if show_title and title:
        pen.text(x, top - 4, title, "Poppins-Med", 8, color=BROWN)
    by = top + 8
    bh = 22
    seg_w = w * seg / 100.0
    pen.rect(x, by, seg_w, bh, fill=PLUM)
    pen.rect(x + seg_w, by, w - seg_w, bh, fill=LILAC)
    pen.text(x + seg_w / 2, by + 7, pct(seg), "Poppins-Bold", 8.5, color=WHITE, align="c")
    pen.text(x + seg_w + (w - seg_w) / 2, by + 7, pct(nonseg),
             "Poppins-Bold", 8.5, color=PLUM, align="c")
    # legenda
    ly = by + bh + 8
    pen.rect(x, ly, 7, 7, fill=PLUM)
    pen.text(x + 11, ly - 1, "Seguidores", "Poppins", 7, color=BROWN)
    pen.rect(x + 70, ly, 7, 7, fill=LILAC)
    pen.text(x + 81, ly - 1, "Não-seg", "Poppins", 7, color=BROWN)


def note_box(pen, x, top, w, h, h_title, body):
    pen.rrect(x, top, w, h, 7, fill=GREEN_BOX, stroke=GREEN_BORD, sw=0.7)
    pen.text(x + 12, top + 9, h_title, "Poppins-Semi", 6.8, color=GREEN_TXT, tracking=0.5)
    wrap(pen, body, x + 12, top + 21, w - 24, "Poppins", 6.6, GREEN_TXT, 8.4, max_lines=4)


def bullets_box(pen, x, top, w, h, title, items, bg, bord, accent):
    pen.rrect(x, top, w, h, 10, fill=bg, stroke=bord, sw=0.8)
    pen.text(x + 18, top + 16, title, "Poppins-Semi", 7, color=accent, tracking=0.6)
    yy = top + 32
    for it in items:
        pen.text(x + 18, yy, "·", "Poppins-Bold", 8, color=accent)
        used = wrap(pen, it, x + 26, yy, w - 44, "Poppins", 6.6, TEXT_SOFT, 8.5,
                    bold_prefix=True, accent=accent)
        yy += used + 5


def wrap(pen, text, x, top, w, font, size, color, leading, bold_prefix=False,
         accent=None, max_lines=None):
    words = text.split(" ")
    lines, cur = [], ""
    for wd in words:
        t = (cur + " " + wd).strip()
        if pdfmetrics.stringWidth(t, font, size) <= w:
            cur = t
        else:
            lines.append(cur); cur = wd
    if cur:
        lines.append(cur)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        last = lines[-1]
        while last and pdfmetrics.stringWidth(last + "…", font, size) > w:
            last = last[:-1]
        lines[-1] = last.rstrip() + "…"
    yy = top
    for ln in lines:
        pen.text(x, yy, ln, font, size, color=color)
        yy += leading
    return (len(lines) * leading)


def default_destaques(d):
    return [
        f"{compact(d['views_total'])} de views em 30 dias — volume de escala de grande conta.",
        f"{miles(d['interacoes_total'])} interações com {int(d['inter_nonseg_pct'])}% de não-seguidores — engajamento externo excepcional.",
        f"Net de {signed(d['net'])} seguidores com {miles(d['follows'])} follows — crescimento orgânico sólido.",
        f"{miles(d['contas_alcancadas'])} contas alcançadas — alcance quase dobra a base de seguidores.",
    ]


def default_recomendacoes(d, rows):
    top = rows[0]
    out = [
        f"{top[0]} com índice {top[3]:.2f}×".replace(".", ",") + " — formato prioritário, manter e aumentar cadência.",
    ]
    vf = order_fmt(d["views_formato"])
    out.append(f"{vf[0][0]} lideram em views ({disp_pct(vf[0][1])}) — forte para alcance e visibilidade geral.")
    low = rows[-1]
    out.append(f"{low[0]} com índice {low[3]:.2f}×".replace(".", ",") + " — usar como ferramenta de relacionamento com a base, não para alcance.")
    if d.get("contas_alcancadas_var"):
        out.append(f"Contas alcançadas ({d['contas_alcancadas_var']}) — monitorar tendência e avaliar diversificação de formatos.")
    return out


# ============================================================================
# PÁGINA 3 — TOP 5 CONTEÚDOS
# ============================================================================
FMT_BADGE = {"Reels": PLUM, "Post": BROWN_CARD, "Posts": BROWN_CARD,
             "Carrossel": PLUM_DARK, "Stories": LILAC, "Story": LILAC}

def page_top5(c, d, pen):
    c.setFillColorRGB(*CREAM); c.rect(0, 0, W, H, fill=1, stroke=0)
    M = 40
    CW = W - 2 * M
    label = f"{d['cliente'].upper()} · INSTAGRAM"
    pill_w = pdfmetrics.stringWidth(label, "Poppins-Semi", 7) + len(label) * 1.2 + 26
    pen.rrect(M, 38, pill_w, 17, 8.5, fill=PLUM)
    pen.text(M + 13, 43, label, "Poppins-Semi", 7, color=CREAM, tracking=1.2)
    pen.text(W - M, 42, f"{d.get('periodo_views','')} · {d.get('periodo_dias',30)} dias",
             "Poppins", 7, color=MUTED2, align="r")
    pen.text(M, 60, "Relatório de Métricas", "Playfair-Italic", 13, color=PLUM)
    header_handle(pen, d, M + pen._width("Relatório de Métricas", "Playfair-Italic", 13) + 12, 64)
    pen.line(M, 84, W - M, 84, HAIRLINE, 0.8)

    section(pen, M, W, 100, "T O P   5   C O N T E Ú D O S   D O   M Ê S")
    top5 = d.get("top5", [])[:5]

    # painel intro
    py = 118
    pen.rrect(M, py, CW, 50, 12, fill=PLUM)
    pen.text(M + 22, py + 16, "OS CONTEÚDOS QUE MAIS PERFORMARAM", "Poppins-Semi", 8,
             color=LILAC_SOFT, tracking=1.0)
    pen.text(M + 22, py + 28, "Ranking por visualizações do período",
             "Poppins", 8, color=LILAC_SOFT)
    pen.text(W - M - 22, py + 22, f"{len(top5)} destaques",
             "Playfair", 18, color=WHITE, align="r")

    cy = 180
    ch = 96
    cgap = 8
    for i, item in enumerate(top5):
        top = cy + i * (ch + cgap)
        rank_card(pen, M, top, CW, ch, i + 1, item)

    # nota metodológica
    if top5:
        ny = cy + len(top5) * (ch + cgap) + 6
        pen.rrect(M, ny, CW, 34, 8, fill=CREAM3, stroke=CARD_BORD, sw=0.8)
        pen.text(M + 16, ny + 12, "COMO LER", "Poppins-Semi", 6.5, color=PLUM, tracking=0.8)
        pen.text(M + 16, ny + 22,
                 "Ranking com base nas métricas de cada publicação no período. "
                 "Reaproveitar os formatos e temas vencedores nas próximas semanas.",
                 "Poppins", 7, color=TEXT_SOFT)

    pen.text(M, H - 24,
             "Dados extraídos do Instagram Insights · Conteúdo principal do período",
             "Poppins", 6.5, color=MUTED2, baseline_from_top=False)
    pen.text(W - M, H - 24, f"{d['cliente']} · {d['mes_ref']} {d['ano']} · pág. 3 de {d['_npages']}",
             "Poppins-Semi", 6.5, color=PLUM, align="r", baseline_from_top=False)


def rank_card(pen, x, top, w, h, rank, item):
    pen.rrect(x, top, w, h, 10, fill=WHITE, stroke=CARD_BORD, sw=1)
    # selo de ranking
    pen.rrect(x + 14, top + 14, 60, h - 28, 8, fill=PLUM)
    pen.text(x + 44, top + h / 2 - 18, f"{rank}", "Playfair-Black", 30, color=WHITE, align="c")
    pen.text(x + 44, top + h - 26, "LUGAR", "Poppins-Semi", 5.5, color=LILAC_SOFT,
             align="c", tracking=1.0)

    bx = x + 90
    link_url = item.get("link", "")

    # --- zona de métricas: GRELHA FIXA (mesmas posições em todos os cartões) ---
    metrics = item.get("metricas", [])[:3]
    NCOLS = 3
    colw = 66
    zone_right = x + w - 18
    zone_left = zone_right - NCOLS * colw
    k = len(metrics)
    start = NCOLS - k  # encosta à direita se houver menos de 3 métricas
    occupied_left = zone_left + start * colw  # início da 1ª coluna realmente usada
    for j, m in enumerate(metrics):
        col = start + j
        center = zone_left + col * colw + colw / 2
        val = str(m.get("valor", ""))
        lab = m.get("label", "").upper()
        pen.fit(center, top + 28, val, "Playfair", 14, colw - 8, color=PLUM, align="c")
        pen.fit(center, top + 46, lab, "Poppins-Semi", 5.5, colw - 6,
                color=MUTED, align="c", tracking=0.3)

    # --- título + badge de formato ---
    fmt = item.get("formato", "Post")
    badge_col = FMT_BADGE.get(fmt, PLUM)
    fw = pen._width(fmt.upper(), "Poppins-Semi", 6) + 14
    pen.rrect(bx, top + 15, fw, 13, 6.5, fill=badge_col)
    pen.text(bx + 7, top + 18, fmt.upper(), "Poppins-Semi", 6, color=WHITE, tracking=0.5)
    title_x = bx + fw + 8
    title_right = (occupied_left - 14) if metrics else (x + w - 18)
    title_maxw = max(40, title_right - title_x)
    titulo = item.get("titulo", "—")
    pen.text(title_x, top + 17, _ellipsis(titulo, "Playfair", 12, title_maxw),
             "Playfair", 12, color=BROWN)

    # --- observação (até 2 linhas, contida na zona do texto) ---
    body_maxw = max(60, title_right - bx)
    obs = item.get("obs", "")
    if obs:
        wrap(pen, obs, bx, top + 37, body_maxw, "Poppins", 7, TEXT_SOFT, 9, max_lines=2)

    # --- link do post (clicável) ---
    if link_url:
        lt = "Ver publicação  →"
        ly = top + h - 18
        pen.text(bx, ly, lt, "Poppins-Semi", 7, color=PLUM)
        pen.link(x, top, w, h, link_url)


def _ellipsis(s, font, size, maxw):
    if pdfmetrics.stringWidth(s, font, size) <= maxw:
        return s
    while s and pdfmetrics.stringWidth(s + "…", font, size) > maxw:
        s = s[:-1]
    return s + "…"


# ============================================================================
def build(data, out_path):
    npages = 2 + (1 if data.get("top5") else 0)
    data["_npages"] = npages
    c = canvas.Canvas(out_path, pagesize=A4)
    pen = Pen(c)
    page1(c, data, pen); c.showPage()
    page2(c, data, pen); c.showPage()
    if data.get("top5"):
        page_top5(c, data, pen); c.showPage()
    c.save()
    print("PDF gerado:", out_path, f"({npages} páginas)")


def main():
    if len(sys.argv) < 3:
        print("Uso: python generate_report.py dados.json saida.pdf"); sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        data = json.load(f)
    build(data, sys.argv[2])


if __name__ == "__main__":
    main()
