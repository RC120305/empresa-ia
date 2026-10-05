// Banco de imagens do hotel no Google Drive ("Imagens do hotel cabanas"): a equipe navega pelas pastas,
// escolhe uma foto e o CRM a traz para a biblioteca (recortada em 4:3, 1200x900, JPEG).
// Acesso só de leitura, pela conta de serviço do CRM (crm-runtime), com a pasta compartilhada com ela no Drive.
// Sem chave: o token vem do servidor de metadados do Cloud Run.
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const API = (process.env.DRIVE_URL || 'https://www.googleapis.com').replace(/\/$/, '');
const RAIZ = process.env.DRIVE_PASTA_FOTOS || '1j2JGPBtyArVGkrOpj-ZdwmJ5w0qHlsO5';
const RAIZ_VIDEOS = process.env.DRIVE_PASTA_VIDEOS || '1n6gPXQ1_dBkvIizIyWsPFsrTnH4k2QZw'; // "Vídeos do hotel cabanas"
const LIMITE_VIDEO = 16 * 1024 * 1024; // o WhatsApp aceita vídeo de até 16 MB
const CONTA = 'crm-runtime@cabanas-crm.iam.gserviceaccount.com';
const METADADOS = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token?scopes=https://www.googleapis.com/auth/drive.readonly';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const PASTA = 'application/vnd.google-apps.folder';
const idValido = id => /^[\w-]{10,100}$/.test(id || '');

class ErroDrive extends Error { constructor(http, msg) { super(msg); this.http = http; } }

let token = null;
async function tokenDrive(buscar) {
  if (process.env.DRIVE_TOKEN) return process.env.DRIVE_TOKEN; // só nos testes
  if (token && token.ate > Date.now()) return token.valor;
  if (!process.env.K_SERVICE) throw new ErroDrive(503, 'O Drive só funciona com o CRM publicado.');
  const r = await buscar(METADADOS, { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(3000) });
  if (!r.ok) throw new ErroDrive(502, 'Não consegui a autorização do Google (' + r.status + ').');
  const j = await r.json();
  token = { valor: j.access_token, ate: Date.now() + Math.max(60, (j.expires_in || 300) - 60) * 1000 };
  return token.valor;
}

async function chamar(caminho, buscar, tempo = 10000) {
  const r = await buscar(API + caminho, { headers: { Authorization: 'Bearer ' + await tokenDrive(buscar) }, signal: AbortSignal.timeout(tempo) });
  if (r.ok) return r;
  const t = await r.text().catch(() => '');
  if (/accessNotConfigured|SERVICE_DISABLED|has not been used/.test(t)) throw new ErroDrive(503, 'A API do Google Drive ainda não está ligada no projeto (rodar crm/infra/ligar-drive.txt no Cloud Shell).');
  if (r.status === 404 || r.status === 403) throw new ErroDrive(403, `O CRM não tem acesso a esta pasta. No Drive, compartilhe a pasta "Imagens do hotel cabanas" (e a "Vídeos do hotel cabanas") com ${CONTA} como Leitor.`);
  throw new ErroDrive(502, 'O Drive não respondeu agora (' + r.status + ').');
}

// Pastas e fotos de uma pasta (a raiz do banco de imagens, se nada for pedido).
async function listar(pastaId, buscar = fetch) {
  const id = pastaId || RAIZ;
  if (!idValido(id)) throw new ErroDrive(400, 'Pasta inválida.');
  const info = await (await chamar(`/drive/v3/files/${id}?fields=id,name,mimeType,parents&supportsAllDrives=true`, buscar)).json();
  if (info.mimeType !== PASTA) throw new ErroDrive(400, 'Isso não é uma pasta.');
  const itens = [];
  let pagina = '';
  for (let i = 0; i < 5; i++) {
    const q = encodeURIComponent(`'${id}' in parents and trashed = false and (mimeType = '${PASTA}' or mimeType contains 'image/' or mimeType contains 'video/')`);
    const j = await (await chamar(`/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name,mimeType,size)&orderBy=folder,name&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true${pagina ? '&pageToken=' + encodeURIComponent(pagina) : ''}`, buscar)).json();
    itens.push(...(j.files || []));
    if (!j.nextPageToken) break;
    pagina = j.nextPageToken;
  }
  return {
    pasta: { id: info.id, nome: info.name, raiz: id === RAIZ || id === RAIZ_VIDEOS, pai: id === RAIZ || id === RAIZ_VIDEOS ? null : ((info.parents || [])[0] || null) },
    raizes: { fotos: RAIZ, videos: RAIZ_VIDEOS },
    pastas: itens.filter(f => f.mimeType === PASTA).map(f => ({ id: f.id, nome: f.name })),
    fotos: itens.filter(f => f.mimeType !== PASTA).map(f => ({ id: f.id, nome: f.name, ...(String(f.mimeType).startsWith('video/') ? { video: true, mb: Math.round(Number(f.size || 0) / 1048576 * 10) / 10 } : {}) })),
  };
}

// Miniatura de uma foto do Drive (para a tela escolher). O link da miniatura exige o mesmo token.
const miniaturas = new Map();
async function miniatura(id, buscar = fetch, lado = 400) {
  if (!idValido(id)) throw new ErroDrive(400, 'Foto inválida.');
  const chave = id + ':' + lado;
  if (miniaturas.has(chave)) return miniaturas.get(chave);
  const info = await (await chamar(`/drive/v3/files/${id}?fields=mimeType,thumbnailLink&supportsAllDrives=true`, buscar)).json();
  if (!String(info.mimeType || '').startsWith('image/')) throw new ErroDrive(400, 'Isso não é uma foto.');
  if (!info.thumbnailLink) throw new ErroDrive(404, 'O Drive ainda não gerou a miniatura desta foto.');
  const r = await buscar(info.thumbnailLink.replace(/=s\d+$/, '') + '=s' + lado, { headers: { Authorization: 'Bearer ' + await tokenDrive(buscar) }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new ErroDrive(502, 'Não consegui a miniatura (' + r.status + ').');
  const dados = Buffer.from(await r.arrayBuffer());
  if (lado <= 400) { if (miniaturas.size > 300) miniaturas.delete(miniaturas.keys().next().value); miniaturas.set(chave, dados); }
  return dados;
}

// Orientação gravada pela câmera (EXIF 0x0112), para endireitar a foto antes do recorte.
function orientacaoExif(b) {
  if (b[0] !== 0xff || b[1] !== 0xd8) return 1;
  let i = 2;
  while (i + 4 < b.length && b[i] === 0xff) {
    const marca = b[i + 1], tam = b.readUInt16BE(i + 2);
    if (marca === 0xe1 && b.toString('latin1', i + 4, i + 10) === 'Exif\0\0') {
      const t = i + 10, le = b.toString('latin1', t, t + 2) === 'II';
      const u16 = p => (le ? b.readUInt16LE(p) : b.readUInt16BE(p)), u32 = p => (le ? b.readUInt32LE(p) : b.readUInt32BE(p));
      const ifd = t + u32(t + 4);
      if (ifd + 2 > b.length) return 1;
      for (let k = 0, n = u16(ifd); k < n; k++) {
        const e = ifd + 2 + k * 12;
        if (e + 10 > b.length) return 1;
        if (u16(e) === 0x0112) { const v = u16(e + 8); return v >= 1 && v <= 8 ? v : 1; }
      }
      return 1;
    }
    if (marca === 0xda) break; // começou a imagem
    i += 2 + tam;
  }
  return 1;
}
const GIRO = { 2: 'hflip', 3: 'hflip,vflip', 4: 'vflip', 5: 'transpose=0', 6: 'transpose=1', 7: 'transpose=3', 8: 'transpose=2' };

// Recorta no centro em 4:3 e reduz para 1200x900 (o mesmo padrão das fotos da curadoria do Designer).
function recortar(dados) {
  return new Promise((ok, falha) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'foto-'));
    const entrada = path.join(dir, 'entrada'), saida = path.join(dir, 'saida.jpg');
    fs.writeFileSync(entrada, dados);
    const giro = GIRO[orientacaoExif(dados)];
    const filtro = (giro ? giro + ',' : '') + 'scale=1200:900:force_original_aspect_ratio=increase:flags=lanczos,crop=1200:900,format=yuvj420p';
    execFile(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-noautorotate', '-i', entrada, '-vf', filtro, '-frames:v', '1', '-q:v', '4', '-y', saida], { timeout: 60000 }, erro => {
      try {
        if (erro) return falha(new ErroDrive(422, 'Não consegui preparar esta foto (formato não suportado?).'));
        const jpg = fs.readFileSync(saida);
        if (jpg[0] !== 0xff || jpg[1] !== 0xd8) return falha(new ErroDrive(422, 'Não consegui preparar esta foto.'));
        ok(jpg);
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    });
  });
}

// Traz a foto do Drive pronta para a biblioteca. Usa a versão de 1600 px do próprio Drive (já endireitada,
// lê também HEIC e não estoura a memória do CRM); se não houver, baixa o original (até 20 MB).
async function prepararFoto(id, buscar = fetch) {
  if (!idValido(id)) throw new ErroDrive(400, 'Foto inválida.');
  const info = await (await chamar(`/drive/v3/files/${id}?fields=id,name,mimeType,size,thumbnailLink&supportsAllDrives=true`, buscar)).json();
  if (!String(info.mimeType || '').startsWith('image/')) throw new ErroDrive(400, 'Isso não é uma foto.');
  let dados = null;
  if (info.thumbnailLink) dados = await miniatura(id, buscar, 1600).catch(() => null);
  if (!dados) {
    if (Number(info.size) > 20 * 1024 * 1024) throw new ErroDrive(413, 'Foto grande demais (mais de 20 MB).');
    dados = Buffer.from(await (await chamar(`/drive/v3/files/${id}?alt=media&supportsAllDrives=true`, buscar, 30000)).arrayBuffer());
  }
  return { jpg: await recortar(dados), nome: info.name };
}

// Vídeo do Drive para a biblioteca: MP4 de até 16 MB (limite do WhatsApp), sem conversão.
async function prepararVideo(id, buscar = fetch) {
  if (!idValido(id)) throw new ErroDrive(400, 'Vídeo inválido.');
  const info = await (await chamar(`/drive/v3/files/${id}?fields=id,name,mimeType,size&supportsAllDrives=true`, buscar)).json();
  if (info.mimeType !== 'video/mp4') throw new ErroDrive(400, 'O WhatsApp só aceita vídeo em MP4. Peça à produtora a versão em MP4 (H.264).');
  const mb = Math.round(Number(info.size || 0) / 1048576 * 10) / 10;
  if (Number(info.size) > LIMITE_VIDEO) throw new ErroDrive(413, `Este vídeo tem ${mb} MB e o WhatsApp aceita até 16 MB. Peça à produtora uma versão para WhatsApp (MP4, 720p, até uns 60 segundos).`);
  const dados = Buffer.from(await (await chamar(`/drive/v3/files/${id}?alt=media&supportsAllDrives=true`, buscar, 90000)).arrayBuffer());
  if (dados.length > LIMITE_VIDEO) throw new ErroDrive(413, 'Vídeo acima de 16 MB.');
  return { mp4: dados, nome: info.name, mb };
}

module.exports = { listar, miniatura, prepararFoto, prepararVideo, RAIZ_VIDEOS, recortar, orientacaoExif, ErroDrive, RAIZ, CONTA, idValido };
