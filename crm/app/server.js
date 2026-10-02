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
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };
const ESTATICOS = {};
for (const [rota, arquivo] of [['/caixa', 'caixa.html'], ['/caixa.css', 'caixa.css'], ['/caixa.js', 'caixa.js'], ['/vendor/supabase-2.117.2.js', 'vendor/supabase-2.117.2.js']]) {
  try { ESTATICOS[rota] = { corpo: fs.readFileSync(path.join(PUB, arquivo)), tipo: TIPOS[path.extname(arquivo)] }; } catch (e) { /* arquivo ausente: rota fica 404 */ }
}
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
let ultimoErroMeta = null;
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
          const res = await rpc('registrar_entrada_whatsapp', {
            p_numero_id: numeroId, p_de: m.from, p_nome: nomes[m.from] || null, p_wamid: m.id, p_tipo: m.type,
            p_corpo: corpoDe(m) || null, p_midia_id: (midia && midia.id) || null,
            p_quando: m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : null,
          }, buscar);
          item.gravado = true; gravadas++;
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
  return equipe[0];
}

// Ritmo de gente: antes de cada balão o cliente vê "digitando…" por um tempo proporcional ao texto.
// Especificação §6.6: ~6 a 8 caracteres por segundo, mínimo 2 s e máximo 12 s por balão (calibrar nos testes).
// FATOR_DIGITACAO ajusta tudo sem mexer no código (0 nos testes; 0,5 = metade do tempo).
const FATOR_DIGITACAO = process.env.FATOR_DIGITACAO !== undefined ? Number(process.env.FATOR_DIGITACAO) : 1;
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
async function gravarNoStorage(caminho, dados, mime, buscar) {
  const h = cabecalhosBanco(); delete h['Content-Type'];
  const r = await buscar(`${SUPABASE_URL}/storage/v1/object/midias/${caminho}`, {
    method: 'POST', headers: { ...h, 'Content-Type': mime, 'x-upsert': 'true' }, body: dados, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error('storage ' + r.status + ' ' + (await r.text().catch(() => '')).slice(0, 150));
}
async function lerDoStorage(caminho, buscar) {
  const h = cabecalhosBanco(); delete h['Content-Type'];
  const r = await buscar(`${SUPABASE_URL}/storage/v1/object/authenticated/midias/${caminho}`, { headers: h, signal: AbortSignal.timeout(20000) });
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
    const f = ESTATICOS['/fotos/' + msg.midia_caminho.slice('biblioteca/'.length)];
    if (!f) throw new ErroEnvio(404, 'Foto não encontrada.');
    return { dados: f.corpo, mime: f.tipo, nome: msg.midia_caminho.slice(11) };
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
  const id = await rpc('registrar_saida_midia', { p_conversa: conv.id, p_wamid: wamid, p_tipo: tipo, p_legenda: legenda, p_caminho: guardado, p_mime: mime, p_nome: tipo === 'document' ? nome : null, p_autor: equipe.id }, buscar);
  return { ok: true, id, wamid, tipo, corpo: legenda, enviada_em: new Date().toISOString() };
}

// Envia 1 ou mais balões (texto separado por uma linha só com ---), um por vez, com "digitando…" antes de cada um.
async function enviarPelaEquipe(tokenUsuario, corpo, buscar = fetch) {
  if (!WA_TOKEN || !bancoLigado()) throw new ErroEnvio(503, 'O envio ainda não está configurado no servidor.');
  const bruto = Array.isArray(corpo.baloes) ? corpo.baloes : [typeof corpo.texto === 'string' ? corpo.texto : ''];
  const baloes = bruto.map(b => String(b || '').trim()).filter(b => b && !/^[-–—\s]+$/.test(b)); // ignora balão só de traços
  if (!baloes.length || baloes.length > 6 || baloes.some(b => b.length > 4096)) throw new ErroEnvio(400, 'Envie de 1 a 6 balões, cada um com até 4.096 caracteres.');
  if (!/^[0-9a-f-]{36}$/i.test(String(corpo.conversa_id || ''))) throw new ErroEnvio(400, 'Conversa inválida.');
  const equipe = await autenticarEquipe(tokenUsuario, buscar);
  const { conv, para, wamidCliente } = await carregarConversaParaEnvio(corpo.conversa_id, buscar);

  const enviadas = [];
  for (const texto of baloes) {
    await mostrarDigitando(conv, wamidCliente, buscar);
    await esperar(tempoDigitacao(texto));
    try {
      enviadas.push(await enviarTexto(conv, para, texto, equipe.id, buscar));
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
// Cria o orçamento: recota no Silbeck na hora, grava e devolve o link (ferramenta gerar_orcamento).
async function criarOrcamento(entrada, ctx, buscar = fetch) {
  if (!bancoLigado()) return { ok: false, erro: 'Banco não configurado.' };
  const cot = await silbeck.cotar(entrada, buscar);
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
    opcoes: m.opcoes.map(o => ({ codigo: o.codigo, nome: o.nome, valor_total: o.valor_total, media_por_noite: o.media_por_noite, parcela_6x: o.parcela_6x })),
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
  if (!fotos.length || fotos.length > 5) throw new ErroEnvio(400, 'Escolha de 1 a 5 fotos.');
  if (fotos.some(f => !/^[\w.-]+\.jpg$/.test(f) || !ESTATICOS['/fotos/' + f])) throw new ErroEnvio(400, 'Foto fora da biblioteca do hotel.');
  const legenda = String(corpo.legenda || '').trim().slice(0, 1024);
  const equipe = await autenticarEquipe(tokenUsuario, buscar);
  const { conv, para } = await carregarConversaParaEnvio(corpo.conversa_id, buscar);
  const enviadas = [];
  for (const [i, f] of fotos.entries()) {
    if (i) await esperar(1500 * FATOR_DIGITACAO);
    const image = { link: `${URL_PUBLICA}/fotos/${f}`, ...(i === 0 && legenda ? { caption: legenda } : {}) };
    const r = await chamarMeta(`${encodeURIComponent(conv.numero_id)}/messages`, { messaging_product: 'whatsapp', recipient_type: 'individual', to: para, type: 'image', image }, buscar);
    if (!r.ok || !r.json.messages || !r.json.messages[0]) {
      const e = r.json.error || {};
      ultimoErroMeta = { quando: new Date().toISOString(), http: r.status, codigo: e.code || null, mensagem: String(e.message || '').slice(0, 200) };
      const err = new ErroEnvio(502, 'A Meta não aceitou a foto' + (e.code ? ` (código ${e.code})` : '') + '.');
      err.enviadas = enviadas;
      throw err;
    }
    const id = await rpc('registrar_saida_midia', { p_conversa: conv.id, p_wamid: r.json.messages[0].id, p_tipo: 'image', p_legenda: i === 0 ? legenda : '', p_caminho: 'biblioteca/' + f, p_mime: 'image/jpeg', p_nome: null, p_autor: equipe.id }, buscar);
    enviadas.push({ id, arquivo: f, corpo: i === 0 ? legenda : '', enviada_em: new Date().toISOString() });
  }
  return { ok: true, enviadas };
}

// ---------- Ficha, equipe, cotação e orçamento pela caixa (equipe logada) ----------
async function lerCorpo(req, limite = 64e3) {
  const partes = []; let t = 0;
  for await (const p of req) { t += p.length; if (t > limite) throw new ErroEnvio(413, 'Pedido grande demais.'); partes.push(p); }
  try { return JSON.parse(Buffer.concat(partes).toString('utf8') || '{}'); } catch (e) { throw new ErroEnvio(400, 'Pedido inválido.'); }
}
async function patchBanco(tabela, filtro, dados, buscar = fetch) {
  const r = await buscar(`${SUPABASE_URL}/rest/v1/${tabela}?${filtro}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify(dados), signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new ErroEnvio(r.status === 400 ? 400 : 502, 'Não deu para salvar' + (r.status === 400 ? ' (o banco precisa da migração 007?)' : '') + '.');
}
const API_EQUIPE = {
  // Lista da equipe (para o "responsável" da conversa)
  'GET /api/equipe': async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?ativo=eq.true&select=id,nome,papel&order=nome`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    return { ok: true, equipe: r.ok ? await r.json() : [] };
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
    return r;
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
  const r = await buscar(`${SUPABASE_URL}/rest/v1/mensagens?id=eq.${id}&select=id,tipo,midia_id,midia_caminho,transcricao,transcricao_status`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
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
  await autenticarEquipe(tokenUsuario, buscar);
  if (sugerindo.has(id)) throw new ErroEnvio(429, 'Já estou preparando uma sugestão para esta conversa.');
  sugerindo.add(id);
  try {
    const c = await buscar(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${id}&select=id,canal,numero_id,contato:contatos(nome)`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    const conv = c.ok ? (await c.json())[0] : null;
    if (!conv) throw new ErroEnvio(404, 'Conversa não encontrada.');
    const url = campos => `${SUPABASE_URL}/rest/v1/mensagens?conversa_id=eq.${id}&select=${campos}&order=enviada_em.desc&limit=40`;
    let h = await buscar(url('id,direcao,tipo,corpo,enviada_em,midia_id,midia_caminho,transcricao,transcricao_status'), { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    if (!h.ok) h = await buscar(url('direcao,tipo,corpo,enviada_em'), { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }); // banco sem a migração 005
    const historico = h.ok ? (await h.json()).reverse() : [];
    // Áudios do cliente ainda sem texto: transcreve os 3 mais recentes antes de o Gilberto ler.
    const pendentes = historico.filter(m => m.tipo === 'audio' && m.direcao === 'entrada' && m.id && (!m.transcricao_status || m.transcricao_status === 'falhou')).slice(-3);
    await Promise.all(pendentes.map(m => transcreverMensagem(m, buscar).then(r => { m.transcricao = r.texto; m.transcricao_status = r.status; }).catch(() => {})));
    const nome = conv.contato && conv.contato.nome;
    const executores = {
      gerar_orcamento: entrada => criarOrcamento(entrada, { conversa_id: conv.id, numero_id: conv.numero_id, primeiro_nome: nome, criado_por: 'gilberto' }, buscar),
      // Modo sugestão: o Gilberto escolhe as fotos; quem envia é a equipe, pelo painel da sugestão.
      enviar_fotos: async entrada => {
        const fotos = orcamento.escolherFotos(entrada);
        return fotos.length
          ? { ok: true, modo: 'sugestao', fotos: fotos.map(f => ({ arquivo: f.arquivo, descricao: f.descricao })), aviso: 'Nesta fase a equipe envia as fotos junto com a sua mensagem: escreva o texto como se as fotos fossem logo em seguida, sem descrevê-las como se você as tivesse tirado.' }
          : { ok: false, erro: 'Não há foto na biblioteca para esse pedido. Não prometa foto: ofereça descrever ou avise a equipe nas notas_internas.' };
      },
    };
    return { ok: true, ...(await gilberto.sugerir(historico, { canal: conv.canal, nome }, executores)) };
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
    const base = { ok: true, servico: 'crm-cabanas', versao, segredos: { verify: !!VERIFY, appSecret: !!APP_SECRET, supabase: bancoLigado(), supabasePublica: chavePublicaOk(), whatsappToken: !!WA_TOKEN, anthropic: !!process.env.ANTHROPIC_API_KEY }, gilberto: { instrucoes: gilberto.sistemaPronto(), modelo: gilberto.MODELO, ferramentas: gilberto.ferramentas() }, silbeck: silbeck.MODO(), chaveSupabase: tipoChave(SUPABASE_KEY), ipSaida };
    if (!bancoLigado()) return json(res, 200, base);
    // Confere se o banco responde e se a chave tem permissão de servidor: chama a função de status com um
    // ID que não existe (não altera nada). Chave sem permissão de servidor recebe 401/403.
    rpc('registrar_status_whatsapp', { p_wamid: 'diagnostico', p_status: 'read', p_erro: null })
      .then(() => json(res, 200, { ...base, banco: 'ok' }))
      .catch(() => json(res, 200, { ...base, banco: 'erro', erro: ultimoErroBanco }))
      .catch(() => json(res, 200, { ...base, banco: 'sem conexão' }));
    return;
  }

  // Teste da ponte com o Silbeck (porta, login, uma leitura). Sem dados sensíveis; resultado guardado por 60 s.
  if (url.pathname === '/saude/silbeck') {
    silbeck.diagnosticoCache()
      .then(r => json(res, 200, { ...r, ipSaida }))
      .catch(e => json(res, 200, { etapa: 'erro', erro: String(e.message || e).slice(0, 150), ipSaida }));
    return;
  }

  // Página pública do orçamento e o "Quero reservar esta".
  const mo = url.pathname.match(/^\/o\/([A-Za-z0-9_-]{22})(\/quero)?$/);
  if (mo) {
    if (limiteExcedido(req)) { res.writeHead(429, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '60' }); return res.end('Muitos acessos. Tente de novo em 1 minuto.'); }
    const token = mo[1];
    if (!mo[2] && req.method === 'GET') {
      const previa = url.searchParams.get('previa') === '1';
      lerOrcamento(token).then(async o => {
        if (!o) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...cabecalhosSeguranca() }); return res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hotel Cabanas</title><p style="font-family:sans-serif;padding:24px">Orçamento não encontrado. Fale com a gente pelo WhatsApp que enviamos um novo.</p>'); }
        if (!previa) await rpc('registrar_abertura_orcamento', { p_token: token }).catch(() => {}); // antes de responder: no Cloud Run a CPU para depois da resposta
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', ...cabecalhosSeguranca() });
        res.end(orcamento.pagina(o, { previa }));
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
          if (!corpo.previa) {
            await fetch(`${SUPABASE_URL}/rest/v1/orcamentos?id=eq.${o.id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ escolhida: op.codigo, escolhida_em: new Date().toISOString() }), signal: AbortSignal.timeout(5000) }).catch(() => {});
            await fetch(`${SUPABASE_URL}/rest/v1/orcamento_eventos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ orcamento_id: o.id, tipo: 'quero_reservar', dados: { codigo: op.codigo } }), signal: AbortSignal.timeout(5000) }).catch(() => {});
          }
          const cat = orcamento.CATALOGO[op.codigo];
          const nomeOp = cat ? cat.nome : op.nome;
          const texto = `Oi! Quero reservar ${/^Cabana/.test(nomeOp) ? 'a' : 'o'} ${nomeOp} de ${orcamento.periodo(o.data_entrada, o.data_saida)} (orçamento ${token.slice(0, 6)}).`;
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

  const rotaEquipe = API_EQUIPE[req.method + ' ' + url.pathname];
  if (rotaEquipe) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return json(res, 401, { ok: false, erro: 'Entre de novo.' });
    (async () => {
      if (!bancoLigado()) throw new ErroEnvio(503, 'O banco ainda não está configurado.');
      const eu = await autenticarEquipe(auth.slice(7));
      const corpo = req.method === 'POST' ? await lerCorpo(req) : {};
      return rotaEquipe(corpo, eu, url);
    })().then(r => json(res, 200, r)).catch(e => {
      if (e instanceof silbeck.ErroSilbeck) e = e.http === 400 ? new ErroEnvio(400, 'Pedido inválido: ' + e.message + '.') : new ErroEnvio(502, 'O Silbeck não respondeu agora (' + e.message + ').');
      if (!(e instanceof ErroEnvio)) console.error(JSON.stringify({ evento: 'falha_api', rota: url.pathname, erro: String(e.message || e).slice(0, 200) }));
      json(res, e.http || 500, { ok: false, erro: e instanceof ErroEnvio ? e.message : 'Não deu agora. Tente de novo.' });
    });
    return;
  }

  if (url.pathname === '/api/fotos' && req.method === 'GET') {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return json(res, 401, { ok: false, erro: 'Entre de novo.' });
    autenticarEquipe(auth.slice(7)).then(() => json(res, 200, { ok: true, grupos: orcamento.biblioteca() }))
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

  if (url.pathname === '/webhook/status') return json(res, 200, { recebidos: recentes.length, ultimoErroBanco, ultimoErroMeta, ultimoDigitando, ultimoErroTranscricao: transcricao.ultimoErro(), ultimos: recentes });

  if (url.pathname === '/') { res.writeHead(302, { Location: '/caixa' }); return res.end(); }
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><title>CRM Cabanas</title><p style="font-family:sans-serif">Página não encontrada. <a href="/caixa">Ir para a caixa de entrada</a> · versão ' + versao.replace(/[^\w.-]/g, '') + '</p>');
});

if (require.main === module) servidor.listen(porta, () => { console.log('CRM Cabanas ouvindo na porta ' + porta); conferirIpSaida(); });
module.exports = { servidor, assinaturaValida, registrar, corpoDe, numeroParaEnvio, extDe };
