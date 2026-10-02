// Página do orçamento: pontos da galeria e o "Quero reservar esta" (registra a escolha e leva ao WhatsApp do hotel).
(function () {
  'use strict';
  const token = document.body.dataset.token;
  document.querySelectorAll('.fotos').forEach(f => {
    const p = f.nextElementSibling && f.nextElementSibling.classList.contains('pontos') ? f.nextElementSibling : null;
    if (p) f.addEventListener('scroll', () => { const k = Math.round(f.scrollLeft / f.clientWidth); [...p.children].forEach((d, i) => { d.className = i === k ? 'on' : ''; }); }, { passive: true });
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
