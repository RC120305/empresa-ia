// Transcrição dos áudios dos clientes (Speech-to-Text v2 do Google, no mesmo projeto do CRM, sem chave:
// usa a conta de serviço do Cloud Run). O texto aparece na caixa e o Gilberto lê como se o cliente tivesse escrito.
// Nesta fase: áudios de até 1 minuto (reconhecimento direto). Mais longos ficam marcados para a equipe ouvir.
const PROJETO = process.env.GOOGLE_CLOUD_PROJECT || 'cabanas-crm';
const BASE = process.env.TRANSCRICAO_URL || 'https://speech.googleapis.com';
const MODELO = process.env.TRANSCRICAO_MODELO || 'long';
const METADADOS = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

class ErroTranscricao extends Error { constructor(status, msg) { super(msg); this.status = status; } }

let token = null;
async function tokenGoogle(buscar) {
  if (process.env.GOOGLE_TOKEN) return process.env.GOOGLE_TOKEN; // só nos testes
  if (token && token.ate > Date.now()) return token.valor;
  if (!process.env.K_SERVICE) throw new ErroTranscricao('falhou', 'fora do Cloud Run');
  const r = await buscar(METADADOS, { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(3000) });
  if (!r.ok) throw new ErroTranscricao('falhou', 'token do Google ' + r.status);
  const j = await r.json();
  token = { valor: j.access_token, ate: Date.now() + Math.max(60, (j.expires_in || 300) - 60) * 1000 };
  return token.valor;
}

let ultimoErro = null;
// Devolve { status: 'ok' | 'vazio', texto }. Lança ErroTranscricao com status 'longo' ou 'falhou'.
async function transcrever(dados, buscar = fetch) {
  if (dados.length > 10 * 1024 * 1024) throw new ErroTranscricao('longo', 'arquivo grande demais para o reconhecimento direto');
  const t = await tokenGoogle(buscar);
  const r = await buscar(`${BASE}/v2/projects/${PROJETO}/locations/global/recognizers/_:recognize`, {
    method: 'POST', signal: AbortSignal.timeout(60000),
    headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: { autoDecodingConfig: {}, languageCodes: ['pt-BR'], model: MODELO, features: { enableAutomaticPunctuation: true } },
      content: dados.toString('base64'),
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = String((j.error && j.error.message) || r.status).slice(0, 300);
    ultimoErro = { quando: new Date().toISOString(), http: r.status, mensagem: msg };
    if (r.status === 400 && /duration|too long|exceed|limit|longer/i.test(msg)) throw new ErroTranscricao('longo', msg);
    throw new ErroTranscricao('falhou', msg);
  }
  const texto = (j.results || []).map(x => (x.alternatives && x.alternatives[0] && x.alternatives[0].transcript) || '').join(' ').replace(/\s+/g, ' ').trim();
  return texto ? { status: 'ok', texto } : { status: 'vazio', texto: '' };
}

module.exports = { transcrever, ErroTranscricao, ultimoErro: () => ultimoErro };
