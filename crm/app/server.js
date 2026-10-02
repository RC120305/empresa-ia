// CRM Cabanas: fase 1 (início). Recebe os eventos da Meta (WhatsApp) com verificação de assinatura.
// Segredos vêm do Secret Manager como variáveis de ambiente: META_VERIFY_TOKEN, META_APP_SECRET e
// SUPABASE_SECRET_KEY. Nada de chave no código. Conteúdo de mensagens vai para o banco (Supabase,
// São Paulo), nunca para página pública nem para o log.
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const gilberto = require('./gilberto');
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
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const ESTATICOS = {};
for (const [rota, arquivo] of [['/caixa', 'caixa.html'], ['/caixa.css', 'caixa.css'], ['/caixa.js', 'caixa.js'], ['/vendor/supabase-2.117.2.js', 'vendor/supabase-2.117.2.js']]) {
  try { ESTATICOS[rota] = { corpo: fs.readFileSync(path.join(PUB, arquivo)), tipo: TIPOS[path.extname(arquivo)] }; } catch (e) { /* arquivo ausente: rota fica 404 */ }
}
function cabecalhosSeguranca() {
  const sup = SUPABASE_URL ? `${SUPABASE_URL} ${SUPABASE_URL.replace(/^https:/, 'wss:')}` : '';
  return {
    'Content-Security-Policy': `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' ${sup}; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'`,
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
let ultimoErroMeta = null; // último erro de envio da Meta (código e mensagem, sem dados de cliente) // código e mensagem do banco (sem dados de cliente), para diagnóstico
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

async function registrar(evento, buscar = fetch) {
  let gravadas = 0;
  for (const entrada of evento.entry || []) {
    for (const mudanca of entrada.changes || []) {
      const v = mudanca.value || {};
      const numeroId = (v.metadata && v.metadata.phone_number_id) || '?';
      const nomes = {};
      for (const c of v.contacts || []) nomes[c.wa_id] = c.profile && c.profile.name;
      for (const m of v.messages || []) {
        const item = { quando: new Date().toISOString(), tipo: m.type, de: mascarar(m.from), gravado: false };
        recentes.unshift(item);
        if (bancoLigado()) {
          const midia = m[m.type];
          await rpc('registrar_entrada_whatsapp', {
            p_numero_id: numeroId, p_de: m.from, p_nome: nomes[m.from] || null, p_wamid: m.id, p_tipo: m.type,
            p_corpo: corpoDe(m) || null, p_midia_id: (midia && midia.id) || null,
            p_quando: m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : null,
          }, buscar);
          item.gravado = true; gravadas++;
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
  return equipe[0];
}

async function enviarPelaEquipe(tokenUsuario, corpo, buscar = fetch) {
  if (!WA_TOKEN || !bancoLigado()) throw new ErroEnvio(503, 'O envio ainda não está configurado no servidor.');
  const texto = typeof corpo.texto === 'string' ? corpo.texto.trim() : '';
  if (!texto || texto.length > 4096) throw new ErroEnvio(400, 'A mensagem precisa ter de 1 a 4.096 caracteres.');
  if (!/^[0-9a-f-]{36}$/i.test(String(corpo.conversa_id || ''))) throw new ErroEnvio(400, 'Conversa inválida.');
  const equipe = [await autenticarEquipe(tokenUsuario, buscar)];

  const c = await buscar(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${corpo.conversa_id}&select=id,canal,numero_id,ultima_msg_cliente_em,contato:contatos(contato_identificadores(tipo,valor))`,
    { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
  const conv = c.ok ? (await c.json())[0] : null;
  if (!conv) throw new ErroEnvio(404, 'Conversa não encontrada.');
  if (conv.canal !== 'wa') throw new ErroEnvio(400, 'Por enquanto só dá para responder pelo WhatsApp.');
  const ultima = conv.ultima_msg_cliente_em ? new Date(conv.ultima_msg_cliente_em).getTime() : 0;
  if (Date.now() - ultima > JANELA_MS) throw new ErroEnvio(409, 'A janela de 24 h fechou: fora dela a Meta só aceita modelos aprovados.');
  const wa = ((conv.contato && conv.contato.contato_identificadores) || []).find(i => i.tipo === 'whatsapp');
  if (!wa) throw new ErroEnvio(400, 'Este contato não tem WhatsApp.');

  const m = await buscar(`${GRAPH}/${encodeURIComponent(conv.numero_id)}/messages`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + WA_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: numeroParaEnvio(wa.valor), type: 'text', text: { body: texto, preview_url: true } }),
    signal: AbortSignal.timeout(10000),
  });
  const mr = await m.json().catch(() => ({}));
  if (!m.ok || !mr.messages || !mr.messages[0]) {
    const e = mr.error || {};
    console.error(JSON.stringify({ evento: 'falha_envio_meta', http: m.status, codigo: e.code, sub: e.error_subcode, msg: String(e.message || '').slice(0, 200) }));
    ultimoErroMeta = { quando: new Date().toISOString(), http: m.status, codigo: e.code || null, mensagem: String(e.message || '').slice(0, 200) };
    throw new ErroEnvio(502, 'A Meta não aceitou o envio' + (e.code ? ` (código ${e.code})` : '') + '. Tente de novo; se repetir, avise o Ricardo.');
  }
  const wamid = mr.messages[0].id;
  const id = await rpc('registrar_saida_whatsapp', { p_conversa: conv.id, p_wamid: wamid, p_corpo: texto, p_autor: equipe[0].id }, buscar);
  return { ok: true, id, wamid, enviada_em: new Date().toISOString() };
}

// Sugestão do Gilberto para a última mensagem do cliente (não envia nada).
const sugerindo = new Set();
async function sugerirParaEquipe(tokenUsuario, corpo, buscar = fetch) {
  if (!bancoLigado()) throw new ErroEnvio(503, 'O banco ainda não está configurado.');
  const id = String(corpo.conversa_id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ErroEnvio(400, 'Conversa inválida.');
  await autenticarEquipe(tokenUsuario, buscar);
  if (sugerindo.has(id)) throw new ErroEnvio(429, 'Já estou preparando uma sugestão para esta conversa.');
  sugerindo.add(id);
  try {
    const c = await buscar(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${id}&select=id,canal,contato:contatos(nome)`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    const conv = c.ok ? (await c.json())[0] : null;
    if (!conv) throw new ErroEnvio(404, 'Conversa não encontrada.');
    const h = await buscar(`${SUPABASE_URL}/rest/v1/mensagens?conversa_id=eq.${id}&select=direcao,tipo,corpo,enviada_em&order=enviada_em.desc&limit=40`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    const historico = h.ok ? (await h.json()).reverse() : [];
    return { ok: true, ...(await gilberto.sugerir(historico, { canal: conv.canal, nome: conv.contato && conv.contato.nome })) };
  } catch (e) {
    if (e instanceof gilberto.ErroSugestao) throw new ErroEnvio(e.http, e.message);
    throw e;
  } finally { sugerindo.delete(id); }
}

function json(res, cod, obj) {
  res.writeHead(cod, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/saude') {
    const base = { ok: true, servico: 'crm-cabanas', versao, segredos: { verify: !!VERIFY, appSecret: !!APP_SECRET, supabase: bancoLigado(), supabasePublica: chavePublicaOk(), whatsappToken: !!WA_TOKEN, anthropic: !!process.env.ANTHROPIC_API_KEY }, gilberto: { instrucoes: gilberto.sistemaPronto(), modelo: gilberto.MODELO }, chaveSupabase: tipoChave(SUPABASE_KEY) };
    if (!bancoLigado()) return json(res, 200, base);
    // Confere se o banco responde e se a chave tem permissão de servidor: chama a função de status com um
    // ID que não existe (não altera nada). Chave sem permissão de servidor recebe 401/403.
    rpc('registrar_status_whatsapp', { p_wamid: 'diagnostico', p_status: 'read', p_erro: null })
      .then(() => json(res, 200, { ...base, banco: 'ok' }))
      .catch(() => json(res, 200, { ...base, banco: 'erro', erro: ultimoErroBanco }))
      .catch(() => json(res, 200, { ...base, banco: 'sem conexão' }));
    return;
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

  if ((url.pathname === '/api/enviar' || url.pathname === '/api/sugerir') && req.method === 'POST') {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return json(res, 401, { ok: false, erro: 'Entre de novo.' });
    const partes = [];
    let tamanho = 0;
    req.on('data', p => { tamanho += p.length; if (tamanho > 64e3) req.destroy(); else partes.push(p); });
    req.on('end', () => {
      let corpo;
      try { corpo = JSON.parse(Buffer.concat(partes).toString('utf8')); } catch (e) { return json(res, 400, { ok: false, erro: 'Pedido inválido.' }); }
      (url.pathname === '/api/enviar' ? enviarPelaEquipe : sugerirParaEquipe)(auth.slice(7), corpo)
        .then(r => json(res, 200, r))
        .catch(e => {
          if (!(e instanceof ErroEnvio)) console.error(JSON.stringify({ evento: 'falha_envio', erro: String(e.message || e).slice(0, 200) }));
          json(res, e.http || 500, { ok: false, erro: e instanceof ErroEnvio ? e.message : 'Não deu para enviar agora. Tente de novo.' });
        });
    });
    return;
  }

  const est = req.method === 'GET' && ESTATICOS[url.pathname];
  if (est) {
    res.writeHead(200, { 'Content-Type': est.tipo, 'Cache-Control': url.pathname === '/caixa' ? 'no-store' : 'public, max-age=300', ...cabecalhosSeguranca() });
    return res.end(est.corpo);
  }
  if (url.pathname === '/config.js' && req.method === 'GET') {
    const cfg = chavePublicaOk() ? { supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_PUBLICA } : {};
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store', ...cabecalhosSeguranca() });
    return res.end('window.CRM_CONFIG = ' + JSON.stringify(cfg) + ';');
  }

  if (url.pathname === '/webhook/status') return json(res, 200, { recebidos: recentes.length, ultimoErroBanco, ultimoErroMeta, ultimos: recentes });

  if (url.pathname === '/') { res.writeHead(302, { Location: '/caixa' }); return res.end(); }
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><title>CRM Cabanas</title><p style="font-family:sans-serif">Página não encontrada. <a href="/caixa">Ir para a caixa de entrada</a> · versão ' + versao.replace(/[^\w.-]/g, '') + '</p>');
});

if (require.main === module) servidor.listen(porta, () => console.log('CRM Cabanas ouvindo na porta ' + porta));
module.exports = { servidor, assinaturaValida, registrar, corpoDe, numeroParaEnvio };
