// Caixa de entrada do CRM Cabanas (fase 1): login por link no e-mail, lista de conversas e mensagens
// em tempo real. Lê o banco com o login da pessoa: as regras do banco (RLS) só liberam a equipe
// cadastrada em "usuarios". Todo texto de cliente entra na página por textContent (nunca como HTML).
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const cfg = window.CRM_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseKey || !window.supabase) {
    document.body.textContent = 'A caixa de entrada ainda não foi configurada (falta a chave pública do Supabase no servidor).';
    return;
  }
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    // implicit: o link do e-mail funciona mesmo se abrir em outro navegador do celular
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
  });

  const telas = ['tela-entrar', 'tela-bloqueado', 'tela-caixa'];
  const mostrar = id => telas.forEach(t => ($(t).hidden = t !== id));

  let conversas = [];        // [{id, nome, tel, nao_lidas, ultima_msg_em, ultima_msg_cliente_em, previa}]
  let aberta = null;         // id da conversa aberta
  let canal = null;

  // ---------- Formatação ----------
  const fmtTel = v => {
    const d = String(v || '').replace(/\D/g, '');
    if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
      const ddd = d.slice(2, 4);
      let n = d.slice(4);
      if (n.length === 8 && /^[6-9]/.test(n)) n = '9' + n; // celular: a Meta manda sem o 9
      return `+55 ${ddd} ${n.slice(0, n.length - 4)}-${n.slice(-4)}`;
    }
    return d ? '+' + d : '';
  };
  const hora = iso => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dia = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const quando = iso => {
    if (!iso) return '';
    const d = new Date(iso), hoje = new Date();
    return d.toDateString() === hoje.toDateString() ? hora(iso) : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };
  const ROTULO = { image: '📷 Foto', audio: '🎤 Áudio', video: '🎬 Vídeo', document: '📄 Documento', sticker: 'Figurinha', location: '📍 Localização', contacts: '👤 Contato', reaction: 'Reação' };
  const textoMsg = m => {
    if (m.tipo === 'text' || m.tipo === 'button' || m.tipo === 'interactive') return m.corpo || '';
    const r = ROTULO[m.tipo] || ('[' + m.tipo + ']');
    return m.corpo ? r + ': ' + m.corpo : r;
  };
  const STATUS = { sent: '✓', delivered: '✓✓', read: '✓✓ lida', failed: '⚠ não entregue' };

  // ---------- Login ----------
  $('form-entrar').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('email').value.trim();
    const msg = $('msg-entrar');
    $('btn-entrar').setAttribute('disabled', '');
    msg.textContent = 'Enviando…';
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: location.origin + '/caixa' },
    });
    $('btn-entrar').removeAttribute('disabled');
    msg.textContent = !error ? 'Pronto! Abra o link que chegou no seu e-mail (veja também o spam). Só o link mais recente funciona.'
      : (error.status === 429 || /rate limit|security purposes|seconds/i.test(error.message))
        ? 'Muitos links pedidos em pouco tempo. O envio de e-mail gratuito do Supabase tem limite por hora: use o último link que chegou ou tente de novo mais tarde.'
        : /signups not allowed|not found|invalid/i.test(error.message)
          ? 'Este e-mail não tem acesso. Peça ao Ricardo para cadastrar.'
          : 'Não deu para enviar agora (' + error.message + '). Tente de novo em alguns minutos.';
  });
  $('sair').addEventListener('click', async () => { await sb.auth.signOut(); location.replace('/caixa'); });

  async function iniciar(session) {
    // Tira do endereço os dados do link de login, para que recarregar a página não tente usá-los de novo.
    if (location.hash || location.search) history.replaceState(null, '', '/caixa');
    if (!session) { $('quem').hidden = true; mostrar('tela-entrar'); return; }
    const { data: eu } = await sb.from('usuarios').select('nome,papel').maybeSingle();
    $('quem').hidden = false;
    $('quem-nome').textContent = eu ? eu.nome : session.user.email;
    if (!eu) { mostrar('tela-bloqueado'); return; }
    mostrar('tela-caixa');
    await carregarConversas();
    assinar();
    vigiar();
  }

  // Rede de segurança: se o tempo real cair, atualiza sozinho a cada 15 s e sempre que a aba volta.
  let aoVivo = false;
  async function atualizarTudo() {
    await carregarConversas();
    if (aberta) await recarregarAberta();
  }
  function vigiar() {
    setInterval(() => { if (!aoVivo && !document.hidden) atualizarTudo(); }, 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) atualizarTudo(); });
  }
  async function recarregarAberta() {
    const id = aberta;
    const { data } = await sb.from('mensagens').select('id,direcao,tipo,corpo,status_entrega,enviada_em')
      .eq('conversa_id', id).order('enviada_em', { ascending: true }).limit(500);
    if (aberta !== id || !data) return;
    const box = $('mensagens');
    const perto = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.textContent = '';
    let ultimoDia = '';
    data.forEach(m => { ultimoDia = adicionarMensagem(m, ultimoDia); });
    if (perto) rolarFim();
  }

  // ---------- Lista ----------
  async function carregarConversas() {
    const { data, error } = await sb.from('conversas')
      .select('id,nao_lidas,ultima_msg_em,ultima_msg_cliente_em,contato:contatos(nome,contato_identificadores(tipo,valor))')
      .order('ultima_msg_em', { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) { $('lista-vazia').hidden = false; $('lista-vazia').textContent = 'Não consegui carregar as conversas. Recarregue a página.'; return; }
    const ids = data.map(c => c.id);
    const previas = {};
    if (ids.length) {
      const { data: ult } = await sb.from('mensagens').select('conversa_id,tipo,corpo,direcao,enviada_em')
        .in('conversa_id', ids).order('enviada_em', { ascending: false }).limit(500);
      (ult || []).forEach(m => { if (!previas[m.conversa_id]) previas[m.conversa_id] = m; });
    }
    conversas = data.map(c => {
      const ids2 = (c.contato && c.contato.contato_identificadores) || [];
      const wa = ids2.find(i => i.tipo === 'whatsapp');
      const tel = wa ? fmtTel(wa.valor) : '';
      return { id: c.id, nome: (c.contato && c.contato.nome) || tel || 'Sem nome', tel, nao_lidas: c.nao_lidas,
        ultima_msg_em: c.ultima_msg_em, ultima_msg_cliente_em: c.ultima_msg_cliente_em, previa: previas[c.id] || null };
    });
    pintarLista();
  }

  function pintarLista() {
    const ul = $('conversas');
    ul.textContent = '';
    $('lista-vazia').hidden = conversas.length > 0;
    conversas.sort((a, b) => (b.ultima_msg_em || '').localeCompare(a.ultima_msg_em || ''));
    conversas.forEach(c => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = c.id;
      b.setAttribute('aria-current', String(c.id === aberta));
      const nome = document.createElement('span'); nome.className = 'c-nome'; nome.textContent = c.nome;
      const h = document.createElement('span'); h.className = 'c-hora'; h.textContent = quando(c.ultima_msg_em);
      const p = document.createElement('span'); p.className = 'c-prev';
      p.textContent = c.previa ? (c.previa.direcao === 'saida' ? 'Você: ' : '') + textoMsg(c.previa) : '';
      b.append(nome, h, p);
      if (c.nao_lidas > 0 && c.id !== aberta) {
        const n = document.createElement('span'); n.className = 'c-badge'; n.textContent = c.nao_lidas;
        n.setAttribute('aria-label', c.nao_lidas + ' não lidas'); b.append(n);
      }
      b.addEventListener('click', () => abrir(c.id));
      li.append(b);
      ul.append(li);
    });
  }

  // ---------- Conversa ----------
  async function abrir(id) {
    aberta = id;
    $('sugestao').hidden = true;
    const c = conversas.find(x => x.id === id);
    $('sem-conversa').hidden = true;
    $('conv').hidden = false;
    $('tela-caixa').classList.add('aberta');
    $('conv-nome').textContent = c ? c.nome : '';
    $('conv-tel').textContent = c && c.tel !== c.nome ? c.tel : '';
    pintarJanela(c);
    $('mensagens').textContent = 'Carregando…';
    const { data } = await sb.from('mensagens').select('id,direcao,tipo,corpo,status_entrega,enviada_em')
      .eq('conversa_id', id).order('enviada_em', { ascending: true }).limit(500);
    if (aberta !== id) return;
    $('mensagens').textContent = '';
    let ultimoDia = '';
    (data || []).forEach(m => { ultimoDia = adicionarMensagem(m, ultimoDia); });
    rolarFim();
    if (c && c.nao_lidas) { c.nao_lidas = 0; sb.rpc('marcar_conversa_lida', { p_conversa: id }); }
    pintarLista();
  }

  function pintarJanela(c) {
    const j = $('conv-janela');
    const fim = c && c.ultima_msg_cliente_em ? new Date(new Date(c.ultima_msg_cliente_em).getTime() + 24 * 3600 * 1000) : null;
    const abertaJ = !!fim && fim > new Date();
    $('resposta').disabled = !abertaJ;
    $('enviar').toggleAttribute('disabled', !abertaJ);
    $('resposta').placeholder = abertaJ ? 'Escreva a resposta…' : 'Janela de 24 h fechada';
    $('resposta').title = abertaJ ? 'No computador, Enter envia e Shift+Enter quebra a linha. Uma linha só com --- separa os balões.' : 'Fora da janela de 24 h, só modelos aprovados pela Meta (próxima etapa).';
    if (!fim) { j.textContent = ''; j.className = 'janela'; return; }
    j.className = 'janela ' + (abertaJ ? 'aberta' : 'fechada');
    const amanha = fim.toDateString() !== new Date().toDateString();
    j.textContent = abertaJ ? 'Responder até ' + (amanha ? 'amanhã ' : '') + hora(fim.toISOString()) : 'Janela fechada';
    j.title = abertaJ ? 'Dá para responder com texto livre até esse horário.' : 'Fora da janela, só modelos aprovados pela Meta.';
  }

  function adicionarMensagem(m, ultimoDia) {
    const box = $('mensagens');
    const d = dia(m.enviada_em);
    if (d !== ultimoDia) {
      const s = document.createElement('div'); s.className = 'dia'; s.textContent = d; box.append(s);
    }
    const b = document.createElement('div');
    b.className = 'balao ' + (m.direcao === 'saida' ? 'saida' : 'entrada');
    b.dataset.id = m.id;
    if (m.tipo === 'text' || m.tipo === 'button' || m.tipo === 'interactive') b.textContent = m.corpo || '';
    else { const em = document.createElement('em'); em.textContent = textoMsg(m); b.append(em); }
    const s = document.createElement('small');
    s.textContent = hora(m.enviada_em) + (m.direcao === 'saida' && m.status_entrega ? ' · ' + (STATUS[m.status_entrega] || m.status_entrega) : '');
    b.append(s);
    box.append(b);
    return d;
  }
  const rolarFim = () => { const box = $('mensagens'); box.scrollTop = box.scrollHeight; };

  // ---------- Enviar ----------
  let enviando = false;
  async function chamarApi(rota, corpo) {
    const { data: { session } } = await sb.auth.getSession();
    const r = await fetch(rota, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session ? session.access_token : '') },
      body: JSON.stringify(corpo),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) { const e = new Error(j.erro || 'Não deu agora. Tente de novo.'); e.dados = j; throw e; }
    return j;
  }

  // Balões: o texto pode ter várias mensagens separadas por uma linha só com ---
  const baloes = txt => txt.split(/^\s*---\s*$/m).map(t => t.trim()).filter(Boolean);

  async function enviar() {
    const txt = $('resposta').value.trim();
    if (!txt || enviando || !aberta) return;
    if (/\[\[[^\]]*\]\]/.test(txt)) {
      $('aviso-envio').textContent = 'Complete os trechos entre [[ ]] (preço, link, vaga) antes de enviar.';
      $('aviso-envio').hidden = false;
      return;
    }
    enviando = true;
    $('enviar').setAttribute('disabled', '');
    $('aviso-envio').hidden = true;
    const id = aberta;
    const partes = baloes(txt);
    const mostrar = lista => (lista || []).forEach(m => {
      if (aberta !== id || !m.id || $('mensagens').querySelector('[data-id="' + m.id + '"]')) return;
      const dias = $('mensagens').querySelectorAll('.dia');
      adicionarMensagem({ id: m.id, direcao: 'saida', tipo: 'text', corpo: m.corpo, status_entrega: 'sent', enviada_em: m.enviada_em }, dias.length ? dias[dias.length - 1].textContent : '');
      rolarFim();
    });
    // O servidor manda um balão por vez, com "digitando…" no WhatsApp do cliente antes de cada um.
    $('enviar').textContent = partes.length > 1 ? 'Digitando… (' + partes.length + ')' : 'Digitando…';
    $('resposta').disabled = true;
    try {
      const j = await chamarApi('/api/enviar', { conversa_id: id, baloes: partes });
      mostrar(j.enviadas);
      $('resposta').value = '';
      $('sugestao').hidden = true;
    } catch (e) {
      const ja = (e.dados && e.dados.enviadas) || [];
      mostrar(ja);
      $('resposta').value = partes.slice(ja.length).join('\n---\n'); // sobra só o que não foi
      $('aviso-envio').textContent = e.message + (ja.length ? ' (' + ja.length + ' de ' + partes.length + ' balões já foram.)' : '');
      $('aviso-envio').hidden = false;
    } finally {
      $('enviar').textContent = 'Enviar';
      $('resposta').disabled = false;
      enviando = false;
      ajustarAltura();
      const c = conversas.find(x => x.id === aberta);
      pintarJanela(c);
      $('resposta').focus();
    }
  }
  $('enviar').addEventListener('click', enviar);

  // ---------- Sugestão do Gilberto ----------
  async function sugerir() {
    if (!aberta) return;
    const id = aberta;
    $('sugerir').setAttribute('disabled', '');
    $('sugerir').textContent = 'Pensando…';
    $('aviso-envio').hidden = true;
    try {
      const j = await chamarApi('/api/sugerir', { conversa_id: id });
      if (aberta !== id) return;
      const box = $('sug-texto');
      box.textContent = '';
      baloes(j.mensagem).forEach(t => { const d = document.createElement('div'); d.textContent = t; box.append(d); });
      $('sug-notas').textContent = (j.precisa_equipe ? '⚠ Caso para a equipe. ' : '') + (j.notas_internas ? 'Notas: ' + j.notas_internas : '');
      $('sug-notas').className = 'sug-notas' + (j.precisa_equipe ? ' alerta' : '');
      $('sug-modelo').textContent = /[[]{2}/.test(j.mensagem) ? 'complete os [[ ]] antes de enviar' : '';
      $('sugestao').dataset.texto = j.mensagem;
      $('sugestao').hidden = false;
    } catch (e) {
      $('aviso-envio').textContent = e.message;
      $('aviso-envio').hidden = false;
    } finally {
      $('sugerir').removeAttribute('disabled');
      $('sugerir').textContent = '✨ Sugerir';
    }
  }
  $('sugerir').addEventListener('click', sugerir);
  $('sug-usar').addEventListener('click', () => {
    const ta = $('resposta');
    ta.value = $('sugestao').dataset.texto || '';
    $('sugestao').hidden = true;
    ajustarAltura();
    ta.focus();
    const i = ta.value.indexOf('[['); // já seleciona o primeiro trecho para completar
    if (i >= 0) ta.setSelectionRange(i, ta.value.indexOf(']]', i) + 2);
  });
  // O campo cresce com o texto (até 45% da tela), para revisar a sugestão inteira
  function ajustarAltura() {
    const ta = $('resposta');
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight + 2, Math.round(innerHeight * 0.45)) + 'px';
  }
  $('resposta').addEventListener('input', ajustarAltura);
  $('sug-descartar').addEventListener('click', () => { $('sugestao').hidden = true; });
  $('resposta').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && matchMedia('(pointer:fine)').matches) { e.preventDefault(); enviar(); }
  });

  $('voltar').addEventListener('click', () => {
    aberta = null; $('tela-caixa').classList.remove('aberta'); $('conv').hidden = true; $('sem-conversa').hidden = false; pintarLista();
  });

  // ---------- Tempo real ----------
  function assinar() {
    if (canal) return;
    canal = sb.channel('caixa')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens' }, async ({ new: m }) => {
        let c = conversas.find(x => x.id === m.conversa_id);
        if (!c) { await carregarConversas(); c = conversas.find(x => x.id === m.conversa_id); }
        if (!c) return;
        c.previa = m;
        if (m.enviada_em > (c.ultima_msg_em || '')) c.ultima_msg_em = m.enviada_em;
        if (aberta === m.conversa_id) {
          const box = $('mensagens');
          if (!box.querySelector('[data-id="' + m.id + '"]')) {
            const dias = box.querySelectorAll('.dia');
            adicionarMensagem(m, dias.length ? dias[dias.length - 1].textContent : '');
            rolarFim();
          }
          if (m.direcao === 'entrada') { c.ultima_msg_cliente_em = m.enviada_em; pintarJanela(c); sb.rpc('marcar_conversa_lida', { p_conversa: c.id }); }
        }
        pintarLista();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversas' }, ({ new: row }) => {
        const c = row && conversas.find(x => x.id === row.id);
        if (!c) { carregarConversas(); return; }
        c.nao_lidas = aberta === c.id ? 0 : row.nao_lidas;
        c.ultima_msg_em = row.ultima_msg_em;
        c.ultima_msg_cliente_em = row.ultima_msg_cliente_em;
        if (aberta === c.id) pintarJanela(c);
        pintarLista();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensagens' }, ({ new: m }) => {
        const el = document.querySelector('.balao[data-id="' + m.id + '"] small');
        if (el && m.direcao === 'saida') el.textContent = hora(m.enviada_em) + (m.status_entrega ? ' · ' + (STATUS[m.status_entrega] || m.status_entrega) : '');
      })
      .subscribe((status, err) => {
        aoVivo = status === 'SUBSCRIBED';
        $('ao-vivo').className = 'ao-vivo' + (aoVivo ? '' : ' off');
        $('ao-vivo').textContent = aoVivo ? '● ao vivo' : '○ atualiza a cada 15 s';
        $('ao-vivo').title = aoVivo ? 'Mensagens novas aparecem na hora.' : 'Tempo real indisponível (' + status + (err ? ': ' + err.message : '') + ').';
        if (!aoVivo) console.warn('tempo real:', status, err);
      });
  }

  // ---------- Início ----------
  let estado = null; // quem está na tela agora (id do usuário ou 'anon'), para não iniciar duas vezes
  sb.auth.onAuthStateChange((evento, session) => {
    if (evento === 'SIGNED_OUT') { location.replace('/caixa'); return; }
    if (evento !== 'INITIAL_SESSION' && evento !== 'SIGNED_IN') return;
    const chave = session ? session.user.id : 'anon';
    if (chave === estado) return;
    estado = chave;
    setTimeout(() => iniciar(session), 0); // fora do callback, como pede o supabase-js
  });
})();
