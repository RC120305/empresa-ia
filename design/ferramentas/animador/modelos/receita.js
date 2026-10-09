// Modelo "receita": cópia de um vídeo de referência. O fundo é um vídeo já montado com os nossos trechos
// (copiar-referencia.py montar), e os textos entram no tempo, no lugar e no jeito da referência.
// Campos: {video (fundo), textos: [{ini, fim, texto, destaque?: "palavra outra", x?: 0–1 (centro do bloco), y: 0–1,
//   alinhar?: centro|esquerda, tamanho?: px (em 1080 de largura), caixa?: alta|normal, peso?: 400|600,
//   destaqueEstilo?: negrito|cor, corDestaque?: "#hex", entrada?: fade|palavra|letra|linha, largura?: 0–1}],
//   escurecer?: 0–0.7, logo?: {ini, fim} (selo pequeno no alto, opcional)}
MODELOS["receita"] = (palco, r, {fps, w, h}) => {
  const {interp, spring, el, CORES} = Anim;
  const dur = Math.round(Math.min(r.duracaoSeg || 1e9, r.quadrosVideo.n / fps) * fps);
  const vid = el("img", {position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover"}, palco);
  const e = Anim.clamp(+(r.escurecer ?? 0.12), 0, 0.7);
  el("div", {position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(0,0,0,${e * 0.5}), rgba(0,0,0,${e * 0.15}) 40%, rgba(0,0,0,${e * 0.15}) 60%, rgba(0,0,0,${e * 0.9}))`}, palco);
  const sombra = "0 2px 12px rgba(0,0,0,.55), 0 0 3px rgba(0,0,0,.4)";
  let logo = null;
  if (r.logo) { const s = el("div", {position: "absolute", left: 0, right: 0, top: Math.round(h * 0.135) + "px", display: "flex", justifyContent: "center", opacity: 0}, palco); el("img", {height: "84px", filter: "drop-shadow(0 2px 8px rgba(0,0,0,.4))"}, s).src = r.logo.src || "recursos/logo.png"; logo = s; }

  const textos = (r.textos || []).map(t => {
    const alinhar = t.alinhar === "esquerda" ? "esquerda" : "centro", larg = Math.round((t.largura || 0.8) * w);
    const cx = (t.x ?? 0.5) * w, left = alinhar === "centro" ? cx - larg / 2 : (t.x ?? 0.12) * w;
    const bloco = el("div", {position: "absolute", left: left + "px", width: larg + "px", top: Math.round((t.y ?? 0.7) * h) + "px", transform: "translateY(-50%)",
      display: "flex", flexWrap: "wrap", justifyContent: alinhar === "centro" ? "center" : "flex-start", gap: "0 " + Math.round((t.tamanho || 46) * 0.28) + "px",
      textAlign: alinhar === "centro" ? "center" : "left", opacity: 0}, palco);
    const dest = (t.destaque || "").toLowerCase().split(" ").filter(Boolean), alta = t.caixa === "alta";
    const linhas = String(t.texto).split("\n");
    const spans = [];
    linhas.forEach((ln, li) => {
      if (li) el("div", {flexBasis: "100%", height: 0}, bloco);
      ln.split(" ").filter(Boolean).forEach(p => {
        const d = dest.includes(p.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""));
        const s = el("span", {fontFamily: "Josefin, 'Josefin Sans', sans-serif", fontSize: (t.tamanho || 46) + "px", lineHeight: 1.18,
          fontWeight: d && t.destaqueEstilo !== "cor" ? 600 : (t.peso || 400), letterSpacing: alta ? ".08em" : ".01em", textTransform: alta ? "uppercase" : "none",
          color: d && t.destaqueEstilo === "cor" ? (t.corDestaque || CORES.laranja) : "#FFFFFF", textShadow: sombra, display: "inline-block"}, bloco, p);
        spans.push(s);
      });
    });
    const letras = t.entrada === "letra" ? spans.flatMap(s => { const tx = s.textContent; s.textContent = ""; return [...tx].map(ch => el("span", {opacity: 0}, s, ch)); }) : [];
    const ini = Math.round(t.ini * fps), fim = Math.round(t.fim * fps);
    return f => {
      const lf = f - ini, vis = f >= ini && f < fim + 8;
      bloco.style.display = vis ? "flex" : "none"; if (!vis) return;
      const saida = interp(f, [fim, fim + 8], [1, 0]);
      bloco.style.opacity = saida;
      if (t.entrada === "letra") letras.forEach((s, k) => { s.style.opacity = lf >= k * (fps / 22) ? 1 : 0; });
      else if (t.entrada === "palavra") spans.forEach((s, k) => { const v = spring(lf - k * 4, fps, {damping: 14, stiffness: 120}); s.style.opacity = Math.min(1, v); s.style.transform = `translateY(${(1 - v) * 24}px)`; });
      else if (t.entrada === "linha") { const v = spring(lf, fps, {damping: 16, stiffness: 110}); bloco.style.opacity = Math.min(1, v) * saida; bloco.style.transform = `translateY(calc(-50% + ${(1 - v) * 30}px))`; }
      else bloco.style.opacity = interp(lf, [0, 8], [0, 1]) * saida;
    };
  });
  return {
    duracao: dur,
    async quadro(f) {
      await Anim.quadroVideo(vid, r.quadrosVideo, f);
      textos.forEach(q => q(f));
      if (logo) logo.style.opacity = f >= r.logo.ini * fps && f < r.logo.fim * fps ? 1 : 0;
    },
  };
};
