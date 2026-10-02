// CRM Cabanas: fase 1 (início). Recebe os eventos da Meta (WhatsApp) com verificação de assinatura.
// Segredos vêm do Secret Manager como variáveis de ambiente: META_VERIFY_TOKEN, META_APP_SECRET e
// SUPABASE_SECRET_KEY. Nada de chave no código. Conteúdo de mensagens vai para o banco (Supabase,
// São Paulo), nunca para página pública nem para o log.
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const gilberto = require('./gilberto');
const silbeck = require('./silbeck');
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

// IP de saída do CRM na internet (deve ser o IP fixo 35.247.204.86, liberado no roteador do hotel para o Silbeck).
let ipSaida = null;
function conferirIpSaida() {
  fetch('https://api.ipify.org', { signal: AbortSignal.timeout(5000) }).then(r => r.text()).then(t => { ipSaida = t.trim().slice(0, 45); }).catch(() => {});
}

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/saude') {
    const base = { ok: true, servico: 'crm-cabanas', versao, segredos: { verify: !!VERIFY, appSecret: !!APP_SECRET, supabase: bancoLigado(), supabasePublica: chavePublicaOk(), whatsappToken: !!WA_TOKEN, anthropic: !!process.env.ANTHROPIC_API_KEY }, gilberto: { instrucoes: gilberto.sistemaPronto(), modelo: gilberto.MODELO }, chaveSupabase: tipoChave(SUPABASE_KEY), ipSaida };
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

  if (url.pathname === '/webhook/status') return json(res, 200, { recebidos: recentes.length, ultimoErroBanco, ultimoErroMeta, ultimoDigitando, ultimos: recentes });

  if (url.pathname === '/') { res.writeHead(302, { Location: '/caixa' }); return res.end(); }
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><title>CRM Cabanas</title><p style="font-family:sans-serif">Página não encontrada. <a href="/caixa">Ir para a caixa de entrada</a> · versão ' + versao.replace(/[^\w.-]/g, '') + '</p>');
});

if (require.main === module) servidor.listen(porta, () => { console.log('CRM Cabanas ouvindo na porta ' + porta); conferirIpSaida(); });
module.exports = { servidor, assinaturaValida, registrar, corpoDe, numeroParaEnvio, extDe };
