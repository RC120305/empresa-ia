// Animador Cabanas: ferramentas comuns dos modelos (usado pelo motor.html e pela prévia ao vivo da Central).
// Cada quadro é função pura do número do quadro (f), como no Remotion:
// o modelo monta o DOM uma vez e, a cada quadro, só muda estilos. animar.mjs fotografa cada quadro.
const Anim = {
  clamp: (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)),
  ease: {
    linear: t => t,
    inOutQuad: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  },
  // interp(f, [f0, f1], [v0, v1], easing): mapeia o quadro para um valor, sempre preso nas pontas
  interp(f, [a, b], [v0, v1], easing = Anim.ease.linear) {
    const t = Anim.clamp((f - a) / (b - a || 1));
    return v0 + (v1 - v0) * easing(t);
  },
  // mola (massa 1): de 0 a 1 com o "quique" natural; f = quadros desde o início
  spring(f, fps, {damping = 10, stiffness = 100, mass = 1} = {}) {
    if (f <= 0) return 0;
    const t = f / fps, w0 = Math.sqrt(stiffness / mass), z = damping / (2 * Math.sqrt(stiffness * mass));
    if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)); }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  },
  el(tag, estilo = {}, pai = null, html = "") {
    const e = document.createElement(tag); Object.assign(e.style, estilo); if (html) e.innerHTML = html; if (pai) pai.appendChild(e); return e;
  },
  CORES: {creme: "#F7F1E6", laranja: "#F58634", marrom: "#847059", escuro: "#140e08"},
  sombra: "0 2px 18px rgba(0,0,0,.55), 0 0 4px rgba(0,0,0,.35)",
};
const MODELOS = {};
