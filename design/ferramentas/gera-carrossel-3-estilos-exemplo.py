import json,html,re,sys,subprocess
P="design/pecas/2026-10-instagram/POST-14"
T=json.load(open(sys.argv[1])); N=len(T)
pos={1:"center",2:"50% center",3:"40% center",4:"55% center",5:"50% center",6:"50% center"}
def md(t,so=False):
    h=html.escape(t.strip(),quote=False)
    if so: h=re.sub(r"\*\*(.+?)\*\*",r"\1",h); h=re.sub(r"\*(.+?)\*",r"\1",h)
    else: h=re.sub(r"\*\*(.+?)\*\*",r"<b>\1</b>",h); h=re.sub(r"\*(.+?)\*",r"<i>\1</i>",h)
    return h.replace("\\n","<br>").replace("\n","<br>")
LOGO='../../../../contexto/marca/logo-hotel-cabanas-branco.png'
for k in range(1,N+1):
    t=T[str(k)]; ti,ap=t["titulo"],html.escape(t["apoio"])
    num="" if k==1 else f'<span class="num-sf">{k}/{N}</span>'
    head=f'<!doctype html>\n<!-- POST-14 | Carrossel "5 motivos" (extra pedido pelo dono, 11/10) | tela {k}/{N} | Feed 3:4 -->\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<link rel="stylesheet" href="../../../modelos/marca.css">\n'
    sty=f'<style>.foto {{ object-position: {pos[k]}; }}</style>\n</head>\n<body>\n<div class="peca">\n  <img class="foto" src="foto-{k}.jpg" alt="">\n'
    open(f"{P}/peca-sem-faixa-{k}.html","w").write(head+'<link rel="stylesheet" href="carrossel-sem-faixa.css">\n'+sty+
      f'  <div class="sombra" style="left: -170px; top: 880px; width: 1150px; height: 460px; --forca: .7"></div>\n  <div class="sombra" style="left: 470px; top: 1200px; width: 760px; height: 330px; --forca: .55"></div>\n  <div class="sombra" style="left: 860px; top: 10px; width: 320px; height: 190px; --forca: .5"></div>\n  {num}\n  <div class="bloco-sf baixo">\n      <p class="apoio">{ap}</p>\n      <div class="linha"></div>\n      <h1 class="titulo">{md(ti)}</h1>\n  </div>\n  <div class="assin-sf">\n    <span class="fio"></span>\n    <span class="local">Bonito · MS</span>\n    <img src="{LOGO}" alt="Hotel Cabanas">\n  </div>\n</div>\n</body>\n</html>\n')
    open(f"{P}/peca-caixa-{k}.html","w").write(head+'<link rel="stylesheet" href="../../../modelos/estilo-caixa-central.css">\n'+sty+
      f'  <div class="sombra" style="left: 280px; top: 1030px; width: 520px; height: 110px; --forca: .5"></div>\n  <div class="sombra" style="left: 290px; top: 1215px; width: 500px; height: 250px; --forca: .5"></div>\n  <div class="sombra" style="left: 900px; top: 25px; width: 200px; height: 120px; --forca: .55"></div>\n  {num}\n  <div class="cc" style="--topo: 860px">\n    <div class="cc-caixa"><h1 class="titulo duas">{md(ti,True)}</h1></div>\n    <p class="cc-apoio">{ap}</p>\n  </div>\n  <div class="cc-selo base">\n    <img src="{LOGO}" alt="Hotel Cabanas">\n    <div class="local"><i class="fio"></i><span>Bonito · MS</span><i class="fio"></i></div>\n  </div>\n</div>\n</body>\n</html>\n')
    open(f"{P}/peca-{k}.html","w").write(head+'<link rel="stylesheet" href="carrossel-faixa.css">\n'+sty+
      f'  <div class="rodape faixa">\n    <div class="texto">\n      <p class="apoio">{ap}</p>\n      <div class="linha"></div>\n      <h1 class="titulo">{md(ti)}</h1>\n    </div>\n    <div class="marca">\n      <span class="num">{"" if k==1 else f"{k}/{N}"}</span>\n      <img src="{LOGO}" alt="Hotel Cabanas">\n      <span class="local">Bonito · MS</span>\n    </div>\n  </div>\n</div>\n</body>\n</html>\n')
    for arq,e in ((f"peca-sem-faixa-{k}.html",1),(f"peca-caixa-{k}.html",2),(f"peca-{k}.html",3)):
        subprocess.run(["node","design/ferramentas/renderizar.js",f"{P}/{arq}",f"{P}/estilos/estilo-{e}/POST-14-{k}.png","feed"],check=True,capture_output=True)
    subprocess.run(["cp",f"{P}/estilos/estilo-1/POST-14-{k}.png",f"{P}/final/"],check=True)
print("ok",N)
