"""Kit de subida MANUAL dos anúncios (plano B quando a API da Meta está travada).

Uso: python3 ferramentas/meta/kit_manual.py social/anuncios/2026-10-plano-de-midia
Gera <pasta>/kit-subida-manual.html: uma página com, para cada campanha, as configurações do
conjunto e, para cada anúncio, as miniaturas das artes (com o nome do arquivo na biblioteca de
mídia da conta), o texto principal, o título, a descrição e a mensagem do WhatsApp, com botão de
copiar. As artes 4:5 já estão na biblioteca de mídia da conta (enviadas em 28/09/2026).
Lê subida.json (estrutura aprovada) e textos.json (textos aprovados); não fala com a Meta.
"""
import base64, html, io, json, os, sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import subir_campanhas as s  # noqa: E402

LOCAL = {
    "brasil-sem-ms-pr": ("Brasil", "Excluir os estados Mato Grosso do Sul e Paraná"),
    "4-cidades-raio-40km": ("Umuarama, Cascavel, Maringá e Londrina (todas do PR), cada uma com raio de 40 km", ""),
    "engajou-365-dias": ("Brasil", ""),
    "cg-dourados-raio-40km": ("Campo Grande e Dourados (MS), cada uma com raio de 40 km", "Excluir Bonito (MS) com raio de 40 km"),
}
PUBLICOS = {
    "engajou-instagram-365": "Instagram: todos que interagiram com @hotelcabanasbonito nos últimos 365 dias",
    "engajou-facebook-365": "Página do Facebook: todos que interagiram com a Página Hotel Cabanas nos últimos 365 dias",
}


def miniatura(caminho):
    im = Image.open(caminho).convert("RGB")
    im.thumbnail((220, 275))
    b = io.BytesIO()
    im.save(b, "JPEG", quality=72)
    return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()


def campo(rotulo, valor, cid):
    v = html.escape(valor)
    return (f'<div class="campo"><div class="campo-top"><span class="rot">{rotulo}</span>'
            f'<button type="button" class="copiar" data-alvo="{cid}">Copiar</button></div>'
            f'<pre id="{cid}" class="valor">{v}</pre></div>')


def data_br(iso):
    a, m, d = iso.split("-")
    return f"{d}/{m}/{a}"


def main():
    pasta = sys.argv[1]
    cfg, tx, artes = s.carregar(pasta)
    registro = json.load(open(os.path.join(pasta, "subida-registro.json")))
    criadas = registro.get("campanhas", {})
    secoes, total_ads = [], 0
    for n, c in enumerate(cfg["campanhas"], 1):
        nome = f"{cfg['prefixo']}-{c['nome']}"
        existe = nome in criadas
        for cj in c["conjuntos"]:
            inc, exc = LOCAL[cj["nome"]]
            linhas = [("Nome da campanha", nome), ("Nome do conjunto", cj["nome"]),
                      ("Orçamento", f"R$ {cj['reais_dia']},00 por dia, no conjunto"),
                      ("Início", f"{data_br(cj['inicio'])}, 00:00"), ("Localização", inc)]
            if exc:
                linhas.append(("Excluir", exc))
            for p in cj.get("publicos", []):
                linhas.append(("Público personalizado", PUBLICOS[p]))
            linhas.append(("Idade", "18 a 65+ (sem interesses)"))
            conf = "".join(f"<tr><th>{html.escape(a)}</th><td>{html.escape(b)}</td></tr>" for a, b in linhas)
            estado = ('<span class="chip ok">Campanha e conjunto já criados</span>' if existe
                      else '<span class="chip novo">Criar campanha e conjunto</span>')
            cards = []
            for cod in cj["anuncios"]:
                total_ads += 1
                a = tx[cod]
                telas = s.telas(artes, cod)
                tipo = "Carrossel" if len(telas) > 1 else "Imagem única"
                figs = "".join(
                    f'<figure><img src="{miniatura(f)}" alt="{cod} tela {i}" width="110" height="138">'
                    f'<figcaption>{i}. {html.escape(os.path.basename(f))}</figcaption></figure>'
                    for i, (f, _st) in enumerate(telas, 1))
                obs = ("Título só no cartão 1; nos outros cartões pode deixar em branco." if len(telas) > 1 else "")
                cards.append(f'''
<article class="ad" id="ad-{cod}">
  <header class="ad-top">
    <label class="feito"><input type="checkbox" id="feito-{cod}" data-cod="{cod}"> Feito</label>
    <h3><span class="cod">{cod}</span> {html.escape(s.limpa(a["titulo"]))}</h3>
    <span class="tipo">{tipo} · {len(telas)} {"telas" if len(telas) > 1 else "tela"}</span>
  </header>
  <div class="telas">{figs}</div>
  <div class="campos">
    {campo("Nome do anúncio", cod, f"n-{cod}")}
    {campo("Texto principal", a["texto"].strip(), f"t-{cod}")}
    {campo("Título", s.limpa(a["titulo"]), f"h-{cod}")}
    {campo("Descrição", s.limpa(a["descricao"]), f"d-{cod}")}
    {campo("Mensagem preenchida do WhatsApp", s.limpa(a["mensagem"]), f"m-{cod}")}
  </div>
  {f'<p class="obs">{obs}</p>' if obs else ""}
</article>''')
            secoes.append(f'''
<section class="camp" id="camp-{n}">
  <div class="camp-top"><h2>{html.escape(c["nome"].replace("perm-", "").replace("-", " ").capitalize())}</h2>{estado}</div>
  <div class="tabela"><table>{conf}</table></div>
  <div class="ads">{"".join(cards)}</div>
</section>''')
    modelo = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "kit_manual_modelo.html"), encoding="utf-8").read()
    saida = modelo.replace("<!--SECOES-->", "".join(secoes)).replace("<!--TOTAL-->", str(total_ads))
    arq = os.path.join(pasta, "kit-subida-manual.html")
    open(arq, "w", encoding="utf-8").write(saida)
    print(f"{arq}: {total_ads} anúncios, {len(saida) // 1024} KB")


if __name__ == "__main__":
    main()
