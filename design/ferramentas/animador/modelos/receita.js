// Modelo "receita": cópia de um vídeo de referência. O fundo é um vídeo já montado com os nossos trechos
// (copiar-referencia.py montar), e as legendas copiam a referência: mesma fonte, pesos, cor, tamanho, lugar,
// tempo e efeito de entrada/saída.
// Campos: {video (fundo), escurecer?: 0–0.7, logo?: {ini, fim}, legenda?: {padrões para todos os textos}, textos: [{
//   ini, fim, texto ("\n" quebra a linha), destaque?: "palavra outra" (palavras em negrito/cor),
//   x?: 0–1 (centro do bloco; ou a margem esquerda se alinhar=esquerda), y: 0–1 (centro vertical), largura?: 0–1,
//   alinhar?: centro|esquerda|direita, tamanho?: px (em 1080 de largura), entrelinha?: 1.15,
//   fonte?: montserrat|josefin|playfair|plexmono, peso?: 400, pesoDestaque?: 800, caixa?: alta|normal, espacamento?: em (entre letras), espacoPalavra?: em (entre palavras, padrão 0.27),
//   cor?: "#hex", corDestaque?: "#hex" (só quando destaqueEstilo=cor), destaqueEstilo?: negrito|cor,
//   sombra?: suave|forte|nenhuma,
//   entrada?: fade|desfoque|desfoque-palavra|desfoque-letra|palavra|letra|linha|subir|nenhuma,
//   duracaoEntrada?: s (fade/desfoque, padrão 0.5), intervalo?: s entre palavras/letras, atraso?: [s por palavra],
//   saida?: fade|desfoque|nenhuma, duracaoSaida?: s}]}
const FONTES_RECEITA = {montserrat: "Montserrat, sans-serif", josefin: "Josefin, 'Josefin Sans', sans-serif", playfair: "Playfair, 'Playfair Display', Georgia, serif", plexmono: "PlexMono, 'IBM Plex Mono', monospace"};
const SOMBRAS_RECEITA = {suave: "0 1px 10px rgba(0,0,0,.45), 0 0 2px rgba(0,0,0,.25)", forte: "0 2px 12px rgba(0,0,0,.65), 0 0 3px rgba(0,0,0,.5)", nenhuma: "none"};

MODELOS["receita"] = (palco, r, {fps, w, h}) => {
  const {interp, spring, ease, el, CORES} = Anim;
  const dur = Math.round(Math.min(r.duracaoSeg || 1e9, r.quadrosVideo.n / fps) * fps);
  const vid = el("img", {position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover"}, palco);
  const e = Anim.clamp(+(r.escurecer ?? 0.12), 0, 0.7);
  el("div", {position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(0,0,0,${e * 0.5}), rgba(0,0,0,${e * 0.15}) 40%, rgba(0,0,0,${e * 0.15}) 60%, rgba(0,0,0,${e * 0.9}))`}, palco);
  let logo = null;
  if (r.logo) { const s = el("div", {position: "absolute", left: 0, right: 0, top: Math.round(h * 0.135) + "px", display: "flex", justifyContent: "center", opacity: 0}, palco); el("img", {height: "84px", filter: "drop-shadow(0 2px 8px rgba(0,0,0,.4))"}, s).src = r.logo.src || "recursos/logo.png"; logo = s; }
  const limpa = p => p.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

  const textos = (r.textos || []).map(t0 => {
    const t = {...(r.legenda || {}), ...t0};
    const alinhar = ["esquerda", "direita"].includes(t.alinhar) ? t.alinhar : "centro", larg = Math.round((t.largura || 0.8) * w);
    const left = alinhar === "centro" ? (t.x ?? 0.5) * w - larg / 2 : alinhar === "esquerda" ? (t.x ?? 0.12) * w : (t.x ?? 0.88) * w - larg;
    const tam = t.tamanho || 46, fam = FONTES_RECEITA[t.fonte] || FONTES_RECEITA.josefin;
    const bloco = el("div", {position: "absolute", left: left + "px", width: larg + "px", top: Math.round((t.y ?? 0.7) * h) + "px", transform: "translateY(-50%)",
      display: "flex", flexWrap: "wrap", justifyContent: {centro: "center", esquerda: "flex-start", direita: "flex-end"}[alinhar], gap: "0 " + Math.round(tam * (t.espacoPalavra ?? 0.27)) + "px",
      textAlign: {centro: "center", esquerda: "left", direita: "right"}[alinhar], opacity: 0}, palco);
    const dest = (t.destaque || "").split(" ").map(limpa).filter(Boolean), alta = t.caixa === "alta";
    const porCor = t.destaqueEstilo === "cor";
    const pesoBase = t.peso || 400, pesoDest = t.pesoDestaque || (t.fonte === "montserrat" ? 800 : 600);
    const spans = [];
    String(t.texto).split("\n").forEach((ln, li) => {
      if (li) el("div", {flexBasis: "100%", height: 0}, bloco);
      ln.split(" ").filter(Boolean).forEach(p => {
        const d = dest.includes(limpa(p));
        spans.push(el("span", {fontFamily: fam, fontSize: tam + "px", lineHeight: t.entrelinha || 1.15,
          fontWeight: d && !porCor ? pesoDest : pesoBase, fontStyle: t.fonte === "playfair" ? "italic" : "normal",
          letterSpacing: (t.espacamento ?? (alta ? 0.06 : 0)) + "em", textTransform: alta ? "uppercase" : "none",
          color: d && porCor ? (t.corDestaque || CORES.laranja) : (t.cor || "#FFFFFF"), textShadow: SOMBRAS_RECEITA[t.sombra] ?? SOMBRAS_RECEITA.suave,
          display: "inline-block", willChange: "opacity, filter, transform"}, bloco, p));
      });
    });
    const ent = t.entrada || "fade";
    const porLetra = ent === "letra" || ent === "desfoque-letra";
    const unidades = porLetra ? spans.flatMap(s => { const tx = s.textContent; s.textContent = ""; return [...tx].map(ch => el("span", {display: "inline-block", whiteSpace: "pre"}, s, ch)); }) : spans;
    const ini = Math.round(t.ini * fps), fim = Math.round(t.fim * fps);
    const dEnt = Math.max(1, Math.round((t.duracaoEntrada ?? 0.5) * fps)), dSai = Math.max(1, Math.round((t.duracaoSaida ?? 0.3) * fps));
    const passo = (t.intervalo ?? (porLetra ? 1 / 22 : 0.14)) * fps;
    const atrasoDe = k => t.atraso && t.atraso[k] != null ? t.atraso[k] * fps : k * passo;
    // estado de uma unidade (palavra ou letra) lf quadros depois do início dela
    const aplica = (s, lf) => {
      if (ent === "nenhuma") { s.style.opacity = lf >= 0 ? 1 : 0; return; }
      if (ent === "letra") { s.style.opacity = lf >= 0 ? 1 : 0; return; }
      if (ent === "palavra" || ent === "subir") { const v = spring(lf, fps, {damping: 14, stiffness: 120}); s.style.opacity = Math.min(1, Math.max(0, v)); s.style.transform = `translateY(${(1 - v) * (ent === "subir" ? 40 : 24)}px)`; return; }
      // desfoque: sai do borrado e ganha nitidez, com um leve zoom
      const v = interp(lf, [0, dEnt], [0, 1], ease.outCubic || (x => 1 - Math.pow(1 - x, 3)));
      s.style.opacity = v; s.style.filter = `blur(${(1 - v) * tam * 0.28}px)`; s.style.transform = `scale(${1.06 - 0.06 * v})`;
    };
    return f => {
      const lf = f - ini, vis = f >= ini && f < fim + dSai;
      bloco.style.display = vis ? "flex" : "none"; if (!vis) return;
      const out = interp(f, [fim, fim + dSai], [1, 0]);
      const so = t.saida || "fade";
      bloco.style.opacity = so === "nenhuma" ? (f < fim ? 1 : 0) : out;
      bloco.style.filter = so === "desfoque" ? `blur(${(1 - out) * tam * 0.28}px)` : "none";
      if (ent === "fade") { bloco.style.opacity = interp(lf, [0, dEnt], [0, 1]) * (so === "nenhuma" ? 1 : out); unidades.forEach(s => { s.style.opacity = 1; }); return; }
      if (ent === "desfoque") { unidades.forEach(s => aplica(s, lf)); return; }
      if (ent === "linha") { const v = spring(lf, fps, {damping: 16, stiffness: 110}); unidades.forEach(s => { s.style.opacity = 1; }); bloco.style.opacity = Math.min(1, v) * out; bloco.style.transform = `translateY(calc(-50% + ${(1 - v) * 30}px))`; return; }
      unidades.forEach((s, k) => aplica(s, lf - atrasoDe(k)));
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
