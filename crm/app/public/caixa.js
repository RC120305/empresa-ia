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
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + '/caixa' } });
    $('btn-entrar').removeAttribute('disabled');
    msg.textContent = !error ? 'Pronto! Abra o link que chegou no seu e-mail (veja também o spam). Só o link mais recente funciona.'
      : (error.status === 429 || /rate limit|security purposes|seconds/i.test(error.message))
        ? 'Muitos links pedidos em pouco tempo. O envio de e-mail gratuito do Supabase tem limite por hora: use o último link que chegou ou tente de novo mais tarde.'
        : /signups not allowed|not found|invalid/i.test(error.message)
          ? 'Este e-mail não tem acesso. Peça ao Ricardo para cadastrar.'
          : 'Não deu para enviar agora (' + error.message + '). Tente de novo em alguns minutos.';
  });
  const sair = async () => { await sb.auth.signOut(); location.replace('/caixa'); };
  $('sair').addEventListener('click', sair);
  $('sair-bloqueado').addEventListener('click', sair);

  async function iniciar(session) {
    if (location.hash || location.search) history.replaceState(null, '', '/caixa');
    if (!session) { mostrarTela('tela-entrar'); return; }
    const { data: meu } = await sb.from('usuarios').select('id,nome,papel').maybeSingle();
    if (!meu) { mostrarTela('tela-bloqueado'); return; }
    eu = meu;
    $('quem-nome').textContent = meu.nome;
    mostrarTela('tela-caixa');
    chamarApi('/api/equipe', null, 'GET').then(j => { equipe = Object.fromEntries(j.equipe.map(u => [u.id, u.nome])); preencherFiltrosEquipe(); if (aberta) pintarCabecalho(); }).catch(() => { equipe = { [meu.id]: meu.nome }; preencherFiltrosEquipe(); });
    await carregarConversas();
    await carregarFunil();
    assinar();
    vigiar();
  }

  // ---------- Casca: seções, menu recolhido e tema ----------
  const SECOES = {
    conversas: ['Conversas'],
    funil: ['Funil'],
    tarefas: ['Tarefas'],
    produtos: ['Produtos', 'Cadastro das atividades e extras (combo, boia cross, arvorismo, decoração, massagem) com preço e regras. Chega na etapa C.'],
    agencias: ['Agências', 'Cadastro das agências e operadoras parceiras. Chega na etapa C.'],
    vagas: ['Vagas', 'O mapa de vagas completo depende do Silbeck real (ponte com o hotel). Por enquanto, as vagas aparecem no painel 🛏 de cada conversa.'],
    pagamentos: ['Pagamentos', 'Pix (Banco do Brasil), link de cartão (Cielo), reservas a receber e baixa automática. Chega na etapa E, depois do Silbeck real e dos bancos.'],
    painel: ['Painel', 'Indicadores de atendimento e de vendas. Chega na etapa F.'],
    regua: ['Régua de mensagens', 'Mensagens automáticas antes e depois da estadia, com modelos aprovados pela Meta. Chega na etapa F, com o 99117.'],
    ajustes: ['Ajustes do agente', 'Biblioteca de respostas, regras e revisão das respostas do Gilberto. Chega na etapa C.'],
  };
  const PRONTAS = ['conversas', 'funil', 'tarefas'];
  function irPara(v) {
    document.querySelectorAll('.nav [data-vista]').forEach(x => x.setAttribute('aria-selected', String(x.dataset.vista === v)));
    const [titulo, texto] = SECOES[v];
    $('titulo').textContent = titulo;
    document.querySelectorAll('section[data-painel]').forEach(sec => { sec.hidden = sec.dataset.painel !== (PRONTAS.includes(v) ? v : 'em-breve'); });
    $('eb-titulo').textContent = titulo; $('eb-texto').textContent = texto || '';
    if (v === 'funil') pintarFunil();
    if (v === 'tarefas') pintarTarefas();
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
  let aoVivo = false;
  async function atualizarTudo() { await carregarConversas(); await carregarFunil(); if (aberta) await recarregarAberta(); }
  function vigiar() {
    setInterval(() => { if (!aoVivo && !document.hidden) atualizarTudo(); }, 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) atualizarTudo(); });
  }

  // ---------- Lista de conversas ----------
  async function carregarConversas() {
    const sel = campos => sb.from('conversas').select(`id,status,atribuida_a,nao_lidas,ultima_msg_em,ultima_msg_cliente_em,contato:contatos(${campos},contato_identificadores(tipo,valor))`)
      .order('ultima_msg_em', { ascending: false, nullsFirst: false }).limit(300);
    let { data, error } = await sel('nome,email,observacoes');
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
      return { id: c.id, nome: ct.nome || tel || 'Sem nome', nomeSalvo: ct.nome || '', tel, email: ct.email, obs: ct.observacoes || '', status: c.status, atribuida_a: c.atribuida_a,
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
    ls.sort((a, b) => (b.ultima_msg_em || '').localeCompare(a.ultima_msg_em || ''));
    if (!ls.length) ul.append(el('div', { class: 'vazio', text: conversas.length ? 'Nenhuma conversa aqui.' : 'Nenhuma conversa ainda. Quando alguém mandar mensagem para o número do hotel, ela aparece aqui na hora.' }));
    ls.forEach(c => {
      const resp = c.atribuida_a ? (equipe[c.atribuida_a] || 'Equipe') : null;
      ul.append(el('button', { class: 'cx-item', type: 'button', 'aria-selected': String(c.id === aberta), onclick: () => abrir(c.id) },
        el('div', { class: 'cx-l1' }, el('span', { class: 'canal-ic', title: 'WhatsApp', text: 'WA' }), el('strong', { text: c.nome }), el('span', { class: 'cx-hora num', text: quando(c.ultima_msg_em) }),
          c.nao_lidas > 0 && c.id !== aberta ? el('span', { class: 'cx-nl num', text: c.nao_lidas, 'aria-label': c.nao_lidas + ' não lidas' }) : null),
        el('div', { class: 'cx-prev', text: c.previa ? (c.previa.direcao === 'saida' ? 'Você: ' : '') + textoMsg(c.previa) : '' }),
        !janelaAberta(c) && c.status === 'aberta' ? el('div', { class: 'cx-janela', text: 'A janela de 24 h expirou' }) : null,
        el('div', { class: 'cx-l3' }, el('span', { class: 'resp', text: resp ? iniciais(resp) : '–' }), el('span', { text: resp ? resp : 'Sem responsável' }))));
    });
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
    pintarOrcamentos(id);
    pintarPainel();
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
      el('div', { class: 'cx-quem' }, nomeBox, el('span', { class: 'canal', text: 'WhatsApp' + (c.tel && c.tel !== c.nome ? ' · ' + c.tel : '') })),
      el('div', { class: 'cx-ctrl' },
        seletorEtapaConversa(c),
        fim ? el('span', { class: 'pilula ' + (aj ? 'p-ok' : 'p-erro'), title: aj ? 'Dá para responder com texto livre até esse horário.' : 'Fora da janela, só modelos aprovados pela Meta.',
          text: aj ? 'Responder até ' + (fim.toDateString() !== new Date().toDateString() ? 'amanhã ' : '') + hora(fim.toISOString()) : 'Janela 24 h fechada' }) : null,
        stSel, rSel));
    // Composição: só com a janela aberta
    $('cx-compor').hidden = !aj; $('cx-fechada').hidden = aj;
  }

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
    const { data, error } = await sb.from('orcamentos').select('id,token,fonte,opcoes,aberturas,ultima_abertura_em,escolhida,criado_em,data_entrada,data_saida')
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
  $('resposta').addEventListener('input', ajustarAltura);
  $('resposta').addEventListener('keydown', e => {
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
  const gal = { cat: '', sel: [] };
  async function abrirGaleria() {
    if (!$('galeria').hidden) { fecharGaleria(); return; }
    $('galeria').hidden = false; $('abrir-fotos').setAttribute('aria-expanded', 'true');
    gal.sel = [];
    if (!biblioteca) {
      $('gal-grade').textContent = 'Carregando…';
      try { biblioteca = (await chamarApi('/api/fotos', null, 'GET')).grupos; } catch (e) { $('gal-grade').textContent = e.message; return; }
    }
    gal.cat = gal.cat || (biblioteca[0] && biblioteca[0].grupo) || '';
    pintarGaleria();
  }
  function fecharGaleria() { $('galeria').hidden = true; $('abrir-fotos').setAttribute('aria-expanded', 'false'); }
  function pintarGaleria() {
    const cats = $('gal-cats'), grade = $('gal-grade');
    cats.textContent = ''; grade.textContent = '';
    if (!biblioteca.length) { grade.append(el('p', { class: 'lat-txt', text: 'A biblioteca de fotos ainda está vazia.' })); return; }
    biblioteca.forEach(g => cats.append(el('button', { class: 'chip', type: 'button', 'aria-pressed': String(g.grupo === gal.cat), text: g.nome, onclick: () => { gal.cat = g.grupo; pintarGaleria(); } })));
    const g = biblioteca.find(x => x.grupo === gal.cat) || biblioteca[0];
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
      if (aberta !== id) return;
      const box = $('sug-texto'); box.textContent = '';
      baloes(j.mensagem).forEach(t => box.append(el('div', {}, linkar(t))));
      $('sug-notas').textContent = (j.simulador ? '⚠ Valores do SIMULADOR do Silbeck (fictícios): não envie a clientes reais. ' : '') + (j.precisa_equipe ? '⚠ Caso para a equipe. ' : '') + (j.notas_internas ? 'Notas: ' + j.notas_internas : '');
      $('sug-notas').className = 'sug-notas' + (j.precisa_equipe || j.simulador ? ' alerta' : '');
      $('sug-modelo').textContent = /\[\[/.test(j.mensagem) ? 'complete os [[ ]] antes de enviar' : '';
      $('sugestao').dataset.texto = j.mensagem;
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
  $('sug-usar').addEventListener('click', () => {
    const ta = $('resposta');
    ta.value = $('sugestao').dataset.texto || '';
    $('sugestao').hidden = $('sug-fotos').hidden; // se houver fotos sugeridas, o painel fica para enviá-las
    $('sug-texto').textContent = ''; $('sug-notas').textContent = '';
    ajustarAltura(); ta.focus();
    const i = ta.value.indexOf('[['); // já seleciona o primeiro trecho para completar
    if (i >= 0) ta.setSelectionRange(i, ta.value.indexOf(']]', i) + 2);
  });
  $('sug-descartar').addEventListener('click', () => { $('sugestao').hidden = true; });

  // ---------- Painéis da conversa (trilho à direita) ----------
  const TITULOS = { his: 'Ficha e histórico', orc: 'Montar orçamento', vag: 'Vagas por acomodação', res: 'Reservas e pagamentos', tar: 'Tarefas do cliente' };
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
    if (painel === 'res') lat.append(el('p', { class: 'lat-txt', text: 'As reservas criadas no Silbeck, a cobrança do sinal (Pix ou cartão) e a baixa automática aparecem aqui. Chega na etapa E, depois que o Silbeck real e os bancos estiverem ligados.' }));
    if (painel === 'tar') painelTarefas(lat, c);
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

  // Montar orçamento: datas e pessoas → cotação no Silbeck → até 3 opções → link da página no campo de resposta
  const orcForm = { entrada: '', saida: '', adultos: 2, idades: '' };
  function painelOrcamento(lat, c) {
    const hoje = new Date().toISOString().slice(0, 10);
    const ent = el('input', { type: 'date', min: hoje, value: orcForm.entrada }), sai = el('input', { type: 'date', min: hoje, value: orcForm.saida });
    const ad = el('input', { type: 'number', min: '1', max: '10', value: orcForm.adultos });
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
        const marcadas = [];
        r.opcoes.forEach(o => {
          const cb = el('input', { type: 'checkbox', onchange: ev => {
            if (ev.target.checked) { if (marcadas.length >= 3) { ev.target.checked = false; toast('No máximo 3 opções.'); return; } marcadas.push(o.codigo); } else marcadas.splice(marcadas.indexOf(o.codigo), 1);
            criar.toggleAttribute('disabled', !marcadas.length);
            criar.textContent = marcadas.length ? 'Criar orçamento com ' + marcadas.length + (marcadas.length > 1 ? ' opções' : ' opção') : 'Marque de 1 a 3 opções';
          } });
          res.append(el('label', { class: 'op-cot' }, cb, el('span', {}, el('b', { text: o.nome }), el('small', { text: o.vagas_no_periodo + ' vaga(s) · até ' + o.capacidade + ' pessoas' })), el('span', { class: 'pr' }, brl(o.valor_total), el('small', { text: brl(o.media_por_noite) + '/noite' }))));
        });
        if (r.esgotados_no_periodo.length) res.append(el('p', { class: 'lat-txt', text: 'Esgotados: ' + r.esgotados_no_periodo.join(', ') + '.' }));
        if (r.nao_comportam_o_grupo.length) res.append(el('p', { class: 'lat-txt', text: 'Não comportam o grupo: ' + r.nao_comportam_o_grupo.join(', ') + '.' }));
        const criar = el('button', { class: 'btn btn-destaque', type: 'button', disabled: true, text: 'Marque de 1 a 3 opções', onclick: async () => {
          criar.setAttribute('disabled', ''); criar.textContent = 'Criando…';
          try {
            const o = await chamarApi('/api/orcamento', { conversa_id: c.id, ...p, opcoes: marcadas.map(k => ({ acomodacoes: [k] })) });
            const ta = $('resposta');
            const primeiro = (c.nomeSalvo || '').split(/\s+/)[0];
            ta.value = (ta.value ? ta.value.trim() + '\n---\n' : '') + (primeiro ? primeiro + ', s' : 'S') + 'eparei as opções com vaga para vocês, com fotos e valores:\n' + o.link;
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
      sb.from('negocios').select('*,contato:contatos(nome,contato_identificadores(tipo,valor))').order('atualizado_em', { ascending: false }).limit(500),
      sb.from('tarefas').select('*').order('quando', { ascending: true }).limit(1000),
    ]);
    funilOk = !n.error;
    negocios = (n.data || []).map(x => {
      const idn = (x.contato && x.contato.contato_identificadores) || [];
      const wa = idn.find(i => i.tipo === 'whatsapp');
      return { ...x, nome: (x.contato && x.contato.nome) || (wa ? fmtTel(wa.valor) : 'Sem nome'), tel: wa ? fmtTel(wa.valor) : '' };
    });
    tarefas = t.data || [];
    const hojeFim = new Date(); hojeFim.setHours(23, 59, 59, 999);
    const urgentes = tarefas.filter(x => !x.feita && new Date(x.quando) <= hojeFim && (!x.responsavel_id || !eu || x.responsavel_id === eu.id)).length;
    $('qtd-tarefas').hidden = !urgentes; $('qtd-tarefas').textContent = urgentes;
    if (!$('gaveta').hidden) pintarFicha();
    const v = document.querySelector('.nav [aria-selected="true"]');
    if (v && v.dataset.vista === 'funil') pintarFunil();
    if (v && v.dataset.vista === 'tarefas') pintarTarefas();
    if (aberta) { pintarCabecalho(); if (painel === 'tar') pintarPainel(); }
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
    return el('article', { class: 'card-lead', draggable: 'true', tabindex: '0',
      ondragstart: e => { e.dataTransfer.setData('text/plain', n.id); e.dataTransfer.effectAllowed = 'move'; e.currentTarget.classList.add('arrastando'); },
      ondragend: e => e.currentTarget.classList.remove('arrastando'),
      onclick: () => abrirFicha(n.id), onkeydown: e => { if (e.key === 'Enter') abrirFicha(n.id); } },
      el('strong', { text: n.nome }),
      el('div', { class: 'linha' }, el('span', { class: 'pilula o-' + n.origem, text: ORIGENS[n.origem] || n.origem }), n.perfil ? el('span', { class: 'pilula', text: n.perfil }) : null),
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
      if (fichaNova) corpo.append(el('div', { class: 'rotulo', text: 'Contato' }), el('div', { class: 'grade-campos' }, campoF('Nome', inp('nome'), true), campoF('WhatsApp (com DDD)', inp('tel', 'tel', { placeholder: '67 99999-0000' }), true)));
      else corpo.append(el('div', { class: 'rotulo', text: 'Contato' }), el('p', { class: 'lat-txt', text: (n.tel || 'Sem WhatsApp') + (n.conversa_id ? '' : ' · sem conversa no CRM') }));
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
          const j = await salvarNegocio({ ...dados, etapa: f.etapa.value, nome: f.nome.value, telefone: f.tel.value }, 'Lead criado.');
          if (j) { fichaNova = false; fichaId = j.id; pintarFicha(); }
          return;
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
  function painelTarefas(lat, c) {
    const n = c && negocioDaConversa(c.id);
    if (!n) { lat.append(el('p', { class: 'lat-txt', text: funilOk ? 'Esta conversa ainda não tem negócio no funil.' : 'Falta rodar a migração 008 no Supabase.' })); return; }
    lat.append(el('button', { class: 'btn btn-editar', type: 'button', text: 'Abrir a ficha do negócio', onclick: () => abrirFicha(n.id) }));
    formTarefas(lat, n);
  }

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
