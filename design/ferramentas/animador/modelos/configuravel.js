// Modelo "configurável": o mesmo motor serve a qualquer modelo criado pelo dono no construtor da Central
// (aba Modelos → "+ Criar modelo novo"). A aparência vem de roteiro.config; o conteúdo, de roteiro.telas.
// config: {entrada: palavra|linha|maquina|surgir, destaque: "#hex", posicao: baixo|meio|alto, tamanho: p|m|g,
//          fonte: josefin|playfair, fundo: nenhum|faixa|caixa, movimento: zoom|deslize|parado|alternar,
//          segundos: 1.2–3.5, transicao: fusao|corte, escurecer: 0–0.7, selo: bool, fecho: bool}
// telas: [{foto, texto, destaque?, apoio?}] · fecho: {linha1, linha2, foto?} · logo?: caminho do logo
const CONFIG_PADRAO = {entrada: "palavra", destaque: "#F58634", posicao: "baixo", tamanho: "m", fonte: "josefin", fundo: "nenhum",
  movimento: "alternar", segundos: 2.4, transicao: "fusao", escurecer: 0.35, selo: true, fecho: true};

MODELOS["configuravel"] = (palco, r, {fps}) => {
  const {interp, spring, ease, el, CORES, sombra} = Anim;
  const c = {...CONFIG_PADRAO, ...(r.config || {})};
  const LOGO = r.logo || "recursos/logo.png";
  const FUS = c.transicao === "corte" ? 0 : 10, durTela = Math.round(Anim.clamp(+c.segundos || 2.4, 1, 4) * fps);
  const FECHO = c.fecho === false ? 0 : 90, total = r.telas.length * durTela + FECHO;
  const fam = c.fonte === "playfair" ? "Playfair, 'Playfair Display', Georgia, serif" : "Josefin, 'Josefin Sans', sans-serif";
  const tam = {p: 54, m: 66, g: 84}[c.tamanho] || 66;
  const estiloPalavra = {fontFamily: fam, fontWeight: c.fonte === "playfair" ? 500 : 600, fontStyle: c.fonte === "playfair" ? "italic" : "normal",
    fontSize: tam + "px", letterSpacing: c.fonte === "playfair" ? "0" : ".06em", textTransform: c.fonte === "playfair" ? "none" : "uppercase",
    lineHeight: 1.22, color: CORES.creme, textShadow: c.fundo === "nenhum" ? sombra : "none", display: "inline-block"};
  const movimentos = ["zoom", "esquerda", "direita"];

  const foto = (pai, src) => {
    const box = el("div", {position: "absolute", inset: 0, overflow: "hidden"}, pai);
    const img = el("img", {width: "100%", height: "100%", objectFit: "cover", display: "block", willChange: "transform"}, box); img.src = src;
    const e = Anim.clamp(+c.escurecer, 0, 0.7);
    el("div", {position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(20,14,8,${e * 0.6}), rgba(20,14,8,0) 30%, rgba(20,14,8,${e * 0.2}) 50%, rgba(20,14,8,${e * 1.6}))`}, box);
    return (f, dur, mov) => {
      if (mov === "parado") { img.style.transform = "scale(1.02)"; return; }
      const t = interp(f, [0, dur], [0, 1], ease.inOutQuad);
      const esc = mov === "zoom" ? 1 + 0.08 * t : 1.08;
      const x = mov === "esquerda" ? 6 - 12 * t : mov === "direita" ? -6 + 12 * t : 0;
      img.style.transform = `scale(${esc}) translateX(${x}%)`;
    };
  };

  const telas = r.telas.map((t, i) => {
    const camada = el("div", {position: "absolute", inset: 0, display: "none"}, palco);
    const mexe = foto(camada, t.foto);
    const mov = c.movimento === "alternar" ? movimentos[i % 3] : c.movimento === "deslize" ? (i % 2 ? "direita" : "esquerda") : c.movimento;
    if (c.selo) { const s = el("div", {position: "absolute", left: 0, right: 0, top: "260px", display: "flex", justifyContent: "center"}, camada); el("img", {height: "96px", filter: "drop-shadow(0 2px 8px rgba(0,0,0,.4))"}, s).src = LOGO; }
    const pos = {baixo: ["flex-end", "0 80px 340px"], meio: ["center", "0 80px"], alto: ["flex-start", "430px 80px 0"]}[c.posicao] || ["flex-end", "0 80px 340px"];
    const area = el("div", {position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: pos[0], alignItems: "center", padding: pos[1], boxSizing: "border-box"}, camada);
    const bloco = el("div", {display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxSizing: "border-box",
      ...(c.fundo === "caixa" ? {background: "rgba(132,112,89,.94)", padding: "26px 38px", borderRadius: "6px"} : {}),
      ...(c.fundo === "faixa" ? {background: "rgba(20,14,8,.62)", padding: "28px 60px", width: "calc(100% + 160px)"} : {})}, area);
    const linha = el("div", {display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 " + Math.round(tam * 0.3) + "px"}, bloco);
    const dest = (t.destaque || "").toLowerCase().split(" ").filter(Boolean);
    const palavras = t.texto.split(" ").map(p => el("span", {...estiloPalavra, color: dest.includes(p.toLowerCase()) ? c.destaque : CORES.creme, opacity: 0}, linha, p));
    // máquina de escrever: cada letra num <span> para revelar sem mexer no layout
    const letras = c.entrada === "maquina" ? palavras.flatMap(s => { const txt = s.textContent; s.textContent = ""; s.style.opacity = 1; return [...txt].map(ch => el("span", {opacity: 0}, s, ch)); }) : [];
    const apoio = t.apoio ? el("div", {marginTop: "16px", fontFamily: "Playfair, 'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: Math.round(tam * 0.58) + "px", color: CORES.creme, textShadow: c.fundo === "nenhum" ? sombra : "none", opacity: 0}, bloco, t.apoio) : null;
    const de = i * durTela;
    return f => {
      const lf = f - de, ativa = lf >= 0 && lf < durTela + FUS;
      camada.style.display = ativa ? "block" : "none"; if (!ativa) return;
      camada.style.opacity = i === 0 || !FUS ? 1 : interp(lf, [0, FUS], [0, 1]);
      mexe(lf, durTela + FUS, mov);
      const t0 = FUS || 4;
      if (c.entrada === "maquina") letras.forEach((s, k) => { s.style.opacity = lf - t0 >= k * (fps / 24) ? 1 : 0; });
      else if (c.entrada === "linha") { const v = spring(lf - t0, fps, {damping: 16, stiffness: 110}); palavras.forEach(s => { s.style.opacity = Math.min(1, v); s.style.transform = `translateY(${(1 - v) * 50}px)`; }); }
      else palavras.forEach((s, k) => {
        const v = spring(lf - t0 - k * 4, fps, c.entrada === "surgir" ? {damping: 11, stiffness: 160} : {damping: 14, stiffness: 120});
        s.style.opacity = Math.min(1, v);
        s.style.transform = c.entrada === "surgir" ? `scale(${0.55 + 0.45 * v})` : `translateY(${(1 - v) * 40}px)`;
      });
      if (apoio) apoio.style.opacity = interp(lf, [t0 + 18, t0 + 28], [0, 1]);
    };
  });

  let fecho = () => {};
  if (FECHO) {
    const fc = el("div", {position: "absolute", inset: 0, display: "none"}, palco);
    const mexeF = foto(fc, (r.fecho && r.fecho.foto) || r.telas[0].foto);
    el("div", {position: "absolute", inset: 0, background: "rgba(20,14,8,.55)"}, fc);
    const centro = el("div", {position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "40px"}, fc);
    const logo = el("img", {height: "230px"}, centro); logo.src = LOGO;
    const l1 = el("div", {fontFamily: "Josefin, 'Josefin Sans', sans-serif", fontWeight: 600, fontSize: "38px", letterSpacing: ".3em", color: CORES.creme}, centro, (r.fecho && r.fecho.linha1) || "BONITO - MS");
    const l2 = el("div", {fontFamily: "Playfair, 'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: "64px", color: c.destaque}, centro, (r.fecho && r.fecho.linha2) || "Reserve pelo link da bio");
    const ini = r.telas.length * durTela;
    fecho = f => {
      const lf = f - ini; fc.style.display = lf >= 0 ? "block" : "none"; if (lf < 0) return;
      fc.style.opacity = FUS ? interp(lf, [0, FUS], [0, 1]) : 1; mexeF(lf, FECHO, "zoom");
      const s = spring(lf - 6, fps, {damping: 16});
      logo.style.opacity = l1.style.opacity = Math.min(1, s); logo.style.transform = `scale(${0.9 + 0.1 * s})`;
      const v2 = interp(lf, [24, 38], [0, 1]); l2.style.opacity = v2; l2.style.transform = `translateY(${(1 - v2) * 20}px)`;
    };
  }
  return {duracao: total, quadro: f => { telas.forEach(q => q(f)); fecho(f); }};
};
