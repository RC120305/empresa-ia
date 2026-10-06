// Páginas da massagem: a parceira confirma ou indica até 3 horários (/p/…); o hóspede escolhe um deles (/mc/…).
(function () {
  'use strict';
  const { papel, token } = document.body.dataset;
  const msg = document.getElementById('ms-msg');
  const base = papel === 'parceira' ? '/p/' : '/mc/';
  async function enviar(corpo, botao) {
    if (botao.getAttribute('aria-disabled') === 'true') return;
    const txt = botao.textContent;
    botao.setAttribute('aria-disabled', 'true'); botao.textContent = 'Enviando…';
    try {
      const r = await fetch(base + encodeURIComponent(token), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.erro || 'Não deu para enviar agora.');
      document.querySelectorAll('.ms-acoes, #ms-outros, .vt-op').forEach(e => { e.hidden = true; });
      msg.textContent = j.mensagem || 'Recebido!';
      msg.className = 'ms-msg ok';
      if (j.whatsapp) { // abrir a conversa com o hotel deixa os avisos seguintes chegarem pelo WhatsApp
        const a = document.createElement('a'); a.className = 'btn'; a.href = j.whatsapp; a.rel = 'noopener'; a.textContent = 'Avisar o hotel pelo WhatsApp';
        msg.after(a);
      }
    } catch (e) {
      botao.removeAttribute('aria-disabled'); botao.textContent = txt;
      msg.textContent = e.message + ' Tente de novo.';
    }
  }
  if (papel === 'parceira') {
    const outros = document.getElementById('ms-outros');
    const conf = document.getElementById('ms-confirmo');
    if (conf) conf.addEventListener('click', e => enviar({ acao: 'confirmar' }, e.currentTarget));
    const nao = document.getElementById('ms-nao');
    if (nao) nao.addEventListener('click', () => { outros.hidden = false; outros.scrollIntoView({ behavior: 'smooth' }); });
    document.querySelectorAll('.ms-op').forEach(c => c.addEventListener('change', () => {
      const marcados = document.querySelectorAll('.ms-op:checked');
      if (marcados.length > 3) { c.checked = false; msg.textContent = 'Marque no máximo 3 horários.'; } else msg.textContent = '';
    }));
    const env = document.getElementById('ms-enviar');
    if (env) env.addEventListener('click', e => {
      const opcoes = [...document.querySelectorAll('.ms-op:checked')].map(c => { const [data, horario] = c.value.split('|'); return { data, horario }; });
      if (!opcoes.length) { msg.textContent = 'Marque pelo menos um horário livre.'; return; }
      enviar({ acao: 'opcoes', opcoes }, e.currentTarget);
    });
  } else {
    const esc = document.getElementById('ms-escolher');
    if (esc) esc.addEventListener('click', e => {
      const k = document.querySelector('input[name=ms-escolha]:checked');
      enviar({ acao: 'escolher', opcao: k ? Number(k.value) : 0 }, e.currentTarget);
    });
    const nen = document.getElementById('ms-nenhum');
    if (nen) nen.addEventListener('click', e => enviar({ acao: 'nenhum' }, e.currentTarget));
  }
})();
