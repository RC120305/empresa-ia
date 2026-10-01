// CRM Cabanas: fase 1 (início). Recebe os eventos da Meta (WhatsApp) com verificação de assinatura.
// Segredos vêm do Secret Manager como variáveis de ambiente: META_VERIFY_TOKEN, META_APP_SECRET e
// SUPABASE_SECRET_KEY. Nada de chave no código. Conteúdo de mensagens vai para o banco (Supabase,
// São Paulo), nunca para página pública nem para o log.
const http = require('http');
const crypto = require('crypto');

const porta = process.env.PORT || 8080;
const versao = process.env.VERSAO || 'local';
const VERIFY = process.env.META_VERIFY_TOKEN || '';
const APP_SECRET = process.env.META_APP_SECRET || '';
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || '';
const bancoLigado = () => !!(SUPABASE_URL && SUPABASE_KEY);
// Chaves novas (sb_secret_…) vão só no cabeçalho apikey. Chaves antigas (JWT "eyJ…") precisam também do
// Authorization, senão o banco trata a chamada como visitante (anon) e nega as funções do servidor.
// Tipo da chave (nunca a chave): ajuda a ver se colaram a chave errada no Secret Manager.
function tipoChave(k) {
  if (!k) return 'nenhuma';
  if (k.startsWith('sb_secret_')) return 'secreta (sb_secret)';
  if (k.startsWith('sb_publishable_')) return 'PÚBLICA (sb_publishable): trocar pela secreta';
  if (k.startsWith('eyJ')) {
    try { const papel = JSON.parse(Buffer.from(k.split('.')[1], 'base64url').toString()).role; return 'antiga (JWT) papel=' + papel; } catch (e) { return 'antiga (JWT) ilegível'; }
  }
  return 'formato desconhecido';
}
const cabecalhosBanco = () => Object.assign({ apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
  SUPABASE_KEY.startsWith('eyJ') ? { Authorization: 'Bearer ' + SUPABASE_KEY } : {});

const recentes = []; // últimos eventos (sem conteúdo), só para a página de status
let ultimoErroBanco = null; // código e mensagem do banco (sem dados de cliente), para diagnóstico
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

function json(res, cod, obj) {
  res.writeHead(cod, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/saude') {
    const base = { ok: true, servico: 'crm-cabanas', versao, segredos: { verify: !!VERIFY, appSecret: !!APP_SECRET, supabase: bancoLigado() }, chaveSupabase: tipoChave(SUPABASE_KEY) };
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

  if (url.pathname === '/webhook/status') return json(res, 200, { recebidos: recentes.length, ultimoErroBanco, ultimos: recentes });

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><title>CRM Cabanas</title><p style="font-family:sans-serif">CRM Cabanas no ar 🌿 · versão ' + versao.replace(/[^\w.-]/g, '') + '</p>');
});

if (require.main === module) servidor.listen(porta, () => console.log('CRM Cabanas ouvindo na porta ' + porta));
module.exports = { servidor, assinaturaValida, registrar, corpoDe };
