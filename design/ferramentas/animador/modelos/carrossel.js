// Modelo "carrossel": telas paradas 3:4 (1080x1440) desenhadas a partir de config, para o construtor da Central
// (prévia) e para o Designer (PNG final com `animar.mjs <roteiro> <pasta> --png`). Cada "quadro" é uma tela.
// config: {capa: alto|meio|baixo, posicao: alto|meio|baixo, fonte: josefin|playfair, destaque: "#hex", tamanho: p|m|g,
//          fundo: nenhum|caixa|faixa, escurecer: 0–0.7, moldura: bool, numeracao: bool, seta: bool, logo: bool, final: bool}
// telas: [{foto, texto, destaque?, apoio?}] (a 1ª é a capa) · fecho: {linha1, linha2, foto?} · logo?: caminho do logo
const CARROSSEL_PADRAO = {capa: "meio", posicao: "baixo", fonte: "playfair", destaque: "#F58634", tamanho: "m", fundo: "nenhum",
  escurecer: 0.35, moldura: true, numeracao: true, seta: true, logo: true, final: true};

MODELOS["carrossel"] = (palco, r) => {
  const {el, CORES, sombra} = Anim;
  const c = {...CARROSSEL_PADRAO, ...(r.config || {})};
  const LOGO = r.logo || "recursos/logo.png";
  const play = c.fonte === "playfair";
  const fam = play ? "Playfair, 'Playfair Display', Georgia, serif" : "Josefin, 'Josefin Sans', sans-serif";
  const tam = {p: 58, m: 70, g: 88}[c.tamanho] || 70;
  const telas = [...r.telas];
  const total = telas.length + (c.final ? 1 : 0);
  const sombraTxt = c.fundo === "nenhum" ? sombra : "none";
  const POS = {alto: ["flex-start", "190px 90px 0"], meio: ["center", "0 90px"], baixo: ["flex-end", "0 90px 170px"]};

  const base = (src, escurecer) => {
    const s = el("div", {position: "absolute", inset: 0, overflow: "hidden", display: "none", background: CORES.escuro}, palco);
    const img = el("img", {width: "100%", height: "100%", objectFit: "cover", display: "block"}, s); img.src = src;
    const e = Anim.clamp(+escurecer, 0, 0.8);
    el("div", {position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(20,14,8,${e * 0.7}), rgba(20,14,8,${e * 0.15}) 40%, rgba(20,14,8,${e * 0.3}) 60%, rgba(20,14,8,${e * 1.5}))`}, s);
    if (c.moldura) el("div", {position: "absolute", inset: "34px", border: "2px solid rgba(247,241,230,.75)", pointerEvents: "none"}, s);
    return s;
  };
  const texto = (pai, t, pos, mult) => {
    const area = el("div", {position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: POS[pos][0], alignItems: "center", padding: POS[pos][1], boxSizing: "border-box"}, pai);
    const bloco = el("div", {display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", maxWidth: "100%", boxSizing: "border-box",
      ...(c.fundo === "caixa" ? {background: "rgba(132,112,89,.94)", padding: "30px 44px", borderRadius: "6px"} : {}),
      ...(c.fundo === "faixa" ? {background: "rgba(20,14,8,.62)", padding: "32px 70px", width: "calc(100% + 180px)"} : {})}, area);
    const linha = el("div", {display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 " + Math.round(tam * mult * 0.28) + "px"}, bloco);
    const dest = (t.destaque || "").toLowerCase().split(" ").filter(Boolean);
    t.texto.split(" ").forEach(p => el("span", {fontFamily: fam, fontWeight: play ? 500 : 600, fontStyle: play ? "italic" : "normal", textTransform: play ? "none" : "uppercase",
      letterSpacing: play ? "0" : ".05em", fontSize: Math.round(tam * mult) + "px", lineHeight: 1.15, color: dest.includes(p.toLowerCase()) ? c.destaque : CORES.creme, textShadow: sombraTxt}, linha, p));
    if (t.apoio) el("div", {marginTop: "18px", fontFamily: "Josefin, 'Josefin Sans', sans-serif", fontSize: Math.round(tam * 0.42) + "px", letterSpacing: ".08em", color: CORES.creme, textShadow: sombraTxt}, bloco, t.apoio);
  };

  const slides = telas.map((t, i) => {
    const s = base(t.foto, c.escurecer);
    if (i === 0 && c.logo) { const l = el("div", {position: "absolute", left: 0, right: 0, top: "80px", display: "flex", justifyContent: "center"}, s); el("img", {height: "96px", filter: "drop-shadow(0 2px 8px rgba(0,0,0,.4))"}, l).src = LOGO; }
    if (i > 0 && c.numeracao) el("div", {position: "absolute", right: "70px", top: "70px", fontFamily: "Josefin, 'Josefin Sans', sans-serif", fontWeight: 600, fontSize: "30px", letterSpacing: ".1em", color: CORES.creme, background: "rgba(20,14,8,.45)", padding: "8px 18px", borderRadius: "30px"}, s, `${i + 1}/${total}`);
    texto(s, t, i === 0 ? c.capa : c.posicao, i === 0 ? 1.35 : 1);
    if (i === 0 && c.seta && total > 1) el("div", {position: "absolute", right: "70px", bottom: "70px", fontFamily: "Josefin, 'Josefin Sans', sans-serif", fontWeight: 600, fontSize: "30px", letterSpacing: ".12em", color: CORES.creme, textShadow: sombra}, s, "ARRASTE →");
    return s;
  });
  if (c.final) {
    const s = base((r.fecho && r.fecho.foto) || telas[0].foto, 0.75);
    el("div", {position: "absolute", inset: 0, background: "rgba(20,14,8,.35)"}, s);
    const centro = el("div", {position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "36px"}, s);
    el("img", {height: "220px"}, centro).src = LOGO;
    el("div", {fontFamily: "Josefin, 'Josefin Sans', sans-serif", fontWeight: 600, fontSize: "36px", letterSpacing: ".3em", color: CORES.creme}, centro, (r.fecho && r.fecho.linha1) || "BONITO - MS");
    el("div", {fontFamily: "Playfair, 'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: "62px", color: c.destaque}, centro, (r.fecho && r.fecho.linha2) || "Reserve pelo link da bio");
    slides.push(s);
  }
  return {duracao: total, quadro: i => slides.forEach((s, k) => { s.style.display = k === i ? "block" : "none"; })};
};
