// CRM Cabanas (etapa A do modelo): barra lateral com as seções, Conversas em 3 colunas (lista, conversa e
// painéis da conversa), ficha do cliente, montar orçamento e vagas. Lê o banco com o login da pessoa: as regras
// do banco (RLS) só liberam a equipe cadastrada em "usuarios"; o que grava passa pelo servidor do CRM.
// Todo texto de cliente entra na página por textContent (nunca como HTML).
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const cfg = window.CRM_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseKey || !window.supabase) {
    document.body.textContent = 'O CRM ainda não foi configurado (falta a chave pública do Supabase no servidor).';
    return;
  }
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    // implicit: o link do e-mail funciona mesmo se abrir em outro navegador do celular
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
  });
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } };
  const lido = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };

  // Cria elemento: el('div', {class:'x', text:'...', onclick}, filhos...)
  function el(tag, at, ...filhos) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(at || {})) {
      if (v == null || v === false) continue;
      if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'class') e.className = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    filhos.flat().forEach(f => { if (f != null && f !== false) e.append(f); });
    return e;
  }
  let toastT = null;
  function toast(t) { const x = $('toast'); x.textContent = t; x.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { x.hidden = true; }, 3500); }

  const telas = ['tela-entrar', 'tela-bloqueado', 'tela-caixa'];
  const mostrarTela = id => telas.forEach(t => ($(t).hidden = t !== id));

  let eu = null;               // {id, nome, papel} de quem está logado
  let equipe = {};             // id -> nome
  let conversas = [];          // [{id, nome, tel, email, obs, status, atribuida_a, nao_lidas, ultima_msg_em, ultima_msg_cliente_em, previa}]
  let aberta = null;           // id da conversa aberta
  let canal = null;
  let stAba = 'aberta', filtro = 'todas';
  let painel = lido('crm-painel') || '';

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
  const brl = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const iniciais = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
  const ROTULO = { image: '📷 Foto', audio: '🎤 Áudio', video: '🎬 Vídeo', document: '📄 Documento', sticker: 'Figurinha', location: '📍 Localização', contacts: '👤 Contato', reaction: 'Reação' };
  const textoMsg = m => {
    if (m.tipo === 'text' || m.tipo === 'button' || m.tipo === 'interactive') return m.corpo || '';
    const r = ROTULO[m.tipo] || ('[' + m.tipo + ']');
    return m.corpo ? r + ': ' + m.corpo : r;
  };
  const STATUS = { sent: '✓', delivered: '✓✓', read: '✓✓ lida', failed: '⚠ não entregue' };
  const janelaAberta = c => !!(c && c.ultima_msg_cliente_em) && Date.now() - new Date(c.ultima_msg_cliente_em).getTime() < 24 * 3600 * 1000;

  // ---------- Servidor do CRM (com o login da pessoa) ----------
  async function token() { const { data: { session } } = await sb.auth.getSession(); return session ? session.access_token : ''; }
  async function chamarApi(rota, corpo, metodo) {
    const r = await fetch(rota, {
      method: metodo || 'POST',
      headers: { ...(metodo === 'GET' ? {} : { 'Content-Type': 'application/json' }), Authorization: 'Bearer ' + (await token()) },
      body: metodo === 'GET' ? undefined : JSON.stringify(corpo || {}),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) { const e = new Error(j.erro || 'Não deu agora. Tente de novo.'); e.dados = j; throw e; }
    return j;
  }

  // ---------- Login ----------
  $('form-entrar').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('email').value.trim();
    const msg = $('msg-entrar');
    $('btn-entrar').setAttribute('disabled', '');
    msg.textContent = 'Enviando…';
    const pedir = () => sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + '/caixa' } });
    let { error } = await pedir();
    if (error && /signups not allowed|not found|invalid|not confirmed/i.test(error.message)) {
      // Pode ser alguém liberado na equipe que ainda não tem login: o servidor cria e confirma, e tentamos de novo
      await fetch('/entrar/preparar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }).catch(() => {});
      ({ error } = await pedir());
    }
    if (error) console.warn('login:', error.status, error.message);
    $('btn-entrar').removeAttribute('disabled');
    msg.textContent = !error ? 'Pronto! Abra o link que chegou no seu e-mail (veja também o spam). Só o link mais recente funciona.'
      : (error.status === 429 || /rate limit|security purposes|seconds/i.test(error.message))
        ? 'Muitos links pedidos em pouco tempo. O envio de e-mail gratuito do Supabase tem limite por hora: use o último link que chegou ou tente de novo mais tarde.'
        : /signups not allowed|not found|invalid/i.test(error.message)
          ? 'Este e-mail não tem acesso. Confira se digitou certo; se estiver certo, peça ao Ricardo para liberar (' + error.message + ').'
          : 'Não deu para enviar agora (' + error.message + '). Tente de novo em alguns minutos.';
  });
  // Código de conexão: quem já está logado gera no 📱 Conectar celular; serve para o CRM instalado no iPhone,
  // que não recebe o login do link do e-mail (o link abre no Safari)
  $('form-codigo').addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('msg-entrar'), codigo = $('codigo').value.replace(/\D/g, '');
    $('btn-codigo').setAttribute('disabled', ''); msg.textContent = 'Conferindo…';
    try {
      const r = await fetch('/entrar/aparelho', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.token_hash) throw new Error(r.status === 429 ? 'Muitas tentativas. Espere um minuto.' : j.erro || 'Não deu agora. Tente de novo.');
      let { error } = await sb.auth.verifyOtp({ token_hash: j.token_hash, type: 'magiclink' });
      if (error) ({ error } = await sb.auth.verifyOtp({ token_hash: j.token_hash, type: 'email' }));
      if (error) throw new Error('Não deu para entrar (' + error.message + '). Gere outro código.');
      msg.textContent = '';
    } catch (er) { msg.textContent = er.message; }
    $('btn-codigo').removeAttribute('disabled');
  });
  $('bt-conectar').addEventListener('click', async () => {
    try {
      const j = await chamarApi('/api/conectar-aparelho', {});
      const ate = new Date(j.expira).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      abrirForm('Conectar celular', [
        { tipo: 'nota', rotulo: 'No celular, abra o CRM pelo ícone da tela inicial e, na tela de entrada, digite este código no campo do código de conexão e toque em "Entrar com o código":' },
        { tipo: 'codigo', valor: j.codigo },
        { tipo: 'nota', rotulo: 'Vale até ' + ate + ' e só funciona uma vez. Ele entra com o seu usuário: não passe o código para outra pessoa.' },
      ], async () => {}, null, 'Pronto');
    } catch (e) { toast(e.message); }
  });
  const sair = async () => { await sb.auth.signOut(); location.replace('/caixa'); };
  $('sair').addEventListener('click', sair);
  $('sair-bloqueado').addEventListener('click', sair);

  const abrirAoEntrar = (location.hash.match(/^#c=([0-9a-f-]{36})$/i) || [])[1] || null; // veio de um aviso no celular
  async function iniciar(session) {
    if (location.hash || location.search) history.replaceState(null, '', '/caixa');
    if (!session) { mostrarTela('tela-entrar'); return; }
    const { data: meu } = await sb.from('usuarios').select('id,nome,papel').maybeSingle();
    if (!meu) { mostrarTela('tela-bloqueado'); return; }
    eu = meu;
    $('quem-nome').textContent = meu.nome;
    mostrarTela('tela-caixa');
    chamarApi('/api/equipe', null, 'GET').then(j => { equipe = Object.fromEntries(j.equipe.map(u => [u.id, u.nome])); preencherFiltrosEquipe(); if (aberta) pintarCabecalho(); carregarPlantao(); }).catch(() => { equipe = { [meu.id]: meu.nome }; preencherFiltrosEquipe(); carregarPlantao(); });
    await carregarGilAuto();
    carregarNumerosTeste();
    await carregarConversas();
    if (abrirAoEntrar) abrirDoAviso('#c=' + abrirAoEntrar);
    await carregarFunil();
    carregarQuentes();
    carregarRespostas();
    prepararAvisos();
    contarRevisao();
    assinar();
    vigiar();
    carregarVendasResumo();
    carregarAlertas();
    setInterval(pintarSino, 30000); // alerta com hora marcada (ex.: 8h do check-in) toca quando a hora chega
  }

  // ---------- Casca: seções, menu recolhido e tema ----------
  const SECOES = {
    conversas: ['Conversas'],
    funil: ['Funil'],
    tarefas: ['Tarefas'],
    produtos: ['Produtos'],
    agencias: ['Agências'],
    vagas: ['Vagas', 'O mapa de vagas completo depende do Silbeck real (ponte com o hotel). Por enquanto, as vagas aparecem no painel 🛏 de cada conversa.'],
    pagamentos: ['Pagamentos'],
    painel: ['Painel'],
    regua: ['Régua de mensagens', 'Mensagens automáticas antes e depois da estadia, com modelos aprovados pela Meta. Chega na etapa F, com o 99117.'],
    ajustes: ['Ajustes do agente'],
  };
  const PRONTAS = ['conversas', 'funil', 'tarefas', 'produtos', 'agencias', 'pagamentos', 'painel', 'ajustes'];
  function irPara(v) {
    document.querySelectorAll('.nav [data-vista]').forEach(x => x.setAttribute('aria-selected', String(x.dataset.vista === v)));
    const [titulo, texto] = SECOES[v];
    $('titulo').textContent = titulo;
    document.querySelectorAll('section[data-painel]').forEach(sec => { sec.hidden = sec.dataset.painel !== (PRONTAS.includes(v) ? v : 'em-breve'); });
    $('eb-titulo').textContent = titulo; $('eb-texto').textContent = texto || '';
    if (v === 'funil') pintarFunil();
    if (v === 'tarefas') pintarTarefas();
    if (v === 'produtos') carregarProdutos();
    if (v === 'agencias') carregarAgencias();
    if (v === 'painel') pintarPainelIndicadores();
    if (v === 'pagamentos') carregarPagamentos();
    if (v === 'ajustes') abrirSub(subAtual);
  }
  document.querySelector('.nav').addEventListener('click', e => { const b = e.target.closest('[data-vista]'); if (b) irPara(b.dataset.vista); });
  const recolher = r => { $('tela-caixa').classList.toggle('recolhido', r); $('bt-recolher').setAttribute('aria-expanded', String(!r)); guardar('crm-recolhido', r ? '1' : ''); };
  $('bt-recolher').addEventListener('click', () => recolher(!$('tela-caixa').classList.contains('recolhido')));
  if (lido('crm-recolhido') === '1') recolher(true);
  const TEMAS = [['', 'automático'], ['light', 'claro'], ['dark', 'escuro']];
  const aplicarTema = t => { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; $('bt-tema').textContent = 'Tema: ' + TEMAS.find(x => x[0] === t)[1]; };
  let tema = lido('crm-tema') || ''; aplicarTema(tema);
  $('bt-tema').addEventListener('click', () => { tema = TEMAS[(TEMAS.findIndex(x => x[0] === tema) + 1) % 3][0]; guardar('crm-tema', tema); aplicarTema(tema); });

  // ---------- Atualização (tempo real + rede de segurança) ----------
  // Versão nova publicada: recarrega sozinho (o app instalado no celular fica aberto em segundo plano e não recarregaria).
  // Não recarrega com resposta sendo digitada.
  const minhaVersao = ((document.querySelector('script[src*="caixa.js"]') || {}).src || '').split('v=')[1] || null;
  async function conferirVersao() {
    if (!minhaVersao || minhaVersao === 'local') return;
    const v = await fetch('/saude', { cache: 'no-store' }).then(r => r.json()).then(j => j.versao).catch(() => null);
    if (v && v !== minhaVersao && !($('resposta') && $('resposta').value.trim())) location.reload();
  }
  let aoVivo = false;
  async function atualizarTudo() { await carregarConversas(); await carregarFunil(); if (aberta) await recarregarAberta(); carregarAlertas(); carregarVendasResumo(); carregarQuentes(); }
  function vigiar() {
    setInterval(() => { if (!aoVivo && !document.hidden) atualizarTudo(); }, 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { atualizarTudo(); conferirVersao(); } });
    setInterval(conferirVersao, 10 * 60e3);
  }

  // ---------- Gilberto automático: interruptor geral e, em cada conversa, assumir / devolver ----------
  let gilAuto = false;
  async function carregarGilAuto() {
    const { data, error } = await sb.from('config').select('valor').eq('chave', 'gilberto_auto').maybeSingle();
    gilAuto = !error && !!(data && data.valor && data.valor.ligado);
    const b = $('gil-auto'); b.hidden = !!error;
    b.setAttribute('aria-pressed', String(gilAuto)); b.textContent = gilAuto ? '🤖 Automático: ligado' : 'Automático: desligado';
    $('gil-geral').textContent = gilAuto ? 'Desligar' : 'Ligar'; $('gil-geral').className = 'btn ' + (gilAuto ? 'btn-editar' : 'btn-enviar'); $('gil-geral').hidden = !!error;
    $('gil-geral-txt').textContent = error ? 'Falta rodar a migração 018 no Supabase.' : gilAuto ? 'Ligado: responde sozinho, reserva no Silbeck e manda o Pix. Em cada conversa, a equipe pode assumir.' : 'Desligado: o Gilberto só sugere, a equipe envia.';
    $('gil-modo').textContent = gilAuto ? 'Responde sozinho aos clientes, reserva e manda o Pix. A equipe assume quando quiser, em cada conversa.' : 'Modo sugestão: escreve as respostas e a equipe revisa antes de enviar.';
    if (aberta) pintarCabecalho();
  }
  const alternarGilAuto = async () => {
    const ligar = !gilAuto;
    if (ligar && !confirm('Ligar o Gilberto automático?\n\nEle vai responder sozinho a todas as conversas abertas (menos as que a equipe assumiu), reservar no Silbeck e mandar o Pix, sem aprovação.')) return;
    try { await chamarApi('/api/gilberto-auto', { ligado: ligar }); toast(ligar ? 'Gilberto automático ligado.' : 'Gilberto automático desligado: volta ao modo sugestão.'); carregarGilAuto(); }
    catch (e) { toast(e.message); }
  };
  $('gil-auto').addEventListener('click', alternarGilAuto); $('gil-geral').addEventListener('click', alternarGilAuto);
  function botaoGilberto(c) {
    if (!gilAuto || c.gilberto_pausado === undefined) return null;
    const pausado = !!c.gilberto_pausado;
    return el('button', { class: 'gil-conv' + (pausado ? ' pausado' : ''), type: 'button', title: pausado ? 'A equipe está atendendo esta conversa. Toque para o Gilberto voltar a responder.' : 'O Gilberto está respondendo sozinho. Toque para assumir o atendimento.',
      text: pausado ? '✋ Equipe atendendo · Devolver ao Gilberto' : '🤖 Gilberto atendendo · Assumir',
      onclick: async () => {
        try { await chamarApi('/api/conversa-gilberto', { conversa_id: c.id, pausado: !pausado }); c.gilberto_pausado = !pausado; pintarCabecalho(); pintarLista();
          toast(pausado ? 'Conversa devolvida ao Gilberto: ele responde a próxima mensagem do cliente.' : 'Você assumiu: o Gilberto não responde mais nesta conversa.'); }
        catch (e) { toast(e.message); }
      } });
  }

  // ---------- Números de teste da equipe: recomeçar a conversa do zero (para testar o Gilberto) ----------
  let numerosTeste = [];
  const chaveNumero = n => { let d = String(n || '').replace(/\D/g, ''); if (d.startsWith('55') && d.length >= 12) d = d.slice(2); if (d.length === 11 && d[2] === '9') d = d.slice(0, 2) + d.slice(3); return /^[1-9]{2}\d{8}$/.test(d) ? d : null; };
  const fmtChave = k => '(' + k.slice(0, 2) + ') 9' + k.slice(2, 6) + '-' + k.slice(6);
  async function carregarNumerosTeste() {
    const { data } = await sb.from('config').select('valor').eq('chave', 'numeros_teste').maybeSingle();
    numerosTeste = (data && data.valor && data.valor.numeros) || [];
    pintarNumerosTeste(); if (aberta) pintarCabecalho();
  }
  async function salvarNumerosTeste(lista) {
    try { const j = await chamarApi('/api/numeros-teste', { numeros: lista }); numerosTeste = j.numeros; pintarNumerosTeste(); if (aberta) pintarCabecalho(); toast('Números de teste salvos.'); }
    catch (e) { toast(e.message); }
  }
  function pintarNumerosTeste() {
    const box = $('nt-lista'); box.textContent = '';
    numerosTeste.forEach(k => box.append(el('span', { class: 'nt-num' }, fmtChave(k), el('button', { type: 'button', 'aria-label': 'Tirar ' + fmtChave(k), text: '×', onclick: () => salvarNumerosTeste(numerosTeste.filter(x => x !== k)) }))));
    const inp = el('input', { type: 'tel', placeholder: '67 99999-0000', 'aria-label': 'Número de teste' });
    box.append(inp, el('button', { class: 'btn btn-editar', type: 'button', text: '+ Incluir', onclick: () => { const k = chaveNumero(inp.value); if (!k) return toast('Use DDD + número (ex.: 67 99999-0000).'); salvarNumerosTeste([...numerosTeste, k]); } }));
  }
  function botaoRecomecar(c) {
    if (!c.wa || !numerosTeste.includes(chaveNumero(c.wa))) return null;
    return el('button', { class: 'btn-mini', type: 'button', text: '↺ Recomeçar (teste)', title: 'Apaga esta conversa de teste para começar do zero', onclick: async () => {
      if (!confirm('Recomeçar a conversa de teste de ' + c.nome + '?\n\nApaga as mensagens, o negócio no funil, orçamentos, Pix e reservas de teste desta conversa. Não dá para desfazer.')) return;
      try { await chamarApi('/api/recomecar-conversa', { conversa_id: c.id }); toast('Conversa apagada. A próxima mensagem desse número começa do zero.'); voltar(); aberta = null; await carregarConversas(); carregarFunil(); }
      catch (e) { toast(e.message); }
    } });
  }

  // ---------- Lista de conversas ----------
  async function carregarConversas() {
    let comPausa = true;
    const sel = campos => sb.from('conversas').select(`id,numero_id,status,atribuida_a,nao_lidas,ultima_msg_em,ultima_msg_cliente_em${comPausa ? ',gilberto_pausado' : ''},contato:contatos(${campos},contato_identificadores(tipo,valor))`)
      .order('ultima_msg_em', { ascending: false, nullsFirst: false }).limit(300);
    let { data, error } = await sel('nome,email,observacoes');
    if (error) { comPausa = false; ({ data, error } = await sel('nome,email,observacoes')); } // banco sem a migração 021
    if (error) ({ data, error } = await sel('nome,observacoes')); // banco sem a migração 007
    if (error) { $('cx-lista').textContent = ''; $('cx-lista').append(el('div', { class: 'vazio', text: 'Não consegui carregar as conversas. Recarregue a página.' })); return; }
    const ids = data.map(c => c.id);
    const previas = {};
    if (ids.length) {
      const { data: ult } = await sb.from('mensagens').select('conversa_id,tipo,corpo,direcao,enviada_em').in('conversa_id', ids).order('enviada_em', { ascending: false }).limit(600);
      (ult || []).forEach(m => { if (!previas[m.conversa_id]) previas[m.conversa_id] = m; });
    }
    conversas = data.map(c => {
      const idn = (c.contato && c.contato.contato_identificadores) || [];
      const wa = idn.find(i => i.tipo === 'whatsapp');
      const tel = wa ? fmtTel(wa.valor) : '';
      const ct = c.contato || {};
      return { id: c.id, numero_id: c.numero_id, wa: wa ? wa.valor : '', gilberto_pausado: c.gilberto_pausado, nome: ct.nome || tel || 'Sem nome', nomeSalvo: ct.nome || '', tel, email: ct.email, obs: ct.observacoes || '', status: c.status, atribuida_a: c.atribuida_a,
        nao_lidas: c.nao_lidas, ultima_msg_em: c.ultima_msg_em, ultima_msg_cliente_em: c.ultima_msg_cliente_em, previa: previas[c.id] || null };
    });
    pintarLista();
    if (aberta) pintarCabecalho();
  }

  function pintarLista() {
    const ul = $('cx-lista');
    ul.textContent = '';
    const nl = conversas.filter(c => c.nao_lidas > 0 && c.status === 'aberta').length;
    $('qtd-conv').hidden = !nl; $('qtd-conv').textContent = nl;
    const q = $('cx-busca').value.trim().toLowerCase();
    let ls = conversas.filter(c => c.status === stAba);
    if (q) ls = ls.filter(c => c.nome.toLowerCase().includes(q) || c.tel.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§'));
    if (filtro === 'naolidas') ls = ls.filter(c => c.nao_lidas > 0);
    if (filtro === 'minhas') ls = ls.filter(c => eu && c.atribuida_a === eu.id);
    if (filtro === 'janela') ls = ls.filter(c => !janelaAberta(c));
    if (filtro === 'quentes') ls = ls.filter(c => quente(c));
    // Quem abriu o orçamento há pouco sobe na lista (sem som e sem sino: é oportunidade, não urgência)
    const chave = c => { const q = quente(c); return q && Date.parse(q.quando) > Date.parse(c.ultima_msg_em || 0) ? new Date(q.quando).toISOString() : (c.ultima_msg_em ? new Date(c.ultima_msg_em).toISOString() : ''); };
    ls.sort((a, b) => chave(b).localeCompare(chave(a)));
    if (!ls.length) ul.append(el('div', { class: 'vazio', text: conversas.length ? 'Nenhuma conversa aqui.' : 'Nenhuma conversa ainda. Quando alguém mandar mensagem para o número do hotel, ela aparece aqui na hora.' }));
    ls.forEach(c => {
      const resp = c.atribuida_a ? (equipe[c.atribuida_a] || 'Equipe') : null;
      const n = negocioDaConversa(c.id), al = alertasVencidos().find(a => a.conversa_id === c.id), vd = vendasResumo[c.id];
      const et = n && ETAPAS.find(e => e[0] === n.etapa);
      ul.append(el('button', { class: 'cx-item' + (al ? ' urgente' : ''), type: 'button', 'aria-selected': String(c.id === aberta), onclick: () => abrir(c.id) },
        al ? el('div', { class: 'cx-urg' }, el('span', { text: '⚑ ' + al.titulo }), el('small', { text: desde(al.quando) })) : null,
        el('div', { class: 'cx-l1' }, el('span', { class: 'canal-ic', title: 'WhatsApp', text: 'WA' }), el('strong', { text: c.nome }), el('span', { class: 'cx-hora num', text: quando(c.ultima_msg_em) }),
          c.nao_lidas > 0 && c.id !== aberta ? el('span', { class: 'cx-nl num', text: c.nao_lidas, 'aria-label': c.nao_lidas + ' não lidas' }) : null),
        el('div', { class: 'cx-prev', text: c.previa ? (c.previa.direcao === 'saida' ? 'Você: ' : '') + textoMsg(c.previa) : '' }),
        n || vd ? el('div', { class: 'cx-l2' },
          n ? el('span', { class: 'pilula o-' + n.origem, title: 'Origem do lead', text: ORIGENS[n.origem] || n.origem }) : null,
          et ? el('span', { class: 'pilula ' + et[2], title: 'Etapa no funil', text: et[1] }) : null,
          etiquetaProdutos(vd), ...((n && n.etiquetas) || []).map(t => el('span', { class: 'tipo t-mkt', text: t }))) : null,
        quente(c) ? el('div', { class: 'cx-quente', text: '🔥 ' + quente(c).txt + ' · ' + desde(quente(c).quando) }) : null,
        !janelaAberta(c) && c.status === 'aberta' ? el('div', { class: 'cx-janela', text: 'A janela de 24 h expirou' }) : null,
        el('div', { class: 'cx-l3' }, el('span', { class: 'resp', text: resp ? iniciais(resp) : '–' }), el('span', { text: resp ? resp : 'Sem responsável' }))));
    });
  }
  // ---------- Clientes quentes: sinal de interesse real nas últimas 24 h (dono, 04/10/2026) ----------
  // Abrir o link logo depois do envio é o normal e não conta. Conta: voltou ao orçamento 2 h ou mais depois da
  // 1ª abertura, ou tocou em "Quero reservar" e não mandou a mensagem; e não escreveu depois disso.
  let quentes = {}; // conversa_id -> orçamento mais recente com atividade
  async function carregarQuentes() {
    const dia = new Date(Date.now() - 864e5).toISOString();
    const { data, error } = await sb.from('orcamentos').select('conversa_id,criado_em,ultima_abertura_em,aberto_primeira_vez_em,aberturas,escolhida_em')
      .or(`ultima_abertura_em.gte.${dia},escolhida_em.gte.${dia}`).order('criado_em', { ascending: false }).limit(300);
    if (error) return;
    const q = {}; (data || []).forEach(o => { if (o.conversa_id && !q[o.conversa_id]) q[o.conversa_id] = o; });
    quentes = q; pintarLista();
  }
  function sinalQuente(o, ultimaDoCliente, agora = Date.now()) {
    const t = x => x ? Date.parse(x) : 0, dia = agora - 864e5, calado = x => t(ultimaDoCliente) < t(x);
    if (t(o.escolhida_em) > dia && calado(o.escolhida_em)) return { quando: o.escolhida_em, txt: 'tocou em "Quero reservar" e não mandou a mensagem' };
    if (t(o.ultima_abertura_em) > dia && t(o.ultima_abertura_em) - t(o.aberto_primeira_vez_em) >= 2 * 3600e3 && calado(o.ultima_abertura_em))
      return { quando: o.ultima_abertura_em, txt: 'voltou ao orçamento' + (o.aberturas > 1 ? ' (' + o.aberturas + 'ª vez)' : '') };
    return null;
  }
  function quente(c) {
    const o = quentes[c.id]; if (!o || c.status !== 'aberta') return null;
    const n = negocioDaConversa(c.id);
    return n && ['res', 'perd'].includes(n.etapa) ? null : sinalQuente(o, c.ultima_msg_cliente_em);
  }
  $('cx-busca').addEventListener('input', pintarLista);
  document.querySelector('.cx-abas').addEventListener('click', e => {
    const b = e.target.closest('[data-st]'); if (!b) return;
    stAba = b.dataset.st;
    document.querySelectorAll('.cx-abas [data-st]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    pintarLista();
  });
  $('cx-filtros').addEventListener('click', e => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    filtro = b.dataset.f;
    document.querySelectorAll('#cx-filtros [data-f]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    pintarLista();
  });

  // ---------- Conversa aberta ----------
  async function buscarMensagens(id) {
    const q = campos => sb.from('mensagens').select(campos).eq('conversa_id', id).order('enviada_em', { ascending: true }).limit(500);
    let r = await q('id,direcao,autor,tipo,corpo,status_entrega,enviada_em,transcricao,transcricao_status');
    if (r.error) r = await q('id,direcao,autor,tipo,corpo,status_entrega,enviada_em');
    return r.data;
  }
  async function abrir(id) {
    aberta = id;
    $('sugestao').hidden = true; $('galeria').hidden = true; $('aviso-envio').hidden = true;
    $('cx').classList.add('aberta');
    $('cx-chat').hidden = false; $('cx-trilho').hidden = false;
    pintarCabecalho();
    $('mensagens').textContent = 'Carregando…';
    const data = await buscarMensagens(id);
    if (aberta !== id) return;
    $('mensagens').textContent = '';
    let ultimoDia = '';
    (data || []).forEach(m => { ultimoDia = adicionarMensagem(m, ultimoDia); });
    rolarFim();
    if (matchMedia('(max-width:900px)').matches) requestAnimationFrame(() => $('cx-chat').scrollIntoView({ block: 'start' })); // celular: mensagens na tela; dados do cliente logo acima
    pintarOrcamentos(id);
    pintarPainel();
    avisoExtras(id);
    const c = conversas.find(x => x.id === id);
    if (c && c.nao_lidas) { c.nao_lidas = 0; sb.rpc('marcar_conversa_lida', { p_conversa: id }); }
    pintarLista();
  }
  async function recarregarAberta() {
    const id = aberta;
    const data = await buscarMensagens(id);
    if (aberta !== id || !data) return;
    const box = $('mensagens');
    const perto = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.textContent = '';
    let ultimoDia = '';
    data.forEach(m => { ultimoDia = adicionarMensagem(m, ultimoDia); });
    if (perto) rolarFim();
    pintarOrcamentos(id);
  }
  function voltar() {
    aberta = null; $('cx').classList.remove('aberta');
    $('cx-chat').hidden = true; $('cx-trilho').hidden = true; $('cx-lateral').hidden = true; $('cx').classList.remove('com-painel', 'painel-largo');
    $('cx-cab').textContent = ''; $('cx-cab').append(el('div', { class: 'sem-conversa', text: 'Escolha uma conversa à esquerda.' }));
    pintarLista();
  }

  // Cabeçalho: nome (editável), telefone, janela de 24 h, situação e responsável
  async function salvarConversa(campos, msgOk) {
    try { await chamarApi('/api/conversa', { conversa_id: aberta, ...campos }); if (msgOk) toast(msgOk); await carregarConversas(); }
    catch (e) { toast(e.message); }
  }
  function pintarCabecalho() {
    const c = conversas.find(x => x.id === aberta);
    const cab = $('cx-cab'); cab.textContent = '';
    if (!c) return;
    const fim = c.ultima_msg_cliente_em ? new Date(new Date(c.ultima_msg_cliente_em).getTime() + 24 * 3600 * 1000) : null;
    const aj = janelaAberta(c);
    const nomeBox = el('div', { class: 'nome' }, el('strong', { text: c.nome }),
      el('button', { class: 'lapis', type: 'button', 'aria-label': 'Editar o nome do cliente', title: 'Editar o nome', text: '✎', onclick: () => {
        const inp = el('input', { class: 'nome-edit', value: c.nomeSalvo, 'aria-label': 'Nome do cliente', placeholder: 'Nome do cliente' });
        const ok = () => { const v = inp.value.trim(); if (v !== c.nomeSalvo) salvarConversa({ nome: v }, 'Nome salvo.'); else pintarCabecalho(); };
        inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') ok(); if (ev.key === 'Escape') pintarCabecalho(); });
        inp.addEventListener('blur', ok);
        nomeBox.replaceChildren(inp); inp.focus();
      } }));
    const stSel = el('select', { 'aria-label': 'Situação da conversa', onchange: ev => salvarConversa({ status: ev.target.value }, ev.target.value === 'aberta' ? 'Conversa reaberta.' : 'Conversa marcada como ' + ev.target.value + '.') },
      [['aberta', 'Aberta'], ['resolvida', 'Resolvida'], ['arquivada', 'Arquivada']].map(([v, t]) => el('option', { value: v, text: t, selected: v === c.status })));
    const opcoes = [['', 'Sem responsável'], ...Object.entries(equipe)];
    if (c.atribuida_a && !equipe[c.atribuida_a]) opcoes.push([c.atribuida_a, 'Equipe']);
    const rSel = el('select', { 'aria-label': 'Responsável', onchange: ev => salvarConversa({ atribuida_a: ev.target.value || null }, ev.target.value ? 'Conversa com ' + (equipe[ev.target.value] || 'a equipe') + '.' : 'Conversa sem responsável.') },
      opcoes.map(([v, t]) => el('option', { value: v, text: t, selected: (c.atribuida_a || '') === v })));
    cab.append(
      el('button', { class: 'voltar', type: 'button', 'aria-label': 'Voltar para a lista', text: '←', onclick: voltar }),
      el('div', { class: 'cx-quem' }, nomeBox, linhaContato(c)),
      el('div', { class: 'cx-ctrl' },
        seletorEtapaConversa(c),
        fim ? el('span', { class: 'pilula ' + (aj ? 'p-ok' : 'p-erro'), title: aj ? 'Dá para responder com texto livre até esse horário.' : 'Fora da janela, só modelos aprovados pela Meta.',
          text: aj ? 'Responder até ' + (fim.toDateString() !== new Date().toDateString() ? 'amanhã ' : '') + hora(fim.toISOString()) : 'Janela 24 h fechada' }) : null,
        stSel, rSel, botaoGilberto(c), botaoRecomecar(c)));
    // Composição: só com a janela aberta
    $('cx-compor').hidden = !aj; $('cx-fechada').hidden = aj;
  }

  // WhatsApp e e-mail do cliente no cabeçalho, com ✎ para inserir ou corrigir
  function linhaContato(c) {
    const campo = (rotulo, valor, salvar, tipo, travado) => {
      const box = el('span', { class: 'dado' });
      const mostrar = () => box.replaceChildren(...[rotulo + ': ', valor ? el('b', { text: valor }) : el('em', { class: 'vazio-dado', text: 'inserir' }),
        travado ? null : el('button', { class: 'lapis', type: 'button', 'aria-label': (valor ? 'Editar ' : 'Inserir ') + rotulo, text: '✎', onclick: editar })].filter(Boolean));
      const editar = () => {
        const inp = el('input', { class: 'nome-edit', type: tipo, value: valor || '', 'aria-label': rotulo, placeholder: tipo === 'email' ? 'nome@exemplo.com' : '67 99999-0000' });
        let feito = false;
        const ok = async () => { if (feito) return; feito = true; const v = inp.value.trim(); if (v === (valor || '')) { mostrar(); return; } try { await salvar(v); } catch (e) { toast(e.message); mostrar(); } };
        inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') ok(); if (ev.key === 'Escape') { feito = true; mostrar(); } });
        inp.addEventListener('blur', ok);
        box.replaceChildren(rotulo + ': ', inp); inp.focus();
      };
      mostrar();
      return box;
    };
    return el('div', { class: 'cx-contato' },
      campo('WhatsApp', c.tel, async v => { await chamarApi('/api/contato', { conversa_id: c.id, telefone: v }); toast('WhatsApp salvo.'); await carregarConversas(); pintarCabecalho(); }, 'tel', !!c.tel),
      c.email === undefined ? null : campo('E-mail', c.email, async v => { await salvarConversa({ email: v }, 'E-mail salvo.'); }, 'email', false));
  }

  // ---------- Nova conversa (ou fora da janela de 24 h): modelo aprovado pela Meta ----------
  let numerosWa = null;
  const modelosCache = {};
  async function abrirNovaConversa(conv) {
    $('f-tit').textContent = conv ? 'Enviar modelo pelo WhatsApp' : 'Iniciar conversa pelo WhatsApp';
    const box = $('f-campos'); box.textContent = '';
    const fechar = () => { $('f-fundo').hidden = true; $('form-modal').hidden = true; };
    box.append(el('p', { class: 'aviso-modelo largo', text: conv ? 'Já se passaram mais de 24 h desde a última mensagem do cliente: a Meta só aceita um modelo aprovado. Quando ele responder, a conversa abre e você escreve livremente.' : 'Contato novo (ou que não fala com o hotel há mais de 24 h): a primeira mensagem precisa ser um modelo aprovado pela Meta. Quando o cliente responder, a conversa abre e você escreve livremente.' }));
    const esq = el('div', { class: 'nc-esq' }), dir = el('div', { class: 'nc-dir' }, el('span', { class: 'rotulo', text: 'Prévia da mensagem' }));
    const previa = el('div', { class: 'nc-previa' }, el('div', { class: 'nc-balao', text: 'Escolha o modelo.' }));
    dir.append(previa); box.append(esq, dir);
    const tel = el('input', { type: 'tel', placeholder: '(67) 99999-9999', value: conv ? conv.tel : '', disabled: !!conv });
    const nome = el('input', { type: 'text', placeholder: 'Ex.: Ana Souza', value: conv ? conv.nomeSalvo : '', disabled: !!conv });
    const num = el('select', { disabled: !!conv }, el('option', { value: '', text: 'Carregando…' }));
    const mod = el('select', {}, el('option', { value: '', text: 'Escolha o número primeiro' }));
    const info = el('p', { class: 'lat-txt' }), vars = el('div', { class: 'nc-vars' });
    if (!conv) esq.append(el('label', { class: 'campo' }, 'Celular (WhatsApp) *', el('div', { class: 'nc-tel' }, el('span', { text: '🇧🇷 +55' }), tel)), el('label', { class: 'campo' }, 'Nome do contato', nome), el('label', { class: 'campo' }, 'Enviar pelo número', num));
    esq.append(el('label', { class: 'campo' }, 'Modelo da mensagem', mod), info, vars,
      el('button', { class: 'btn-mini', type: 'button', text: '+ Cadastrar novo modelo', onclick: () => cadastrarModelo(num.value || (conv && conv.numero_id)) }));
    const enviar = el('button', { class: 'btn btn-enviar', type: 'button', text: 'Enviar mensagem', disabled: true });
    $('f-acoes').replaceChildren(el('button', { class: 'btn btn-editar', type: 'button', text: 'Cancelar', onclick: fechar }), enviar);
    $('f-fundo').hidden = false; $('form-modal').hidden = false; $('f-fundo').onclick = fechar;
    let modelos = [];
    const atual = () => modelos.find(m => m.nome + '|' + m.idioma === mod.value);
    const pintarPrevia = () => {
      const m = atual(); vars.textContent = '';
      if (!m) { previa.firstChild.textContent = 'Escolha o modelo.'; enviar.disabled = true; info.textContent = ''; return; }
      const ins = [];
      for (let i = 1; i <= m.variaveis; i++) {
        const v = el('input', { type: 'text', value: i === 1 ? ((nome.value || '').split(/\s+/)[0] || '') : '', placeholder: i === 1 ? 'Primeiro nome do cliente' : 'Valor de {{' + i + '}}' });
        v.addEventListener('input', pintarTexto); ins.push(v);
        vars.append(el('label', { class: 'campo' }, 'Variável {{' + i + '}}' + (i === 1 ? ' (nome)' : ''), v));
      }
      vars._ins = ins;
      info.className = 'nc-info ' + (m.status === 'APPROVED' && m.suportado ? 'ok' : 'alerta');
      info.textContent = m.status !== 'APPROVED' ? 'Ainda não aprovado pela Meta (situação: ' + m.status + ').' : !m.suportado ? 'Modelo com imagem ou botão com variável: ainda não dá para enviar pelo CRM.' : 'Modelo aprovado pela Meta · categoria ' + ({ UTILITY: 'Utilidade (mais barata)', MARKETING: 'Marketing', AUTHENTICATION: 'Autenticação' }[m.categoria] || m.categoria);
      pintarTexto();
    };
    function pintarTexto() {
      const m = atual(); if (!m) return;
      const vs = (vars._ins || []).map(i => i.value.trim());
      previa.firstChild.textContent = [m.cabecalho, m.corpo.replace(/\{\{(\d+)\}\}/g, (x, n) => vs[n - 1] || x), m.rodape].filter(Boolean).join('\n\n');
      enviar.disabled = !(m.status === 'APPROVED' && m.suportado && vs.every(Boolean) && (conv || tel.value.replace(/\D/g, '').length >= 10) && (conv || num.value));
    }
    nome.addEventListener('input', () => { const i = (vars._ins || [])[0]; if (i && !i.dataset.mexeu) { i.value = (nome.value || '').split(/\s+/)[0]; pintarTexto(); } });
    tel.addEventListener('input', pintarTexto);
    vars.addEventListener('input', e => { e.target.dataset.mexeu = '1'; });
    const carregarModelos = async id => {
      mod.replaceChildren(el('option', { value: '', text: 'Carregando os modelos…' }));
      try {
        modelos = modelosCache[id] || (modelosCache[id] = (await chamarApi('/api/modelos?numero_id=' + encodeURIComponent(id), null, 'GET')).modelos);
        mod.replaceChildren(el('option', { value: '', text: modelos.length ? 'Escolha o modelo' : 'Nenhum modelo nesta conta: cadastre um' }),
          ...modelos.map(m => el('option', { value: m.nome + '|' + m.idioma, text: m.nome.replace(/_/g, ' ') + ' · ' + ({ UTILITY: 'Utilidade', MARKETING: 'Marketing' }[m.categoria] || m.categoria) + (m.status === 'APPROVED' ? '' : ' (' + (m.status === 'PENDING' ? 'em análise' : m.status.toLowerCase()) + ')') })));
        const ap = modelos.find(m => m.status === 'APPROVED' && m.suportado);
        if (ap) mod.value = ap.nome + '|' + ap.idioma;
      } catch (e) { mod.replaceChildren(el('option', { value: '', text: 'Erro' })); info.className = 'nc-info alerta'; info.textContent = e.message; }
      pintarPrevia();
    };
    mod.addEventListener('change', pintarPrevia);
    num.addEventListener('change', () => num.value && carregarModelos(num.value));
    enviar.onclick = async () => {
      const m = atual(); if (!m) return;
      enviar.disabled = true; enviar.textContent = 'Enviando…';
      try {
        const j = await chamarApi('/api/iniciar-conversa', conv ? { conversa_id: conv.id, modelo: m.nome, idioma: m.idioma, variaveis: vars._ins.map(i => i.value) }
          : { telefone: tel.value, nome: nome.value, numero_id: num.value, modelo: m.nome, idioma: m.idioma, variaveis: vars._ins.map(i => i.value) });
        fechar(); toast('Mensagem enviada. Quando o cliente responder, a conversa abre para texto livre.');
        await carregarConversas(); irPara('conversas'); abrir(j.conversa_id);
      } catch (e) { toast(e.message); enviar.textContent = 'Enviar mensagem'; pintarTexto(); }
    };
    // Números do hotel
    if (conv) { if (conv.numero_id) carregarModelos(conv.numero_id); return; }
    try { numerosWa = numerosWa || (await chamarApi('/api/numeros', null, 'GET')).numeros; } catch (e) { numerosWa = []; }
    num.replaceChildren(...(numerosWa.length ? numerosWa.map(n => el('option', { value: n.id, text: n.numero ? 'WhatsApp +' + n.numero : 'Número ' + n.id })) : [el('option', { value: '', text: 'Nenhum número ligado ao CRM' })]));
    if (numerosWa.length) carregarModelos(numerosWa[0].id);
  }
  function cadastrarModelo(numeroId) {
    if (!numeroId) { toast('Escolha o número primeiro.'); return; }
    abrirForm('Cadastrar modelo na Meta', [
      { tipo: 'nota', rotulo: 'O modelo vai para a análise da Meta (de minutos a 24 h). Use {{1}} para o nome do cliente, {{2}}, {{3}}… para outros dados. Utilidade (avisos, retorno de contato) é mais barata que Marketing (promoções).' },
      { k: 'nome', rotulo: 'Nome do modelo', dica: 'retorno_de_contato', largo: true },
      { k: 'categoria', rotulo: 'Categoria', tipo: 'select', valor: 'UTILITY', opcoes: [['UTILITY', 'Utilidade (mais barata)'], ['MARKETING', 'Marketing']] },
      { k: 'texto', rotulo: 'Texto', tipo: 'textarea', largo: true, valor: 'Olá, {{1}}! Aqui é a equipe do Hotel Cabanas 🌿 Recebemos seu contato e vamos continuar seu atendimento por aqui. Podemos seguir?' },
    ], async v => {
      const j = await chamarApi('/api/modelo', { numero_id: numeroId, nome: v.nome, categoria: v.categoria, texto: v.texto });
      delete modelosCache[numeroId];
      toast('Modelo "' + j.nome + '" enviado para a análise da Meta. Quando for aprovado, aparece na lista.');
    }, null, 'Enviar para análise');
  }
  $('cx-nova-conversa').addEventListener('click', () => abrirNovaConversa(null));
  $('cx-enviar-modelo').addEventListener('click', () => { const c = conversas.find(x => x.id === aberta); if (c) abrirNovaConversa(c); });

  function adicionarMensagem(m, ultimoDia) {
    const box = $('mensagens');
    const d = dia(m.enviada_em);
    if (d !== ultimoDia) box.append(el('div', { class: 'dia', text: d }));
    const saida = m.direcao === 'saida', ia = m.autor === 'gilberto';
    const b = el('div', { class: 'balao ' + (saida ? 'saida' : 'entrada') + (ia ? ' ia' : ''), 'data-id': m.id });
    if (saida) b.append(el('div', { class: 'autor', text: ia ? 'Gilberto' : (equipe[m.autor] || 'Equipe') }));
    if (m.tipo === 'text' || m.tipo === 'button' || m.tipo === 'interactive') b.append(linkar(m.corpo || ''));
    else if (COM_ARQUIVO.has(m.tipo)) {
      const caixa = el('span', { class: 'midia', 'data-midia': m.id, 'data-tipo': m.tipo }, el('span', { class: 'm-status', text: ROTULO[m.tipo] + '…' }));
      b.append(caixa);
      if (m.corpo) b.append(el('span', { class: 'legenda', text: m.corpo }));
      vigiarMidia(caixa);
      if (m.tipo === 'audio' && !saida) { const t = el('span', { class: 'transcricao', 'data-transcricao': m.id }); b.append(t); pintarTranscricao(t, m); }
    } else b.append(el('em', { text: textoMsg(m) }));
    b.append(el('small', { text: hora(m.enviada_em) + (saida && m.status_entrega ? ' · ' + (STATUS[m.status_entrega] || m.status_entrega) : '') }));
    box.append(b);
    return d;
  }
  // Links do orçamento viram clicáveis (abrem a prévia, que não conta como abertura do cliente)
  function linkar(t) {
    const re = /(https:\/\/[\w.-]+\/o\/[A-Za-z0-9_-]{22})/;
    if (!re.test(t)) return t;
    const f = document.createDocumentFragment();
    t.split(re).forEach((p, i) => f.append(i % 2 ? el('a', { href: p + '?previa=1', target: '_blank', rel: 'noopener', class: 'link-orc', text: p }) : p));
    return f;
  }
  const rolarFim = () => { const box = $('mensagens'); box.scrollTop = box.scrollHeight; };
  $('mensagens').addEventListener('scroll', () => { const box = $('mensagens'); $('ir-fim').hidden = box.scrollHeight - box.scrollTop - box.clientHeight < 120; });
  $('ir-fim').addEventListener('click', () => $('mensagens').scrollTo({ top: $('mensagens').scrollHeight, behavior: 'smooth' }));
  function manterNoFim() { const box = $('mensagens'); if (box.scrollHeight - box.scrollTop - box.clientHeight < 400) rolarFim(); }
  const ultimoDiaTela = () => { const dias = $('mensagens').querySelectorAll('.dia'); return dias.length ? dias[dias.length - 1].textContent : ''; };

  // ---------- Orçamentos da conversa (abertura e escolha do cliente) ----------
  let orcsCache = [];
  async function pintarOrcamentos(id) {
    const box = $('orcs');
    const { data, error } = await sb.from('orcamentos').select('id,token,fonte,opcoes,aberturas,ultima_abertura_em,escolhida,criado_em,data_entrada,data_saida,adultos,criancas_idades')
      .eq('conversa_id', id).order('criado_em', { ascending: false }).limit(10);
    if (aberta !== id) return;
    orcsCache = error ? [] : data || [];
    box.textContent = '';
    box.hidden = !orcsCache.length;
    orcsCache.slice(0, 2).forEach(o => box.append(linhaOrcamento(o)));
    if (painel === 'his') pintarPainel();
  }
  function linhaOrcamento(o) {
    const nomes = (o.opcoes || []).map(x => x.nome);
    const esc = (o.opcoes || []).find(x => x.codigo === o.escolhida);
    return el('div', {}, el('a', { href: '/o/' + o.token + '?previa=1', target: '_blank', rel: 'noopener', text: '📄 Orçamento de ' + dia(o.criado_em).slice(0, 5) + (o.fonte === 'simulador' ? ' (teste)' : '') }),
      ' · ' + nomes.join(', ') + ' · ' + (esc ? '✅ cliente escolheu ' + esc.nome : o.aberturas ? '👀 aberto ' + o.aberturas + 'x (última ' + quando(o.ultima_abertura_em) + ')' : 'ainda não aberto'));
  }

  // ---------- Fotos, vídeos, áudios e documentos ----------
  const COM_ARQUIVO = new Set(['image', 'video', 'audio', 'document', 'sticker']);
  const arquivos = new Map(); // id da mensagem -> Promise<{url, nome, mime}>
  const observador = 'IntersectionObserver' in window
    ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { observador.unobserve(e.target); carregarMidia(e.target); } }), { rootMargin: '300px' })
    : null;
  const vigiarMidia = x => (observador ? observador.observe(x) : carregarMidia(x));
  function buscarArquivo(id) {
    if (!arquivos.has(id)) {
      const p = (async () => {
        const r = await fetch('/api/midia/' + id, { headers: { Authorization: 'Bearer ' + (await token()) } });
        if (!r.ok) { const j = await r.json().catch(() => ({})); const e = new Error(j.erro || 'Não deu para abrir.'); e.http = r.status; throw e; }
        const nome = (/filename="([^"]+)"/.exec(r.headers.get('content-disposition') || '') || [])[1] || 'arquivo';
        const blob = await r.blob();
        return { url: URL.createObjectURL(blob), nome, mime: blob.type };
      })();
      p.catch(() => arquivos.delete(id));
      arquivos.set(id, p);
    }
    return arquivos.get(id);
  }
  async function carregarMidia(caixa) {
    const tipo = caixa.dataset.tipo;
    let a;
    try { a = await buscarArquivo(caixa.dataset.midia); } catch (e) {
      const st = caixa.querySelector('.m-status');
      if (st) {
        st.textContent = ROTULO[tipo] + (e.http === 404 ? ' (arquivo não guardado)' : ' · toque para tentar de novo');
        if (e.http !== 404) st.onclick = () => { st.onclick = null; st.textContent = ROTULO[tipo] + '…'; carregarMidia(caixa); };
      }
      return;
    }
    caixa.textContent = '';
    const baixar = texto => el('a', { href: a.url, download: a.nome, class: 'm-baixar', text: texto });
    if ((tipo === 'image' || tipo === 'sticker') && /^image\//.test(a.mime)) {
      caixa.append(el('img', { src: a.url, alt: tipo === 'sticker' ? 'Figurinha' : 'Foto', onclick: () => window.open(a.url, '_blank', 'noopener'), onload: manterNoFim }));
    } else if (tipo === 'video' && /^video\//.test(a.mime)) {
      const v = el('video', { src: a.url, controls: true, preload: 'metadata', playsinline: true, onloadedmetadata: manterNoFim });
      caixa.append(v, baixar('Baixar vídeo'));
    } else if (tipo === 'audio' && /^audio\//.test(a.mime)) {
      // O áudio do WhatsApp é .ogg; alguns iPhones antigos não tocam: o link de baixar fica como reserva.
      caixa.append(el('audio', { src: a.url, controls: true, preload: 'metadata' }), baixar('Baixar áudio'));
    } else caixa.append(baixar('📄 ' + a.nome));
  }

  // Transcrição dos áudios do cliente: mostra o texto; se ainda não há, pede ao servidor quando o balão aparece.
  function pintarTranscricao(x, m) {
    const st = m.transcricao_status;
    x.classList.remove('pendente');
    if (st === 'ok' && m.transcricao) x.textContent = '📝 ' + m.transcricao;
    else if (st === 'longo') x.textContent = '📝 Áudio longo demais para transcrever (mais de 8 min): ouça acima.';
    else if (st === 'vazio') x.textContent = '📝 Não deu para reconhecer fala neste áudio.';
    else if (st === 'erro') x.textContent = '📝 Transcrição indisponível agora.';
    else if (st === undefined) x.textContent = ''; // banco sem a migração 005
    else { x.textContent = '📝 Transcrevendo…'; x.classList.add('pendente'); observadorT ? observadorT.observe(x) : pedirTranscricao(x); }
  }
  const observadorT = 'IntersectionObserver' in window
    ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { observadorT.unobserve(e.target); pedirTranscricao(e.target); } }), { rootMargin: '200px' })
    : null;
  const pedidas = new Set();
  async function pedirTranscricao(x) {
    const id = x.dataset.transcricao;
    if (pedidas.has(id)) return;
    pedidas.add(id);
    try {
      const j = await chamarApi('/api/transcrever', { mensagem_id: id });
      document.querySelectorAll('[data-transcricao="' + id + '"]').forEach(y => pintarTranscricao(y, { transcricao: j.texto, transcricao_status: j.status === 'falhou' ? 'erro' : j.status }));
    } catch (e) { x.textContent = '📝 Transcrição indisponível agora.'; x.classList.remove('pendente'); }
    finally { setTimeout(() => pedidas.delete(id), 60000); }
  }

  // ---------- Enviar texto (balões separados por uma linha só com ---) ----------
  let enviando = false;
  const baloes = txt => txt.split(/^\s*[-–—]{2,}[-–—\s]*$/m).map(t => t.trim()).filter(t => t && !/^[-–—\s]+$/.test(t));
  function aviso(t) { $('aviso-envio').textContent = t || ''; $('aviso-envio').hidden = !t; }
  function travar(sim, rotulo) {
    enviando = sim;
    $('resposta').disabled = sim;
    $('enviar').toggleAttribute('disabled', sim);
    $('enviar').textContent = sim ? rotulo : 'Enviar';
  }
  async function enviar() {
    const txt = $('resposta').value.trim();
    if (!txt || enviando || !aberta) return;
    if (/\[\[[^\]]*\]\]/.test(txt)) { aviso('Complete os trechos entre [[ ]] (preço, link, vaga) antes de enviar.'); return; }
    aviso('');
    const id = aberta, partes = baloes(txt);
    const mostrar = lista => (lista || []).forEach(m => {
      if (aberta !== id || !m.id || $('mensagens').querySelector('[data-id="' + m.id + '"]')) return;
      adicionarMensagem({ id: m.id, direcao: 'saida', autor: eu && eu.id, tipo: 'text', corpo: m.corpo, status_entrega: 'sent', enviada_em: m.enviada_em }, ultimoDiaTela());
      rolarFim();
    });
    // O servidor manda um balão por vez, com "digitando…" no WhatsApp do cliente antes de cada um.
    travar(true, partes.length > 1 ? 'Digitando… (' + partes.length + ')' : 'Digitando…');
    try {
      const j = await chamarApi('/api/enviar', { conversa_id: id, baloes: partes });
      mostrar(j.enviadas);
      if (sugestaoEmUso && sugestaoEmUso.conversa === id) {
        const igual = sugestaoEmUso.texto.trim() === txt;
        chamarApi('/api/sugestao', { id: sugestaoEmUso.id, situacao: 'usada', motivo: igual ? 'Enviada sem mudanças' : 'Enviada com edição da equipe' }).then(r => { contarRevisao(); if (r.oferta) toast('Oferta do Gilberto registrada: ' + r.oferta + '.'); }).catch(() => {});
        sugestaoEmUso = null;
      }
      $('resposta').value = '';
      $('sugestao').hidden = true;
    } catch (e) {
      const ja = (e.dados && e.dados.enviadas) || [];
      mostrar(ja);
      $('resposta').value = partes.slice(ja.length).join('\n---\n');
      aviso(e.message + (ja.length ? ' (' + ja.length + ' de ' + partes.length + ' balões já foram.)' : ''));
    } finally { travar(false); ajustarAltura(); $('resposta').focus(); }
  }
  $('enviar').addEventListener('click', enviar);
  function ajustarAltura() { const ta = $('resposta'); ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, Math.round(innerHeight * 0.45)) + 'px'; }
  $('resposta').addEventListener('input', () => { ajustarAltura(); verAtalho(); });
  $('resposta').addEventListener('keydown', e => {
    if (!$('atalhos').hidden && atalhoItens.length) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); atalhoIdx = (atalhoIdx + (e.key === 'ArrowDown' ? 1 : -1) + atalhoItens.length) % atalhoItens.length; pintarAtalhos(); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); escolherAtalho(atalhoItens[atalhoIdx]); return; }
      if (e.key === 'Escape') { $('atalhos').hidden = true; return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && matchMedia('(pointer:fine)').matches) { e.preventDefault(); enviar(); }
  });
  $('resposta').title = 'No computador, Enter envia e Shift+Enter quebra a linha. Uma linha só com --- separa os balões.';

  // ---------- Enviar arquivo (📎) ----------
  $('anexar').addEventListener('click', () => { if (!enviando && aberta) $('arquivo').click(); });
  $('arquivo').addEventListener('change', async () => { const f = $('arquivo').files[0]; $('arquivo').value = ''; if (f) await enviarArquivo(f); });
  async function prepararFoto(f) {
    if (/^image\/(jpeg|png)$/.test(f.type) && f.size <= 5 * 1024 * 1024) return f;
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 2560 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.85));
    if (!blob) throw new Error('Não consegui preparar a foto.');
    return new File([blob], f.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  }
  async function enviarArquivo(f0) {
    if (enviando || !aberta) return;
    const legenda = $('resposta').value.trim();
    if (/\[\[[^\]]*\]\]/.test(legenda)) { aviso('Complete os trechos entre [[ ]] da legenda antes de enviar.'); return; }
    if (baloes(legenda).length > 1) { aviso('A legenda vai junto com o arquivo, num balão só: tire as linhas com ---.'); return; }
    let f = f0;
    if (/^image\//.test(f.type)) { try { f = await prepararFoto(f); } catch (e) { aviso('Este formato de foto não deu para enviar. Use JPG ou PNG.'); return; } }
    if (f.size > 16 * 1024 * 1024) { aviso('Arquivo grande demais (máximo 16 MB).'); return; }
    const id = aberta;
    aviso('');
    travar(true, 'Enviando arquivo…');
    try {
      const q = new URLSearchParams({ conversa_id: id, nome: f.name || 'arquivo', legenda });
      const r = await fetch('/api/enviar-midia?' + q, { method: 'POST', body: f, headers: { 'Content-Type': f.type || 'application/octet-stream', Authorization: 'Bearer ' + (await token()) } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.erro || 'Não deu para enviar o arquivo. Tente de novo.');
      if (j.id) arquivos.set(j.id, Promise.resolve({ url: URL.createObjectURL(f), nome: f.name, mime: f.type }));
      if (aberta === id && j.id && !$('mensagens').querySelector('[data-id="' + j.id + '"]')) {
        adicionarMensagem({ id: j.id, direcao: 'saida', autor: eu && eu.id, tipo: j.tipo, corpo: j.corpo, status_entrega: 'sent', enviada_em: j.enviada_em }, ultimoDiaTela());
        rolarFim();
      }
      $('resposta').value = '';
    } catch (e) { aviso(e.message); } finally { travar(false); ajustarAltura(); }
  }

  // ---------- Banco de fotos do hotel (galeria) e fotos sugeridas pelo Gilberto ----------
  async function enviarFotos(lista) {
    if (!aberta || !lista.length || enviando) return false;
    const id = aberta;
    const mostrar = env => (env || []).forEach(m => {
      if (!m.id) return;
      arquivos.set(m.id, Promise.resolve({ url: '/fotos/' + m.arquivo, nome: m.arquivo, mime: 'image/jpeg' }));
      if (aberta !== id || $('mensagens').querySelector('[data-id="' + m.id + '"]')) return;
      adicionarMensagem({ id: m.id, direcao: 'saida', autor: eu && eu.id, tipo: 'image', corpo: m.corpo, status_entrega: 'sent', enviada_em: m.enviada_em }, ultimoDiaTela());
      rolarFim();
    });
    aviso('');
    travar(true, 'Enviando fotos…');
    try { const j = await chamarApi('/api/enviar-fotos', { conversa_id: id, fotos: lista }); mostrar(j.enviadas); return true; }
    catch (e) { mostrar(e.dados && e.dados.enviadas); aviso(e.message); return false; }
    finally { travar(false); }
  }
  let biblioteca = null;
  // modo: 'enviar' (escolher e mandar), 'gerenciar' (tirar/devolver fotos), 'drive' (trazer do banco de imagens)
  const gal = { cat: '', sel: [], modo: 'enviar', pasta: null, drive: null };
  async function carregarBiblioteca() { biblioteca = (await chamarApi('/api/fotos', null, 'GET')).grupos; }
  async function abrirGaleria() {
    if (!$('galeria').hidden) { fecharGaleria(); return; }
    $('galeria').hidden = false; $('abrir-fotos').setAttribute('aria-expanded', 'true');
    gal.sel = []; gal.modo = 'enviar';
    $('gal-grade').textContent = 'Carregando…';
    try { await carregarBiblioteca(); } catch (e) { $('gal-grade').textContent = e.message; return; }
    pintarGaleria();
  }
  function fecharGaleria() { $('galeria').hidden = true; $('abrir-fotos').setAttribute('aria-expanded', 'false'); }
  const gruposVisiveis = () => biblioteca.filter(g => gal.modo !== 'enviar' || g.fotos.length);
  function pintarGaleria() {
    if (gal.modo === 'drive') return pintarDrive();
    const cats = $('gal-cats'), grade = $('gal-grade'), gerenciar = gal.modo === 'gerenciar';
    cats.textContent = ''; grade.textContent = '';
    $('gal-gerenciar').textContent = gerenciar ? '✓ Concluir' : '⚙ Gerenciar';
    $('gal-cont').textContent = gerenciar ? 'Tire fotos da categoria ou traga outras do Drive.' : 'Fotos reais do hotel. Toque para escolher (até 5).';
    $('gal-enviar').hidden = gerenciar;
    const grupos = gruposVisiveis();
    if (!grupos.length) { grade.append(el('p', { class: 'lat-txt', text: 'A biblioteca de fotos ainda está vazia.' })); $('gal-sel').textContent = ''; return; }
    if (!grupos.some(g => g.grupo === gal.cat)) gal.cat = grupos[0].grupo;
    grupos.forEach(g => cats.append(el('button', { class: 'chip', type: 'button', 'aria-pressed': String(g.grupo === gal.cat), text: g.nome + (gerenciar ? ' (' + g.fotos.length + ')' : ''), onclick: () => { gal.cat = g.grupo; pintarGaleria(); } })));
    const g = grupos.find(x => x.grupo === gal.cat);
    if (gerenciar) {
      grade.append(el('button', { class: 'gal-item gal-novo', type: 'button', onclick: () => abrirDrive(null) }, el('span', { class: 'gal-mais', text: '+' }), el('span', { class: 'gal-nome', text: 'Trazer do Drive' })));
      g.fotos.forEach(f => grade.append(el('div', { class: 'gal-item' }, el('img', { src: '/fotos/' + f.arquivo, alt: f.descricao || g.nome, loading: 'lazy' }),
        el('span', { class: 'gal-nome', text: f.descricao || g.nome }),
        el('button', { class: 'btn-mini gal-tirar', type: 'button', text: '✕ Tirar', onclick: () => mudarFoto(f, false) }))));
      (g.removidas || []).forEach(f => grade.append(el('div', { class: 'gal-item fora' }, el('img', { src: '/fotos/' + f.arquivo, alt: f.descricao || g.nome, loading: 'lazy' }),
        el('span', { class: 'gal-nome', text: 'Fora da biblioteca · ' + (f.descricao || g.nome) }),
        el('button', { class: 'btn-mini gal-tirar', type: 'button', text: '↩ Devolver', onclick: () => mudarFoto(f, true) }))));
      $('gal-sel').textContent = g.fotos.length + ' foto(s) em ' + g.nome + '. A página do orçamento mostra as 5 primeiras.';
      return;
    }
    g.fotos.forEach(f => {
      const on = gal.sel.includes(f.arquivo);
      grade.append(el('button', { class: 'gal-item', type: 'button', 'aria-pressed': String(on), title: f.descricao || g.nome, onclick: () => {
        if (on) gal.sel = gal.sel.filter(x => x !== f.arquivo); else if (gal.sel.length < 5) gal.sel.push(f.arquivo); else toast('Máximo de 5 fotos por envio.');
        pintarGaleria();
      } }, el('img', { src: '/fotos/' + f.arquivo, alt: f.descricao || g.nome, loading: 'lazy' }), on ? el('span', { class: 'gal-n', text: String(gal.sel.indexOf(f.arquivo) + 1) }) : null,
      el('span', { class: 'gal-nome', text: f.descricao || g.nome })));
    });
    $('gal-sel').textContent = gal.sel.length ? gal.sel.length + ' selecionada(s)' : 'Nenhuma selecionada';
    $('gal-enviar').toggleAttribute('disabled', !gal.sel.length);
    $('gal-enviar').textContent = gal.sel.length > 1 ? 'Enviar ' + gal.sel.length + ' fotos' : 'Enviar';
  }
  async function mudarFoto(f, ativo) {
    if (!ativo && !confirm('Tirar esta foto da biblioteca? Ela deixa de aparecer no envio, na página do orçamento e para o Gilberto. Dá para devolver depois.')) return;
    try { await chamarApi('/api/foto-status', { arquivo: f.arquivo, ativo }); await carregarBiblioteca(); gal.sel = gal.sel.filter(x => x !== f.arquivo); pintarGaleria(); toast(ativo ? 'Foto devolvida à biblioteca.' : 'Foto tirada da biblioteca.'); }
    catch (e) { toast(e.message); }
  }
  // ----- Trazer do Drive (banco de imagens do hotel) -----
  const miniaturas = new Map();
  function miniatura(id) {
    if (!miniaturas.has(id)) {
      const p = (async () => {
        const r = await fetch('/api/drive/miniatura/' + id, { headers: { Authorization: 'Bearer ' + (await token()) } });
        if (!r.ok) throw new Error('sem miniatura');
        return URL.createObjectURL(await r.blob());
      })();
      p.catch(() => miniaturas.delete(id));
      miniaturas.set(id, p);
    }
    return miniaturas.get(id);
  }
  async function abrirDrive(pasta) {
    gal.modo = 'drive'; gal.pasta = pasta; gal.drive = null;
    pintarDrive();
    try { gal.drive = await chamarApi('/api/drive' + (pasta ? '?pasta=' + encodeURIComponent(pasta) : ''), null, 'GET'); }
    catch (e) { gal.drive = { erro: e.message }; }
    if (gal.modo === 'drive' && gal.pasta === pasta) pintarDrive();
  }
  function pintarDrive() {
    const cats = $('gal-cats'), grade = $('gal-grade'), d = gal.drive;
    const cat = biblioteca.find(g => g.grupo === gal.cat);
    cats.textContent = ''; grade.textContent = '';
    $('gal-gerenciar').textContent = '← Voltar';
    $('gal-cont').textContent = 'Banco de imagens (Drive) → ' + (cat ? cat.nome : '') + '. Toque na foto para trazer.';
    $('gal-enviar').hidden = true; $('gal-sel').textContent = '';
    if (!d) { grade.textContent = 'Abrindo o Drive…'; return; }
    if (d.erro) { grade.append(el('p', { class: 'lat-txt', text: d.erro })); return; }
    if (!d.pasta.raiz) cats.append(el('button', { class: 'chip', type: 'button', text: '↑ ' + (d.pasta.pai ? 'Pasta de cima' : 'Início'), onclick: () => abrirDrive(d.pasta.pai) }));
    cats.append(el('span', { class: 'gal-pasta', text: '📁 ' + d.pasta.nome }));
    d.pastas.forEach(p => grade.append(el('button', { class: 'gal-item gal-novo', type: 'button', onclick: () => abrirDrive(p.id) }, el('span', { class: 'gal-mais', text: '📁' }), el('span', { class: 'gal-nome', text: p.nome }))));
    d.fotos.forEach(f => {
      const img = el('img', { alt: f.nome, loading: 'lazy' });
      miniatura(f.id).then(u => { img.src = u; }).catch(() => { img.alt = 'Sem miniatura: ' + f.nome; });
      grade.append(el('button', { class: 'gal-item', type: 'button', title: f.nome, onclick: () => formTrazer(f) }, img,
        el('span', { class: 'gal-nome', text: f.na_biblioteca.length ? 'Já na biblioteca: ' + f.na_biblioteca.join(', ') : f.nome })));
    });
    if (!d.pastas.length && !d.fotos.length) grade.append(el('p', { class: 'lat-txt', text: 'Pasta vazia.' }));
  }
  function formTrazer(f) {
    abrirForm('Trazer foto do Drive', [
      { k: 'grupo', rotulo: 'Categoria', tipo: 'select', valor: gal.cat, opcoes: biblioteca.map(g => [g.grupo, g.nome]) },
      { k: 'descricao', rotulo: 'O que aparece na foto', tipo: 'textarea', largo: true, dica: 'Ex.: Varanda da Cabana Casal com rede, vista para a mata. O Gilberto usa esta descrição para escolher o que mandar.' },
      { k: 'etiquetas', rotulo: 'Palavras-chave (separadas por vírgula)', dica: 'varanda, rede, mata', largo: true },
      { k: 'decoracao', rotulo: 'Mostra a decoração especial (pétalas, balões): opcional e cobrada à parte', tipo: 'check' },
    ], async v => {
      toast('Trazendo a foto do Drive…');
      const j = await chamarApi('/api/foto', { drive_id: f.id, grupo: v.grupo, descricao: v.descricao, etiquetas: v.etiquetas.split(','), decoracao: v.decoracao });
      await carregarBiblioteca();
      gal.cat = j.foto.grupo; gal.modo = 'gerenciar'; pintarGaleria();
      toast('Foto adicionada em ' + ((biblioteca.find(g => g.grupo === j.foto.grupo) || {}).nome || 'categoria') + '.');
    });
  }
  $('gal-gerenciar').addEventListener('click', () => { gal.modo = gal.modo === 'enviar' ? 'gerenciar' : (gal.modo === 'drive' ? 'gerenciar' : 'enviar'); gal.sel = []; pintarGaleria(); });
  $('abrir-fotos').addEventListener('click', abrirGaleria);
  $('gal-fechar').addEventListener('click', fecharGaleria);
  $('gal-enviar').addEventListener('click', async () => { if (await enviarFotos(gal.sel.slice())) { fecharGaleria(); toast('Fotos enviadas pelo WhatsApp.'); } });
  $('sug-fotos-enviar').addEventListener('click', async () => {
    const b = $('sug-fotos-enviar');
    const lista = JSON.parse($('sug-fotos').dataset.fotos || '[]');
    b.setAttribute('disabled', '');
    const ok = await enviarFotos(lista);
    b.textContent = ok ? 'Fotos enviadas ✓' : 'Enviar estas fotos';
    if (!ok) b.removeAttribute('disabled');
  });

  // ---------- Sugestão do Gilberto ----------
  async function sugerir() {
    if (!aberta) return;
    const id = aberta;
    $('sugerir').setAttribute('disabled', ''); $('sugerir').textContent = '✨ Pensando…';
    aviso('');
    try {
      const j = await chamarApi('/api/sugerir', { conversa_id: id });
      if (j.aviso_revisao) toast(j.aviso_revisao);
      else contarRevisao();
      if (aberta !== id) return;
      const box = $('sug-texto'); box.textContent = '';
      baloes(j.mensagem).forEach(t => box.append(el('div', {}, linkar(t))));
      $('sug-notas').textContent = (j.simulador ? '⚠ Valores do SIMULADOR do Silbeck (fictícios): não envie a clientes reais. ' : '') + (j.precisa_equipe ? '⚠ Caso para a equipe. ' : '') + (j.notas_internas ? 'Notas: ' + j.notas_internas : '');
      $('sug-notas').className = 'sug-notas' + (j.precisa_equipe || j.simulador ? ' alerta' : '');
      $('sug-modelo').textContent = /\[\[/.test(j.mensagem) ? 'complete os [[ ]] antes de enviar' : '';
      $('sugestao').dataset.texto = j.mensagem;
      $('sugestao').dataset.reserva = j.reserva ? JSON.stringify(j.reserva) : '';
      $('sugestao').dataset.pagamento = j.pagamento ? JSON.stringify(j.pagamento) : '';
      $('sugestao').dataset.sugestao = j.sugestao_id || '';
      $('sug-motivos').hidden = true;
      const fl = $('sug-fotos-lista'); fl.textContent = '';
      (j.fotos || []).forEach(f => fl.append(el('img', { src: '/fotos/' + f.arquivo, alt: f.descricao || 'Foto do hotel', title: f.descricao || '' })));
      $('sug-fotos').hidden = !(j.fotos && j.fotos.length);
      $('sug-fotos').dataset.fotos = JSON.stringify((j.fotos || []).map(f => f.arquivo));
      $('sug-fotos-enviar').removeAttribute('disabled');
      $('sug-fotos-enviar').textContent = (j.fotos || []).length > 1 ? 'Enviar estas ' + j.fotos.length + ' fotos' : 'Enviar esta foto';
      $('sugestao').hidden = false;
      if (j.orcamentos && j.orcamentos.length) pintarOrcamentos(id);
    } catch (e) { aviso(e.message); }
    finally { $('sugerir').removeAttribute('disabled'); $('sugerir').textContent = '✨ Sugerir resposta'; }
  }
  $('sugerir').addEventListener('click', sugerir);
  let sugestaoEmUso = null; // {id, texto}: marcada como "usada" quando o texto for enviado
  $('sug-usar').addEventListener('click', async () => {
    const ta = $('resposta');
    let texto = $('sugestao').dataset.texto || '';
    // Aceite: só agora, com a aprovação da equipe, o CRM cria a reserva (não confirmada) no Silbeck e o Pix,
    // e troca o [[PIX]] pelo Pix de verdade. Cartão: a reserva é criada e fica a tarefa do link da Cielo.
    const lerDs = k => { try { return $('sugestao').dataset[k] ? JSON.parse($('sugestao').dataset[k]) : null; } catch (e) { return null; } };
    const reserva = lerDs('reserva'), pg = lerDs('pagamento');
    if (reserva && pg && confirm('Reservar no Silbeck (não confirmada, aguardando pagamento):\n' + reserva.acomodacao + ' · ' + reserva.periodo + '\nTitular: ' + reserva.titular + '\n\n' +
        (pg.forma === 'pix' ? 'E gerar o Pix de ' + brl(pg.valor) + ' (' + pg.descricao + ')?' : 'O link do cartão de ' + brl(pg.valor) + ' a equipe gera na Cielo (fica uma tarefa).'))) {
      try {
        const j = await chamarApi('/api/fechar-reserva', { conversa_id: aberta, ...reserva, forma: pg.forma, percentual: pg.percentual, origem: 'gilberto' });
        if (j.cobranca) texto = texto.replace('[[PIX]]', textoPix(j.cobranca));
        toast('Reserva ' + j.reserva.silbeck_id + ' criada no Silbeck (não confirmada)' + (j.simulador ? ' · SIMULADOR' : '') + (j.cobranca ? '. Pix gerado: revise e envie.' : '. Gere o link na Cielo e cole no lugar de [[link do cartão]].'));
        if (painel === 'res') pintarPainel();
      } catch (e) { toast(e.message); }
    } else if (!reserva && pg && pg.forma === 'pix' && pg.reserva_id && texto.includes('[[PIX]]') && confirm('Gerar um novo Pix de ' + brl(pg.valor) + ' (' + pg.descricao + ')?')) {
      try {
        const j = await chamarApi('/api/cobranca', { conversa_id: aberta, tipo: pg.tipo, valor: pg.valor, descricao: pg.descricao, reserva_id: pg.reserva_id });
        texto = texto.replace('[[PIX]]', textoPix(j.cobranca));
        toast('Pix gerado. Revise a mensagem e envie.');
        if (painel === 'res') pintarPainel();
      } catch (e) { toast(e.message); }
    }
    ta.value = texto;
    if ($('sugestao').dataset.sugestao) sugestaoEmUso = { id: $('sugestao').dataset.sugestao, texto: ta.value, conversa: aberta };
    $('sugestao').hidden = $('sug-fotos').hidden; // se houver fotos sugeridas, o painel fica para enviá-las
    $('sug-texto').textContent = ''; $('sug-notas').textContent = '';
    ajustarAltura(); ta.focus();
    const i = ta.value.indexOf('[['); // já seleciona o primeiro trecho para completar
    if (i >= 0) ta.setSelectionRange(i, ta.value.indexOf(']]', i) + 2);
  });
  $('sug-descartar').addEventListener('click', () => {
    if (!$('sugestao').dataset.sugestao) { $('sugestao').hidden = true; return; }
    $('sug-motivos').hidden = false; // pede o motivo (ajuda a treinar o Gilberto)
  });
  $('sug-motivos').addEventListener('click', e => {
    const b = e.target.closest('[data-motivo]'); if (!b) return;
    const id = $('sugestao').dataset.sugestao;
    $('sugestao').hidden = true; $('sug-motivos').hidden = true;
    if (id) chamarApi('/api/sugestao', { id, situacao: 'descartada', motivo: b.dataset.motivo }).then(contarRevisao).catch(() => {});
    toast('Sugestão descartada. O motivo vai para a revisão.');
  });

  // ---------- Painéis da conversa (trilho à direita) ----------
  const TITULOS = { his: 'Ficha e histórico', orc: 'Montar orçamento', pro: 'Produtos', vag: 'Vagas por acomodação', res: 'Reservas e pagamentos', tar: 'Tarefas do cliente' };
  $('bt-produtos').addEventListener('click', () => { painel = 'pro'; guardar('crm-painel', painel); pintarPainel(); });
  $('cx-trilho').addEventListener('click', e => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    painel = painel === b.dataset.p ? '' : b.dataset.p;
    guardar('crm-painel', painel);
    pintarPainel();
  });
  function pintarPainel() {
    const lat = $('cx-lateral');
    document.querySelectorAll('#cx-trilho [data-p]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.p === painel)));
    $('cx').classList.toggle('com-painel', !!painel && !!aberta);
    $('cx').classList.toggle('painel-largo', painel === 'vag' || painel === 'orc');
    lat.hidden = !painel || !aberta;
    lat.textContent = '';
    if (lat.hidden) return;
    const c = conversas.find(x => x.id === aberta);
    lat.append(el('div', { class: 'lat-cab' }, el('h3', { text: TITULOS[painel] }), el('button', { class: 'fechar', type: 'button', 'aria-label': 'Fechar painel', text: '✕', onclick: () => { painel = ''; guardar('crm-painel', ''); pintarPainel(); } })));
    if (painel === 'his') painelFicha(lat, c);
    if (painel === 'orc') painelOrcamento(lat, c);
    if (painel === 'vag') painelVagas(lat);
    if (painel === 'res') painelPagamentos(lat, c);
    if (painel === 'tar') painelTarefas(lat, c);
    if (painel === 'pro') painelProdutos(lat, c);
  }

  function painelFicha(lat, c) {
    if (!c) return;
    const nome = el('input', { value: c.nomeSalvo, placeholder: 'Nome do cliente' });
    const email = el('input', { type: 'email', value: c.email || '', placeholder: 'email@exemplo.com', disabled: c.email === undefined });
    const obs = el('textarea', { placeholder: 'O que a equipe precisa saber (ocasião, preferências, restrições)…' }); obs.value = c.obs;
    lat.append(el('span', { class: 'rotulo', text: 'Ficha do cliente' }),
      el('label', { class: 'campo' }, 'Nome', nome),
      el('label', { class: 'campo' }, 'WhatsApp', el('input', { value: c.tel, disabled: true })),
      el('label', { class: 'campo' }, 'E-mail' + (c.email === undefined ? ' (falta a migração 007 no banco)' : ''), email),
      el('label', { class: 'campo' }, 'Observações', obs),
      el('button', { class: 'btn btn-enviar', type: 'button', text: 'Salvar ficha', onclick: () => salvarConversa({ nome: nome.value, ...(c.email !== undefined ? { email: email.value } : {}), observacoes: obs.value }, 'Ficha salva.') }));
    lat.append(el('span', { class: 'rotulo', text: 'Origem' }), el('p', { class: 'lat-txt', text: 'WhatsApp (número de teste do CRM).' }));
    lat.append(el('span', { class: 'rotulo', text: 'Orçamentos' }));
    if (!orcsCache.length) lat.append(el('p', { class: 'lat-txt', text: 'Nenhum orçamento ainda. Use 🧾 Montar orçamento ou ✨ Sugerir resposta.' }));
    orcsCache.forEach(o => lat.append(el('div', { class: 'lat-card' }, linhaOrcamento(o))));
    lat.append(el('span', { class: 'rotulo', text: 'Estadias e reservas' }), el('p', { class: 'lat-txt', text: 'As reservas do Silbeck aparecem aqui quando a ponte com o hotel estiver ligada.' }));
  }

  // Montar orçamento: datas e pessoas → cotação no Silbeck → opções marcadas → link da página no campo de resposta
  const orcForm = { entrada: '', saida: '', adultos: 2, idades: '' };
  function painelOrcamento(lat, c) {
    const hoje = new Date().toISOString().slice(0, 10);
    const ent = el('input', { type: 'date', min: hoje, value: orcForm.entrada }), sai = el('input', { type: 'date', min: hoje, value: orcForm.saida });
    const ad = el('input', { type: 'number', min: '1', max: '16', value: orcForm.adultos });
    const idd = el('input', { type: 'text', inputmode: 'numeric', placeholder: 'ex.: 3, 7', value: orcForm.idades });
    const res = el('div', { class: 'acoes', style: 'flex-direction:column;gap:6px' });
    const ler = () => ({ data_entrada: ent.value, data_saida: sai.value, adultos: Number(ad.value), idades_criancas: idd.value.split(/[,;\s]+/).filter(Boolean).map(Number) });
    const cotar = async () => {
      Object.assign(orcForm, { entrada: ent.value, saida: sai.value, adultos: ad.value, idades: idd.value });
      const p = ler();
      if (!p.data_entrada || !p.data_saida) { toast('Escolha a entrada e a saída.'); return; }
      if (p.idades_criancas.some(n => !Number.isInteger(n) || n < 0 || n > 17)) { toast('Idades das crianças: números de 0 a 17, separados por vírgula.'); return; }
      res.textContent = 'Consultando o Silbeck…';
      try {
        const r = await chamarApi('/api/cotar', { ...p, finalidade: 'cotacao' });
        res.textContent = '';
        if (r.atencao) res.append(el('div', { class: 'aviso-sim', text: '⚠ ' + r.atencao }));
        if (!r.opcoes.length) { res.append(el('p', { class: 'lat-txt', text: 'Sem vaga para esse grupo nessas datas.' + (r.aviso ? ' ' + r.aviso : '') })); return; }
        if (r.opcoes.some(o => o.combinacao)) res.append(el('p', { class: 'lat-txt', text: 'O grupo vai em mais de uma acomodação: estas são as combinações com vaga (a divisão de quem fica onde aparece na página do orçamento).' }));
        const marcadas = []; let sugerida = '';
        r.opcoes.slice().sort((a, b) => Number(a.valor_total) - Number(b.valor_total)).forEach(o => { // da mais em conta para a maior
          const cb = el('input', { type: 'checkbox', onchange: ev => {
            if (ev.target.checked) marcadas.push(o.codigo); else marcadas.splice(marcadas.indexOf(o.codigo), 1);
            criar.toggleAttribute('disabled', !marcadas.length);
            criar.textContent = marcadas.length ? 'Criar orçamento com ' + marcadas.length + (marcadas.length > 1 ? ' opções' : ' opção') : 'Marque as opções do orçamento';
          } });
          const sug = el('label', { class: 'op-sug', title: 'Recebe o selo "Nossa sugestão para vocês" na página' }, el('input', { type: 'radio', name: 'sug-' + c.id, onchange: () => { sugerida = o.codigo; if (!cb.checked) cb.click(); } }), '⭐ sugestão');
          res.append(el('label', { class: 'op-cot' }, cb, el('span', {}, el('b', { text: o.nome }), el('small', { text: o.combinacao ? o.acomodacoes.map(x => x.nome + ': ' + x.adultos + ' ad.' + ((x.idades_criancas || []).length ? ' + ' + x.idades_criancas.length + ' cr.' : '')).join(' · ') : o.vagas_no_periodo + ' vaga(s) · até ' + o.capacidade + ' pessoas' })), el('span', { class: 'pr' }, brl(o.valor_total), el('small', { text: brl(o.media_por_noite) + '/noite' }))), sug);
        });
        if (r.esgotados_no_periodo.length) res.append(el('p', { class: 'lat-txt', text: 'Esgotados: ' + r.esgotados_no_periodo.join(', ') + '.' }));
        if (r.nao_comportam_o_grupo.length) res.append(el('p', { class: 'lat-txt', text: 'Não comportam o grupo: ' + r.nao_comportam_o_grupo.join(', ') + '.' }));
        const criar = el('button', { class: 'btn btn-destaque', type: 'button', disabled: true, text: 'Marque as opções do orçamento', onclick: async () => {
          criar.setAttribute('disabled', ''); criar.textContent = 'Criando…';
          try {
            const o = await chamarApi('/api/orcamento', { conversa_id: c.id, ...p, opcoes: marcadas.map(k => ({ acomodacoes: [k] })), sugerida: marcadas.includes(sugerida) ? sugerida : '' });
            const ta = $('resposta');
            const primeiro = (c.nomeSalvo || '').split(/\s+/)[0];
            ta.value = (ta.value ? ta.value.trim() + '\n---\n' : '') + (primeiro ? primeiro + ', s' : 'S') + 'eparei ' + (marcadas.length > 1 ? 'as opções' : 'a opção') + ' com vaga para vocês' + (o.resumo ? ': ' + o.resumo + '.\nNo link estão as fotos e os valores:\n' : ', com fotos e valores:\n') + o.link;
            ajustarAltura(); ta.focus();
            toast('Orçamento criado. O link já está no campo de resposta.');
            pintarOrcamentos(c.id);
            criar.textContent = 'Orçamento criado ✓';
          } catch (e) { toast(e.message); criar.removeAttribute('disabled'); criar.textContent = 'Criar orçamento'; }
        } });
        res.append(criar);
      } catch (e) { res.textContent = e.message; }
    };
    lat.append(el('div', { class: 'grade2' }, el('label', { class: 'campo' }, 'Entrada', ent), el('label', { class: 'campo' }, 'Saída', sai)),
      el('div', { class: 'grade2' }, el('label', { class: 'campo' }, 'Adultos', ad), el('label', { class: 'campo' }, 'Idades das crianças', idd)),
      el('button', { class: 'btn btn-enviar', type: 'button', text: 'Ver vagas e valores', onclick: cotar }), res);
  }

  // Vagas: 14 dias a partir de uma data
  let vagasInicio = '';
  function painelVagas(lat) {
    const ini = el('input', { type: 'date', value: vagasInicio || new Date().toISOString().slice(0, 10) });
    const box = el('div', { class: 'rolagem' }, 'Carregando…');
    const carregar = async () => {
      vagasInicio = ini.value; box.textContent = 'Consultando o Silbeck…';
      try {
        const r = await chamarApi('/api/vagas?inicio=' + encodeURIComponent(ini.value) + '&dias=14', null, 'GET');
        box.textContent = '';
        if (r.fonte === 'simulador') box.append(el('div', { class: 'aviso-sim', text: '⚠ Vagas do SIMULADOR (fictícias), até a ponte com o hotel funcionar.' }));
        const dd = d => d.slice(8, 10) + '/' + d.slice(5, 7);
        box.append(el('table', { class: 'vagas-tab' },
          el('thead', {}, el('tr', {}, el('th', { text: 'Acomodação' }), r.dias.map(d => el('th', { class: 'num', text: dd(d) })))),
          el('tbody', {}, r.tipos.map(t => el('tr', {}, el('th', { text: t.nome, title: 'Até ' + t.capacidade + ' pessoas · ' + t.total + ' no hotel' }),
            t.vagas.map(v => el('td', { class: 'num' + (v === 0 ? ' zero' : v === 1 ? ' pouca' : ''), text: v == null ? '–' : String(v) })))))));
      } catch (e) { box.textContent = e.message; }
    };
    ini.addEventListener('change', carregar);
    lat.append(el('label', { class: 'campo' }, 'A partir de', ini), el('p', { class: 'lat-txt', text: 'Quantas acomodações de cada tipo estão livres por noite.' }), box);
    carregar();
  }

  // ================= Respostas rápidas ("/" na conversa) =================
  let respostas = [], atalhoItens = [], atalhoIdx = 0, atalhoTodos = false;
  const semAcento = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  async function carregarRespostas() {
    const { data, error } = await sb.from('respostas').select('*').eq('ativo', true).order('usos', { ascending: false }).limit(300);
    respostas = error ? [] : data || [];
    if (subAtual === 'bib' && !document.querySelector('[data-painel="ajustes"]').hidden) pintarBiblioteca();
  }
  function verAtalho() {
    const ta = $('resposta');
    const m = ta.value.slice(0, ta.selectionStart).match(/(?:^|\s)\/([^\s\/]*)$/);
    if (!m) { if (!atalhoTodos) $('atalhos').hidden = true; return; }
    atalhoTodos = false; abrirAtalhos(semAcento(m[1]));
  }
  function abrirAtalhos(q) {
    const hoje = new Date().toISOString().slice(0, 10);
    atalhoItens = respostas.filter(r => (!r.valida_ate || r.valida_ate >= hoje) && (!q || semAcento(r.atalho).startsWith(q) || semAcento(r.pergunta).includes(q)))
      .sort((a, b) => (!!b.atalho - !!a.atalho) || (b.usos - a.usos)).slice(0, 30);
    atalhoIdx = 0; $('atalhos').hidden = false; pintarAtalhos(q);
  }
  function pintarAtalhos(q) {
    const box = $('atalhos'); box.textContent = '';
    if (!atalhoItens.length) { box.append(el('div', { class: 'vazio-b', text: respostas.length ? 'Nenhuma resposta com “' + (q || '') + '”.' : 'A biblioteca está vazia. Cadastre em Ajustes do agente → Biblioteca de respostas.' })); return; }
    atalhoItens.forEach((r, k) => box.append(el('button', { type: 'button', role: 'option', 'aria-selected': String(k === atalhoIdx), onmousedown: e => e.preventDefault(), onclick: () => escolherAtalho(r) },
      el('b', { text: r.atalho ? '/' + r.atalho : '·' }), el('span', { class: 'p', text: r.pergunta }), el('span', { class: 'r', text: r.resposta }))));
    const sel = box.querySelector('[aria-selected=true]'); if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
  function escolherAtalho(r) {
    const ta = $('resposta'), pos = ta.selectionStart;
    const c = conversas.find(x => x.id === aberta);
    const primeiro = c && c.nomeSalvo ? c.nomeSalvo.split(/\s+/)[0] : '';
    const txt = r.resposta.replace(/\{nome\}/g, primeiro);
    const antes = ta.value.slice(0, pos).replace(/\/[^\s\/]*$/, ''), depois = ta.value.slice(pos);
    ta.value = antes + txt + depois; ta.focus(); const np = (antes + txt).length; ta.setSelectionRange(np, np);
    $('atalhos').hidden = true; atalhoTodos = false; ajustarAltura();
    chamarApi('/api/resposta-uso', { id: r.id }).catch(() => {});
  }
  $('bt-atalhos').addEventListener('click', () => { if (!$('atalhos').hidden) { $('atalhos').hidden = true; return; } atalhoTodos = true; abrirAtalhos(''); $('resposta').focus(); });
  $('resposta').addEventListener('blur', () => setTimeout(() => { if (!atalhoTodos) $('atalhos').hidden = true; }, 150));

  // ================= Formulário genérico (produto, agência, resposta) =================
  function abrirForm(titulo, campos, salvar, extra, rotuloSalvar) {
    $('f-tit').textContent = titulo;
    const box = $('f-campos'); box.textContent = '';
    const ref = {};
    campos.forEach(c => {
      let inp;
      if (c.tipo === 'img') { box.append(el('img', { class: 'form-img', src: c.src, alt: c.rotulo || '' })); return; }
      if (c.tipo === 'nota') { box.append(el('p', { class: 'lat-txt largo', text: c.rotulo })); return; }
      if (c.tipo === 'codigo') { box.append(el('p', { class: 'codigo-grande largo', text: c.valor })); return; }
      if (c.tipo === 'select') inp = el('select', {}, c.opcoes.map(([v, t]) => el('option', { value: v, text: t, selected: String(c.valor ?? '') === String(v) })));
      else if (c.tipo === 'textarea') { inp = el('textarea', { placeholder: c.dica || '' }); inp.value = c.valor || ''; }
      else if (c.tipo === 'check') { inp = el('input', { type: 'checkbox', checked: !!c.valor }); box.append(el('label', { class: 'campo-check' }, inp, c.rotulo)); ref[c.k] = inp; return; }
      else inp = el('input', { type: c.tipo || 'text', value: c.valor ?? '', placeholder: c.dica || '', ...(c.at || {}) });
      ref[c.k] = inp;
      box.append(el('label', { class: 'campo' + (c.largo ? ' largo' : '') }, c.rotulo, inp));
    });
    const fechar = () => { $('f-fundo').hidden = true; $('form-modal').hidden = true; };
    const ok = el('button', { class: 'btn btn-enviar', type: 'button', text: rotuloSalvar || 'Salvar', onclick: async () => {
      const v = Object.fromEntries(Object.entries(ref).map(([k, i]) => [k, i.type === 'checkbox' ? i.checked : i.value]));
      ok.setAttribute('disabled', '');
      try { await salvar(v); fechar(); } catch (e) { toast(e.message); } finally { ok.removeAttribute('disabled'); }
    } });
    $('f-acoes').replaceChildren(ok, ...(extra ? [extra(fechar)] : []), el('button', { class: 'btn btn-editar', type: 'button', text: 'Cancelar', onclick: fechar }));
    $('f-fundo').hidden = false; $('form-modal').hidden = false;
    const primeiro = box.querySelector('input,textarea,select'); if (primeiro) primeiro.focus();
    $('f-fundo').onclick = fechar;
  }

  // ================= Produtos =================
  const TIPO_RESERVA = { ativ: 'Atividade com horário', terc: 'Serviço de terceiro', simples: 'Simples, sem horário' };
  let produtos = [];
  async function carregarProdutos() {
    const { data, error } = await sb.from('produtos').select('*').order('ativo', { ascending: false }).order('prioridade');
    const box = $('prod-grade'); box.textContent = '';
    if (error) { box.append(el('div', { class: 'vazio', text: 'Os produtos ainda não estão no banco: falta rodar a migração 009 no Supabase.' })); return; }
    produtos = data || [];
    const nomeGrupo = gs => String(gs || '').split(',').map(g => ((biblioteca || []).find(x => x.grupo === g) || {}).nome || g).join(' + ');
    const fotoDe = g => { g = String(g || '').split(',')[0]; const x = g && (biblioteca || []).find(b => b.grupo === g); return x && x.fotos[0] ? x.fotos[0].arquivo : null; };
    if (!biblioteca) carregarBiblioteca().then(() => { if (!document.querySelector('section[data-painel="produtos"]').hidden) carregarProdutos(); }).catch(() => {});
    produtos.forEach(p => {
      const vs = p.variacoes || [], ads = p.adicionais || [], foto = (p.fotos && p.fotos[0]) || p.foto || fotoDe(p.grupo_fotos);
      const para = [p.perfis && p.perfis.length ? p.perfis.join(', ') : 'Todos os perfis', p.idade_minima ? 'a partir de ' + p.idade_minima + ' anos' : '', p.altura_minima_cm ? 'mínimo ' + (p.altura_minima_cm / 100).toLocaleString('pt-BR') + ' m' : ''].filter(Boolean).join(' · ');
      box.append(el('div', { class: 'cartao item-cartao' + (p.ativo ? '' : ' inativo') },
        foto ? el('img', { class: 'prod-foto', src: '/fotos/' + foto, alt: p.nome, loading: 'lazy' }) : null,
        el('h3', {}, p.nome, el('small', { text: p.codigo })),
        el('span', { class: 'preco', text: p.preco }),
        p.descricao ? el('p', { text: p.descricao }) : null,
        vs.length ? el('p', { text: 'Opções: ' + vs.map(v => v.nome + ' ' + reais(v.preco)).join(' · ') }) : null,
        ads.length ? el('p', { text: 'Adicionais: ' + ads.map(a => a.nome + ' +' + reais(a.preco)).join(' · ') }) : null,
        el('p', { text: 'Para: ' + para + (p.vitrine ? ' · link: ' + (p.vitrine === 'aventuras' ? 'Aventuras no Rio Formoso' : 'Momentos especiais') : '') }),
        p.regras ? el('p', { text: 'Regras: ' + p.regras }) : null,
        el('p', { text: TIPO_RESERVA[p.tipo_reserva] + (p.quando_oferecer ? ' · oferecer: ' + p.quando_oferecer : '') + (p.antecedencia_dias ? ' · ' + p.antecedencia_dias + ' dias de antecedência' : '') + ' · prioridade ' + p.prioridade + (p.grupo_fotos ? ' · fotos: ' + nomeGrupo(p.grupo_fotos) : ' · sem fotos ligadas') }),
        p.preco_valor == null && !vs.length && 'perfis' in p ? el('p', { class: 'aviso-sim', text: '⚠ Falta o preço em número (para registrar vendas). Clique em Editar.' }) : null,
        el('div', { class: 'acoes' }, el('button', { class: 'btn-mini', type: 'button', text: 'Editar', onclick: () => formProduto(p) }),
          el('button', { class: 'btn-mini', type: 'button', text: '🖼 Fotos' + (p.fotos && p.fotos.length ? ' (' + p.fotos.length + ')' : ''), onclick: () => fotosProduto(p) }),
          el('button', { class: 'btn-mini', type: 'button', text: p.ativo ? 'Pausar (o Gilberto deixa de oferecer)' : 'Reativar', onclick: async () => { try { await chamarApi('/api/produto', { id: p.id, ativo: !p.ativo }); toast(p.ativo ? 'Produto pausado.' : 'Produto reativado.'); carregarProdutos(); } catch (e) { toast(e.message); } } }))));
    });
  }
  // "Simples = 350 = descrição" por linha  ⇄  [{nome, preco, descricao}]
  const linhasParaLista = t => String(t || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const [nome, preco, ...resto] = l.split('=').map(x => x.trim());
    const n = Number(String(preco || '').replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
    if (!nome || !(n >= 0) || preco === undefined || preco === '') throw new Error('Linha sem preço: "' + l + '". Use: Nome = preço');
    return { nome, preco: n, ...(resto.length && resto.join('=') ? { descricao: resto.join('=') } : {}) };
  });
  const listaParaLinhas = l => (l || []).map(x => x.nome + ' = ' + x.preco + (x.descricao ? ' = ' + x.descricao : '')).join('\n');
  async function formProduto(p) {
    p = p || {};
    if (!biblioteca) await carregarBiblioteca().catch(() => {});
    const novos = 'perfis' in p || !p.id; // banco com a migração 012
    abrirForm(p.id ? 'Editar produto' : 'Novo produto', [
      { k: 'nome', rotulo: 'Nome', valor: p.nome, largo: true },
      { k: 'codigo', rotulo: 'Código', valor: p.codigo, at: { maxlength: '8' } },
      { k: 'preco_valor', rotulo: 'Preço em número (se não tiver opções)', tipo: 'number', valor: p.preco_valor ?? '', at: { min: '0', step: '0.01' } },
      { k: 'unidade', rotulo: 'O preço é', tipo: 'select', valor: p.unidade || 'unidade', opcoes: [['unidade', 'por unidade / pedido'], ['pessoa', 'por pessoa']] },
      { k: 'variacoes', rotulo: 'Opções com preço próprio (uma por linha: Nome = preço = descrição)', tipo: 'textarea', largo: true, valor: listaParaLinhas(p.variacoes), dica: 'Simples = 350 = Balão e até 8 polaroids\nCompleta = 600 = Com pétalas, tábua de frios e espumante' },
      { k: 'adicionais', rotulo: 'Adicionais (uma por linha: Nome = preço)', tipo: 'textarea', largo: true, valor: listaParaLinhas(p.adicionais), dica: 'Pedras quentes = 50' },
      { k: 'preco', rotulo: 'Preço como o cliente lê (vazio = o CRM monta)', valor: p.preco, dica: 'R$ 170 por pessoa', largo: true },
      { k: 'descricao', rotulo: 'Descrição (vai na oferta e na página do orçamento)', tipo: 'textarea', valor: p.descricao, largo: true },
      { k: 'regras', rotulo: 'Regras (restrições, horários)', valor: p.regras, largo: true },
      ...PERFIS.map((x, i) => ({ k: 'perfil_' + i, rotulo: 'Para: ' + x, tipo: 'check', valor: (p.perfis || []).includes(x) })),
      { k: 'idade_minima', rotulo: 'Idade mínima (anos)', tipo: 'number', valor: p.idade_minima ?? '', at: { min: '0' } },
      { k: 'altura_minima_cm', rotulo: 'Altura mínima (cm)', tipo: 'number', valor: p.altura_minima_cm ?? '', at: { min: '0' } },
      { k: 'foto', rotulo: 'Foto representativa (vai na oferta do WhatsApp)', tipo: 'select', largo: true, valor: p.foto || '', opcoes: [['', 'Sem foto'], ...(biblioteca || []).flatMap(g => g.fotos.map(f => [f.arquivo, g.nome + ' · ' + (f.descricao || f.arquivo).slice(0, 70)]))] },
      { k: 'grupo_fotos', rotulo: 'Mais fotos (categoria do Banco de fotos; para pôr mais fotos, traga do Drive para a categoria)', tipo: 'select', largo: true, valor: p.grupo_fotos || '', opcoes: [['', 'Sem fotos'], ...(biblioteca || []).map(g => [g.grupo, g.nome]), ...(p.grupo_fotos && p.grupo_fotos.includes(',') ? [[p.grupo_fotos, p.grupo_fotos.split(',').map(g => ((biblioteca || []).find(x => x.grupo === g) || {}).nome || g).join(' + ')]] : [])] },
      { k: 'vitrine', rotulo: 'Link de extras em que aparece', tipo: 'select', valor: p.vitrine || '', opcoes: [['', 'Nenhum'], ['aventuras', 'Aventuras no Rio Formoso'], ['momentos', 'Momentos especiais']] },
      { k: 'tipo_reserva', rotulo: 'Como se reserva', tipo: 'select', valor: p.tipo_reserva || 'simples', opcoes: Object.entries(TIPO_RESERVA) },
      { k: 'quando_oferecer', rotulo: 'Quando oferecer', tipo: 'select', valor: p.quando_oferecer || 'Na cotação', opcoes: ['Na cotação', '3 dias antes da chegada', 'Durante a estadia', 'Cotação e estadia'].map(x => [x, x]) },
      { k: 'antecedencia_dias', rotulo: 'Antecedência mínima (dias)', tipo: 'number', valor: p.antecedencia_dias ?? 0, at: { min: '0' } },
      { k: 'prioridade', rotulo: 'Prioridade (1 = oferecer primeiro)', tipo: 'number', valor: p.prioridade ?? 9, at: { min: '0' } },
    ], async v => {
      const dados = { nome: v.nome, codigo: v.codigo, preco: v.preco, descricao: v.descricao, regras: v.regras, tipo_reserva: v.tipo_reserva, quando_oferecer: v.quando_oferecer, antecedencia_dias: v.antecedencia_dias, prioridade: v.prioridade };
      if (novos) Object.assign(dados, { preco_valor: v.preco_valor, unidade: v.unidade, variacoes: linhasParaLista(v.variacoes), adicionais: linhasParaLista(v.adicionais),
        perfis: PERFIS.filter((x, i) => v['perfil_' + i]), idade_minima: v.idade_minima, altura_minima_cm: v.altura_minima_cm, grupo_fotos: v.grupo_fotos, foto: v.foto, vitrine: v.vitrine });
      if (dados.variacoes && dados.variacoes.length && v.preco === (p.preco || '') && p.id) dados.preco = ''; // opções mudaram: o CRM refaz o preço de leitura
      await chamarApi('/api/produto', { ...(p.id ? { id: p.id } : {}), ...dados });
      toast('Produto salvo. O Gilberto passa a usar em até 1 minuto.' + (novos ? '' : ' (Rode a migração 012 para os campos novos.)'));
      carregarProdutos();
    });
  }
  // Fotos do produto: escolhidas do Drive (qualquer pasta) ou do Banco de fotos; a primeira é a capa
  async function fotosProduto(p) {
    if (!('fotos' in p)) { toast('Falta rodar a migração 016 no Supabase para escolher as fotos do produto.'); return; }
    if (!biblioteca) await carregarBiblioteca().catch(() => {});
    const grupos = String(p.grupo_fotos || '').split(',').filter(Boolean);
    let lista = p.fotos && p.fotos.length ? p.fotos.slice() : [...new Set([p.foto, ...grupos.flatMap(g => (((biblioteca || []).find(x => x.grupo === g) || {}).fotos || []).map(f => f.arquivo))].filter(Boolean))].slice(0, 8);
    $('f-tit').textContent = 'Fotos: ' + p.nome;
    const box = $('f-campos'); box.textContent = '';
    const fechar = () => { $('f-fundo').hidden = true; $('form-modal').hidden = true; };
    const atuais = el('div', { class: 'pf-grade' }), area = el('div', { class: 'pf-area largo' });
    box.append(el('p', { class: 'lat-txt largo', text: 'Estas fotos aparecem na página de extras, na página do orçamento e na oferta do WhatsApp. A primeira é a capa. Até 12.' }), el('div', { class: 'largo' }, atuais),
      el('div', { class: 'pf-botoes largo' }, el('button', { class: 'btn-mini', type: 'button', text: '+ Do Drive', onclick: () => drive(null) }), el('button', { class: 'btn-mini', type: 'button', text: '+ Do Banco de fotos', onclick: () => banco(grupos[0] || '') })), area);
    const pintar = () => {
      atuais.textContent = '';
      if (!lista.length) atuais.append(el('p', { class: 'lat-txt', text: 'Nenhuma foto escolhida. Use os botões abaixo.' }));
      lista.forEach((f, i) => atuais.append(el('div', { class: 'pf-item' }, el('img', { src: '/fotos/' + f, alt: '' }), i === 0 ? el('span', { class: 'pf-capa', text: 'Capa' }) : null,
        el('div', { class: 'pf-acoes' },
          i ? el('button', { type: 'button', 'aria-label': 'Mover para a esquerda', text: '◀', onclick: () => { [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]]; pintar(); } }) : null,
          i < lista.length - 1 ? el('button', { type: 'button', 'aria-label': 'Mover para a direita', text: '▶', onclick: () => { [lista[i + 1], lista[i]] = [lista[i], lista[i + 1]]; pintar(); } }) : null,
          el('button', { type: 'button', 'aria-label': 'Tirar do produto', text: '✕', onclick: () => { lista.splice(i, 1); pintar(); } })))));
    };
    const somar = f => { if (lista.includes(f)) { toast('Essa foto já está no produto.'); return; } if (lista.length >= 12) { toast('Máximo de 12 fotos.'); return; } lista.push(f); pintar(); toast('Foto adicionada. Clique em Salvar fotos.'); };
    // Banco de fotos (o que já está no CRM)
    function banco(cat) {
      const gs = (biblioteca || []).filter(g => g.fotos.length);
      cat = gs.some(g => g.grupo === cat) ? cat : (gs[0] || {}).grupo;
      area.replaceChildren(el('div', { class: 'gal-cats' }, gs.map(g => el('button', { class: 'chip', type: 'button', 'aria-pressed': String(g.grupo === cat), text: g.nome, onclick: () => banco(g.grupo) }))),
        el('div', { class: 'gal-grade' }, ((gs.find(g => g.grupo === cat) || {}).fotos || []).map(f => el('button', { class: 'gal-item', type: 'button', 'aria-pressed': String(lista.includes(f.arquivo)), title: f.descricao, onclick: () => somar(f.arquivo) },
          el('img', { src: '/fotos/' + f.arquivo, alt: f.descricao || '', loading: 'lazy' }), el('span', { class: 'gal-nome', text: f.descricao || f.arquivo })))));
    }
    // Drive: qualquer pasta do banco de imagens; a foto é trazida (recortada) para o Banco de fotos e entra no produto
    async function drive(pasta) {
      area.replaceChildren(el('p', { class: 'lat-txt', text: 'Abrindo o Drive…' }));
      let d;
      try { d = await chamarApi('/api/drive' + (pasta ? '?pasta=' + encodeURIComponent(pasta) : ''), null, 'GET'); } catch (e) { area.replaceChildren(el('p', { class: 'lat-txt', text: e.message })); return; }
      const grade = el('div', { class: 'gal-grade' });
      d.pastas.forEach(x => grade.append(el('button', { class: 'gal-item gal-novo', type: 'button', onclick: () => drive(x.id) }, el('span', { class: 'gal-mais', text: '📁' }), el('span', { class: 'gal-nome', text: x.nome }))));
      d.fotos.forEach(x => {
        const img = el('img', { alt: x.nome, loading: 'lazy' });
        miniatura(x.id).then(u => { img.src = u; }).catch(() => { img.alt = 'Sem miniatura'; });
        const b = el('button', { class: 'gal-item', type: 'button', title: x.nome, onclick: async () => {
          b.disabled = true; toast('Trazendo a foto do Drive…');
          const grupo = (biblioteca || []).some(g => g.grupo === grupos[0]) ? grupos[0] : 'EXTRAS';
          try {
            const j = await chamarApi('/api/foto', { drive_id: x.id, grupo, descricao: p.nome + ' (foto do produto)', etiquetas: [p.nome] });
            await carregarBiblioteca(); somar(j.foto.arquivo);
          } catch (e) {
            const ja = (biblioteca || []).flatMap(g => g.fotos).find(f => f.drive_id === x.id);
            if (ja) somar(ja.arquivo); else toast(e.message);
          } finally { b.disabled = false; }
        } }, img, el('span', { class: 'gal-nome', text: x.na_biblioteca.length ? 'Já no Banco de fotos' : x.nome }));
        grade.append(b);
      });
      if (!d.pastas.length && !d.fotos.length) grade.append(el('p', { class: 'lat-txt', text: 'Pasta vazia.' }));
      area.replaceChildren(el('div', { class: 'gal-cats' }, !d.pasta.raiz ? el('button', { class: 'chip', type: 'button', text: '↑ ' + (d.pasta.pai ? 'Pasta de cima' : 'Início'), onclick: () => drive(d.pasta.pai) }) : null, el('span', { class: 'gal-pasta', text: '📁 ' + d.pasta.nome })), grade);
    }
    $('f-acoes').replaceChildren(el('button', { class: 'btn btn-editar', type: 'button', text: 'Cancelar', onclick: fechar }),
      el('button', { class: 'btn btn-enviar', type: 'button', text: 'Salvar fotos', onclick: async e => {
        e.currentTarget.disabled = true;
        try { await chamarApi('/api/produto', { id: p.id, fotos: lista }); fechar(); toast('Fotos do produto salvas.'); carregarProdutos(); }
        catch (err) { toast(err.message); e.currentTarget.disabled = false; }
      } }));
    $('f-fundo').hidden = false; $('form-modal').hidden = false; $('f-fundo').onclick = fechar;
    pintar();
  }
  $('prod-novo').addEventListener('click', () => formProduto(null));

  // ================= Agências =================
  let agencias = [];
  async function carregarAgencias() {
    const { data, error } = await sb.from('agencias').select('*').order('ativo', { ascending: false }).order('nome');
    if (error) { $('ag-grade').replaceChildren(el('div', { class: 'vazio', text: 'As agências ainda não estão no banco: falta rodar a migração 009 no Supabase.' })); return; }
    agencias = data || []; pintarAgencias();
  }
  function pintarAgencias() {
    const q = semAcento($('ag-busca').value.trim());
    const ls = agencias.filter(a => !q || semAcento([a.nome, a.cnpj, a.telefone, a.email].join(' ')).includes(q));
    const box = $('ag-grade'); box.textContent = '';
    if (!ls.length) box.append(el('div', { class: 'vazio', text: agencias.length ? 'Nenhuma agência com essa busca.' : 'Nenhuma agência cadastrada ainda.' }));
    ls.forEach(a => box.append(el('div', { class: 'cartao item-cartao' + (a.ativo ? '' : ' inativo') },
      el('h3', {}, a.nome, a.codigo_silbeck ? el('small', { text: 'Silbeck ' + a.codigo_silbeck }) : null),
      el('p', { text: [a.cnpj ? 'CNPJ ' + a.cnpj : '', a.comissao != null ? 'Comissão ' + Number(a.comissao).toLocaleString('pt-BR') + '%' : ''].filter(Boolean).join(' · ') || 'Sem CNPJ' }),
      el('p', { text: [a.telefone, a.email].filter(Boolean).join(' · ') || 'Sem contato' }),
      a.observacoes ? el('p', { text: a.observacoes }) : null,
      el('div', { class: 'acoes' }, el('button', { class: 'btn-mini', type: 'button', text: 'Editar', onclick: () => formAgencia(a) }),
        el('button', { class: 'btn-mini', type: 'button', text: a.ativo ? 'Desativar' : 'Reativar', onclick: async () => { try { await chamarApi('/api/agencia', { id: a.id, ativo: !a.ativo }); carregarAgencias(); } catch (e) { toast(e.message); } } })))));
  }
  function formAgencia(a) {
    a = a || {};
    abrirForm(a.id ? 'Editar agência' : 'Nova agência', [
      { k: 'nome', rotulo: 'Nome fantasia', valor: a.nome, largo: true },
      { k: 'cnpj', rotulo: 'CNPJ', valor: a.cnpj, dica: '00.000.000/0000-00' },
      { k: 'comissao', rotulo: 'Comissão (%)', tipo: 'number', valor: a.comissao ?? '', at: { min: '0', max: '100', step: '0.5' } },
      { k: 'telefone', rotulo: 'WhatsApp do contato', tipo: 'tel', valor: a.telefone },
      { k: 'email', rotulo: 'E-mail de reservas', tipo: 'email', valor: a.email },
      { k: 'codigo_silbeck', rotulo: 'Código no Silbeck (se já tiver)', valor: a.codigo_silbeck },
      { k: 'observacoes', rotulo: 'Observações', tipo: 'textarea', valor: a.observacoes, largo: true },
    ], async v => { await chamarApi('/api/agencia', { ...(a.id ? { id: a.id } : {}), ...v }); toast('Agência salva.'); carregarAgencias(); });
  }
  $('ag-nova').addEventListener('click', () => formAgencia(null));
  $('ag-busca').addEventListener('input', pintarAgencias);

  // ================= Ajustes do agente =================
  let subAtual = 'rev', revFiltro = 'pendente';
  function abrirSub(sub) {
    subAtual = sub;
    document.querySelectorAll('[data-painel="ajustes"] .segmento [data-sub]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.sub === sub)));
    document.querySelectorAll('[data-painel="ajustes"] .sub').forEach(x => { x.hidden = x.dataset.sub !== sub; });
    if (sub === 'rev') carregarRevisao();
    if (sub === 'bib') carregarRespostas().then(pintarBiblioteca);
    if (sub === 'con') carregarQuestionario();
  }
  document.querySelector('[data-painel="ajustes"] .segmento').addEventListener('click', e => { const b = e.target.closest('[data-sub]'); if (b) abrirSub(b.dataset.sub); });

  // Revisão das sugestões
  const SIT = { pendente: 'Para revisar', usada: 'Usada', descartada: 'Descartada', aprovada: 'Aprovada', reprovada: 'Reprovada' };
  async function contarRevisao() {
    const { count } = await sb.from('sugestoes').select('id', { count: 'exact', head: true }).eq('situacao', 'pendente');
    $('qtd-rev').hidden = !count; $('qtd-rev').textContent = count || 0;
  }
  async function carregarRevisao() {
    const box = $('rev-lista'); box.textContent = 'Carregando…';
    let q = sb.from('sugestoes').select('*,conversa:conversas(id,contato:contatos(nome))').order('criado_em', { ascending: false }).limit(60);
    if (revFiltro === 'pendente') q = q.eq('situacao', 'pendente');
    if (revFiltro === 'revisadas') q = q.neq('situacao', 'pendente');
    const [{ data, error }, semana] = await Promise.all([q, sb.from('sugestoes').select('situacao').gte('criado_em', new Date(Date.now() - 7 * 864e5).toISOString()).limit(1000)]);
    box.textContent = '';
    if (error) { box.append(el('div', { class: 'vazio', text: 'A revisão ainda não está no banco: falta rodar a migração 009 no Supabase.' })); return; }
    const sem = semana.data || [];
    const boas = sem.filter(x => x.situacao === 'usada' || x.situacao === 'aprovada').length, ruins = sem.filter(x => x.situacao === 'descartada' || x.situacao === 'reprovada').length;
    $('rev-resumo').replaceChildren(
      el('span', {}, el('b', { class: 'num', text: String(sem.filter(x => x.situacao === 'pendente').length) }), 'para revisar na semana'),
      el('span', {}, el('b', { class: 'num', text: boas + ruins ? Math.round(100 * boas / (boas + ruins)) + '%' : '–' }), 'de acerto na semana (meta 90%)'),
      el('span', {}, el('b', { class: 'num', text: String(sem.length) }), 'sugestões em 7 dias'));
    if (!(data || []).length) box.append(el('div', { class: 'vazio', text: revFiltro === 'pendente' ? 'Nada para revisar agora. As sugestões entram aqui sempre que alguém toca em ✨ Sugerir resposta numa conversa (por enquanto o Gilberto só sugere; não responde sozinho). Para treinar sem cliente real, use ✦ Testar o agente. 🌿' : 'Nenhuma sugestão aqui.' }));
    (data || []).forEach(sg => {
      const nome = sg.conversa && sg.conversa.contato && sg.conversa.contato.nome || 'Cliente';
      const f = sg.ferramentas || {};
      const usou = [(f.cotacoes || []).length ? 'Silbeck (' + (f.cotacoes[0].fonte === 'simulador' ? 'simulador' : 'real') + ')' : '', (f.orcamentos || []).length ? 'orçamento' : '', (f.fotos || []).length ? f.fotos.length + ' foto(s)' : ''].filter(Boolean).join(' · ');
      const motivos = el('div', { class: 'motivos', hidden: true }, 'Por quê?', ['Informação errada', 'Tom', 'Faltou vender', 'Devia passar para a equipe', 'Outro'].map(m => el('button', { class: 'chip', type: 'button', text: m, onclick: () => revisar(sg, 'reprovada', m) })));
      box.append(el('div', { class: 'rev-item' },
        el('div', { class: 'topo-rev' }, el('b', { text: nome }), el('span', { text: dia(sg.criado_em) + ' ' + hora(sg.criado_em) }), el('span', { class: 'sit sit-' + sg.situacao, text: SIT[sg.situacao] + (sg.motivo ? ': ' + sg.motivo : '') }),
          sg.conversa ? el('button', { class: 'btn-mini', type: 'button', text: 'Abrir conversa', onclick: () => { irPara('conversas'); abrir(sg.conversa.id); } }) : null),
        sg.pergunta ? el('div', { class: 'pergunta', text: 'Cliente: “' + sg.pergunta + '”' }) : null,
        el('div', { class: 'resposta', text: baloes(sg.mensagem).join('\n\n') }),
        sg.notas_internas || usou ? el('div', { class: 'base', text: [usou ? 'Usou: ' + usou : '', sg.notas_internas ? 'Notas: ' + sg.notas_internas : ''].filter(Boolean).join(' · ') }) : null,
        el('div', { class: 'acoes' },
          el('button', { class: 'btn btn-enviar', type: 'button', text: '✓ Aprovar', onclick: () => revisar(sg, 'aprovada') }),
          el('button', { class: 'btn btn-descartar', type: 'button', text: '✕ Reprovar', onclick: () => { motivos.hidden = !motivos.hidden; } }),
          el('button', { class: 'btn btn-editar', type: 'button', text: 'Virar resposta de referência', onclick: () => formResposta({ pergunta: sg.pergunta || '', resposta: baloes(sg.mensagem).join('\n\n'), origem: 'revisao' }) })),
        motivos));
    });
  }
  async function revisar(sg, situacao, motivo) {
    try { await chamarApi('/api/sugestao', { id: sg.id, situacao, motivo }); toast(situacao === 'aprovada' ? 'Aprovada.' : 'Reprovada: ' + motivo + '.'); carregarRevisao(); contarRevisao(); } catch (e) { toast(e.message); }
  }
  $('rev-filtros').addEventListener('click', e => {
    const b = e.target.closest('[data-rf]'); if (!b) return;
    revFiltro = b.dataset.rf;
    document.querySelectorAll('#rev-filtros [data-rf]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    carregarRevisao();
  });

  // Questionário: o que o Gilberto sabe (base de conhecimento), com atalho para a Biblioteca
  let questionario = null;
  async function carregarQuestionario() {
    if (!questionario) {
      $('con-lista').textContent = 'Carregando…';
      try { questionario = (await chamarApi('/api/conhecimento', null, 'GET')).secoes; } catch (e) { $('con-lista').textContent = e.message; return; }
    }
    pintarQuestionario();
  }
  // Chave de cada item: a pergunta; nos itens sem pergunta (listas), o título da seção + o trecho original
  const chaveItem = (i, sec) => (i.p || (sec.titulo + ' · ' + i.r)).slice(0, 300);
  function formCorrecao(i, sec, corr) {
    abrirForm('Editar resposta do questionário', [
      { tipo: 'nota', rotulo: i.p ? 'Pergunta: ' + i.p : 'Trecho de "' + sec.titulo + '"' },
      { tipo: 'nota', rotulo: 'Texto original: ' + i.r },
      { k: 'resposta', rotulo: 'Resposta correta (o Gilberto passa a usar esta)', tipo: 'textarea', largo: true, valor: corr ? corr.resposta : i.r },
    ], async v => {
      if (!v.resposta.trim()) throw new Error('Escreva a resposta.');
      await chamarApi('/api/resposta', corr ? { id: corr.id, resposta: v.resposta } : { pergunta: chaveItem(i, sec), resposta: v.resposta, origem: 'correcao' });
      toast('Resposta corrigida. O Gilberto passa a usar em até 1 minuto.');
      await carregarRespostas(); pintarQuestionario();
    });
  }
  function pintarQuestionario() {
    const q = semAcento($('con-busca').value.trim());
    const naBib = new Set(respostas.map(r => semAcento(r.pergunta)));
    const correcoes = new Map(respostas.filter(r => r.origem === 'correcao').map(r => [semAcento(r.pergunta), r]));
    const box = $('con-lista'); box.textContent = '';
    questionario.forEach(sec => {
      const itens = sec.itens.filter(i => !q || semAcento(i.p + ' ' + i.r).includes(q));
      if (!itens.length) return;
      box.append(el('div', { class: 'cartao con-sec' }, el('h3', {}, sec.titulo, ' ', el('small', { class: 'dica', text: itens.length + (itens.length > 1 ? ' itens' : ' item') })),
        itens.map(i => {
          const corr = correcoes.get(semAcento(chaveItem(i, sec)));
          return el('div', { class: 'con-item' + (corr ? ' editado' : '') }, i.p ? el('b', { class: 'con-p', text: i.p }) : null,
            el('p', { class: 'con-r', text: corr ? corr.resposta : i.r }),
            corr ? el('small', { class: 'con-orig', text: 'Editado pela equipe. Original: ' + i.r }) : null,
            el('div', { class: 'con-acoes' },
              corr ? el('span', { class: 'origem', text: 'Editado' }) : i.p && naBib.has(semAcento(i.p)) ? el('span', { class: 'origem', text: 'Na biblioteca' }) : null,
              el('button', { class: 'btn-mini', type: 'button', text: '✎ Editar', onclick: () => formCorrecao(i, sec, corr) }),
              corr ? el('button', { class: 'btn-mini', type: 'button', text: 'Desfazer', onclick: async () => {
                if (!confirm('Voltar ao texto original do questionário?')) return;
                try { await chamarApi('/api/resposta', { id: corr.id, ativo: false }); toast('Voltou ao texto original.'); await carregarRespostas(); pintarQuestionario(); } catch (e) { toast(e.message); }
              } }) : null,
              !corr && i.p && !naBib.has(semAcento(i.p)) ? el('button', { class: 'btn-mini', type: 'button', text: '+ Biblioteca', onclick: () => formResposta({ pergunta: i.p, resposta: i.r, origem: 'questionario' }) }) : null));
        })));
    });
    if (!box.children.length) box.append(el('div', { class: 'vazio', text: 'Nada encontrado no questionário.' }));
  }
  $('con-busca').addEventListener('input', () => questionario && pintarQuestionario());
  $('con-importar').addEventListener('click', async () => {
    const b = $('con-importar'); b.setAttribute('disabled', ''); b.textContent = 'Trazendo…';
    try { const j = await chamarApi('/api/importar-questionario', {}); toast(j.importadas ? j.importadas + ' respostas entraram na Biblioteca. Use / na conversa.' : 'Todas já estavam na Biblioteca.'); await carregarRespostas(); pintarQuestionario(); }
    catch (e) { toast(e.message); }
    finally { b.removeAttribute('disabled'); b.textContent = 'Trazer todas para a Biblioteca'; }
  });

  // Biblioteca de respostas
  $('bib-busca').addEventListener('input', () => pintarBiblioteca());
  function pintarBiblioteca() {
    const box = $('bib-lista'); box.textContent = '';
    const qb = semAcento($('bib-busca').value.trim());
    const lista = respostas.filter(r => !qb || semAcento(r.pergunta + ' ' + r.resposta + ' ' + (r.atalho || '')).includes(qb));
    if (respostas.length && !lista.length) box.append(el('div', { class: 'vazio', text: 'Nada encontrado na biblioteca.' }));
    if (!respostas.length) box.append(el('div', { class: 'vazio', text: 'Nenhuma resposta ainda. Cadastre as perguntas mais comuns (como chegar, horários, pet…) ou transforme uma sugestão boa do Gilberto em referência, na Revisão.' }));
    lista.forEach(r => box.append(el('div', { class: 'cartao item-cartao' },
      el('h3', {}, r.pergunta, r.atalho ? el('small', { text: '/' + r.atalho }) : null),
      r.origem === 'questionario' ? el('span', { class: 'origem', style: 'align-self:flex-start', text: 'Do questionário' }) : r.origem === 'revisao' ? el('span', { class: 'origem', style: 'align-self:flex-start', text: 'Da revisão' }) : null,
      el('p', { style: 'white-space:pre-wrap;color:var(--cor-texto)', text: r.resposta }),
      el('p', { text: [r.fixa ? 'Fixa: o Gilberto envia exatamente este texto' : 'Referência para o Gilberto', r.valida_ate ? 'válida até ' + fmtData(r.valida_ate) + '/' + r.valida_ate.slice(0, 4) : '', r.usos + (r.usos === 1 ? ' uso' : ' usos')].filter(Boolean).join(' · ') }),
      el('div', { class: 'acoes' }, el('button', { class: 'btn-mini', type: 'button', text: 'Editar', onclick: () => formResposta(r) }),
        el('button', { class: 'btn-mini', type: 'button', text: 'Remover', onclick: async () => { if (!confirm('Remover esta resposta da biblioteca?')) return; try { await chamarApi('/api/resposta', { id: r.id, ativo: false }); toast('Resposta removida.'); carregarRespostas(); } catch (e) { toast(e.message); } } })))));
  }
  function formResposta(r) {
    r = r || {};
    abrirForm(r.id ? 'Editar resposta' : 'Nova resposta', [
      { k: 'pergunta', rotulo: 'Quando o cliente perguntar', valor: r.pergunta, largo: true, dica: 'Fica longe do centro?' },
      { k: 'resposta', rotulo: 'Responder (use {nome} para o primeiro nome do cliente)', tipo: 'textarea', valor: r.resposta, largo: true },
      { k: 'atalho', rotulo: 'Atalho para a equipe (opcional)', valor: r.atalho, dica: 'local' },
      { k: 'valida_ate', rotulo: 'Válida até (opcional)', tipo: 'date', valor: r.valida_ate },
      { k: 'fixa', rotulo: 'Resposta fixa: o Gilberto envia exatamente este texto, sem reescrever', tipo: 'check', valor: r.fixa },
    ], async v => { await chamarApi('/api/resposta', { ...(r.id ? { id: r.id } : {}), ...(r.origem && !r.id ? { origem: r.origem } : {}), ...v }); toast('Resposta salva.'); await carregarRespostas(); if (questionario && subAtual === 'con') pintarQuestionario(); });
  }
  $('bib-novo').addEventListener('click', () => formResposta(null));

  // Testar o agente
  let teste = [];
  function pintarTeste() {
    const box = $('tes-msgs'); box.textContent = '';
    if (!teste.length) box.append(el('div', { class: 'vazio', text: 'Ex.: “Oi! Tem vaga de 20 a 22/11 para 2 adultos e uma criança de 6 anos?”' }));
    teste.forEach(m => box.append(m.de === 'nota' ? el('div', { class: 'aviso-sim', text: m.texto }) : el('div', { class: 'balao ' + (m.de === 'hotel' ? 'saida ia' : 'entrada') }, m.de === 'hotel' ? el('div', { class: 'autor', text: 'Gilberto' }) : null, linkar(m.texto))));
    box.scrollTop = box.scrollHeight;
  }
  async function enviarTeste() {
    const t = $('tes-txt').value.trim(); if (!t) return;
    teste.push({ de: 'cliente', texto: t }); $('tes-txt').value = ''; pintarTeste();
    $('tes-enviar').setAttribute('disabled', ''); $('tes-enviar').textContent = 'Pensando…';
    try {
      const j = await chamarApi('/api/testar', { mensagens: teste.filter(m => m.de !== 'nota') });
      baloes(j.mensagem).forEach(b => teste.push({ de: 'hotel', texto: b }));
      const nota = [j.simulador ? 'Valores do simulador (fictícios).' : '', j.precisa_equipe ? 'Ele passaria para a equipe.' : '', (j.fotos || []).length ? 'Mandaria ' + j.fotos.length + ' foto(s).' : '', j.notas_internas ? 'Notas: ' + j.notas_internas : ''].filter(Boolean).join(' ');
      if (nota) teste.push({ de: 'nota', texto: nota });
    } catch (e) { teste.push({ de: 'nota', texto: e.message }); }
    finally { $('tes-enviar').removeAttribute('disabled'); $('tes-enviar').textContent = 'Enviar'; pintarTeste(); }
  }
  $('tes-enviar').addEventListener('click', enviarTeste);
  $('tes-txt').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); enviarTeste(); } });
  $('tes-limpar').addEventListener('click', () => { teste = []; pintarTeste(); });
  pintarTeste();

  // ================= Funil, ficha do negócio e tarefas (etapa B) =================
  const ETAPAS = [['novo', 'Novo', 'p-novo', '--cat-novo'], ['atend', 'Em atendimento', 'p-atend', '--cat-atend'], ['orc', 'Orçamento enviado', 'p-orc', '--cat-orc'],
    ['pag', 'Aguardando pagamento', 'p-pag', '--cor-alerta'], ['res', 'Reservado', 'p-res', '--cat-res'], ['perd', 'Perdido', 'p-perd', '--cat-perd']];
  const ETAPA = Object.fromEntries(ETAPAS.map(e => [e[0], e]));
  const ORIGENS = { whatsapp: 'WhatsApp', meta: 'Anúncio Meta', insta: 'Instagram', google: 'Google', site: 'Site', ret: 'Hóspede que volta', ind: 'Indicação', ag: 'Agência', ota: 'Booking', ativo: 'Contato ativo' };
  const PERFIS = ['Casal', 'Família com filhos', 'Grupo de amigos', '55+', 'Observador de aves', 'Ciclista', 'Agência'];
  const MOTIVOS = ['Sem vaga na data', 'Preço', 'Parou de responder', 'Mudou de planos', 'Escolheu outro hotel', 'Outro'];
  const TIPOS_TAREFA = ['Ligar', 'Follow-up', 'Enviar proposta', 'Confirmar pagamento', 'Conferir no Silbeck', 'Agendar massagem', 'Lançar na comanda', 'Encomendar decoração', 'Outro'];
  let negocios = [], tarefas = [], funilOk = true;
  const fmtData = d => d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '';
  const negocioDaConversa = id => negocios.filter(n => n.conversa_id === id).sort((a, b) => (a.etapa === 'res' || a.etapa === 'perd') - (b.etapa === 'res' || b.etapa === 'perd') || b.criado_em.localeCompare(a.criado_em))[0];

  async function carregarFunil() {
    const [n, t] = await Promise.all([
      sb.from('negocios').select('*,contato:contatos(*,contato_identificadores(tipo,valor))').order('atualizado_em', { ascending: false }).limit(500),
      sb.from('tarefas').select('*').order('quando', { ascending: true }).limit(1000),
    ]);
    funilOk = !n.error;
    negocios = (n.data || []).map(x => {
      const idn = (x.contato && x.contato.contato_identificadores) || [];
      const wa = idn.find(i => i.tipo === 'whatsapp');
      return { ...x, nome: (x.contato && x.contato.nome) || (wa ? fmtTel(wa.valor) : 'Sem nome'), nomeContato: (x.contato && x.contato.nome) || '', tel: wa ? fmtTel(wa.valor) : '', email: (x.contato && x.contato.email) || '' };
    });
    tarefas = t.data || [];
    const hojeFim = new Date(); hojeFim.setHours(23, 59, 59, 999);
    const urgentes = tarefas.filter(x => !x.feita && new Date(x.quando) <= hojeFim && (!x.responsavel_id || !eu || x.responsavel_id === eu.id)).length;
    $('qtd-tarefas').hidden = !urgentes; $('qtd-tarefas').textContent = urgentes;
    if (!$('gaveta').hidden) pintarFicha();
    const v = document.querySelector('.nav [aria-selected="true"]');
    if (v && v.dataset.vista === 'funil') pintarFunil();
    if (v && v.dataset.vista === 'tarefas') pintarTarefas();
    if (aberta) { pintarCabecalho(); if (painel === 'tar') pintarPainel(); avisoExtras(aberta); }
    pintarLista();
  }
  let recarregarT = null;
  const recarregarFunilLogo = () => { clearTimeout(recarregarT); recarregarT = setTimeout(carregarFunil, 400); };

  function preencherFiltrosEquipe() {
    for (const id of ['f-resp', 't-resp']) {
      const sel = $(id), v = sel.value;
      sel.replaceChildren(el('option', { value: '', text: id === 'f-resp' ? 'Todos os responsáveis' : 'De todos' }), ...Object.entries(equipe).map(([k, n]) => el('option', { value: k, text: n })));
      sel.value = v;
    }
    if (!$('f-origem').options.length || $('f-origem').options.length === 1) Object.entries(ORIGENS).forEach(([k, n]) => $('f-origem').append(el('option', { value: k, text: n })));
    if ($('f-perfil').options.length === 1) PERFIS.forEach(p => $('f-perfil').append(el('option', { value: p, text: p })));
  }
  ['f-busca', 'f-resp', 'f-origem', 'f-perfil'].forEach(id => $(id).addEventListener('input', pintarFunil));

  async function salvarNegocio(campos, msgOk) {
    try { const j = await chamarApi('/api/negocio', campos); if (msgOk) toast(msgOk); await carregarFunil(); return j; }
    catch (e) { toast(e.message); await carregarFunil(); return null; }
  }
  // Mover de etapa (Perdido pede o motivo)
  let perdaPendente = null;
  function mover(n, etapa) {
    if (!n || n.etapa === etapa) { pintarFunil(); return; }
    if (etapa === 'perd') { perdaPendente = n; abrirMotivo(); return; }
    salvarNegocio({ id: n.id, etapa }, n.nome + ' em ' + ETAPA[etapa][1] + '.');
  }
  function abrirMotivo() {
    $('m-opcoes').replaceChildren(...MOTIVOS.map((m, i) => el('label', {}, el('input', { type: 'radio', name: 'motivo', value: m, checked: i === 0 }), m)));
    $('m-fundo').hidden = false; $('modal').hidden = false; $('m-ok').focus();
  }
  function fecharMotivo() { $('m-fundo').hidden = true; $('modal').hidden = true; perdaPendente = null; pintarFunil(); }
  $('m-cancelar').addEventListener('click', fecharMotivo);
  $('m-fundo').addEventListener('click', fecharMotivo);
  $('m-ok').addEventListener('click', () => {
    const n = perdaPendente; if (!n) return;
    const m = document.querySelector('input[name=motivo]:checked').value;
    $('m-fundo').hidden = true; $('modal').hidden = true; perdaPendente = null;
    salvarNegocio({ id: n.id, etapa: 'perd', motivo_perda: m }, n.nome + ' em Perdido.');
  });

  function passaFiltro(n) {
    const q = $('f-busca').value.trim().toLowerCase();
    if (q && !n.nome.toLowerCase().includes(q) && !(q.replace(/\D/g, '') && n.tel.replace(/\D/g, '').includes(q.replace(/\D/g, '')))) return false;
    if ($('f-resp').value && n.responsavel_id !== $('f-resp').value) return false;
    if ($('f-origem').value && n.origem !== $('f-origem').value) return false;
    if ($('f-perfil').value && n.perfil !== $('f-perfil').value) return false;
    return true;
  }
  function pintarFunil() {
    const board = $('board'); board.textContent = '';
    if (!funilOk) { board.append(el('div', { class: 'vazio', text: 'O funil ainda não está no banco: falta rodar a migração 008 no Supabase.' })); return; }
    ETAPAS.forEach(([k, nome, cls, cor]) => {
      const ls = negocios.filter(n => n.etapa === k && passaFiltro(n));
      const soma = ls.reduce((a, n) => a + Number(n.valor_previsto || 0), 0);
      board.append(el('div', { class: 'coluna', style: '--c:var(' + cor + ')', 'data-etapa': k,
        ondragover: e => { e.preventDefault(); e.currentTarget.classList.add('alvo'); },
        ondragleave: e => e.currentTarget.classList.remove('alvo'),
        ondrop: e => { e.preventDefault(); e.currentTarget.classList.remove('alvo'); const id = e.dataTransfer.getData('text/plain'); mover(negocios.find(n => n.id === id), k); } },
        el('header', {}, el('span', { class: 'pilula ' + cls, text: nome }), el('span', { class: 'soma num', text: ls.length + (soma && k !== 'perd' ? ' · ' + brl(soma) : '') })),
        ls.length ? ls.map(cardNegocio) : el('div', { class: 'vazio', text: 'Solte um card aqui' })));
    });
  }
  function cardNegocio(n) {
    const pend = tarefas.filter(t => t.negocio_id === n.id && !t.feita).length;
    const horas = (Date.now() - new Date(n.etapa_desde || n.atualizado_em).getTime()) / 3600e3;
    const parado = !['res', 'perd'].includes(n.etapa) && horas >= 24 ? el('span', { class: 'alerta-txt', text: 'Parado há ' + (horas >= 48 ? Math.round(horas / 24) + ' dias' : Math.round(horas) + ' h') }) : null;
    const resp = n.responsavel_id ? (equipe[n.responsavel_id] || 'Equipe') : null;
    const sel = el('select', { 'aria-label': 'Etapa de ' + n.nome, onclick: e => e.stopPropagation(), onchange: e => mover(n, e.target.value) }, ETAPAS.map(([k, t]) => el('option', { value: k, text: t, selected: k === n.etapa })));
    return el('article', { class: 'card-lead' + (alertasVencidos().some(a => a.negocio_id === n.id) ? ' urgente' : ''), draggable: 'true', tabindex: '0',
      ondragstart: e => { e.dataTransfer.setData('text/plain', n.id); e.dataTransfer.effectAllowed = 'move'; e.currentTarget.classList.add('arrastando'); },
      ondragend: e => e.currentTarget.classList.remove('arrastando'),
      onclick: () => abrirFicha(n.id), onkeydown: e => { if (e.key === 'Enter') abrirFicha(n.id); } },
      el('strong', { text: n.nome }),
      el('div', { class: 'linha' }, el('span', { class: 'pilula o-' + n.origem, text: ORIGENS[n.origem] || n.origem }), n.perfil ? el('span', { class: 'pilula', text: n.perfil }) : null,
        etiquetaProdutos(n.conversa_id && vendasResumo[n.conversa_id]), ...(n.etiquetas || []).map(t => el('span', { class: 'tipo t-mkt', text: t }))),
      alertasVencidos().some(a => a.negocio_id === n.id) ? el('span', { class: 'alerta-txt', text: '⚑ ' + alertasVencidos().find(a => a.negocio_id === n.id).titulo }) : null,
      n.data_entrada || n.hospedes ? el('div', { class: 'linha num', text: (n.data_entrada ? fmtData(n.data_entrada) + ' a ' + fmtData(n.data_saida) : '') + (n.hospedes ? (n.data_entrada ? ' · ' : '') + n.hospedes : '') }) : null,
      n.valor_previsto || pend ? el('div', { class: 'linha num' }, n.valor_previsto ? el('span', { text: brl(n.valor_previsto) }) : null, pend ? el('span', { text: (n.valor_previsto ? '· ' : '') + pend + (pend > 1 ? ' tarefas' : ' tarefa') }) : null) : null,
      n.motivo_perda ? el('div', { class: 'linha', text: 'Motivo: ' + n.motivo_perda }) : null,
      parado,
      el('div', { class: 'rodape' }, el('span', { class: 'resp', title: resp || 'Sem responsável', text: resp ? iniciais(resp) : '–' }), sel));
  }
  $('bt-novo-lead').addEventListener('click', () => abrirFicha(null));

  // Ficha do negócio (gaveta): Dados, Tarefas e Histórico
  let fichaId = null, abaFicha = 'dados', fichaNova = false;
  function abrirFicha(id, aba) { fichaId = id; fichaNova = !id; abaFicha = aba || 'dados'; $('fundo').hidden = false; $('gaveta').hidden = false; pintarFicha(); $('g-fechar').focus(); }
  function fecharFicha() { $('fundo').hidden = true; $('gaveta').hidden = true; fichaId = null; fichaNova = false; }
  $('g-fechar').addEventListener('click', fecharFicha);
  $('fundo').addEventListener('click', fecharFicha);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('modal').hidden) fecharMotivo(); else if (!$('gaveta').hidden) fecharFicha(); } });
  document.querySelectorAll('.gaveta .abas button').forEach(b => b.addEventListener('click', () => { if (fichaNova) return; abaFicha = b.dataset.g; pintarFicha(); }));
  const campoF = (rotulo, input, largo) => el('label', { class: 'campo' + (largo ? ' largo' : '') }, rotulo, input);
  async function pintarFicha() {
    const n = fichaNova ? { etapa: 'novo', origem: 'ativo', responsavel_id: eu && eu.id, nome: '', tel: '' } : negocios.find(x => x.id === fichaId);
    if (!n) { fecharFicha(); return; }
    $('g-nome').textContent = fichaNova ? 'Novo lead' : n.nome; $('g-avatar').textContent = iniciais(n.nome || '?');
    document.querySelectorAll('.gaveta .abas button').forEach(b => { b.setAttribute('aria-selected', String(b.dataset.g === abaFicha)); b.hidden = fichaNova && b.dataset.g !== 'dados'; });
    const corpo = $('g-corpo'), rod = $('g-rodape'); corpo.textContent = ''; rod.textContent = '';
    if (!fichaNova) corpo.append(el('div', { class: 'resumo-lead' }, el('span', { class: 'pilula ' + ETAPA[n.etapa][2], text: ETAPA[n.etapa][1] }), el('span', { class: 'pilula o-' + n.origem, text: ORIGENS[n.origem] }), n.perfil ? el('span', { class: 'pilula', text: n.perfil }) : null,
      el('span', { text: 'Responsável: ' + (n.responsavel_id ? equipe[n.responsavel_id] || 'Equipe' : 'ninguém') })));
    if (abaFicha === 'dados') {
      const f = {};
      const inp = (k, tipo, at) => (f[k] = el('input', { type: tipo || 'text', value: n[k] == null ? '' : n[k], ...(at || {}) }));
      const sel = (k, opts) => (f[k] = el('select', {}, opts.map(([v, t]) => el('option', { value: v, text: t, selected: String(n[k] || '') === String(v) }))));
      // Contato: nome, WhatsApp e e-mail (editáveis: completa quem chegou pelo Instagram/Facebook, telefone ou balcão)
      const cont = { nome: el('input', { type: 'text', value: fichaNova ? '' : n.nomeContato, placeholder: 'Nome do cliente' }),
        tel: el('input', { type: 'tel', value: fichaNova ? '' : n.tel, placeholder: '67 99999-0000', disabled: !fichaNova && !!n.tel && !!n.conversa_id, title: !fichaNova && n.tel && n.conversa_id ? 'É o número da conversa no WhatsApp' : '' }),
        email: el('input', { type: 'email', value: fichaNova ? '' : n.email, placeholder: 'nome@exemplo.com' }) };
      f.nome = cont.nome; f.tel = cont.tel; f.email = cont.email;
      corpo.append(el('div', { class: 'rotulo', text: 'Contato' }), el('div', { class: 'grade-campos' }, campoF('Nome', cont.nome, true), campoF('WhatsApp (com DDD)', cont.tel), campoF('E-mail', cont.email)),
        !fichaNova && !n.conversa_id ? el('p', { class: 'lat-txt', text: 'Sem conversa no CRM ainda: a conversa começa quando o cliente mandar mensagem (para a equipe iniciar no WhatsApp é preciso modelo aprovado pela Meta, na etapa da Régua).' }) : null);
      corpo.append(el('div', { class: 'rotulo', text: 'Atendimento' }), el('div', { class: 'grade-campos' },
        campoF('Responsável', sel('responsavel_id', [['', 'Sem responsável'], ...Object.entries(equipe)])),
        campoF('Etapa', sel('etapa', ETAPAS.map(e => [e[0], e[1]]))),
        campoF('Origem', sel('origem', Object.entries(ORIGENS))),
        campoF('Perfil', sel('perfil', [['', '—'], ...PERFIS.map(p => [p, p])]))));
      corpo.append(el('div', { class: 'rotulo', text: 'Estadia' }), el('div', { class: 'grade-campos' },
        campoF('Entrada', inp('data_entrada', 'date')), campoF('Saída', inp('data_saida', 'date')), campoF('Hóspedes', inp('hospedes', 'text', { placeholder: '2 adultos + 1 criança (7)' }), true),
        campoF('Acomodação', inp('acomodacao')), campoF('Valor previsto (R$)', inp('valor_previsto', 'number', { min: '0', step: '0.01' }))));
      f.etiquetas = el('input', { type: 'text', value: (n.etiquetas || []).join(', '), placeholder: 'Separe por vírgula' });
      f.notas = el('textarea', { placeholder: 'Só a equipe vê' }); f.notas.value = n.notas || '';
      corpo.append(el('div', { class: 'rotulo', text: 'Outros' }), el('div', { class: 'grade-campos' }, campoF('Etiquetas', f.etiquetas, true), campoF('Anotações internas', f.notas, true)));
      rod.append(el('button', { class: 'btn btn-enviar', type: 'button', text: fichaNova ? 'Criar lead' : 'Salvar dados', onclick: async () => {
        const dados = { responsavel_id: f.responsavel_id.value || null, origem: f.origem.value, perfil: f.perfil.value, data_entrada: f.data_entrada.value, data_saida: f.data_saida.value,
          hospedes: f.hospedes.value, acomodacao: f.acomodacao.value, valor_previsto: f.valor_previsto.value, etiquetas: f.etiquetas.value.split(','), notas: f.notas.value };
        if (fichaNova) {
          const j = await salvarNegocio({ ...dados, etapa: f.etapa.value, nome: f.nome.value, telefone: f.tel.value, email: f.email.value }, 'Lead criado.');
          if (j) { fichaNova = false; fichaId = j.id; pintarFicha(); }
          return;
        }
        const mudou = {};
        if (f.nome.value.trim() !== n.nomeContato) mudou.nome = f.nome.value;
        if (!f.tel.disabled && f.tel.value.trim() !== n.tel) mudou.telefone = f.tel.value;
        if (f.email.value.trim() !== n.email) mudou.email = f.email.value;
        if (Object.keys(mudou).length) {
          try { await chamarApi('/api/contato', { negocio_id: n.id, ...mudou }); } catch (e) { toast(e.message); return; }
          await carregarFunil(); carregarConversas();
        }
        if (f.etapa.value !== n.etapa) { await salvarNegocio({ id: n.id, ...dados }); mover(n, f.etapa.value); }
        else await salvarNegocio({ id: n.id, ...dados }, 'Dados salvos.');
      } }));
      if (n.conversa_id) rod.append(el('button', { class: 'btn btn-editar', type: 'button', text: 'Abrir conversa', onclick: () => { fecharFicha(); irPara('conversas'); const c = conversas.find(x => x.id === n.conversa_id); if (c && c.status !== stAba) { stAba = c.status; document.querySelectorAll('.cx-abas [data-st]').forEach(x => x.setAttribute('aria-selected', String(x.dataset.st === stAba))); } abrir(n.conversa_id); } }));
    }
    if (abaFicha === 'atividades') formTarefas(corpo, n);
    if (abaFicha === 'historico') {
      const box = el('div', { class: 'hist' }, 'Carregando…'); corpo.append(box);
      const { data } = await sb.from('negocio_eventos').select('texto,por,quando').eq('negocio_id', n.id).order('quando', { ascending: false }).limit(100);
      box.textContent = '';
      (data || []).forEach(e => box.append(el('div', {}, e.texto, el('small', { text: dia(e.quando) + ' ' + hora(e.quando) + (e.por ? ' · ' + e.por : '') }))));
      if (!box.children.length) box.append(el('p', { class: 'lat-txt', text: 'Sem registros ainda.' }));
    }
  }

  // Tarefas: linha, formulário (ficha e painel da conversa) e a seção Tarefas
  function quandoTxt(q) {
    const d = new Date(q), h = hora(q), hoje = new Date();
    const diff = Math.round((new Date(d.toDateString()) - new Date(hoje.toDateString())) / 864e5);
    return diff === 0 ? 'Hoje, ' + h : diff === 1 ? 'Amanhã, ' + h : diff === -1 ? 'Ontem, ' + h : d.toLocaleDateString('pt-BR') + ', ' + h;
  }
  function linhaTarefa(t, comLead) {
    const n = negocios.find(x => x.id === t.negocio_id);
    const atras = !t.feita && new Date(t.quando) < new Date();
    return el('div', { class: 'tarefa' + (t.feita ? ' feita' : '') },
      el('input', { type: 'checkbox', checked: t.feita, 'aria-label': 'Concluir ' + t.tipo, onchange: async e => {
        try { await chamarApi('/api/tarefa', { id: t.id, feita: e.target.checked }); toast(e.target.checked ? 'Tarefa concluída.' : 'Tarefa reaberta.'); } catch (er) { toast(er.message); }
        carregarFunil();
      } }),
      el('div', {}, el('div', { class: 'tt' }, el('b', { text: t.tipo }), t.descricao && t.descricao !== t.tipo ? ' · ' + t.descricao : ''),
        el('div', { class: 'qd' + (atras ? ' atrasada' : ''), text: (atras ? 'Atrasada · ' : '') + quandoTxt(t.quando) + ' · ' + (t.responsavel_id ? equipe[t.responsavel_id] || 'Equipe' : 'Sem responsável') })),
      comLead && n ? el('button', { class: 'lead-link', type: 'button', text: n.nome, onclick: () => abrirFicha(n.id) }) : el('span'));
  }
  function amanha10() { const d = new Date(Date.now() + 864e5); d.setHours(10, 0, 0, 0); const z = x => String(x).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T10:00`; }
  function formTarefas(box, n) {
    const lista = tarefas.filter(t => t.negocio_id === n.id).sort((a, b) => (a.feita - b.feita) || a.quando.localeCompare(b.quando));
    const tipo = el('select', {}, TIPOS_TAREFA.map(t => el('option', { value: t, text: t })));
    const desc = el('input', { type: 'text', placeholder: 'Ex.: ligar para confirmar as datas' });
    const quando = el('input', { type: 'datetime-local', value: amanha10() });
    const quem = el('select', {}, [['', 'Sem responsável'], ...Object.entries(equipe)].map(([k, v]) => el('option', { value: k, text: v, selected: k === (n.responsavel_id || (eu && eu.id)) })));
    box.append(el('div', { class: 'rotulo', text: 'Agendar tarefa' }), el('div', { class: 'grade-campos' }, campoF('Tipo', tipo), campoF('Para quem', quem), campoF('Quando', quando, true), campoF('Descrição', desc, true)),
      el('button', { class: 'btn btn-enviar', type: 'button', style: 'align-self:flex-start', text: 'Agendar', onclick: async ev => {
        ev.currentTarget.setAttribute('disabled', '');
        try { await chamarApi('/api/tarefa', { negocio_id: n.id, tipo: tipo.value, descricao: desc.value || tipo.value, quando: new Date(quando.value).toISOString(), responsavel_id: quem.value || null }); toast('Tarefa agendada.'); }
        catch (e) { toast(e.message); }
        carregarFunil();
      } }),
      el('div', { class: 'rotulo', text: 'Tarefas' }));
    if (!lista.length) box.append(el('div', { class: 'vazio', text: 'Nenhuma tarefa ainda.' }));
    lista.forEach(t => box.append(linhaTarefa(t, false)));
  }
  let tModo = 'abertas';
  document.querySelector('[data-painel="tarefas"] .chips').addEventListener('click', e => {
    const c = e.target.closest('[data-t]'); if (!c) return;
    tModo = c.dataset.t;
    document.querySelectorAll('[data-painel="tarefas"] [data-t]').forEach(x => x.setAttribute('aria-pressed', String(x === c)));
    pintarTarefas();
  });
  $('t-resp').addEventListener('input', pintarTarefas);
  function pintarTarefas() {
    const box = $('lista-tarefas'); box.textContent = '';
    if (!funilOk) { box.append(el('div', { class: 'vazio', text: 'As tarefas ainda não estão no banco: falta rodar a migração 008 no Supabase.' })); return; }
    let ls = tarefas.filter(t => tModo === 'abertas' ? !t.feita : t.feita);
    if ($('t-resp').value) ls = ls.filter(t => t.responsavel_id === $('t-resp').value);
    const agora = new Date(), fimHoje = new Date(); fimHoje.setHours(23, 59, 59, 999);
    const grupos = tModo === 'feitas' ? [['Concluídas', ls.slice().reverse()]] : [
      ['Atrasadas', ls.filter(t => new Date(t.quando) < agora)],
      ['Hoje', ls.filter(t => new Date(t.quando) >= agora && new Date(t.quando) <= fimHoje)],
      ['Próximas', ls.filter(t => new Date(t.quando) > fimHoje)]];
    grupos.forEach(([nome, g]) => { if (g.length) box.append(el('div', { class: 'grupo-tarefas' }, el('h3', {}, nome, el('small', { text: String(g.length) })), g.map(t => linhaTarefa(t, true)))); });
    if (!box.children.length) box.append(el('div', { class: 'vazio', text: 'Nenhuma tarefa aqui.' }));
  }

  // Na conversa: etapa do negócio no cabeçalho e as tarefas no painel ☑
  function seletorEtapaConversa(c) {
    const n = negocioDaConversa(c.id);
    if (!n) return null;
    return el('select', { class: 'etapa-sel', 'aria-label': 'Etapa no funil', title: 'Etapa no funil', onchange: e => mover(n, e.target.value) },
      ETAPAS.map(([k, t]) => el('option', { value: k, text: t, selected: k === n.etapa })));
  }
  // ---------- Pagamentos: cobrança por Pix (Banco do Brasil) com baixa automática ----------
  // Dados da conta que aparecem no app do banco do cliente, para ele conferir antes de pagar (dono, 03/10/2026)
  const RECEBEDOR_PIX = 'Para conferir no seu banco, o recebedor é:\nHotel Cabanas Ltda\nBanco do Brasil · Agência 1031-6 · Conta corrente 8583-9';
  const SIT_COB = { ativa: ['Aguardando pagamento', 'pendente'], paga: ['Pago ✓', 'ok'], expirada: ['Venceu sem pagamento', 'erro'], cancelada: ['Cancelada', 'off'] };
  const quandoBR = d => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ' às');
  let modoPix = null;
  async function painelPagamentos(lat, c) {
    if (!c) return;
    const id = c.id;
    lat.append(el('p', { class: 'lat-txt', text: 'Carregando…' }));
    chamarApi('/api/cobranca-acao', { acao: 'verificar' }).catch(() => {}); // confere o banco ao abrir
    if (!modoPix) modoPix = await fetch('/saude').then(r => r.json()).then(j => j.pix || 'simulador').catch(() => 'simulador');
    const { data, error } = await sb.from('cobrancas').select('*').eq('conversa_id', id).order('criado_em', { ascending: false });
    if (painel !== 'res' || aberta !== id) return;
    lat.lastChild.remove();
    if (error) { lat.append(el('div', { class: 'aviso-sim', text: '⚠ Falta rodar a migração 017 no Supabase para as cobranças por Pix.' })); return; }
    if (modoPix === 'simulador') lat.append(el('div', { class: 'aviso-sim', text: '⚠ Modo de teste: o Pix é fictício (simulador do Banco do Brasil). Não envie a clientes reais.' }));
    // Reservas que o CRM criou no Silbeck para esta conversa
    const rs = await sb.from('reservas').select('*').eq('conversa_id', id).order('criado_em', { ascending: false });
    if (painel !== 'res' || aberta !== id) return;
    if (!rs.error && rs.data && rs.data.length) {
      lat.append(el('span', { class: 'rotulo', text: 'Reservas no Silbeck' }));
      rs.data.forEach(r => lat.append(el('div', { class: 'lat-card' },
        el('b', { text: 'Reserva ' + r.silbeck_id + ' · ' + (r.acomodacao || r.codigo) }),
        el('small', {}, el('span', { class: 'cob-sit ' + ({ nao_confirmada: 'pendente', confirmada: 'ok', cancelada: 'off' })[r.situacao], text: ({ nao_confirmada: 'Não confirmada · aguardando pagamento', confirmada: 'Confirmada ✓', cancelada: 'Cancelada' })[r.situacao] || r.situacao }),
          ' · ' + fmtData(r.data_entrada) + ' a ' + fmtData(r.data_saida) + ' · ' + brl(r.valor_total) + ' · titular ' + r.titular + (r.fonte === 'simulador' ? ' · teste' : '')))));
    }
    // Valor sugerido: a opção que o cliente escolheu no orçamento (ou o valor previsto do negócio)
    const orc = orcsCache.find(o => o.escolhida) || orcsCache[0];
    const op = orc && ((orc.opcoes || []).find(x => x.codigo === orc.escolhida) || (orc.opcoes || [])[0]);
    const n = negocioDaConversa(id);
    const total = op ? Number(op.valor_total) : n && n.valor_previsto ? Number(n.valor_previsto) : null;
    const tipo = el('select', {}, [['sinal', 'Sinal de 50%'], ['total', 'Valor total (100%)'], ['outro', 'Outro valor']].map(([v, t]) => el('option', { value: v, text: t })));
    const valor = el('input', { type: 'number', min: '1', step: '0.01', value: total ? (total / 2).toFixed(2) : '' });
    const desc = el('input', { type: 'text', placeholder: 'Ex.: Sinal da Cabana Master, 14 a 17/11' });
    tipo.addEventListener('change', () => { if (total && tipo.value !== 'outro') valor.value = (tipo.value === 'sinal' ? total / 2 : total).toFixed(2); });
    lat.append(el('span', { class: 'rotulo', text: 'Cobrar por Pix' }),
      total ? el('p', { class: 'lat-txt', text: 'Base: ' + (op ? op.nome + ' · ' : '') + brl(total) + (orc && orc.escolhida ? ' (o cliente escolheu no orçamento)' : '') }) : el('p', { class: 'lat-txt', text: 'Sem orçamento escolhido: digite o valor.' }),
      el('div', { class: 'grade2' }, el('label', { class: 'campo' }, 'Cobrança', tipo), el('label', { class: 'campo' }, 'Valor (R$)', valor)),
      el('label', { class: 'campo' }, 'Descrição (o cliente vê no app do banco)', desc),
      el('button', { class: 'btn btn-enviar', type: 'button', text: 'Gerar Pix', onclick: async e => {
        const b = e.currentTarget; b.disabled = true; b.textContent = 'Gerando…';
        try {
          const j = await chamarApi('/api/cobranca', { conversa_id: id, tipo: tipo.value, valor: valor.value, descricao: desc.value });
          porNoCampo(j.cobranca);
          toast('Pix gerado. A mensagem com o copia e cola está no campo de resposta: revise e envie.');
          pintarPainel();
        } catch (err) { toast(err.message); b.disabled = false; b.textContent = 'Gerar Pix'; }
      } }),
      el('p', { class: 'lat-txt', text: 'Prazo: 48 h (2 h se o check-in for em até 3 dias). Quando o Pix cair, o CRM dá baixa sozinho: o card vai para Reservado e o sino avisa.' }));
    if ((data || []).length) {
      lat.append(el('span', { class: 'rotulo', text: 'Cobranças desta conversa' }));
      data.forEach(cob => {
        const [sit, cl] = SIT_COB[cob.situacao] || [cob.situacao, ''];
        lat.append(el('div', { class: 'lat-card' },
          el('b', { text: brl(cob.valor) + ' · ' + (cob.descricao || cob.tipo) }),
          el('small', {}, el('span', { class: 'cob-sit ' + cl, text: sit }), ' · ' + (cob.situacao === 'paga' ? 'pago em ' + quandoBR(cob.pago_em) + (cob.pagador ? ' por ' + cob.pagador : '') : cob.situacao === 'ativa' ? 'vale até ' + quandoBR(cob.expira_em) : 'gerado em ' + quandoBR(cob.criado_em)) + (cob.fonte === 'simulador' ? ' · teste' : '')),
          cob.situacao === 'ativa' ? el('div', { class: 'acoes' },
            el('button', { class: 'btn-mini', type: 'button', text: 'Pôr no campo', onclick: () => porNoCampo(cob) }),
            el('button', { class: 'btn-mini', type: 'button', text: 'Copiar código', onclick: () => navigator.clipboard.writeText(cob.copia_e_cola || '').then(() => toast('Copia e cola copiado.')).catch(() => toast('Não deu para copiar.')) }),
            el('button', { class: 'btn-mini', type: 'button', text: 'Conferir agora', onclick: () => acaoCobranca(cob, 'verificar') }),
            cob.fonte === 'simulador' ? el('button', { class: 'btn-mini', type: 'button', text: '🧪 Simular pagamento', onclick: () => acaoCobranca(cob, 'simular_pagamento') }) : null,
            el('button', { class: 'btn-mini', type: 'button', text: 'Cancelar', onclick: () => { if (confirm('Cancelar este Pix? O cliente não vai mais conseguir pagar por ele.')) acaoCobranca(cob, 'cancelar'); } })) : null));
      });
    }
    lat.append(el('span', { class: 'rotulo', text: 'Reservas no Silbeck' }), el('p', { class: 'lat-txt', text: 'Aparecem aqui quando a ponte com o Silbeck estiver ligada. Link de cartão (Cielo): numa próxima etapa.' }));
  }
  // Texto do Pix (2 balões: a explicação com os dados da conta e, sozinho, o copia e cola)
  const textoPix = cob => 'Segue o Pix ' + (cob.tipo === 'sinal' ? 'do sinal (50%)' : cob.tipo === 'total' ? 'do valor total' : '') + ' de ' + brl(cob.valor) + ', válido até ' + quandoBR(cob.expira_em) + '. É só copiar o código abaixo e colar no app do seu banco, em Pix Copia e Cola.\n\n' + RECEBEDOR_PIX + '\n\nAssim que o pagamento cair, eu confirmo sua reserva por aqui 🌿' + '\n---\n' + (cob.copia_e_cola || '');
  function porNoCampo(cob) {
    const ta = $('resposta');
    ta.value = (ta.value.trim() ? ta.value.trim() + '\n---\n' : '') + textoPix(cob);
    ajustarAltura(); ta.focus();
  }
  async function acaoCobranca(cob, acao) {
    try {
      const j = await chamarApi('/api/cobranca-acao', { id: cob.id, acao });
      toast(acao === 'cancelar' ? 'Pix cancelado.' : j.pagas ? 'Pagamento recebido! O card foi para Reservado.' : j.cedo ? 'Conferido há poucos segundos. Tente de novo já já.' : 'Ainda não pago.');
      pintarPainel(); if (vistaAtual() === 'pagamentos') carregarPagamentos();
    } catch (e) { toast(e.message); }
  }

  // ---------- Produtos na conversa: sugeridos para o cliente, oferecer, resposta e venda ----------
  const SIT_OFERTA = { oferecido: 'oferecido, aguardando resposta', aceito: 'aceito', recusado: 'recusado' };
  const POR_OFERTA = { equipe: 'pela equipe', gilberto: 'pelo Gilberto', pagina: 'pelo cliente na página do orçamento' };
  const SIT_VENDA = { vendido: 'na conta do hóspede · falta lançar', lancado: 'lançado na conta ✓', cancelado: 'cancelado' };
  const reais = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  const precoProduto = p => {
    const por = p.unidade === 'pessoa' ? ' por pessoa' : '', vs = p.variacoes || [];
    if (vs.length) return vs.every(v => Number(v.preco) === Number(vs[0].preco)) ? reais(vs[0].preco) + por : vs.map(v => v.nome + ' ' + reais(v.preco)).join(' ou ') + por;
    return p.preco_valor != null ? reais(p.preco_valor) + por : p.preco;
  };
  // Por que um produto não serve para este cliente (vazio = indicado)
  function motivoNao(p, ctx) {
    const m = [];
    if (p.perfis && p.perfis.length && ctx.perfil && !p.perfis.includes(ctx.perfil)) m.push('pensado para ' + p.perfis.join(', '));
    const baixas = p.idade_minima ? ctx.idades.filter(i => i < p.idade_minima) : [];
    if (baixas.length) m.push('criança de ' + baixas.join(' e ') + (baixas.length > 1 || baixas[0] !== 1 ? ' anos' : ' ano') + ' não participa (mínimo ' + p.idade_minima + ')');
    if (p.antecedencia_dias && ctx.dias != null && ctx.dias < p.antecedencia_dias) m.push('faltam ' + Math.max(0, ctx.dias) + ' dia(s) para a chegada (pedir com ' + p.antecedencia_dias + ')');
    return m.join(' · ');
  }
  async function painelProdutos(lat, c) {
    if (!c) return;
    const id = c.id;
    lat.append(el('p', { class: 'lat-txt', text: 'Carregando…' }));
    const [rp, ro, rv, rl] = await Promise.all([
      sb.from('produtos').select('*').eq('ativo', true).order('prioridade'),
      sb.from('ofertas').select('*').eq('conversa_id', id).order('criado_em', { ascending: false }),
      sb.from('vendas').select('*').eq('conversa_id', id).order('criado_em', { ascending: false }),
      sb.from('vitrines').select('*').eq('conversa_id', id).eq('enviada', true).order('criado_em', { ascending: false }),
    ]);
    if (painel !== 'pro' || aberta !== id) return;
    lat.lastChild.remove();
    if (rp.error) { lat.append(el('p', { class: 'lat-txt', text: 'Os produtos ainda não estão no banco (migração 009).' })); return; }
    if (ro.error || rv.error) lat.append(el('div', { class: 'aviso-sim', text: '⚠ Falta rodar a migração 012 no Supabase para registrar ofertas e vendas.' }));
    const prods = rp.data || [], ofertas = ro.data || [], vendas = rv.data || [];
    const n = negocioDaConversa(id), orc = orcsCache[0];
    const entrada = (n && n.data_entrada) || (orc && orc.data_entrada) || null;
    const ctx = { perfil: n && n.perfil, idades: (orc && orc.criancas_idades) || [], dias: entrada ? Math.round((new Date(entrada + 'T12:00:00') - new Date()) / 864e5) : null };
    const resumoCtx = [ctx.perfil ? 'Perfil: ' + ctx.perfil : 'Perfil não informado (defina na ficha do negócio)', ctx.idades.length ? 'crianças: ' + ctx.idades.join(', ') + ' anos' : '', entrada ? 'chegada em ' + fmtData(entrada) : ''].filter(Boolean).join(' · ');
    lat.append(el('p', { class: 'lat-txt', text: resumoCtx }));

    // Oferta por link: duas páginas temáticas com fotos, opções, adicionais, pessoas e dia
    const links = rl.error ? [] : rl.data || [];
    lat.append(el('span', { class: 'rotulo', text: 'Oferecer por link' }));
    if (rl.error) lat.append(el('div', { class: 'aviso-sim', text: '⚠ Falta rodar a migração 014 no Supabase para os links de extras.' }));
    Object.entries(TEMAS_VITRINE).forEach(([tema, t]) => {
      const doTema = prods.filter(p => p.vitrine === tema);
      const indicadosTema = doTema.filter(p => !motivoNao(p, ctx));
      lat.append(el('div', { class: 'sug-prod' + (indicadosTema.length ? '' : ' fora') },
        el('div', { class: 'sug-prod-cab' }, el('b', { text: t.nome }), el('span', { class: 'num', text: doTema.length + (doTema.length === 1 ? ' produto' : ' produtos') })),
        el('small', { text: doTema.length ? doTema.map(p => p.nome).join(' · ') : 'Nenhum produto ativo neste link (tela Produtos → campo "Link de extras").' }),
        doTema.length && !indicadosTema.length ? el('small', { class: 'motivo', text: '⚠ Nenhum é indicado para este cliente: ' + motivoNao(doTema[0], ctx) }) : null,
        doTema.length ? el('div', { class: 'acoes' },
          el('button', { class: 'btn-mini', type: 'button', text: 'Enviar no WhatsApp', onclick: () => enviarLink(c, tema, ofertas.concat(links)) }),
          el('button', { class: 'btn-mini', type: 'button', text: 'Copiar link para o campo', onclick: () => copiarLink(c, tema, ofertas.concat(links)) })) : null));
    });
    if (links.length) {
      lat.append(el('span', { class: 'rotulo', text: 'Links enviados' }));
      links.forEach(v => lat.append(el('div', { class: 'lat-card' }, el('b', { text: (TEMAS_VITRINE[v.tema] || {}).nome || v.tema }),
        el('small', { text: [new Date(v.criado_em).toLocaleDateString('pt-BR'), v.por === 'gilberto' ? 'pelo Gilberto' : 'pela equipe', v.aberturas ? 'aberto ' + v.aberturas + 'x' : 'ainda não aberto', v.pedido_em ? 'cliente escolheu: ' + (v.pedido || []).map(x => x.nome + (x.variacao ? ' (' + x.variacao + ')' : '')).join(', ') : ''].filter(Boolean).join(' · ') }),
        el('a', { href: '/e/' + v.token + '?previa=1', target: '_blank', rel: 'noopener', text: 'Ver a página (prévia)' }))));
    }

    // Ofertas desta conversa e a resposta do cliente
    if (ofertas.length) {
      lat.append(el('span', { class: 'rotulo', text: 'Ofertas nesta conversa' }));
      ofertas.forEach(o => {
        const prod = prods.find(p => p.codigo === o.produto_codigo);
        const vendida = vendas.some(v => v.oferta_id === o.id && v.situacao !== 'cancelado');
        lat.append(el('div', { class: 'lat-card' }, el('b', { text: o.produto_nome }),
          el('small', { text: SIT_OFERTA[o.situacao] + ' · ' + POR_OFERTA[o.por] + ' · ' + new Date(o.criado_em).toLocaleDateString('pt-BR') + (vendida ? ' · venda registrada' : '') }),
          el('div', { class: 'acoes' },
            o.situacao === 'oferecido' ? el('button', { class: 'btn-mini', type: 'button', text: '✓ Aceitou', onclick: () => prod ? formVenda(c, prod, o) : toast('Produto pausado ou excluído.') }) : null,
            o.situacao === 'oferecido' ? el('button', { class: 'btn-mini', type: 'button', text: '✕ Recusou', onclick: async () => { try { await chamarApi('/api/oferta-resposta', { id: o.id, situacao: 'recusado' }); toast('Anotado. Não oferecemos de novo nesta conversa.'); pintarPainel(); } catch (e) { toast(e.message); } } }) : null,
            o.situacao === 'aceito' && !vendida && prod ? el('button', { class: 'btn-mini', type: 'button', text: 'Registrar venda', onclick: () => formVenda(c, prod, o) }) : null)));
      });
    }

    // Vendas (tudo na conta do hóspede nesta fase)
    if (vendas.length) {
      const total = vendas.filter(v => v.situacao !== 'cancelado').reduce((s, v) => s + Number(v.valor_total), 0);
      lat.append(el('span', { class: 'rotulo', text: 'Vendido · ' + reais(total) }));
      vendas.forEach(v => lat.append(el('div', { class: 'lat-card' + (v.situacao === 'cancelado' ? ' inativo' : '') },
        el('b', { text: v.produto_nome + (v.variacao ? ' (' + v.variacao + ')' : '') + ' · ' + reais(v.valor_total) }),
        el('small', { text: [v.quantidade + 'x', v.data_uso ? fmtData(v.data_uso) : 'data a combinar', v.horario, (v.adicionais || []).map(a => a.nome).join(', '), SIT_VENDA[v.situacao]].filter(Boolean).join(' · ') }),
        v.situacao === 'cancelado' ? null : el('div', { class: 'acoes' },
          v.situacao === 'vendido' ? el('button', { class: 'btn-mini', type: 'button', text: '✓ Lançado na conta', onclick: () => situacaoVenda(v, 'lancado') }) : null,
          el('button', { class: 'btn-mini', type: 'button', text: 'Cancelar venda', onclick: () => { if (confirm('Cancelar esta venda? (as tarefas ficam para a equipe conferir)')) situacaoVenda(v, 'cancelado'); } })))));
    }

    // Catálogo para este cliente: indicados primeiro, os outros com o motivo
    const indicados = prods.filter(p => !motivoNao(p, ctx)), outros = prods.filter(p => motivoNao(p, ctx));
    lat.append(el('div', { class: 'lat-cab' }, el('span', { class: 'rotulo', text: 'Indicados para este cliente' }), el('button', { class: 'btn-mini', type: 'button', text: 'Catálogo', onclick: () => irPara('produtos') })));
    if (!indicados.length) lat.append(el('p', { class: 'lat-txt', text: 'Nenhum produto indicado para este perfil.' }));
    const cartao = (p, motivo) => el('div', { class: 'sug-prod' + (motivo ? ' fora' : '') },
      el('div', { class: 'sug-prod-cab' }, el('b', { text: p.nome }), el('span', { class: 'num', text: precoProduto(p) })),
      p.descricao ? el('small', { text: p.descricao }) : null,
      motivo ? el('small', { class: 'motivo', text: '⚠ ' + motivo }) : (p.regras ? el('small', { text: p.regras }) : null),
      el('div', { class: 'acoes' },
        p.grupo_fotos ? el('button', { class: 'btn-mini', type: 'button', text: '🖼 Fotos', onclick: () => { gal.cat = p.grupo_fotos; if (!$('galeria').hidden) fecharGaleria(); abrirGaleria(); } }) : null,
        el('button', { class: 'btn-mini', type: 'button', text: 'Registrar venda', onclick: () => formVenda(c, p, null) })));
    indicados.forEach(p => lat.append(cartao(p, '')));
    if (outros.length) {
      const det = el('details', { class: 'fora-lista' }, el('summary', { text: 'Não indicados para este cliente (' + outros.length + ')' }));
      outros.forEach(p => det.append(cartao(p, motivoNao(p, ctx))));
      lat.append(det);
    }
    lat.append(el('p', { class: 'lat-txt', text: 'Regra: 1 oferta por conversa; recusou, não insistir. Tudo vai para a conta do hóspede e é acertado no check-out.' }));
  }
  const TEMAS_VITRINE = { aventuras: { nome: 'Aventuras no Rio Formoso', texto: 'Separei as aventuras do hotel para vocês: boia cross, arvorismo ou o combo das duas, com guias. É só escolher na página, com o dia e quantas pessoas 🌿' },
    momentos: { nome: 'Momentos especiais', texto: 'Para deixar a estadia ainda mais especial: decoração no quarto e massagem para relaxar. É só escolher na página a opção e o dia 🌿' } };
  const confirmaOferta = lista => !lista.length || confirm('Já houve oferta nesta conversa (' + (lista[0].produto_nome || 'link ' + ((TEMAS_VITRINE[lista[0].tema] || {}).nome || '')) + '). A regra é 1 oferta por conversa. Oferecer mesmo assim?');
  async function enviarLink(c, tema, ja, texto) {
    if (!confirmaOferta(ja)) return;
    abrirForm('Enviar link: ' + TEMAS_VITRINE[tema].nome, [
      { k: 'texto', rotulo: 'Texto da mensagem (dá para editar)', tipo: 'textarea', largo: true, valor: texto || TEMAS_VITRINE[tema].texto },
      { tipo: 'nota', rotulo: 'Vai com a foto do primeiro produto, o rodapé "Vai na conta da hospedagem, acertada no check-out" e o botão "' + (tema === 'aventuras' ? 'Ver as aventuras' : 'Ver as opções') + '", que abre a página. Só dentro da janela de 24 h.' },
    ], async v => {
      const r = await chamarApi('/api/vitrine', { conversa_id: c.id, tema, enviar: true, texto: v.texto, forcar: true });
      const m = r.mensagem;
      if (m.arquivo && m.id) arquivos.set(m.id, Promise.resolve({ url: '/fotos/' + m.arquivo, nome: m.arquivo, mime: 'image/jpeg' }));
      if (aberta === c.id && m.id && !$('mensagens').querySelector('[data-id="' + m.id + '"]')) { adicionarMensagem({ id: m.id, direcao: 'saida', autor: eu && eu.id, tipo: m.tipo, corpo: m.corpo, status_entrega: 'sent', enviada_em: m.enviada_em }, ultimoDiaTela()); rolarFim(); }
      toast('Link enviado. Quando o cliente escolher, o alerta toca no sino.');
      if (aberta === c.id) $('aviso-extras').hidden = true;
      if (painel === 'pro') pintarPainel();
    }, null, 'Enviar no WhatsApp');
  }
  // Reserva paga → hora de oferecer os extras, uma vez, com o link certo para o perfil (dono, 04/10/2026).
  // Antes disso o orçamento mostra só a hospedagem e o que está incluso.
  const TEXTO_POS = { aventuras: 'Reserva garantida! 🎉 Para aproveitar ainda mais o Rio Formoso, separei as aventuras do hotel: boia cross, arvorismo ou o combo das duas, com guias. As vagas são limitadas, então vale garantir o horário já. É só escolher na página 🌿',
    momentos: 'Reserva garantida! 🎉 Se quiserem deixar a estadia ainda mais especial, dá para incluir decoração no quarto ou uma massagem para relaxar. É só escolher na página a opção e o dia 🌿' };
  const temaDoPerfil = p => ['Casal', '55+'].includes(p) ? 'momentos' : 'aventuras';
  async function avisoExtras(id) {
    const box = $('aviso-extras');
    const n = negocios.filter(x => x.conversa_id === id).find(x => x.etapa === 'res');
    if (!n || lido('crm-extras-' + id)) { box.hidden = true; return; }
    const ja = await Promise.all([sb.from('vitrines').select('id').eq('conversa_id', id).eq('enviada', true).limit(1), sb.from('ofertas').select('id').eq('conversa_id', id).limit(1), sb.from('vendas').select('id').eq('conversa_id', id).neq('situacao', 'cancelado').limit(1)]);
    if (aberta !== id) return;
    if (ja.some(r => r.data && r.data.length)) { box.hidden = true; return; } // já ofereceu ou já comprou
    const c = conversas.find(x => x.id === id) || { id };
    const tema = temaDoPerfil(n.perfil), outro = tema === 'aventuras' ? 'momentos' : 'aventuras';
    const primeiro = (n.nomeContato || '').split(/\s+/)[0];
    const texto = t => (primeiro ? primeiro + ', r' : 'R') + TEXTO_POS[t].slice(1);
    box.replaceChildren(el('b', { text: '🎉 Reserva paga! Hora de oferecer os extras (uma vez só).' }),
      el('span', { class: 'lat-txt', text: 'Sugestão para o perfil' + (n.perfil ? ' (' + n.perfil + ')' : '') + ': ' + TEMAS_VITRINE[tema].nome + '. Abre o texto para você revisar antes de enviar.' }),
      el('div', { class: 'acoes' },
        el('button', { class: 'btn btn-destaque', type: 'button', text: TEMAS_VITRINE[tema].nome, onclick: () => enviarLink(c, tema, [], texto(tema)) }),
        el('button', { class: 'btn-mini', type: 'button', text: TEMAS_VITRINE[outro].nome, onclick: () => enviarLink(c, outro, [], texto(outro)) }),
        el('button', { class: 'btn-mini', type: 'button', text: 'Agora não', onclick: () => { guardar('crm-extras-' + id, '1'); box.hidden = true; } })));
    box.hidden = false;
  }
  async function copiarLink(c, tema, ja) {
    if (!confirmaOferta(ja)) return;
    try {
      const r = await chamarApi('/api/vitrine', { conversa_id: c.id, tema, forcar: true });
      const ta = $('resposta');
      ta.value = (ta.value.trim() ? ta.value.trim() + '\n---\n' : '') + TEMAS_VITRINE[tema].texto + '\n' + r.link;
      ajustarAltura(); ta.focus();
      toast('Link no campo de resposta. Revise e envie.');
      if (painel === 'pro') pintarPainel();
    } catch (e) { toast(e.message); }
  }
  async function situacaoVenda(v, situacao) {
    try { await chamarApi('/api/venda-situacao', { id: v.id, situacao }); toast(situacao === 'lancado' ? 'Marcado como lançado na conta.' : 'Venda cancelada.'); pintarPainel(); if (vistaAtual() === 'pagamentos') carregarPagamentos(); } catch (e) { toast(e.message); }
  }
  function formVenda(c, p, oferta) {
    const vs = p.variacoes || [], ads = p.adicionais || [];
    const n = negocioDaConversa(c.id), orc = orcsCache[0];
    const pessoas = orc ? orc.adultos + (orc.criancas_idades || []).filter(i => !p.idade_minima || i >= p.idade_minima).length : 1;
    const campos = [];
    if (vs.length) campos.push({ k: 'variacao', rotulo: 'Opção', tipo: 'select', valor: vs[0].nome, opcoes: vs.map(v => [v.nome, v.nome + ' · ' + reais(v.preco)]) });
    campos.push({ k: 'quantidade', rotulo: p.unidade === 'pessoa' ? 'Pessoas' : 'Quantidade', tipo: 'number', valor: p.unidade === 'pessoa' ? pessoas : 1, at: { min: '1', max: '50' } });
    campos.push({ k: 'data_uso', rotulo: 'Data', tipo: 'date', valor: (n && n.data_entrada) || (orc && orc.data_entrada) || '' });
    campos.push({ k: 'horario', rotulo: 'Horário (se já combinado)', dica: 'ex.: 14h' });
    ads.forEach((a, i) => campos.push({ k: 'ad_' + i, rotulo: 'Adicional: ' + a.nome + ' (+' + reais(a.preco) + ')', tipo: 'check' }));
    campos.push({ k: 'observacoes', rotulo: 'Observações', tipo: 'textarea', largo: true, dica: 'Ex.: aniversário de casamento; balão com "Ana & Rui"' });
    abrirForm('Venda: ' + p.nome, campos, async v => {
      const r = await chamarApi('/api/venda', { conversa_id: c.id, oferta_id: oferta ? oferta.id : null, produto_codigo: p.codigo, variacao: v.variacao, quantidade: v.quantidade,
        data_uso: v.data_uso || null, horario: v.horario, observacoes: v.observacoes, adicionais: ads.filter((a, i) => v['ad_' + i]).map(a => a.nome) });
      toast('Venda registrada: ' + reais(r.venda.valor_total) + ' na conta do hóspede.' + (r.tarefas.length ? ' Tarefas criadas: ' + r.tarefas.join(', ') + '.' : ''));
      if (painel === 'pro') pintarPainel();
    });
  }
  function painelTarefas(lat, c) {
    const n = c && negocioDaConversa(c.id);
    if (!n) { lat.append(el('p', { class: 'lat-txt', text: funilOk ? 'Esta conversa ainda não tem negócio no funil.' : 'Falta rodar a migração 008 no Supabase.' })); return; }
    lat.append(el('button', { class: 'btn btn-editar', type: 'button', text: 'Abrir a ficha do negócio', onclick: () => abrirFicha(n.id) }));
    formTarefas(lat, n);
  }

  // ---------- Sino: alertas da equipe (cliente pediu produto; lançar na conta no dia do check-in) ----------
  let alertas = [], alertasOk = true, painelAlertas = false, vistos = null, vendasResumo = {};
  const ROT_ALERTA = { produto_pedido: 'Cliente pediu produto', lancar_conta: 'Lançar na conta do hóspede', pagamento_recebido: 'Pagamento recebido', cobranca_vencida: 'Cobrança vencida',
    atendimento_humano: 'Pede atendimento humano', reclamacao: 'Reclamação', cancelamento: 'Pedido de cancelamento', alteracao: 'Pedido de alteração', gilberto_passou: 'Gilberto passou para a equipe' };
  const ATENDIMENTO = ['reclamacao', 'cancelamento', 'atendimento_humano', 'alteracao', 'gilberto_passou'];
  // Toca para mim? Alerta de atendimento: só para quem está de plantão (ou todos, sem plantão ou depois de escalado)
  const meuAlerta = a => !ATENDIMENTO.includes(a.tipo) || !a.para_id || !!a.escalado_em || (eu && a.para_id === eu.id);
  let plantaoId = null;
  async function carregarPlantao() {
    const { data, error } = await sb.from('config').select('valor').eq('chave', 'plantao').maybeSingle();
    plantaoId = !error && data && data.valor ? data.valor.usuario_id || null : null;
    const sel = $('sel-plantao');
    sel.replaceChildren(el('option', { value: '', text: 'Ninguém (todos recebem)' }), ...Object.entries(equipe).map(([id, nome]) => el('option', { value: id, text: nome, selected: id === plantaoId })));
    sel.disabled = !!error;
    sel.title = error ? 'Falta rodar a migração 018 no Supabase.' : '';
  }
  $('sel-plantao').addEventListener('change', async e => {
    const v = e.target.value || null;
    try { await chamarApi('/api/plantao', { usuario_id: v }); plantaoId = v; toast(v ? (equipe[v] || 'Equipe') + ' está de plantão: recebe os alertas com som.' : 'Sem plantão: todos recebem os alertas.'); }
    catch (err) { toast(err.message); carregarPlantao(); }
  });
  const alertasVencidos = () => alertas.filter(a => new Date(a.quando) <= new Date());
  const desde = q => { const m = Math.max(0, Math.round((Date.now() - new Date(q)) / 6e4)); return m < 1 ? 'agora' : m < 60 ? 'há ' + m + ' min' : m < 1440 ? 'há ' + Math.round(m / 60) + ' h' : 'há ' + Math.round(m / 1440) + ' dias'; };
  async function carregarAlertas() {
    const { data, error } = await sb.from('alertas').select('*').eq('situacao', 'aberto').order('quando').limit(200);
    alertasOk = !error;
    alertas = data || [];
    if (vistos === null && alertasVencidos().length) { // ao entrar: abre a lista e toca no primeiro clique (o navegador só libera som depois dele)
      painelAlertas = true;
      document.addEventListener('pointerdown', () => setTimeout(() => { if (alertasVencidos().length) bip(); }, 150), { once: true });
    }
    pintarSino();
  }
  async function carregarVendasResumo() {
    const { data, error } = await sb.from('vendas').select('conversa_id,situacao').neq('situacao', 'cancelado').limit(2000);
    vendasResumo = {};
    if (!error) (data || []).forEach(v => { if (!v.conversa_id) return; const r = vendasResumo[v.conversa_id] = vendasResumo[v.conversa_id] || { n: 0, pend: 0 }; r.n++; if (v.situacao === 'vendido') r.pend++; });
    pintarLista();
    if (document.querySelector('.nav [aria-selected="true"]')?.dataset.vista === 'funil') pintarFunil();
  }
  const etiquetaProdutos = vd => vd && vd.n ? el('span', { class: 'tipo t-prod' + (vd.pend ? ' pendente' : ''), title: vd.pend ? 'Comprou produtos: ' + vd.pend + ' ainda não lançado(s) na conta' : 'Comprou produtos (lançados na conta)', text: '🛍 ' + vd.n + (vd.n > 1 ? ' produtos' : ' produto') + (vd.pend ? ' · falta lançar' : '') }) : null;
  // Som de 3 notas (o navegador só libera som depois do primeiro clique na página)
  let audio = null;
  function bip() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const t0 = audio.currentTime + 0.05;
      [[0, 880], [0.22, 1175], [0.44, 1568]].forEach(([t, f]) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = 'triangle'; o.frequency.value = f; o.connect(g); g.connect(audio.destination);
        g.gain.setValueAtTime(0.0001, t0 + t); g.gain.exponentialRampToValueAtTime(0.3, t0 + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 0.3);
        o.start(t0 + t); o.stop(t0 + t + 0.32);
      });
    } catch (e) { /* sem som */ }
  }
  function pintarSino() {
    const ab = alertasVencidos();
    const chave = a => a.id + (a.escalado_em ? ':e' : '');
    const novos = vistos ? ab.filter(a => !vistos.has(chave(a)) && meuAlerta(a)) : [];
    vistos = new Set(ab.map(chave));
    $('sino-n').hidden = !ab.length; $('sino-n').textContent = ab.length;
    $('bt-sino').setAttribute('aria-label', ab.length ? ab.length + (ab.length > 1 ? ' alertas da equipe' : ' alerta da equipe') : 'Sem alertas');
    if (novos.length) {
      const s = $('bt-sino'); s.classList.remove('ativo'); void s.offsetWidth; s.classList.add('ativo');
      bip();
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden && avisos !== 'ligado') novos.forEach(a => { try { new Notification(a.titulo, { body: a.info || '', tag: a.id }); } catch (e) { /* sem notificação */ } });
      painelAlertas = true;
    }
    if (!ab.length) $('bt-sino').classList.remove('ativo');
    pintarAlertas();
    pintarLista();
  }
  function pintarAlertas() {
    const box = $('alertas'), ab = alertasVencidos();
    $('bt-sino').setAttribute('aria-expanded', String(painelAlertas));
    box.hidden = !painelAlertas; box.textContent = '';
    if (box.hidden) return;
    box.append(el('div', { class: 'al-cab' }, el('b', { text: ab.length ? ab.length + (ab.length > 1 ? ' alertas para a equipe' : ' alerta para a equipe') : 'Nenhum alerta agora' }),
      el('button', { class: 'fechar', type: 'button', 'aria-label': 'Fechar alertas', text: '✕', onclick: () => { painelAlertas = false; pintarAlertas(); } })));
    if (!alertasOk) box.append(el('p', { class: 'vazio-al', text: 'Falta rodar a migração 013 no Supabase para os alertas funcionarem.' }));
    if (!ab.length) {
      const prox = alertas.filter(a => new Date(a.quando) > new Date()).length;
      box.append(el('p', { class: 'vazio-al', text: 'Quando um cliente pedir um produto, o alerta toca aqui com som. No dia do check-in, às 8h, toca o aviso para lançar na conta.' + (prox ? ' Agendados: ' + prox + '.' : '') }));
      box.append(el('div', { class: 'al-acoes' }, el('button', { class: 'btn-mini', type: 'button', text: '🔊 Testar som', onclick: bip })));
      const rod = rodapeAvisos(); if (rod) box.append(rod);
      return;
    }
    ab.forEach(a => {
      const c = conversas.find(x => x.id === a.conversa_id);
      const abrirConv = () => { painelAlertas = false; pintarAlertas(); irPara('conversas'); if (c) abrir(c.id); painel = /pagamento|cobranca/.test(a.tipo) ? 'res' : ATENDIMENTO.includes(a.tipo) ? 'his' : 'pro'; guardar('crm-painel', painel); pintarPainel(); };
      box.append(el('div', { class: 'al-item' + (a.tipo === 'lancar_conta' ? ' lancar' : '') },
        el('span', { class: 'al-tipo', text: '⚑ ' + (ROT_ALERTA[a.tipo] || a.titulo) }),
        el('b', { text: (c ? c.nome : 'Cliente') + ' · ' + desde(a.quando) }),
        a.info ? el('span', { class: 'lat-txt', text: a.info }) : null,
        ATENDIMENTO.includes(a.tipo) ? el('small', { class: 'al-dono' + (a.escalado_em && !a.assumido_por ? ' escalado' : ''), text: a.assumido_por ? (equipe[a.assumido_por] || 'Alguém da equipe') + ' assumiu' : a.escalado_em ? 'Sem dono há mais de 10 min: avisada toda a equipe' : a.para_id ? 'Para ' + (equipe[a.para_id] || 'quem está de plantão') + ' (plantão)' : 'Para toda a equipe' }) : null,
        el('div', { class: 'al-acoes' },
          ATENDIMENTO.includes(a.tipo) && !a.assumido_por ? el('button', { class: 'btn-mini', type: 'button', text: 'Assumir', onclick: async () => { try { await chamarApi('/api/alerta', { id: a.id, acao: 'assumir' }); toast('Você assumiu. A conversa passou para você.'); carregarAlertas(); abrirConv(); } catch (e) { toast(e.message); } } }) : null,
          a.tipo === 'lancar_conta'
            ? el('button', { class: 'btn-mini', type: 'button', text: '✓ Lançado na conta', onclick: () => resolverAlerta(a, 'Lançamento registrado. Alerta resolvido.') })
            : el('button', { class: 'btn-mini', type: 'button', text: a.tipo === 'pagamento_recebido' ? '✓ Visto' : a.tipo === 'produto_pedido' ? '✓ Reservado' : '✓ Resolvido', onclick: () => resolverAlerta(a, 'Alerta resolvido.') }),
          c ? el('button', { class: 'btn-mini', type: 'button', text: 'Abrir conversa', onclick: abrirConv }) : null)));
    });
    const rod = rodapeAvisos(); if (rod) box.append(rod);
  }
  async function resolverAlerta(a, msg) {
    try { await chamarApi('/api/alerta', { id: a.id }); alertas = alertas.filter(x => x.id !== a.id); pintarSino(); toast(msg); if (painel === 'pro') pintarPainel(); }
    catch (e) { toast(e.message); }
  }
  $('bt-sino').addEventListener('click', () => {
    painelAlertas = !painelAlertas; pintarAlertas();
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
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
          if (!$('mensagens').querySelector('[data-id="' + m.id + '"]')) { adicionarMensagem(m, ultimoDiaTela()); manterNoFim(); }
          if (m.direcao === 'entrada') { c.ultima_msg_cliente_em = m.enviada_em; pintarCabecalho(); sb.rpc('marcar_conversa_lida', { p_conversa: c.id }); }
        }
        pintarLista();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversas' }, ({ new: row }) => {
        const c = row && conversas.find(x => x.id === row.id);
        if (!c) { carregarConversas(); return; }
        Object.assign(c, { nao_lidas: aberta === c.id ? 0 : row.nao_lidas, ultima_msg_em: row.ultima_msg_em, ultima_msg_cliente_em: row.ultima_msg_cliente_em, status: row.status, atribuida_a: row.atribuida_a });
        if (aberta === c.id) pintarCabecalho();
        pintarLista();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'negocios' }, () => recarregarFunilLogo())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' }, () => recarregarFunilLogo())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orcamentos' }, ({ new: o }) => {
        if (o && o.conversa_id && o.conversa_id === aberta) pintarOrcamentos(aberta);
        if (o && o.ultima_abertura_em) carregarQuentes();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensagens' }, ({ new: m }) => {
        if (m.transcricao_status) document.querySelectorAll('[data-transcricao="' + m.id + '"]').forEach(x => pintarTranscricao(x, m));
        const s = document.querySelector('.balao[data-id="' + m.id + '"] small');
        if (s && m.direcao === 'saida') s.textContent = hora(m.enviada_em) + (m.status_entrega ? ' · ' + (STATUS[m.status_entrega] || m.status_entrega) : '');
      })
      .subscribe((status, err) => {
        aoVivo = status === 'SUBSCRIBED';
        $('ao-vivo').className = 'ao-vivo' + (aoVivo ? '' : ' off');
        $('ao-vivo').textContent = aoVivo ? '● ao vivo' : '○ atualiza a cada 15 s';
        $('ao-vivo').title = aoVivo ? 'Mensagens novas aparecem na hora.' : 'Tempo real indisponível (' + status + (err ? ': ' + err.message : '') + ').';
      });
    // Ofertas e vendas num canal à parte (se o banco ainda não tiver a migração 012, não derruba o tempo real das mensagens)
    const repintarProdutos = ({ new: r }) => { if (painel === 'pro' && r && r.conversa_id === aberta) pintarPainel(); };
    let vendasT = null, alertasT = null;
    sb.channel('caixa-produtos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ofertas' }, repintarProdutos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, e => { repintarProdutos(e); clearTimeout(vendasT); vendasT = setTimeout(carregarVendasResumo, 400); })
      .subscribe();
    sb.channel('caixa-cobrancas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cobrancas' }, ({ new: r }) => { if (painel === 'res' && r && r.conversa_id === aberta) pintarPainel(); if (vistaAtual() === 'pagamentos') { clearTimeout(pgT); pgT = setTimeout(carregarPagamentos, 300); } })
      .subscribe();
    sb.channel('caixa-alertas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas' }, () => { clearTimeout(alertasT); alertasT = setTimeout(carregarAlertas, 300); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'config' }, () => { carregarPlantao(); carregarGilAuto(); carregarNumerosTeste(); })
      .subscribe();
  }

  // ---------- Pagamentos: todas as cobranças por Pix e os extras a receber na conta do hóspede ----------
  const vistaAtual = () => { const v = document.querySelector('.nav [aria-selected="true"]'); return v ? v.dataset.vista : ''; };
  let pgSit = '', pgCob = [], pgVen = [], pgErro = null, pgVez = 0, pgT = null;
  const nomeDe = cv => { const c = cv && cv.contato; if (!c) return 'Sem conversa'; const wa = (c.contato_identificadores || []).find(i => i.tipo === 'whatsapp'); return c.nome || (wa ? fmtTel(wa.valor) : 'Sem nome'); };
  const abrirConversaPg = id => { if (!id) return; irPara('conversas'); abrir(id); };
  $('pg-sit').addEventListener('click', e => { const c = e.target.closest('[data-s]'); if (!c) return; pgSit = c.dataset.s; document.querySelectorAll('#pg-sit [data-s]').forEach(x => x.setAttribute('aria-pressed', String(x === c))); pintarPagamentos(); });
  $('pg-busca').addEventListener('input', () => pintarPagamentos());
  $('pg-periodo').addEventListener('input', () => carregarPagamentos());
  $('pg-conferir').addEventListener('click', async e => {
    const b = e.currentTarget; b.disabled = true;
    try { const j = await chamarApi('/api/cobranca-acao', { acao: 'verificar' }); toast(j.pagas ? j.pagas + (j.pagas === 1 ? ' pagamento recebido!' : ' pagamentos recebidos!') : j.cedo ? 'Conferido há poucos segundos. Tente de novo já já.' : 'Nenhum pagamento novo.'); }
    catch (er) { toast(er.message); }
    b.disabled = false; carregarPagamentos();
  });
  async function carregarPagamentos() {
    const vez = ++pgVez, desde = new Date(Date.now() - Number($('pg-periodo').value) * 864e5).toISOString();
    if (!modoPix) modoPix = await fetch('/saude').then(r => r.json()).then(j => j.pix || 'simulador').catch(() => 'simulador');
    const conv = 'conversa:conversas(id,contato:contatos(nome,contato_identificadores(tipo,valor)))';
    const [c, v] = await Promise.all([
      sb.from('cobrancas').select('*,' + conv).gte('criado_em', desde).order('criado_em', { ascending: false }).limit(1000),
      sb.from('vendas').select('id,conversa_id,produto_nome,variacao,quantidade,valor_total,data_uso,situacao,criado_em,' + conv).eq('situacao', 'vendido').order('data_uso', { ascending: true, nullsFirst: false }).limit(500),
    ]);
    if (vez !== pgVez) return;
    pgErro = c.error ? '017' : null; pgCob = c.data || []; pgVen = v.error ? null : v.data || [];
    pintarPagamentos();
  }
  function pintarPagamentos() {
    const corpo = $('pg-corpo'); corpo.textContent = '';
    if (pgErro) { corpo.append(pnFalta(pgErro)); return; }
    if (modoPix === 'simulador') corpo.append(el('div', { class: 'aviso-sim', text: '⚠ Modo de teste: os Pix são fictícios (simulador do Banco do Brasil) até as credenciais do banco entrarem.' }));
    const soma = ls => pnTotal(ls, x => x.situacao === 'paga' ? x.valor_pago || x.valor : x.valor);
    const pagas = pgCob.filter(x => x.situacao === 'paga'), ativas = pgCob.filter(x => x.situacao === 'ativa'), vencidas = pgCob.filter(x => x.situacao === 'expirada');
    corpo.append(el('div', { class: 'pn-tiles' },
      pnTile('Recebido por Pix', pnBrl0(soma(pagas)), pagas.length + (pagas.length === 1 ? ' pagamento' : ' pagamentos') + ' no período'),
      pnTile('Aguardando pagamento', pnBrl0(soma(ativas)), ativas.length + (ativas.length === 1 ? ' Pix em aberto' : ' Pix em aberto')),
      pnTile('Venceram sem pagamento', String(vencidas.length), vencidas.length ? pnBrl0(soma(vencidas)) + ' · vale chamar o cliente' : 'nenhuma no período'),
      pgVen ? pnTile('Extras a receber no check-out', pnBrl0(pnTotal(pgVen, x => x.valor_total)), pgVen.length + (pgVen.length === 1 ? ' venda' : ' vendas') + ' ainda não lançada' + (pgVen.length === 1 ? '' : 's') + ' na conta') : null));
    // Cobranças por Pix
    const q = semAcento($('pg-busca').value.trim());
    const ls = pgCob.filter(x => (!pgSit || x.situacao === pgSit) && (!q || semAcento(nomeDe(x.conversa) + ' ' + (x.descricao || '')).includes(q)));
    const TIPO = { sinal: 'Sinal', total: 'Total', outro: 'Outro valor' };
    const linhas = ls.map(cob => {
      const [sit, cl] = SIT_COB[cob.situacao] || [cob.situacao, ''];
      const quando = cob.situacao === 'paga' ? 'pago em ' + quandoBR(cob.pago_em) + (cob.pagador ? ' · ' + cob.pagador : '') : cob.situacao === 'ativa' ? 'vale até ' + quandoBR(cob.expira_em) : 'gerado em ' + quandoBR(cob.criado_em);
      return el('tr', {},
        el('td', {}, cob.conversa_id ? el('button', { class: 'lead-link', type: 'button', text: nomeDe(cob.conversa), onclick: () => abrirConversaPg(cob.conversa_id) }) : el('span', { text: nomeDe(cob.conversa) })),
        el('td', { text: (TIPO[cob.tipo] || cob.tipo) + (cob.descricao ? ' · ' + cob.descricao : '') + (cob.fonte === 'simulador' ? ' · teste' : '') }),
        el('td', { class: 'n', text: brl(cob.situacao === 'paga' && cob.valor_pago ? cob.valor_pago : cob.valor) }),
        el('td', {}, el('span', { class: 'cob-sit ' + cl, text: sit }), el('div', { class: 'pn-sub', text: quando })),
        el('td', {}, el('div', { class: 'pg-acoes' }, ...(cob.situacao === 'ativa' ? [
          el('button', { class: 'btn-mini', type: 'button', text: 'Copiar código', onclick: () => navigator.clipboard.writeText(cob.copia_e_cola || '').then(() => toast('Copia e cola copiado.')).catch(() => toast('Não deu para copiar.')) }),
          cob.fonte === 'simulador' ? el('button', { class: 'btn-mini', type: 'button', text: '🧪 Simular pagamento', onclick: () => acaoCobranca(cob, 'simular_pagamento') }) : null,
          el('button', { class: 'btn-mini', type: 'button', text: 'Cancelar', onclick: () => { if (confirm('Cancelar este Pix? O cliente não vai mais conseguir pagar por ele.')) acaoCobranca(cob, 'cancelar'); } })].filter(Boolean) : []))));
    });
    corpo.append(pnBloco('Cobranças por Pix', 'O Pix é gerado na conversa (painel 💳). Quando cai, o CRM dá baixa sozinho: o card vai para Reservado e o sino avisa.',
      linhas.length ? el('div', { class: 'pn-rola' }, el('table', { class: 'pn-tabela pg-tabela' },
        el('thead', {}, el('tr', {}, ...['Cliente', 'Cobrança', 'Valor', 'Situação', ''].map((t, i) => el('th', { class: i === 2 ? 'n' : '', text: t })))),
        el('tbody', {}, ...linhas))) : el('div', { class: 'vazio', text: pgCob.length ? 'Nenhuma cobrança com esse filtro.' : 'Nenhum Pix gerado no período.' })));
    // Extras vendidos que ainda não foram lançados na conta do hóspede
    if (pgVen) {
      const lv = pgVen.filter(x => !q || semAcento(nomeDe(x.conversa) + ' ' + x.produto_nome).includes(q));
      corpo.append(pnBloco('Extras na conta do hóspede', 'Vendidos e ainda não lançados na conta (o hóspede paga no check-out). No dia do check-in o sino lembra de lançar.',
        lv.length ? el('div', { class: 'pn-rola' }, el('table', { class: 'pn-tabela pg-tabela' },
          el('thead', {}, el('tr', {}, ...['Cliente', 'Extra', 'Valor', 'Data de uso', ''].map((t, i) => el('th', { class: i === 2 ? 'n' : '', text: t })))),
          el('tbody', {}, ...lv.map(v => el('tr', {},
            el('td', {}, v.conversa_id ? el('button', { class: 'lead-link', type: 'button', text: nomeDe(v.conversa), onclick: () => abrirConversaPg(v.conversa_id) }) : el('span', { text: nomeDe(v.conversa) })),
            el('td', { text: (v.quantidade > 1 ? v.quantidade + '× ' : '') + v.produto_nome + (v.variacao ? ' · ' + v.variacao : '') }),
            el('td', { class: 'n', text: brl(v.valor_total) }),
            el('td', { text: v.data_uso ? fmtData(v.data_uso) : 'a combinar' }),
            el('td', {}, el('div', { class: 'pg-acoes' }, el('button', { class: 'btn-mini', type: 'button', text: '✓ Lançado na conta', onclick: async () => {
              try { await chamarApi('/api/venda-situacao', { id: v.id, situacao: 'lancado' }); toast('Marcado como lançado na conta.'); carregarPagamentos(); } catch (e) { toast(e.message); }
            } })))))))) : el('div', { class: 'vazio', text: 'Nada para lançar agora.' })));
    }
    corpo.append(el('p', { class: 'dica', text: 'Link de pagamento por cartão (Cielo) e as reservas a receber do Silbeck entram aqui quando essas ligações estiverem prontas.' }));
  }

  // ---------- Painel de indicadores: atendimento e vendas no período ----------
  // Tudo calculado aqui, a partir do que a equipe já lê no banco (RLS). Faturamento real da hospedagem chega com o Silbeck.
  let pnPeriodo = lido('crm-painel-periodo') || 'mes', pnVez = 0;
  const pnTotal = (ls, f) => ls.reduce((s, x) => s + (Number(f(x)) || 0), 0);
  const pnPct = (a, b) => b ? Math.round(100 * a / b) + '%' : '—';
  const pnDia = d => { const z = x => String(x).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
  const pnMediana = ls => { if (!ls.length) return null; const o = ls.slice().sort((a, b) => a - b), m = o.length >> 1; return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2; };
  const pnMin = m => m == null ? '—' : m < 1 ? 'menos de 1 min' : m < 60 ? Math.round(m) + ' min' : m < 1440 ? (m / 60).toFixed(1).replace('.', ',') + ' h' : (m / 1440).toFixed(1).replace('.', ',') + ' dias';
  const pnBrl0 = v => 'R$ ' + Math.round(Number(v) || 0).toLocaleString('pt-BR');
  function pnIntervalo(p) {
    const fim = new Date();
    let ini;
    if (p === 'mes') ini = new Date(fim.getFullYear(), fim.getMonth(), 1);
    else { ini = new Date(fim); ini.setHours(0, 0, 0, 0); ini.setDate(ini.getDate() - Number(p) + 1); }
    const ant = new Date(ini.getTime() - (fim - ini)); // período anterior, mesmo tamanho
    return { ini, fim, ant };
  }
  $('pn-periodo').addEventListener('click', e => {
    const c = e.target.closest('[data-d]'); if (!c) return;
    pnPeriodo = c.dataset.d; guardar('crm-painel-periodo', pnPeriodo); pintarPainelIndicadores();
  });
  function pnTile(rotulo, num, sub, delta) {
    return el('div', { class: 'cartao pn-tile' }, el('span', { class: 'rotulo', text: rotulo }), el('span', { class: 'pn-num', text: num }),
      delta || null, sub ? el('span', { class: 'pn-sub', text: sub }) : null);
  }
  function pnDelta(agora, antes) {
    if (antes == null) return null;
    if (!antes && !agora) return el('span', { class: 'pn-delta igual', text: 'igual ao período anterior' });
    if (!antes) return el('span', { class: 'pn-delta sobe', text: '▲ nenhum no período anterior' });
    const d = Math.round(100 * (agora - antes) / antes);
    return el('span', { class: 'pn-delta ' + (d > 0 ? 'sobe' : d < 0 ? 'desce' : 'igual'), text: (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '') + Math.abs(d) + '% vs período anterior (' + antes + ')' });
  }
  function pnBloco(titulo, dica, ...filhos) {
    const larga = titulo.startsWith('!'); if (larga) titulo = titulo.slice(1);
    return el('div', { class: 'cartao pn-bloco' + (larga ? ' larga' : '') }, el('h3', { text: titulo }), dica ? el('p', { class: 'dica', text: dica }) : null, ...filhos);
  }
  const pnFalta = mig => el('div', { class: 'pn-falta', text: '⚠ Falta rodar a migração ' + mig + ' no Supabase para este número.' });
  // Barras horizontais com o valor escrito ao lado (uma série; a cor da etapa repete a do funil)
  function pnBarras(linhas) {
    const max = Math.max(1, ...linhas.map(l => l[1]));
    return el('div', { class: 'pn-hbar', role: 'table' }, ...linhas.flatMap(([nome, v, cor, extra]) => [
      el('span', { role: 'cell', text: nome }),
      el('div', { class: 'trilha', 'aria-hidden': 'true' }, el('div', { class: 'enche', style: `width:${(100 * v / max).toFixed(1)}%${cor ? ';--c:var(' + cor + ')' : ''}` })),
      el('span', { class: 'v', role: 'cell', text: String(v) + (extra ? ' · ' + extra : '') })]));
  }
  // Colunas por dia (uma série), com dica ao passar o mouse e tabela para quem prefere ler os números
  function pnColunas(dias) {
    const NS = 'http://www.w3.org/2000/svg', s = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
    const caixa = el('div', { class: 'pn-col' }), dica = el('div', { class: 'pn-dica', hidden: true });
    const desenhar = W => { // desenha na largura real (texto sem distorcer); refaz se a tela mudar de tamanho
      const H = 180, mE = 26, mB = 22, mT = 8, larg = (W - mE) / dias.length;
      const max = Math.max(1, ...dias.map(d => d[1])), passo = max <= 4 ? 1 : Math.ceil(max / 4), topo = Math.ceil(max / passo) * passo;
      const y = v => mT + (H - mT - mB) * (1 - v / topo);
      const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Novos leads por dia' });
      for (let v = 0; v <= topo; v += passo) {
        svg.append(s('line', { class: v ? 'grade' : 'eixo', x1: mE, x2: W, y1: y(v), y2: y(v) }));
        const t = s('text', { x: mE - 6, y: y(v) + 4, 'text-anchor': 'end' }); t.textContent = v; svg.append(t);
      }
      const marcar = [0, dias.length >> 1, dias.length - 1];
      dias.forEach(([dia, v], i) => {
        const x = mE + i * larg, bw = Math.max(1, Math.min(28, larg - 2)), bx = x + (larg - bw) / 2;
        const alvo = s('rect', { class: 'alvo', x, y: mT, width: larg, height: H - mT - mB });
        const h = Math.max(0, y(0) - y(v)), r = Math.min(4, bw / 2, h);
        const barra = s('path', { class: 'barra', d: v ? `M${bx},${y(0)}V${y(v) + r}Q${bx},${y(v)} ${bx + r},${y(v)}H${bx + bw - r}Q${bx + bw},${y(v)} ${bx + bw},${y(v) + r}V${y(0)}Z` : '' });
        alvo.addEventListener('mouseenter', () => {
          barra.classList.add('on');
          dica.textContent = dia.slice(8, 10) + '/' + dia.slice(5, 7) + ' · ' + v + (v === 1 ? ' lead' : ' leads'); dica.hidden = false;
          dica.style.left = Math.min(W - 50, Math.max(50, bx + bw / 2)) + 'px'; dica.style.top = (y(v) - 6) + 'px';
        });
        alvo.addEventListener('mouseleave', () => { dica.hidden = true; barra.classList.remove('on'); });
        svg.append(alvo, barra);
        if (marcar.includes(i)) { const t = s('text', { x: x + larg / 2, y: H - 6, 'text-anchor': i === 0 ? 'start' : i === dias.length - 1 ? 'end' : 'middle' }); t.textContent = dia.slice(8, 10) + '/' + dia.slice(5, 7); svg.append(t); }
      });
      caixa.replaceChildren(svg, dica);
    };
    let ultima = 0;
    new ResizeObserver(() => { const w = Math.round(caixa.clientWidth); if (w && w !== ultima) { ultima = w; desenhar(w); } }).observe(caixa);
    const tab = el('table', { class: 'pn-tabela' }, el('thead', {}, el('tr', {}, el('th', { text: 'Dia' }), el('th', { class: 'n', text: 'Novos leads' }))),
      el('tbody', {}, ...dias.filter(d => d[1]).map(([d, v]) => el('tr', {}, el('td', { text: d.slice(8, 10) + '/' + d.slice(5, 7) }), el('td', { class: 'n', text: String(v) })))));
    return [caixa, el('details', { class: 'pn-tabela-ver' }, el('summary', { text: 'Ver em tabela' }), tab)];
  }
  async function pintarPainelIndicadores() {
    const vez = ++pnVez, corpo = $('pn-corpo');
    document.querySelectorAll('#pn-periodo [data-d]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.d === pnPeriodo)));
    const { ini, fim, ant } = pnIntervalo(pnPeriodo), iso = ini.toISOString(), isoAnt = ant.toISOString();
    $('pn-intervalo').textContent = ini.toLocaleDateString('pt-BR') + ' a ' + fim.toLocaleDateString('pt-BR');
    if (!corpo.children.length) corpo.append(el('p', { class: 'lat-txt', text: 'Calculando…' }));
    if (!modoPix) modoPix = await fetch('/saude').then(r => r.json()).then(j => j.pix || 'simulador').catch(() => 'simulador');
    const [neg, orc, ven, cob, sug, ale] = await Promise.all([
      sb.from('negocios').select('id,etapa,etapa_desde,fechado_em,origem,valor_previsto,motivo_perda,criado_em').or(`criado_em.gte.${isoAnt},etapa_desde.gte.${isoAnt}`).limit(5000),
      sb.from('orcamentos').select('id,criado_em,aberto_primeira_vez_em,escolhida').gte('criado_em', iso).limit(5000),
      sb.from('vendas').select('valor_total,situacao').gte('criado_em', iso).neq('situacao', 'cancelado').limit(5000),
      sb.from('cobrancas').select('valor,valor_pago').eq('situacao', 'paga').gte('pago_em', iso).limit(5000),
      sb.from('sugestoes').select('situacao').gte('criado_em', iso).limit(5000),
      sb.from('alertas').select('tipo,criado_em,assumido_em,escalado_em,situacao').in('tipo', ATENDIMENTO).gte('criado_em', iso).limit(5000),
    ]);
    if (vez !== pnVez) return;
    corpo.textContent = '';
    if (neg.error) { corpo.append(pnFalta('008')); return; }
    const noPer = d => d && new Date(d) >= ini, noAnt = d => d && new Date(d) >= ant && new Date(d) < ini;
    const leads = neg.data.filter(n => noPer(n.criado_em)), leadsAnt = neg.data.filter(n => noAnt(n.criado_em));
    const fechou = n => n.etapa === 'res' ? (n.fechado_em || n.etapa_desde) : null;
    const reservas = neg.data.filter(n => noPer(fechou(n))), reservasAnt = neg.data.filter(n => noAnt(fechou(n)));
    const convertidos = leads.filter(n => n.etapa === 'res').length;
    const orcs = orc.data || [], abertos = orcs.filter(o => o.aberto_primeira_vez_em).length, quero = orcs.filter(o => o.escolhida).length;
    const sugs = sug.data || [], boas = sugs.filter(x => x.situacao === 'usada' || x.situacao === 'aprovada').length, ruins = sugs.filter(x => x.situacao === 'descartada' || x.situacao === 'reprovada').length;
    const chamados = ale.data || [], tempos = chamados.filter(a => a.assumido_em).map(a => (new Date(a.assumido_em) - new Date(a.criado_em)) / 6e4);

    corpo.append(el('div', { class: 'pn-tiles' },
      pnTile('Novos leads', String(leads.length), null, pnDelta(leads.length, leadsAnt.length)),
      pnTile('Reservas fechadas', String(reservas.length), reservas.length ? pnBrl0(pnTotal(reservas, n => n.valor_previsto)) + ' pelo orçamento' : null, pnDelta(reservas.length, reservasAnt.length)),
      pnTile('Conversão', pnPct(convertidos, leads.length), `${convertidos} de ${leads.length} leads do período já reservaram`),
      pnTile('Orçamentos enviados', orc.error ? '—' : String(orcs.length), orc.error ? null : `${pnPct(abertos, orcs.length)} abertos · ${quero} clicaram em "Quero reservar"`),
      ven.error ? el('div', { class: 'cartao pn-tile' }, el('span', { class: 'rotulo', text: 'Extras vendidos' }), pnFalta('012'))
        : pnTile('Extras vendidos', pnBrl0(pnTotal(ven.data, v => v.valor_total)), ven.data.length + (ven.data.length === 1 ? ' venda' : ' vendas') + ' · na conta do hóspede'),
      cob.error ? el('div', { class: 'cartao pn-tile' }, el('span', { class: 'rotulo', text: 'Pix recebidos' }), pnFalta('017'))
        : pnTile('Pix recebidos', pnBrl0(pnTotal(cob.data, c => c.valor_pago || c.valor)), cob.data.length + (cob.data.length === 1 ? ' pagamento' : ' pagamentos') + (modoPix === 'simulador' ? ' · modo de teste' : '')),
      pnTile('Acerto do Gilberto', sug.error ? '—' : pnPct(boas, boas + ruins), sug.error ? null : `${boas} de ${boas + ruins} sugestões aproveitadas pela equipe`),
      ale.error ? el('div', { class: 'cartao pn-tile' }, el('span', { class: 'rotulo', text: 'Tempo para assumir' }), pnFalta('018'))
        : pnTile('Tempo para assumir', pnMin(pnMediana(tempos)), `mediana de ${tempos.length} chamado${tempos.length === 1 ? '' : 's'} assumido${tempos.length === 1 ? '' : 's'}`)));

    // Novos leads por dia
    const conta = {}; leads.forEach(n => { const d = pnDia(new Date(n.criado_em)); conta[d] = (conta[d] || 0) + 1; });
    const dias = []; for (const d = new Date(ini); d <= fim; d.setDate(d.getDate() + 1)) { const k = pnDia(d); dias.push([k, conta[k] || 0]); }
    const grade = el('div', { class: 'pn-grade' });
    grade.append(pnBloco('!Novos leads por dia', 'Cada negócio novo no funil (primeira mensagem, lead cadastrado ou conversa iniciada pela equipe).', ...pnColunas(dias)));

    // Funil agora (todas as etapas, com os negócios carregados na tela)
    grade.append(pnBloco('Funil agora', 'Quantos negócios estão em cada etapa neste momento.',
      pnBarras(ETAPAS.map(([k, nome, , cor]) => [nome, negocios.filter(n => n.etapa === k).length, cor]))));

    // Resultado por origem
    const porOrigem = {}; leads.forEach(n => { const o = porOrigem[n.origem] ||= { leads: 0, res: 0, perd: 0, valor: 0 }; o.leads++; if (n.etapa === 'res') { o.res++; o.valor += Number(n.valor_previsto) || 0; } if (n.etapa === 'perd') o.perd++; });
    const linhasO = Object.entries(porOrigem).sort((a, b) => b[1].leads - a[1].leads);
    grade.append(pnBloco('!Resultado por origem', 'Leads que chegaram no período, por onde vieram, e quantos já viraram reserva.',
      linhasO.length ? el('div', { class: 'pn-rola' }, el('table', { class: 'pn-tabela' },
        el('thead', {}, el('tr', {}, ...['Origem', 'Leads', 'Reservas', 'Conversão', 'Perdidos', 'Valor previsto'].map((t, i) => el('th', { class: i ? 'n' : '', text: t })))),
        el('tbody', {}, ...linhasO.map(([o, x]) => el('tr', {}, el('td', { text: ORIGENS[o] || o }), el('td', { class: 'n', text: String(x.leads) }), el('td', { class: 'n', text: String(x.res) }),
          el('td', { class: 'n', text: pnPct(x.res, x.leads) }), el('td', { class: 'n', text: String(x.perd) }), el('td', { class: 'n', text: x.valor ? pnBrl0(x.valor) : '—' }))))))
        : el('div', { class: 'vazio', text: 'Nenhum lead novo no período.' })));

    // Motivos de perda
    const perdidos = neg.data.filter(n => n.etapa === 'perd' && noPer(n.fechado_em || n.etapa_desde)), mot = {};
    perdidos.forEach(n => { const m = n.motivo_perda || 'Sem motivo informado'; mot[m] = (mot[m] || 0) + 1; });
    grade.append(pnBloco('Por que perdemos', `${perdidos.length} negócio${perdidos.length === 1 ? '' : 's'} marcado${perdidos.length === 1 ? '' : 's'} como perdido${perdidos.length === 1 ? '' : 's'} no período.`,
      perdidos.length ? pnBarras(Object.entries(mot).sort((a, b) => b[1] - a[1]).map(([m, v]) => [m, v])) : el('div', { class: 'vazio', text: 'Nenhuma perda no período.' })));

    // Atendimento: chamados para a equipe e quanto tempo levaram para alguém assumir
    if (!ale.error) {
      const porTipo = {}; chamados.forEach(a => { const t = porTipo[a.tipo] ||= { n: 0, tempos: [], esc: 0, abertos: 0 }; t.n++; if (a.assumido_em) t.tempos.push((new Date(a.assumido_em) - new Date(a.criado_em)) / 6e4); if (a.escalado_em) t.esc++; if (a.situacao === 'aberto') t.abertos++; });
      const linhasA = ATENDIMENTO.filter(t => porTipo[t]);
      grade.append(pnBloco('!Chamados para a equipe', 'Quando o cliente pede uma pessoa, reclama, quer cancelar ou alterar, ou o Gilberto passa a conversa. "Escalados" são os que ninguém do plantão assumiu em 10 minutos.',
        linhasA.length ? el('div', { class: 'pn-rola' }, el('table', { class: 'pn-tabela' },
          el('thead', {}, el('tr', {}, ...['Tipo', 'Chamados', 'Até assumir', 'Escalados', 'Em aberto'].map((t, i) => el('th', { class: i ? 'n' : '', text: t })))),
          el('tbody', {}, ...linhasA.map(t => { const x = porTipo[t]; return el('tr', {}, el('td', { text: ROT_ALERTA[t] || t }), el('td', { class: 'n', text: String(x.n) }),
            el('td', { class: 'n', text: pnMin(pnMediana(x.tempos)) }), el('td', { class: 'n', text: String(x.esc) }), el('td', { class: 'n', text: String(x.abertos) })); }))))
          : el('div', { class: 'vazio', text: 'Nenhum chamado no período.' })));
    }
    corpo.append(grade, el('p', { class: 'dica', text: 'Valores de hospedagem vêm do orçamento enviado (valor previsto). O faturamento real e a ocupação entram quando o Silbeck estiver ligado.' }));
  }

  // ---------- Avisos no celular: notificação mesmo com o CRM fechado (CRM instalado na tela inicial) ----------
  const ehIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const pushSuportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  let avisos = 'carregando', swReg = null;
  const deB64u = t => { const b = atob(t.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((t.length + 3) % 4)); return Uint8Array.from(b, ch => ch.charCodeAt(0)); };
  function nomeAparelho() {
    const ua = navigator.userAgent;
    const so = ehIOS ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'Computador';
    const nav = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'navegador';
    return so + ' · ' + nav + (instalado() ? ' (instalado)' : '');
  }
  const dadosInscricao = ins => { const j = ins.toJSON(); return { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, aparelho: nomeAparelho() }; };
  function abrirDoAviso(hash) {
    const id = (String(hash || '').match(/^#c=([0-9a-f-]{36})$/i) || [])[1];
    if (!id) return;
    painelAlertas = false; pintarAlertas(); irPara('conversas'); abrir(id);
  }
  async function prepararAvisos() {
    if ('serviceWorker' in navigator) {
      try { swReg = await navigator.serviceWorker.register('/sw.js'); } catch (e) { swReg = null; }
      navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.abrir) abrirDoAviso(e.data.abrir); });
    }
    await conferirAvisos();
    // No celular, lembra uma vez de ligar os avisos
    if (/Android|iPhone|iPad/.test(navigator.userAgent) && ['desligado', 'instalar-ios'].includes(avisos) && !lido('crm-dica-avisos')) {
      guardar('crm-dica-avisos', '1'); toast('Dica: toque no sino 🔔 e ligue os "Avisos no celular".');
    }
  }
  async function conferirAvisos() {
    if (!swReg || !pushSuportado()) avisos = ehIOS && !instalado() ? 'instalar-ios' : 'sem-suporte';
    else if (Notification.permission === 'denied') avisos = 'negado';
    else {
      const ins = await swReg.pushManager.getSubscription().catch(() => null);
      avisos = ins && Notification.permission === 'granted' ? 'ligado' : 'desligado';
      if (avisos === 'ligado') chamarApi('/api/push-inscrever', dadosInscricao(ins)).catch(() => {}); // mantém o aparelho ligado à pessoa certa
    }
    if (painelAlertas) pintarAlertas();
  }
  async function ativarAvisos(b) {
    b.disabled = true;
    try {
      const { chave } = await chamarApi('/api/push-chave', null, 'GET');
      if (!chave) throw new Error('Os avisos no celular ainda não foram ligados no servidor. Avise o Ricardo.');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { avisos = perm === 'denied' ? 'negado' : 'desligado'; pintarAlertas(); return toast('Sem permissão, o celular não mostra os avisos.'); }
      let ins = await swReg.pushManager.getSubscription();
      if (!ins) ins = await swReg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: deB64u(chave) });
      await chamarApi('/api/push-inscrever', dadosInscricao(ins));
      avisos = 'ligado'; pintarAlertas();
      const t = await chamarApi('/api/push-teste', {});
      toast(t.enviados ? 'Avisos ligados! Mandamos um teste para este aparelho.' : 'Avisos ligados.');
    } catch (e) { toast(e.message || 'Não deu para ligar os avisos agora.'); b.disabled = false; }
  }
  async function desligarAvisos() {
    const ins = swReg && await swReg.pushManager.getSubscription().catch(() => null);
    if (ins) { await chamarApi('/api/push-cancelar', { endpoint: ins.endpoint }).catch(() => {}); await ins.unsubscribe().catch(() => {}); }
    avisos = 'desligado'; pintarAlertas(); toast('Avisos desligados neste aparelho.');
  }
  let resumoLigado = null; // resumo do dia às 8h no celular (cada pessoa liga ou desliga para si)
  function linhaResumo() {
    if (resumoLigado === null) { resumoLigado = 'carregando'; chamarApi('/api/resumo-dia', null, 'GET').then(j => { resumoLigado = j.ligado; if (painelAlertas) pintarAlertas(); }).catch(() => { resumoLigado = null; }); return null; }
    if (typeof resumoLigado !== 'boolean') return null;
    return el('label', { class: 'al-resumo' }, el('input', { type: 'checkbox', checked: resumoLigado, onchange: async e => {
      try { const j = await chamarApi('/api/resumo-dia', { ligado: e.target.checked }); resumoLigado = j.ligado; toast(j.ligado ? 'Resumo do dia ligado: às 8h, um aviso com o que há para hoje.' : 'Resumo do dia desligado.'); }
      catch (er) { e.target.checked = !e.target.checked; toast(er.message); }
    } }), 'Resumo do dia às 8h (orçamentos para retomar, tarefas e clientes quentes 🔥)');
  }
  function rodapeAvisos() {
    const TXT = {
      'sem-suporte': 'Este navegador não recebe avisos com o CRM fechado. No Android, use o Chrome; no iPhone, instale o CRM na tela inicial.',
      'instalar-ios': 'No iPhone: toque em Compartilhar (quadrado com a seta ↑) → "Adicionar à Tela de Início". Abra o CRM pelo ícone, entre com o código do 📱 Conectar celular (gerado aqui) e ligue os avisos no sino.',
      negado: 'As notificações estão bloqueadas neste aparelho. Libere nos Ajustes do celular (Notificações → CRM Cabanas) ou nas permissões do site e abra o sino de novo.',
      desligado: 'Receba os alertas mesmo com o CRM fechado e o celular bloqueado.' + (/Android/.test(navigator.userAgent) && !instalado() ? ' Dica: no menu ⋮ do Chrome, "Adicionar à tela inicial" deixa o CRM como um aplicativo.' : ''),
      ligado: 'Ligados neste aparelho ✓ Os alertas chegam como notificação.',
    };
    if (!TXT[avisos]) return null;
    return el('div', { class: 'al-avisos' }, el('b', { text: '📱 Avisos no celular' }), el('span', { class: 'lat-txt', text: TXT[avisos] }),
      avisos === 'desligado' ? el('div', { class: 'al-acoes' }, el('button', { class: 'btn btn-enviar', type: 'button', text: 'Ligar avisos neste aparelho', onclick: e => ativarAvisos(e.currentTarget) })) :
      avisos === 'ligado' ? el('div', { class: 'al-acoes' },
        el('button', { class: 'btn-mini', type: 'button', text: 'Mandar um teste', onclick: () => chamarApi('/api/push-teste', {}).then(t => toast(t.enviados ? 'Teste enviado. Deve chegar em segundos.' : 'Nenhum aparelho recebeu. Tente desligar e ligar de novo.')).catch(e => toast(e.message)) }),
        el('button', { class: 'btn-mini', type: 'button', text: 'Desligar', onclick: desligarAvisos })) : null,
      avisos === 'ligado' ? linhaResumo() : null);
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
