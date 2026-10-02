// Transcrição dos áudios dos clientes (Speech-to-Text v2 do Google, no mesmo projeto do CRM, sem chave:
// usa a conta de serviço do Cloud Run). O texto aparece na caixa e o Gilberto lê como se o cliente tivesse escrito.
// Áudio de até 1 minuto: reconhecimento direto. Mais longo: o ffmpeg corta em pedaços de 50 s e cada um é
// reconhecido em seguida (até 10 pedaços, uns 8 minutos). Sem ffmpeg, fica marcado para a equipe ouvir.
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
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
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const PEDACO_S = 50, MAX_PEDACOS = 10;

// Corta o áudio em pedaços de 50 s (Opus mono 16 kHz, formato que o reconhecimento lê sem configuração).
function cortar(dados) {
  return new Promise((ok, falha) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-'));
    const entrada = path.join(dir, 'entrada');
    fs.writeFileSync(entrada, dados);
    execFile(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', entrada, '-ac', '1', '-ar', '16000', '-c:a', 'libopus', '-b:a', '24k',
      '-f', 'segment', '-segment_time', String(PEDACO_S), '-reset_timestamps', '1', path.join(dir, 'p%03d.ogg')], { timeout: 60000 }, erro => {
      try {
        if (erro) return falha(new ErroTranscricao('longo', 'não deu para cortar o áudio (' + (erro.code || erro.message) + ')'));
        ok(fs.readdirSync(dir).filter(n => /^p\d+\.ogg$/.test(n)).sort().map(n => fs.readFileSync(path.join(dir, n))));
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    });
  });
}

// Devolve { status: 'ok' | 'vazio', texto }. Lança ErroTranscricao com status 'longo' ou 'falhou'.
async function transcrever(dados, buscar = fetch) {
  try { return await reconhecer(dados, buscar); } catch (e) {
    if (!(e instanceof ErroTranscricao) || e.status !== 'longo') throw e;
    const pedacos = await cortar(dados); // sem ffmpeg ou falha ao cortar: continua "longo"
    if (!pedacos.length || pedacos.length > MAX_PEDACOS) throw new ErroTranscricao('longo', pedacos.length + ' pedaços');
    const textos = [];
    for (const p of pedacos) textos.push((await reconhecer(p, buscar)).texto);
    const texto = textos.filter(Boolean).join(' ').trim();
    return texto ? { status: 'ok', texto } : { status: 'vazio', texto: '' };
  }
}

async function reconhecer(dados, buscar) {
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
