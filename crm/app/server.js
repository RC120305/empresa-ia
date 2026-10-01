// CRM Cabanas: fase 1 (início). Recebe os eventos da Meta (WhatsApp) com verificação de assinatura.
// Segredos vêm do Secret Manager como variáveis de ambiente: META_VERIFY_TOKEN e META_APP_SECRET.
// Nada de chave no código. Conteúdo de mensagens não é exibido em página pública: só no log privado.
const http = require('http');
const crypto = require('crypto');

const porta = process.env.PORT || 8080;
const versao = process.env.VERSAO || 'local';
const VERIFY = process.env.META_VERIFY_TOKEN || '';
const APP_SECRET = process.env.META_APP_SECRET || '';

const recentes = []; // últimos eventos (sem conteúdo), só para a página de status
const mascarar = n => (n ? String(n).replace(/^(\d{4})\d+(\d{3})$/, '$1•••••$2') : '?');

function assinaturaValida(corpo, cabecalho) {
  if (!APP_SECRET || !cabecalho || !cabecalho.startsWith('sha256=')) return false;
  const esperado = crypto.createHmac('sha256', APP_SECRET).update(corpo).digest('hex');
  const recebido = cabecalho.slice(7);
  return recebido.length === esperado.length &&
    crypto.timingSafeEqual(Buffer.from(recebido, 'hex'), Buffer.from(esperado, 'hex'));
}

function registrar(evento) {
  for (const entrada of evento.entry || []) {
    for (const mudanca of entrada.changes || []) {
      const v = mudanca.value || {};
      for (const m of v.messages || []) {
        recentes.unshift({ quando: new Date().toISOString(), tipo: m.type, de: mascarar(m.from) });
        // Log privado (Cloud Logging): o texto ajuda no teste; na fase 1 completa vai para o banco.
        console.log(JSON.stringify({ evento: 'mensagem', tipo: m.type, de: mascarar(m.from), texto: m.text && m.text.body }));
      }
      for (const s of v.statuses || []) {
        recentes.unshift({ quando: new Date().toISOString(), tipo: 'status:' + s.status, de: mascarar(s.recipient_id) });
      }
    }
  }
  recentes.splice(10);
}

function json(res, cod, obj) {
  res.writeHead(cod, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/saude') return json(res, 200, { ok: true, servico: 'crm-cabanas', versao, segredos: { verify: !!VERIFY, appSecret: !!APP_SECRET } });

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
      json(res, 200, { ok: true }); // responde rápido; a Meta reenvia se demorar
      try { registrar(JSON.parse(corpo.toString('utf8'))); } catch (e) { console.error('evento ilegível'); }
    });
    return;
  }

  if (url.pathname === '/webhook/status') return json(res, 200, { recebidos: recentes.length, ultimos: recentes });

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><title>CRM Cabanas</title><p style="font-family:sans-serif">CRM Cabanas no ar 🌿 · versão ' + versao.replace(/[^\w.-]/g, '') + '</p>');
});

if (require.main === module) servidor.listen(porta, () => console.log('CRM Cabanas ouvindo na porta ' + porta));
module.exports = { servidor, assinaturaValida };
