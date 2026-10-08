// CRM Cabanas: fase 1 (início). Recebe os eventos da Meta (WhatsApp) com verificação de assinatura.
// Segredos vêm do Secret Manager como variáveis de ambiente: META_VERIFY_TOKEN, META_APP_SECRET e
// SUPABASE_SECRET_KEY. Nada de chave no código. Conteúdo de mensagens vai para o banco (Supabase,
// São Paulo), nunca para página pública nem para o log.
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const gilberto = require('./gilberto');
const silbeck = require('./silbeck');
const transcricao = require('./transcricao');
const orcamento = require('./orcamento');
const voucher = require('./voucher');
const drive = require('./drive');
const produtos = require('./produtos');
const vitrine = require('./vitrine');
const massagem = require('./massagem');
const bb = require('./bb');
const pedidos = require('./pedidos');
const push = require('./push');
const path = require('path');

const porta = process.env.PORT || 8080;
const versao = process.env.VERSAO || 'local';
const VERIFY = process.env.META_VERIFY_TOKEN || '';
const APP_SECRET = process.env.META_APP_SECRET || '';
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = (process.env.SUPABASE_SECRET_KEY || '').trim(); // tira espaço/quebra de linha colados por engano
const bancoLigado = () => !!(SUPABASE_URL && SUPABASE_KEY);
// Chave PÚBLICA (sb_publishable_…), a única que pode ir para o navegador. Os dados continuam
// protegidos pelas regras do banco (RLS): sem login de alguém da equipe, ela não lê nada.
const SUPABASE_PUBLICA = (process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();
const chavePublicaOk = () => SUPABASE_PUBLICA.startsWith('sb_publishable_');
// Token permanente do usuário do sistema "CRM Cabanas" (Meta), para enviar mensagens.
const WA_TOKEN = (process.env.META_WHATSAPP_TOKEN || '').trim();
const GRAPH = process.env.META_GRAPH_URL || 'https://graph.facebook.com/v26.0'; // trocável só nos testes
const JANELA_MS = 24 * 3600 * 1000;

// Arquivos da caixa de entrada (carregados uma vez; lista fechada, nada de caminho vindo da URL).
const PUB = path.join(__dirname, 'public');
const TIPOS = { '.webmanifest': 'application/manifest+json', '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };
const ESTATICOS = {};
for (const [rota, arquivo] of [['/caixa', 'caixa.html'], ['/caixa.css', 'caixa.css'], ['/caixa.js', 'caixa.js'], ['/vendor/supabase-2.117.2.js', 'vendor/supabase-2.117.2.js'], ['/sw.js', 'sw.js'], ['/manifest.webmanifest', 'manifest.webmanifest']]) {
  try { ESTATICOS[rota] = { corpo: fs.readFileSync(path.join(PUB, arquivo)), tipo: TIPOS[path.extname(arquivo)] }; } catch (e) { /* arquivo ausente: rota fica 404 */ }
}
// A cada publicação a tela pede caixa.js/caixa.css com a versão no endereço: o navegador nunca fica com a versão velha.
const V = encodeURIComponent((process.env.VERSAO || 'local').replace(/[^\w.-]/g, ''));
if (ESTATICOS['/caixa']) ESTATICOS['/caixa'].corpo = Buffer.from(ESTATICOS['/caixa'].corpo.toString('utf8').replace('href="/caixa.css"', `href="/caixa.css?v=${V}"`).replace('src="/caixa.js"', `src="/caixa.js?v=${V}"`));
// Página do orçamento e fotos das acomodações: todos os arquivos das pastas public/o e public/fotos (lidos uma vez).
for (const [pasta, dir] of [['o', path.join(PUB, 'o')], ['fotos', process.env.FOTOS_DIR || path.join(PUB, 'fotos')]]) {
  let nomes = [];
  try { nomes = fs.readdirSync(dir); } catch (e) { /* pasta ausente */ }
  for (const n of nomes) if (TIPOS[path.extname(n)] && /^[\w.-]+$/.test(n) && !n.endsWith('.json')) ESTATICOS[`/${pasta}/${n}`] = { corpo: fs.readFileSync(path.join(dir, n)), tipo: TIPOS[path.extname(n)] };
}
const URL_PUBLICA = (process.env.URL_PUBLICA || 'https://crm-377803250649.southamerica-east1.run.app').replace(/\/$/, '');
function cabecalhosSeguranca() {
  const sup = SUPABASE_URL ? `${SUPABASE_URL} ${SUPABASE_URL.replace(/^https:/, 'wss:')}` : '';
  return {
    'Content-Security-Policy': `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; frame-src 'self' blob:; connect-src 'self' ${sup}; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'`,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
  };
}
// Chaves novas (sb_secret_…) vão só no cabeçalho apikey. Chaves antigas (JWT "eyJ…") precisam também do
// Authorization, senão o banco trata a chamada como visitante (anon) e nega as funções do servidor.
// Tipo da chave (nunca a chave): ajuda a ver se colaram a chave errada no Secret Manager.
function tipoChave(k) {
  if (!k) return 'nenhuma';
  if (k.startsWith('sb_secret_')) return `secreta (sb_secret), ${k.length} caracteres` + (/[^\w-]/.test(k) ? ', COM caracteres estranhos (copiada mascarada?)' : '');
  if (k.startsWith('sb_publishable_')) return 'PÚBLICA (sb_publishable): trocar pela secreta';
  if (k.startsWith('eyJ')) {
    try { const papel = JSON.parse(Buffer.from(k.split('.')[1], 'base64url').toString()).role; return 'antiga (JWT) papel=' + papel; } catch (e) { return 'antiga (JWT) ilegível'; }
  }
  return 'formato desconhecido';
}
const cabecalhosBanco = () => Object.assign({ apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
  SUPABASE_KEY.startsWith('eyJ') ? { Authorization: 'Bearer ' + SUPABASE_KEY } : {});

const recentes = []; // últimos eventos (sem conteúdo), só para a página de status
let ultimoErroBanco = null;
let ultimoErroMeta = null, ultimaFalhaGilberto = null; // diagnóstico em /saude (sem dados de cliente)
let ultimoDigitando = null; // resultado do último pedido de "digitando…" à Meta (diagnóstico, sem dados de cliente) // último erro de envio da Meta (código e mensagem, sem dados de cliente) // código e mensagem do banco (sem dados de cliente), para diagnóstico
const mascarar = n => (n ? String(n).replace(/^(\d{4})\d+(\d{3})$/, '$1•••••$2') : '?');

function assinaturaValida(corpo, cabecalho) {
  if (!APP_SECRET || !cabecalho || !cabecalho.startsWith('sha256=')) return false;
  const esperado = crypto.createHmac('sha256', APP_SECRET).update(corpo).digest('hex');
  const recebido = cabecalho.slice(7);
  return recebido.length === esperado.length &&
    crypto.timingSafeEqual(Buffer.from(recebido, 'hex'), Buffer.from(esperado, 'hex'));
}

// Chama uma função do banco (RPC do Supabase) com a chave secreta do servidor.
async function rpc(funcao, args, buscar = fetch) {
  const r = await buscar(`${SUPABASE_URL}/rest/v1/rpc/${funcao}`, {
    method: 'POST',
    headers: cabecalhosBanco(),
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) {
    let det = {};
    try { det = await r.json(); } catch (e) { /* sem corpo */ }
    ultimoErroBanco = { quando: new Date().toISOString(), funcao, http: r.status, codigo: det.code || null, mensagem: String(det.message || '').slice(0, 200), dica: String(det.hint || '').slice(0, 200) };
    throw new Error(`banco ${funcao}: ${r.status} ${det.code || ''}`);
  }
  return r.status === 204 ? null : r.json();
}

// Texto legível de cada tipo de mensagem (mídias são baixadas numa próxima etapa).
function corpoDe(m) {
  if (m.type === 'text') return m.text && m.text.body;
  if (m.type === 'button') return m.button && m.button.text;
  if (m.type === 'interactive') { const i = m.interactive || {}; return (i.button_reply || i.list_reply || {}).title; }
  if (m.type === 'reaction') return m.reaction && m.reaction.emoji;
  if (m.type === 'location') { const l = m.location || {}; return [l.name, l.address, l.latitude && `${l.latitude},${l.longitude}`].filter(Boolean).join(' · '); }
  const midia = m[m.type];
  return midia && midia.caption || null;
}

// Tarefas da venda (para o responsável) e alertas do sino: "Cliente pediu produto" (na hora, se veio do cliente)
// e "Lançar na conta" às 8h do dia do check-in (com a tarefa de lançar ligada ao alerta).
const as8h = data => { const d = new Date(data + 'T08:00:00-04:00'); return (d > new Date() ? d : new Date()).toISOString(); };
async function criarAlerta(a, buscar = fetch) {
  const r = await buscar(`${SUPABASE_URL}/rest/v1/alertas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify(a), signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (r && !r.ok) console.warn(JSON.stringify({ evento: 'alerta_nao_criado', http: r.status })); // banco sem a migração 013
  else if (r) notificarAlertas(buscar).catch(() => {}); // avisa no celular sem segurar quem criou o alerta
}
async function tarefasEAlertasDaVenda(p, venda, { negocio, responsavel, chegada, pedidoDoCliente, origemTxt, automatico }, buscar = fetch) {
  const nomes = [];
  let tarefaLancar = null;
  if (negocio) for (const t of produtos.tarefasDaVenda(p, venda, { data_entrada: chegada }).filter(t => !automatico || t.tipo === 'Lançar na conta do hóspede')) {
    const r = await buscar(`${SUPABASE_URL}/rest/v1/tarefas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ negocio_id: negocio, responsavel_id: responsavel || null, criado_por: 'CRM', ...t }) }).catch(() => null);
    const criada = r && r.ok ? (await r.json().catch(() => []))[0] : null;
    if (t.tipo === 'Lançar na conta do hóspede' && criada) tarefaLancar = criada.id;
    nomes.push(t.tipo);
  }
  const nome = p.nome + (venda.variacao ? ' (' + venda.variacao + ')' : '');
  const base = { conversa_id: venda.conversa_id, negocio_id: negocio || null, venda_id: venda.id || null };
  if (pedidoDoCliente) await criarAlerta({ ...base, tipo: 'produto_pedido', titulo: 'Cliente pediu produto',
    info: `${nome}${venda.valor_total != null ? ' · ' + produtos.brl(venda.valor_total) : ''} · ${origemTxt}. ${({ ativ: 'Agendar no sistema das atividades', terc: 'Pedir o horário ao parceiro', simples: 'Preparar' })[p.tipo_reserva] || 'Reservar'} e confirmar com o cliente.` }, buscar);
  const dia = venda.data_uso && venda.data_uso < (chegada || '9999') ? venda.data_uso : (chegada || venda.data_uso);
  if (venda.id && dia) await criarAlerta({ ...base, tarefa_id: tarefaLancar, tipo: 'lancar_conta', titulo: 'Lançar na conta do hóspede',
    info: `${nome} · ${produtos.brl(venda.valor_total)} · check-in ${dia.split('-').reverse().join('/')}. Lançar na conta (pago no check-out).`, quando: as8h(dia) }, buscar);
  return nomes;
}

// Aceite do cliente (botão da oferta ou extra marcado na página do orçamento): o CRM registra a venda na conta do hóspede
// e cria as tarefas para a equipe reservar (agendar/preparar/pedir horário + lançar na conta), para o responsável da conversa.
// Se faltar dado para fechar o valor (ex.: qual das 3 massagens), cria a tarefa de confirmar com o cliente.
async function aceiteDoCliente({ conversa_id, oferta_id, produto_codigo, variacao, origem, quantidade, adicionais, data_uso, horario, automatico }, buscar = fetch) {
  const p = await produtoPorCodigo(produto_codigo, buscar).catch(() => null);
  if (!p) return null;
  const nr = await buscar(`${SUPABASE_URL}/rest/v1/negocios?conversa_id=eq.${conversa_id}&select=id,etapa,data_entrada,responsavel_id&order=criado_em.desc&limit=5`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const ns = nr && nr.ok ? await nr.json().catch(() => []) : [];
  const negocio = ns.find(x => !['res', 'perd'].includes(x.etapa)) || ns[0] || null;
  const cr = await buscar(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${conversa_id}&select=atribuida_a`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const responsavel = ((cr && cr.ok ? (await cr.json().catch(() => []))[0] : null) || {}).atribuida_a || (negocio && negocio.responsavel_id) || null;
  // Pessoas e data: do último orçamento da conversa (ou do negócio)
  const or = await buscar(`${SUPABASE_URL}/rest/v1/orcamentos?conversa_id=eq.${conversa_id}&select=adultos,criancas_idades,data_entrada&order=criado_em.desc&limit=1`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const orc = (or && or.ok ? (await or.json().catch(() => []))[0] : null) || null;
  const pessoas = orc ? orc.adultos + (orc.criancas_idades || []).filter(i => !p.idade_minima || i >= p.idade_minima).length : null;
  const chegada = (negocio && negocio.data_entrada) || (orc && orc.data_entrada) || null;
  const vs = Array.isArray(p.variacoes) ? p.variacoes : [];
  const nomeVar = variacao || (vs.length === 1 ? vs[0].nome : null);
  const qtd = quantidade || (p.unidade === 'pessoa' ? pessoas : 1);
  const origemTxt = ({ pagina: 'marcou na página do orçamento', vitrine: 'escolheu na página de extras' })[origem] || 'aceitou no WhatsApp';
  const tarefa = t => buscar(`${SUPABASE_URL}/rest/v1/tarefas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
    body: JSON.stringify({ negocio_id: negocio.id, responsavel_id: responsavel, criado_por: 'CRM', ...t }) }).catch(() => null);
  let v = null;
  try { if (qtd) v = produtos.calcularVenda(p, { variacao: nomeVar, adicionais: adicionais || [], quantidade: qtd }); } catch (e) { v = null; }
  if (!v) { // falta a opção, as pessoas ou o preço em número: a equipe confirma
    if (negocio) {
      await tarefa({ tipo: 'Confirmar e registrar venda', descricao: `O cliente ${origemTxt}: ${p.nome}${nomeVar ? ' (' + nomeVar + ')' : ''}. Confirme ${!nomeVar && vs.length > 1 ? 'a opção (' + vs.map(x => x.nome).join(', ') + '), ' : ''}${!qtd ? 'quantas pessoas, ' : ''}a data e registre a venda no 🛍 da conversa.`, quando: new Date().toISOString() });
      await eventoNegocio(negocio.id, `Cliente ${origemTxt}: ${p.nome}${nomeVar ? ' (' + nomeVar + ')' : ''} · falta confirmar para registrar a venda`, 'cliente', buscar);
    }
    await criarAlerta({ conversa_id, negocio_id: negocio ? negocio.id : null, tipo: 'produto_pedido', titulo: 'Cliente pediu produto',
      info: `${p.nome}${nomeVar ? ' (' + nomeVar + ')' : ''} · ${origemTxt}. Falta confirmar ${!nomeVar && vs.length > 1 ? 'a opção, ' : ''}${!qtd ? 'quantas pessoas, ' : ''}a data, e registrar a venda.` }, buscar);
    return { venda: null, p, variacao: nomeVar };
  }
  const venda = { conversa_id, negocio_id: negocio ? negocio.id : null, oferta_id: oferta_id || null, produto_codigo: p.codigo, produto_nome: p.nome, ...v,
    data_uso: data_uso || (p.tipo_reserva === 'ativ' ? null : chegada), horario: horario || null,
    observacoes: automatico ? `O cliente ${origemTxt}. Pedido enviado à parceira pelo CRM (confirmação automática).` : `O cliente ${origemTxt}. Confirmar ${p.tipo_reserva === 'simples' ? 'a data' : 'o dia e o horário'} com ele.`, criado_por: null };
  const r = await buscar(`${SUPABASE_URL}/rest/v1/vendas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, body: JSON.stringify(venda), signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error('venda ' + r.status);
  const salva = (await r.json().catch(() => []))[0] || venda;
  await tarefasEAlertasDaVenda(p, { ...venda, id: salva.id }, { negocio: negocio && negocio.id, responsavel, chegada, pedidoDoCliente: !automatico, origemTxt, automatico }, buscar);
  if (negocio) {
    await eventoNegocio(negocio.id, `Cliente ${origemTxt}: ${p.nome}${v.variacao ? ' (' + v.variacao + ')' : ''} · venda registrada ${produtos.brl(v.valor_total)} na conta do hóspede`, 'cliente', buscar);
  }
  return { venda: salva, p, negocio_id: negocio && negocio.id };
}
// Pedido de extra (dono, 06/10/2026): o cliente recebe na hora a confirmação de que o pedido chegou e, quando a
// equipe marca "✓ Reservado", a confirmação da reserva com dia e horário. Não depende do modo do Gilberto.
const ddmm = d => d ? d.split('-').reverse().slice(0, 2).join('/') : '';
function linhaExtra(p, v, variacao) {
  const nome = (p ? p.nome : (v && v.produto_nome) || 'Extra') + ((v && v.variacao) || variacao ? ' (' + ((v && v.variacao) || variacao) + ')' : '');
  const q = v && v.quantidade ? (p && p.unidade === 'pessoa' ? v.quantidade + (v.quantidade > 1 ? ' pessoas' : ' pessoa') : v.quantidade > 1 ? v.quantidade + 'x' : '') : '';
  return '• ' + [nome, q, v && v.valor_total != null ? produtos.brl(v.valor_total) : ''].filter(Boolean).join(' · ');
}
async function primeiroNome(conversa, buscar = fetch) {
  const c = (await getJson(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${conversa}&select=contato:contatos(nome)`, buscar).catch(() => []))[0];
  return String((c && c.contato && c.contato.nome) || '').trim().split(/\s+/)[0];
}
async function avisarPedidoExtra(conversa, itens, buscar = fetch) {
  itens = (itens || []).filter(x => x && x.p);
  if (!itens.length || !WA_TOKEN) return null;
  const agenda = itens.some(x => ['ativ', 'terc'].includes(x.p.tipo_reserva)), parceira = itens.some(x => x.pedidoParceiro);
  const nome = await primeiroNome(conversa, buscar);
  const texto = ['Recebi seu pedido' + (nome ? ', ' + nome : '') + '! 🌿', '', ...itens.map(x => linhaExtra(x.p, x.venda, x.variacao) + (x.pedidoParceiro ? ' · ' + massagem.quando(x.pedidoParceiro.data, x.pedidoParceiro.horario) : '')), '',
    'Vai na conta da hospedagem, acertada no check-out. ' + (parceira ? 'Já pedi a confirmação do horário à massoterapeuta e' : 'Nossa equipe vai ' + (agenda ? 'reservar o horário' : 'preparar tudo') + ' e') + ' eu te confirmo por aqui assim que estiver garantido.'].join('\n');
  try {
    const { conv, para } = await carregarConversaParaEnvio(conversa, buscar);
    await enviarTexto(conv, para, texto, 'gilberto', buscar);
    return { enviada: true };
  } catch (e) {
    console.warn(JSON.stringify({ evento: 'aviso_pedido_extra', erro: String(e.message || e).slice(0, 200) }));
    return null; // janela fechada ou erro: o alerta da equipe continua valendo
  }
}
// Fora da janela de 24 h a Meta só aceita modelo aprovado: a confirmação do extra usa o modelo "extra_confirmado"
// (cadastrado pela equipe em Modelos; os exemplos para a análise da Meta vão daqui).
const MODELO_EXTRA = { nome: 'extra_confirmado', categoria: 'UTILITY',
  texto: 'Olá, {{1}}! ✅ Seu pedido no Hotel Cabanas está reservado: {{2}}, {{3}}. O valor vai na conta da hospedagem, acertado no check-out. Qualquer dúvida, é só responder esta mensagem.',
  exemplos: ['Ana', 'Combo boia cross + arvorismo para 2 pessoas', 'dia 16/11 às 9h'] };
async function enviarModeloNaConversa(conversaId, nomeModelo, vs, autor, buscar = fetch, botoes = []) {
  const conv = (await getJson(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${conversaId}&select=id,canal,numero_id,contato:contatos(contato_identificadores(tipo,valor))`, buscar))[0];
  const wa = conv && conv.canal === 'wa' && ((conv.contato || {}).contato_identificadores || []).find(i => i.tipo === 'whatsapp');
  if (!wa) throw new ErroEnvio(400, 'Este contato não tem WhatsApp.');
  const m = (await modelosDoNumero(conv.numero_id, buscar)).find(x => x.nome === nomeModelo && x.status === 'APPROVED');
  if (!m) throw new ErroEnvio(409, 'o modelo "' + nomeModelo + '" ainda não está aprovado pela Meta');
  const vals = vs.slice(0, m.variaveis).map(v => String(v || '').replace(/\s+/g, ' ').trim().slice(0, 200) || '-');
  const r = await chamarMeta(`${encodeURIComponent(conv.numero_id)}/messages`, { messaging_product: 'whatsapp', recipient_type: 'individual', to: numeroParaEnvio(wa.valor), type: 'template',
    template: { name: m.nome, language: { code: m.idioma }, components: [...(vals.length ? [{ type: 'body', parameters: vals.map(text => ({ type: 'text', text })) }] : []),
      ...botoes.map((b, i) => ({ type: 'button', sub_type: b.url ? 'url' : 'quick_reply', index: String(i), parameters: [b.url ? { type: 'text', text: b.url } : { type: 'payload', payload: b.payload }] }))] } }, buscar);
  if (!r.ok || !r.json.messages || !r.json.messages[0]) throw new ErroEnvio(502, 'a Meta não aceitou o modelo' + ((r.json.error || {}).code ? ' (código ' + r.json.error.code + ')' : ''));
  const texto = [m.cabecalho, preencher(m.corpo, vals), m.rodape].filter(Boolean).join('\n\n');
  await rpc('registrar_saida_whatsapp', { p_conversa: conv.id, p_wamid: r.json.messages[0].id, p_corpo: texto, p_autor: autor }, buscar);
  return texto;
}
async function confirmarExtraAoCliente(venda, por, buscar = fetch) {
  if (!venda.conversa_id || !WA_TOKEN) return { enviada: false, motivo: 'sem WhatsApp' };
  const p = await produtoPorCodigo(venda.produto_codigo, buscar).catch(() => null);
  const nome = await primeiroNome(venda.conversa_id, buscar);
  const hora = h => /^\d{2}:\d{2}$/.test(h || '') ? vitrine.horaBR(h) : h;
  const quando = venda.data_uso ? '📅 Dia ' + ddmm(venda.data_uso) + (venda.horario ? ' às ' + hora(venda.horario) : '') : venda.horario ? '🕘 ' + hora(venda.horario) : '';
  const texto = ['Tudo certo' + (nome ? ', ' + nome : '') + '! ✅ Seu pedido está reservado:', '', linhaExtra(p, venda), quando,
    '💳 Na conta da hospedagem, acertado no check-out.', '', 'Qualquer dúvida, é só chamar aqui 🌿'].filter((l, i, a) => l || a[i - 1]).join('\n');
  try {
    const { conv, para } = await carregarConversaParaEnvio(venda.conversa_id, buscar);
    await enviarTexto(conv, para, texto, por || 'gilberto', buscar);
    return { enviada: true };
  } catch (e) {
    if (e.http !== 409) return { enviada: false, motivo: String(e.message || e).slice(0, 160) };
    try { // janela de 24 h fechada: vai pelo modelo aprovado
      const item = linhaExtra(p, venda).slice(2).replace(/ · (R\$[^·]*)$/, '').replace(/ · /g, ' para ');
      const quandoTxt = venda.data_uso ? 'dia ' + ddmm(venda.data_uso) + (venda.horario ? ' às ' + hora(venda.horario) : '') : venda.horario ? 'às ' + hora(venda.horario) : 'no dia e horário combinados com a equipe';
      await enviarModeloNaConversa(venda.conversa_id, MODELO_EXTRA.nome, [nome || 'tudo bem', item, quandoTxt], por || 'gilberto', buscar);
      return { enviada: true, modelo: true };
    } catch (e2) {
      return { enviada: false, motivo: 'a janela de 24 h do WhatsApp fechou e ' + String(e2.message || e2).slice(0, 120) + ' (cadastre em Modelos: ' + MODELO_EXTRA.nome + ')' };
    }
  }
}
// ---------- Massagem com a parceira pelo WhatsApp (dono, 06/10/2026) ----------
// O hóspede escolhe na página de extras; o CRM manda à parceira um link único (/p/…) em que ela confirma ou, se não
// puder, indica até 3 horários; o hóspede escolhe um em /mc/… (já confirmado) (dono, 06/10/2026). 3 h sem resposta: aviso à equipe;
// 24 h: o pedido expira e nada mais vai para ela (fora da janela de 24 h cada mensagem seria cobrada).
const MODELO_MASSAGEM = { nome: 'massagem_pedido', categoria: 'UTILITY',
  texto: 'Olá, {{1}}! Novo pedido de massagem pelo Hotel Cabanas: {{2}}. Hóspede: {{3}}. Toque no botão para confirmar ou indicar outro horário. O link vale por 24 horas.',
  exemplos: ['Natália', 'Massagem relaxante, sáb, 16/11 às 9h, à beira do rio', 'Ana'], link: { texto: 'Responder pedido', caminho: '/p/', exemplo: 'AbCdEfGhIjKlMnOpQrStUv' } };
const MODELO_OPCOES = { nome: 'massagem_opcoes', categoria: 'UTILITY',
  texto: 'Olá, {{1}}! A massoterapeuta não tem vaga no horário que você pediu para a massagem, mas separou outras opções. Toque no botão para escolher a que fica melhor para você.',
  exemplos: ['Ana'], link: { texto: 'Escolher horário', caminho: '/mc/', exemplo: 'AbCdEfGhIjKlMnOpQrStUv' } };
const MODELO_AVISO_PARCEIRA = { nome: 'massagem_aviso', categoria: 'UTILITY',
  texto: 'Olá, {{1}}! Atualização do pedido de massagem do Hotel Cabanas: {{2}}. Obrigado!',
  exemplos: ['Natália', 'o hóspede escolheu sáb, 16/11 às 15h, à beira do rio, e a massagem está confirmada'] };
let parceiraCache = { ate: 0, v: null };
async function parceiraMassagem(buscar = fetch) {
  if (process.env.K_SERVICE && parceiraCache.ate > Date.now()) return parceiraCache.v; // fora do Cloud Run (testes) lê sempre
  const v = ((await getJson(`${SUPABASE_URL}/rest/v1/config?chave=eq.parceira_massagem&select=valor`, buscar))[0] || {}).valor || null;
  parceiraCache = { ate: Date.now() + 60000, v: v && v.whatsapp ? v : null };
  return parceiraCache.v;
}
const ehParceira = (de, pc) => !!(pc && chaveNumero(de) && chaveNumero(de) === chaveNumero(pc.whatsapp));
const lerBotaoParceira = id => { const m = /^mp:([0-9a-f-]{36}):(s|n)$/.exec(String(id || '')); return m ? { pedido: m[1], aceito: m[2] === 's' } : null; };
// Horários já tomados (pedidos em andamento ou confirmados e as opções oferecidas), a partir de hoje
async function ocupadosMassagem(buscar = fetch, exceto = null) {
  const hoje = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
  const l = await getJson(`${SUPABASE_URL}/rest/v1/pedidos_parceiro?situacao=in.(aguardando_parceiro,opcoes_enviadas,confirmado)&data=gte.${hoje}&select=id,data,horario,situacao,opcoes&limit=500`, buscar);
  const out = {};
  const pôr = (d, h) => { d = String(d).slice(0, 10); (out[d] = out[d] || []).includes(h) || out[d].push(h); };
  for (const x of l) if (x.id !== exceto) { pôr(x.data, x.horario); if (x.situacao === 'opcoes_enviadas') (x.opcoes || []).forEach(o => pôr(o.data, o.horario)); }
  return out;
}
async function pedidoParceiro(filtro, buscar = fetch) {
  return (await getJson(`${SUPABASE_URL}/rest/v1/pedidos_parceiro?${filtro}&select=*&limit=1`, buscar))[0] || null;
}
// Conversa do CRM com a parceira (criada na primeira vez), pelo mesmo número do hotel que atende o hóspede
async function conversaDaParceira(pc, numeroId, buscar = fetch) {
  const tel = whatsE164(pc.whatsapp);
  let dono = await donoDoWhatsapp(tel, buscar), contatoId = dono && dono.contato_id;
  if (!contatoId) {
    const ct = await buscar(`${SUPABASE_URL}/rest/v1/contatos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, body: JSON.stringify({ nome: (pc.nome || 'Parceira') + ' (massoterapeuta)' }), signal: AbortSignal.timeout(5000) });
    if (!ct.ok) throw new ErroEnvio(502, 'Não deu para criar o contato da parceira.');
    contatoId = (await ct.json())[0].id;
    await buscar(`${SUPABASE_URL}/rest/v1/contato_identificadores`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ contato_id: contatoId, tipo: 'whatsapp', valor: tel }), signal: AbortSignal.timeout(5000) });
  }
  let conv = (await getJson(`${SUPABASE_URL}/rest/v1/conversas?contato_id=eq.${contatoId}&canal=eq.wa&numero_id=eq.${numeroId}&select=id,ultima_msg_cliente_em`, buscar))[0];
  if (!conv) {
    const nc = await buscar(`${SUPABASE_URL}/rest/v1/conversas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, body: JSON.stringify({ contato_id: contatoId, canal: 'wa', numero_id: numeroId, gilberto_pausado: true }), signal: AbortSignal.timeout(5000) });
    if (!nc.ok) throw new ErroEnvio(502, 'Não deu para abrir a conversa com a parceira.');
    conv = (await nc.json())[0];
  }
  return conv;
}
const janelaAbertaEm = c => !!(c && c.ultima_msg_cliente_em && Date.now() - new Date(c.ultima_msg_cliente_em).getTime() < JANELA_MS);
// Mensagem livre (dentro da janela) para uma conversa: texto e, se houver, botões de resposta ou botão de link
async function enviarInterativo(conversaId, corpo, { botoes, link } = {}, autor = 'gilberto', buscar = fetch) {
  const { conv, para } = await carregarConversaParaEnvio(conversaId, buscar);
  if (!botoes && !link) return enviarTexto(conv, para, corpo, autor, buscar);
  const interactive = botoes
    ? { type: 'button', body: { text: corpo.slice(0, 1024) }, action: { buttons: botoes.map(b => ({ type: 'reply', reply: { id: b.id, title: b.titulo.slice(0, 20) } })) } }
    : { type: 'cta_url', body: { text: corpo.slice(0, 1024) }, action: { name: 'cta_url', parameters: { display_text: link.texto.slice(0, 20), url: link.url } } };
  const r = await chamarMeta(`${encodeURIComponent(conv.numero_id)}/messages`, { messaging_product: 'whatsapp', recipient_type: 'individual', to: para, type: 'interactive', interactive }, buscar);
  if (!r.ok || !r.json.messages || !r.json.messages[0]) throw new ErroEnvio(502, 'A Meta não aceitou o envio' + ((r.json.error || {}).code ? ' (código ' + r.json.error.code + ')' : '') + '.');
  const visto = corpo + (botoes ? '\n\n' + botoes.map(b => '[ ' + b.titulo + ' ]').join(' ') : '\n\n[ ' + link.texto + ' ] ' + link.url);
  await rpc('registrar_saida_whatsapp', { p_conversa: conv.id, p_wamid: r.json.messages[0].id, p_corpo: visto, p_autor: autor }, buscar);
  return true;
}
async function patchPedido(id, dados, buscar = fetch) {
  await buscar(`${SUPABASE_URL}/rest/v1/pedidos_parceiro?id=eq.${id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
    body: JSON.stringify({ ...dados, atualizado_em: new Date().toISOString() }) });
}
// Cria o pedido e manda para a parceira. Devolve o pedido, ou null (aí a equipe pede à mão pelo alerta de sempre).
async function pedirAParceira({ venda, item, conversa_id, negocio_id, numeroId, hospede }, buscar = fetch) {
  const pc = await parceiraMassagem(buscar);
  if (!pc || !WA_TOKEN || !numeroId) return null;
  const pd = { venda_id: venda && venda.id || null, conversa_id, negocio_id: negocio_id || null, produto_codigo: item.codigo, servico: (item.variacao || item.nome) + (item.quantidade > 1 ? ' · ' + item.quantidade + ' pessoas' : ''),
    adicionais: item.adicionais || [], local: item.local, data: item.data, horario: item.horario, hospede: hospede || null, token_parceiro: crypto.randomBytes(16).toString('base64url') };
  const rc = await buscar(`${SUPABASE_URL}/rest/v1/pedidos_parceiro`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, body: JSON.stringify(pd), signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!rc || !rc.ok) { console.warn(JSON.stringify({ evento: 'pedido_parceiro_nao_criado', http: rc && rc.status })); return null; } // sem a migração 025
  const salvo = (await rc.json())[0];
  try {
    const conv = await conversaDaParceira(pc, numeroId, buscar);
    const det = massagem.detalhe(salvo), nome = String(pc.nome || '').split(/\s+/)[0] || 'tudo bem';
    // Um link só: na página ela confirma ou, se não puder, indica outros horários
    if (janelaAbertaEm(conv)) {
      await enviarInterativo(conv.id, `Olá, ${nome}! Novo pedido de massagem pelo Hotel Cabanas 🌿\n\n${det}\nHóspede: ${salvo.hospede || '-'}\n\nToque no botão para confirmar ou indicar outro horário. O link vale por 24 horas.`,
        { link: { texto: 'Responder pedido', url: URL_PUBLICA + '/p/' + salvo.token_parceiro } }, 'gilberto', buscar);
    } else {
      await enviarModeloNaConversa(conv.id, MODELO_MASSAGEM.nome, [nome, det, salvo.hospede || '-'], 'gilberto', buscar, [{ url: salvo.token_parceiro }]);
    }
    const agora = new Date();
    await patchPedido(salvo.id, { enviado_em: agora.toISOString(), expira_em: new Date(agora.getTime() + massagem.VALIDADE_MS).toISOString() }, buscar);
    if (negocio_id) await eventoNegocio(negocio_id, 'Pedido de massagem enviado à ' + (pc.nome || 'parceira') + ': ' + det, 'CRM', buscar).catch(() => {});
    return salvo;
  } catch (e) {
    console.warn(JSON.stringify({ evento: 'pedido_parceiro_nao_enviado', erro: String(e.message || e).slice(0, 200) }));
    await patchPedido(salvo.id, { situacao: 'cancelado' }, buscar).catch(() => {});
    return null;
  }
}
// Massagem confirmada (pela parceira no horário pedido ou pelo hóspede numa opção dela): avisa o hóspede e a equipe
async function confirmarMassagem(pd, data, horario, por, buscar = fetch) {
  await patchPedido(pd.id, { situacao: 'confirmado', data, horario, respondido_em: pd.respondido_em || new Date().toISOString() }, buscar);
  const det = massagem.detalhe({ ...pd, data, horario });
  let avisado = false;
  if (pd.venda_id) {
    await buscar(`${SUPABASE_URL}/rest/v1/vendas?id=eq.${pd.venda_id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ data_uso: data, horario }), signal: AbortSignal.timeout(5000) }).catch(() => null);
    const venda = (await getJson(`${SUPABASE_URL}/rest/v1/vendas?id=eq.${pd.venda_id}&select=*`, buscar))[0];
    if (venda) avisado = !!(await confirmarExtraAoCliente(venda, 'gilberto', buscar)).enviada;
    await resolverAlertasDaVenda(pd.venda_id, ['produto_pedido'], null, buscar);
  }
  await criarAlerta({ conversa_id: pd.conversa_id, negocio_id: pd.negocio_id, venda_id: pd.venda_id, tipo: 'parceiro_confirmou', titulo: 'Massagem confirmada',
    info: det + (pd.hospede ? ' · hóspede ' + pd.hospede : '') + '. ' + (avisado ? 'O hóspede já recebeu a confirmação no WhatsApp.' : 'Avise o hóspede (o WhatsApp não saiu).') }, buscar);
  if (pd.negocio_id) await eventoNegocio(pd.negocio_id, 'Massagem confirmada (' + por + '): ' + det, 'CRM', buscar).catch(() => {});
  return avisado;
}
// Toque da parceira em [Confirmo] / [Não posso] (a janela dela está aberta: as respostas a ela são grátis)
async function respostaParceira({ pedido, aceito }, de, conversaParceira, buscar = fetch) {
  const pc = await parceiraMassagem(buscar);
  if (!ehParceira(de, pc)) return;
  const pd = await pedidoParceiro(`id=eq.${pedido}`, buscar);
  if (!pd) return;
  const vencido = pd.expira_em && new Date(pd.expira_em).getTime() < Date.now();
  const responder = (t, extra) => enviarInterativo(conversaParceira, t, extra, 'gilberto', buscar).catch(e => console.warn(JSON.stringify({ evento: 'resposta_parceira', erro: String(e.message || e).slice(0, 200) })));
  if (pd.situacao !== 'aguardando_parceiro' || vencido) return responder(pd.situacao === 'confirmado' ? 'Esse pedido já está confirmado. Obrigado! 🌿' : 'Esse pedido não está mais aberto (já respondido ou expirado). A equipe do hotel segue com o hóspede. Obrigado! 🌿');
  if (aceito) {
    await confirmarMassagem(pd, String(pd.data).slice(0, 10), pd.horario, (pc.nome || 'parceira') + ' no WhatsApp', buscar);
    return responder('Confirmado ✅ ' + massagem.detalhe(pd) + '. Obrigado! O hóspede já foi avisado.');
  }
  await patchPedido(pd.id, { respondido_em: new Date().toISOString() }, buscar);
  if (pd.negocio_id) await eventoNegocio(pd.negocio_id, 'A massoterapeuta não pode em ' + massagem.quando(pd.data, pd.horario) + ': vai indicar outros horários', 'CRM', buscar).catch(() => {});
  return responder('Sem problema! Toque no botão e marque até 3 horários livres: o hóspede escolhe um e a massagem já fica confirmada.', { link: { texto: 'Indicar horários', url: URL_PUBLICA + '/p/' + pd.token_parceiro } });
}
// A parceira indicou opções: o hóspede recebe o link para escolher (texto livre na janela; fora dela, o modelo)
async function enviarOpcoesAoCliente(pd, buscar = fetch) {
  const nome = await primeiroNome(pd.conversa_id, buscar);
  const url = URL_PUBLICA + '/mc/' + pd.token_cliente;
  try {
    await enviarInterativo(pd.conversa_id, `${nome ? nome + ', a' : 'A'} massoterapeuta não tem vaga em ${massagem.quando(pd.data, pd.horario)}, mas separou outros horários para você 🌿 Toque no botão para escolher o que fica melhor.`,
      { link: { texto: 'Escolher horário', url } }, 'gilberto', buscar);
    return true;
  } catch (e) {
    if (e.http !== 409) return false;
    return enviarModeloNaConversa(pd.conversa_id, MODELO_OPCOES.nome, [nome || 'tudo bem'], 'gilberto', buscar, [{ url: pd.token_cliente }]).then(() => true).catch(() => false);
  }
}
// Avisa a parceira da escolha do hóspede (só se a janela dela ainda está aberta; senão, a equipe avisa)
async function avisarParceira(pd, texto, buscar = fetch) {
  const pc = await parceiraMassagem(buscar);
  const numeroId = ((await getJson(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${pd.conversa_id}&select=numero_id`, buscar))[0] || {}).numero_id;
  const conv = pc && numeroId ? await conversaDaParceira(pc, numeroId, buscar).catch(() => null) : null;
  if (conv && janelaAbertaEm(conv) && await enviarInterativo(conv.id, texto, {}, 'gilberto', buscar).then(() => true).catch(() => false)) return true;
  // Janela dela fechada: vai pelo modelo aprovado (custa centavos), sem depender da equipe (dono, 06/10/2026)
  const curto = String(texto).replace(/\s*(Obrigad[oa]!?|✅|🌿)\s*/g, ' ').replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
  if (conv && await enviarModeloNaConversa(conv.id, MODELO_AVISO_PARCEIRA.nome, [String(pc.nome || '').split(/\s+/)[0] || 'tudo bem', curto.charAt(0).toLowerCase() + curto.slice(1)], 'gilberto', buscar).then(() => true).catch(() => false)) return true;
  await criarAlerta({ conversa_id: pd.conversa_id, negocio_id: pd.negocio_id, venda_id: pd.venda_id, tipo: 'parceiro_sem_resposta', titulo: 'Avise a massoterapeuta',
    info: texto + ' (o WhatsApp não saiu: o modelo massagem_aviso ainda não está aprovado? Avise a massoterapeuta)' }, buscar);
  return false;
}
// Agendador (a cada 2 min): 3 h sem resposta → aviso à equipe; 24 h → o pedido expira
async function verificarPedidosParceiro(buscar = fetch) {
  const agora = Date.now();
  const l = await getJson(`${SUPABASE_URL}/rest/v1/pedidos_parceiro?situacao=eq.aguardando_parceiro&enviado_em=not.is.null&select=*&limit=200`, buscar);
  let avisos = 0, expirados = 0;
  for (const pd of l) {
    const det = massagem.detalhe(pd) + (pd.hospede ? ' · hóspede ' + pd.hospede : '');
    if (pd.expira_em && new Date(pd.expira_em).getTime() < agora) {
      await patchPedido(pd.id, { situacao: 'expirado' }, buscar);
      await criarAlerta({ conversa_id: pd.conversa_id, negocio_id: pd.negocio_id, venda_id: pd.venda_id, tipo: 'parceiro_sem_resposta', titulo: 'Massagem: pedido expirou (24 h)',
        info: det + '. A massoterapeuta não respondeu em 24 h e o CRM não manda mais nada para ela. Combine com ela e avise o hóspede.' }, buscar);
      expirados++;
    } else if (!pd.respondido_em && !pd.avisado_3h_em && agora - new Date(pd.enviado_em).getTime() > massagem.PRAZO_AVISO_MS) {
      await patchPedido(pd.id, { avisado_3h_em: new Date().toISOString() }, buscar);
      await criarAlerta({ conversa_id: pd.conversa_id, negocio_id: pd.negocio_id, venda_id: pd.venda_id, tipo: 'parceiro_sem_resposta', titulo: 'Massagem: sem resposta há 3 h',
        info: det + '. A massoterapeuta ainda não respondeu. O pedido vale até ' + quandoBR(pd.expira_em) + '.' }, buscar);
      avisos++;
    }
  }
  return { avisos, expirados };
}
async function respostaDoBotao({ oferta, aceito, opcao }, titulo, buscar) {
  const r = await buscar(`${SUPABASE_URL}/rest/v1/ofertas?id=eq.${oferta}&select=id,conversa_id,negocio_id,produto_codigo,produto_nome,situacao`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
  const o = r.ok ? (await r.json())[0] : null;
  if (!o || o.situacao !== 'oferecido') return;
  await buscar(`${SUPABASE_URL}/rest/v1/ofertas?id=eq.${o.id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' },
    body: JSON.stringify({ situacao: aceito ? 'aceito' : 'recusado', respondido_em: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
  if (!aceito) { if (o.negocio_id) await eventoNegocio(o.negocio_id, 'Cliente recusou pelo botão: ' + o.produto_nome, 'cliente', buscar); return; }
  const p = await produtoPorCodigo(o.produto_codigo, buscar).catch(() => null);
  const vs = p && Array.isArray(p.variacoes) ? p.variacoes : [];
  const ac = await aceiteDoCliente({ conversa_id: o.conversa_id, oferta_id: o.id, produto_codigo: o.produto_codigo, variacao: opcao != null && vs[opcao] ? vs[opcao].nome : null, origem: 'whatsapp' }, buscar);
  if (ac) await avisarPedidoExtra(o.conversa_id, [ac], buscar);
}

async function registrar(evento, buscar = fetch) {
  let gravadas = 0;
  for (const entrada of evento.entry || []) {
    for (const mudanca of entrada.changes || []) {
      const v = mudanca.value || {};
      const numeroId = (v.metadata && v.metadata.phone_number_id) || '?';
      if (/^\d+$/.test(String(entrada.id || '')) && numeroId !== '?' && wabas[numeroId] !== String(entrada.id)) await guardarWaba(numeroId, String(entrada.id), buscar).catch(() => {});
      const nomes = {};
      for (const c of v.contacts || []) nomes[c.wa_id] = c.profile && c.profile.name;
      for (const m of v.messages || []) {
        const item = { quando: new Date().toISOString(), tipo: m.type, de: mascarar(m.from), gravado: false };
        recentes.unshift(item);
        if (bancoLigado()) {
          const midia = m[m.type];
          const res = await rpc('registrar_entrada_whatsapp', {
            p_numero_id: numeroId, p_de: m.from, p_nome: nomes[m.from] || null, p_wamid: m.id, p_tipo: m.type,
            p_corpo: corpoDe(m) || null, p_midia_id: (midia && midia.id) || null,
            p_quando: m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : null,
          }, buscar);
          item.gravado = true; gravadas++;
          // Mensagem da parceira da massagem: [Confirmo] / [Não posso]; nunca vai para o Gilberto nem vira alerta de atendimento
          const pc = await parceiraMassagem(buscar).catch(() => null);
          const daParceira = ehParceira(m.from, pc);
          const bp = daParceira && lerBotaoParceira(m.type === 'button' ? (m.button || {}).payload : m.type === 'interactive' ? ((m.interactive || {}).button_reply || {}).id : null);
          if (bp && res && res.conversa_id) await respostaParceira(bp, m.from, res.conversa_id, buscar).catch(e => console.warn(JSON.stringify({ evento: 'botao_parceira', erro: String(e.message || e).slice(0, 200) })));
          // Toque num botão de oferta ("Eu aceito" / "Não, obrigado"): marca a resposta sozinho
          const botao = daParceira || (m.type === 'interactive' && produtos.lerBotao(((m.interactive || {}).button_reply || {}).id));
          if (daParceira) { /* parceira: a equipe vê a conversa no CRM */ }
          else if (botao) await respostaDoBotao(botao, corpoDe(m), buscar).catch(e => console.warn(JSON.stringify({ evento: 'botao_oferta', erro: String(e.message || e).slice(0, 200) })));
          // Pede uma pessoa, reclama, quer cancelar ou alterar: alerta para quem está de plantão
          else if (res && res.nova && res.conversa_id && ['text', 'button', 'interactive'].includes(m.type)) await conferirPedido(corpoDe(m), res.conversa_id, buscar).catch(e => console.warn(JSON.stringify({ evento: 'pedido_alerta', erro: String(e.message || e).slice(0, 200) })));
          // Gilberto automático: responde a mensagem nova do cliente (exceto o toque nos botões de oferta)
          if (!botao && res && res.nova && res.conversa_id && res.mensagem_id && ['text', 'audio', 'image', 'button', 'interactive', 'document', 'video'].includes(m.type))
            await dispararGilberto(res.conversa_id, res.mensagem_id, buscar).catch(() => {});
          // Foto, áudio, vídeo, documento: guarda já uma cópia (a Meta apaga em 30 dias). Se falhar, a tela busca depois.
          if (midia && midia.id && res && res.nova && WA_TOKEN) {
            await guardarMidia({ id: res.mensagem_id, conversa_id: res.conversa_id, midia_id: midia.id, midia_nome: midia.filename || null }, buscar)
              .catch(e => console.warn(JSON.stringify({ evento: 'midia_nao_guardada', erro: String(e.message || e).slice(0, 200) })));
          }
        }
      }
      for (const s of v.statuses || []) {
        const item = { quando: new Date().toISOString(), tipo: 'status:' + s.status, de: mascarar(s.recipient_id), gravado: false };
        recentes.unshift(item);
        if (bancoLigado()) {
          const erro = (s.errors || []).map(e => `${e.code} ${e.title}`).join('; ') || null;
          await rpc('registrar_status_whatsapp', { p_wamid: s.id, p_status: s.status, p_erro: erro }, buscar);
          item.gravado = true;
        }
      }
    }
  }
  recentes.splice(10);
  return gravadas;
}

// Envio pela caixa de entrada: confere quem é a pessoa (login do Supabase), se ela é da equipe,
// se a janela de 24 h está aberta, manda pela Meta e grava a mensagem de saída.
// Celular brasileiro: a Meta entrega o wa_id sem o 9 (55 67 9807-0981). Para enviar, usamos o número
// completo com o 9, que é como ele está cadastrado (e como a lista de teste da Meta exige).
function numeroParaEnvio(valor) {
  const d = String(valor || '').replace(/\D/g, '');
  const m = d.match(/^55(\d{2})([6-9]\d{7})$/);
  return m ? `55${m[1]}9${m[2]}` : d;
}
class ErroEnvio extends Error { constructor(http, msg) { super(msg); this.http = http; } }
// Quem está chamando? Confere o login no Supabase e se o e-mail está na equipe ativa.
async function autenticarEquipe(tokenUsuario, buscar = fetch) {
  const u = await buscar(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + tokenUsuario }, signal: AbortSignal.timeout(5000) });
  if (!u.ok) throw new ErroEnvio(401, 'Sua sessão expirou. Entre de novo.');
  const email = (await u.json()).email;
  const equipe = await rpc('equipe_por_email', { p_email: email || '' }, buscar);
  if (!Array.isArray(equipe) || !equipe.length) throw new ErroEnvio(403, 'Seu e-mail não está liberado.');
  return { ...equipe[0], email: String(email).toLowerCase() };
}

// Ritmo de gente: antes de cada balão o cliente vê "digitando…" por um tempo proporcional ao texto.
// Especificação §6.6: ~6 a 8 caracteres por segundo, mínimo 2 s e máximo 12 s por balão (calibrar nos testes).
// FATOR_DIGITACAO ajusta tudo sem mexer no código (0 nos testes; 0,5 = metade do tempo).
const FATOR_DIGITACAO = process.env.FATOR_DIGITACAO !== undefined ? Number(process.env.FATOR_DIGITACAO) : 1;
// Tempo de leitura da mensagem anterior antes de começar a digitar a próxima (entre 3 e 8 s)
const tempoLeitura = t => FATOR_DIGITACAO * Math.min(8000, Math.max(3000, 1500 + String(t).length * 25));
const tempoDigitacao = t => FATOR_DIGITACAO * Math.min(12000, Math.max(2000, 1000 + t.length * 140));
const esperar = ms => new Promise(ok => setTimeout(ok, ms));

async function chamarMeta(caminho, corpo, buscar) {
  const m = await buscar(`${GRAPH}/${caminho}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + WA_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(10000),
  });
  return { ok: m.ok, status: m.status, json: await m.json().catch(() => ({})) };
}

// ---------- Modelos de mensagem da Meta (para iniciar conversa ou falar fora da janela de 24 h) ----------
// A conta do WhatsApp (WABA) de cada número é descoberta pelo portfólio do hotel (ou fixada em META_WABA_ID).
const PORTFOLIO = process.env.META_PORTFOLIO_ID || '531727826009907';
const wabas = {};
// A conta (WABA) de cada número, guardada em config 'wabas' quando chega um aviso da Meta
async function guardarWaba(numeroId, waba, buscar = fetch) {
  wabas[numeroId] = waba;
  const atual = ((await getJson(`${SUPABASE_URL}/rest/v1/config?chave=eq.wabas&select=valor`, buscar))[0] || {}).valor || {};
  if (atual[numeroId] === waba) return;
  await buscar(`${SUPABASE_URL}/rest/v1/config?on_conflict=chave`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ chave: 'wabas', valor: { ...atual, [numeroId]: waba }, atualizado_em: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
}
async function wabaDoNumero(numeroId, buscar = fetch) {
  if (process.env.META_WABA_ID) return process.env.META_WABA_ID.trim();
  if (wabas[numeroId]) return wabas[numeroId];
  // Aprendida dos avisos (webhook) da Meta: cada aviso traz a conta (WABA) do número, sem precisar de permissão extra
  const salvas = ((await getJson(`${SUPABASE_URL}/rest/v1/config?chave=eq.wabas&select=valor`, buscar))[0] || {}).valor || {};
  if (salvas[numeroId]) return (wabas[numeroId] = salvas[numeroId]);
  for (const borda of ['owned_whatsapp_business_accounts', 'client_whatsapp_business_accounts']) {
    const r = await buscar(`${GRAPH}/${PORTFOLIO}/${borda}?fields=id,phone_numbers{id}&limit=50`, { headers: { Authorization: 'Bearer ' + WA_TOKEN }, signal: AbortSignal.timeout(8000) }).catch(() => null);
    const j = r && r.ok ? await r.json().catch(() => ({})) : {};
    for (const w of j.data || []) for (const n of ((w.phone_numbers || {}).data || [])) wabas[n.id] = w.id;
    if (wabas[numeroId]) return wabas[numeroId];
  }
  throw new ErroEnvio(502, 'Ainda não sei a conta do WhatsApp deste número: mande um "oi" de qualquer celular para o número do hotel e tente de novo em 1 minuto.');
}
const varsDe = t => [...new Set((String(t || '').match(/\{\{(\d+)\}\}/g) || []).map(x => Number(x.slice(2, -2))))].sort((a, b) => a - b);
const preencher = (t, vs) => String(t || '').replace(/\{\{(\d+)\}\}/g, (m, n) => vs[Number(n) - 1] || m);
async function modelosDoNumero(numeroId, buscar = fetch) {
  const waba = await wabaDoNumero(numeroId, buscar);
  const r = await buscar(`${GRAPH}/${waba}/message_templates?fields=name,language,status,category,components&limit=200`, { headers: { Authorization: 'Bearer ' + WA_TOKEN }, signal: AbortSignal.timeout(8000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroEnvio(502, 'A Meta não devolveu os modelos (' + ((j.error || {}).message || r.status) + ').');
  return (j.data || []).map(m => {
    const comp = m.components || [];
    const body = comp.find(c => c.type === 'BODY') || {}, head = comp.find(c => c.type === 'HEADER');
    // Nesta fase: modelos só de texto (cabeçalho com mídia ou botões com variável ficam de fora)
    const suportado = (!head || (head.format === 'TEXT' && !varsDe(head.text).length)) && !comp.some(c => c.type === 'BUTTONS' && (c.buttons || []).some(b => /\{\{/.test(b.url || '')));
    return { nome: m.name, idioma: m.language, status: m.status, categoria: m.category, cabecalho: head && head.format === 'TEXT' ? head.text : null, corpo: body.text || '', variaveis: varsDe(body.text).length, rodape: (comp.find(c => c.type === 'FOOTER') || {}).text || null, suportado };
  });
}

// Marca a última mensagem do cliente como lida e liga o "digitando…" (dura até 25 s ou até o próximo envio).
// É só cortesia: se a Meta recusar, o envio segue normalmente.
async function mostrarDigitando(conv, wamidCliente, buscar) {
  if (!wamidCliente) { ultimoDigitando = { quando: new Date().toISOString(), ok: false, motivo: 'sem id da última mensagem do cliente' }; return; }
  try {
    const r = await chamarMeta(`${encodeURIComponent(conv.numero_id)}/messages`,
      { messaging_product: 'whatsapp', status: 'read', message_id: wamidCliente, typing_indicator: { type: 'text' } }, buscar);
    const e = r.json.error || {};
    ultimoDigitando = { quando: new Date().toISOString(), ok: r.ok, http: r.status, resposta: r.ok ? r.json : null, codigo: e.code || null, sub: e.error_subcode || null, mensagem: String(e.message || '').slice(0, 300) };
    if (!r.ok) console.warn(JSON.stringify({ evento: 'digitando_recusado', ...ultimoDigitando }));
  } catch (e) { ultimoDigitando = { quando: new Date().toISOString(), ok: false, motivo: String(e.message || e).slice(0, 200) }; }
}

async function enviarTexto(conv, para, texto, autor, buscar) {
  const r = await chamarMeta(`${encodeURIComponent(conv.numero_id)}/messages`,
    { messaging_product: 'whatsapp', recipient_type: 'individual', to: para, type: 'text', text: { body: texto, preview_url: true } }, buscar);
  if (!r.ok || !r.json.messages || !r.json.messages[0]) {
    const e = r.json.error || {};
    console.error(JSON.stringify({ evento: 'falha_envio_meta', http: r.status, codigo: e.code, sub: e.error_subcode, msg: String(e.message || '').slice(0, 200) }));
    ultimoErroMeta = { quando: new Date().toISOString(), http: r.status, codigo: e.code || null, mensagem: String(e.message || '').slice(0, 200) };
    throw new ErroEnvio(502, 'A Meta não aceitou o envio' + (e.code ? ` (código ${e.code})` : '') + '. Tente de novo; se repetir, avise o Ricardo.');
  }
  const wamid = r.json.messages[0].id;
  const id = await rpc('registrar_saida_whatsapp', { p_conversa: conv.id, p_wamid: wamid, p_corpo: texto, p_autor: autor }, buscar);
  return { id, wamid, corpo: texto, enviada_em: new Date().toISOString() };
}

// ---------- Mídias (fotos, vídeos, áudios, documentos) ----------
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/3gpp': '3gp',
  'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/amr': 'amr', 'application/pdf': 'pdf' };
const mimeBase = m => String(m || '').split(';')[0].trim().toLowerCase();
const extDe = mime => EXT[mimeBase(mime)] || 'bin';
// O que a tela pode abrir dentro da página. O resto vai como download (nunca HTML/SVG com o endereço do CRM).
const MIME_SEGURO = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|3gpp)|audio\/(ogg|mpeg|mp4|aac|amr)|application\/pdf)$/;
const LIMITE_MIDIA = 16 * 1024 * 1024;

async function baixarDaMeta(midiaId, buscar) {
  const info = await buscar(`${GRAPH}/${encodeURIComponent(midiaId)}`, { headers: { Authorization: 'Bearer ' + WA_TOKEN }, signal: AbortSignal.timeout(8000) });
  if (!info.ok) throw new Error('meta mídia ' + info.status);
  const j = await info.json();
  const arq = await buscar(j.url, { headers: { Authorization: 'Bearer ' + WA_TOKEN }, signal: AbortSignal.timeout(20000) });
  if (!arq.ok) throw new Error('meta download ' + arq.status);
  return { dados: Buffer.from(await arq.arrayBuffer()), mime: mimeBase(j.mime_type || arq.headers.get('content-type')) || 'application/octet-stream' };
}
async function gravarNoStorage(caminho, dados, mime, buscar, tempo = 20000) {
  const h = cabecalhosBanco(); delete h['Content-Type'];
  const r = await buscar(`${SUPABASE_URL}/storage/v1/object/midias/${caminho}`, {
    method: 'POST', headers: { ...h, 'Content-Type': mime, 'x-upsert': 'true' }, body: dados, signal: AbortSignal.timeout(tempo) });
  if (!r.ok) throw new Error('storage ' + r.status + ' ' + (await r.text().catch(() => '')).slice(0, 150));
}
async function lerDoStorage(caminho, buscar, tempo = 20000) {
  const h = cabecalhosBanco(); delete h['Content-Type'];
  const r = await buscar(`${SUPABASE_URL}/storage/v1/object/authenticated/midias/${caminho}`, { headers: h, signal: AbortSignal.timeout(tempo) });
  if (!r.ok) throw new Error('storage ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}
// Baixa da Meta, guarda no Storage e anota na mensagem. Devolve os bytes.
async function guardarMidia(msg, buscar = fetch) {
  const { dados, mime } = await baixarDaMeta(msg.midia_id, buscar);
  const caminho = `${msg.conversa_id}/${msg.id}.${extDe(mime)}`;
  await gravarNoStorage(caminho, dados, mime, buscar);
  await buscar(`${SUPABASE_URL}/rest/v1/mensagens?id=eq.${msg.id}`, {
    method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' },
    body: JSON.stringify({ midia_caminho: caminho, midia_mime: mime, ...(msg.midia_nome ? { midia_nome: msg.midia_nome } : {}) }),
    signal: AbortSignal.timeout(5000),
  });
  return { dados, mime };
}
// Entrega o arquivo de uma mensagem para a tela (só equipe). Usa a cópia guardada; se ainda não houver, busca na Meta.
async function midiaParaEquipe(tokenUsuario, mensagemId, buscar = fetch) {
  if (!/^[0-9a-f-]{36}$/i.test(mensagemId)) throw new ErroEnvio(400, 'Mensagem inválida.');
  await autenticarEquipe(tokenUsuario, buscar);
  const r = await buscar(`${SUPABASE_URL}/rest/v1/mensagens?id=eq.${mensagemId}&select=id,conversa_id,tipo,midia_id,midia_caminho,midia_mime,midia_nome`,
    { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
  const msg = r.ok ? (await r.json())[0] : null;
  if (!msg || (!msg.midia_caminho && !msg.midia_id)) throw new ErroEnvio(404, 'Arquivo não encontrado.');
  if (msg.midia_caminho && msg.midia_caminho.startsWith('biblioteca/')) { // foto da biblioteca do hotel, enviada pelo CRM
    const f = await bytesDaFoto(msg.midia_caminho.slice('biblioteca/'.length), buscar);
    if (!f) throw new ErroEnvio(404, 'Arquivo não encontrado.');
    return { dados: f, mime: orcamento.ehVideo(msg.midia_caminho) ? 'video/mp4' : 'image/jpeg', nome: msg.midia_caminho.slice(11) };
  }
  if (msg.midia_caminho) return { dados: await lerDoStorage(msg.midia_caminho, buscar), mime: msg.midia_mime, nome: msg.midia_nome };
  if (!WA_TOKEN) throw new ErroEnvio(503, 'O WhatsApp ainda não está configurado.');
  const g = await guardarMidia(msg, buscar).catch(() => null) || await baixarDaMeta(msg.midia_id, buscar);
  return { dados: g.dados, mime: g.mime, nome: msg.midia_nome };
}

// Conversa pronta para receber mensagem: confere canal, janela de 24 h e WhatsApp do contato.
async function carregarConversaParaEnvio(conversaId, buscar) {
  if (!/^[0-9a-f-]{36}$/i.test(String(conversaId || ''))) throw new ErroEnvio(400, 'Conversa inválida.');
  const c = await buscar(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${conversaId}&select=id,canal,numero_id,ultima_msg_cliente_em,contato:contatos(contato_identificadores(tipo,valor))`,
    { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
  const conv = c.ok ? (await c.json())[0] : null;
  if (!conv) throw new ErroEnvio(404, 'Conversa não encontrada.');
  if (conv.canal !== 'wa') throw new ErroEnvio(400, 'Por enquanto só dá para responder pelo WhatsApp.');
  const ultima = conv.ultima_msg_cliente_em ? new Date(conv.ultima_msg_cliente_em).getTime() : 0;
  if (Date.now() - ultima > JANELA_MS) throw new ErroEnvio(409, 'A janela de 24 h fechou: fora dela a Meta só aceita modelos aprovados.');
  const wa = ((conv.contato && conv.contato.contato_identificadores) || []).find(i => i.tipo === 'whatsapp');
  if (!wa) throw new ErroEnvio(400, 'Este contato não tem WhatsApp.');
  const u = await buscar(`${SUPABASE_URL}/rest/v1/mensagens?conversa_id=eq.${conv.id}&direcao=eq.entrada&select=id_externo&order=enviada_em.desc&limit=1`,
    { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const wamidCliente = u && u.ok ? ((await u.json())[0] || {}).id_externo : null;
  return { conv, para: numeroParaEnvio(wa.valor), wamidCliente };
}

// Envia um arquivo do aparelho da equipe: sobe na Meta, manda a mensagem e guarda a cópia no Storage.
async function enviarMidiaPelaEquipe(tokenUsuario, params, dados, mimeEnviado, buscar = fetch) {
  if (!WA_TOKEN || !bancoLigado()) throw new ErroEnvio(503, 'O envio ainda não está configurado no servidor.');
  if (!dados.length) throw new ErroEnvio(400, 'Arquivo vazio.');
  if (dados.length > LIMITE_MIDIA) throw new ErroEnvio(413, 'Arquivo grande demais (máximo 16 MB).');
  const equipe = await autenticarEquipe(tokenUsuario, buscar);
  const { conv, para } = await carregarConversaParaEnvio(params.get('conversa_id'), buscar);
  const mime = mimeBase(mimeEnviado) || 'application/octet-stream';
  const tipo = /^image\/(jpeg|png)$/.test(mime) ? 'image' : /^video\/(mp4|3gpp)$/.test(mime) ? 'video' : /^audio\//.test(mime) ? 'audio' : 'document';
  if (tipo === 'image' && dados.length > 5 * 1024 * 1024) throw new ErroEnvio(413, 'Foto grande demais (máximo 5 MB).');
  const nome = String(params.get('nome') || 'arquivo').replace(/[^\w.\- ()À-ú]/g, '_').slice(0, 120);
  const legenda = String(params.get('legenda') || '').trim().slice(0, 1024);
  return { ok: true, ...(await enviarArquivo(conv, para, dados, mime, tipo, nome, legenda, equipe.id, buscar)) };
}
// Sobe o arquivo na Meta, envia, guarda uma cópia no Storage e registra na conversa
async function enviarArquivo(conv, para, dados, mime, tipo, nome, legenda, autor, buscar = fetch) {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mime);
  form.append('file', new Blob([dados], { type: mime }), nome);
  const up = await buscar(`${GRAPH}/${encodeURIComponent(conv.numero_id)}/media`, { method: 'POST', headers: { Authorization: 'Bearer ' + WA_TOKEN }, body: form, signal: AbortSignal.timeout(30000) });
  const upj = await up.json().catch(() => ({}));
  if (!up.ok || !upj.id) {
    const e = upj.error || {};
    ultimoErroMeta = { quando: new Date().toISOString(), http: up.status, codigo: e.code || null, mensagem: String(e.message || '').slice(0, 200) };
    throw new ErroEnvio(502, 'A Meta não aceitou o arquivo' + (e.code ? ` (código ${e.code})` : '') + '. Confira o formato (foto JPG/PNG, vídeo MP4, PDF).');
  }
  const conteudo = { id: upj.id };
  if (legenda && tipo !== 'audio') conteudo.caption = legenda;
  if (tipo === 'document') conteudo.filename = nome;
  const r = await chamarMeta(`${encodeURIComponent(conv.numero_id)}/messages`, { messaging_product: 'whatsapp', recipient_type: 'individual', to: para, type: tipo, [tipo]: conteudo }, buscar);
  if (!r.ok || !r.json.messages || !r.json.messages[0]) {
    const e = r.json.error || {};
    ultimoErroMeta = { quando: new Date().toISOString(), http: r.status, codigo: e.code || null, mensagem: String(e.message || '').slice(0, 200) };
    throw new ErroEnvio(502, 'A Meta não aceitou o envio' + (e.code ? ` (código ${e.code})` : '') + '.');
  }
  const wamid = r.json.messages[0].id;
  const caminho = `${conv.id}/saida-${crypto.randomUUID()}.${extDe(mime)}`;
  let guardado = caminho;
  try { await gravarNoStorage(caminho, dados, mime, buscar); } catch (e) { guardado = null; console.warn(JSON.stringify({ evento: 'midia_saida_nao_guardada', erro: String(e.message).slice(0, 150) })); }
  const id = await rpc('registrar_saida_midia', { p_conversa: conv.id, p_wamid: wamid, p_tipo: tipo, p_legenda: legenda, p_caminho: guardado, p_mime: mime, p_nome: tipo === 'document' ? nome : null, p_autor: autor }, buscar);
  return { id, wamid, tipo, corpo: legenda, enviada_em: new Date().toISOString() };
}

// Envia 1 ou mais balões (texto separado por uma linha só com ---), um por vez, com "digitando…" antes de cada um.
// Link do CRM alterado no texto (ex.: o corretor trocou "east1" por "education"): o cliente cairia num endereço errado
function linkAlterado(texto) {
  const certo = new URL(URL_PUBLICA).host;
  const hosts = String(texto).match(/[\w.-]+\.run\.app/gi) || [];
  return hosts.find(h => h.toLowerCase() !== certo.toLowerCase()) || null;
}
async function enviarPelaEquipe(tokenUsuario, corpo, buscar = fetch) {
  if (!WA_TOKEN || !bancoLigado()) throw new ErroEnvio(503, 'O envio ainda não está configurado no servidor.');
  const bruto = Array.isArray(corpo.baloes) ? corpo.baloes : [typeof corpo.texto === 'string' ? corpo.texto : ''];
  const baloes = bruto.map(b => String(b || '').trim()).filter(b => b && !/^[-–—\s]+$/.test(b)); // ignora balão só de traços
  if (!baloes.length || baloes.length > 6 || baloes.some(b => b.length > 4096)) throw new ErroEnvio(400, 'Envie de 1 a 6 balões, cada um com até 4.096 caracteres.');
  if (!/^[0-9a-f-]{36}$/i.test(String(corpo.conversa_id || ''))) throw new ErroEnvio(400, 'Conversa inválida.');
  const alterado = linkAlterado(baloes.join('\n'));
  if (alterado) throw new ErroEnvio(400, 'O link ' + alterado + ' parece alterado (corretor automático?). O certo começa com ' + URL_PUBLICA + '. Corrija ou gere o link de novo antes de enviar.');
  const equipe = await autenticarEquipe(tokenUsuario, buscar);
  const { conv, para, wamidCliente } = await carregarConversaParaEnvio(corpo.conversa_id, buscar);

  const enviadas = [];
  for (const texto of baloes) {
    await mostrarDigitando(conv, wamidCliente, buscar);
    await esperar(tempoDigitacao(texto));
    try {
      enviadas.push(await enviarTexto(conv, para, texto, equipe.id, buscar));
      if (enviadas.length === 1) pausarGilberto(conv.id, true, equipe.id, buscar).catch(() => {}); // quem responde à mão assume a conversa
    } catch (e) {
      if (enviadas.length && e instanceof ErroEnvio) { e.enviadas = enviadas; } // a tela sabe o que já saiu
      throw e;
    }
  }
  const ult = enviadas[enviadas.length - 1];
  return { ok: true, enviadas, id: ult.id, wamid: ult.wamid, enviada_em: ult.enviada_em };
}

// ---------- Orçamento (página pública /o/<token>) ----------
const numerosWa = {}; // phone_number_id -> número público do hotel (só dígitos)
async function numeroWhatsapp(numeroId, buscar) {
  if (!numeroId || !WA_TOKEN) return null;
  if (numerosWa[numeroId] !== undefined) return numerosWa[numeroId];
  const r = await buscar(`${GRAPH}/${encodeURIComponent(numeroId)}?fields=display_phone_number`, { headers: { Authorization: 'Bearer ' + WA_TOKEN }, signal: AbortSignal.timeout(5000) }).catch(() => null);
  const j = r && r.ok ? await r.json().catch(() => ({})) : {};
  const n = String(j.display_phone_number || '').replace(/\D/g, '') || null;
  if (n) numerosWa[numeroId] = n;
  return n;
}
// Cotação do orçamento: a consulta normal e, para combinações pedidas que não vieram na lista, o preço delas
async function cotacaoParaOrcamento(entrada, buscar = fetch) {
  const cot = await silbeck.cotar(entrada, buscar);
  if (!cot.ok) return cot;
  for (const o of entrada.opcoes || []) {
    const cods = orcamento.codigosDe(o);
    if (cods.length < 2) continue;
    const chave = orcamento.chaveCombinacao(cods);
    if ((cot.opcoes || []).some(x => x.combinacao && orcamento.chaveCombinacao(x.codigo.split('+')) === chave)) continue;
    const c = await silbeck.cotarCombinacao(entrada, cods, buscar);
    if (!c.ok) return { ok: false, erro: 'Combinação ' + cods.join('+') + ': ' + c.erro };
    cot.opcoes = [...(cot.opcoes || []), c.opcao];
  }
  return cot;
}
// Cria o orçamento: recota no Silbeck na hora, grava e devolve o link (ferramenta gerar_orcamento).
async function criarOrcamento(entrada, ctx, buscar = fetch) {
  if (!bancoLigado()) return { ok: false, erro: 'Banco não configurado.' };
  const cot = await cotacaoParaOrcamento(entrada, buscar);
  if (!cot.ok) return cot;
  const m = orcamento.montar(entrada, cot);
  if (m.erro) return { ok: false, erro: m.erro };
  const token = orcamento.novoToken();
  const registro = {
    token, conversa_id: ctx.conversa_id || null, criado_por: ctx.criado_por || 'gilberto', fonte: cot.fonte,
    primeiro_nome: String(ctx.primeiro_nome || '').trim().split(/\s+/)[0].slice(0, 40) || null,
    frase_de_abertura: String(entrada.frase_de_abertura || '').slice(0, 200) || null, persona: entrada.persona || null,
    data_entrada: entrada.data_entrada, data_saida: entrada.data_saida, adultos: cot.grupo.adultos, criancas_idades: cot.grupo.idades_criancas,
    pessoas_aptas_combo: Math.max(0, Number(entrada.pessoas_aptas_combo) || 0), opcoes: m.opcoes,
    numero_whatsapp: await numeroWhatsapp(ctx.numero_id, buscar),
  };
  const r = await buscar(`${SUPABASE_URL}/rest/v1/orcamentos`, {
    method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, body: JSON.stringify(registro), signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) {
    ultimoErroBanco = { quando: new Date().toISOString(), funcao: 'orcamentos', http: r.status, mensagem: (await r.text().catch(() => '')).slice(0, 200) };
    return { ok: false, erro: 'Não consegui gravar o orçamento agora (o banco precisa da migração 006?). Escreva [[link do orçamento]] e avise a equipe.' };
  }
  const salvo = (await r.json())[0] || {};
  return { ok: true, orcamento_id: salvo.id, link: `${URL_PUBLICA}/o/${token}`, fonte: cot.fonte,
    opcoes: m.opcoes.map(o => ({ codigo: o.codigo, nome: o.nome, valor_total: o.valor_total, media_por_noite: o.media_por_noite, parcela_6x: o.parcela_6x, ...(o.sugerida ? { sugerida: true } : {}),
      ...(o.combinacao ? { acomodacoes: o.acomodacoes.map(a => a.nome + ': ' + orcamento.resumoGrupo(a)) } : {}) })),
    ...(cot.atencao ? { atencao: cot.atencao } : {}) };
}
async function lerOrcamento(token, buscar = fetch) {
  if (!orcamento.tokenValido(token) || !bancoLigado()) return null;
  const r = await buscar(`${SUPABASE_URL}/rest/v1/orcamentos?token=eq.${token}&select=*`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
  return r.ok ? (await r.json())[0] || null : null;
}
// Limite simples por IP para as páginas públicas (60 por minuto).
const acessos = new Map();
function limiteExcedido(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const agora = Date.now(), a = acessos.get(ip);
  if (!a || agora - a.desde > 60000) { acessos.set(ip, { desde: agora, n: 1 }); if (acessos.size > 5000) acessos.clear(); return false; }
  return ++a.n > 60;
}

// ---------- Fotos da biblioteca do hotel (envio pela caixa) ----------
// A Meta baixa a foto pelo endereço público do CRM (/fotos/...). Uma mensagem por foto, com 1,5 s entre elas.
async function enviarFotosPelaEquipe(tokenUsuario, corpo, buscar = fetch) {
  if (!WA_TOKEN || !bancoLigado()) throw new ErroEnvio(503, 'O envio ainda não está configurado no servidor.');
  const fotos = Array.isArray(corpo.fotos) ? [...new Set(corpo.fotos.map(String))] : [];
  if (!fotos.length || fotos.length > 5) throw new ErroEnvio(400, 'Escolha de 1 a 5 fotos ou vídeos.');
  await atualizarFotos(buscar);
  if (fotos.some(f => !/^[\w.-]+\.(jpg|mp4)$/.test(f) || !fotoAtiva(f))) throw new ErroEnvio(400, 'Arquivo fora da biblioteca do hotel.');
  const legenda = String(corpo.legenda || '').trim().slice(0, 1024);
  const equipe = await autenticarEquipe(tokenUsuario, buscar);
  const { conv, para } = await carregarConversaParaEnvio(corpo.conversa_id, buscar);
  return { ok: true, enviadas: await enviarFotos(conv, para, fotos, legenda, equipe.id, buscar) };
}
async function enviarFotos(conv, para, fotos, legenda, autor, buscar = fetch) {
  const enviadas = [];
  for (const [i, f] of fotos.entries()) {
    if (i) await esperar(1500 * FATOR_DIGITACAO);
    const video = orcamento.ehVideo(f), tipo = video ? 'video' : 'image';
    const midia = { link: `${URL_PUBLICA}/${video ? 'videos' : 'fotos'}/${f}`, ...(i === 0 && legenda ? { caption: legenda } : {}) };
    const r = await chamarMeta(`${encodeURIComponent(conv.numero_id)}/messages`, { messaging_product: 'whatsapp', recipient_type: 'individual', to: para, type: tipo, [tipo]: midia }, buscar);
    if (!r.ok || !r.json.messages || !r.json.messages[0]) {
      const e = r.json.error || {};
      ultimoErroMeta = { quando: new Date().toISOString(), http: r.status, codigo: e.code || null, mensagem: String(e.message || '').slice(0, 200) };
      const err = new ErroEnvio(502, 'A Meta não aceitou ' + (video ? 'o vídeo' : 'a foto') + (e.code ? ` (código ${e.code})` : '') + '.');
      err.enviadas = enviadas;
      throw err;
    }
    const id = await rpc('registrar_saida_midia', { p_conversa: conv.id, p_wamid: r.json.messages[0].id, p_tipo: tipo, p_legenda: i === 0 ? legenda : '', p_caminho: 'biblioteca/' + f, p_mime: video ? 'video/mp4' : 'image/jpeg', p_nome: null, p_autor: autor }, buscar);
    enviadas.push({ id, arquivo: f, corpo: i === 0 ? legenda : '', enviada_em: new Date().toISOString() });
  }
  return enviadas;
}

// Fotos ligadas a um apartamento (dono, 08/10/2026): o número ajuda a descrever, mas quem define o apartamento é o hotel
const AVISO_APTO = ' Quando a descrição da foto traz "Apto N", use o que ela diz (camas, vista) para descrever a categoria, mas nunca prometa ao cliente um número de apartamento: ele é definido pelo hotel.';
// ---------- Biblioteca de fotos: as fixas (public/fotos) + os ajustes da equipe (tabela fotos_biblioteca) ----------
// Fotos trazidas do Drive ficam no Storage (midias/biblioteca/<arquivo>) e saem pelo mesmo /fotos/<arquivo>.
let fotosCache = { ate: 0, linhas: [] };
async function atualizarFotos(buscar = fetch, forcar = false) {
  if (!bancoLigado() || (!forcar && fotosCache.ate > Date.now())) return;
  const ler = campos => buscar(`${SUPABASE_URL}/rest/v1/fotos_biblioteca?select=${campos}&limit=1000`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const base = 'arquivo,grupo,descricao,etiquetas,decoracao,drive_id,origem,ativo,ordem,criado_em';
  let r = await ler(base + ',apartamento');
  if (r && r.status === 400) r = await ler(base); // banco sem a migração 026
  const ra = await buscar(`${SUPABASE_URL}/rest/v1/apartamentos?select=numero,codigo_silbeck,categoria,descricao,ativo&order=numero`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (r && r.ok) fotosCache = { ate: Date.now() + 60000, linhas: await r.json().catch(() => []), aptos: ra && ra.ok ? await ra.json().catch(() => []) : [] };
  else fotosCache.ate = Date.now() + 60000; // sem a migração 011 (ou banco fora): fica só com as fixas
  orcamento.definirVivas(fotosCache.linhas, fotosCache.aptos || []);
}
const fotoDoDrive = f => fotosCache.linhas.find(v => v.arquivo === f && v.origem === 'drive');
const fotoAtiva = f => orcamento.biblioteca().some(g => g.fotos.some(x => x.arquivo === f));
const bytesFotos = new Map();
const bytesVideos = new Map(); // poucos na memória (até 16 MB cada)
async function bytesDaFoto(f, buscar = fetch) {
  if (ESTATICOS['/fotos/' + f]) return ESTATICOS['/fotos/' + f].corpo;
  if (!/^[\w.-]+\.(jpg|mp4)$/.test(f)) return null;
  const video = orcamento.ehVideo(f), cache = video ? bytesVideos : bytesFotos, max = video ? 3 : 80;
  if (cache.has(f)) return cache.get(f);
  await atualizarFotos(buscar);
  if (!fotoDoDrive(f)) return null;
  const dados = await lerDoStorage('biblioteca/' + f, buscar, video ? 60000 : 20000).catch(() => null);
  if (dados) { if (cache.size >= max) cache.delete(cache.keys().next().value); cache.set(f, dados); }
  return dados;
}
async function gravarFotoAjuste(linha, buscar = fetch) {
  const r = await buscar(`${SUPABASE_URL}/rest/v1/fotos_biblioteca?on_conflict=arquivo`, {
    method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ ...linha, atualizado_em: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
  if (r.status === 404) throw new ErroEnvio(503, 'O banco ainda não tem a tabela das fotos (falta rodar a migração 011 no Supabase).');
  if (r.status === 400) {
    const t = await r.text().catch(() => '');
    if (/arquivo_check/.test(t) && /\.mp4$/.test(linha.arquivo || '')) throw new ErroEnvio(503, 'O banco ainda não aceita vídeos: falta rodar a migração 024 no Supabase (crm/banco/024_videos_biblioteca.sql).');
    throw new ErroEnvio(503, 'O banco recusou o arquivo (falta alguma migração? 011 ou 024).');
  }
  if (!r.ok) throw new ErroEnvio(502, 'Não deu para salvar a foto agora.');
}
const errosDrive = fn => async (...a) => { try { return await fn(...a); } catch (e) { if (e instanceof drive.ErroDrive) throw new ErroEnvio(e.http, e.message); throw e; } };

// ---------- Catálogo (produtos e biblioteca de respostas), lido do banco a cada minuto ----------
let catalogoCache = null;
async function catalogo(buscar = fetch) {
  if (catalogoCache && catalogoCache.ate > Date.now()) return catalogoCache.v;
  if (!bancoLigado()) return null;
  const hoje = new Date().toISOString().slice(0, 10);
  const [p, r] = await Promise.all([
    buscar(`${SUPABASE_URL}/rest/v1/produtos?ativo=eq.true&select=*&order=prioridade`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null),
    buscar(`${SUPABASE_URL}/rest/v1/respostas?ativo=eq.true&or=(valida_ate.is.null,valida_ate.gte.${hoje})&select=id,pergunta,resposta,fixa,origem&order=usos.desc&limit=200`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null),
  ]);
  let resp = r && r.ok ? await r.json().catch(() => []) : [];
  if (r && !r.ok) { // banco sem a migração 010 (coluna origem): busca sem ela
    const r2 = await buscar(`${SUPABASE_URL}/rest/v1/respostas?ativo=eq.true&select=id,pergunta,resposta,fixa&order=usos.desc&limit=80`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
    resp = r2 && r2.ok ? await r2.json().catch(() => []) : [];
  }
  // As do questionário já estão na base do Gilberto: só as fixas entram de novo
  resp = resp.filter(x => x.origem !== 'questionario' || x.fixa).slice(0, 80);
  // Documentos aprovados pelo dono (Ajustes do agente > Documentos; sem a migração 023, nenhum)
  const d = await buscar(`${SUPABASE_URL}/rest/v1/gilberto_documentos?situacao=eq.aprovado&select=id,titulo,conteudo&order=aprovado_em.asc&limit=200`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const v = { produtos: p && p.ok ? await p.json().catch(() => []) : [], respostas: resp, documentos: d && d.ok ? await d.json().catch(() => []) : [] };
  catalogoCache = { v, ate: Date.now() + 60000 };
  return v;
}
const limparCatalogo = () => { catalogoCache = null; };

// ---------- Ficha, equipe, cotação e orçamento pela caixa (equipe logada) ----------
const LIMITE_CORPO = { 'POST /api/gilberto-documentos': 15e6 }; // PDF em base64 (até 10 MB)
async function lerCorpo(req, limite = 64e3) {
  const partes = []; let t = 0;
  for await (const p of req) { t += p.length; if (t > limite) throw new ErroEnvio(413, 'Pedido grande demais.'); partes.push(p); }
  try { return JSON.parse(Buffer.concat(partes).toString('utf8') || '{}'); } catch (e) { throw new ErroEnvio(400, 'Pedido inválido.'); }
}
async function patchBanco(tabela, filtro, dados, buscar = fetch) {
  const r = await buscar(`${SUPABASE_URL}/rest/v1/${tabela}?${filtro}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify(dados), signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new ErroEnvio(r.status === 400 ? 400 : 502, 'Não deu para salvar' + (r.status === 400 ? ' (o banco precisa da migração 007?)' : '') + '.');
}
// ---------- Alertas de atendimento (pede pessoa, reclamação, cancelamento, alteração, Gilberto passou) ----------
// Vão para quem está de plantão; sem dono em 10 min, são escalados para toda a equipe.
let plantaoCache = { ate: 0, id: null };
async function plantaoAtual(buscar = fetch) {
  if (plantaoCache.ate > Date.now()) return plantaoCache.id;
  const r = await buscar(`${SUPABASE_URL}/rest/v1/config?chave=eq.plantao&select=valor`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const v = r && r.ok ? ((await r.json().catch(() => []))[0] || {}).valor : null;
  plantaoCache = { ate: Date.now() + 30000, id: (v && v.usuario_id) || null };
  return plantaoCache.id;
}
async function alertaAtendimento(tipo, conversa, info, buscar = fetch, titulo = null) {
  if (!pedidos.TITULOS[tipo] || !conversa) return;
  const ja = await buscar(`${SUPABASE_URL}/rest/v1/alertas?conversa_id=eq.${conversa}&tipo=eq.${tipo}&situacao=eq.aberto&select=id`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (ja && ja.ok && (await ja.json().catch(() => [])).length) return; // já tem um aberto para esta conversa
  const negocio = await negocioDaConversa(conversa, 'id', buscar);
  await criarAlerta({ tipo, titulo: titulo || pedidos.TITULOS[tipo], info: String(info || '').slice(0, 300), conversa_id: conversa, negocio_id: negocio, para_id: await plantaoAtual(buscar) }, buscar);
  if (negocio) await eventoNegocio(negocio, 'Alerta: ' + (titulo || pedidos.TITULOS[tipo]), 'CRM', buscar);
  console.log(JSON.stringify({ evento: 'alerta_atendimento', tipo }));
}
// Motivos com que o Gilberto passa um caso para a equipe (ferramenta abrir_alerta)
// Número de WhatsApp sem o 9 extra do celular e sem o 55: DDD + 8 dígitos (a Meta às vezes manda sem o 9)
function chaveNumero(n) {
  let d = String(n || '').replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  if (d.length === 11 && d[2] === '9') d = d.slice(0, 2) + d.slice(3);
  return /^[1-9]{2}\d{8}$/.test(d) ? d : null;
}
const MOTIVOS_ALERTA = { alteracao: 'Pedido de alteração', fora_da_base: 'Pergunta fora da base', excecao_politica: 'Exceção de política', acessibilidade: 'Acessibilidade',
  reclamacao: 'Reclamação', cancelamento: 'Pedido de cancelamento', pede_pessoa: 'Pede atendimento humano', grupo_agencia_evento: 'Grupo, agência ou evento',
  desconto_insistente: 'Pede desconto', problema_pagamento: 'Problema no pagamento', dado_sensivel_recebido: 'Dado sensível recebido', pedido_especial_outro: 'Pedido especial',
  comprovante_recebido: 'Comprovante recebido', reserva_urgente: 'Reserva urgente (check-in em até 3 dias)', atividade_escolhida: 'Atividade escolhida', seguranca: 'Segurança' };
// Motivos que viram o alerta do próprio pedido (o mesmo que a detecção por palavra abriria: não duplica)
const TIPO_DO_MOTIVO = { alteracao: 'alteracao', reclamacao: 'reclamacao', cancelamento: 'cancelamento', pede_pessoa: 'atendimento_humano' };
// Mensagem nova do cliente: se for um desses pedidos, avisa a equipe
async function conferirPedido(texto, conversa, buscar = fetch) {
  const tipo = pedidos.detectarPedido(texto);
  if (tipo) await alertaAtendimento(tipo, conversa, 'Cliente: “' + String(texto).slice(0, 200) + '”', buscar);
}
async function escalarAlertas(buscar = fetch) {
  const limite = new Date(Date.now() - 10 * 60e3).toISOString();
  const r = await buscar(`${SUPABASE_URL}/rest/v1/alertas?situacao=eq.aberto&assumido_por=is.null&escalado_em=is.null&tipo=in.(${pedidos.ATENDIMENTO.join(',')})&criado_em=lt.${limite}&select=id,titulo,info,conversa_id`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const lista = r && r.ok ? await r.json().catch(() => []) : [];
  for (const a of lista) {
    await buscar(`${SUPABASE_URL}/rest/v1/alertas?id=eq.${a.id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ escalado_em: new Date().toISOString() }), signal: AbortSignal.timeout(5000) }).catch(() => null);
    await avisarCelulares(null, await mensagemDoAlerta({ ...a, titulo: 'Ninguém assumiu: ' + a.titulo }, buscar), buscar).catch(() => 0);
  }
  return lista.length;
}

// ---------- Avisos no celular (Web Push) ----------
// Cada alerta que chega na hora (ou cuja hora chegou, como o "Lançar na conta" das 8h) vira uma notificação nos aparelhos
// da equipe que ativaram os avisos: atendimento vai para quem está de plantão (ou todos, sem plantão); o resto, para todos.
let chaveVapid = { ate: 0, v: null };
async function chaveAvisos(buscar = fetch) {
  if (process.env.K_SERVICE && chaveVapid.ate > Date.now()) return chaveVapid.v; // fora do Cloud Run (testes) lê sempre
  const s = await silbeck.segredo('vapid-chave', buscar).catch(() => null);
  chaveVapid = { ate: Date.now() + (s ? 3600e3 : 60e3), v: s ? push.lerChave(s) : null };
  return chaveVapid.v;
}
async function avisarCelulares(usuarios, mensagem, buscar = fetch) {
  const chave = await chaveAvisos(buscar);
  if (!chave || (usuarios && !usuarios.length)) return 0;
  const ativos = await buscar(`${SUPABASE_URL}/rest/v1/usuarios?ativo=eq.true&select=id`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  let ids = ativos && ativos.ok ? (await ativos.json().catch(() => [])).map(u => u.id) : [];
  if (usuarios) ids = ids.filter(id => usuarios.includes(id));
  if (!ids.length) return 0;
  const r = await buscar(`${SUPABASE_URL}/rest/v1/push_inscricoes?usuario_id=in.(${ids.join(',')})&select=id,endpoint,p256dh,auth`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const lista = r && r.ok ? await r.json().catch(() => []) : [];
  let enviados = 0;
  await Promise.all(lista.map(async i => {
    try {
      const e = await push.enviar(i, mensagem, chave, URL_PUBLICA, buscar);
      if (e.ok) { enviados++; await buscar(`${SUPABASE_URL}/rest/v1/push_inscricoes?id=eq.${i.id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ ultimo_envio_em: new Date().toISOString() }), signal: AbortSignal.timeout(5000) }).catch(() => null); }
      else if (e.expirada) await buscar(`${SUPABASE_URL}/rest/v1/push_inscricoes?id=eq.${i.id}`, { method: 'DELETE', headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
      else console.warn(JSON.stringify({ evento: 'aviso_celular_falhou', http: e.status }));
    } catch (er) { console.warn(JSON.stringify({ evento: 'aviso_celular_falhou', erro: String(er.message || er).slice(0, 120) })); }
  }));
  return enviados;
}
async function mensagemDoAlerta(a, buscar = fetch) {
  let nome = null;
  if (a.conversa_id) {
    const r = await buscar(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${a.conversa_id}&select=contato:contatos(nome)`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
    nome = r && r.ok ? (((await r.json().catch(() => []))[0] || {}).contato || {}).nome || null : null;
  }
  return { titulo: a.titulo + (nome ? ' · ' + nome : ''), corpo: String(a.info || '').slice(0, 180), url: a.conversa_id ? '/caixa#c=' + a.conversa_id : '/caixa', tag: a.id };
}
let notificando = null, notificarDeNovo = false;
function notificarAlertas(buscar = fetch) {
  if (notificando) { notificarDeNovo = true; return notificando; }
  notificando = (async () => {
    let total = 0;
    do { notificarDeNovo = false; total += await rodadaDeAvisos(buscar); } while (notificarDeNovo);
    return total;
  })().finally(() => { notificando = null; });
  return notificando;
}
async function rodadaDeAvisos(buscar) {
  if (!(await chaveAvisos(buscar))) return 0;
  const agora = new Date(), recente = new Date(agora - 30 * 60e3); // só o que tocou há pouco (nada de avisar coisa velha)
  const r = await buscar(`${SUPABASE_URL}/rest/v1/alertas?situacao=eq.aberto&notificado_em=is.null&quando=lte.${agora.toISOString()}&quando=gte.${recente.toISOString()}&select=id,tipo,titulo,info,conversa_id,para_id&order=quando&limit=20`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const lista = r && r.ok ? await r.json().catch(() => []) : [];
  let n = 0;
  for (const a of lista) {
    // Marca antes de enviar (só quem conseguiu marcar envia: nunca dois avisos do mesmo alerta)
    const m = await buscar(`${SUPABASE_URL}/rest/v1/alertas?id=eq.${a.id}&notificado_em=is.null`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, body: JSON.stringify({ notificado_em: new Date().toISOString() }), signal: AbortSignal.timeout(5000) }).catch(() => null);
    if (!m || !m.ok || !(await m.json().catch(() => [])).length) continue;
    const para = pedidos.ATENDIMENTO.includes(a.tipo) && a.para_id ? [a.para_id] : null;
    n += await avisarCelulares(para, await mensagemDoAlerta(a, buscar), buscar).catch(() => 0);
  }
  return n;
}

// ---------- Conectar outro aparelho (ex.: CRM instalado no iPhone, que não recebe o login do link do e-mail) ----------
// Quem já está logado gera um código de 6 dígitos (5 min, uso único); o aparelho novo digita o código e entra como essa pessoa.
// Guardado só na memória (o CRM roda numa instância só); muitas tentativas erradas derrubam todos os códigos.
const conexoes = new Map(); // código -> { email, expira }
let errosConexao = { desde: 0, n: 0 };
function novoCodigoConexao(email, agora = Date.now()) {
  for (const [c, v] of conexoes) if (v.expira < agora || v.email === email) conexoes.delete(c);
  let codigo;
  do { codigo = String(crypto.randomInt(0, 1e6)).padStart(6, '0'); } while (conexoes.has(codigo));
  conexoes.set(codigo, { email, expira: agora + 5 * 60e3 });
  return { codigo, expira: new Date(agora + 5 * 60e3).toISOString() };
}
function usarCodigoConexao(codigo, agora = Date.now()) {
  if (agora - errosConexao.desde > 10 * 60e3) errosConexao = { desde: agora, n: 0 };
  const v = conexoes.get(codigo);
  if (!v || v.expira < agora) {
    if (++errosConexao.n >= 10) conexoes.clear(); // alguém tentando adivinhar: todos os códigos caem
    return null;
  }
  conexoes.delete(codigo);
  return v.email;
}
async function linkDeEntrada(email, buscar = fetch) {
  const adm = { ...cabecalhosBanco(), Authorization: 'Bearer ' + SUPABASE_KEY };
  const r = await buscar(`${SUPABASE_URL}/auth/v1/admin/generate_link`, { method: 'POST', headers: adm, body: JSON.stringify({ type: 'magiclink', email }), signal: AbortSignal.timeout(8000) });
  const j = r.ok ? await r.json().catch(() => ({})) : {};
  return j.hashed_token || (j.properties || {}).hashed_token || null;
}

// A sugestão foi enviada: o link de extras ou o produto que ela oferecia passa a contar como oferta do Gilberto
async function registrarUso(sugestaoId, porId) {

      const r = await fetch(`${SUPABASE_URL}/rest/v1/sugestoes?id=eq.${sugestaoId}&select=conversa_id,ferramentas`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
      const sg = r && r.ok ? (await r.json().catch(() => []))[0] : null;
      const vts = (sg && sg.ferramentas && Array.isArray(sg.ferramentas.vitrines) ? sg.ferramentas.vitrines : []).filter(uuidOk);
      if (vts.length) { // o link de extras do Gilberto foi enviado: passa a contar como oferta
        await fetch(`${SUPABASE_URL}/rest/v1/vitrines?id=in.(${vts.join(',')})`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ enviada: true }), signal: AbortSignal.timeout(5000) }).catch(() => null);
        const negocio = await negocioDaConversa(sg.conversa_id);
        if (negocio) await eventoNegocio(negocio, 'Link de extras enviado (sugestão do Gilberto)', (porId || 'gilberto'));
        return { ok: true, oferta: 'link de extras' };
      }
      const cod = sg && sg.ferramentas && sg.ferramentas.produto_oferecido;
      if (cod && sg.conversa_id && !(await ofertasDaConversa(sg.conversa_id)).length) {
        const p = await produtoPorCodigo(cod).catch(() => null);
        if (p) {
          const negocio = await negocioDaConversa(sg.conversa_id);
          await fetch(`${SUPABASE_URL}/rest/v1/ofertas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
            body: JSON.stringify({ conversa_id: sg.conversa_id, negocio_id: negocio, produto_codigo: p.codigo, produto_nome: p.nome, por: 'gilberto', autor_id: porId || null }) }).catch(() => null);
          if (negocio) await eventoNegocio(negocio, 'Oferecido pelo Gilberto: ' + p.nome, (porId || 'gilberto'));
          return { ok: true, oferta: p.nome };
        }
      }
  return { ok: true };
}
// ---------- Gilberto automático (dono, 04/10/2026) ----------
// Liga/desliga geral (config 'gilberto_auto') e por conversa (conversas.gilberto_pausado: a equipe assumiu).
// Quando chega mensagem do cliente, o CRM chama a si mesmo (/interno/gilberto): no Cloud Run o servidor só
// trabalha enquanto atende um pedido, então a resposta é feita dentro desse pedido interno.
const TOKEN_INTERNO = crypto.randomBytes(24).toString('hex');
const URL_INTERNA = () => (process.env.URL_INTERNA || URL_PUBLICA).replace(/\/$/, '');
let autoCache = { ate: 0, ligado: false };
async function gilbertoAutoLigado(buscar = fetch) {
  if (autoCache.ate > Date.now()) return autoCache.ligado;
  const v = await lerConfig('gilberto_auto', buscar).catch(() => null);
  autoCache = { ate: Date.now() + 15000, ligado: !!(v && v.ligado) };
  return autoCache.ligado;
}
async function pausarGilberto(conversa, pausado, por, buscar = fetch) {
  await buscar(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${conversa}${pausado ? '&gilberto_pausado=eq.false' : ''}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
    body: JSON.stringify({ gilberto_pausado: !!pausado, gilberto_pausado_por: pausado && uuidOk(por) ? por : null, gilberto_pausado_em: pausado ? new Date().toISOString() : null }) });
}
async function dispararGilberto(conversa, mensagemId, buscar = fetch) {
  if (!(await gilbertoAutoLigado(buscar))) return;
  buscar(URL_INTERNA() + '/interno/gilberto', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Interno': TOKEN_INTERNO }, body: JSON.stringify({ conversa_id: conversa, mensagem_id: mensagemId }), signal: AbortSignal.timeout(280000) })
    .catch(e => console.warn(JSON.stringify({ evento: 'gilberto_auto_disparo', erro: String(e.message || e).slice(0, 200) })));
  await esperar(150); // garante que o pedido saiu antes de responder à Meta
}
const RECEBEDOR_PIX = 'Para conferir no seu banco, o recebedor é:\nHotel Cabanas Ltda\nBanco do Brasil · Agência 1031-6 · Conta corrente 8583-9';
const quandoBR = d => new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Campo_Grande', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ' às');
// Valor e prazo em negrito do WhatsApp (dono, 07/10/2026)
const textoPix = cob => 'Segue o Pix ' + (cob.tipo === 'sinal' ? 'do sinal (50%)' : cob.tipo === 'total' ? 'do valor total' : '') + ' de *' + produtos.brl(cob.valor) + '*, válido até *' + quandoBR(cob.expira_em) + '*'
  + '. É só copiar o código abaixo e colar no app do seu banco, em Pix Copia e Cola.\n\n' + RECEBEDOR_PIX + '\n\nAssim que o pagamento cair, eu confirmo sua reserva por aqui 🌿\n---\n' + (cob.copia_e_cola || '');
const respondendo = new Set();
// Quando o Gilberto não consegue responder sozinho: avisa o cliente (nada de silêncio) e chama a equipe, sem pausar:
// a próxima mensagem do cliente ele tenta responder de novo (dono, 06/10/2026: o Gilberto nunca para de responder).
const AVISO_ESPERA = { aberto: 'Só um instante: vou confirmar um detalhe com a equipe e já te respondo, tá? 🌿', fechado: 'Vou confirmar um detalhe com a equipe e te respondo assim que possível, tá? 🌿',
  de_novo: 'Ainda estou vendo esse ponto com a equipe e já te retorno. Enquanto isso, posso te ajudar com mais alguma coisa? 🌿' };
const ultimoAviso = new Map(); // conversa → quando mandou o aviso de espera (não repete a mesma frase)
async function segurarCliente(conversa, info, titulo, buscar = fetch) {
  const m = minutosBonito(new Date());
  const repetido = Date.now() - (ultimoAviso.get(conversa) || 0) < 60 * 60e3;
  try {
    const { conv, para } = await carregarConversaParaEnvio(conversa, buscar);
    await enviarTexto(conv, para, repetido ? AVISO_ESPERA.de_novo : m >= 7 * 60 + 30 && m < 22 * 60 ? AVISO_ESPERA.aberto : AVISO_ESPERA.fechado, 'gilberto', buscar);
    ultimoAviso.set(conversa, Date.now());
  } catch (e) { console.warn(JSON.stringify({ evento: 'gilberto_aviso_espera', erro: String(e.message || e).slice(0, 200) })); }
  await alertaAtendimento('gilberto_passou', conversa, info, buscar, titulo).catch(() => {});
}
async function responderSozinho(conversa, mensagemId, buscar = fetch, { retomada = null } = {}) {
  if (!retomada) await esperar(Number(process.env.GILBERTO_ESPERA_MS ?? 15000)); // o cliente costuma mandar várias mensagens seguidas
  const ultima = (await getJson(`${SUPABASE_URL}/rest/v1/mensagens?conversa_id=eq.${conversa}&direcao=eq.entrada&select=id&order=enviada_em.desc&limit=1`, buscar))[0];
  if (!ultima || ultima.id !== mensagemId) return { pulou: 'chegou_outra' }; // a mais nova responde por todas
  for (let i = 0; respondendo.has(conversa) && i < 60; i++) await esperar(1500);
  if (!(await gilbertoAutoLigado(buscar))) return { pulou: 'desligado' };
  const c = (await getJson(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${conversa}&select=status,gilberto_pausado`, buscar))[0];
  if (!c || c.status !== 'aberta' || c.gilberto_pausado !== false) return { pulou: 'pausado' };
  const dia = await getJson(`${SUPABASE_URL}/rest/v1/mensagens?conversa_id=eq.${conversa}&autor=eq.gilberto&enviada_em=gte.${new Date(Date.now() - 864e5).toISOString()}&select=id&limit=60`, buscar);
  if (dia.length >= 60) { // trava contra conversa sem fim (ou outro robô do outro lado)
    await pausarGilberto(conversa, true, null, buscar).catch(() => {});
    await alertaAtendimento('gilberto_passou', conversa, 'O Gilberto já mandou 60 mensagens nesta conversa em 24 h e parou. Confira e, se for o caso, devolva a conversa a ele.', buscar, 'Gilberto parou: limite de mensagens').catch(() => {});
    return { pulou: 'limite' };
  }
  respondendo.add(conversa);
  try {
    let r;
    for (let tentativa = 0; !r; tentativa++) {
      try { r = await gerarResposta(conversa, { modo: 'automatico', eu: null, mensagemId, gatilho: retomada ? GATILHO_RETOMADA[retomada] : null, retomada: !!retomada }, buscar); }
      catch (e) {
        // Só pula calado quando não há nada a responder ou alguém da equipe já está pedindo a sugestão desta conversa
        if (e instanceof ErroEnvio && (e.http === 409 || (e.http === 429 && /preparando/.test(e.message)))) return { pulou: e.message };
        if (tentativa === 0 && e instanceof ErroEnvio && [429, 502].includes(e.http)) { await esperar(Number(process.env.GILBERTO_REPETIR_MS ?? 8000)); continue; } // IA ocupada ou instável: tenta mais uma vez
        const motivo = String(e.message || e).slice(0, 150);
        console.warn(JSON.stringify({ evento: 'gilberto_auto_falha', erro: motivo }));
        ultimaFalhaGilberto = { quando: new Date().toISOString(), tipo: 'erro', motivo };
        await segurarCliente(conversa, 'O Gilberto não conseguiu responder (' + motivo + '). Ele avisou o cliente que vai confirmar com a equipe e continua na conversa: se você responder à mão, ele sai da conversa.', 'Gilberto não conseguiu responder', buscar);
        return { erro: motivo };
      }
    }
    // Mensagem nova do cliente enquanto o Gilberto pensava: a resposta pode estar velha; a mais nova responde
    const depois = (await getJson(`${SUPABASE_URL}/rest/v1/mensagens?conversa_id=eq.${conversa}&direcao=eq.entrada&select=id&order=enviada_em.desc&limit=1`, buscar))[0];
    if (depois && depois.id !== mensagemId && !r.cobranca && !r.reserva_criada) return { pulou: 'chegou_outra' };
    let texto = String(r.mensagem || '').replace(/\*\*([^*\n]+?)\*\*/g, '*$1*'); // negrito do WhatsApp é com 1 asterisco
    if (r.cobranca) texto = texto.includes('[[PIX]]') ? texto.replace('[[PIX]]', textoPix(r.cobranca)) : texto + '\n---\n' + textoPix(r.cobranca);
    if (r.vitrines && r.vitrines.length) texto = texto.replace(new RegExp(URL_PUBLICA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/e/[A-Za-z0-9_-]+', 'g'), '').replace(/[ \t]+\n/g, '\n').trim(); // o link vai no cartão
    const baloes = texto.split(/\n\s*[-–—]{3,}\s*\n/).map(t => t.trim()).filter(Boolean);
    const alterado = linkAlterado(texto);
    if (!baloes.length || baloes.length > 6 || /\[\[[^\]]*\]\]/.test(texto) || alterado) {
      const porque = alterado ? 'link estranho' : /\[\[[^\]]*\]\]/.test(texto) ? 'dado a completar' : 'formato da mensagem';
      ultimaFalhaGilberto = { quando: new Date().toISOString(), tipo: 'revisar', motivo: porque, baloes: baloes.length };
      await segurarCliente(conversa, 'O Gilberto preparou uma resposta que precisa de alguém (' + porque + '). Ela está em Revisão; o cliente foi avisado de que a equipe confirma (o Gilberto continua na conversa). ' + (r.notas_internas ? 'Notas: ' + r.notas_internas : ''), 'Gilberto: resposta para revisar', buscar);
      return { pulou: 'revisar' };
    }
    const { conv, para, wamidCliente } = await carregarConversaParaEnvio(conversa, buscar);
    if (r.lido_ate) vistoAte.set(conversa, r.lido_ate); // o que chegar daqui em diante, esta resposta não leu
    const enviadas = [];
    for (const b of baloes) {
      await mostrarDigitando(conv, wamidCliente, buscar);
      await esperar(tempoDigitacao(b));
      enviadas.push(await enviarTexto(conv, para, b, 'gilberto', buscar));
    }
    if (r.fotos && r.fotos.length) await enviarFotos(conv, para, r.fotos.map(f => f.arquivo), '', 'gilberto', buscar).catch(e => console.warn(JSON.stringify({ evento: 'gilberto_auto_fotos', erro: String(e.message || e).slice(0, 200) })));
    // Link de extras do Gilberto: vai como cartão com foto e botão (e passa a contar como oferta)
    for (const vid of (r.vitrines || []).filter(uuidOk).slice(0, 2)) {
      const v = (await getJson(`${SUPABASE_URL}/rest/v1/vitrines?id=eq.${vid}&select=id,tema,token`, buscar))[0];
      if (!v || !vitrine.TEMAS[v.tema]) continue;
      const link = `${URL_PUBLICA}/e/${v.token}`;
      await enviarCartaoVitrine(conv, para, v.tema, { ...v, link }, TEXTO_EXTRAS[v.tema], 'gilberto', buscar)
        .catch(() => enviarTexto(conv, para, TEXTO_EXTRAS[v.tema] + '\n' + link, 'gilberto', buscar)).catch(() => {});
      await patchBanco('vitrines', `id=eq.${v.id}`, { enviada: true }).catch(() => {});
    }
    if (r.sugestao_id) {
      await patchBanco('sugestoes', `id=eq.${r.sugestao_id}`, { situacao: 'usada', motivo: 'Enviada pelo Gilberto (automático)', revisada_em: new Date().toISOString() }).catch(() => {});
      await registrarUso(r.sugestao_id, null).catch(() => {});
    }
    // Avisar a equipe não tira o Gilberto da conversa (dono, 06/10/2026): só a equipe o pausa, ao assumir o alerta ou responder à mão
    console.log(JSON.stringify({ evento: 'gilberto_auto', baloes: enviadas.length, reserva: !!r.reserva_criada, pix: !!r.cobranca }));
    return { ok: true, enviadas: enviadas.length };
  } finally { respondendo.delete(conversa); }
}

// ---------- Reserva no Silbeck (aceite) e cobrança ----------
// Etapa 1 do Silbeck real (dono, 07/10/2026): consultas e orçamentos reais, mas reserva e Pix automáticos travados
// enquanto o Pix do BB estiver em modo de teste (um Pix de mentira numa reserva de verdade não paga nada).
// Quando o cliente aceita, o Gilberto passa os dados à equipe, que fecha a reserva e manda o pagamento.
const travaReservas = () => silbeck.MODO() === 'real' && (bb.MODO() === 'simulador' || process.env.RESERVAS_AUTO === 'travadas');
const pixFicticioComSilbeckReal = () => silbeck.MODO() === 'real' && bb.MODO() === 'simulador';
const ERRO_PIX_TESTE = 'O Pix do BB ainda está em modo de teste: com o Silbeck real, o CRM não gera Pix (seria um código que não paga). Gere o Pix pelo app do banco ou use o link do cartão.';
async function criarCobrancaPix(conversa, corpo, porId, buscar = fetch) {
  if (pixFicticioComSilbeckReal()) throw new ErroEnvio(409, ERRO_PIX_TESTE);
  const valor = Math.round(Number(String(corpo.valor || '').replace(',', '.')) * 100) / 100;
  if (!(valor >= 1 && valor <= 100000)) throw new ErroEnvio(400, 'Valor inválido (de R$ 1 a R$ 100.000).');
  const tipo = ['sinal', 'total', 'outro'].includes(corpo.tipo) ? corpo.tipo : 'sinal';
  const descricao = String(corpo.descricao || '').trim().slice(0, 120) || ({ sinal: 'Sinal de 50% da hospedagem', total: 'Hospedagem (valor total)', outro: 'Hotel Cabanas' })[tipo];
  const negocio = await negocioDaConversa(conversa, 'id,etapa,data_entrada', buscar);
  const est = await estadiaDaConversa(conversa, buscar);
  const expira = prazoCobranca((negocio && negocio.data_entrada) || est.data_entrada);
  const txid = bb.novoTxid();
  const c = await bb.criarCobranca({ txid, valor, expiracaoSeg: Math.round((expira - new Date()) / 1000), descricao: 'Hotel Cabanas · ' + descricao });
  const r = await buscar(`${SUPABASE_URL}/rest/v1/cobrancas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, signal: AbortSignal.timeout(5000),
    body: JSON.stringify({ txid, conversa_id: conversa, negocio_id: negocio ? negocio.id : null, tipo, descricao, valor, expira_em: expira.toISOString(), copia_e_cola: c.copia_e_cola, fonte: c.fonte, criado_por: porId || null, ...(corpo.reserva_id ? { reserva_id: corpo.reserva_id } : {}) }) });
  if (!r.ok) { await bb.cancelar(txid, c.fonte).catch(() => {}); throw new ErroEnvio(r.status === 404 ? 503 : 502, 'Não deu para registrar a cobrança (o banco precisa da migração 017/020?).'); }
  const cob = (await r.json())[0];
  if (negocio) {
    if (['novo', 'atend', 'orc'].includes(negocio.etapa)) await patchBanco('negocios', `id=eq.${negocio.id}`, { etapa: 'pag', etapa_desde: new Date().toISOString(), atualizado_em: new Date().toISOString() }).catch(() => {});
    await eventoNegocio(negocio.id, 'Pix gerado: ' + produtos.brl(valor) + ' (' + descricao + '), vale até ' + expira.toLocaleString('pt-BR', { timeZone: 'America/Campo_Grande', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }), porId || 'CRM', buscar);
  }
  return cob;
}
// Opção do orçamento pelo código: acomodação (BGE) ou combinação (CBM+STD, em qualquer ordem)
function opcaoDoOrcamento(o, codigo) {
  const cods = String(codigo || '').toUpperCase().split('+').map(c => c.trim()).filter(Boolean);
  if (!cods.length) return null;
  const chave = orcamento.chaveCombinacao(cods);
  return (o.opcoes || []).find(x => cods.length === 1 ? x.codigo === cods[0] : (x.combinacao && orcamento.chaveCombinacao(x.codigo.split('+')) === chave)) || null;
}
// Cria a reserva NÃO CONFIRMADA no Silbeck (vaga e preço conferidos na hora) e registra no CRM
async function criarReservaSilbeck(conversa, d, { usuario, origem }, buscar = fetch) {
  const o = (await getJson(`${SUPABASE_URL}/rest/v1/orcamentos?conversa_id=eq.${conversa}&select=id,opcoes,data_entrada,data_saida,adultos,criancas_idades&order=criado_em.desc&limit=1`, buscar))[0];
  const op = o && opcaoDoOrcamento(o, d.opcao_codigo);
  if (!op) throw new ErroEnvio(400, 'Essa acomodação não está no último orçamento desta conversa.');
  const titular = String(d.titular || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  if (titular.split(' ').length < 2) throw new ErroEnvio(400, 'Falta o nome completo do titular.');
  const email = emailOk(d.email);
  const ja = await getJson(`${SUPABASE_URL}/rest/v1/reservas?conversa_id=eq.${conversa}&situacao=eq.nao_confirmada&codigo=eq.${encodeURIComponent(op.codigo)}&data_entrada=eq.${o.data_entrada}&select=id,silbeck_id&limit=1`, buscar);
  if (ja.length) throw new ErroEnvio(409, 'Já existe a reserva ' + ja[0].silbeck_id + ' (não confirmada) para esta acomodação e datas. Mande um novo Pix dela no painel 💳.');
  const conv = (await getJson(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${conversa}&select=contato:contatos(contato_identificadores(tipo,valor))`, buscar))[0];
  const wa = ((conv && conv.contato && conv.contato.contato_identificadores) || []).find(x => x.tipo === 'whatsapp');
  const r = await silbeck.reservar({ codigo: op.codigo, data_entrada: o.data_entrada, data_saida: o.data_saida, adultos: o.adultos, idades_criancas: o.criancas_idades || [],
    ...(op.combinacao ? { quartos: op.acomodacoes.map(a => ({ codigo: a.codigo, adultos: a.adultos, idades_criancas: a.idades_criancas || [] })) } : {}),
    titular, email, telefone: wa ? wa.valor : undefined, acompanhantes: Array.isArray(d.acompanhantes) ? d.acompanhantes : [], valor_esperado: op.valor_total }, buscar);
  if (!r.ok) throw new ErroEnvio(409, r.preco_mudou ? `O valor mudou desde o orçamento: agora fica ${produtos.brl(r.valor_novo)}. Mande um orçamento novo e peça um novo OK ao cliente.` : r.erro);
  const negocio = await negocioDaConversa(conversa, 'id', buscar);
  const linha = { conversa_id: conversa, negocio_id: negocio, orcamento_id: o.id, silbeck_id: r.reserva_id, silbeck_item_id: r.item_id, fonte: r.fonte === 'simulador' ? 'simulador' : 'silbeck',
    codigo: op.codigo, acomodacao: op.combinacao ? op.nome : r.acomodacao, data_entrada: o.data_entrada, data_saida: o.data_saida, adultos: o.adultos, criancas_idades: o.criancas_idades || [], titular, email,
    valor_total: r.valor_total, forma_pagamento: d.forma === 'cartao' ? 'cartao' : d.forma === 'pix' ? 'pix' : null, percentual: Number(d.percentual) === 100 ? 100 : Number(d.percentual) === 50 ? 50 : null, criado_por: String(origem || usuario || 'CRM') };
  if (op.combinacao) linha.itens = r.itens.map((it, i) => ({ ...it, nome: (op.acomodacoes[i] && op.acomodacoes[i].nome) || it.nome }));
  const gravar = l => buscar(`${SUPABASE_URL}/rest/v1/reservas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, body: JSON.stringify(l), signal: AbortSignal.timeout(5000) }).catch(() => null);
  let ins = await gravar(linha);
  let semItens = false;
  if (ins && !ins.ok && linha.itens) { const { itens, ...sem } = linha; semItens = true; ins = await gravar({ ...sem, silbeck_item_id: null }); } // banco sem a migração 022: a equipe divide o pagamento
  const reserva = ins && ins.ok ? (await ins.json().catch(() => []))[0] : null;
  if (reserva && semItens) reserva.itens = linha.itens;
  const periodo = orcamento.periodo(o.data_entrada, o.data_saida);
  if (negocio) {
    await patchBanco('negocios', `id=eq.${negocio}`, { etapa: 'pag', etapa_desde: new Date().toISOString(), valor_previsto: r.valor_total, data_entrada: o.data_entrada, data_saida: o.data_saida, acomodacao: linha.acomodacao, atualizado_em: new Date().toISOString() }).catch(() => {});
    await eventoNegocio(negocio, `Reserva ${r.reserva_id} criada no Silbeck (não confirmada)${origem === 'gilberto' ? ' pelo Gilberto' : ''}: ${linha.acomodacao}${op.combinacao ? ' (' + op.acomodacoes.map(a => a.nome + ': ' + orcamento.resumoGrupo(a)).join('; ') + ')' : ''}, ${periodo}, ${produtos.brl(r.valor_total)}, titular ${titular}${r.fonte === 'simulador' ? ' · SIMULADOR' : ''}`, usuario || 'CRM', buscar);
  }
  if (!reserva) await buscar(`${SUPABASE_URL}/rest/v1/tarefas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
    body: JSON.stringify({ negocio_id: negocio, responsavel_id: usuario || null, criado_por: 'CRM', tipo: 'Conferir no Silbeck', quando: new Date().toISOString(), descricao: `Reserva ${r.reserva_id} criada no Silbeck, mas não registrada no CRM (falta a migração 020). Lançar o pagamento no Silbeck quando cair.` }) }).catch(() => null);
  return { ...(reserva || linha), id: reserva ? reserva.id : null, negocio_id: negocio, periodo, simulador: r.fonte === 'simulador' };
}
async function tarefaLinkCartao(reserva, valor, pct, usuario, buscar = fetch) {
  if (!reserva.negocio_id) return;
  await buscar(`${SUPABASE_URL}/rest/v1/tarefas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
    body: JSON.stringify({ negocio_id: reserva.negocio_id, responsavel_id: usuario || null, criado_por: 'CRM', tipo: 'Enviar link do cartão', quando: new Date().toISOString(),
      descricao: `Gerar na Cielo o link de ${produtos.brl(valor)} (${pct === 100 ? 'total em até 6x sem juros' : 'sinal de 50% em até 3x'}) da reserva ${reserva.silbeck_id} e mandar ao cliente. Quando pagar, lançar o adiantamento (cartão) no Silbeck.` }) }).catch(() => null);
}
async function fecharReserva(conversa, d, { usuario, origem }, buscar = fetch) {
  const forma = d.forma === 'cartao' ? 'cartao' : d.forma === 'pix' ? 'pix' : null;
  if (!forma) throw new ErroEnvio(400, 'Escolha a forma de pagamento (Pix ou cartão).');
  const pct = Number(d.percentual) === 100 ? 100 : 50;
  if (forma === 'pix' && pixFicticioComSilbeckReal()) throw new ErroEnvio(409, ERRO_PIX_TESTE); // antes de criar a reserva
  const reserva = await criarReservaSilbeck(conversa, { ...d, forma, percentual: pct }, { usuario, origem }, buscar);
  const valor = Math.round(Number(reserva.valor_total) * pct) / 100;
  const descricao = (pct === 100 ? 'Valor total' : 'Sinal 50%') + ' · ' + reserva.acomodacao + ' (' + reserva.periodo + ')';
  let cobranca = null;
  if (forma === 'pix') cobranca = await criarCobrancaPix(conversa, { tipo: pct === 100 ? 'total' : 'sinal', valor, descricao, reserva_id: reserva.id }, usuario, buscar);
  else await tarefaLinkCartao(reserva, valor, pct, usuario, buscar);
  return { reserva, cobranca, valor_cobranca: valor, forma, simulador: reserva.simulador };
}

// ---------- Oportunidades (sem sino): retomar orçamentos parados e o resumo do dia ----------
// Dono, 04/10/2026: o sino é só para urgência. Orçamento sem resposta em 24 h vira tarefa para o responsável;
// às 8h, um único aviso no celular com o que há para hoje (quem quiser, desliga no sino).
const TIPO_RETOMAR = 'Retomar orçamento';
const minutosBonito = d => { const [h, m] = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Campo_Grande', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d).split(':').map(Number); return h * 60 + m; };
const diaBonito = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Campo_Grande' }).format(d);
function proximoExpediente(d = new Date()) {
  const m = minutosBonito(d);
  if (m >= 450 && m < 1020) return d;                      // 7h30 às 17h
  const n = new Date(`${diaBonito(d)}T07:30:00-04:00`);
  if (m >= 1020) n.setUTCDate(n.getUTCDate() + 1);
  return n;
}
const getJson = async (url, buscar) => { const r = await buscar(url, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null); return r && r.ok ? r.json().catch(() => []) : []; };
let ultimaRetomada = 0;
const ehRobo = req => /WhatsApp|facebookexternalhit|facebookcatalog|Facebot|meta-externalagent|bot\b|crawler|spider|preview|Slackbot|TelegramBot|Twitterbot|Discordbot|SkypeUriPreview|Google-PageRenderer|HeadlessChrome/i.test(String(req.headers['user-agent'] || ''));
async function retomarOrcamentos(buscar = fetch, agora = Date.now()) {
  const desde = agora - ultimaRetomada; // no máximo a cada 15 min (relógio voltando, como nos testes, não trava)
  if (desde >= 0 && desde < Number(process.env.RETOMAR_INTERVALO_MS || 15 * 60e3)) return { criadas: 0, fechadas: 0 };
  ultimaRetomada = agora;
  let criadas = 0, fechadas = 0;
  const de = new Date(agora - 7 * 864e5).toISOString(), ate = new Date(agora - 864e5).toISOString();
  const lista = await getJson(`${SUPABASE_URL}/rest/v1/orcamentos?criado_em=gte.${de}&criado_em=lte.${ate}&select=id,conversa_id,criado_em,aberturas&order=criado_em.desc&limit=100`, buscar);
  const vistas = new Set();
  for (const o of lista) {
    if (!o.conversa_id || vistas.has(o.conversa_id)) continue;
    vistas.add(o.conversa_id); // só o orçamento mais recente da conversa
    if ((await getJson(`${SUPABASE_URL}/rest/v1/orcamentos?conversa_id=eq.${o.conversa_id}&criado_em=gt.${o.criado_em}&select=id&limit=1`, buscar)).length) continue; // há um mais novo (< 24 h)
    const neg = await negocioDaConversa(o.conversa_id, 'id,responsavel_id', buscar).catch(() => null);
    if (!neg || neg.etapa !== 'orc') continue;
    if ((await getJson(`${SUPABASE_URL}/rest/v1/mensagens?conversa_id=eq.${o.conversa_id}&direcao=eq.entrada&enviada_em=gt.${o.criado_em}&select=id&limit=1`, buscar)).length) continue; // o cliente respondeu
    if ((await getJson(`${SUPABASE_URL}/rest/v1/tarefas?negocio_id=eq.${neg.id}&tipo=eq.${encodeURIComponent(TIPO_RETOMAR)}&criado_em=gte.${o.criado_em}&select=id&limit=1`, buscar)).length) continue; // já tem
    if ((await getJson(`${SUPABASE_URL}/rest/v1/tarefas?negocio_id=eq.${neg.id}&tipo=eq.${encodeURIComponent(TIPO_RETOMAR)}&feita=eq.false&select=id&limit=1`, buscar)).length) continue; // uma aberta por negócio (sem duplicar)
    const vezes = o.aberturas ? `abriu ${o.aberturas}x` : 'ainda não abriu o link';
    const r = await buscar(`${SUPABASE_URL}/rest/v1/tarefas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ negocio_id: neg.id, responsavel_id: neg.responsavel_id || null, criado_por: 'CRM', tipo: TIPO_RETOMAR, quando: proximoExpediente(new Date(agora)).toISOString(),
        descricao: `Orçamento de ${o.criado_em.slice(8, 10)}/${o.criado_em.slice(5, 7)} sem resposta há mais de 24 h (${vezes}). Retome com algo novo: uma foto real, uma data de domingo a quinta com vaga ou a programação inclusa. Use ✨ Sugerir resposta na conversa.` }) }).catch(() => null);
    if (r && r.ok) { criadas++; await eventoNegocio(neg.id, 'Tarefa: retomar o orçamento (24 h sem resposta)', 'CRM', buscar).catch(() => {}); }
  }
  // Tarefas de retomar que perderam o sentido (o cliente respondeu, reservou ou foi perdido) fecham sozinhas
  for (const t of await getJson(`${SUPABASE_URL}/rest/v1/tarefas?tipo=eq.${encodeURIComponent(TIPO_RETOMAR)}&feita=eq.false&select=id,negocio_id,criado_em&limit=200`, buscar)) {
    const n = (await getJson(`${SUPABASE_URL}/rest/v1/negocios?id=eq.${t.negocio_id}&select=etapa,conversa_id`, buscar))[0];
    const respondeu = n && n.conversa_id && (await getJson(`${SUPABASE_URL}/rest/v1/mensagens?conversa_id=eq.${n.conversa_id}&direcao=eq.entrada&enviada_em=gt.${t.criado_em}&select=id&limit=1`, buscar)).length;
    if (!n || n.etapa !== 'orc' || respondeu) {
      await buscar(`${SUPABASE_URL}/rest/v1/tarefas?id=eq.${t.id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000), body: JSON.stringify({ feita: true, feita_em: new Date(agora).toISOString() }) }).catch(() => null);
      fechadas++;
    }
  }
  return { criadas, fechadas };
}
// ---------- Retomada automática pelo Gilberto (dono, 07/10/2026) ----------
// Um toque só por orçamento, das 8h às 21h, com a janela de 24 h do WhatsApp aberta e o cliente calado:
// tocou em "Quero reservar" e não mandou a mensagem → 10 min depois; voltou ao orçamento → 30 min depois;
// nenhum sinal → 20 h depois da última mensagem do cliente. Nunca se a equipe assumiu, o negócio saiu de Orçamento
// ou o cliente está esperando resposta. Fechada a janela, segue a tarefa "Retomar orçamento" para a equipe.
const GATILHO_RETOMADA = {
  quero_reservar: 'retomada automática: o cliente demonstrou que quer reservar uma das opções do orçamento, mas não escreveu. Mande UMA mensagem curta e natural oferecendo ajuda para garantir a reserva (ex.: se quer que você já deixe tudo pronto, qual opção e a forma de pagamento). NUNCA diga que viu o cliente abrir o link ou tocar em botão.',
  voltou: 'retomada automática: o cliente voltou a olhar o orçamento, mas não escreveu. Mande UMA mensagem curta com algo novo e útil: uma foto real de uma acomodação do orçamento (enviar_fotos), a programação inclusa, ou uma pergunta sobre o que falta para decidir. Sem repetir o orçamento e sem pressionar. NUNCA diga que viu o cliente abrir o link.',
  silencio: 'retomada automática: o orçamento foi enviado e o cliente não respondeu desde a última mensagem dele (cerca de 20 h). Mande UMA mensagem curta com algo novo e útil (regra 10): uma foto real (enviar_fotos), a programação inclusa ou uma data de domingo a quinta com vaga real. Sem repetir o orçamento e sem pressionar. NUNCA diga que viu o cliente abrir o link.',
};
const ROTULO_RETOMADA = { quero_reservar: 'tocou em "Quero reservar" e não escreveu', voltou: 'voltou ao orçamento', silencio: '20 h sem resposta' };
// Devolve o motivo da retomada ou null; com explicar = true, devolve { motivo, porque } (diagnóstico em /saude/retomada)
function motivoRetomada(o, ultimaDoCliente, ultimaMsg, agora = Date.now(), explicar = false) {
  const t = x => x ? Date.parse(x) : 0, calado = x => t(ultimaDoCliente) < t(x), MIN = 60e3, H = 3600e3;
  const r = (motivo, porque) => explicar ? { motivo, porque } : motivo;
  if (!t(ultimaDoCliente) || agora - t(ultimaDoCliente) > 23 * H) return r(null, 'janela de 24 h do WhatsApp fechada (o cliente não escreve há mais de 23 h)');
  if (!ultimaMsg || ultimaMsg.direcao === 'entrada') return r(null, 'a última mensagem é do cliente (o Gilberto responde normalmente)');
  if (agora - t(ultimaMsg.enviada_em) < 10 * MIN) return r(null, 'o hotel mandou mensagem há menos de 10 min');
  if (t(o.escolhida_em) && calado(o.escolhida_em)) return agora - t(o.escolhida_em) >= 10 * MIN ? r('quero_reservar', 'tocou em Quero reservar e não escreveu') : r(null, 'tocou em Quero reservar há menos de 10 min');
  const volta = t(o.ultima_abertura_em) - t(o.aberto_primeira_vez_em) >= VOLTOU_MIN_MS && calado(o.ultima_abertura_em);
  if (volta) return agora - t(o.ultima_abertura_em) >= 30 * MIN ? r('voltou', 'voltou ao orçamento') : r(null, 'voltou ao orçamento há menos de 30 min');
  if (agora - t(ultimaDoCliente) >= 20 * H && agora - t(o.criado_em) >= 3 * H) return r('silencio', '20 h sem resposta');
  return r(null, !o.aberturas ? 'ainda não abriu o link' : t(o.ultima_abertura_em) - t(o.aberto_primeira_vez_em) < VOLTOU_MIN_MS ? 'abriu, mas não voltou (as aberturas foram em menos de 10 min)' : 'o cliente escreveu depois de voltar ao orçamento');
}
let ultimaRetomadaAuto = 0;
// simular: não manda nada, só explica orçamento a orçamento por que retomaria ou não (sem dados pessoais)
async function retomadaAutomatica(buscar = fetch, agora = Date.now(), { simular = false } = {}) {
  const diag = [];
  const desde = agora - ultimaRetomadaAuto;
  if (!simular && desde >= 0 && desde < Number(process.env.RETOMAR_INTERVALO_MS || 4 * 60e3)) return 0;
  if (!simular) ultimaRetomadaAuto = agora;
  const m = minutosBonito(new Date(agora)), ligado = await gilbertoAutoLigado(buscar);
  if (!simular && (m < 8 * 60 || m >= 21 * 60 || !ligado)) return 0;
  const lista = await getJson(`${SUPABASE_URL}/rest/v1/orcamentos?criado_em=gte.${new Date(agora - 48 * 3600e3).toISOString()}&select=id,conversa_id,criado_em,aberturas,aberto_primeira_vez_em,ultima_abertura_em,escolhida_em&order=criado_em.desc&limit=100`, buscar);
  const vistas = new Set();
  let disparadas = 0;
  for (const o of lista) {
    if (!o.conversa_id || vistas.has(o.conversa_id) || disparadas >= 3) continue;
    vistas.add(o.conversa_id); // só o orçamento mais recente da conversa
    const d = { orcamento: o.id.slice(0, 8), criado_em: o.criado_em, aberturas: o.aberturas || 0, aberto_primeira_vez_em: o.aberto_primeira_vez_em || null, ultima_abertura_em: o.ultima_abertura_em || null };
    const pula = porque => { d.resultado = 'não retoma: ' + porque; diag.push(d); };
    if ((await getJson(`${SUPABASE_URL}/rest/v1/orcamento_eventos?orcamento_id=eq.${o.id}&tipo=eq.retomada&select=id&limit=1`, buscar)).length) {
      const res = simular ? (await getJson(`${SUPABASE_URL}/rest/v1/orcamento_eventos?orcamento_id=eq.${o.id}&tipo=eq.retomada_resultado&select=dados,quando&order=quando.desc&limit=1`, buscar))[0] : null;
      if (res) d.envio = res.dados && res.dados.enviada ? 'mensagem enviada em ' + res.quando : 'não enviou: ' + ((res.dados && (res.dados.pulou || res.dados.erro)) || 'sem detalhe');
      pula('já retomado (um toque por orçamento)'); continue;
    }
    const c = (await getJson(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${o.conversa_id}&select=status,canal,gilberto_pausado,ultima_msg_cliente_em`, buscar))[0];
    if (!c || c.status !== 'aberta') { pula('conversa fechada'); continue; }
    if (c.canal !== 'wa') { pula('conversa fora do WhatsApp'); continue; }
    if (c.gilberto_pausado !== false) { pula('a equipe assumiu a conversa (Gilberto pausado)'); continue; }
    const neg = await negocioDaConversa(o.conversa_id, 'id', buscar).catch(() => null);
    const etapa = neg && (await getJson(`${SUPABASE_URL}/rest/v1/negocios?id=eq.${neg}&select=etapa`, buscar))[0];
    if (!etapa || etapa.etapa !== 'orc') { pula('o negócio não está em Orçamento' + (etapa ? ' (etapa: ' + etapa.etapa + ')' : '')); continue; }
    const ultimaMsg = (await getJson(`${SUPABASE_URL}/rest/v1/mensagens?conversa_id=eq.${o.conversa_id}&select=id,direcao,enviada_em&order=enviada_em.desc&limit=1`, buscar))[0];
    const ex = motivoRetomada(o, c.ultima_msg_cliente_em, ultimaMsg, agora, true);
    if (!ex.motivo) { pula(ex.porque); continue; }
    if (simular) { d.resultado = 'RETOMA: ' + ex.porque + (m < 8 * 60 || m >= 21 * 60 ? ' (quando der 8h)' : '') + (ligado ? '' : ' (mas o Gilberto automático está desligado)'); diag.push(d); continue; }
    const motivo = ex.motivo;
    const doCliente = (await getJson(`${SUPABASE_URL}/rest/v1/mensagens?conversa_id=eq.${o.conversa_id}&direcao=eq.entrada&select=id&order=enviada_em.desc&limit=1`, buscar))[0];
    if (!doCliente) continue;
    const marca = await buscar(`${SUPABASE_URL}/rest/v1/orcamento_eventos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ orcamento_id: o.id, tipo: 'retomada', dados: { motivo } }) }).catch(() => null);
    if (!marca || !marca.ok) continue; // sem a marca, não arrisca mandar duas vezes
    await eventoNegocio(neg, 'O Gilberto retomou o orçamento (' + ROTULO_RETOMADA[motivo] + ')', 'gilberto', buscar).catch(() => {});
    buscar(URL_INTERNA() + '/interno/gilberto', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Interno': TOKEN_INTERNO }, body: JSON.stringify({ conversa_id: o.conversa_id, mensagem_id: doCliente.id, retomada: motivo, orcamento_id: o.id }), signal: AbortSignal.timeout(280000) })
      .catch(e => console.warn(JSON.stringify({ evento: 'retomada_disparo', erro: String(e.message || e).slice(0, 200) })));
    disparadas++;
  }
  if (simular) return { agora: new Date(agora).toISOString(), horario: m >= 8 * 60 && m < 21 * 60 ? 'dentro do horário (8h às 21h)' : 'fora do horário (8h às 21h)', gilberto_automatico: ligado, orcamentos: diag };
  if (disparadas) await esperar(150); // garante que os pedidos saíram
  return disparadas;
}
// Promoção do site (Ajustes; config promocao_site): o módulo do Silbeck lê a cada minuto
silbeck.definirFontePromocao(() => bancoLigado() ? lerConfig('promocao_site', fetch) : null);
// Resumo do dia: às 8h (horário de Bonito), um aviso por pessoa com tarefas de hoje e clientes quentes
async function lerConfig(chave, buscar) { return ((await getJson(`${SUPABASE_URL}/rest/v1/config?chave=eq.${chave}&select=valor`, buscar))[0] || {}).valor || null; }
const gravarConfig = (chave, valor, buscar, por = null) => buscar(`${SUPABASE_URL}/rest/v1/config?on_conflict=chave`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'resolution=merge-duplicates,return=minimal' },
  body: JSON.stringify({ chave, valor, atualizado_por: por, atualizado_em: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
// Quente = interesse real: voltou ao orçamento (outra abertura 10 min ou mais depois da 1ª, inclusive dentro de 2 h:
// dono, 07/10/2026), ou tocou em "Quero reservar" e não mandou a mensagem; e o cliente não escreveu depois disso
// (mesma regra da lista no CRM). Reabrir em poucos minutos (atualizar a página) não conta.
const VOLTOU_MIN_MS = 10 * 60e3;
function sinalQuente(o, ultimaDoCliente, agora = Date.now()) {
  const t = x => x ? Date.parse(x) : 0, dia = agora - 864e5, calado = x => t(ultimaDoCliente) < t(x);
  if (t(o.escolhida_em) > dia && calado(o.escolhida_em)) return 'quero_reservar';
  if (t(o.ultima_abertura_em) > dia && t(o.ultima_abertura_em) - t(o.aberto_primeira_vez_em) >= VOLTOU_MIN_MS && calado(o.ultima_abertura_em)) return 'voltou';
  return null;
}
async function resumoDoDia(buscar = fetch, agora = new Date()) {
  const m = minutosBonito(agora), dia = diaBonito(agora);
  if (m < 480 || m >= 600) return 0;                                   // das 8h às 10h (se o agendador falhar às 8h, sai depois)
  const env = await lerConfig('resumo_dia_enviado', buscar);
  if (env && env.dia === dia) return 0;
  if (!(await chaveAvisos(buscar))) return 0;
  const g = await gravarConfig('resumo_dia_enviado', { dia }, buscar).catch(() => null);
  if (!g || !g.ok) return 0;
  const desligados = ((await lerConfig('resumo_dia_desligado', buscar)) || {}).usuarios || [];
  const fimDoDia = new Date(`${dia}T23:59:59-04:00`).toISOString();
  const tarefas = await getJson(`${SUPABASE_URL}/rest/v1/tarefas?feita=eq.false&quando=lte.${fimDoDia}&select=responsavel_id,tipo&limit=1000`, buscar);
  const dia24 = new Date(agora - 864e5).toISOString();
  const recentes = await getJson(`${SUPABASE_URL}/rest/v1/orcamentos?or=(ultima_abertura_em.gte.${dia24},escolhida_em.gte.${dia24})&select=conversa_id,criado_em,ultima_abertura_em,aberto_primeira_vez_em,aberturas,escolhida_em&order=criado_em.desc&limit=300`, buscar);
  const porConversa = {}; for (const o of recentes) if (o.conversa_id && !porConversa[o.conversa_id]) porConversa[o.conversa_id] = o;
  const donoQuente = {};
  for (const [cid, o] of Object.entries(porConversa)) {
    const conv = (await getJson(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${cid}&select=ultima_msg_cliente_em`, buscar))[0] || {};
    if (!sinalQuente(o, conv.ultima_msg_cliente_em, +agora)) continue;
    const n = await negocioDaConversa(cid, 'responsavel_id', buscar).catch(() => null);
    if (n && !['res', 'perd'].includes(n.etapa) && n.responsavel_id) donoQuente[n.responsavel_id] = (donoQuente[n.responsavel_id] || 0) + 1;
  }
  let enviados = 0;
  for (const u of await getJson(`${SUPABASE_URL}/rest/v1/usuarios?ativo=eq.true&select=id,nome`, buscar)) {
    if (desligados.includes(u.id)) continue;
    const minhas = tarefas.filter(t => t.responsavel_id === u.id), ret = minhas.filter(t => t.tipo === TIPO_RETOMAR).length, q = donoQuente[u.id] || 0;
    if (!minhas.length && !q) continue;
    const partes = [];
    if (ret) partes.push(ret + (ret === 1 ? ' orçamento para retomar' : ' orçamentos para retomar'));
    if (minhas.length - ret) partes.push((minhas.length - ret) + ((minhas.length - ret) === 1 ? ' tarefa' : ' tarefas'));
    if (q) partes.push(q + (q === 1 ? ' cliente quente 🔥' : ' clientes quentes 🔥'));
    const txt = partes.length > 1 ? partes.slice(0, -1).join(', ') + ' e ' + partes.at(-1) : partes[0];
    enviados += await avisarCelulares([u.id], { titulo: 'Bom dia, ' + String(u.nome || '').split(' ')[0] + '!', corpo: 'Hoje: ' + txt + '.', url: '/caixa', tag: 'resumo-' + dia }, buscar).catch(() => 0);
  }
  return enviados;
}

// ---------- Login da equipe: criar/confirmar no Supabase Auth quem está liberado em "usuarios" ----------
async function prepararLogin(email, buscar = fetch) {
  const r = await buscar(`${SUPABASE_URL}/rest/v1/usuarios?ativo=eq.true&select=email`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
  const lista = r.ok ? await r.json() : [];
  if (!lista.some(u => String(u.email).trim().toLowerCase() === email)) return false;
  const adm = { ...cabecalhosBanco(), Authorization: 'Bearer ' + SUPABASE_KEY };
  const c = await buscar(`${SUPABASE_URL}/auth/v1/admin/users`, { method: 'POST', headers: adm, body: JSON.stringify({ email, email_confirm: true }), signal: AbortSignal.timeout(8000) });
  if (c.ok) { console.log(JSON.stringify({ evento: 'login_criado' })); return true; }
  // Já existe (ex.: criado como convite e ainda não confirmado): confirma
  const l = await buscar(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, { headers: adm, signal: AbortSignal.timeout(8000) });
  const j = l.ok ? await l.json().catch(() => ({})) : {};
  const u = (j.users || []).find(x => String(x.email || '').toLowerCase() === email);
  if (u && !u.email_confirmed_at) {
    await buscar(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, { method: 'PUT', headers: adm, body: JSON.stringify({ email_confirm: true }), signal: AbortSignal.timeout(8000) });
    console.log(JSON.stringify({ evento: 'login_confirmado' }));
  }
  return !!u;
}

// ---------- Cobrança por Pix (Banco do Brasil) e baixa automática ----------
// Prazo: 48 h; 2 h se o check-in for em até 3 dias; nunca depois das 15h do dia do check-in (horário de Bonito).
function prazoCobranca(dataEntrada, agora = new Date()) {
  const checkin = dataEntrada ? new Date(dataEntrada + 'T15:00:00-04:00') : null;
  const curto = checkin && checkin - agora < 3 * 864e5;
  let fim = new Date(agora.getTime() + (curto ? 2 : 48) * 3600e3);
  if (checkin && checkin > agora && fim > checkin) fim = checkin;
  if (fim - agora < 15 * 60e3) fim = new Date(agora.getTime() + 15 * 60e3);
  return fim;
}
let verificandoPix = null, ultimaVerificacaoPix = 0;
// Confere as cobranças ativas no banco: paga → baixa; passou do prazo → vencida. Roda pelo agendador (a cada 2 min) e ao abrir o painel.
function verificarCobrancas(buscar = fetch) {
  if (verificandoPix) return verificandoPix;
  if (Date.now() - ultimaVerificacaoPix < Number(process.env.PIX_INTERVALO_MS || 15000)) return Promise.resolve({ verificadas: 0, pagas: 0, vencidas: 0, cedo: true });
  ultimaVerificacaoPix = Date.now();
  verificandoPix = (async () => {
    const r = await buscar(`${SUPABASE_URL}/rest/v1/cobrancas?situacao=eq.ativa&select=*&order=criado_em&limit=100`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
    const lista = r && r.ok ? await r.json().catch(() => []) : [];
    let pagas = 0, vencidas = 0;
    for (const cob of lista) {
      try {
        const c = await bb.consultar(cob.txid, cob.fonte);
        if (c.status === 'CONCLUIDA' || (c.pagamentos || []).length) { await baixaCobranca(cob, (c.pagamentos || [])[0] || {}, buscar); pagas++; }
        else if (/^REMOVIDA/.test(c.status || '')) await patchBanco('cobrancas', `id=eq.${cob.id}`, { situacao: 'cancelada', atualizado_em: new Date().toISOString() });
        else if (new Date(cob.expira_em) < new Date()) { await cobrancaVencida(cob, buscar); vencidas++; }
      } catch (e) { console.warn(JSON.stringify({ evento: 'pix_consulta', txid: cob.txid, erro: String(e.message || e).slice(0, 200) })); }
    }
    return { verificadas: lista.length, pagas, vencidas };
  })().finally(() => { verificandoPix = null; });
  return verificandoPix;
}
// Pagamento recebido: o Gilberto confirma ao cliente no WhatsApp (e oferece os extras, uma vez) quando o
// automático está ligado e a equipe não assumiu a conversa (dono, 05/10/2026). Senão, fica a tarefa da equipe.
const TEXTO_EXTRAS = { aventuras: 'Aventuras no Rio Formoso: boia cross, arvorismo ou o combo das duas, com guias. As vagas são limitadas, então vale garantir o horário já.',
  momentos: 'Momentos especiais: decoração no quarto para comemorar e massagem para relaxar, no quarto ou à beira do rio. Você escolhe a opção, o dia e o horário.' };
// Depois do pagamento (dono, 06/10/2026): primeiro um texto avisando dos extras, depois os dois links (o do perfil primeiro)
const AGRADECIMENTO = nome => 'Muito obrigado por escolher o Cabanas' + (nome ? ', ' + nome : '') + '! 🌿 Fico à disposição para qualquer dúvida até a sua chegada. Se quiser, te passo dicas do que trazer na mala para a época da viagem. E como vocês estão planejando vir para Bonito: de carro ou de avião?';
const AVISO_EXTRAS = 'E para deixar a sua estadia ainda melhor, temos alguns serviços extras que você já pode reservar. Eles vão na conta da hospedagem e são acertados no check-out. Separei as opções aqui embaixo 👇';
// Cartão do link de extras no WhatsApp: foto de um produto, texto e o botão "Ver as opções"
async function enviarCartaoVitrine(conv, para, tema, v, texto, autor, buscar = fetch) {
  await atualizarFotos().catch(() => {});
  const prods = (((await catalogo(buscar).catch(() => null)) || {}).produtos || []).filter(p => p.vitrine === tema);
  const foto = prods.map(fotosDoProduto).flat()[0] || null;
  const interactive = { type: 'cta_url', ...(foto ? { header: { type: 'image', image: { link: `${URL_PUBLICA}/fotos/${foto}` } } } : { header: { type: 'text', text: vitrine.TEMAS[tema].nome } }),
    body: { text: texto }, footer: { text: produtos.RODAPE_OFERTA }, action: { name: 'cta_url', parameters: { display_text: vitrine.TEMAS[tema].botao, url: v.link } } };
  const r = await chamarMeta(`${encodeURIComponent(conv.numero_id)}/messages`, { messaging_product: 'whatsapp', recipient_type: 'individual', to: para, type: 'interactive', interactive }, buscar);
  if (!r.ok || !r.json.messages || !r.json.messages[0]) {
    const e = r.json.error || {};
    ultimoErroMeta = { quando: new Date().toISOString(), http: r.status, codigo: e.code || null, mensagem: String(e.message || '').slice(0, 200) };
    throw new ErroEnvio(502, 'A Meta não aceitou a mensagem' + (e.code ? ` (código ${e.code})` : '') + '. O link foi criado: ' + v.link);
  }
  const visto = texto + '\n\n[ ' + vitrine.TEMAS[tema].botao + ' ] ' + v.link;
  const wamid = r.json.messages[0].id;
  const id = foto
    ? await rpc('registrar_saida_midia', { p_conversa: conv.id, p_wamid: wamid, p_tipo: 'image', p_legenda: visto, p_caminho: 'biblioteca/' + foto, p_mime: 'image/jpeg', p_nome: null, p_autor: autor }, buscar)
    : await rpc('registrar_saida_whatsapp', { p_conversa: conv.id, p_wamid: wamid, p_corpo: visto, p_autor: autor }, buscar);
  return { id, tipo: foto ? 'image' : 'text', arquivo: foto, corpo: visto, enviada_em: new Date().toISOString() };
}
// pelaEquipe: a equipe lançou o pagamento no Silbeck e clicou em "Já lancei no Silbeck" (dono, 07/10/2026):
// manda a mesma sequência mesmo com o Gilberto pausado ou desligado
async function confirmarAoCliente(cob, res, confirmada, valor, buscar = fetch, { pelaEquipe = false } = {}) {
  if (!cob.conversa_id || !WA_TOKEN || (!pelaEquipe && !(await gilbertoAutoLigado(buscar)))) return null;
  const c = (await getJson(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${cob.conversa_id}&select=status,gilberto_pausado,contato:contatos(nome)`, buscar))[0];
  if (!c || (!pelaEquipe && c.gilberto_pausado !== false)) return null; // a equipe está atendendo: ela confirma
  const primeiro = String((res && res.titular) || (c.contato && c.contato.nome) || '').trim().split(/\s+/)[0];
  const ola = (pelaEquipe ? 'Tudo certo' : 'Pagamento recebido') + (primeiro ? ', ' + primeiro : '') + '! ✅';
  let texto;
  if (res && confirmada) {
    const n = Math.round((new Date(res.data_saida) - new Date(res.data_entrada)) / 864e5);
    const resto = Math.round((Number(res.valor_total) - valor) * 100) / 100;
    texto = [ola + ' Sua reserva no Hotel Cabanas está confirmada:', '',
      '🏡 *' + res.acomodacao + '*', '📅 *' + orcamento.periodo(res.data_entrada, res.data_saida) + '* (' + n + (n > 1 ? ' noites)' : ' noite)'),
      '👥 ' + orcamento.resumoGrupo({ adultos: res.adultos, idades_criancas: res.criancas_idades || [] }), '🔖 Reserva nº ' + res.silbeck_id,
      '💳 Valor pago: *' + produtos.brl(valor) + '*' + (resto >= 1 ? '\nO restante, *' + produtos.brl(resto) + '*, é pago no check-out.' : ''), '',
      'Check-in a partir das 15h e check-out até as 13h (a estrutura fica à disposição antes e depois). Qualquer dúvida, é só chamar aqui 🌿',
      ...(res.fonte === 'simulador' ? ['', '⚠ Teste: reserva do SIMULADOR do Silbeck.'] : [])].join('\n');
  } else texto = ola + ' Obrigado. A equipe está finalizando a confirmação da sua reserva no sistema e te manda os detalhes em instantes 🌿';
  try {
    const { conv, para, wamidCliente } = await carregarConversaParaEnvio(cob.conversa_id, buscar);
    // Ritmo de pessoa (dono, 07/10/2026): antes de cada mensagem, o tempo de o cliente ler a anterior e o "digitando…"
    let anterior = '';
    const digitar = async proxima => {
      if (anterior) await esperar(tempoLeitura(anterior));
      await mostrarDigitando(conv, wamidCliente, buscar);
      await esperar(tempoDigitacao(proxima));
      anterior = proxima;
    };
    await digitar(texto);
    await enviarTexto(conv, para, texto, 'gilberto', buscar);
    let extras = null;
    let voucherEnviado = false;
    if (res && confirmada) { // voucher em PDF logo abaixo da confirmação (dono, 07/10/2026)
      try {
        const pdf = await voucher.gerarVoucher(res, { pago: valor, pagoEm: cob.pago_em || new Date() });
        await esperar(tempoLeitura(texto) / 2);
        await enviarArquivo(conv, para, pdf, 'application/pdf', 'document', voucher.nomeDoArquivo(res), 'Seu voucher de confirmação 📄', 'gilberto', buscar);
        voucherEnviado = true; anterior = 'Seu voucher de confirmação';
      } catch (e) { console.warn(JSON.stringify({ evento: 'voucher_falhou', erro: String(e.message || e).slice(0, 200) })); }
    }
    if (res && confirmada) { // extras uma vez só: aviso em texto e os links de aventuras e de momentos especiais
      const ja = await ofertasDaConversa(cob.conversa_id, buscar).catch(() => [{}]);
      const neg = await negocioDaConversa(cob.conversa_id, 'id,perfil', buscar).catch(() => null);
      const casal = ['Casal', '55+'].includes(neg && neg.perfil) || (Number(res.adultos) === 2 && !(res.criancas_idades || []).length);
      const cat = await catalogo(buscar).catch(() => null);
      const temas = (casal ? ['momentos', 'aventuras'] : ['aventuras', 'momentos']).filter(t => ((cat || {}).produtos || []).some(p => p.vitrine === t));
      if (!ja.length && temas.length) {
        await digitar(AVISO_EXTRAS);
        await enviarTexto(conv, para, AVISO_EXTRAS, 'gilberto', buscar);
        const enviados = [];
        for (const tema of temas) {
          const v = await criarVitrine(cob.conversa_id, tema, { por: 'gilberto', enviada: true }, buscar);
          await digitar(TEXTO_EXTRAS[tema]);
          await enviarCartaoVitrine(conv, para, tema, v, TEXTO_EXTRAS[tema], 'gilberto', buscar)
            .catch(() => enviarTexto(conv, para, TEXTO_EXTRAS[tema] + '\n' + v.link, 'gilberto', buscar));
          enviados.push(vitrine.TEMAS[tema].nome);
        }
        extras = enviados.join(' e ');
      }
      // Fecho da venda (dono, 07/10/2026): agradecimento, à disposição, dicas de viagem e como vão vir (o Gilberto oferece a rota)
      await digitar(AGRADECIMENTO(primeiro));
      await enviarTexto(conv, para, AGRADECIMENTO(primeiro), 'gilberto', buscar).catch(() => {});
    }
    console.log(JSON.stringify({ evento: 'confirmacao_enviada', confirmada: !!confirmada, extras: !!extras, voucher: voucherEnviado }));
    return { enviada: true, extras, voucher: voucherEnviado };
  } catch (e) {
    console.warn(JSON.stringify({ evento: 'confirmacao_falhou', erro: String(e.message || e).slice(0, 200) }));
    return null; // janela de 24 h fechada ou erro de envio: a tarefa da equipe continua valendo
  }
}
// Divide um pagamento entre os itens da reserva (proporcional ao valor de cada acomodação; o último leva o arredondamento)
function partesDoPagamento(res, valor) {
  const itens = Array.isArray(res.itens) && res.itens.length ? res.itens : [{ item_id: res.silbeck_item_id, nome: res.acomodacao, valor_total: Number(res.valor_total) }];
  const total = itens.reduce((s, i) => s + Number(i.valor_total || 0), 0);
  let resto = Math.round(valor * 100);
  return itens.map((i, k) => {
    const centavos = k === itens.length - 1 ? resto : Math.round(valor * 100 * (total ? Number(i.valor_total || 0) / total : 1 / itens.length));
    resto -= centavos;
    return { item_id: i.item_id || null, nome: i.nome || i.codigo, valor: centavos / 100 };
  });
}
const DEPOIS_DE_LANCAR = 'Depois de conferir e lançar no Silbeck, clique em "Já lancei no Silbeck" na tarefa "Confirmar a reserva": o Gilberto manda ao cliente a confirmação, os extras e o agradecimento.';
async function baixaCobranca(cob, pg, buscar = fetch) {
  const valor = pg.valor || Number(cob.valor);
  await patchBanco('cobrancas', `id=eq.${cob.id}`, { situacao: 'paga', valor_pago: valor, pago_em: pg.horario || new Date().toISOString(), e2e_id: pg.e2e || null, pagador: pg.pagador || null, atualizado_em: new Date().toISOString() });
  const txt = 'Pagamento recebido por Pix: ' + produtos.brl(valor) + ' (' + (cob.descricao || cob.tipo) + ')' + (pg.pagador ? ' · ' + pg.pagador : '');
  // Reserva criada pelo CRM: lança o adiantamento no Silbeck (Pix = tipo 8) e a reserva confirma sozinha
  let silb = 'Lançar o adiantamento e confirmar a reserva no Silbeck, e mandar a confirmação ao cliente.';
  const res = cob.reserva_id ? (await getJson(`${SUPABASE_URL}/rest/v1/reservas?id=eq.${cob.reserva_id}&select=*`, buscar))[0] : null;
  // Combinação: um item por acomodação; cada um recebe a sua parte do pagamento (proporcional ao valor dele)
  const partes = res ? partesDoPagamento(res, valor) : [];
  let confirmada = false;
  if (res && partes.length && partes.every(p => p.item_id)) {
    const feitas = [];
    try {
      for (const p of partes) { await silbeck.lancarAdiantamento({ item_id: p.item_id, valor: p.valor, observacao: 'Pix BB ' + cob.txid + (pg.e2e ? ' · ' + pg.e2e : '') + (partes.length > 1 ? ' · ' + p.nome : '') }, buscar); feitas.push(p); }
      await patchBanco('reservas', `id=eq.${res.id}`, { situacao: 'confirmada', confirmada_em: new Date().toISOString(), atualizado_em: new Date().toISOString() }).catch(() => {});
      confirmada = true;
      silb = `Pagamento lançado no Silbeck${partes.length > 1 ? ' (dividido entre as ' + partes.length + ' acomodações: ' + partes.map(p => p.nome + ' ' + produtos.brl(p.valor)).join(', ') + ')' : ''} e reserva ${res.silbeck_id} confirmada automaticamente. Mandar a confirmação ao cliente.`;
    } catch (e) {
      const falta = partes.filter(p => !feitas.includes(p));
      silb = `O CRM NÃO conseguiu lançar ${feitas.length ? 'todo o pagamento' : 'o pagamento'} no Silbeck (${String(e.message || e).slice(0, 120)}): lançar o adiantamento na reserva ${res.silbeck_id}${partes.length > 1 ? ' (falta: ' + falta.map(p => p.nome + ' ' + produtos.brl(p.valor)).join(', ') + ')' : ''} e mandar a confirmação ao cliente.`;
    }
  } else if (res && partes.length > 1) silb = `Reserva ${res.silbeck_id} com ${partes.length} acomodações: lançar o adiantamento no Silbeck dividido entre elas (${partes.map(p => p.nome + ' ' + produtos.brl(p.valor)).join(', ')}) e mandar a confirmação ao cliente.`;
  // Card em "Reserva concluída" antes de avisar o cliente (o Gilberto já sabe que a reserva está paga)
  if (cob.negocio_id) await patchBanco('negocios', `id=eq.${cob.negocio_id}`, { etapa: 'res', etapa_desde: new Date().toISOString(), atualizado_em: new Date().toISOString() }).catch(() => {});
  const aviso = await confirmarAoCliente(cob, res, confirmada, valor, buscar);
  if (aviso && confirmada) silb = silb.replace(/ e mandar a confirmação ao cliente\.| Mandar a confirmação ao cliente\./, '.') + ' O Gilberto já mandou a confirmação ao cliente no WhatsApp' + (aviso.extras ? ' e o link de extras (' + aviso.extras + ')' : '') + '.';
  else if (res) silb = silb.replace(/ e mandar a confirmação ao cliente\.| Mandar a confirmação ao cliente\./, '.') + (aviso ? ' O Gilberto avisou o cliente que a equipe está finalizando.' : '') + ' ' + DEPOIS_DE_LANCAR;
  if (cob.negocio_id) {
    await eventoNegocio(cob.negocio_id, txt + ' · card em Reserva concluída' + (aviso ? ' · confirmação enviada pelo Gilberto' : ''), 'CRM', buscar);
    await buscar(`${SUPABASE_URL}/rest/v1/tarefas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ negocio_id: cob.negocio_id, responsavel_id: cob.criado_por || null, criado_por: 'CRM', tipo: 'Confirmar a reserva', descricao: txt + '. ' + silb, quando: new Date().toISOString() }) }).catch(() => null);
  }
  await criarAlerta({ tipo: 'pagamento_recebido', titulo: 'Pagamento recebido', info: txt + (aviso && confirmada ? '. O Gilberto já confirmou ao cliente' + (aviso.extras ? ' e ofereceu os extras.' : '.') : res ? '. ' + silb : '. Mande a confirmação ao cliente e ofereça os extras: abra a conversa (aviso 🎉).'), conversa_id: cob.conversa_id, negocio_id: cob.negocio_id, cobranca_id: cob.id }, buscar);
}
async function cobrancaVencida(cob, buscar = fetch) {
  await patchBanco('cobrancas', `id=eq.${cob.id}`, { situacao: 'expirada', atualizado_em: new Date().toISOString() });
  await bb.cancelar(cob.txid, cob.fonte).catch(() => {});
  const res = cob.reserva_id ? (await getJson(`${SUPABASE_URL}/rest/v1/reservas?id=eq.${cob.reserva_id}&select=silbeck_id,situacao`, buscar))[0] : null;
  const txt = 'Pix de ' + produtos.brl(cob.valor) + ' (' + (cob.descricao || cob.tipo) + ') venceu sem pagamento' + (res && res.situacao === 'nao_confirmada' ? '. A reserva ' + res.silbeck_id + ' continua NÃO CONFIRMADA no Silbeck' : '');
  if (cob.negocio_id) await eventoNegocio(cob.negocio_id, txt, 'CRM', buscar);
  await criarAlerta({ tipo: 'cobranca_vencida', titulo: 'Cobrança vencida', info: txt + '. Falar com o cliente: mandar um novo Pix ou ' + (res && res.situacao === 'nao_confirmada' ? 'cancelar a reserva no Silbeck (a API não cancela).' : 'liberar a vaga.'), conversa_id: cob.conversa_id, negocio_id: cob.negocio_id, cobranca_id: cob.id }, buscar);
}

// Fecha os alertas de uma venda (e conclui a tarefa de lançar ligada a eles)
async function resolverAlertasDaVenda(venda, tipos, por, buscar = fetch) {
  const r = await buscar(`${SUPABASE_URL}/rest/v1/alertas?venda_id=eq.${venda}&situacao=eq.aberto&select=id,tipo,tarefa_id`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const lista = r && r.ok ? (await r.json().catch(() => [])).filter(a => tipos.includes(a.tipo)) : [];
  for (const a of lista) {
    await buscar(`${SUPABASE_URL}/rest/v1/alertas?id=eq.${a.id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ situacao: 'resolvido', resolvido_por: por, resolvido_em: new Date().toISOString() }) }).catch(() => null);
    if (a.tarefa_id && a.tipo === 'lancar_conta') await buscar(`${SUPABASE_URL}/rest/v1/tarefas?id=eq.${a.tarefa_id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ feita: true, feita_em: new Date().toISOString() }) }).catch(() => null);
  }
}
// WhatsApp no formato do banco (+55DDDnúmero). Aceita "67 99999-0000", "(67) 9999-0000", "+55 67…"
function whatsE164(t) {
  let d = String(t || '').replace(/\D/g, '');
  if (/^0\d{10,11}$/.test(d)) d = d.slice(1);
  if (/^[1-9]{2}9?\d{8}$/.test(d)) d = '55' + d;
  if (!/^55[1-9]{2}9?\d{8}$/.test(d)) throw new ErroEnvio(400, 'WhatsApp inválido: use DDD + número (ex.: 67 99999-0000).');
  return '+' + d;
}
function emailOk(e) {
  const v = String(e || '').trim().slice(0, 160);
  if (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) throw new ErroEnvio(400, 'E-mail inválido.');
  return v || null;
}
// De quem é este WhatsApp (o mesmo número com e sem o 9 conta como igual)
async function donoDoWhatsapp(tel, buscar = fetch) {
  const d = tel.replace(/\D/g, ''), sem9 = d.length === 13 ? d.slice(0, 4) + d.slice(5) : d, com9 = d.length === 12 ? d.slice(0, 4) + '9' + d.slice(4) : d;
  const vals = [...new Set([d, sem9, com9])].map(x => '%2B' + x).join(',');
  const r = await buscar(`${SUPABASE_URL}/rest/v1/contato_identificadores?tipo=eq.whatsapp&valor=in.(${vals})&select=contato_id,contato:contatos(nome)`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const x = r && r.ok ? (await r.json().catch(() => []))[0] : null;
  return x ? { contato_id: x.contato_id, nome: x.contato && x.contato.nome } : null;
}
const uuidOk = v => /^[0-9a-f-]{36}$/i.test(String(v || ''));
async function produtoPorCodigo(codigo, buscar = fetch) {
  const cod = String(codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cod) throw new ErroEnvio(400, 'Escolha o produto.');
  const r = await buscar(`${SUPABASE_URL}/rest/v1/produtos?codigo=eq.${cod}&select=*`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
  const p = r.ok ? (await r.json())[0] : null;
  if (!p) throw new ErroEnvio(404, 'Produto não encontrado.');
  return p;
}
async function ofertasDaConversa(conversa, buscar = fetch) {
  const [r, rv] = await Promise.all([
    buscar(`${SUPABASE_URL}/rest/v1/ofertas?conversa_id=eq.${conversa}&select=id,produto_codigo,produto_nome,por,situacao,criado_em&order=criado_em.desc&limit=10`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null),
    buscar(`${SUPABASE_URL}/rest/v1/vitrines?conversa_id=eq.${conversa}&enviada=eq.true&select=id,tema,por,aberturas,pedido_em,criado_em&order=criado_em.desc&limit=10`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null),
  ]);
  const ofs = r && r.ok ? await r.json().catch(() => []) : [];
  // Os links de extras enviados contam como oferta (regra: 1 oferta por conversa)
  const vts = rv && rv.ok ? (await rv.json().catch(() => [])).map(v => ({ id: v.id, vitrine: v.tema, produto_nome: 'Link de extras "' + vitrine.TEMAS[v.tema].nome + '"' + (v.pedido_em ? '' : v.aberturas ? ' (aberto ' + v.aberturas + 'x)' : ' (ainda não aberto)'),
    por: v.por, situacao: v.pedido_em ? 'aceito' : 'oferecido', criado_em: v.criado_em })) : [];
  return [...ofs, ...vts].sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
}
// Fotos de um produto na página de extras: a representativa + as da(s) categoria(s) do Banco de fotos
function fotosDoProduto(p) {
  if (Array.isArray(p.fotos) && p.fotos.some(fotoAtiva)) return p.fotos.filter(fotoAtiva); // escolhidas na tela Produtos
  const bib = orcamento.biblioteca();
  const grupos = String(p.grupo_fotos || '').split(',').filter(Boolean);
  const lista = [p.foto && fotoAtiva(p.foto) ? p.foto : null, ...grupos.flatMap(g => ((bib.find(x => x.grupo === g) || {}).fotos || []).map(f => f.arquivo))].filter(Boolean);
  return [...new Set(lista)];
}
// Cria o link de extras de uma conversa (token de 128 bits)
async function criarVitrine(conversa, tema, { por, criado_por, enviada = true }, buscar = fetch) {
  if (!vitrine.TEMAS[tema]) throw new ErroEnvio(400, 'Tema inválido.');
  const negocio = await negocioDaConversa(conversa, 'id', buscar);
  const token = orcamento.novoToken();
  const r = await buscar(`${SUPABASE_URL}/rest/v1/vitrines`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, signal: AbortSignal.timeout(5000),
    body: JSON.stringify({ token, tema, conversa_id: conversa, negocio_id: negocio, por, criado_por: criado_por || null, enviada }) });
  if (!r.ok) throw new ErroEnvio(r.status === 404 ? 503 : 502, 'Não deu para criar o link (o banco precisa da migração 014?).');
  if (negocio && enviada) await eventoNegocio(negocio, 'Link de extras "' + vitrine.TEMAS[tema].nome + '" enviado', criado_por || 'gilberto', buscar);
  return { ...(await r.json())[0], link: `${URL_PUBLICA}/e/${token}` };
}
async function lerVitrine(token, buscar = fetch) {
  if (!orcamento.tokenValido(token) || !bancoLigado()) return null;
  const r = await buscar(`${SUPABASE_URL}/rest/v1/vitrines?token=eq.${token}&select=*`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
  return r.ok ? (await r.json())[0] || null : null;
}
// Estadia do cliente (para os dias e as pessoas na página): último orçamento, ou o negócio
async function estadiaDaConversa(conversa, buscar = fetch) {
  const [ro, rn, rc] = await Promise.all([
    buscar(`${SUPABASE_URL}/rest/v1/orcamentos?conversa_id=eq.${conversa}&select=adultos,criancas_idades,data_entrada,data_saida,primeiro_nome,numero_whatsapp&order=criado_em.desc&limit=1`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null),
    buscar(`${SUPABASE_URL}/rest/v1/negocios?conversa_id=eq.${conversa}&select=data_entrada,data_saida,etapa&order=criado_em.desc&limit=1`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null),
    buscar(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${conversa}&select=numero_id,contato:contatos(nome)`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null),
  ]);
  const o = (ro && ro.ok ? (await ro.json().catch(() => []))[0] : null) || {};
  const n = (rn && rn.ok ? (await rn.json().catch(() => []))[0] : null) || {};
  const c = (rc && rc.ok ? (await rc.json().catch(() => []))[0] : null) || {};
  return { adultos: o.adultos || null, criancas_idades: o.criancas_idades || [], data_entrada: n.data_entrada || o.data_entrada || null, data_saida: n.data_saida || o.data_saida || null,
    primeiro_nome: (c.contato && c.contato.nome) || o.primeiro_nome || null, numero_whatsapp: o.numero_whatsapp || null, numero_id: c.numero_id || null };
}
// Negócio em andamento da conversa (o mais recente). campos = 'id' devolve só o id.
async function negocioDaConversa(conversa, campos = 'id', buscar = fetch) {
  const r = await buscar(`${SUPABASE_URL}/rest/v1/negocios?conversa_id=eq.${conversa}&select=${campos},etapa&order=criado_em.desc&limit=5`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const lista = r && r.ok ? await r.json().catch(() => []) : [];
  const n = lista.find(x => !['res', 'perd'].includes(x.etapa)) || lista[0] || null;
  return campos === 'id' ? (n ? n.id : null) : n;
}
const eventoNegocio = (negocio, texto, por, buscar = fetch) => buscar(`${SUPABASE_URL}/rest/v1/negocio_eventos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' },
  body: JSON.stringify({ negocio_id: negocio, texto: texto.slice(0, 300), por }), signal: AbortSignal.timeout(5000) }).catch(() => null);
const API_EQUIPE = {
  // Lista da equipe (para o "responsável" da conversa)
  // Avisos no celular: chave pública (para o aparelho se inscrever), inscrever, cancelar e testar
  'GET /api/push-chave': async () => { const c = await chaveAvisos(); return { ok: true, chave: c ? c.publicaB64 : null }; },
  'POST /api/push-inscrever': async (corpo, eu) => {
    const b64 = /^[A-Za-z0-9_-]+={0,2}$/;
    if (!push.endpointOk(corpo.endpoint)) throw new ErroEnvio(400, 'Este navegador não é compatível com os avisos.');
    if (!b64.test(corpo.p256dh || '') || String(corpo.p256dh).length > 120 || !b64.test(corpo.auth || '') || String(corpo.auth).length > 40) throw new ErroEnvio(400, 'Inscrição inválida.');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/push_inscricoes?on_conflict=endpoint`, { method: 'POST', signal: AbortSignal.timeout(5000),
      headers: { ...cabecalhosBanco(), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ usuario_id: eu.id, endpoint: corpo.endpoint, p256dh: corpo.p256dh, auth: corpo.auth, aparelho: String(corpo.aparelho || '').slice(0, 60) || null }) });
    if (!r.ok) throw new ErroEnvio(r.status === 404 || r.status === 400 ? 400 : 502, r.status === 404 || r.status === 400 ? 'Falta rodar a migração 019 no Supabase.' : 'Não deu para salvar agora.');
    return { ok: true };
  },
  'POST /api/push-cancelar': async (corpo, eu) => {
    if (!push.endpointOk(corpo.endpoint)) return { ok: true };
    await fetch(`${SUPABASE_URL}/rest/v1/push_inscricoes?usuario_id=eq.${eu.id}&endpoint=eq.${encodeURIComponent(corpo.endpoint)}`, { method: 'DELETE', headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
    return { ok: true };
  },
  'POST /api/push-teste': async (corpo, eu) => {
    if (!(await chaveAvisos())) throw new ErroEnvio(503, 'Os avisos no celular ainda não foram ligados no servidor.');
    const enviados = await avisarCelulares([eu.id], { titulo: 'CRM Cabanas', corpo: 'Teste: os avisos estão chegando neste aparelho ✓', url: '/caixa', tag: 'teste' });
    return { ok: true, enviados };
  },
  'POST /api/conectar-aparelho': async (corpo, eu) => {
    if (!eu.email) throw new ErroEnvio(400, 'Entre de novo e tente outra vez.');
    return { ok: true, ...novoCodigoConexao(eu.email) };
  },
  'GET /api/equipe': async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?ativo=eq.true&select=id,nome,papel&order=nome`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    return { ok: true, equipe: r.ok ? await r.json() : [] };
  },
  // Números de WhatsApp do hotel ligados ao CRM (para escolher por onde enviar)
  'GET /api/numeros': async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/conversas?canal=eq.wa&select=numero_id&limit=1000`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    const ids = [...new Set([...(r.ok ? (await r.json()).map(x => x.numero_id) : []), ...String(process.env.WA_NUMEROS || '').split(',').map(x => x.trim())].filter(x => /^\d{1,25}$/.test(x)))];
    return { ok: true, numeros: await Promise.all(ids.map(async id => ({ id, numero: await numeroWhatsapp(id, fetch).catch(() => null) }))) };
  },
  // Modelos aprovados (e em análise) da conta do número
  'GET /api/modelos': async (corpo, eu, url) => {
    const id = String(url.searchParams.get('numero_id') || '');
    if (!/^\d{1,25}$/.test(id)) throw new ErroEnvio(400, 'Número inválido.');
    if (!WA_TOKEN) throw new ErroEnvio(503, 'O WhatsApp ainda não está configurado.');
    return { ok: true, modelos: await modelosDoNumero(id) };
  },
  // Cadastrar modelo novo: vai para a análise da Meta (aprovação costuma levar de minutos a 24 h)
  'POST /api/modelo': async corpo => {
    const id = String(corpo.numero_id || '');
    if (!/^\d{1,25}$/.test(id)) throw new ErroEnvio(400, 'Número inválido.');
    const nome = String(corpo.nome || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
    if (!nome) throw new ErroEnvio(400, 'Dê um nome ao modelo.');
    // Modelos do próprio CRM: basta o nome; texto, botões e exemplos vêm daqui
    const padrao = [MODELO_EXTRA, MODELO_MASSAGEM, MODELO_OPCOES, MODELO_AVISO_PARCEIRA].find(m => m.nome === nome);
    if (padrao) {
      const botoes = padrao.botoes ? [{ type: 'BUTTONS', buttons: padrao.botoes.map(text => ({ type: 'QUICK_REPLY', text })) }]
        : padrao.link ? [{ type: 'BUTTONS', buttons: [{ type: 'URL', text: padrao.link.texto, url: URL_PUBLICA + padrao.link.caminho + '{{1}}', example: [URL_PUBLICA + padrao.link.caminho + padrao.link.exemplo] }] }] : [];
      const rp = await chamarMeta(`${await wabaDoNumero(id)}/message_templates`, { name: nome, language: 'pt_BR', category: padrao.categoria,
        components: [{ type: 'BODY', text: padrao.texto, example: { body_text: [padrao.exemplos] } }, ...botoes] }, fetch);
      if (!rp.ok) ultimoErroMeta = { quando: new Date().toISOString(), http: rp.status, codigo: (rp.json.error || {}).code || null, mensagem: String((rp.json.error || {}).error_user_msg || (rp.json.error || {}).message || '').slice(0, 200) };
      if (!rp.ok) throw new ErroEnvio(rp.status === 400 ? 400 : 502, 'A Meta recusou o modelo: ' + String((rp.json.error || {}).error_user_msg || (rp.json.error || {}).message || rp.status).slice(0, 200));
      return { ok: true, nome, status: rp.json.status || 'PENDING', padrao: true };
    }
    if (!['UTILITY', 'MARKETING'].includes(corpo.categoria)) throw new ErroEnvio(400, 'Categoria inválida.');
    const texto = String(corpo.texto || '').trim().slice(0, 1024);
    if (texto.length < 10) throw new ErroEnvio(400, 'Escreva o texto do modelo.');
    const vs = varsDe(texto);
    if (vs.some((n, i) => n !== i + 1)) throw new ErroEnvio(400, 'As variáveis precisam ser {{1}}, {{2}}… em ordem.');
    const exemplos = vs.map((n, i) => String((corpo.exemplos || [])[i] || (nome === MODELO_EXTRA.nome ? MODELO_EXTRA.exemplos : ['Ana', 'sábado', '14/11'])[i] || 'exemplo').slice(0, 60));
    const waba = await wabaDoNumero(id);
    const r = await chamarMeta(`${waba}/message_templates`, { name: nome, language: 'pt_BR', category: corpo.categoria,
      components: [{ type: 'BODY', text: texto, ...(vs.length ? { example: { body_text: [exemplos] } } : {}) }] }, fetch);
    if (!r.ok) throw new ErroEnvio(r.status === 400 ? 400 : 502, 'A Meta recusou o modelo: ' + String((r.json.error || {}).error_user_msg || (r.json.error || {}).message || r.status).slice(0, 200));
    return { ok: true, nome, status: r.json.status || 'PENDING' };
  },
  // Iniciar conversa (contato novo, ou fora da janela de 24 h) com um modelo aprovado
  'POST /api/iniciar-conversa': async (corpo, eu) => {
    if (!WA_TOKEN) throw new ErroEnvio(503, 'O WhatsApp ainda não está configurado.');
    let conv = null, contatoId = null, tel = null;
    if (uuidOk(corpo.conversa_id)) {
      const c = await fetch(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${corpo.conversa_id}&select=id,contato_id,numero_id,canal,contato:contatos(contato_identificadores(tipo,valor))`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
      conv = c.ok ? (await c.json())[0] : null;
      if (!conv) throw new ErroEnvio(404, 'Conversa não encontrada.');
      const wa = ((conv.contato || {}).contato_identificadores || []).find(i => i.tipo === 'whatsapp');
      if (!wa) throw new ErroEnvio(400, 'Este contato não tem WhatsApp.');
      tel = wa.valor; contatoId = conv.contato_id;
    } else {
      tel = whatsE164(corpo.telefone);
      const numeroId = String(corpo.numero_id || '');
      if (!/^\d{1,25}$/.test(numeroId)) throw new ErroEnvio(400, 'Escolha por qual número enviar.');
      const dono = await donoDoWhatsapp(tel);
      const nome = String(corpo.nome || '').trim().slice(0, 120) || null;
      if (dono) {
        contatoId = dono.contato_id;
        if (nome && !dono.nome) await patchBanco('contatos', `id=eq.${contatoId}`, { nome });
      } else {
        const ct = await fetch(`${SUPABASE_URL}/rest/v1/contatos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, body: JSON.stringify({ nome }), signal: AbortSignal.timeout(5000) });
        if (!ct.ok) throw new ErroEnvio(502, 'Não deu para criar o contato.');
        contatoId = (await ct.json())[0].id;
        await fetch(`${SUPABASE_URL}/rest/v1/contato_identificadores`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ contato_id: contatoId, tipo: 'whatsapp', valor: tel }), signal: AbortSignal.timeout(5000) });
      }
      const ex = await fetch(`${SUPABASE_URL}/rest/v1/conversas?contato_id=eq.${contatoId}&canal=eq.wa&numero_id=eq.${numeroId}&select=id,contato_id,numero_id,canal`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
      conv = ex.ok ? (await ex.json())[0] : null;
      if (!conv) {
        const nc = await fetch(`${SUPABASE_URL}/rest/v1/conversas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, body: JSON.stringify({ contato_id: contatoId, canal: 'wa', numero_id: numeroId, atribuida_a: eu.id, ultima_msg_em: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
        if (!nc.ok) throw new ErroEnvio(502, 'Não deu para abrir a conversa.');
        conv = (await nc.json())[0];
      }
    }
    // O modelo precisa existir e estar aprovado na conta deste número
    const modelos = await modelosDoNumero(conv.numero_id);
    const m = modelos.find(x => x.nome === corpo.modelo && (!corpo.idioma || x.idioma === corpo.idioma));
    if (!m) throw new ErroEnvio(400, 'Modelo não encontrado.');
    if (m.status !== 'APPROVED') throw new ErroEnvio(400, 'Este modelo ainda não foi aprovado pela Meta (situação: ' + m.status + ').');
    if (!m.suportado) throw new ErroEnvio(400, 'Este modelo tem imagem ou botão com variável: ainda não dá para enviar pelo CRM.');
    const vs = (Array.isArray(corpo.variaveis) ? corpo.variaveis : []).slice(0, m.variaveis).map(v => String(v || '').trim().slice(0, 200));
    if (vs.length < m.variaveis || vs.some(v => !v)) throw new ErroEnvio(400, 'Preencha todas as variáveis do modelo.');
    const r = await chamarMeta(`${encodeURIComponent(conv.numero_id)}/messages`, { messaging_product: 'whatsapp', recipient_type: 'individual', to: numeroParaEnvio(tel), type: 'template',
      template: { name: m.nome, language: { code: m.idioma }, ...(vs.length ? { components: [{ type: 'body', parameters: vs.map(text => ({ type: 'text', text })) }] } : {}) } }, fetch);
    if (!r.ok || !r.json.messages || !r.json.messages[0]) {
      const e = r.json.error || {};
      ultimoErroMeta = { quando: new Date().toISOString(), http: r.status, codigo: e.code || null, mensagem: String(e.message || '').slice(0, 200) };
      throw new ErroEnvio(502, 'A Meta não aceitou a mensagem' + (e.code ? ` (código ${e.code})` : '') + (e.message ? ': ' + String(e.message).slice(0, 120) : '') + '.');
    }
    const texto = [m.cabecalho, preencher(m.corpo, vs), m.rodape].filter(Boolean).join('\n\n');
    await rpc('registrar_saida_whatsapp', { p_conversa: conv.id, p_wamid: r.json.messages[0].id, p_corpo: texto, p_autor: eu.id });
    return { ok: true, conversa_id: conv.id };
  },
  // Contato do lead (nome, WhatsApp e e-mail): completar quem chegou pelo Instagram/Facebook, telefone ou balcão
  'POST /api/contato': async (corpo, eu) => {
    let contatoId = null, negocio = null;
    if (uuidOk(corpo.negocio_id)) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/negocios?id=eq.${corpo.negocio_id}&select=id,contato_id`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
      const n = r.ok ? (await r.json())[0] : null;
      if (n) { contatoId = n.contato_id; negocio = n.id; }
    } else if (uuidOk(corpo.conversa_id)) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${corpo.conversa_id}&select=contato_id`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
      contatoId = r.ok ? ((await r.json())[0] || {}).contato_id : null;
      negocio = await negocioDaConversa(corpo.conversa_id);
    }
    if (!contatoId) throw new ErroEnvio(404, 'Lead não encontrado.');
    const ficha = {}, feito = [];
    if (corpo.nome !== undefined) { const n = String(corpo.nome || '').trim().slice(0, 120); if (!n) throw new ErroEnvio(400, 'O nome não pode ficar vazio.'); ficha.nome = n; feito.push('nome'); }
    if (corpo.email !== undefined) { ficha.email = emailOk(corpo.email); feito.push('e-mail'); }
    if (Object.keys(ficha).length) await patchBanco('contatos', `id=eq.${contatoId}`, ficha);
    if (corpo.telefone !== undefined) {
      const tel = corpo.telefone ? whatsE164(corpo.telefone) : null;
      const r = await fetch(`${SUPABASE_URL}/rest/v1/contato_identificadores?contato_id=eq.${contatoId}&tipo=eq.whatsapp&select=id,valor`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
      const atual = r.ok ? (await r.json())[0] : null;
      if (tel && (!atual || atual.valor !== tel)) {
        const dono = await donoDoWhatsapp(tel);
        if (dono && dono.contato_id !== contatoId) throw new ErroEnvio(409, 'Esse WhatsApp já é de outro cliente: ' + (dono.nome || 'sem nome') + '.');
        if (atual) await patchBanco('contato_identificadores', `id=eq.${atual.id}`, { valor: tel });
        else {
          const ri = await fetch(`${SUPABASE_URL}/rest/v1/contato_identificadores`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ contato_id: contatoId, tipo: 'whatsapp', valor: tel }), signal: AbortSignal.timeout(5000) });
          if (!ri.ok) throw new ErroEnvio(502, 'Não deu para salvar o WhatsApp.');
        }
        feito.push('WhatsApp');
      }
    }
    if (negocio && feito.length) await eventoNegocio(negocio, 'Contato atualizado: ' + feito.join(', '), eu.id);
    return { ok: true };
  },
  // Status, responsável e ficha do contato
  'POST /api/conversa': async (corpo, eu) => {
    const id = String(corpo.conversa_id || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ErroEnvio(400, 'Conversa inválida.');
    const conv = {};
    if (corpo.status !== undefined) { if (!['aberta', 'resolvida', 'arquivada'].includes(corpo.status)) throw new ErroEnvio(400, 'Status inválido.'); conv.status = corpo.status; }
    if (corpo.atribuida_a !== undefined) { if (corpo.atribuida_a !== null && !/^[0-9a-f-]{36}$/i.test(corpo.atribuida_a)) throw new ErroEnvio(400, 'Responsável inválido.'); conv.atribuida_a = corpo.atribuida_a; }
    if (Object.keys(conv).length) await patchBanco('conversas', `id=eq.${id}`, { ...conv, atualizado_em: new Date().toISOString() });
    const ficha = {};
    if (corpo.nome !== undefined) ficha.nome = String(corpo.nome || '').trim().slice(0, 120) || null;
    if (corpo.email !== undefined) { const e = String(corpo.email || '').trim().slice(0, 160); if (e && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new ErroEnvio(400, 'E-mail inválido.'); ficha.email = e || null; }
    if (corpo.observacoes !== undefined) ficha.observacoes = String(corpo.observacoes || '').slice(0, 2000) || null;
    if (Object.keys(ficha).length) {
      const c = await fetch(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${id}&select=contato_id`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
      const contato = c.ok ? ((await c.json())[0] || {}).contato_id : null;
      if (!contato) throw new ErroEnvio(404, 'Conversa não encontrada.');
      await patchBanco('contatos', `id=eq.${contato}`, { ...ficha, atualizado_em: new Date().toISOString() });
    }
    console.log(JSON.stringify({ evento: 'conversa_atualizada', por: eu.id, campos: [...Object.keys(conv), ...Object.keys(ficha)] }));
    return { ok: true };
  },
  // Documentos que ensinam o Gilberto: qualquer pessoa da equipe envia; só o dono aprova (dono, 05/10/2026)
  'POST /api/gilberto-documentos': async (corpo, eu) => {
    const tipo = corpo.tipo === 'pdf' ? 'pdf' : 'texto';
    const titulo = String(corpo.titulo || corpo.arquivo || '').trim().slice(0, 160);
    let pdf = null, texto = null;
    if (tipo === 'pdf') {
      pdf = String(corpo.dados || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
      if (!/^[A-Za-z0-9+/]+=*$/.test(pdf) || !Buffer.from(pdf.slice(0, 8), 'base64').toString('latin1').startsWith('%PDF')) throw new ErroEnvio(400, 'O arquivo não parece um PDF.');
      if (pdf.length > 14e6) throw new ErroEnvio(413, 'PDF grande demais (até 10 MB). Divida em partes menores.');
    } else {
      texto = String(corpo.texto || '').trim();
      if (texto.length < 40) throw new ErroEnvio(400, 'Cole um texto um pouco maior (ao menos algumas frases).');
      if (texto.length > 400000) throw new ErroEnvio(413, 'Texto grande demais. Divida em partes menores.');
    }
    let prep;
    try { prep = await gilberto.prepararDocumento({ titulo, texto, pdf }); }
    catch (e) { if (e instanceof gilberto.ErroSugestao) throw new ErroEnvio(e.http, e.message); throw e; }
    const r = await fetch(`${SUPABASE_URL}/rest/v1/gilberto_documentos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ titulo: prep.titulo, arquivo: String(corpo.arquivo || (tipo === 'texto' ? 'texto colado' : '')).slice(0, 200) || null, tipo, resumo: prep.resumo, conteudo: prep.conteudo,
        conflitos: prep.conflitos, alertas: prep.alertas, situacao: 'aguardando', enviado_por: eu.id }) });
    if (!r.ok) throw new ErroEnvio(r.status === 404 ? 503 : 502, 'Não deu para guardar o documento' + (r.status === 404 ? ' (o banco precisa da migração 023).' : '.'));
    const doc = (await r.json())[0];
    // Avisa o dono no celular: há documento para aprovar
    const donos = await getJson(`${SUPABASE_URL}/rest/v1/usuarios?ativo=eq.true&papel=eq.dono&select=id`, fetch);
    if (donos.length) await avisarCelulares(donos.map(x => x.id), { titulo: '📚 Documento para aprovar', corpo: eu.nome + ' enviou "' + prep.titulo + '" para o Gilberto aprender.', url: '/caixa#docs' }).catch(() => {});
    console.log(JSON.stringify({ evento: 'documento_enviado', tipo, conflitos: prep.conflitos.length }));
    return { ok: true, documento: doc };
  },
  'POST /api/gilberto-documento-acao': async (corpo, eu) => {
    if (!uuidOk(corpo.id)) throw new ErroEnvio(400, 'Documento inválido.');
    const doc = (await getJson(`${SUPABASE_URL}/rest/v1/gilberto_documentos?id=eq.${corpo.id}&select=id,situacao,enviado_por,titulo`, fetch))[0];
    if (!doc) throw new ErroEnvio(404, 'Documento não encontrado.');
    const dono = eu.papel === 'dono', agora = new Date().toISOString();
    const acao = String(corpo.acao || '');
    let mudar;
    if (acao === 'editar') {
      // Quem enviou ajusta o texto enquanto aguarda; depois de aprovado, só o dono (o Gilberto já usa o texto)
      if (!dono && !(doc.situacao === 'aguardando' && doc.enviado_por === eu.id)) throw new ErroEnvio(403, 'Só o dono edita um documento depois de enviado por outra pessoa ou já aprovado.');
      const conteudo = String(corpo.conteudo || '').trim(), titulo = String(corpo.titulo || '').trim();
      if (conteudo.length < 20 || conteudo.length > 200000 || !titulo) throw new ErroEnvio(400, 'Título e conteúdo são obrigatórios.');
      mudar = { titulo: titulo.slice(0, 160), conteudo };
    } else {
      if (!dono) throw new ErroEnvio(403, 'Só o dono aprova, recusa, desliga ou apaga documentos do Gilberto.');
      if (acao === 'aprovar') mudar = { situacao: 'aprovado', aprovado_por: eu.id, aprovado_em: agora, motivo: null };
      else if (acao === 'recusar') mudar = { situacao: 'recusado', motivo: String(corpo.motivo || '').slice(0, 300) || null };
      else if (acao === 'desligar') mudar = { situacao: 'desligado' };
      else if (acao === 'conferido') mudar = { alertas: [], conflitos: [] }; // o dono conferiu os pontos apontados: os avisos saem
      else if (acao === 'religar') mudar = { situacao: 'aprovado', aprovado_por: eu.id, aprovado_em: agora };
      else if (acao === 'apagar') {
        const d = await fetch(`${SUPABASE_URL}/rest/v1/gilberto_documentos?id=eq.${doc.id}`, { method: 'DELETE', headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
        if (!d.ok) throw new ErroEnvio(502, 'Não deu para apagar agora.');
        limparCatalogo();
        return { ok: true };
      } else throw new ErroEnvio(400, 'Ação inválida.');
    }
    await patchBanco('gilberto_documentos', `id=eq.${doc.id}`, { ...mudar, atualizado_em: agora });
    limparCatalogo(); // o Gilberto passa a usar (ou deixa de usar) na próxima resposta
    console.log(JSON.stringify({ evento: 'documento_' + acao }));
    return { ok: true };
  },
  // Cotação manual (painel "Montar orçamento")
  'POST /api/cotar': async corpo => {
    const r = await silbeck.cotar(corpo);
    if (!r.ok) throw new ErroEnvio(400, r.erro);
    return r;
  },
  // Orçamento criado pela equipe
  'POST /api/orcamento': async (corpo, eu) => {
    const id = String(corpo.conversa_id || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ErroEnvio(400, 'Conversa inválida.');
    const c = await fetch(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${id}&select=id,numero_id,contato:contatos(nome)`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    const conv = c.ok ? (await c.json())[0] : null;
    if (!conv) throw new ErroEnvio(404, 'Conversa não encontrada.');
    const r = await criarOrcamento({ persona: 'indefinida', pessoas_aptas_combo: corpo.adultos || 0, ...corpo }, { conversa_id: conv.id, numero_id: conv.numero_id, primeiro_nome: conv.contato && conv.contato.nome, criado_por: eu.id });
    if (!r.ok) throw new ErroEnvio(400, r.erro);
    return { ...r, resumo: orcamento.resumo({ data_entrada: corpo.data_entrada, data_saida: corpo.data_saida, adultos: Number(corpo.adultos) || 1, criancas_idades: corpo.idades_criancas || [] }) };
  },
  // Funil: cria ou atualiza um negócio (etapa, responsável, dados da estadia); registra no histórico
  'POST /api/negocio': async (corpo, eu) => {
    const ETAPAS = { novo: 'Novo', atend: 'Em atendimento', orc: 'Orçamento enviado', pag: 'Aguardando pagamento', res: 'Reserva concluída', perd: 'Perdido' };
    const ORIGENS = ['whatsapp', 'meta', 'insta', 'google', 'site', 'ret', 'ind', 'ag', 'ota', 'ativo'];
    const uuid = v => /^[0-9a-f-]{36}$/i.test(String(v || ''));
    const dados = {}, eventos = [];
    let atual = null;
    if (corpo.id) {
      if (!uuid(corpo.id)) throw new ErroEnvio(400, 'Negócio inválido.');
      const r = await fetch(`${SUPABASE_URL}/rest/v1/negocios?id=eq.${corpo.id}&select=id,etapa,responsavel_id`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new ErroEnvio(503, 'O funil ainda não está no banco (falta a migração 008).');
      atual = (await r.json())[0];
      if (!atual) throw new ErroEnvio(404, 'Negócio não encontrado.');
    }
    if (corpo.etapa !== undefined && (!atual || corpo.etapa !== atual.etapa)) {
      if (!ETAPAS[corpo.etapa]) throw new ErroEnvio(400, 'Etapa inválida.');
      if (corpo.etapa === 'perd' && !String(corpo.motivo_perda || '').trim()) throw new ErroEnvio(400, 'Diga o motivo da perda.');
      Object.assign(dados, { etapa: corpo.etapa, etapa_desde: new Date().toISOString(), motivo_perda: corpo.etapa === 'perd' ? String(corpo.motivo_perda).slice(0, 200) : null,
        fechado_em: ['res', 'perd'].includes(corpo.etapa) ? new Date().toISOString() : null });
      eventos.push('Movido para ' + ETAPAS[corpo.etapa] + (corpo.etapa === 'perd' ? ': ' + String(corpo.motivo_perda).toLowerCase() : ''));
    }
    if (corpo.responsavel_id !== undefined && (!atual || corpo.responsavel_id !== atual.responsavel_id)) {
      if (corpo.responsavel_id !== null && !uuid(corpo.responsavel_id)) throw new ErroEnvio(400, 'Responsável inválido.');
      dados.responsavel_id = corpo.responsavel_id;
      eventos.push('Responsável trocado');
    }
    if (corpo.origem !== undefined) { if (!ORIGENS.includes(corpo.origem)) throw new ErroEnvio(400, 'Origem inválida.'); dados.origem = corpo.origem; }
    for (const k of ['perfil', 'hospedes', 'acomodacao', 'notas']) if (corpo[k] !== undefined) dados[k] = String(corpo[k] || '').slice(0, k === 'notas' ? 4000 : 200) || null;
    for (const k of ['data_entrada', 'data_saida']) if (corpo[k] !== undefined) { if (corpo[k] && !/^\d{4}-\d{2}-\d{2}$/.test(corpo[k])) throw new ErroEnvio(400, 'Data inválida.'); dados[k] = corpo[k] || null; }
    if (corpo.valor_previsto !== undefined) { const v = corpo.valor_previsto === '' || corpo.valor_previsto === null ? null : Number(corpo.valor_previsto); if (v !== null && !(v >= 0)) throw new ErroEnvio(400, 'Valor inválido.'); dados.valor_previsto = v; }
    if (corpo.etiquetas !== undefined) dados.etiquetas = (Array.isArray(corpo.etiquetas) ? corpo.etiquetas : []).map(t => String(t).trim().slice(0, 40)).filter(Boolean).slice(0, 20);
    let id = atual && atual.id;
    if (!atual) {
      // Novo lead manual: contato (nome e, se houver, WhatsApp) + negócio
      const nome = String(corpo.nome || '').trim().slice(0, 120);
      if (!nome) throw new ErroEnvio(400, 'Diga o nome do lead.');
      const tel = corpo.telefone ? whatsE164(corpo.telefone) : null;
      const email = emailOk(corpo.email);
      if (tel) { const dono = await donoDoWhatsapp(tel); if (dono) throw new ErroEnvio(409, 'Esse WhatsApp já é de outro cliente: ' + (dono.nome || 'sem nome') + '. Abra a ficha dele no Funil.'); }
      const c = await fetch(`${SUPABASE_URL}/rest/v1/contatos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, body: JSON.stringify({ nome, ...(email ? { email } : {}) }), signal: AbortSignal.timeout(5000) });
      if (!c.ok) throw new ErroEnvio(502, 'Não deu para criar o contato.');
      const contato = (await c.json())[0];
      if (tel) await fetch(`${SUPABASE_URL}/rest/v1/contato_identificadores`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ contato_id: contato.id, tipo: 'whatsapp', valor: tel }), signal: AbortSignal.timeout(5000) }).catch(() => {});
      const n = await fetch(`${SUPABASE_URL}/rest/v1/negocios`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' },
        body: JSON.stringify({ contato_id: contato.id, origem: 'ativo', responsavel_id: eu.id, ...dados }), signal: AbortSignal.timeout(5000) });
      if (!n.ok) throw new ErroEnvio(n.status === 404 ? 503 : 502, 'Não deu para criar o negócio (o banco precisa da migração 008?).');
      id = (await n.json())[0].id;
      eventos.unshift('Lead criado');
    } else if (Object.keys(dados).length) {
      await patchBanco('negocios', `id=eq.${id}`, { ...dados, atualizado_em: new Date().toISOString() });
      if (!eventos.length) eventos.push('Dados editados');
    }
    if (eventos.length) await fetch(`${SUPABASE_URL}/rest/v1/negocio_eventos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' },
      body: JSON.stringify(eventos.map(t => ({ negocio_id: id, texto: t, por: eu.nome }))), signal: AbortSignal.timeout(5000) }).catch(() => {});
    return { ok: true, id };
  },
  // Tarefas: cria, edita ou conclui
  'POST /api/tarefa': async (corpo, eu) => {
    const uuid = v => /^[0-9a-f-]{36}$/i.test(String(v || ''));
    const dados = {};
    if (corpo.tipo !== undefined) dados.tipo = String(corpo.tipo || '').trim().slice(0, 60);
    if (corpo.descricao !== undefined) dados.descricao = String(corpo.descricao || '').slice(0, 500) || null;
    if (corpo.quando !== undefined) { const q = new Date(corpo.quando); if (isNaN(q)) throw new ErroEnvio(400, 'Data da tarefa inválida.'); dados.quando = q.toISOString(); }
    if (corpo.responsavel_id !== undefined) { if (corpo.responsavel_id !== null && !uuid(corpo.responsavel_id)) throw new ErroEnvio(400, 'Responsável inválido.'); dados.responsavel_id = corpo.responsavel_id; }
    if (corpo.feita !== undefined) { dados.feita = !!corpo.feita; dados.feita_em = corpo.feita ? new Date().toISOString() : null; }
    let negocio = corpo.negocio_id, evento;
    if (corpo.id) {
      if (!uuid(corpo.id)) throw new ErroEnvio(400, 'Tarefa inválida.');
      const r = await fetch(`${SUPABASE_URL}/rest/v1/tarefas?id=eq.${corpo.id}&select=negocio_id,tipo`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
      const t = r.ok ? (await r.json())[0] : null;
      if (!t) throw new ErroEnvio(404, 'Tarefa não encontrada.');
      negocio = t.negocio_id;
      await patchBanco('tarefas', `id=eq.${corpo.id}`, dados);
      if (corpo.feita !== undefined) evento = (corpo.feita ? 'Concluída: ' : 'Reaberta: ') + (dados.tipo || t.tipo);
    } else {
      if (!uuid(negocio)) throw new ErroEnvio(400, 'Negócio inválido.');
      if (!dados.tipo || !dados.quando) throw new ErroEnvio(400, 'Diga o tipo e quando.');
      const r = await fetch(`${SUPABASE_URL}/rest/v1/tarefas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' },
        body: JSON.stringify({ negocio_id: negocio, responsavel_id: eu.id, criado_por: eu.id, ...dados }), signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new ErroEnvio(r.status === 404 ? 503 : 502, 'Não deu para criar a tarefa (o banco precisa da migração 008?).');
      evento = 'Tarefa agendada: ' + dados.tipo;
    }
    if (evento) await fetch(`${SUPABASE_URL}/rest/v1/negocio_eventos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' },
      body: JSON.stringify({ negocio_id: negocio, texto: evento, por: eu.nome }), signal: AbortSignal.timeout(5000) }).catch(() => {});
    return { ok: true };
  },
  // Plano B do pagamento: o CRM não conseguiu lançar no Silbeck. A equipe confere e lança no Silbeck, clica em
  // "Já lancei no Silbeck" na tarefa e o Gilberto manda a confirmação, os extras e o agradecimento (dono, 07/10/2026)
  'POST /api/reserva-lancada': async (corpo, eu) => {
    if (!/^[0-9a-f-]{36}$/i.test(String(corpo.tarefa_id || ''))) throw new ErroEnvio(400, 'Tarefa inválida.');
    const t = (await getJson(`${SUPABASE_URL}/rest/v1/tarefas?id=eq.${corpo.tarefa_id}&select=negocio_id,tipo,feita`, fetch))[0];
    if (!t || t.tipo !== 'Confirmar a reserva') throw new ErroEnvio(404, 'Tarefa de confirmar reserva não encontrada.');
    if (t.feita) throw new ErroEnvio(409, 'Esta tarefa já foi concluída.');
    const cob = t.negocio_id && (await getJson(`${SUPABASE_URL}/rest/v1/cobrancas?negocio_id=eq.${t.negocio_id}&situacao=eq.paga&reserva_id=not.is.null&select=*&order=pago_em.desc&limit=1`, fetch))[0];
    if (!cob) throw new ErroEnvio(404, 'Não achei o pagamento desta reserva. Confirme ao cliente pela conversa.');
    const res = (await getJson(`${SUPABASE_URL}/rest/v1/reservas?id=eq.${cob.reserva_id}&select=*`, fetch))[0];
    if (!res) throw new ErroEnvio(404, 'Não achei a reserva no CRM. Confirme ao cliente pela conversa.');
    await patchBanco('reservas', `id=eq.${res.id}`, { situacao: 'confirmada', confirmada_em: new Date().toISOString(), atualizado_em: new Date().toISOString() });
    const aviso = await confirmarAoCliente(cob, res, true, Number(cob.valor_pago || cob.valor), fetch, { pelaEquipe: true });
    if (!aviso) throw new ErroEnvio(502, 'A reserva ficou confirmada no CRM, mas o WhatsApp não aceitou a mensagem (janela de 24 h fechada?). Confirme ao cliente pela conversa.');
    await patchBanco('tarefas', `id=eq.${corpo.tarefa_id}`, { feita: true, feita_em: new Date().toISOString() });
    await eventoNegocio(t.negocio_id, 'Reserva ' + res.silbeck_id + ' lançada no Silbeck por ' + eu.nome + ' · o Gilberto mandou a confirmação' + (aviso.extras ? ', os extras (' + aviso.extras + ')' : '') + ' e o agradecimento', eu.id, fetch).catch(() => {});
    return { ok: true, extras: aviso.extras };
  },
  // Produtos (atividades e extras): o Gilberto e a página do orçamento usam esta lista
  'POST /api/produto': async corpo => {
    const dados = {};
    for (const k of ['nome', 'descricao', 'preco', 'regras', 'quando_oferecer']) if (corpo[k] !== undefined) dados[k] = String(corpo[k] || '').trim().slice(0, k === 'descricao' ? 600 : 200) || null;
    if (corpo.codigo !== undefined) dados.codigo = String(corpo.codigo || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (corpo.tipo_reserva !== undefined) { if (!['ativ', 'terc', 'simples'].includes(corpo.tipo_reserva)) throw new ErroEnvio(400, 'Tipo inválido.'); dados.tipo_reserva = corpo.tipo_reserva; }
    for (const k of ['antecedencia_dias', 'prioridade']) if (corpo[k] !== undefined) { const v = parseInt(corpo[k], 10); if (!(v >= 0 && v < 400)) throw new ErroEnvio(400, 'Número inválido.'); dados[k] = v; }
    if (corpo.ativo !== undefined) dados.ativo = !!corpo.ativo;
    try { Object.assign(dados, produtos.camposExtras(corpo, orcamento.GRUPOS)); } catch (e) { throw new ErroEnvio(400, e.message); }
    if (dados.foto || (dados.fotos && dados.fotos.length)) { await atualizarFotos(fetch, true); if ([dados.foto, ...(dados.fotos || [])].filter(Boolean).some(f => !fotoAtiva(f))) throw new ErroEnvio(400, 'Essa foto não está no Banco de fotos.'); }
    // Preço como o cliente lê: se ficar vazio, o CRM monta pelo preço em número ou pelas variações
    if (!dados.preco && (dados.preco_valor != null || (dados.variacoes && dados.variacoes.length))) dados.preco = produtos.precoTexto({ ...dados, unidade: dados.unidade || 'unidade' });
    if (corpo.id) {
      if (!/^[0-9a-f-]{36}$/i.test(corpo.id)) throw new ErroEnvio(400, 'Produto inválido.');
      if (dados.nome === null || dados.preco === null || dados.codigo === '') throw new ErroEnvio(400, 'Nome, código e preço são obrigatórios.');
      await patchBanco('produtos', `id=eq.${corpo.id}`, { ...dados, atualizado_em: new Date().toISOString() });
    } else {
      if (!dados.nome || !dados.preco || !dados.codigo) throw new ErroEnvio(400, 'Nome, código e preço são obrigatórios.');
      const r = await fetch(`${SUPABASE_URL}/rest/v1/produtos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify(dados), signal: AbortSignal.timeout(5000) });
      if (r.status === 409) throw new ErroEnvio(409, 'Já existe um produto com esse código.');
      if (!r.ok) throw new ErroEnvio(502, 'Não deu para salvar (o banco precisa da migração 009?).');
    }
    limparCatalogo();
    return { ok: true };
  },
  // Oferta de produto numa conversa (no máximo 1 por conversa; para oferecer de novo, a tela pede confirmação)
  'POST /api/oferta': async (corpo, eu) => {
    const conversa = String(corpo.conversa_id || '');
    if (!uuidOk(conversa)) throw new ErroEnvio(400, 'Conversa inválida.');
    const p = await produtoPorCodigo(corpo.produto_codigo);
    const ja = await ofertasDaConversa(conversa);
    if (ja.length && !corpo.forcar) throw new ErroEnvio(409, 'Já houve oferta nesta conversa (' + ja[0].produto_nome + ').');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/ofertas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ conversa_id: conversa, negocio_id: await negocioDaConversa(conversa), produto_codigo: p.codigo, produto_nome: p.nome, por: 'equipe', autor_id: eu.id }) });
    if (!r.ok) throw new ErroEnvio(r.status === 404 ? 503 : 502, 'Não deu para registrar a oferta (o banco precisa da migração 012?).');
    const o = (await r.json())[0];
    if (o.negocio_id) await eventoNegocio(o.negocio_id, 'Oferecido: ' + p.nome, eu.id);
    return { ok: true, oferta: o };
  },
  // Oferta enviada no WhatsApp: foto do produto, texto e botões "Eu aceito" / "Não, obrigado"
  'POST /api/oferta-enviar': async (corpo, eu) => {
    if (!WA_TOKEN) throw new ErroEnvio(503, 'O envio ainda não está configurado no servidor.');
    const p = await produtoPorCodigo(corpo.produto_codigo);
    const texto = String(corpo.texto || '').trim();
    if (texto.length < 10 || texto.length > 1000) throw new ErroEnvio(400, 'O texto da oferta precisa ter de 10 a 1.000 caracteres.');
    const { conv, para } = await carregarConversaParaEnvio(corpo.conversa_id, fetch);
    const ja = await ofertasDaConversa(conv.id);
    if (ja.length && !corpo.forcar) throw new ErroEnvio(409, 'Já houve oferta nesta conversa (' + ja[0].produto_nome + ').');
    await atualizarFotos().catch(() => {});
    const bib = orcamento.biblioteca();
    const foto = p.foto && fotoAtiva(p.foto) ? p.foto : (((bib.find(g => g.grupo === p.grupo_fotos) || {}).fotos || [])[0] || {}).arquivo || null;
    const negocio = await negocioDaConversa(conv.id);
    const ro = await fetch(`${SUPABASE_URL}/rest/v1/ofertas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ conversa_id: conv.id, negocio_id: negocio, produto_codigo: p.codigo, produto_nome: p.nome, por: 'equipe', autor_id: eu.id }) });
    if (!ro.ok) throw new ErroEnvio(ro.status === 404 ? 503 : 502, 'Não deu para registrar a oferta (o banco precisa da migração 012?).');
    const oferta = (await ro.json())[0];
    const interactive = produtos.mensagemOferta(p, texto, oferta.id, foto ? `${URL_PUBLICA}/fotos/${foto}` : null);
    const r = await chamarMeta(`${encodeURIComponent(conv.numero_id)}/messages`, { messaging_product: 'whatsapp', recipient_type: 'individual', to: para, type: 'interactive', interactive }, fetch);
    if (!r.ok || !r.json.messages || !r.json.messages[0]) {
      const e = r.json.error || {};
      ultimoErroMeta = { quando: new Date().toISOString(), http: r.status, codigo: e.code || null, mensagem: String(e.message || '').slice(0, 200) };
      await fetch(`${SUPABASE_URL}/rest/v1/ofertas?id=eq.${oferta.id}`, { method: 'DELETE', headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => {});
      throw new ErroEnvio(502, 'A Meta não aceitou a oferta' + (e.code ? ` (código ${e.code})` : '') + '.');
    }
    // Na caixa a oferta aparece como a foto com o texto e os botões que o cliente vê
    const visto = texto + '\n\n' + interactive.action.buttons.map(b => '[ ' + b.reply.title + ' ]').join(' ');
    const wamid = r.json.messages[0].id;
    const id = foto
      ? await rpc('registrar_saida_midia', { p_conversa: conv.id, p_wamid: wamid, p_tipo: 'image', p_legenda: visto, p_caminho: 'biblioteca/' + foto, p_mime: 'image/jpeg', p_nome: null, p_autor: eu.id })
      : await rpc('registrar_saida_whatsapp', { p_conversa: conv.id, p_wamid: wamid, p_corpo: visto, p_autor: eu.id });
    if (negocio) await eventoNegocio(negocio, 'Oferecido no WhatsApp: ' + p.nome, eu.id);
    return { ok: true, oferta, mensagem: { id, tipo: foto ? 'image' : 'text', arquivo: foto, corpo: visto, enviada_em: new Date().toISOString() } };
  },
  // Link de extras (aventuras | momentos): cria e, se pedido, envia no WhatsApp com foto e botão "Ver opções"
  'POST /api/vitrine': async (corpo, eu) => {
    const tema = String(corpo.tema || '');
    if (!vitrine.TEMAS[tema]) throw new ErroEnvio(400, 'Escolha o link (aventuras ou momentos).');
    let conv, para;
    if (corpo.enviar) {
      if (!WA_TOKEN) throw new ErroEnvio(503, 'O envio ainda não está configurado no servidor.');
      ({ conv, para } = await carregarConversaParaEnvio(corpo.conversa_id, fetch));
    } else {
      if (!uuidOk(corpo.conversa_id)) throw new ErroEnvio(400, 'Conversa inválida.');
      conv = { id: corpo.conversa_id };
    }
    const ja = await ofertasDaConversa(conv.id);
    if (ja.length && !corpo.forcar) throw new ErroEnvio(409, 'Já houve oferta nesta conversa (' + ja[0].produto_nome + ').');
    const v = await criarVitrine(conv.id, tema, { por: 'equipe', criado_por: eu.id });
    if (!corpo.enviar) return { ok: true, link: v.link };
    const texto = String(corpo.texto || '').trim().slice(0, 1000) || vitrine.TEMAS[tema].intro;
    return { ok: true, link: v.link, mensagem: await enviarCartaoVitrine(conv, para, tema, v, texto, eu.id) };
  },
  // Resposta do cliente à oferta
  'POST /api/oferta-resposta': async (corpo, eu) => {
    if (!uuidOk(corpo.id)) throw new ErroEnvio(400, 'Oferta inválida.');
    if (!['aceito', 'recusado', 'oferecido'].includes(corpo.situacao)) throw new ErroEnvio(400, 'Situação inválida.');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/ofertas?id=eq.${corpo.id}&select=id,negocio_id,produto_nome`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    const o = r.ok ? (await r.json())[0] : null;
    if (!o) throw new ErroEnvio(404, 'Oferta não encontrada.');
    await patchBanco('ofertas', `id=eq.${o.id}`, { situacao: corpo.situacao, respondido_em: corpo.situacao === 'oferecido' ? null : new Date().toISOString() });
    if (o.negocio_id && corpo.situacao === 'recusado') await eventoNegocio(o.negocio_id, 'Recusou a oferta: ' + o.produto_nome, eu.id);
    return { ok: true };
  },
  // Venda de produto: valor calculado aqui, vai para a conta do hóspede e cria as tarefas (agendar/preparar e lançar)
  'POST /api/venda': async (corpo, eu) => {
    const conversa = String(corpo.conversa_id || '');
    if (!uuidOk(conversa)) throw new ErroEnvio(400, 'Conversa inválida.');
    const p = await produtoPorCodigo(corpo.produto_codigo);
    let v;
    try { v = produtos.calcularVenda(p, corpo); } catch (e) { throw new ErroEnvio(400, e.message); }
    const data_uso = corpo.data_uso ? String(corpo.data_uso) : null;
    if (data_uso && !/^\d{4}-\d{2}-\d{2}$/.test(data_uso)) throw new ErroEnvio(400, 'Data inválida.');
    const negocio = await negocioDaConversa(conversa, 'id,data_entrada');
    const oferta = uuidOk(corpo.oferta_id) ? corpo.oferta_id : null;
    const venda = { conversa_id: conversa, negocio_id: negocio ? negocio.id : null, oferta_id: oferta, produto_codigo: p.codigo, produto_nome: p.nome, ...v,
      data_uso, horario: String(corpo.horario || '').trim().slice(0, 40) || null, observacoes: String(corpo.observacoes || '').trim().slice(0, 500) || null, criado_por: eu.id };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/vendas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, body: JSON.stringify(venda), signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new ErroEnvio(r.status === 404 ? 503 : 502, 'Não deu para registrar a venda (o banco precisa da migração 012?).');
    const salva = (await r.json())[0];
    if (oferta) await patchBanco('ofertas', `id=eq.${oferta}`, { situacao: 'aceito', respondido_em: new Date().toISOString() }).catch(() => {});
    const tarefas = await tarefasEAlertasDaVenda(p, { ...venda, id: salva.id }, { negocio: negocio && negocio.id, responsavel: eu.id, chegada: negocio && negocio.data_entrada, pedidoDoCliente: false });
    if (negocio) {
      await eventoNegocio(negocio.id, 'Venda: ' + p.nome + (v.variacao ? ' (' + v.variacao + ')' : '') + ' · ' + produtos.brl(v.valor_total) + ' · na conta do hóspede', eu.id);
    }
    return { ok: true, venda: salva, tarefas };
  },
  // Venda lançada na conta do hóspede, ou cancelada
  'POST /api/venda-situacao': async (corpo, eu) => {
    if (!uuidOk(corpo.id)) throw new ErroEnvio(400, 'Venda inválida.');
    if (!['vendido', 'lancado', 'cancelado'].includes(corpo.situacao)) throw new ErroEnvio(400, 'Situação inválida.');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/vendas?id=eq.${corpo.id}&select=id,negocio_id,produto_nome,valor_total`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    const v = r.ok ? (await r.json())[0] : null;
    if (!v) throw new ErroEnvio(404, 'Venda não encontrada.');
    const lanc = corpo.situacao === 'lancado';
    await patchBanco('vendas', `id=eq.${v.id}`, { situacao: corpo.situacao, lancado_em: lanc ? new Date().toISOString() : null, lancado_por: lanc ? eu.id : null });
    if (corpo.situacao !== 'vendido') await resolverAlertasDaVenda(v.id, corpo.situacao === 'lancado' ? ['lancar_conta'] : ['lancar_conta', 'produto_pedido'], eu.id);
    if (v.negocio_id) await eventoNegocio(v.negocio_id, ({ lancado: 'Lançado na conta: ', cancelado: 'Venda cancelada: ', vendido: 'Venda reaberta: ' })[corpo.situacao] + v.produto_nome + ' · ' + produtos.brl(v.valor_total), eu.id);
    return { ok: true };
  },
  // Cobrança por Pix: cria no Banco do Brasil (ou no simulador) e devolve o copia e cola para mandar ao cliente
  'POST /api/cobranca': async (corpo, eu) => {
    const conversa = String(corpo.conversa_id || '');
    if (!uuidOk(conversa)) throw new ErroEnvio(400, 'Conversa inválida.');
    return { ok: true, cobranca: await criarCobrancaPix(conversa, { ...corpo, reserva_id: uuidOk(corpo.reserva_id) ? corpo.reserva_id : null }, eu.id) };
  },
  // Aceite do cliente: cria a reserva NÃO CONFIRMADA no Silbeck (vaga e preço conferidos na hora) e já gera o Pix
  // (ou a tarefa do link do cartão). Usada quando a equipe aprova a sugestão do Gilberto ou fecha pela tela.
  'POST /api/fechar-reserva': async (corpo, eu) => {
    const conversa = String(corpo.conversa_id || '');
    if (!uuidOk(conversa)) throw new ErroEnvio(400, 'Conversa inválida.');
    return { ok: true, ...(await fecharReserva(conversa, corpo, { usuario: eu.id, origem: corpo.origem === 'gilberto' ? 'gilberto' : eu.id })) };
  },
  // Cancelar, conferir agora, ou (só no simulador) simular o pagamento
  'POST /api/cobranca-acao': async (corpo, eu) => {
    if (corpo.acao === 'verificar') return { ok: true, ...(await verificarCobrancas()) };
    if (!uuidOk(corpo.id)) throw new ErroEnvio(400, 'Cobrança inválida.');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/cobrancas?id=eq.${corpo.id}&select=*`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    const cob = r.ok ? (await r.json())[0] : null;
    if (!cob) throw new ErroEnvio(404, 'Cobrança não encontrada.');
    if (corpo.acao === 'cancelar') {
      if (cob.situacao !== 'ativa') throw new ErroEnvio(409, 'Só dá para cancelar cobrança ativa.');
      await bb.cancelar(cob.txid, cob.fonte);
      await patchBanco('cobrancas', `id=eq.${cob.id}`, { situacao: 'cancelada', atualizado_em: new Date().toISOString() });
      if (cob.negocio_id) await eventoNegocio(cob.negocio_id, 'Pix cancelado: ' + produtos.brl(cob.valor), eu.id);
      return { ok: true };
    }
    if (corpo.acao === 'simular_pagamento') {
      if (cob.fonte !== 'simulador') throw new ErroEnvio(400, 'Só cobranças do simulador.');
      if (silbeck.MODO() === 'real') throw new ErroEnvio(409, 'Com o Silbeck real ligado, simular pagamento lançaria um pagamento de mentira no Silbeck do hotel.');
      bb.simularPagamento(cob.txid);
      ultimaVerificacaoPix = 0;
      return { ok: true, ...(await verificarCobrancas()) };
    }
    throw new ErroEnvio(400, 'Ação inválida.');
  },
  // Quem está de plantão (recebe os alertas com som; sem dono em 10 min, vão para todos)
  // Resumo do dia às 8h no celular: cada pessoa liga ou desliga para si
  'GET /api/resumo-dia': async (corpo, eu) => { const v = await lerConfig('resumo_dia_desligado', fetch); return { ok: true, ligado: !((v && v.usuarios) || []).includes(eu.id) }; },
  'POST /api/resumo-dia': async (corpo, eu) => {
    const lista = new Set(((await lerConfig('resumo_dia_desligado', fetch)) || {}).usuarios || []);
    if (corpo.ligado) lista.delete(eu.id); else lista.add(eu.id);
    const r = await gravarConfig('resumo_dia_desligado', { usuarios: [...lista] }, fetch, eu.id);
    if (!r.ok) throw new ErroEnvio(502, 'Não deu para salvar agora.');
    return { ok: true, ligado: !!corpo.ligado };
  },
  // Gilberto automático: geral (Ajustes/barra lateral) e por conversa (a equipe assume ou devolve)
  // Promoção do site (dono, 08/10/2026): −41% a partir de 2 diárias; ligar só quando o preço da API bater com o do motor
  'POST /api/promocao': async (corpo, eu) => {
    const percentual = Number(corpo.percentual ?? 41), minimo = Number(corpo.minimo_diarias ?? 2);
    if (!(percentual > 0 && percentual < 90)) throw new ErroEnvio(400, 'Desconto inválido (de 1% a 89%).');
    if (!(Number.isInteger(minimo) && minimo >= 1 && minimo <= 30)) throw new ErroEnvio(400, 'Mínimo de diárias inválido.');
    const valor = { ligada: !!corpo.ligada, percentual, minimo_diarias: minimo };
    const r = await gravarConfig('promocao_site', valor, fetch, eu.id);
    if (!r.ok) throw new ErroEnvio(502, 'Não deu para salvar agora.');
    silbeck.definirFontePromocao(() => lerConfig('promocao_site', fetch)); // vale já na próxima cotação
    console.log(JSON.stringify({ evento: 'promocao_' + (valor.ligada ? 'ligada' : 'desligada'), percentual, minimo }));
    return { ok: true, ...valor };
  },
  'POST /api/gilberto-auto': async (corpo, eu) => {
    const r = await gravarConfig('gilberto_auto', { ligado: !!corpo.ligado }, fetch, eu.id);
    if (!r.ok) throw new ErroEnvio(r.status === 404 ? 503 : 502, 'Não deu para salvar (o banco precisa da migração 018?).');
    autoCache = { ate: 0, ligado: false };
    console.log(JSON.stringify({ evento: 'gilberto_auto_' + (corpo.ligado ? 'ligado' : 'desligado') }));
    return { ok: true, ligado: !!corpo.ligado };
  },
  'POST /api/conversa-gilberto': async (corpo, eu) => {
    if (!uuidOk(corpo.conversa_id)) throw new ErroEnvio(400, 'Conversa inválida.');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${corpo.conversa_id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ gilberto_pausado: !!corpo.pausado, gilberto_pausado_por: corpo.pausado ? eu.id : null, gilberto_pausado_em: corpo.pausado ? new Date().toISOString() : null }) });
    if (!r.ok) throw new ErroEnvio(r.status === 400 ? 503 : 502, 'Não deu para salvar (o banco precisa da migração 021?).');
    const negocio = await negocioDaConversa(corpo.conversa_id);
    if (negocio) await eventoNegocio(negocio, corpo.pausado ? 'A equipe assumiu o atendimento (Gilberto pausado)' : 'Conversa devolvida ao Gilberto', eu.id);
    return { ok: true, pausado: !!corpo.pausado };
  },
  // Números de teste da equipe (Ajustes do agente): só eles podem ter a conversa recomeçada
  'POST /api/numeros-teste': async (corpo, eu) => {
    const nums = [...new Set((Array.isArray(corpo.numeros) ? corpo.numeros : []).map(n => chaveNumero(n)).filter(Boolean))].slice(0, 20);
    if ((corpo.numeros || []).length && nums.length !== new Set(corpo.numeros.map(String)).size) throw new ErroEnvio(400, 'Algum número está incompleto: use DDD + número (ex.: 67 99999-0000).');
    const r = await gravarConfig('numeros_teste', { numeros: nums }, fetch, eu.id);
    if (!r.ok) throw new ErroEnvio(502, 'Não deu para salvar agora.');
    return { ok: true, numeros: nums };
  },
  // Recomeçar conversa de teste: apaga a conversa (mensagens, sugestões, alertas), o negócio (tarefas, histórico),
  // orçamentos, Pix, reservas de teste e vendas. Só para números de teste da equipe (conferido aqui, no servidor).
  'POST /api/recomecar-conversa': async (corpo, eu) => {
    if (!uuidOk(corpo.conversa_id)) throw new ErroEnvio(400, 'Conversa inválida.');
    const c = (await getJson(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${corpo.conversa_id}&select=id,contato_id,contato:contatos(contato_identificadores(tipo,valor))`, fetch))[0];
    if (!c) throw new ErroEnvio(404, 'Conversa não encontrada.');
    const wa = ((c.contato && c.contato.contato_identificadores) || []).find(i => i.tipo === 'whatsapp');
    const teste = ((await lerConfig('numeros_teste', fetch)) || {}).numeros || [];
    if (!wa || !teste.includes(chaveNumero(wa.valor))) throw new ErroEnvio(403, 'Só dá para recomeçar conversas de números de teste da equipe (Ajustes do agente).');
    const apagar = async (tabela, filtro, opcional) => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}?${filtro}`, { method: 'DELETE', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(8000) });
      if (!r.ok && !(opcional && r.status === 404)) throw new ErroEnvio(502, 'Não deu para apagar ' + tabela + ' (' + r.status + '). Nada mais foi apagado depois disso.');
    };
    const cid = c.id;
    await apagar('reservas', `conversa_id=eq.${cid}`, true);
    await apagar('cobrancas', `conversa_id=eq.${cid}`, true);
    await apagar('vendas', `conversa_id=eq.${cid}`, true);
    await apagar('orcamentos', `conversa_id=eq.${cid}`);
    await apagar('negocios', `or=(conversa_id.eq.${cid},contato_id.eq.${c.contato_id})`);
    await apagar('conversas', `id=eq.${cid}`);
    console.log(JSON.stringify({ evento: 'conversa_recomecada' }));
    return { ok: true };
  },
  'POST /api/plantao': async (corpo, eu) => {
    const id = corpo.usuario_id || null;
    if (id && !uuidOk(id)) throw new ErroEnvio(400, 'Pessoa inválida.');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/config?on_conflict=chave`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ chave: 'plantao', valor: { usuario_id: id }, atualizado_por: eu.id, atualizado_em: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new ErroEnvio(r.status === 404 ? 503 : 502, 'Não deu para salvar o plantão (o banco precisa da migração 018?).');
    plantaoCache = { ate: 0, id: null };
    return { ok: true };
  },
  // Sino: resolver um alerta ("✓ Lançado na conta" também marca a venda e conclui a tarefa de lançar)
  'POST /api/alerta': async (corpo, eu) => {
    if (!uuidOk(corpo.id)) throw new ErroEnvio(400, 'Alerta inválido.');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/alertas?id=eq.${corpo.id}&select=id,tipo,venda_id,negocio_id,conversa_id,titulo,info,situacao`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    const a = r.ok ? (await r.json())[0] : null;
    if (!a) throw new ErroEnvio(404, 'Alerta não encontrado.');
    if (a.situacao !== 'aberto') return { ok: true };
    if (corpo.acao === 'assumir') { // fica com quem assumiu; a conversa passa para essa pessoa
      await patchBanco('alertas', `id=eq.${a.id}`, { assumido_por: eu.id, assumido_em: new Date().toISOString() });
      if (a.conversa_id) await patchBanco('conversas', `id=eq.${a.conversa_id}`, { atribuida_a: eu.id, status: 'aberta' }).catch(() => {});
      if (a.conversa_id) await pausarGilberto(a.conversa_id, true, eu.id).catch(() => {}); // quem assume atende: o Gilberto sai
      if (a.negocio_id) await eventoNegocio(a.negocio_id, 'Assumiu o alerta: ' + a.titulo, eu.id);
      return { ok: true };
    }
    if (a.tipo === 'produto_pedido' && a.venda_id && corpo.acao === 'reservado') { // a equipe reservou o extra: confirma ao cliente
      const vr = await fetch(`${SUPABASE_URL}/rest/v1/vendas?id=eq.${a.venda_id}&select=*`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
      const venda = vr.ok ? (await vr.json())[0] : null;
      if (!venda) throw new ErroEnvio(404, 'Venda não encontrada.');
      const muda = {};
      if (corpo.data_uso !== undefined) { if (corpo.data_uso && !/^\d{4}-\d{2}-\d{2}$/.test(String(corpo.data_uso))) throw new ErroEnvio(400, 'Data inválida.'); muda.data_uso = corpo.data_uso || null; }
      if (corpo.horario !== undefined) muda.horario = String(corpo.horario || '').trim().slice(0, 40) || null;
      if (Object.keys(muda).length) { await patchBanco('vendas', `id=eq.${venda.id}`, muda); Object.assign(venda, muda); }
      await patchBanco('alertas', `id=eq.${a.id}`, { situacao: 'resolvido', resolvido_por: eu.id, resolvido_em: new Date().toISOString() });
      // A tarefa de agendar/preparar deste extra também fica concluída
      const nomeVenda = venda.produto_nome + (venda.variacao ? ' (' + venda.variacao + ')' : '');
      if (venda.negocio_id) for (const t of await getJson(`${SUPABASE_URL}/rest/v1/tarefas?negocio_id=eq.${venda.negocio_id}&feita=eq.false&select=id,tipo,descricao&limit=50`, fetch))
        if (t.tipo !== 'Lançar na conta do hóspede' && String(t.descricao || '').startsWith(nomeVenda + ' · ')) await patchBanco('tarefas', `id=eq.${t.id}`, { feita: true, feita_em: new Date().toISOString() }).catch(() => {});
      const aviso = corpo.avisar === false ? { enviada: false, motivo: 'sem aviso' } : await confirmarExtraAoCliente(venda, eu.id);
      if (a.negocio_id) await eventoNegocio(a.negocio_id, 'Extra reservado: ' + nomeVenda + (venda.data_uso ? ' · dia ' + ddmm(venda.data_uso) : '') + (venda.horario ? ' às ' + venda.horario : '') + (aviso.enviada ? ' · cliente avisado no WhatsApp' : ''), eu.id);
      return { ok: true, avisado: !!aviso.enviada, motivo: aviso.enviada ? null : aviso.motivo };
    }
    if (a.tipo === 'lancar_conta' && a.venda_id) {
      await patchBanco('vendas', `id=eq.${a.venda_id}`, { situacao: 'lancado', lancado_em: new Date().toISOString(), lancado_por: eu.id });
      await resolverAlertasDaVenda(a.venda_id, ['lancar_conta'], eu.id);
      if (a.negocio_id) await eventoNegocio(a.negocio_id, 'Lançado na conta: ' + String(a.info || '').split(' · ')[0], eu.id);
    } else {
      await patchBanco('alertas', `id=eq.${a.id}`, { situacao: 'resolvido', resolvido_por: eu.id, resolvido_em: new Date().toISOString() });
      if (a.negocio_id) await eventoNegocio(a.negocio_id, 'Alerta resolvido: ' + a.titulo + ' · ' + String(a.info || '').split(' · ')[0], eu.id);
    }
    return { ok: true };
  },
  // Agências e operadoras parceiras
  'POST /api/agencia': async corpo => {
    const dados = {};
    for (const k of ['nome', 'cnpj', 'telefone', 'email', 'codigo_silbeck', 'observacoes']) if (corpo[k] !== undefined) dados[k] = String(corpo[k] || '').trim().slice(0, k === 'observacoes' ? 2000 : 160) || null;
    if (dados.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dados.email)) throw new ErroEnvio(400, 'E-mail inválido.');
    if (corpo.comissao !== undefined) { const c = corpo.comissao === '' || corpo.comissao === null ? null : Number(corpo.comissao); if (c !== null && !(c >= 0 && c <= 100)) throw new ErroEnvio(400, 'Comissão de 0 a 100%.'); dados.comissao = c; }
    if (corpo.ativo !== undefined) dados.ativo = !!corpo.ativo;
    if (corpo.id) {
      if (!/^[0-9a-f-]{36}$/i.test(corpo.id)) throw new ErroEnvio(400, 'Agência inválida.');
      if (dados.nome === null) throw new ErroEnvio(400, 'Diga o nome da agência.');
      await patchBanco('agencias', `id=eq.${corpo.id}`, { ...dados, atualizado_em: new Date().toISOString() });
    } else {
      if (!dados.nome) throw new ErroEnvio(400, 'Diga o nome da agência.');
      const r = await fetch(`${SUPABASE_URL}/rest/v1/agencias`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify(dados), signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new ErroEnvio(502, 'Não deu para salvar (o banco precisa da migração 009?).');
    }
    return { ok: true };
  },
  // Biblioteca de respostas (atalhos "/" da equipe, respostas fixas e de referência do Gilberto)
  'POST /api/resposta': async (corpo, eu) => {
    const dados = {};
    if (corpo.pergunta !== undefined) dados.pergunta = String(corpo.pergunta || '').trim().slice(0, 300);
    if (corpo.resposta !== undefined) dados.resposta = String(corpo.resposta || '').trim().slice(0, 4000);
    if (corpo.atalho !== undefined) dados.atalho = String(corpo.atalho || '').trim().toLowerCase().replace(/^\//, '').replace(/[^a-z0-9à-ú_-]/g, '').slice(0, 30) || null;
    if (corpo.fixa !== undefined) dados.fixa = !!corpo.fixa;
    if (corpo.valida_ate !== undefined) { if (corpo.valida_ate && !/^\d{4}-\d{2}-\d{2}$/.test(corpo.valida_ate)) throw new ErroEnvio(400, 'Data inválida.'); dados.valida_ate = corpo.valida_ate || null; }
    if (corpo.ativo !== undefined) dados.ativo = !!corpo.ativo;
    if (corpo.origem !== undefined) { if (!['equipe', 'questionario', 'revisao', 'correcao'].includes(corpo.origem)) throw new ErroEnvio(400, 'Origem inválida.'); dados.origem = corpo.origem; }
    if (corpo.id) {
      if (!/^[0-9a-f-]{36}$/i.test(corpo.id)) throw new ErroEnvio(400, 'Resposta inválida.');
      if (dados.pergunta === '' || dados.resposta === '') throw new ErroEnvio(400, 'Pergunta e resposta são obrigatórias.');
      const r = await fetch(`${SUPABASE_URL}/rest/v1/respostas?id=eq.${corpo.id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ ...dados, atualizado_em: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
      if (r.status === 409) throw new ErroEnvio(409, 'Esse atalho já está em uso.');
      if (!r.ok) throw new ErroEnvio(502, 'Não deu para salvar.');
    } else {
      if (!dados.pergunta || !dados.resposta) throw new ErroEnvio(400, 'Pergunta e resposta são obrigatórias.');
      const r = await fetch(`${SUPABASE_URL}/rest/v1/respostas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ ...dados, criado_por: eu.id }), signal: AbortSignal.timeout(5000) });
      if (r.status === 409) throw new ErroEnvio(409, 'Esse atalho já está em uso.');
      if (!r.ok) throw new ErroEnvio(502, 'Não deu para salvar' + (dados.origem === 'correcao' ? ' (o banco precisa da migração 015?).' : ' (o banco precisa da migração 009?).'));
    }
    limparCatalogo();
    return { ok: true };
  },
  // Questionário (o que o Gilberto sabe) e a importação para a biblioteca
  'GET /api/conhecimento': async () => ({ ok: true, secoes: gilberto.questionario() }),
  'POST /api/importar-questionario': async (corpo, eu) => {
    const ex = await fetch(`${SUPABASE_URL}/rest/v1/respostas?ativo=eq.true&select=pergunta`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    if (!ex.ok) throw new ErroEnvio(503, 'A biblioteca ainda não está no banco (falta a migração 009).');
    const ja = new Set((await ex.json()).map(x => x.pergunta.trim().toLowerCase()));
    const novas = gilberto.questionario().flatMap(sec => sec.itens.filter(i => i.p && !ja.has(i.p.toLowerCase())).map(i => ({ pergunta: i.p.slice(0, 300), resposta: i.r.slice(0, 4000), origem: 'questionario', criado_por: eu.id })));
    if (novas.length) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/respostas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify(novas), signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new ErroEnvio(502, 'Não deu para importar' + (r.status === 400 ? ' (o banco precisa da migração 010)' : '') + '.');
    }
    limparCatalogo();
    return { ok: true, importadas: novas.length };
  },
  'POST /api/resposta-uso': async corpo => {
    if (!/^[0-9a-f-]{36}$/i.test(String(corpo.id || ''))) throw new ErroEnvio(400, 'Resposta inválida.');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/respostas?id=eq.${corpo.id}&select=usos`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    const atual = r.ok ? (await r.json())[0] : null;
    if (atual) await patchBanco('respostas', `id=eq.${corpo.id}`, { usos: (atual.usos || 0) + 1 });
    return { ok: true };
  },
  // Revisão das sugestões do Gilberto: usada, descartada (com motivo), aprovada ou reprovada
  'POST /api/sugestao': async (corpo, eu) => {
    if (!/^[0-9a-f-]{36}$/i.test(String(corpo.id || ''))) throw new ErroEnvio(400, 'Sugestão inválida.');
    if (!['usada', 'descartada', 'aprovada', 'reprovada'].includes(corpo.situacao)) throw new ErroEnvio(400, 'Situação inválida.');
    await patchBanco('sugestoes', `id=eq.${corpo.id}`, { situacao: corpo.situacao, motivo: String(corpo.motivo || '').slice(0, 300) || null, revisada_por: eu.id, revisada_em: new Date().toISOString() });
    return corpo.situacao === 'usada' ? registrarUso(corpo.id, eu.id) : { ok: true };
  },
  // Testar o agente: conversa de mentira, sem WhatsApp e sem gravar orçamento
  'POST /api/testar': async corpo => {
    const msgs = Array.isArray(corpo.mensagens) ? corpo.mensagens.slice(-30) : [];
    await atualizarFotos().catch(() => {});
    if (!msgs.length) throw new ErroEnvio(400, 'Escreva a mensagem do cliente.');
    const historico = msgs.map((m, i) => ({ direcao: m.de === 'hotel' ? 'saida' : 'entrada', tipo: 'text', corpo: String(m.texto || '').slice(0, 4000), enviada_em: new Date(Date.now() - (msgs.length - i) * 60000).toISOString() }));
    const executores = {
      gerar_orcamento: async e => { const c = await cotacaoParaOrcamento(e); if (!c.ok) return c; const m = orcamento.montar(e, c); return m.erro ? { ok: false, erro: m.erro } : { ok: true, link: URL_PUBLICA + '/o/TESTE-sem-link-real', fonte: c.fonte, opcoes: m.opcoes, aviso: 'Teste: nenhum orçamento foi gravado.' }; },
      enviar_fotos: async e => { const f = orcamento.escolherFotos(e); return f.length ? { ok: true, modo: 'sugestao', fotos: f.map(x => ({ arquivo: x.arquivo, descricao: x.descricao })) } : { ok: false, erro: 'Sem foto na biblioteca para esse pedido.' }; },
      enviar_video: async e => { const v = orcamento.escolherVideo(e, []); return v ? { ok: true, video: { arquivo: v.arquivo, descricao: v.descricao, categoria: v.nome_grupo }, aviso: 'Teste: o vídeo não é enviado aqui.' } : { ok: false, erro: 'Ainda não há vídeo no banco sobre isso. Siga sem vídeo.' }; },
      enviar_link_extras: async e => vitrine.TEMAS[e.tema] ? { ok: true, link: URL_PUBLICA + '/e/TESTE-sem-link-real', tema: vitrine.TEMAS[e.tema].nome, aviso: 'Teste: nenhum link foi criado.' } : { ok: false, erro: 'Tema inválido.' },
      criar_reserva: async () => ({ ok: true, pendente_aprovacao: true, aviso: 'Teste: nenhuma reserva foi criada. Chame gerar_cobranca na forma escolhida.' }),
      gerar_cobranca: async e => ({ ok: true, marcador: e.forma === 'cartao' ? '[[link do cartão]]' : '[[PIX]]', aviso: 'Teste: nada foi criado. Escreva o marcador sozinho num balão.' }),
      abrir_alerta: async e => MOTIVOS_ALERTA[e.motivo] ? { ok: true, aviso: 'Teste: nenhum alerta foi aberto.' } : { ok: false, erro: 'Motivo inválido.' },
    };
    try { return { ok: true, ...(await gilberto.sugerir(historico, { canal: 'wa', nome: String(corpo.nome || 'Cliente de teste') }, executores, await catalogo())) }; }
    catch (e) { if (e instanceof gilberto.ErroSugestao) throw new ErroEnvio(e.http, e.message); throw e; }
  },
  // Banco de imagens no Drive: pastas e fotos (para escolher o que entra na biblioteca)
  'GET /api/drive': errosDrive(async (corpo, eu, url) => {
    await atualizarFotos();
    const l = await drive.listar(url.searchParams.get('pasta') || '');
    const ja = {};
    for (const g of orcamento.biblioteca()) for (const f of g.fotos) if (f.drive_id) (ja[f.drive_id] = ja[f.drive_id] || []).push(g.nome);
    return { ok: true, ...l, fotos: l.fotos.map(f => ({ ...f, na_biblioteca: ja[f.id] || [] })) };
  }),
  // Traz uma foto do Drive para uma categoria da biblioteca (recorte 4:3, 1200x900)
  'POST /api/foto': errosDrive(async (corpo, eu) => {
    await atualizarFotos(fetch, true);
    const apto = corpo.apartamento != null && corpo.apartamento !== '' ? orcamento.apartamentos().find(a => Number(a.numero) === Number(corpo.apartamento)) : null;
    if (corpo.apartamento != null && corpo.apartamento !== '' && !apto) throw new ErroEnvio(400, 'Apartamento não encontrado (falta rodar a migração 026?).');
    const grupo = apto ? apto.categoria : String(corpo.grupo || '');
    if (!orcamento.GRUPOS.includes(grupo)) throw new ErroEnvio(400, 'Escolha a categoria.');
    if (!drive.idValido(corpo.drive_id)) throw new ErroEnvio(400, 'Escolha a foto do Drive.');
    const descricao = String(corpo.descricao || '').trim().slice(0, 300);
    if (descricao.length < 8) throw new ErroEnvio(400, 'Descreva ' + (corpo.video ? 'o vídeo' : 'a foto') + ' (o Gilberto usa a descrição para escolher o que mandar).');
    const etiquetas = [...new Set([orcamento.nomeGrupo(grupo).toLowerCase(), ...(Array.isArray(corpo.etiquetas) ? corpo.etiquetas : [])
      .map(t => String(t).trim().toLowerCase().slice(0, 40)).filter(Boolean)])].slice(0, 10);
    await atualizarFotos(fetch, true);
    const g = orcamento.biblioteca().find(x => x.grupo === grupo);
    if (g && g.fotos.some(f => f.drive_id === corpo.drive_id)) throw new ErroEnvio(409, 'Esse arquivo já está em ' + g.nome + '.');
    let arquivo, reduzido = null;
    if (corpo.video) { // vídeo (MP4 até 16 MB): vai inteiro para o Storage e sai por /videos/<arquivo>
      const v = await drive.prepararVideo(corpo.drive_id), mp4 = v.mp4;
      if (v.convertido) reduzido = { de: v.mb, para: v.mb_final };
      arquivo = `${grupo}-v${crypto.randomBytes(4).toString('hex')}.mp4`;
      await gravarNoStorage('biblioteca/' + arquivo, mp4, 'video/mp4', fetch, 120000);
    } else {
      const { jpg } = await drive.prepararFoto(corpo.drive_id);
      arquivo = `${grupo}-d${crypto.randomBytes(4).toString('hex')}.jpg`;
      await gravarNoStorage('biblioteca/' + arquivo, jpg, 'image/jpeg', fetch);
      bytesFotos.set(arquivo, jpg);
    }
    await gravarFotoAjuste({ arquivo, grupo, descricao, etiquetas, decoracao: !!corpo.decoracao, drive_id: corpo.drive_id, origem: 'drive', ativo: true, criado_por: eu.id, ...(apto ? { apartamento: Number(apto.numero) } : {}) });
    await atualizarFotos(fetch, true);
    return { ok: true, foto: { arquivo, grupo, descricao, etiquetas, decoracao: !!corpo.decoracao, video: orcamento.ehVideo(arquivo), apartamento: apto ? Number(apto.numero) : null }, ...(reduzido ? { reduzido } : {}) };
  }),
  // Tira uma foto da biblioteca (ou devolve). Nada é apagado: some do envio, da página do orçamento e do Gilberto.
  'POST /api/foto-status': async corpo => {
    const arquivo = String(corpo.arquivo || '');
    await atualizarFotos(fetch, true);
    const todas = orcamento.biblioteca({ todas: true });
    const g = todas.find(x => [...x.fotos, ...x.removidas].some(f => f.arquivo === arquivo));
    if (!g) throw new ErroEnvio(404, 'Foto não encontrada na biblioteca.');
    const ativo = corpo.ativo !== false;
    if (fotoDoDrive(arquivo)) await patchBanco('fotos_biblioteca', 'arquivo=eq.' + encodeURIComponent(arquivo), { ativo, atualizado_em: new Date().toISOString() });
    else await gravarFotoAjuste({ arquivo, grupo: g.grupo, origem: 'base', ativo });
    await atualizarFotos(fetch, true);
    return { ok: true, arquivo, ativo };
  },
  // Liga uma foto a um apartamento (ou desliga, com apartamento null): a foto passa para a categoria do apartamento
  'POST /api/foto-apartamento': async corpo => {
    const arquivo = String(corpo.arquivo || '');
    await atualizarFotos(fetch, true);
    const todas = orcamento.biblioteca({ todas: true });
    const g = todas.find(x => [...x.fotos, ...x.removidas].some(f => f.arquivo === arquivo));
    if (!g) throw new ErroEnvio(404, 'Foto não encontrada na biblioteca.');
    const f = [...g.fotos, ...g.removidas].find(x => x.arquivo === arquivo);
    const n = corpo.apartamento == null || corpo.apartamento === '' ? null : Number(corpo.apartamento);
    const apto = n == null ? null : orcamento.apartamentos().find(a => Number(a.numero) === n);
    if (n != null && !apto) throw new ErroEnvio(400, orcamento.apartamentos().length ? 'Apartamento não encontrado.' : 'Os apartamentos ainda não estão no banco: falta rodar a migração 026 no Supabase.');
    const viva = fotoDoDrive(arquivo);
    try {
      if (viva) await patchBanco('fotos_biblioteca', 'arquivo=eq.' + encodeURIComponent(arquivo), { apartamento: n, ...(apto ? { grupo: apto.categoria } : {}), atualizado_em: new Date().toISOString() });
      else await gravarFotoAjuste({ arquivo, grupo: g.grupo, origem: 'base', ativo: f.ativo !== false, apartamento: n });
    } catch (e) { if (e instanceof ErroEnvio && ![400, 503].includes(e.http)) throw e; throw new ErroEnvio(503, 'O banco recusou: falta rodar a migração 026 no Supabase (crm/banco/026_apartamentos.sql).'); }
    await atualizarFotos(fetch, true);
    return { ok: true, arquivo, apartamento: n, grupo: apto ? apto.categoria : g.grupo };
  },
  // O que distingue cada apartamento (camas, vista, andar): vai junto com as fotos para o Gilberto
  'POST /api/apartamento': async corpo => {
    const n = Number(corpo.numero);
    if (!orcamento.apartamentos().some(a => Number(a.numero) === n)) { await atualizarFotos(fetch, true); if (!orcamento.apartamentos().some(a => Number(a.numero) === n)) throw new ErroEnvio(404, 'Apartamento não encontrado (falta rodar a migração 026?).'); }
    const descricao = String(corpo.descricao || '').trim().slice(0, 300) || null;
    await patchBanco('apartamentos', 'numero=eq.' + n, { descricao, atualizado_em: new Date().toISOString() });
    await atualizarFotos(fetch, true);
    return { ok: true, numero: n, descricao };
  },
  // Vagas por tipo e dia (painel "Vagas")
  'GET /api/vagas': async (corpo, eu, url) => silbeck.vagas(url.searchParams.get('inicio'), url.searchParams.get('dias')),
};

// ---------- Transcrição de áudio ----------
// Pedida pela tela (ao mostrar um áudio) ou antes da sugestão do Gilberto. Uma por vez por mensagem.
const transcrevendo = new Map();
async function transcreverMensagem(msg, buscar = fetch) {
  if (transcrevendo.has(msg.id)) return transcrevendo.get(msg.id);
  const p = (async () => {
    let dados;
    if (msg.midia_caminho) dados = await lerDoStorage(msg.midia_caminho, buscar);
    else if (msg.midia_id && WA_TOKEN) dados = (await baixarDaMeta(msg.midia_id, buscar)).dados;
    else return { status: 'falhou', texto: '' };
    let r;
    try { r = await transcricao.transcrever(dados, buscar); } catch (e) {
      if (!(e instanceof transcricao.ErroTranscricao)) throw e;
      console.warn(JSON.stringify({ evento: 'transcricao_falhou', status: e.status, erro: String(e.message).slice(0, 200) }));
      r = { status: e.status, texto: '' };
    }
    if (r.status !== 'falhou') { // falha passageira não fica gravada: tenta de novo na próxima vez
      await buscar(`${SUPABASE_URL}/rest/v1/mensagens?id=eq.${msg.id}`, {
        method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' },
        body: JSON.stringify({ transcricao: r.texto || null, transcricao_status: r.status }), signal: AbortSignal.timeout(5000),
      }).catch(() => {});
      if (r.texto && msg.conversa_id && msg.direcao !== 'saida') await conferirPedido(r.texto, msg.conversa_id, buscar).catch(() => {}); // áudio também
    }
    return r;
  })().finally(() => transcrevendo.delete(msg.id));
  transcrevendo.set(msg.id, p);
  return p;
}
async function transcreverParaEquipe(tokenUsuario, corpo, buscar = fetch) {
  if (!bancoLigado()) throw new ErroEnvio(503, 'O banco ainda não está configurado.');
  const id = String(corpo.mensagem_id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ErroEnvio(400, 'Mensagem inválida.');
  await autenticarEquipe(tokenUsuario, buscar);
  const r = await buscar(`${SUPABASE_URL}/rest/v1/mensagens?id=eq.${id}&select=id,conversa_id,direcao,tipo,midia_id,midia_caminho,transcricao,transcricao_status`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new ErroEnvio(503, 'A transcrição ainda não está ligada no banco (falta a migração 005).');
  const msg = (await r.json())[0];
  if (!msg || msg.tipo !== 'audio') throw new ErroEnvio(404, 'Áudio não encontrado.');
  if (msg.transcricao_status && msg.transcricao_status !== 'falhou') return { ok: true, status: msg.transcricao_status, texto: msg.transcricao || '' };
  return { ok: true, ...(await transcreverMensagem(msg, buscar)) };
}

// Sugestão do Gilberto para a última mensagem do cliente (não envia nada).
const sugerindo = new Set();
async function sugerirParaEquipe(tokenUsuario, corpo, buscar = fetch) {
  if (!bancoLigado()) throw new ErroEnvio(503, 'O banco ainda não está configurado.');
  const id = String(corpo.conversa_id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ErroEnvio(400, 'Conversa inválida.');
  const eu = await autenticarEquipe(tokenUsuario, buscar);
  const r = await gerarResposta(id, { modo: 'sugestao', eu }, buscar);
  delete r.cobranca;
  return r;
}
// Núcleo do Gilberto: lê a conversa, chama a IA com as ferramentas e registra a sugestão.
// modo 'sugestao': nada que grave fora do CRM acontece antes de a equipe aprovar.
// modo 'automatico': as ferramentas executam na hora (reserva no Silbeck, Pix) e quem envia é responderSozinho.
// Mensagem do cliente que chegou enquanto o Gilberto ainda mandava a resposta anterior (que não a leu): no
// histórico ela fica antes dessa resposta e a conversa parece respondida. Para o Gilberto, as mensagens do cliente
// que a resposta anterior não leu vão para o fim, depois das respostas que já estavam saindo.
// vistoAte: horário da última mensagem do cliente que a resposta anterior leu (guardado ao enviar).
const vistoAte = new Map();
function emOrdemDeLeitura(historico, mensagemId, visto = null) {
  const i = mensagemId ? historico.findIndex(m => m.id === mensagemId) : -1;
  if (i < 0) return historico;
  const naoLida = (m, k) => m.direcao === 'entrada' && (visto ? String(m.enviada_em) > visto : k >= i);
  const pendentes = historico.filter(naoLida);
  if (!pendentes.length) return historico;
  const primeira = historico.findIndex(naoLida);
  if (!historico.slice(primeira).some(m => m.direcao !== 'entrada')) return historico; // nada saiu depois: ordem já certa
  return [...historico.filter((m, k) => !naoLida(m, k)), ...pendentes];
}
async function gerarResposta(id, { modo, eu, mensagemId = null, gatilho = null, retomada = false }, buscar = fetch) {
  const auto = modo === 'automatico';
  await atualizarFotos(buscar).catch(() => {});
  if (sugerindo.has(id)) throw new ErroEnvio(429, 'Já estou preparando uma sugestão para esta conversa.');
  sugerindo.add(id);
  try {
    const c = await buscar(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${id}&select=id,canal,numero_id,contato:contatos(nome)`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    const conv = c.ok ? (await c.json())[0] : null;
    if (!conv) throw new ErroEnvio(404, 'Conversa não encontrada.');
    const url = campos => `${SUPABASE_URL}/rest/v1/mensagens?conversa_id=eq.${id}&select=${campos}&order=enviada_em.desc&limit=40`;
    let h = await buscar(url('id,conversa_id,direcao,tipo,corpo,enviada_em,midia_id,midia_caminho,transcricao,transcricao_status'), { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    if (!h.ok) h = await buscar(url('direcao,tipo,corpo,enviada_em'), { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }); // banco sem a migração 005
    const historico = retomada ? (h.ok ? (await h.json()).reverse() : []) // retomada: ordem real (a última é do hotel)
      : emOrdemDeLeitura(h.ok ? (await h.json()).reverse() : [], mensagemId, mensagemId ? vistoAte.get(id) : null);
    // Áudios do cliente ainda sem texto: transcreve os 3 mais recentes antes de o Gilberto ler.
    const pendentes = historico.filter(m => m.tipo === 'audio' && m.direcao === 'entrada' && m.id && (!m.transcricao_status || m.transcricao_status === 'falhou')).slice(-3);
    await Promise.all(pendentes.map(m => transcreverMensagem(m, buscar).then(r => { m.transcricao = r.texto; m.transcricao_status = r.status; }).catch(() => {})));
    const nome = conv.contato && conv.contato.nome;
    let reservaPendente = null, reservaCriada = null, cobrancaGerada = null, videoNoTurno = null, reservaPorEquipe = false;
    const executores = {
      gerar_orcamento: entrada => criarOrcamento(entrada, { conversa_id: conv.id, numero_id: conv.numero_id, primeiro_nome: nome, criado_por: 'gilberto' }, buscar),
      // Link de extras: criado agora, mas só conta como oferta quando a equipe enviar a sugestão
      enviar_link_extras: async e => {
        const cat = await catalogo(buscar).catch(() => null);
        const nomes = ((cat || {}).produtos || []).filter(p => p.vitrine === e.tema).map(p => p.nome);
        if (!nomes.length) return { ok: false, erro: 'Não há produtos ativos nesse tema. Não ofereça.' };
        const v = await criarVitrine(conv.id, e.tema, { por: 'gilberto', enviada: false }, buscar);
        // Automático: o CRM manda o cartão com foto e botão "Ver as opções" logo depois da mensagem (dono, 07/10/2026)
        if (auto) return { ok: true, vitrine_id: v.id, tema: vitrine.TEMAS[e.tema].nome, produtos: nomes,
          aviso: 'O CRM envia, logo depois da sua mensagem, um cartão com foto e o botão para ver as opções. NÃO escreva o link no texto: só uma frase curta convidando a ver as opções no cartão abaixo.' };
        return { ok: true, link: v.link, vitrine_id: v.id, tema: vitrine.TEMAS[e.tema].nome, produtos: nomes };
      },
      // Aceite: confere a frase do cliente, os dados do titular, a vaga e o preço AGORA. A reserva (não confirmada) e o
      // Pix são criados no Silbeck e no banco quando a equipe aprova o envio (no modo automático, na hora).
      criar_reserva: async e => {
        const sem = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
        const lit = sem(e.aceite_cliente_literal);
        if (lit.length < 2 || !historico.some(m => m.direcao === 'entrada' && sem(m.transcricao || m.corpo).includes(lit))) return { ok: false, erro: 'Não achei essa frase de aceite nas mensagens do cliente. Só reserve com aceite explícito.' };
        const o = (await getJson(`${SUPABASE_URL}/rest/v1/orcamentos?conversa_id=eq.${conv.id}&select=id,opcoes,data_entrada,data_saida,adultos,criancas_idades&order=criado_em.desc&limit=1`, buscar))[0];
        const op = o && opcaoDoOrcamento(o, e.opcao_codigo);
        if (!op) return { ok: false, erro: 'Essa acomodação (ou combinação) não está no último orçamento desta conversa. Gere um orçamento com ela antes.' };
        const titular = String(e.titular_nome_completo || '').trim().replace(/\s+/g, ' ');
        if (titular.split(' ').length < 2) return { ok: false, erro: 'Peça o nome completo do titular antes de reservar.' };
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e.email || ''))) return { ok: false, erro: 'Peça o e-mail do titular antes de reservar.' };
        const estadia = { data_entrada: o.data_entrada, data_saida: o.data_saida, adultos: o.adultos, idades_criancas: o.criancas_idades || [] };
        const c = op.combinacao // combinação: confere as mesmas acomodações com a mesma divisão do orçamento
          ? await silbeck.cotarCombinacao({ ...estadia, grupos_por_acomodacao: op.acomodacoes.map(a => ({ adultos: a.adultos, idades_criancas: a.idades_criancas || [] })) }, op.acomodacoes.map(a => a.codigo), buscar).catch(er => ({ ok: false, erro: er.message }))
          : await silbeck.cotar(estadia, buscar).catch(er => ({ ok: false, erro: er.message }));
        if (!c.ok && !c.sem_vaga) return { ok: false, erro: 'Não consegui conferir a vaga agora (' + c.erro + '). Avise a equipe com abrir_alerta.' };
        const atual = op.combinacao ? (c.ok ? c.opcao : null) : c.opcoes.find(x => x.codigo === op.codigo);
        if (!atual) return { ok: false, sem_vaga: true, erro: op.nome + ' não tem mais vaga nessas datas. Avise o cliente e ofereça as opções que ainda têm vaga.' };
        if (Math.abs(atual.valor_total - Number(op.valor_total)) > 0.5) return { ok: false, preco_mudou: true, valor_novo: atual.valor_total, erro: 'O valor mudou desde o orçamento: avise o cliente, gere um orçamento novo e peça um novo OK.' };
        reservaPendente = { opcao_codigo: op.codigo, titular, email: String(e.email).trim(), acompanhantes: (e.acompanhantes || []).map(String).filter(Boolean).slice(0, 20),
          acomodacao: op.nome, valor_total: op.valor_total, periodo: orcamento.periodo(o.data_entrada, o.data_saida) };
        if (auto && travaReservas()) { // etapa 1 do Silbeck real: a equipe fecha a reserva e manda o pagamento
          await alertaAtendimento('gilberto_passou', conv.id, 'Cliente aceitou e quer reservar: ' + op.nome + ', ' + reservaPendente.periodo + ', ' + produtos.brl(op.valor_total)
            + ' (vaga e preço conferidos agora no Silbeck). Titular: ' + titular + ' · e-mail: ' + reservaPendente.email + (reservaPendente.acompanhantes.length ? ' · acompanhantes: ' + reservaPendente.acompanhantes.join(', ') : '')
            + '. Fechar a reserva no Silbeck e mandar o pagamento ao cliente (o Pix automático ainda está em teste).', buscar, 'Gilberto: cliente quer reservar').catch(() => {});
          reservaPendente = null; reservaPorEquipe = true;
          return { ok: true, reserva_pela_equipe: true, acomodacao: op.nome, valor_total: op.valor_total,
            aviso: 'Vaga e preço conferidos agora. Nesta fase quem fecha a reserva e manda o pagamento é a EQUIPE, que já foi avisada com os dados. Diga ao cliente que a equipe está garantindo a reserva e manda os dados de pagamento em instantes (no horário de atendimento). Não diga que está reservado ou confirmado e NÃO chame gerar_cobranca.' };
        }
        if (auto) { // modo automático: a reserva nasce agora no Silbeck (não confirmada)
          try { reservaCriada = await criarReservaSilbeck(conv.id, reservaPendente, { usuario: null, origem: 'gilberto' }, buscar); }
          catch (er) { reservaPendente = null; return { ok: false, erro: 'Não consegui reservar agora: ' + er.message + ' Avise o cliente e use abrir_alerta.' }; }
          return { ok: true, reserva_silbeck: reservaCriada.silbeck_id, acomodacao: op.nome, valor_total: reservaCriada.valor_total,
            aviso: 'Reserva ' + reservaCriada.silbeck_id + ' criada no Silbeck (não confirmada, aguardando pagamento). Agora chame gerar_cobranca na forma escolhida. Não diga que está confirmada.' };
        }
        return { ok: true, pendente_aprovacao: true, acomodacao: op.nome, valor_total: op.valor_total, reserva: reservaPendente,
          aviso: 'Vaga e preço conferidos agora. A reserva é criada no Silbeck (não confirmada, aguardando pagamento) quando a equipe aprovar o envio. Chame gerar_cobranca na forma escolhida, nesta mesma resposta.' };
      },
      gerar_cobranca: async e => {
        if (auto && (reservaPorEquipe || travaReservas())) return { ok: false, erro: 'Nesta fase o pagamento é mandado pela equipe (já avisada). Não escreva marcador: diga que a equipe manda os dados de pagamento em instantes.' };
        const pct = e.percentual === 100 ? 100 : 50, forma = e.forma === 'cartao' ? 'cartao' : 'pix';
        const existente = reservaCriada || (reservaPendente ? null : (await getJson(`${SUPABASE_URL}/rest/v1/reservas?conversa_id=eq.${conv.id}&situacao=eq.nao_confirmada&select=id,silbeck_id,acomodacao,valor_total,data_entrada,data_saida&order=criado_em.desc&limit=1`, buscar))[0]);
        // Trava do dono (04/10/2026): dados de pagamento só depois de a reserva existir no Silbeck
        const base = auto ? existente : (reservaPendente || existente);
        if (!base) return { ok: false, erro: 'Ainda não há reserva no Silbeck: os dados de pagamento só saem depois da reserva. Use criar_reserva antes.' };
        const valor = Math.round(Number(base.valor_total) * pct) / 100;
        const descricao = (pct === 100 ? 'Valor total' : 'Sinal 50%') + ' · ' + base.acomodacao + ' (' + (base.periodo || orcamento.periodo(base.data_entrada, base.data_saida)) + ')';
        if (auto) {
          if (forma === 'pix') {
            if (cobrancaGerada) return { ok: true, marcador: '[[PIX]]', valor: cobrancaGerada.valor, aviso: 'O Pix já foi gerado nesta resposta: escreva [[PIX]] uma vez.' };
            cobrancaGerada = await criarCobrancaPix(conv.id, { tipo: pct === 100 ? 'total' : 'sinal', valor, descricao, reserva_id: existente.id }, null, buscar);
            return { ok: true, marcador: '[[PIX]]', valor, aviso: 'Pix gerado. Escreva [[PIX]] sozinho num balão: o CRM troca pelo valor, o prazo, os dados da conta e o copia e cola.' };
          }
          await tarefaLinkCartao(existente, valor, pct, null, buscar);
          return { ok: true, valor, aviso: 'O link do cartão a equipe gera na Cielo e manda em instantes (tarefa criada). Diga isso ao cliente, sem marcador.' };
        }
        return { ok: true, marcador: forma === 'pix' ? '[[PIX]]' : '[[link do cartão]]', valor,
          aviso: forma === 'pix' ? 'Escreva [[PIX]] sozinho num balão: o CRM troca pelo Pix (valor, prazo, dados da conta e copia e cola) quando a equipe aprovar.' : 'Escreva [[link do cartão]] sozinho num balão: a equipe gera o link na Cielo e cola (o CRM cria a tarefa).',
          pagamento: { forma, percentual: pct, valor, descricao, tipo: pct === 100 ? 'total' : 'sinal', reserva_id: existente ? existente.id : null } };
      },
      // Passa o caso para a equipe: alerta no sino e no celular (plantão primeiro), com o resumo do Gilberto
      abrir_alerta: async e => {
        const rot = MOTIVOS_ALERTA[e.motivo];
        if (!rot) return { ok: false, erro: 'Motivo inválido.' };
        await alertaAtendimento(TIPO_DO_MOTIVO[e.motivo] || 'gilberto_passou', conv.id, String(e.resumo || ''), buscar, 'Gilberto: ' + rot);
        return { ok: true, aviso: 'A equipe foi avisada (quem está de plantão primeiro). Você continua na conversa: diga ao cliente nesta mesma mensagem que a equipe vai entrar em contato (no prazo do expediente), sem prometer o resultado, e siga ajudando no que puder. Se o cliente escrever de novo, responda sempre.' };
      },
      // Modo sugestão: o Gilberto escolhe as fotos; quem envia é a equipe, pelo painel da sugestão.
      // Vídeo do banco do hotel: um por resposta e nunca o mesmo duas vezes na conversa
      enviar_video: async entrada => {
        if (videoNoTurno) return { ok: false, erro: 'Já há um vídeo nesta resposta: um por vez.' };
        const ja = historico.filter(m => m.midia_caminho && orcamento.ehVideo(m.midia_caminho)).map(m => m.midia_caminho.slice('biblioteca/'.length));
        const v = orcamento.escolherVideo(entrada, ja);
        if (!v) return { ok: false, erro: orcamento.videos().length ? 'Não há vídeo novo sobre isso no banco (ou ele já foi enviado nesta conversa). Siga sem vídeo.' : 'Ainda não há vídeos no banco do hotel. Siga sem vídeo.' };
        videoNoTurno = v.arquivo;
        return { ok: true, video: { arquivo: v.arquivo, descricao: v.descricao, categoria: v.nome_grupo }, aviso: auto ? 'O vídeo vai logo depois da sua mensagem: apresente-o em uma frase (o que ele mostra e por que vale ver), sem descrevê-lo como se você o tivesse gravado.' : 'Nesta fase a equipe envia o vídeo junto com a sua mensagem: apresente-o em uma frase.' };
      },
      enviar_fotos: async entrada => {
        const fotos = orcamento.escolherFotos(entrada);
        return fotos.length
          ? { ok: true, modo: 'sugestao', fotos: fotos.map(f => ({ arquivo: f.arquivo, descricao: f.descricao })), aviso: 'Nesta fase a equipe envia as fotos junto com a sua mensagem: escreva o texto como se as fotos fossem logo em seguida, sem descrevê-las como se você as tivesse tirado.' + AVISO_APTO }
          : { ok: false, erro: 'Não há foto na biblioteca para esse pedido. Não prometa foto: ofereça descrever ou avise a equipe nas notas_internas.' };
      },
    };
    const neg = await negocioDaConversa(conv.id, 'id,perfil', buscar).catch(() => null);
    const retomar = neg && neg.etapa === 'orc' && (await getJson(`${SUPABASE_URL}/rest/v1/tarefas?negocio_id=eq.${neg.id}&tipo=eq.${encodeURIComponent(TIPO_RETOMAR)}&feita=eq.false&select=id&limit=1`, buscar)).length;
    const jaVideos = historico.filter(m => m.midia_caminho && orcamento.ehVideo(m.midia_caminho)).map(m => m.midia_caminho.slice('biblioteca/'.length));
    const listaVideos = orcamento.videos().map(v => ({ categoria: v.nome_grupo, descricao: v.descricao, enviado: jaVideos.includes(v.arquivo) }));
    const r = await gilberto.sugerir(historico, { modo: auto ? 'automatico' : 'sugestao', canal: conv.canal, nome, videos: listaVideos, ofertas: await ofertasDaConversa(conv.id, buscar), reservaPaga: !!(neg && neg.etapa === 'res'), perfil: neg && neg.perfil, retomada, reservasPelaEquipe: auto && travaReservas(), gatilho: gatilho || (retomar ? 'retomar o orçamento enviado, sem resposta do cliente há mais de 24 h (follow-up, regra 10): traga algo novo e útil, sem repetir o orçamento nem pressionar' : null) }, executores, await catalogo(buscar));
    // Registro para a revisão (Ajustes do agente): o que o cliente perguntou e o que o Gilberto sugeriu
    const ultimaDoCliente = [...historico].reverse().find(m => m.direcao === 'entrada');
    const reg = await buscar(`${SUPABASE_URL}/rest/v1/sugestoes`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ conversa_id: conv.id, pergunta: ultimaDoCliente ? String(ultimaDoCliente.transcricao || ultimaDoCliente.corpo || '[' + ultimaDoCliente.tipo + ']').slice(0, 2000) : null,
        mensagem: r.mensagem, notas_internas: r.notas_internas, precisa_equipe: r.precisa_equipe, modelo: r.modelo,
        ferramentas: { cotacoes: r.cotacoes, orcamentos: r.orcamentos, fotos: (r.fotos || []).map(f => f.arquivo), produto_oferecido: r.produto_oferecido || null, vitrines: r.vitrines || [], reserva: r.reserva || null, pagamento: r.pagamento || null, alerta: !!r.alertou }, pedida_por: eu ? eu.id : null }) }).catch(() => null);
    const sugestaoId = reg && reg.ok ? ((await reg.json().catch(() => []))[0] || {}).id : null;
    if (r.precisa_equipe && !r.alertou) await alertaAtendimento('gilberto_passou', conv.id, r.notas_internas || 'O Gilberto indicou que este caso é para a equipe.', buscar).catch(() => {});
    let avisoRevisao = null;
    if (!sugestaoId) { // a sugestão vale, mas não entrou na Revisão: mostra o motivo para a equipe
      const det = reg ? (await reg.text().catch(() => '')).slice(0, 200) : 'sem resposta do banco';
      console.warn(JSON.stringify({ evento: 'sugestao_nao_registrada', http: reg && reg.status, erro: det }));
      avisoRevisao = 'A sugestão não entrou na Revisão (' + (reg ? 'erro ' + reg.status : 'banco fora') + (reg && reg.status === 404 ? ': falta a migração 009' : '') + ').';
    }
    const lidoAte = historico.filter(m => m.direcao === 'entrada' && m.enviada_em).map(m => String(m.enviada_em)).sort().pop() || null;
    return { ok: true, ...r, sugestao_id: sugestaoId || null, aviso_revisao: avisoRevisao, cobranca: cobrancaGerada, reserva_criada: reservaCriada, lido_ate: lidoAte };
  } catch (e) {
    if (e instanceof gilberto.ErroSugestao) throw new ErroEnvio(e.http, e.message);
    throw e;
  } finally { sugerindo.delete(id); }
}

function json(res, cod, obj) {
  res.writeHead(cod, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

// IP de saída do CRM na internet (deve ser o IP fixo 35.247.204.86, liberado no roteador do hotel para o Silbeck).
let ipSaida = null;
function conferirIpSaida() {
  fetch('https://api.ipify.org', { signal: AbortSignal.timeout(5000) }).then(r => r.text()).then(t => { ipSaida = t.trim().slice(0, 45); }).catch(() => {});
}

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/saude') {
    const base = { ok: true, servico: 'crm-cabanas', versao, segredos: { verify: !!VERIFY, appSecret: !!APP_SECRET, supabase: bancoLigado(), supabasePublica: chavePublicaOk(), whatsappToken: !!WA_TOKEN, anthropic: !!process.env.ANTHROPIC_API_KEY }, gilberto: { instrucoes: gilberto.sistemaPronto(), modelo: gilberto.MODELO, ferramentas: gilberto.ferramentas(), ultimaFalha: ultimaFalhaGilberto }, silbeck: silbeck.MODO(), pix: bb.MODO(), chaveSupabase: tipoChave(SUPABASE_KEY), ipSaida };
    if (!bancoLigado()) return json(res, 200, base);
    // Confere se o banco responde e se a chave tem permissão de servidor: chama a função de status com um
    // ID que não existe (não altera nada). Chave sem permissão de servidor recebe 401/403.
    rpc('registrar_status_whatsapp', { p_wamid: 'diagnostico', p_status: 'read', p_erro: null })
      .then(() => json(res, 200, { ...base, banco: 'ok' }))
      .catch(() => json(res, 200, { ...base, banco: 'erro', erro: ultimoErroBanco }))
      .catch(() => json(res, 200, { ...base, banco: 'sem conexão' }));
    return;
  }

  // Diagnóstico do WhatsApp para os modelos: contas (WABA) conhecidas, permissões do token e situação dos modelos.
  // Sem segredos: só IDs, nomes de permissão e nomes/situação dos modelos.
  if (url.pathname === '/saude/whatsapp' && req.method === 'GET') {
    (async () => {
      const contas = ((await getJson(`${SUPABASE_URL}/rest/v1/config?chave=eq.wabas&select=valor`, fetch).catch(() => []))[0] || {}).valor || {};
      const pr = WA_TOKEN ? await fetch(`${GRAPH}/me/permissions`, { headers: { Authorization: 'Bearer ' + WA_TOKEN }, signal: AbortSignal.timeout(8000) }).catch(() => null) : null;
      const pj = pr ? await pr.json().catch(() => ({})) : {};
      const permissoes = (pj.data || []).filter(x => x.status === 'granted').map(x => x.permission);
      const modelos = {};
      for (const [num, waba] of Object.entries({ ...contas, ...wabas })) {
        const m = await fetch(`${GRAPH}/${waba}/message_templates?fields=name,status&limit=100`, { headers: { Authorization: 'Bearer ' + WA_TOKEN }, signal: AbortSignal.timeout(8000) }).catch(() => null);
        const mj = m ? await m.json().catch(() => ({})) : {};
        modelos[num] = m && m.ok ? (mj.data || []).map(x => x.name + ': ' + x.status) : 'erro: ' + String(((mj.error || {}).message) || (m && m.status) || 'sem resposta').slice(0, 160);
      }
      json(res, 200, { ok: true, contas: { ...contas, ...wabas }, permissoes: permissoes.length ? permissoes : (pj.error ? 'erro: ' + String(pj.error.message || '').slice(0, 160) : []), modelos, ultimoErroMeta });
    })().catch(e => json(res, 500, { ok: false, erro: String(e.message || e).slice(0, 160) }));
    return;
  }
  // Diagnóstico da retomada automática: por que cada orçamento das últimas 48 h seria (ou não) retomado. Não manda nada.
  if (url.pathname === '/saude/retomada' && req.method === 'GET') {
    if (limiteExcedido(req)) return json(res, 429, { ok: false });
    retomadaAutomatica(fetch, Date.now(), { simular: true }).then(r => json(res, 200, { ok: true, ...r })).catch(e => json(res, 500, { ok: false, erro: String(e.message || e).slice(0, 160) }));
    return;
  }
  // Variações do pedido de preço (tarifário do motor). Sem dados de hóspedes.
  if (url.pathname === '/saude/silbeck-tarifario' && req.method === 'GET') {
    if (limiteExcedido(req)) return json(res, 429, { ok: false });
    silbeck.diagnosticoTarifario({ entrada: url.searchParams.get('entrada'), saida: url.searchParams.get('saida'), adultos: url.searchParams.get('adultos'), codigo: url.searchParams.get('codigo') || undefined })
      .then(r => json(res, 200, { ok: true, ...r })).catch(e => json(res, 500, { ok: false, erro: String(e.message || e).slice(0, 200) }));
    return;
  }
  // Preço por pensão no Silbeck (comparar com o motor de reservas). Sem dados de hóspedes.
  if (url.pathname === '/saude/silbeck-tarifa' && req.method === 'GET') {
    if (limiteExcedido(req)) return json(res, 429, { ok: false });
    silbeck.diagnosticoTarifa({ entrada: url.searchParams.get('entrada'), saida: url.searchParams.get('saida'), adultos: url.searchParams.get('adultos'), codigos: url.searchParams.get('codigos') || undefined })
      .then(r => json(res, 200, { ok: true, ...r })).catch(e => json(res, 500, { ok: false, erro: String(e.message || e).slice(0, 200) }));
    return;
  }
  // Cotação no Silbeck passo a passo (formato das respostas e a última falha do Gilberto). Sem dados de hóspedes.
  if (url.pathname === '/saude/silbeck-cotacao' && req.method === 'GET') {
    if (limiteExcedido(req)) return json(res, 429, { ok: false });
    silbeck.diagnosticoCotacao({ entrada: url.searchParams.get('entrada'), saida: url.searchParams.get('saida'), adultos: url.searchParams.get('adultos') })
      .then(r => json(res, 200, { ok: true, ...r })).catch(e => json(res, 500, { ok: false, erro: String(e.message || e).slice(0, 200) }));
    return;
  }
  // Teste da ponte com o Silbeck (porta, login, uma leitura). Sem dados sensíveis; resultado guardado por 60 s.
  if (url.pathname === '/saude/silbeck') {
    silbeck.diagnosticoCache()
      .then(r => json(res, 200, { ...r, ipSaida }))
      .catch(e => json(res, 200, { etapa: 'erro', erro: String(e.message || e).slice(0, 150), ipSaida }));
    return;
  }

  // Página pública de extras (/e/<token>) e o pedido do cliente
  const me = url.pathname.match(/^\/e\/([A-Za-z0-9_-]{22})(\/pedido)?$/);
  if (me) {
    if (limiteExcedido(req)) { res.writeHead(429, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '60' }); return res.end('Muitos acessos. Tente de novo em 1 minuto.'); }
    const token = me[1];
    const naoAchou = () => { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...cabecalhosSeguranca() }); res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hotel Cabanas</title><p style="font-family:sans-serif;padding:24px">Página não encontrada. Fale com a gente pelo WhatsApp.</p>'); };
    if (!me[2] && req.method === 'GET') {
      const previa = url.searchParams.get('previa') === '1';
      lerVitrine(token).then(async v => {
        if (!v) return naoAchou();
        await atualizarFotos().catch(() => {});
        const [cat, est] = await Promise.all([catalogo().catch(() => null), estadiaDaConversa(v.conversa_id)]);
        const prods = ((cat || {}).produtos || []).filter(p => p.vitrine === v.tema);
        if (!previa) await rpc('registrar_abertura_vitrine', { p_token: token }).catch(() => {});
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', ...cabecalhosSeguranca() });
        const ocupados = prods.some(p => p.tipo_reserva === 'terc') ? await ocupadosMassagem().catch(() => ({})) : {};
        res.end(vitrine.pagina(v, { produtos: prods, fotosDe: fotosDoProduto, estadia: est, previa, versao: encodeURIComponent(versao.replace(/[^\w.-]/g, '')), ocupados }));
      }).catch(() => { res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Página indisponível agora. Tente de novo em instantes.'); });
      return;
    }
    if (me[2] && req.method === 'POST') {
      lerCorpo(req, 8000).then(async corpo => {
        const v = await lerVitrine(token);
        if (!v) return json(res, 404, { ok: false, erro: 'Página não encontrada.' });
        const [cat, est] = await Promise.all([catalogo().catch(() => null), estadiaDaConversa(v.conversa_id)]);
        const prods = ((cat || {}).produtos || []).filter(p => p.vitrine === v.tema);
        const ped = vitrine.validarPedido(corpo.itens, prods, est);
        if (ped.erro) return json(res, 400, { ok: false, erro: ped.erro });
        if (!corpo.previa && ped.itens.some(it => it.horario)) {
          const oc = await ocupadosMassagem().catch(() => ({}));
          const tomado = ped.itens.find(it => it.horario && (oc[it.data] || []).includes(it.horario) && !(v.pedido || []).some(x => x.chave === it.chave));
          if (tomado) return json(res, 409, { ok: false, erro: 'O horário das ' + vitrine.horaBR(tomado.horario) + ' acabou de ser reservado. Escolha outro, por favor.' });
        }
        const linhas = ped.itens.map(it => vitrine.linhaItem(it, prods.find(p => p.codigo === it.codigo)));
        let avisado = false;
        if (!corpo.previa) {
          const anteriores = (v.pedido || []).map(x => x.chave), aceitos = [];
          for (const it of ped.itens.filter(x => !anteriores.includes(x.chave))) { // o mesmo item escolhido de novo não duplica
            const ro = await fetch(`${SUPABASE_URL}/rest/v1/ofertas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, signal: AbortSignal.timeout(5000),
              body: JSON.stringify({ conversa_id: v.conversa_id, negocio_id: v.negocio_id, produto_codigo: it.codigo, produto_nome: it.nome + (it.variacao ? ' (' + it.variacao + ')' : ''), por: 'pagina', situacao: 'aceito', respondido_em: new Date().toISOString() }) }).catch(() => null);
            const of = ro && ro.ok ? (await ro.json().catch(() => []))[0] : null;
            const ac = await aceiteDoCliente({ conversa_id: v.conversa_id, oferta_id: of && of.id, produto_codigo: it.codigo, variacao: it.variacao, origem: 'vitrine', quantidade: it.quantidade, adicionais: it.adicionais, data_uso: it.data, horario: it.horario, automatico: !!it.horario })
              .catch(err => { console.warn(JSON.stringify({ evento: 'aceite_vitrine', erro: String(err.message || err).slice(0, 200) })); return null; });
            if (ac && ac.venda && it.horario) { // massagem: o pedido vai direto para a parceira
              ac.pedidoParceiro = await pedirAParceira({ venda: ac.venda, item: it, conversa_id: v.conversa_id, negocio_id: ac.negocio_id || v.negocio_id, numeroId: est.numero_id, hospede: (est.primeiro_nome || '').split(/\s+/)[0] || null });
              if (!ac.pedidoParceiro) await criarAlerta({ conversa_id: v.conversa_id, negocio_id: ac.negocio_id || null, venda_id: ac.venda.id, tipo: 'produto_pedido', titulo: 'Cliente pediu produto',
                info: vitrine.linhaItem(it, prods.find(x => x.codigo === it.codigo)) + ' · escolheu na página de extras. O CRM não conseguiu mandar à massoterapeuta: peça o horário a ela e confirme com o cliente.' });
            }
            aceitos.push(ac);
          }
          avisado = !!(await avisarPedidoExtra(v.conversa_id, aceitos));
          await fetch(`${SUPABASE_URL}/rest/v1/vitrines?id=eq.${v.id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
            body: JSON.stringify({ pedido: [...(v.pedido || []), ...ped.itens.filter(x => !(v.pedido || []).some(y => y.chave === x.chave))], pedido_em: new Date().toISOString() }) }).catch(() => {});
        }
        const numero = est.numero_whatsapp || (est.numero_id ? await numeroWhatsapp(est.numero_id, fetch).catch(() => null) : null);
        // O cliente já recebeu "Recebi seu pedido" no WhatsApp: o botão só abre a conversa, sem mensagem pronta (dono, 06/10/2026)
        const texto = 'Oi! Escolhi na página de extras: ' + linhas.join('; ') + '.';
        json(res, 200, { ok: true, avisado, whatsapp: numero ? `https://wa.me/${numero}` + (avisado ? '' : `?text=${encodeURIComponent(texto)}`) : null });
      }).catch(e => json(res, e.http || 400, { ok: false, erro: e instanceof ErroEnvio ? e.message : 'Pedido inválido.' }));
      return;
    }
    return naoAchou();
  }

  // Páginas da massagem: a parceira (/p/<token>) responde; o hóspede (/mc/<token>) escolhe uma das opções dela
  const mp = url.pathname.match(/^\/(p|mc)\/([A-Za-z0-9_-]{22})$/);
  if (mp) {
    if (limiteExcedido(req)) { res.writeHead(429, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '60' }); return res.end('Muitos acessos. Tente de novo em 1 minuto.'); }
    const parc = mp[1] === 'p', token = mp[2];
    const ver = encodeURIComponent(versao.replace(/[^\w.-]/g, ''));
    const hoje = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
    const naoAchouPagina = () => { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...cabecalhosSeguranca() }); res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hotel Cabanas</title><p style="font-family:sans-serif;padding:24px">Pedido não encontrado. Fale com a gente pelo WhatsApp.</p>'); };
    (async () => {
      const pd = await pedidoParceiro((parc ? 'token_parceiro' : 'token_cliente') + '=eq.' + token);
      if (!pd) return naoAchouPagina();
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...cabecalhosSeguranca() });
        if (!parc) return res.end(massagem.paginaCliente(pd, { versao: ver, nome: await primeiroNome(pd.conversa_id).catch(() => '') }));
        const est = await estadiaDaConversa(pd.conversa_id).catch(() => null);
        return res.end(massagem.paginaParceira(pd, { dias: massagem.diasPossiveis(pd, est, hoje), ocupados: await ocupadosMassagem(fetch, pd.id).catch(() => ({})), versao: ver }));
      }
      if (req.method !== 'POST') return naoAchou();
      const corpo = await lerCorpo(req, 4000);
      if (parc) {
        if (pd.situacao !== 'aguardando_parceiro' || (pd.expira_em && new Date(pd.expira_em) < new Date())) return json(res, 409, { ok: false, erro: 'Este pedido não está mais aberto.' });
        if (corpo.acao === 'confirmar') {
          await confirmarMassagem(pd, String(pd.data).slice(0, 10), pd.horario, 'massoterapeuta pela página');
          return json(res, 200, { ok: true, mensagem: 'Massagem confirmada. Obrigado! O hóspede já foi avisado. ✅' });
        }
        if (corpo.acao !== 'opcoes') return json(res, 400, { ok: false, erro: 'Pedido inválido.' });
        const est = await estadiaDaConversa(pd.conversa_id).catch(() => null);
        const val = massagem.validarOpcoes(corpo.opcoes, massagem.diasPossiveis(pd, est, hoje), await ocupadosMassagem(fetch, pd.id).catch(() => ({})), pd);
        if (val.erro) return json(res, 400, { ok: false, erro: val.erro });
        const tc = crypto.randomBytes(16).toString('base64url');
        await patchPedido(pd.id, { situacao: 'opcoes_enviadas', opcoes: val.opcoes, token_cliente: tc, respondido_em: pd.respondido_em || new Date().toISOString() });
        const foi = await enviarOpcoesAoCliente({ ...pd, token_cliente: tc });
        if (pd.negocio_id) await eventoNegocio(pd.negocio_id, 'A massoterapeuta indicou outros horários: ' + val.opcoes.map(o => massagem.quando(o.data, o.horario)).join('; ') + (foi ? ' (enviados ao hóspede)' : ''), 'CRM').catch(() => {});
        if (!foi) await criarAlerta({ conversa_id: pd.conversa_id, negocio_id: pd.negocio_id, venda_id: pd.venda_id, tipo: 'parceiro_sem_resposta', titulo: 'Massagem: mande as opções ao hóspede',
          info: 'A massoterapeuta indicou ' + val.opcoes.map(o => massagem.quando(o.data, o.horario)).join('; ') + ', mas o WhatsApp não saiu. Link para o hóspede escolher: ' + URL_PUBLICA + '/mc/' + tc });
        const nHotel = await numeroWhatsapp(((await getJson(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${pd.conversa_id}&select=numero_id`, fetch))[0] || {}).numero_id, fetch).catch(() => null);
        return json(res, 200, { ok: true, mensagem: 'Pronto! As opções foram enviadas ao hóspede. Quando ele escolher, avisamos você pelo WhatsApp. 🌿',
          whatsapp: nHotel ? `https://wa.me/${nHotel}?text=${encodeURIComponent('Oi! Indiquei os horários da massagem para ' + (pd.hospede || 'o hóspede') + '.')}` : null });
      }
      if (pd.situacao !== 'opcoes_enviadas') return json(res, 409, { ok: false, erro: 'Este link não está mais ativo.' });
      if (corpo.acao === 'nenhum') {
        await patchPedido(pd.id, { situacao: 'sem_opcao' });
        await criarAlerta({ conversa_id: pd.conversa_id, negocio_id: pd.negocio_id, venda_id: pd.venda_id, tipo: 'parceiro_sem_resposta', titulo: 'Massagem: hóspede não pôde nos horários',
          info: massagem.detalhe(pd) + '. Nenhuma das opções da massoterapeuta serviu. Fale com o hóspede e com ela.' });
        await avisarParceira(pd, 'O hóspede não pôde em nenhum dos horários indicados. A equipe do hotel segue com ele. Obrigado! 🌿');
        return json(res, 200, { ok: true, mensagem: 'Recebemos. A equipe fala com você pelo WhatsApp para achar outro horário.' });
      }
      const o = (pd.opcoes || [])[Number(corpo.opcao)];
      if (corpo.acao !== 'escolher' || !o) return json(res, 400, { ok: false, erro: 'Escolha um dos horários.' });
      await confirmarMassagem(pd, o.data, o.horario, 'hóspede escolheu uma opção da massoterapeuta');
      await avisarParceira({ ...pd, data: o.data, horario: o.horario }, 'O hóspede escolheu: ' + massagem.detalhe({ ...pd, data: o.data, horario: o.horario }) + '. Massagem confirmada ✅ Obrigado!');
      return json(res, 200, { ok: true, mensagem: 'Massagem confirmada: ' + massagem.quando(o.data, o.horario) + ' ✅ Você também recebe a confirmação no WhatsApp.' });
    })().catch(e => json(res, e.http || 500, { ok: false, erro: e instanceof ErroEnvio ? e.message : 'Não deu agora. Tente de novo.' }));
    return;
  }
  // Página pública do orçamento e o "Quero reservar esta".
  // A prévia do link (WhatsApp, Facebook, robôs) não é o cliente abrindo: não conta como abertura (dono, 07/10/2026)
  const mo = url.pathname.match(/^\/o\/([A-Za-z0-9_-]{22})(\/quero)?$/);
  if (mo) {
    if (limiteExcedido(req)) { res.writeHead(429, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '60' }); return res.end('Muitos acessos. Tente de novo em 1 minuto.'); }
    const token = mo[1];
    if (!mo[2] && req.method === 'GET') {
      const previa = url.searchParams.get('previa') === '1';
      lerOrcamento(token).then(async o => {
        if (!o) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...cabecalhosSeguranca() }); return res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hotel Cabanas</title><p style="font-family:sans-serif;padding:24px">Orçamento não encontrado. Fale com a gente pelo WhatsApp que enviamos um novo.</p>'); }
        await atualizarFotos().catch(() => {});
        if (!previa && !ehRobo(req)) await rpc('registrar_abertura_orcamento', { p_token: token }).catch(() => {}); // antes de responder: no Cloud Run a CPU para depois da resposta
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', ...cabecalhosSeguranca() });
        res.end(orcamento.pagina(o, { previa, produtos: ((await catalogo().catch(() => null)) || {}).produtos }));
      }).catch(() => { res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Página indisponível agora. Tente de novo em instantes.'); });
      return;
    }
    if (mo[2] && req.method === 'POST') {
      const partes = [];
      let tam = 0;
      req.on('data', p => { tam += p.length; if (tam > 2000) req.destroy(); else partes.push(p); });
      req.on('end', async () => {
        try {
          const corpo = JSON.parse(Buffer.concat(partes).toString('utf8') || '{}');
          const o = await lerOrcamento(token);
          const op = o && (o.opcoes || []).find(x => x.codigo === corpo.codigo);
          if (!op) return json(res, 404, { ok: false });
          // Extras marcados pelo cliente na página: só produtos ativos e opções que existem
          const prods = ((await catalogo().catch(() => null)) || {}).produtos || [];
          const extras = (Array.isArray(corpo.extras) ? corpo.extras.slice(0, 10) : []).map(e => {
            const p = prods.find(x => x.codigo === String(e && e.codigo || ''));
            if (!p) return null;
            const vs = Array.isArray(p.variacoes) ? p.variacoes : [];
            const v = vs.find(x => x.nome === e.variacao) || (vs.length === 1 ? vs[0] : null);
            return { codigo: p.codigo, nome: p.nome, variacao: v ? v.nome : null };
          }).filter((e, i, l) => e && l.findIndex(x => x && x.codigo === e.codigo) === i);
          if (!corpo.previa) {
            await fetch(`${SUPABASE_URL}/rest/v1/orcamentos?id=eq.${o.id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ escolhida: op.codigo, escolhida_em: new Date().toISOString() }), signal: AbortSignal.timeout(5000) }).catch(() => {});
            await fetch(`${SUPABASE_URL}/rest/v1/orcamento_eventos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ orcamento_id: o.id, tipo: 'quero_reservar', dados: { codigo: op.codigo, extras } }), signal: AbortSignal.timeout(5000) }).catch(() => {});
            // Cada extra marcado vira oferta aceita pelo cliente: a equipe registra a venda no painel 🛍 da conversa
            if (extras.length && o.conversa_id) {
              const negocio = await negocioDaConversa(o.conversa_id);
              const ja = await ofertasDaConversa(o.conversa_id);
              for (const e of extras) {
                if (ja.some(x => x.produto_codigo === e.codigo && x.situacao === 'aceito')) continue;
                const ro = await fetch(`${SUPABASE_URL}/rest/v1/ofertas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, signal: AbortSignal.timeout(5000),
                  body: JSON.stringify({ conversa_id: o.conversa_id, negocio_id: negocio, produto_codigo: e.codigo, produto_nome: e.nome + (e.variacao ? ' (' + e.variacao + ')' : ''), por: 'pagina', situacao: 'aceito', respondido_em: new Date().toISOString() }) }).catch(() => null);
                const of = ro && ro.ok ? (await ro.json().catch(() => []))[0] : null;
                await aceiteDoCliente({ conversa_id: o.conversa_id, oferta_id: of && of.id, produto_codigo: e.codigo, variacao: e.variacao, origem: 'pagina' })
                  .catch(err => console.warn(JSON.stringify({ evento: 'aceite_pagina', erro: String(err.message || err).slice(0, 200) })));
              }
            }
          }
          const cat = orcamento.CATALOGO[op.codigo];
          const nomeOp = cat ? cat.nome : op.nome;
          const texto = `Oi! Quero reservar ${/^Cabana/.test(nomeOp) ? 'a' : 'o'} ${nomeOp} de ${orcamento.periodo(o.data_entrada, o.data_saida)} (orçamento ${token.slice(0, 6)}).`
            + (extras.length ? ` Também quero incluir: ${extras.map(e => e.nome + (e.variacao ? ' (' + e.variacao + ')' : '')).join(', ')}.` : '');
          json(res, 200, { ok: true, whatsapp: o.numero_whatsapp ? `https://wa.me/${o.numero_whatsapp}?text=${encodeURIComponent(texto)}` : null });
        } catch (e) { json(res, 400, { ok: false }); }
      });
      return;
    }
  }

  if (url.pathname === '/webhook/meta' && req.method === 'GET') {
    const ok = VERIFY && url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === VERIFY;
    res.writeHead(ok ? 200 : 403, { 'Content-Type': 'text/plain' });
    return res.end(ok ? url.searchParams.get('hub.challenge') || '' : 'proibido');
  }

  if (url.pathname === '/webhook/meta' && req.method === 'POST') {
    const partes = [];
    let tamanho = 0;
    req.on('data', p => { tamanho += p.length; if (tamanho > 1e6) req.destroy(); else partes.push(p); });
    req.on('end', () => {
      const corpo = Buffer.concat(partes);
      if (!assinaturaValida(corpo, req.headers['x-hub-signature-256'])) {
        console.warn(JSON.stringify({ evento: 'assinatura_invalida' }));
        return json(res, 401, { ok: false });
      }
      let evento;
      try { evento = JSON.parse(corpo.toString('utf8')); } catch (e) { console.error('evento ilegível'); return json(res, 200, { ok: true }); }
      // Grava antes de responder (o banco fica na mesma região, leva milissegundos). Se o banco falhar,
      // responde 500 e a Meta reenvia depois; a gravação é idempotente, então não duplica nada.
      registrar(evento)
        .then(() => json(res, 200, { ok: true }))
        .catch(e => { console.error(JSON.stringify({ evento: 'falha_banco', erro: String(e.message || e) })); json(res, 500, { ok: false }); });
    });
    return;
  }

  // Entrada da equipe: se o e-mail está na lista da equipe (tabela usuarios, ativo), cria/confirma o login no Supabase.
  // Responde sempre igual (não revela quem é da equipe). Assim o dono só precisa liberar o e-mail no SQL.
  // Aparelho novo entra com o código gerado por quem já está logado (resposta igual para código errado ou vencido)
  if (url.pathname === '/entrar/aparelho' && req.method === 'POST') {
    if (limiteExcedido(req)) return json(res, 429, { ok: false });
    lerCorpo(req, 500).then(async corpo => {
      const codigo = String(corpo.codigo || '').replace(/\D/g, '');
      const email = bancoLigado() && /^\d{6}$/.test(codigo) ? usarCodigoConexao(codigo) : null;
      const token = email ? await linkDeEntrada(email).catch(() => null) : null;
      if (!token) return json(res, 400, { ok: false, erro: 'Código errado ou vencido. Gere outro no aparelho que já está conectado.' });
      console.log(JSON.stringify({ evento: 'aparelho_conectado' }));
      json(res, 200, { ok: true, token_hash: token });
    }).catch(() => json(res, 400, { ok: false, erro: 'Pedido inválido.' }));
    return;
  }
  if (url.pathname === '/entrar/preparar' && req.method === 'POST') {
    if (limiteExcedido(req)) return json(res, 429, { ok: false });
    lerCorpo(req, 2000).then(async corpo => {
      const email = String(corpo.email || '').trim().toLowerCase().slice(0, 160);
      if (!bancoLigado() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(res, 200, { ok: true });
      await prepararLogin(email).catch(e => console.warn(JSON.stringify({ evento: 'preparar_login', erro: String(e.message || e).slice(0, 200) })));
      json(res, 200, { ok: true });
    }).catch(() => json(res, 400, { ok: false }));
    return;
  }

  // Pedido interno do próprio CRM: o Gilberto responde sozinho (só aceita com o código desta instância)
  if (url.pathname === '/interno/gilberto' && req.method === 'POST') {
    if (req.headers['x-interno'] !== TOKEN_INTERNO) return json(res, 403, { ok: false });
    lerCorpo(req, 2000).then(async c => {
      if (!uuidOk(c.conversa_id) || !uuidOk(c.mensagem_id)) return { ok: false };
      const retomada = Object.hasOwn(GATILHO_RETOMADA, String(c.retomada)) ? c.retomada : null;
      const r = await responderSozinho(c.conversa_id, c.mensagem_id, fetch, { retomada }).catch(e => ({ erro: String(e.message || e).slice(0, 150) }));
      if (retomada && uuidOk(c.orcamento_id)) await fetch(`${SUPABASE_URL}/rest/v1/orcamento_eventos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000), // o que aconteceu (diagnóstico)
        body: JSON.stringify({ orcamento_id: c.orcamento_id, tipo: 'retomada_resultado', dados: { enviada: !!(r && r.enviadas), pulou: (r && r.pulou) || null, erro: (r && r.erro) || null } }) }).catch(() => {});
      return r;
    })
      .then(r => json(res, 200, r)).catch(e => { console.error(JSON.stringify({ evento: 'gilberto_auto_falha', erro: String(e.message || e).slice(0, 200) })); json(res, 500, { ok: false }); });
    return;
  }
  // Agendador do Google (a cada 2 min): confere as cobranças Pix ativas. Não devolve dado nenhum, só contagens.
  if (url.pathname === '/cron/pix' && req.method === 'POST') {
    if (!bancoLigado()) return json(res, 503, { ok: false });
    Promise.all([verificarCobrancas(), escalarAlertas().catch(() => 0)]).then(async ([r, escalados]) => json(res, 200, { ok: true, ...r, escalados, avisos: await notificarAlertas().catch(() => 0),
      retomar: await retomarOrcamentos().catch(() => ({ criadas: 0, fechadas: 0 })), retomadas: await retomadaAutomatica().catch(() => 0), resumo: await resumoDoDia().catch(() => 0),
      massagem: await verificarPedidosParceiro().catch(() => ({ avisos: 0, expirados: 0 })) })).catch(() => json(res, 500, { ok: false }));
    return;
  }

  const rotaEquipe = API_EQUIPE[req.method + ' ' + url.pathname];
  if (rotaEquipe) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return json(res, 401, { ok: false, erro: 'Entre de novo.' });
    (async () => {
      if (!bancoLigado()) throw new ErroEnvio(503, 'O banco ainda não está configurado.');
      const eu = await autenticarEquipe(auth.slice(7));
      const corpo = req.method === 'POST' ? await lerCorpo(req, LIMITE_CORPO[req.method + ' ' + url.pathname] || 64e3) : {};
      return rotaEquipe(corpo, eu, url);
    })().then(r => json(res, 200, r)).catch(e => {
      if (e instanceof bb.ErroBB) e = new ErroEnvio(e.http, e.message);
      if (e instanceof silbeck.ErroSilbeck) e = e.http === 400 ? new ErroEnvio(400, 'Pedido inválido: ' + e.message + '.') : new ErroEnvio(502, 'O Silbeck não respondeu agora (' + e.message + ').');
      if (!(e instanceof ErroEnvio)) console.error(JSON.stringify({ evento: 'falha_api', rota: url.pathname, erro: String(e.message || e).slice(0, 200) }));
      json(res, e.http || 500, { ok: false, erro: e instanceof ErroEnvio ? e.message : 'Não deu agora. Tente de novo.' });
    });
    return;
  }

  if (url.pathname === '/api/fotos' && req.method === 'GET') {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return json(res, 401, { ok: false, erro: 'Entre de novo.' });
    autenticarEquipe(auth.slice(7)).then(async () => { await atualizarFotos(); json(res, 200, { ok: true, grupos: orcamento.biblioteca({ todas: true }), apartamentos: orcamento.apartamentos().map(a => ({ ...a, nome: orcamento.nomeGrupo(a.categoria) })) }); })
      .catch(e => json(res, e.http || 500, { ok: false, erro: e instanceof ErroEnvio ? e.message : 'Não deu agora.' }));
    return;
  }

  if (url.pathname.startsWith('/api/midia/') && req.method === 'GET') {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return json(res, 401, { ok: false, erro: 'Entre de novo.' });
    midiaParaEquipe(auth.slice(7), url.pathname.slice('/api/midia/'.length))
      .then(({ dados, mime, nome }) => {
        const seguro = MIME_SEGURO.test(mimeBase(mime));
        res.writeHead(200, {
          'Content-Type': seguro ? mimeBase(mime) : 'application/octet-stream',
          'Content-Disposition': (seguro ? 'inline' : 'attachment') + '; filename="' + String(nome || 'arquivo.' + extDe(mime)).replace(/[^\w.\- ]/g, '_') + '"',
          'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff', ...cabecalhosSeguranca(),
        });
        res.end(dados);
      })
      .catch(e => json(res, e.http || 500, { ok: false, erro: e instanceof ErroEnvio ? e.message : 'Não deu para abrir o arquivo.' }));
    return;
  }

  if (url.pathname === '/api/enviar-midia' && req.method === 'POST') {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return json(res, 401, { ok: false, erro: 'Entre de novo.' });
    const partes = [];
    let tamanho = 0, grande = false;
    req.on('data', p => { tamanho += p.length; if (tamanho > LIMITE_MIDIA) { grande = true; } else partes.push(p); });
    req.on('end', () => {
      if (grande) return json(res, 413, { ok: false, erro: 'Arquivo grande demais (máximo 16 MB).' });
      enviarMidiaPelaEquipe(auth.slice(7), url.searchParams, Buffer.concat(partes), req.headers['content-type'])
        .then(r => json(res, 200, r))
        .catch(e => {
          if (!(e instanceof ErroEnvio)) console.error(JSON.stringify({ evento: 'falha_envio_midia', erro: String(e.message || e).slice(0, 200) }));
          json(res, e.http || 500, { ok: false, erro: e instanceof ErroEnvio ? e.message : 'Não deu para enviar o arquivo.' });
        });
    });
    return;
  }

  if ((url.pathname === '/api/enviar' || url.pathname === '/api/sugerir' || url.pathname === '/api/transcrever' || url.pathname === '/api/enviar-fotos') && req.method === 'POST') {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return json(res, 401, { ok: false, erro: 'Entre de novo.' });
    const partes = [];
    let tamanho = 0;
    req.on('data', p => { tamanho += p.length; if (tamanho > 64e3) req.destroy(); else partes.push(p); });
    req.on('end', () => {
      let corpo;
      try { corpo = JSON.parse(Buffer.concat(partes).toString('utf8')); } catch (e) { return json(res, 400, { ok: false, erro: 'Pedido inválido.' }); }
      ({ '/api/enviar': enviarPelaEquipe, '/api/sugerir': sugerirParaEquipe, '/api/transcrever': transcreverParaEquipe, '/api/enviar-fotos': enviarFotosPelaEquipe })[url.pathname](auth.slice(7), corpo)
        .then(r => json(res, 200, r))
        .catch(e => {
          if (!(e instanceof ErroEnvio)) console.error(JSON.stringify({ evento: 'falha_envio', erro: String(e.message || e).slice(0, 200) }));
          json(res, e.http || 500, { ok: false, erro: e instanceof ErroEnvio ? e.message : 'Não deu para enviar agora. Tente de novo.', enviadas: e.enviadas || [] });
        });
    });
    return;
  }

  const mm = req.method === 'GET' && url.pathname.match(/^\/api\/drive\/miniatura\/([\w-]{10,100})$/);
  if (mm) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return json(res, 401, { ok: false, erro: 'Entre de novo.' });
    autenticarEquipe(auth.slice(7)).then(() => drive.miniatura(mm[1])).then(dados => {
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600', ...cabecalhosSeguranca() });
      res.end(dados);
    }).catch(e => json(res, e.http || 500, { ok: false, erro: e instanceof ErroEnvio || e instanceof drive.ErroDrive ? e.message : 'Não deu agora.' }));
    return;
  }
  const mv = req.method === 'GET' && url.pathname.match(/^\/videos\/([\w.-]+\.mp4)$/);
  if (mv) { // vídeo da biblioteca (Storage); a Meta baixa por este link
    bytesDaFoto(mv[1]).then(dados => {
      if (!dados) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Vídeo não encontrado.'); }
      const faixa = String(req.headers.range || '').match(/^bytes=(\d*)-(\d*)$/);
      const base = { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=300', ...cabecalhosSeguranca() };
      if (faixa && (faixa[1] || faixa[2])) {
        let ini = faixa[1] ? Number(faixa[1]) : Math.max(0, dados.length - Number(faixa[2]));
        let fim = faixa[1] && faixa[2] ? Math.min(Number(faixa[2]), dados.length - 1) : dados.length - 1;
        if (ini >= dados.length || ini > fim) { res.writeHead(416, { 'Content-Range': 'bytes */' + dados.length }); return res.end(); }
        res.writeHead(206, { ...base, 'Content-Range': `bytes ${ini}-${fim}/${dados.length}`, 'Content-Length': fim - ini + 1 });
        return res.end(dados.subarray(ini, fim + 1));
      }
      res.writeHead(200, { ...base, 'Content-Length': dados.length });
      res.end(dados);
    }).catch(() => { res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Indisponível agora.'); });
    return;
  }
  const mf = req.method === 'GET' && !ESTATICOS[url.pathname] && url.pathname.match(/^\/fotos\/([\w.-]+\.jpg)$/);
  if (mf) { // foto trazida do Drive pela equipe (fica no Storage)
    bytesDaFoto(mf[1]).then(dados => {
      if (!dados) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Foto não encontrada.'); }
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=300', ...cabecalhosSeguranca() });
      res.end(dados);
    }).catch(() => { res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Indisponível agora.'); });
    return;
  }
  const est = req.method === 'GET' && ESTATICOS[url.pathname];
  if (est) {
    res.writeHead(200, { 'Content-Type': est.tipo, 'Cache-Control': url.pathname === '/caixa' ? 'no-store' : url.pathname === '/sw.js' ? 'no-cache' : 'public, max-age=300', ...cabecalhosSeguranca() });
    return res.end(est.corpo);
  }
  if (url.pathname === '/config.js' && req.method === 'GET') {
    const cfg = chavePublicaOk() ? { supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_PUBLICA } : {};
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store', ...cabecalhosSeguranca() });
    return res.end('window.CRM_CONFIG = ' + JSON.stringify(cfg) + ';');
  }

  if (url.pathname === '/webhook/status') return json(res, 200, { recebidos: recentes.length, ultimoErroBanco, ultimoErroMeta, ultimoDigitando, ultimoErroTranscricao: transcricao.ultimoErro(), ultimos: recentes });

  if (url.pathname === '/') { res.writeHead(302, { Location: '/caixa' }); return res.end(); }
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><title>CRM Cabanas</title><p style="font-family:sans-serif">Página não encontrada. <a href="/caixa">Ir para a caixa de entrada</a> · versão ' + versao.replace(/[^\w.-]/g, '') + '</p>');
});

if (require.main === module) servidor.listen(porta, () => { console.log('CRM Cabanas ouvindo na porta ' + porta); conferirIpSaida(); });
module.exports = { travaReservas, zerarCacheAuto: () => { autoCache.ate = 0; }, emOrdemDeLeitura, servidor, retomarOrcamentos, retomadaAutomatica, motivoRetomada, ehRobo, resumoDoDia, sinalQuente, proximoExpediente, notificarAlertas, avisarCelulares, assinaturaValida, registrar, corpoDe, numeroParaEnvio, extDe, fotosDoProduto, prazoCobranca, catalogoParaTeste: () => { limparCatalogo(); return catalogo(); } };
