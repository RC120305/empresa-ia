// Modelo "Copy que acende": foto com movimento lento + copy palavra por palavra (palavra de destaque em laranja),
// contador opcional, selo do logo no alto e fecho com logo + chamada. Campos do roteiro:
// {segundosPorTela, fusao (quadros), fechoSeg, telas:[{foto, texto, destaque?, apoio?, contador?:{de, ate, sufixo}, mover?: zoom|esquerda|direita}],
//  fecho:{linha1, linha2, foto?}}
MODELOS["copy-que-acende"] = (palco, r, {fps}) => {
  const {interp, spring, ease, el, CORES, sombra} = Anim;
  const FUS = r.fusao ?? 10, durTela = Math.round((r.segundosPorTela ?? 2.4) * fps), FECHO = Math.round((r.fechoSeg ?? 3) * fps);
  const total = r.telas.length * durTela + FECHO;

  const foto = (pai, src) => {
    const box = el("div", {position: "absolute", inset: 0, overflow: "hidden"}, pai);
    const img = el("img", {width: "100%", height: "100%", objectFit: "cover", display: "block", willChange: "transform"}, box); img.src = src;
    el("div", {position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(20,14,8,.25), rgba(20,14,8,0) 30%, rgba(20,14,8,.05) 50%, rgba(20,14,8,.65))"}, box);
    return (f, dur, mover = "zoom") => {
      const t = interp(f, [0, dur], [0, 1], ease.inOutQuad);
      const esc = mover === "zoom" ? 1 + 0.08 * t : 1.08;
      const x = mover === "esquerda" ? 6 - 12 * t : mover === "direita" ? -6 + 12 * t : 0;
      img.style.transform = `scale(${esc}) translateX(${x}%)`;
    };
  };

  const telas = r.telas.map((t, i) => {
    const camada = el("div", {position: "absolute", inset: 0, opacity: 0}, palco);
    const mexe = foto(camada, t.foto);
    const selo = el("div", {position: "absolute", left: 0, right: 0, top: "150px", display: "flex", justifyContent: "center"}, camada);
    el("img", {height: "110px", filter: "drop-shadow(0 2px 8px rgba(0,0,0,.4))"}, selo).src = "recursos/logo.png";
    const copy = el("div", {position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", padding: "0 90px 330px", boxSizing: "border-box"}, camada);
    const cont = t.contador ? el("div", {fontFamily: "Josefin", fontWeight: 600, fontSize: "150px", color: CORES.creme, textShadow: sombra, lineHeight: 1, marginBottom: "10px"}, copy) : null;
    const linha = el("div", {display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 20px", textAlign: "center"}, copy);
    const dest = (t.destaque || "").toUpperCase().split(" ").filter(Boolean);
    const palavras = t.texto.toUpperCase().split(" ").map(p => el("span", {fontFamily: "Josefin", fontWeight: 600, fontSize: "64px", letterSpacing: ".06em", lineHeight: 1.25, color: dest.includes(p) ? CORES.laranja : CORES.creme, textShadow: sombra, display: "inline-block", opacity: 0}, linha, p));
    const apoio = t.apoio ? el("div", {marginTop: "18px", fontFamily: "Playfair", fontStyle: "italic", fontSize: "40px", color: CORES.creme, textShadow: sombra, opacity: 0, textAlign: "center"}, copy, t.apoio) : null;
    const de = i * durTela;
    return f => {
      const lf = f - de, ativa = lf >= 0 && lf < durTela + FUS;
      camada.style.display = ativa ? "block" : "none"; if (!ativa) return;
      camada.style.opacity = i === 0 ? 1 : interp(lf, [0, FUS], [0, 1]);
      mexe(lf, durTela + FUS, t.mover);
      palavras.forEach((s, k) => { const v = spring(lf - FUS - k * 4, fps, {damping: 14, stiffness: 120}); s.style.opacity = Math.min(1, v); s.style.transform = `translateY(${(1 - v) * 40}px)`; });
      if (cont) cont.innerHTML = `${Math.round(interp(lf, [FUS, FUS + 24], [t.contador.de, t.contador.ate], ease.outCubic))}<span style="font-size:70px">${t.contador.sufixo}</span>`;
      if (apoio) apoio.style.opacity = interp(lf, [FUS + 18, FUS + 28], [0, 1]);
    };
  });

  const fc = el("div", {position: "absolute", inset: 0, opacity: 0, display: "none"}, palco);
  const mexeF = foto(fc, r.fecho.foto || r.telas[0].foto);
  el("div", {position: "absolute", inset: 0, background: "rgba(20,14,8,.55)"}, fc);
  const centro = el("div", {position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "40px"}, fc);
  const logo = el("img", {height: "230px"}, centro); logo.src = "recursos/logo.png";
  const l1 = el("div", {fontFamily: "Josefin", fontWeight: 600, fontSize: "38px", letterSpacing: ".3em", color: CORES.creme}, centro, r.fecho.linha1);
  const l2 = el("div", {fontFamily: "Playfair", fontStyle: "italic", fontSize: "64px", color: CORES.creme}, centro, r.fecho.linha2);
  const iniF = r.telas.length * durTela;
  const fecho = f => {
    const lf = f - iniF; fc.style.display = lf >= 0 ? "block" : "none"; if (lf < 0) return;
    fc.style.opacity = interp(lf, [0, FUS], [0, 1]); mexeF(lf, FECHO, "zoom");
    const s = spring(lf - 6, fps, {damping: 16});
    logo.style.opacity = l1.style.opacity = Math.min(1, s); logo.style.transform = `scale(${0.9 + 0.1 * s})`;
    const v2 = interp(lf, [24, 38], [0, 1]); l2.style.opacity = v2; l2.style.transform = `translateY(${(1 - v2) * 20}px)`;
  };

  return {duracao: total, quadro: f => { telas.forEach(q => q(f)); fecho(f); }};
};
