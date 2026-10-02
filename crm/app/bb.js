// Pix do Banco do Brasil (API Pix v2, padrão do Banco Central): cobrança imediata com valor e prazo, e consulta do pagamento.
// Credenciais só no cofre (Secret Manager): bb-client-id, bb-client-secret, bb-app-key (developer_application_key),
// bb-chave-pix e, se o BB exigir, bb-certificado (arquivo .pfx em base64) + bb-certificado-senha.
// BB_MODO=simulador (padrão até o dono cadastrar as credenciais): cobranças de mentira, com "Simular pagamento" na tela.
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const { segredo } = require('./silbeck');

const MODO = () => (process.env.BB_MODO || 'simulador').trim();
const AMBIENTE = async () => ((await segredo('bb-ambiente').catch(() => null)) || 'producao').trim();
const ENDERECOS = {
  producao: { oauth: 'https://oauth.bb.com.br/oauth/token', api: 'https://api-pix.bb.com.br/pix/v2' },
  homologacao: { oauth: 'https://oauth.hm.bb.com.br/oauth/token', api: 'https://api.hm.bb.com.br/pix/v2' },
};
class ErroBB extends Error { constructor(http, msg) { super(msg); this.http = http; } }

// Requisição com certificado do cliente (mTLS) quando houver; senão, TLS comum.
let certificado;
async function agente() {
  if (certificado !== undefined) return certificado;
  const pfx = await segredo('bb-certificado').catch(() => null);
  certificado = pfx ? new https.Agent({ pfx: Buffer.from(pfx, 'base64'), passphrase: (await segredo('bb-certificado-senha').catch(() => null)) || undefined, keepAlive: true }) : null;
  return certificado;
}
function pedir(url, { method = 'GET', headers = {}, body = null } = {}, ag = null) {
  return new Promise((ok, falha) => {
    const u = new URL(url);
    const mod = u.protocol === 'http:' ? http : https;
    const req = mod.request(u, { method, headers: { Accept: 'application/json', ...headers, ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}) }, ...(ag && u.protocol === 'https:' ? { agent: ag } : {}), timeout: 15000 }, res => {
      const partes = []; res.on('data', p => partes.push(p));
      res.on('end', () => { const t = Buffer.concat(partes).toString('utf8'); let j = {}; try { j = t ? JSON.parse(t) : {}; } catch (e) { j = { bruto: t.slice(0, 200) }; } ok({ status: res.statusCode, json: j }); });
    });
    req.on('timeout', () => req.destroy(new Error('tempo esgotado')));
    req.on('error', e => falha(new ErroBB(502, 'O Banco do Brasil não respondeu (' + e.message + ').')));
    if (body) req.write(body);
    req.end();
  });
}

let token = null;
async function config() {
  const [id, sec, appKey, chave, amb] = await Promise.all(['bb-client-id', 'bb-client-secret', 'bb-app-key', 'bb-chave-pix'].map(n => segredo(n).catch(() => null)).concat([AMBIENTE()]));
  if (!id || !sec || !appKey || !chave) throw new ErroBB(503, 'Faltam as credenciais do Banco do Brasil no cofre (rodar crm/infra/segredos-bb.txt).');
  const end = ENDERECOS[amb] || ENDERECOS.producao;
  return { id, sec, appKey, chave, oauth: process.env.BB_OAUTH_URL || end.oauth, api: (process.env.BB_API_URL || end.api).replace(/\/$/, '') };
}
async function autorizar(c) {
  if (token && token.ate > Date.now()) return token.valor;
  const r = await pedir(c.oauth, { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(c.id + ':' + c.sec).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=' + encodeURIComponent('cob.write cob.read pix.read') }, await agente());
  if (r.status !== 200 || !r.json.access_token) throw new ErroBB(502, 'O Banco do Brasil recusou o acesso (' + r.status + (r.json.error_description ? ': ' + r.json.error_description : '') + ').');
  token = { valor: r.json.access_token, ate: Date.now() + Math.max(60, (r.json.expires_in || 600) - 60) * 1000 };
  return token.valor;
}
async function api(c, metodo, caminho, corpo) {
  const sep = caminho.includes('?') ? '&' : '?';
  const r = await pedir(`${c.api}${caminho}${sep}gw-dev-app-key=${encodeURIComponent(c.appKey)}`, { method: metodo,
    headers: { Authorization: 'Bearer ' + await autorizar(c), ...(corpo ? { 'Content-Type': 'application/json' } : {}) }, body: corpo ? JSON.stringify(corpo) : null }, await agente());
  if (r.status === 401) token = null;
  return r;
}

// txid: 26 a 35 letras/números (regra do Banco Central)
const novoTxid = () => 'CAB' + crypto.randomBytes(18).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 26).padEnd(26, '0');
const valorTxt = v => Number(v).toFixed(2);

// ---------- Simulador (BB_MODO=simulador) ----------
const sim = new Map();
const copiaFicticia = (txid, valor) => `00020101021226860014br.gov.bcb.pix2564SIMULADOR.CABANAS/${txid}5204000053039865406${valorTxt(valor)}5802BR5914HOTEL CABANAS6006BONITO62070503***6304TESTE`;

async function criarCobranca({ txid, valor, expiracaoSeg, descricao, devedor }) {
  if (MODO() === 'simulador') {
    sim.set(txid, { status: 'ATIVA', valor: valorTxt(valor), pix: [] });
    return { txid, status: 'ATIVA', copia_e_cola: copiaFicticia(txid, valor), fonte: 'simulador' };
  }
  const c = await config();
  const corpo = { calendario: { expiracao: expiracaoSeg }, valor: { original: valorTxt(valor) }, chave: c.chave, solicitacaoPagador: String(descricao || '').slice(0, 140),
    ...(devedor && devedor.nome && (devedor.cpf || devedor.cnpj) ? { devedor } : {}) };
  const r = await api(c, 'PUT', '/cob/' + txid, corpo);
  if (r.status !== 200 && r.status !== 201) throw new ErroBB(502, 'O Banco do Brasil não criou a cobrança (' + r.status + (r.json.detail || r.json.title ? ': ' + (r.json.detail || r.json.title) : '') + ').');
  return { txid, status: r.json.status, copia_e_cola: r.json.pixCopiaECola || r.json.textoImagemQRcode || null, fonte: 'bb' };
}
// Situação da cobrança: ATIVA | CONCLUIDA | REMOVIDA_PELO_USUARIO_RECEBEDOR | REMOVIDA_PELO_PSP; pagamentos recebidos
async function consultar(txid, fonte) {
  if (fonte === 'simulador') {
    const s = sim.get(txid);
    return s ? { status: s.status, pagamentos: s.pix } : { status: 'ATIVA', pagamentos: [] };
  }
  const c = await config();
  const r = await api(c, 'GET', '/cob/' + txid);
  if (r.status !== 200) throw new ErroBB(502, 'Não consegui consultar a cobrança (' + r.status + ').');
  return { status: r.json.status, pagamentos: (r.json.pix || []).map(p => ({ e2e: p.endToEndId, valor: Number(p.valor), horario: p.horario, pagador: (p.pagador && p.pagador.nome) || null })) };
}
async function cancelar(txid, fonte) {
  if (fonte === 'simulador') { const s = sim.get(txid); if (s) s.status = 'REMOVIDA_PELO_USUARIO_RECEBEDOR'; return; }
  const c = await config();
  const r = await api(c, 'PATCH', '/cob/' + txid, { status: 'REMOVIDA_PELO_USUARIO_RECEBEDOR' });
  if (r.status !== 200) throw new ErroBB(502, 'O Banco do Brasil não cancelou a cobrança (' + r.status + ').');
}
// Só no simulador: o "cliente paga"
function simularPagamento(txid) {
  const s = sim.get(txid);
  if (!s) { sim.set(txid, { status: 'CONCLUIDA', valor: '0', pix: [] }); return; }
  s.status = 'CONCLUIDA';
  s.pix = [{ e2e: 'E' + crypto.randomBytes(15).toString('hex').toUpperCase(), valor: Number(s.valor), horario: new Date().toISOString(), pagador: 'Cliente de teste' }];
}

module.exports = { MODO, novoTxid, criarCobranca, consultar, cancelar, simularPagamento, ErroBB, _sim: sim };
