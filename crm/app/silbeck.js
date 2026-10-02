// Ligação com o Silbeck (PMS do hotel). Fase atual: só o DIAGNÓSTICO da ponte (porta, login, uma leitura).
// O endereço do hotel e as credenciais ficam no Secret Manager (silbeck-url, silbeck-client-id,
// silbeck-client-secret) e são lidos aqui, na hora, pela conta de serviço do CRM: nunca no código nem no repositório.
// Plano B (A5): o roteador do hotel só aceita conexões do IP fixo de saída do CRM.
const net = require('net');

const PROJETO = process.env.GOOGLE_CLOUD_PROJECT || 'cabanas-crm';
const METADADOS = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

// Lê um segredo do Secret Manager (no Cloud Run). Fora dele (testes/local), usa a variável de ambiente.
async function segredo(nome, buscar = fetch) {
  const env = process.env[nome.toUpperCase().replace(/-/g, '_')];
  if (env !== undefined) return env.trim() || null;
  if (!process.env.K_SERVICE) return null;
  const t = await buscar(METADADOS, { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(3000) });
  if (!t.ok) return null;
  const { access_token } = await t.json();
  const r = await buscar(`https://secretmanager.googleapis.com/v1/projects/${PROJETO}/secrets/${nome}/versions/latest:access`,
    { headers: { Authorization: 'Bearer ' + access_token }, signal: AbortSignal.timeout(5000) });
  if (r.status === 404) return null; // ainda não cadastrado
  if (!r.ok) throw new Error('segredo ' + nome + ': ' + r.status);
  const j = await r.json();
  return Buffer.from(j.payload.data, 'base64').toString('utf8').trim() || null;
}

function portaAberta(host, porta, ms = 5000) {
  return new Promise(ok => {
    const s = net.connect({ host, port: porta });
    const fim = v => { s.destroy(); ok(v); };
    s.setTimeout(ms, () => fim('sem resposta (bloqueada ou servidor desligado)'));
    s.once('connect', () => fim('aberta'));
    s.once('error', e => fim(e.code === 'ECONNREFUSED' ? 'recusada (nada escutando nessa porta)' : 'erro de rede (' + e.code + ')'));
  });
}

// Diagnóstico sem dados sensíveis: nunca devolve token, segredo nem o endereço do hotel.
async function diagnostico(buscar = fetch) {
  const r = { quando: new Date().toISOString() };
  let base, id, sec;
  try {
    [base, id, sec] = await Promise.all(['silbeck-url', 'silbeck-client-id', 'silbeck-client-secret'].map(n => segredo(n, buscar)));
  } catch (e) { return { ...r, etapa: 'segredos', erro: 'não consegui ler o cofre (' + e.message + ')' }; }
  r.configurado = { endereco: !!base, clientId: !!id, clientSecret: !!sec };
  if (!base) return { ...r, etapa: 'segredos', erro: 'falta cadastrar silbeck-url no cofre' };
  let u;
  try { u = new URL(base); } catch { return { ...r, etapa: 'segredos', erro: 'silbeck-url inválido (ex.: http://IP-DO-HOTEL:8366/datasnap/rest)' }; }
  const raiz = base.replace(/\/+$/, '');
  r.porta = await portaAberta(u.hostname, Number(u.port) || 80);
  if (r.porta !== 'aberta') return { ...r, etapa: 'porta' };
  if (!id || !sec) return { ...r, etapa: 'segredos', erro: 'falta cadastrar silbeck-client-id e/ou silbeck-client-secret' };

  const q = new URLSearchParams({ client_id: id, client_secret: sec });
  const t0 = Date.now();
  let lib;
  try { lib = await buscar(`${raiz}/v1/Liberar?${q}`, { method: 'POST', signal: AbortSignal.timeout(10000) }); }
  catch (e) { return { ...r, etapa: 'login', erro: 'sem resposta do Silbeck (' + (e.name || 'erro') + ')' }; }
  r.login = { http: lib.status, ms: Date.now() - t0 };
  const lj = await lib.json().catch(() => null);
  if (!lib.ok || !lj || !lj.access_token) return { ...r, etapa: 'login', erro: 'o Silbeck não aceitou as credenciais' };
  r.login.ok = true; r.login.tipo = lj.token_type || null; r.login.expires_in = lj.expires_in ?? null;

  // Uma leitura simples e inofensiva: os tipos de apartamento (só a contagem).
  try {
    const ta = await buscar(`${raiz}/v1/TipoApartamento`, { headers: { Authorization: 'Bearer ' + lj.access_token }, signal: AbortSignal.timeout(10000) });
    const tj = await ta.json().catch(() => null);
    const lista = tj && (tj.listaTipoApartamento || tj.lista || Object.values(tj).find(Array.isArray));
    r.leitura = { http: ta.status, tiposDeApartamento: Array.isArray(lista) ? lista.length : null };
  } catch (e) { r.leitura = { erro: e.name || 'erro' }; }
  return { ...r, etapa: r.leitura && r.leitura.http === 200 ? 'tudo certo' : 'leitura' };
}

// Guarda o último resultado por 60 s (o endereço é público: não pode virar um jeito de martelar o servidor do hotel).
let cache = null, emCurso = null;
function diagnosticoCache(buscar = fetch) {
  if (cache && Date.now() - cache.t < 60000) return Promise.resolve(cache.r);
  if (!emCurso) emCurso = diagnostico(buscar).then(r => { cache = { t: Date.now(), r }; return r; }).finally(() => { emCurso = null; });
  return emCurso;
}

module.exports = { diagnostico, diagnosticoCache, segredo };
