// Página de extras: galeria de fotos, total ao vivo e envio da escolha (o servidor confere e registra).
(function () {
  'use strict';
  const token = document.body.dataset.token;
  const reais = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });

  // Galeria: arrastar, setas e pontos
  document.querySelectorAll('.fotos').forEach(f => {
    const p = f.nextElementSibling && f.nextElementSibling.classList.contains('pontos') ? f.nextElementSibling : null;
    const n = f.children.length;
    if (n < 2) return;
    const caixa = document.createElement('div');
    caixa.className = 'galeria';
    f.parentNode.insertBefore(caixa, f); caixa.appendChild(f); if (p) caixa.appendChild(p);
    const atual = () => Math.round(f.scrollLeft / f.clientWidth);
    const ir = k => f.scrollTo({ left: Math.max(0, Math.min(n - 1, k)) * f.clientWidth, behavior: 'smooth' });
    const seta = (cls, txt, rotulo, passo) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'seta ' + cls; b.textContent = txt; b.setAttribute('aria-label', rotulo); b.addEventListener('click', () => ir(atual() + passo)); caixa.appendChild(b); return b; };
    const ant = seta('ant', '‹', 'Foto anterior', -1), prox = seta('prox', '›', 'Próxima foto', 1);
    const pintar = () => { const k = atual(); if (p) [...p.children].forEach((d, i) => { d.className = i === k ? 'on' : ''; }); ant.hidden = k <= 0; prox.hidden = k >= n - 1; };
    if (p) { p.removeAttribute('aria-hidden'); [...p.children].forEach((d, i) => { d.setAttribute('role', 'button'); d.setAttribute('aria-label', 'Foto ' + (i + 1)); d.addEventListener('click', () => ir(i)); }); }
    f.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); ir(atual() + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); ir(atual() - 1); } });
    f.addEventListener('scroll', pintar, { passive: true });
    pintar();
  });

  // Escolhas e total
  const cards = [...document.querySelectorAll('.vt-prod')];
  const ler = c => {
    const pr = JSON.parse(c.dataset.precos);
    const v = c.querySelector('.vt-op input[type=radio]:checked');
    const ads = [...c.querySelectorAll('.vt-ad:checked')].map(i => i.value);
    const qtd = Math.max(1, Math.min(20, Math.round(Number(c.querySelector('.vt-qtd').value) || 1)));
    const dia = c.querySelector('.vt-dia').value || null;
    const vars = Object.keys(pr.vars);
    const base = v ? pr.vars[v.value] : vars.length === 1 ? pr.vars[vars[0]] : pr.base;
    const unit = base == null ? null : base + ads.reduce((s, a) => s + (pr.ads[a] || 0), 0);
    return { codigo: c.dataset.codigo, nome: c.dataset.nome, variacao: v ? v.value : (vars.length === 1 ? vars[0] : null), adicionais: ads, quantidade: qtd, data: dia,
      total: unit == null ? null : unit * qtd, pessoa: pr.pessoa };
  };
  const escolhidos = () => cards.filter(c => c.querySelector('.vt-sel').checked).map(ler);
  const barra = document.getElementById('vt-barra');
  function pintar() {
    cards.forEach(c => {
      const on = c.querySelector('.vt-sel').checked, it = ler(c);
      c.classList.toggle('on', on);
      c.querySelector('.vt-sub').textContent = it.total != null ? '· ' + reais(it.total) : '';
    });
    const l = escolhidos();
    barra.hidden = !l.length;
    const tot = l.reduce((s, x) => s + (x.total || 0), 0);
    document.getElementById('vt-total').textContent = l.length + (l.length > 1 ? ' extras' : ' extra') + (tot ? ' · ' + reais(tot) : '');
  }
  cards.forEach(c => c.addEventListener('change', e => {
    if (!e.target.classList.contains('vt-sel')) c.querySelector('.vt-sel').checked = true; // mexeu na opção: já marca o produto
    pintar();
  }));
  cards.forEach(c => c.querySelector('.vt-qtd').addEventListener('input', pintar));
  pintar();

  // Resumo, confirmação e WhatsApp
  const passo = document.getElementById('passo');
  const fechar = () => { passo.hidden = true; };
  document.getElementById('p-voltar').addEventListener('click', fechar);
  passo.addEventListener('click', e => { if (e.target === passo) fechar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });
  const linha = x => x.nome + (x.variacao ? ' (' + x.variacao + ')' : '') + ' · ' + x.quantidade + (x.pessoa ? (x.quantidade > 1 ? ' pessoas' : ' pessoa') : 'x') + (x.adicionais.length ? ' · + ' + x.adicionais.join(', ') : '') + (x.data ? ' · ' + x.data.slice(8, 10) + '/' + x.data.slice(5, 7) : '') + (x.total != null ? ' · ' + reais(x.total) : '');
  document.getElementById('vt-enviar').addEventListener('click', () => {
    const l = escolhidos();
    if (!l.length) return;
    const lista = document.getElementById('p-lista'); lista.textContent = '';
    l.forEach(x => { const d = document.createElement('p'); d.textContent = linha(x); lista.appendChild(d); });
    document.getElementById('p-txt').textContent = 'Vai para a conta da hospedagem e é acertado no check-out. A equipe confirma o horário com você pelo WhatsApp.';
    document.getElementById('p-confirmar').hidden = false; document.getElementById('p-wa').hidden = true;
    passo.hidden = false; document.getElementById('p-confirmar').focus();
  });
  document.getElementById('p-confirmar').addEventListener('click', async e => {
    const b = e.currentTarget;
    if (b.getAttribute('aria-disabled') === 'true') return;
    b.setAttribute('aria-disabled', 'true'); b.textContent = 'Enviando…';
    let j = {};
    try {
      const r = await fetch('/e/' + encodeURIComponent(token) + '/pedido', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previa: document.body.dataset.previa === '1', itens: escolhidos().map(x => ({ codigo: x.codigo, variacao: x.variacao, adicionais: x.adicionais, quantidade: x.quantidade, data: x.data })) }) });
      j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.erro || 'erro');
    } catch (err) {
      b.removeAttribute('aria-disabled'); b.textContent = 'Confirmar';
      document.getElementById('p-txt').textContent = (j.erro || 'Não deu para enviar agora.') + ' Tente de novo ou fale com a gente pelo WhatsApp.';
      return;
    }
    b.removeAttribute('aria-disabled'); b.textContent = 'Confirmar'; b.hidden = true;
    document.getElementById('p-tit').textContent = 'Recebemos sua escolha!';
    const wa = document.getElementById('p-wa');
    document.getElementById('p-txt').textContent = j.whatsapp ? 'Toque no botão para mandar a sua escolha na nossa conversa do WhatsApp. A equipe confirma o horário por lá.' : 'A equipe já recebeu e confirma o horário com você pelo WhatsApp.';
    wa.hidden = !j.whatsapp; if (j.whatsapp) { wa.href = j.whatsapp; wa.focus(); }
  });
})();
