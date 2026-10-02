// Página do orçamento: pontos da galeria e o "Quero reservar esta" (registra a escolha e leva ao WhatsApp do hotel).
(function () {
  'use strict';
  const token = document.body.dataset.token;
  // Galeria: arrastar com o dedo, setas (‹ ›) e pontos clicáveis
  document.querySelectorAll('.fotos').forEach(f => {
    const p = f.nextElementSibling && f.nextElementSibling.classList.contains('pontos') ? f.nextElementSibling : null;
    const n = f.children.length;
    if (n < 2) return;
    const caixa = document.createElement('div');
    caixa.className = 'galeria';
    f.parentNode.insertBefore(caixa, f);
    caixa.appendChild(f);
    if (p) caixa.appendChild(p);
    const atual = () => Math.round(f.scrollLeft / f.clientWidth);
    const ir = k => f.scrollTo({ left: Math.max(0, Math.min(n - 1, k)) * f.clientWidth, behavior: 'smooth' });
    const seta = (cls, txt, rotulo, passo) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'seta ' + cls; b.textContent = txt; b.setAttribute('aria-label', rotulo);
      b.addEventListener('click', () => ir(atual() + passo));
      caixa.appendChild(b);
      return b;
    };
    const ant = seta('ant', '‹', 'Foto anterior', -1), prox = seta('prox', '›', 'Próxima foto', 1);
    const pintar = () => {
      const k = atual();
      if (p) [...p.children].forEach((d, i) => { d.className = i === k ? 'on' : ''; });
      ant.hidden = k <= 0; prox.hidden = k >= n - 1;
    };
    if (p) {
      p.removeAttribute('aria-hidden');
      [...p.children].forEach((d, i) => { d.setAttribute('role', 'button'); d.setAttribute('aria-label', 'Foto ' + (i + 1)); d.addEventListener('click', () => ir(i)); });
    }
    f.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); ir(atual() + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); ir(atual() - 1); } });
    f.addEventListener('scroll', pintar, { passive: true });
    pintar();
  });
  const passo = document.getElementById('passo');
  const fechar = () => { passo.hidden = true; };
  document.getElementById('p-voltar').addEventListener('click', fechar);
  passo.addEventListener('click', e => { if (e.target === passo) fechar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });

  document.querySelectorAll('.quero').forEach(b => b.addEventListener('click', async () => {
    if (b.getAttribute('aria-disabled') === 'true') return;
    b.setAttribute('aria-disabled', 'true');
    let j = {};
    try {
      const r = await fetch('/o/' + encodeURIComponent(token) + '/quero', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: b.dataset.codigo, previa: document.body.dataset.previa === '1' }),
      });
      j = await r.json().catch(() => ({}));
    } catch (e) { /* sem rede: segue com a orientação abaixo */ }
    b.removeAttribute('aria-disabled');
    const wa = document.getElementById('p-wa');
    document.getElementById('p-txt').textContent = j.whatsapp
      ? 'Toque no botão para mandar a sua escolha (' + b.dataset.nome + ') na nossa conversa do WhatsApp. A gente confere a vaga na hora e segue com a reserva por lá.'
      : 'Responda na nossa conversa do WhatsApp dizendo que escolheu: ' + b.dataset.nome + '. A gente confere a vaga e segue com a reserva por lá.';
    wa.hidden = !j.whatsapp;
    if (j.whatsapp) wa.href = j.whatsapp;
    passo.hidden = false;
    (j.whatsapp ? wa : document.getElementById('p-voltar')).focus();
  }));
})();
