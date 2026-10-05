// Modelo "Legenda da fala": vídeo de alguém falando (9:16, de preferência já limpo pelo legendar-fala.py) com a legenda
// palavra por palavra no terço de baixo: 1 a 3 palavras por vez, a palavra falada acende em laranja e "pula".
// Campos: {video, transcricao (JSON do legendar-fala.py), inicioVideoSeg?, duracaoSeg?, destaques?: ["palavra", ...],
//  palavrasPorBloco? (3), selo? (true = logo pequeno no alto), fecho?: {linha1, linha2, seg?}}
MODELOS["legenda-fala"] = (palco, r, {fps}) => {
  const {interp, spring, el, CORES, sombra, quadroVideo} = Anim;
  const ws = r.transcricao.palavras, ini0 = r.inicioVideoSeg || 0;
  const durFala = Math.min(r.duracaoSeg || (ws.length ? ws[ws.length - 1].fim - ini0 + 0.4 : 3), r.quadrosVideo.n / fps);
  const FECHO = r.fecho ? Math.round((r.fecho.seg ?? 2.5) * fps) : 0, FALA = Math.round(durFala * fps);
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]/g, "");
  const dest = new Set((r.destaques || []).map(norm));
  // blocos: até N palavras, quebra em pontuação ou pausa > 0,35 s
  const N = r.palavrasPorBloco || 3, blocos = [];
  ws.forEach((w, i) => {
    const b = blocos[blocos.length - 1], ant = ws[i - 1];
    if (!b || b.length >= N || /[.,!?;:]$/.test(ant?.p || "") || w.ini - ant.fim > 0.35) blocos.push([w]); else b.push(w);
  });

  const vid = el("img", {position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover"}, palco);
  el("div", {position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(20,14,8,0) 55%, rgba(20,14,8,.45))"}, palco);
  if (r.selo) { const s = el("div", {position: "absolute", left: 0, right: 0, top: "260px", display: "flex", justifyContent: "center"}, palco); el("img", {height: "80px", filter: "drop-shadow(0 2px 8px rgba(0,0,0,.4))"}, s).src = "recursos/logo.png"; }
  const caixa = el("div", {position: "absolute", left: "70px", right: "70px", bottom: "420px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 22px", textAlign: "center"}, palco);
  const spans = blocos.map(b => b.map(w => el("span", {fontFamily: "Josefin", fontWeight: 600, fontSize: "76px", letterSpacing: ".03em", lineHeight: 1.15, color: CORES.creme, textShadow: sombra, display: "none", WebkitTextStroke: "1px rgba(0,0,0,.25)"}, caixa, w.p.toUpperCase())));

  let fc = null;
  if (r.fecho) {
    fc = el("div", {position: "absolute", inset: 0, background: CORES.escuro, display: "none", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "40px"}, palco);
    fc._logo = el("img", {height: "230px"}, fc); fc._logo.src = "recursos/logo.png";
    fc._l1 = el("div", {fontFamily: "Josefin", fontWeight: 600, fontSize: "38px", letterSpacing: ".3em", color: CORES.creme}, fc, r.fecho.linha1 || "BONITO - MS");
    fc._l2 = el("div", {fontFamily: "Playfair", fontStyle: "italic", fontSize: "64px", color: CORES.creme}, fc, r.fecho.linha2 || "Reserve pelo link da bio");
  }

  return {
    duracao: FALA + FECHO,
    async quadro(f) {
      const t = ini0 + Math.min(f, FALA - 1) / fps;
      await quadroVideo(vid, r.quadrosVideo, Math.min(f, FALA - 1));
      const bi = blocos.findIndex((b, i) => t >= b[0].ini - 0.05 && t < (blocos[i + 1] ? blocos[i + 1][0].ini - 0.05 : b[b.length - 1].fim + 0.6));
      spans.forEach((ss, i) => ss.forEach((s, k) => {
        if (i !== bi) { s.style.display = "none"; return; }
        const w = blocos[i][k], dito = t >= w.ini - 0.03;
        s.style.display = "inline-block";
        const v = spring(Math.round((t - w.ini) * fps) + 1, fps, {damping: 12, stiffness: 180});
        s.style.color = dito && (dest.has(norm(w.p)) || t < w.fim) ? CORES.laranja : CORES.creme;
        s.style.opacity = dito ? 1 : 0.35;
        s.style.transform = `scale(${dito ? 0.85 + 0.15 * Math.min(v, 1.1) : 0.92})`;
      }));
      if (fc) {
        const lf = f - FALA; fc.style.display = lf >= 0 ? "flex" : "none";
        if (lf >= 0) { fc.style.opacity = interp(lf, [0, 8], [0, 1]); const s = spring(lf - 4, fps, {damping: 16}); fc._logo.style.opacity = fc._l1.style.opacity = Math.min(1, s); fc._l2.style.opacity = interp(lf, [18, 30], [0, 1]); }
      }
    },
  };
};
