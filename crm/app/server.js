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
const drive = require('./drive');
const produtos = require('./produtos');
const vitrine = require('./vitrine');
const bb = require('./bb');
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
// A cada publicação a tela pede caixa.js/caixa.css com a versão no endereço: o navegador nunca fica com a versão velha.
const V = encodeURIComponent((process.env.VERSAO || 'local').replace(/[^\w.-]/g, ''));
if (ESTATICOS['/caixa']) ESTATICOS['/caixa'].corpo = Buffer.from(ESTATICOS['/caixa'].corpo.toString('utf8').replace('href="/caixa.css"', `href="/caixa.css?v=${V}"`).replace('src="/caixa.js"', `src="/caixa.js?v=${V}"`));
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

// Tarefas da venda (para o responsável) e alertas do sino: "Cliente pediu produto" (na hora, se veio do cliente)
// e "Lançar na conta" às 8h do dia do check-in (com a tarefa de lançar ligada ao alerta).
const as8h = data => { const d = new Date(data + 'T08:00:00-04:00'); return (d > new Date() ? d : new Date()).toISOString(); };
async function criarAlerta(a, buscar = fetch) {
  const r = await buscar(`${SUPABASE_URL}/rest/v1/alertas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify(a), signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (r && !r.ok) console.warn(JSON.stringify({ evento: 'alerta_nao_criado', http: r.status })); // banco sem a migração 013
}
async function tarefasEAlertasDaVenda(p, venda, { negocio, responsavel, chegada, pedidoDoCliente, origemTxt }, buscar = fetch) {
  const nomes = [];
  let tarefaLancar = null;
  if (negocio) for (const t of produtos.tarefasDaVenda(p, venda, { data_entrada: chegada })) {
    const r = await buscar(`${SUPABASE_URL}/rest/v1/tarefas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ negocio_id: negocio, responsavel_id: responsavel || null, criado_por: 'CRM', ...t }) }).catch(() => null);
    const criada = r && r.ok ? (await r.json().catch(() => []))[0] : null;
    if (t.tipo === 'Lançar na conta do hóspede' && criada) tarefaLancar = criada.id;
    nomes.push(t.tipo);
  }
  const nome = p.nome + (venda.variacao ? ' (' + venda.variacao + ')' : '');
  const base = { conversa_id: venda.conversa_id, negocio_id: negocio || null, venda_id: venda.id || null };
  if (pedidoDoCliente) await criarAlerta({ ...base, tipo: 'produto_pedido', titulo: 'Cliente pediu produto',
    info: `${nome}${venda.valor_total != null ? ' · ' + produtos.brl(venda.valor_total) : ''} · ${origemTxt}. ${({ ativ: 'Agendar no sistema das atividades', terc: 'Pedir o horário ao parceiro', simples: 'Preparar' })[p.tipo_reserva] || 'Reservar'} e confirmar com o cliente.` }, buscar);
  const dia = venda.data_uso && venda.data_uso < (chegada || '9999') ? venda.data_uso : (chegada || venda.data_uso);
  if (venda.id && dia) await criarAlerta({ ...base, tarefa_id: tarefaLancar, tipo: 'lancar_conta', titulo: 'Lançar na conta do hóspede',
    info: `${nome} · ${produtos.brl(venda.valor_total)} · check-in ${dia.split('-').reverse().join('/')}. Lançar na conta (pago no check-out).`, quando: as8h(dia) }, buscar);
  return nomes;
}

// Aceite do cliente (botão da oferta ou extra marcado na página do orçamento): o CRM registra a venda na conta do hóspede
// e cria as tarefas para a equipe reservar (agendar/preparar/pedir horário + lançar na conta), para o responsável da conversa.
// Se faltar dado para fechar o valor (ex.: qual das 3 massagens), cria a tarefa de confirmar com o cliente.
async function aceiteDoCliente({ conversa_id, oferta_id, produto_codigo, variacao, origem, quantidade, adicionais, data_uso }, buscar = fetch) {
  const p = await produtoPorCodigo(produto_codigo, buscar).catch(() => null);
  if (!p) return null;
  const nr = await buscar(`${SUPABASE_URL}/rest/v1/negocios?conversa_id=eq.${conversa_id}&select=id,etapa,data_entrada,responsavel_id&order=criado_em.desc&limit=5`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const ns = nr && nr.ok ? await nr.json().catch(() => []) : [];
  const negocio = ns.find(x => !['res', 'perd'].includes(x.etapa)) || ns[0] || null;
  const cr = await buscar(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${conversa_id}&select=atribuida_a`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const responsavel = ((cr && cr.ok ? (await cr.json().catch(() => []))[0] : null) || {}).atribuida_a || (negocio && negocio.responsavel_id) || null;
  // Pessoas e data: do último orçamento da conversa (ou do negócio)
  const or = await buscar(`${SUPABASE_URL}/rest/v1/orcamentos?conversa_id=eq.${conversa_id}&select=adultos,criancas_idades,data_entrada&order=criado_em.desc&limit=1`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const orc = (or && or.ok ? (await or.json().catch(() => []))[0] : null) || null;
  const pessoas = orc ? orc.adultos + (orc.criancas_idades || []).filter(i => !p.idade_minima || i >= p.idade_minima).length : null;
  const chegada = (negocio && negocio.data_entrada) || (orc && orc.data_entrada) || null;
  const vs = Array.isArray(p.variacoes) ? p.variacoes : [];
  const nomeVar = variacao || (vs.length === 1 ? vs[0].nome : null);
  const qtd = quantidade || (p.unidade === 'pessoa' ? pessoas : 1);
  const origemTxt = ({ pagina: 'marcou na página do orçamento', vitrine: 'escolheu na página de extras' })[origem] || 'aceitou no WhatsApp';
  const tarefa = t => buscar(`${SUPABASE_URL}/rest/v1/tarefas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
    body: JSON.stringify({ negocio_id: negocio.id, responsavel_id: responsavel, criado_por: 'CRM', ...t }) }).catch(() => null);
  let v = null;
  try { if (qtd) v = produtos.calcularVenda(p, { variacao: nomeVar, adicionais: adicionais || [], quantidade: qtd }); } catch (e) { v = null; }
  if (!v) { // falta a opção, as pessoas ou o preço em número: a equipe confirma
    if (negocio) {
      await tarefa({ tipo: 'Confirmar e registrar venda', descricao: `O cliente ${origemTxt}: ${p.nome}${nomeVar ? ' (' + nomeVar + ')' : ''}. Confirme ${!nomeVar && vs.length > 1 ? 'a opção (' + vs.map(x => x.nome).join(', ') + '), ' : ''}${!qtd ? 'quantas pessoas, ' : ''}a data e registre a venda no 🛍 da conversa.`, quando: new Date().toISOString() });
      await eventoNegocio(negocio.id, `Cliente ${origemTxt}: ${p.nome}${nomeVar ? ' (' + nomeVar + ')' : ''} · falta confirmar para registrar a venda`, 'cliente', buscar);
    }
    await criarAlerta({ conversa_id, negocio_id: negocio ? negocio.id : null, tipo: 'produto_pedido', titulo: 'Cliente pediu produto',
      info: `${p.nome}${nomeVar ? ' (' + nomeVar + ')' : ''} · ${origemTxt}. Falta confirmar ${!nomeVar && vs.length > 1 ? 'a opção, ' : ''}${!qtd ? 'quantas pessoas, ' : ''}a data, e registrar a venda.` }, buscar);
    return { venda: null };
  }
  const venda = { conversa_id, negocio_id: negocio ? negocio.id : null, oferta_id: oferta_id || null, produto_codigo: p.codigo, produto_nome: p.nome, ...v,
    data_uso: data_uso || (p.tipo_reserva === 'ativ' ? null : chegada), horario: null,
    observacoes: `O cliente ${origemTxt}. Confirmar ${p.tipo_reserva === 'simples' ? 'a data' : 'o dia e o horário'} com ele.`, criado_por: null };
  const r = await buscar(`${SUPABASE_URL}/rest/v1/vendas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, body: JSON.stringify(venda), signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error('venda ' + r.status);
  const salva = (await r.json().catch(() => []))[0] || venda;
  await tarefasEAlertasDaVenda(p, { ...venda, id: salva.id }, { negocio: negocio && negocio.id, responsavel, chegada, pedidoDoCliente: true, origemTxt }, buscar);
  if (negocio) {
    await eventoNegocio(negocio.id, `Cliente ${origemTxt}: ${p.nome}${v.variacao ? ' (' + v.variacao + ')' : ''} · venda registrada ${produtos.brl(v.valor_total)} na conta do hóspede`, 'cliente', buscar);
  }
  return { venda: salva };
}
async function respostaDoBotao({ oferta, aceito, opcao }, titulo, buscar) {
  const r = await buscar(`${SUPABASE_URL}/rest/v1/ofertas?id=eq.${oferta}&select=id,conversa_id,negocio_id,produto_codigo,produto_nome,situacao`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
  const o = r.ok ? (await r.json())[0] : null;
  if (!o || o.situacao !== 'oferecido') return;
  await buscar(`${SUPABASE_URL}/rest/v1/ofertas?id=eq.${o.id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' },
    body: JSON.stringify({ situacao: aceito ? 'aceito' : 'recusado', respondido_em: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
  if (!aceito) { if (o.negocio_id) await eventoNegocio(o.negocio_id, 'Cliente recusou pelo botão: ' + o.produto_nome, 'cliente', buscar); return; }
  const p = await produtoPorCodigo(o.produto_codigo, buscar).catch(() => null);
  const vs = p && Array.isArray(p.variacoes) ? p.variacoes : [];
  await aceiteDoCliente({ conversa_id: o.conversa_id, oferta_id: o.id, produto_codigo: o.produto_codigo, variacao: opcao != null && vs[opcao] ? vs[opcao].nome : null, origem: 'whatsapp' }, buscar);
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
          // Toque num botão de oferta ("Eu aceito" / "Não, obrigado"): marca a resposta sozinho
          const botao = m.type === 'interactive' && produtos.lerBotao(((m.interactive || {}).button_reply || {}).id);
          if (botao) await respostaDoBotao(botao, corpoDe(m), buscar).catch(e => console.warn(JSON.stringify({ evento: 'botao_oferta', erro: String(e.message || e).slice(0, 200) })));
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

// ---------- Modelos de mensagem da Meta (para iniciar conversa ou falar fora da janela de 24 h) ----------
// A conta do WhatsApp (WABA) de cada número é descoberta pelo portfólio do hotel (ou fixada em META_WABA_ID).
const PORTFOLIO = process.env.META_PORTFOLIO_ID || '531727826009907';
const wabas = {};
async function wabaDoNumero(numeroId, buscar = fetch) {
  if (process.env.META_WABA_ID) return process.env.META_WABA_ID.trim();
  if (wabas[numeroId]) return wabas[numeroId];
  for (const borda of ['owned_whatsapp_business_accounts', 'client_whatsapp_business_accounts']) {
    const r = await buscar(`${GRAPH}/${PORTFOLIO}/${borda}?fields=id,phone_numbers{id}&limit=50`, { headers: { Authorization: 'Bearer ' + WA_TOKEN }, signal: AbortSignal.timeout(8000) }).catch(() => null);
    const j = r && r.ok ? await r.json().catch(() => ({})) : {};
    for (const w of j.data || []) for (const n of ((w.phone_numbers || {}).data || [])) wabas[n.id] = w.id;
    if (wabas[numeroId]) return wabas[numeroId];
  }
  throw new ErroEnvio(502, 'Não achei a conta do WhatsApp deste número na Meta (o token do CRM precisa da permissão whatsapp_business_management).');
}
const varsDe = t => [...new Set((String(t || '').match(/\{\{(\d+)\}\}/g) || []).map(x => Number(x.slice(2, -2))))].sort((a, b) => a - b);
const preencher = (t, vs) => String(t || '').replace(/\{\{(\d+)\}\}/g, (m, n) => vs[Number(n) - 1] || m);
async function modelosDoNumero(numeroId, buscar = fetch) {
  const waba = await wabaDoNumero(numeroId, buscar);
  const r = await buscar(`${GRAPH}/${waba}/message_templates?fields=name,language,status,category,components&limit=200`, { headers: { Authorization: 'Bearer ' + WA_TOKEN }, signal: AbortSignal.timeout(8000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroEnvio(502, 'A Meta não devolveu os modelos (' + ((j.error || {}).message || r.status) + ').');
  return (j.data || []).map(m => {
    const comp = m.components || [];
    const body = comp.find(c => c.type === 'BODY') || {}, head = comp.find(c => c.type === 'HEADER');
    // Nesta fase: modelos só de texto (cabeçalho com mídia ou botões com variável ficam de fora)
    const suportado = (!head || (head.format === 'TEXT' && !varsDe(head.text).length)) && !comp.some(c => c.type === 'BUTTONS' && (c.buttons || []).some(b => /\{\{/.test(b.url || '')));
    return { nome: m.name, idioma: m.language, status: m.status, categoria: m.category, cabecalho: head && head.format === 'TEXT' ? head.text : null, corpo: body.text || '', variaveis: varsDe(body.text).length, rodape: (comp.find(c => c.type === 'FOOTER') || {}).text || null, suportado };
  });
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
    const f = await bytesDaFoto(msg.midia_caminho.slice('biblioteca/'.length), buscar);
    if (!f) throw new ErroEnvio(404, 'Foto não encontrada.');
    return { dados: f, mime: 'image/jpeg', nome: msg.midia_caminho.slice(11) };
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
// Link do CRM alterado no texto (ex.: o corretor trocou "east1" por "education"): o cliente cairia num endereço errado
function linkAlterado(texto) {
  const certo = new URL(URL_PUBLICA).host;
  const hosts = String(texto).match(/[\w.-]+\.run\.app/gi) || [];
  return hosts.find(h => h.toLowerCase() !== certo.toLowerCase()) || null;
}
async function enviarPelaEquipe(tokenUsuario, corpo, buscar = fetch) {
  if (!WA_TOKEN || !bancoLigado()) throw new ErroEnvio(503, 'O envio ainda não está configurado no servidor.');
  const bruto = Array.isArray(corpo.baloes) ? corpo.baloes : [typeof corpo.texto === 'string' ? corpo.texto : ''];
  const baloes = bruto.map(b => String(b || '').trim()).filter(b => b && !/^[-–—\s]+$/.test(b)); // ignora balão só de traços
  if (!baloes.length || baloes.length > 6 || baloes.some(b => b.length > 4096)) throw new ErroEnvio(400, 'Envie de 1 a 6 balões, cada um com até 4.096 caracteres.');
  if (!/^[0-9a-f-]{36}$/i.test(String(corpo.conversa_id || ''))) throw new ErroEnvio(400, 'Conversa inválida.');
  const alterado = linkAlterado(baloes.join('\n'));
  if (alterado) throw new ErroEnvio(400, 'O link ' + alterado + ' parece alterado (corretor automático?). O certo começa com ' + URL_PUBLICA + '. Corrija ou gere o link de novo antes de enviar.');
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
  await atualizarFotos(buscar);
  if (fotos.some(f => !/^[\w.-]+\.jpg$/.test(f) || !fotoAtiva(f))) throw new ErroEnvio(400, 'Foto fora da biblioteca do hotel.');
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

// ---------- Biblioteca de fotos: as fixas (public/fotos) + os ajustes da equipe (tabela fotos_biblioteca) ----------
// Fotos trazidas do Drive ficam no Storage (midias/biblioteca/<arquivo>) e saem pelo mesmo /fotos/<arquivo>.
let fotosCache = { ate: 0, linhas: [] };
async function atualizarFotos(buscar = fetch, forcar = false) {
  if (!bancoLigado() || (!forcar && fotosCache.ate > Date.now())) return;
  const r = await buscar(`${SUPABASE_URL}/rest/v1/fotos_biblioteca?select=arquivo,grupo,descricao,etiquetas,decoracao,drive_id,origem,ativo,ordem,criado_em&limit=1000`,
    { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (r && r.ok) fotosCache = { ate: Date.now() + 60000, linhas: await r.json().catch(() => []) };
  else fotosCache.ate = Date.now() + 60000; // sem a migração 011 (ou banco fora): fica só com as fixas
  orcamento.definirVivas(fotosCache.linhas);
}
const fotoDoDrive = f => fotosCache.linhas.find(v => v.arquivo === f && v.origem === 'drive');
const fotoAtiva = f => orcamento.biblioteca().some(g => g.fotos.some(x => x.arquivo === f));
const bytesFotos = new Map();
async function bytesDaFoto(f, buscar = fetch) {
  if (ESTATICOS['/fotos/' + f]) return ESTATICOS['/fotos/' + f].corpo;
  if (!/^[\w.-]+\.jpg$/.test(f)) return null;
  if (bytesFotos.has(f)) return bytesFotos.get(f);
  await atualizarFotos(buscar);
  if (!fotoDoDrive(f)) return null;
  const dados = await lerDoStorage('biblioteca/' + f, buscar).catch(() => null);
  if (dados) { if (bytesFotos.size > 80) bytesFotos.delete(bytesFotos.keys().next().value); bytesFotos.set(f, dados); }
  return dados;
}
async function gravarFotoAjuste(linha, buscar = fetch) {
  const r = await buscar(`${SUPABASE_URL}/rest/v1/fotos_biblioteca?on_conflict=arquivo`, {
    method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ ...linha, atualizado_em: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
  if (r.status === 404 || r.status === 400) throw new ErroEnvio(503, 'O banco ainda não tem a tabela das fotos (falta rodar a migração 011 no Supabase).');
  if (!r.ok) throw new ErroEnvio(502, 'Não deu para salvar a foto agora.');
}
const errosDrive = fn => async (...a) => { try { return await fn(...a); } catch (e) { if (e instanceof drive.ErroDrive) throw new ErroEnvio(e.http, e.message); throw e; } };

// ---------- Catálogo (produtos e biblioteca de respostas), lido do banco a cada minuto ----------
let catalogoCache = null;
async function catalogo(buscar = fetch) {
  if (catalogoCache && catalogoCache.ate > Date.now()) return catalogoCache.v;
  if (!bancoLigado()) return null;
  const hoje = new Date().toISOString().slice(0, 10);
  const [p, r] = await Promise.all([
    buscar(`${SUPABASE_URL}/rest/v1/produtos?ativo=eq.true&select=*&order=prioridade`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null),
    buscar(`${SUPABASE_URL}/rest/v1/respostas?ativo=eq.true&or=(valida_ate.is.null,valida_ate.gte.${hoje})&select=id,pergunta,resposta,fixa,origem&order=usos.desc&limit=200`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null),
  ]);
  let resp = r && r.ok ? await r.json().catch(() => []) : [];
  if (r && !r.ok) { // banco sem a migração 010 (coluna origem): busca sem ela
    const r2 = await buscar(`${SUPABASE_URL}/rest/v1/respostas?ativo=eq.true&select=id,pergunta,resposta,fixa&order=usos.desc&limit=80`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
    resp = r2 && r2.ok ? await r2.json().catch(() => []) : [];
  }
  // As do questionário já estão na base do Gilberto: só as fixas entram de novo
  resp = resp.filter(x => x.origem !== 'questionario' || x.fixa).slice(0, 80);
  const v = { produtos: p && p.ok ? await p.json().catch(() => []) : [], respostas: resp };
  catalogoCache = { v, ate: Date.now() + 60000 };
  return v;
}
const limparCatalogo = () => { catalogoCache = null; };

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
// ---------- Login da equipe: criar/confirmar no Supabase Auth quem está liberado em "usuarios" ----------
async function prepararLogin(email, buscar = fetch) {
  const r = await buscar(`${SUPABASE_URL}/rest/v1/usuarios?ativo=eq.true&select=email`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
  const lista = r.ok ? await r.json() : [];
  if (!lista.some(u => String(u.email).trim().toLowerCase() === email)) return false;
  const adm = { ...cabecalhosBanco(), Authorization: 'Bearer ' + SUPABASE_KEY };
  const c = await buscar(`${SUPABASE_URL}/auth/v1/admin/users`, { method: 'POST', headers: adm, body: JSON.stringify({ email, email_confirm: true }), signal: AbortSignal.timeout(8000) });
  if (c.ok) { console.log(JSON.stringify({ evento: 'login_criado' })); return true; }
  // Já existe (ex.: criado como convite e ainda não confirmado): confirma
  const l = await buscar(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, { headers: adm, signal: AbortSignal.timeout(8000) });
  const j = l.ok ? await l.json().catch(() => ({})) : {};
  const u = (j.users || []).find(x => String(x.email || '').toLowerCase() === email);
  if (u && !u.email_confirmed_at) {
    await buscar(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, { method: 'PUT', headers: adm, body: JSON.stringify({ email_confirm: true }), signal: AbortSignal.timeout(8000) });
    console.log(JSON.stringify({ evento: 'login_confirmado' }));
  }
  return !!u;
}

// ---------- Cobrança por Pix (Banco do Brasil) e baixa automática ----------
// Prazo: 48 h; 2 h se o check-in for em até 3 dias; nunca depois das 15h do dia do check-in (horário de Bonito).
function prazoCobranca(dataEntrada, agora = new Date()) {
  const checkin = dataEntrada ? new Date(dataEntrada + 'T15:00:00-04:00') : null;
  const curto = checkin && checkin - agora < 3 * 864e5;
  let fim = new Date(agora.getTime() + (curto ? 2 : 48) * 3600e3);
  if (checkin && checkin > agora && fim > checkin) fim = checkin;
  if (fim - agora < 15 * 60e3) fim = new Date(agora.getTime() + 15 * 60e3);
  return fim;
}
let verificandoPix = null, ultimaVerificacaoPix = 0;
// Confere as cobranças ativas no banco: paga → baixa; passou do prazo → vencida. Roda pelo agendador (a cada 2 min) e ao abrir o painel.
function verificarCobrancas(buscar = fetch) {
  if (verificandoPix) return verificandoPix;
  if (Date.now() - ultimaVerificacaoPix < Number(process.env.PIX_INTERVALO_MS || 15000)) return Promise.resolve({ verificadas: 0, pagas: 0, vencidas: 0, cedo: true });
  ultimaVerificacaoPix = Date.now();
  verificandoPix = (async () => {
    const r = await buscar(`${SUPABASE_URL}/rest/v1/cobrancas?situacao=eq.ativa&select=*&order=criado_em&limit=100`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
    const lista = r && r.ok ? await r.json().catch(() => []) : [];
    let pagas = 0, vencidas = 0;
    for (const cob of lista) {
      try {
        const c = await bb.consultar(cob.txid, cob.fonte);
        if (c.status === 'CONCLUIDA' || (c.pagamentos || []).length) { await baixaCobranca(cob, (c.pagamentos || [])[0] || {}, buscar); pagas++; }
        else if (/^REMOVIDA/.test(c.status || '')) await patchBanco('cobrancas', `id=eq.${cob.id}`, { situacao: 'cancelada', atualizado_em: new Date().toISOString() });
        else if (new Date(cob.expira_em) < new Date()) { await cobrancaVencida(cob, buscar); vencidas++; }
      } catch (e) { console.warn(JSON.stringify({ evento: 'pix_consulta', txid: cob.txid, erro: String(e.message || e).slice(0, 200) })); }
    }
    return { verificadas: lista.length, pagas, vencidas };
  })().finally(() => { verificandoPix = null; });
  return verificandoPix;
}
async function baixaCobranca(cob, pg, buscar = fetch) {
  const valor = pg.valor || Number(cob.valor);
  await patchBanco('cobrancas', `id=eq.${cob.id}`, { situacao: 'paga', valor_pago: valor, pago_em: pg.horario || new Date().toISOString(), e2e_id: pg.e2e || null, pagador: pg.pagador || null, atualizado_em: new Date().toISOString() });
  const txt = 'Pagamento recebido por Pix: ' + produtos.brl(valor) + ' (' + (cob.descricao || cob.tipo) + ')' + (pg.pagador ? ' · ' + pg.pagador : '');
  if (cob.negocio_id) {
    await patchBanco('negocios', `id=eq.${cob.negocio_id}`, { etapa: 'res', etapa_desde: new Date().toISOString(), atualizado_em: new Date().toISOString() }).catch(() => {});
    await eventoNegocio(cob.negocio_id, txt + ' · card em Reservado', 'CRM', buscar);
    await buscar(`${SUPABASE_URL}/rest/v1/tarefas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ negocio_id: cob.negocio_id, responsavel_id: cob.criado_por || null, criado_por: 'CRM', tipo: 'Confirmar a reserva', descricao: txt + '. Lançar o adiantamento e confirmar a reserva no Silbeck, e mandar a confirmação ao cliente.', quando: new Date().toISOString() }) }).catch(() => null);
  }
  await criarAlerta({ tipo: 'pagamento_recebido', titulo: 'Pagamento recebido', info: txt, conversa_id: cob.conversa_id, negocio_id: cob.negocio_id, cobranca_id: cob.id }, buscar);
}
async function cobrancaVencida(cob, buscar = fetch) {
  await patchBanco('cobrancas', `id=eq.${cob.id}`, { situacao: 'expirada', atualizado_em: new Date().toISOString() });
  await bb.cancelar(cob.txid, cob.fonte).catch(() => {});
  const txt = 'Pix de ' + produtos.brl(cob.valor) + ' (' + (cob.descricao || cob.tipo) + ') venceu sem pagamento';
  if (cob.negocio_id) await eventoNegocio(cob.negocio_id, txt, 'CRM', buscar);
  await criarAlerta({ tipo: 'cobranca_vencida', titulo: 'Cobrança vencida', info: txt + '. Falar com o cliente: mandar um novo Pix ou liberar a vaga.', conversa_id: cob.conversa_id, negocio_id: cob.negocio_id, cobranca_id: cob.id }, buscar);
}

// Fecha os alertas de uma venda (e conclui a tarefa de lançar ligada a eles)
async function resolverAlertasDaVenda(venda, tipos, por, buscar = fetch) {
  const r = await buscar(`${SUPABASE_URL}/rest/v1/alertas?venda_id=eq.${venda}&situacao=eq.aberto&select=id,tipo,tarefa_id`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const lista = r && r.ok ? (await r.json().catch(() => [])).filter(a => tipos.includes(a.tipo)) : [];
  for (const a of lista) {
    await buscar(`${SUPABASE_URL}/rest/v1/alertas?id=eq.${a.id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ situacao: 'resolvido', resolvido_por: por, resolvido_em: new Date().toISOString() }) }).catch(() => null);
    if (a.tarefa_id && a.tipo === 'lancar_conta') await buscar(`${SUPABASE_URL}/rest/v1/tarefas?id=eq.${a.tarefa_id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ feita: true, feita_em: new Date().toISOString() }) }).catch(() => null);
  }
}
// WhatsApp no formato do banco (+55DDDnúmero). Aceita "67 99999-0000", "(67) 9999-0000", "+55 67…"
function whatsE164(t) {
  let d = String(t || '').replace(/\D/g, '');
  if (/^0\d{10,11}$/.test(d)) d = d.slice(1);
  if (/^[1-9]{2}9?\d{8}$/.test(d)) d = '55' + d;
  if (!/^55[1-9]{2}9?\d{8}$/.test(d)) throw new ErroEnvio(400, 'WhatsApp inválido: use DDD + número (ex.: 67 99999-0000).');
  return '+' + d;
}
function emailOk(e) {
  const v = String(e || '').trim().slice(0, 160);
  if (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) throw new ErroEnvio(400, 'E-mail inválido.');
  return v || null;
}
// De quem é este WhatsApp (o mesmo número com e sem o 9 conta como igual)
async function donoDoWhatsapp(tel, buscar = fetch) {
  const d = tel.replace(/\D/g, ''), sem9 = d.length === 13 ? d.slice(0, 4) + d.slice(5) : d, com9 = d.length === 12 ? d.slice(0, 4) + '9' + d.slice(4) : d;
  const vals = [...new Set([d, sem9, com9])].map(x => '%2B' + x).join(',');
  const r = await buscar(`${SUPABASE_URL}/rest/v1/contato_identificadores?tipo=eq.whatsapp&valor=in.(${vals})&select=contato_id,contato:contatos(nome)`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const x = r && r.ok ? (await r.json().catch(() => []))[0] : null;
  return x ? { contato_id: x.contato_id, nome: x.contato && x.contato.nome } : null;
}
const uuidOk = v => /^[0-9a-f-]{36}$/i.test(String(v || ''));
async function produtoPorCodigo(codigo, buscar = fetch) {
  const cod = String(codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cod) throw new ErroEnvio(400, 'Escolha o produto.');
  const r = await buscar(`${SUPABASE_URL}/rest/v1/produtos?codigo=eq.${cod}&select=*`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
  const p = r.ok ? (await r.json())[0] : null;
  if (!p) throw new ErroEnvio(404, 'Produto não encontrado.');
  return p;
}
async function ofertasDaConversa(conversa, buscar = fetch) {
  const [r, rv] = await Promise.all([
    buscar(`${SUPABASE_URL}/rest/v1/ofertas?conversa_id=eq.${conversa}&select=id,produto_codigo,produto_nome,por,situacao,criado_em&order=criado_em.desc&limit=10`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null),
    buscar(`${SUPABASE_URL}/rest/v1/vitrines?conversa_id=eq.${conversa}&enviada=eq.true&select=id,tema,por,aberturas,pedido_em,criado_em&order=criado_em.desc&limit=10`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null),
  ]);
  const ofs = r && r.ok ? await r.json().catch(() => []) : [];
  // Os links de extras enviados contam como oferta (regra: 1 oferta por conversa)
  const vts = rv && rv.ok ? (await rv.json().catch(() => [])).map(v => ({ id: v.id, vitrine: v.tema, produto_nome: 'Link de extras "' + vitrine.TEMAS[v.tema].nome + '"' + (v.pedido_em ? '' : v.aberturas ? ' (aberto ' + v.aberturas + 'x)' : ' (ainda não aberto)'),
    por: v.por, situacao: v.pedido_em ? 'aceito' : 'oferecido', criado_em: v.criado_em })) : [];
  return [...ofs, ...vts].sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
}
// Fotos de um produto na página de extras: a representativa + as da(s) categoria(s) do Banco de fotos
function fotosDoProduto(p) {
  if (Array.isArray(p.fotos) && p.fotos.some(fotoAtiva)) return p.fotos.filter(fotoAtiva); // escolhidas na tela Produtos
  const bib = orcamento.biblioteca();
  const grupos = String(p.grupo_fotos || '').split(',').filter(Boolean);
  const lista = [p.foto && fotoAtiva(p.foto) ? p.foto : null, ...grupos.flatMap(g => ((bib.find(x => x.grupo === g) || {}).fotos || []).map(f => f.arquivo))].filter(Boolean);
  return [...new Set(lista)];
}
// Cria o link de extras de uma conversa (token de 128 bits)
async function criarVitrine(conversa, tema, { por, criado_por, enviada = true }, buscar = fetch) {
  if (!vitrine.TEMAS[tema]) throw new ErroEnvio(400, 'Tema inválido.');
  const negocio = await negocioDaConversa(conversa, 'id', buscar);
  const token = orcamento.novoToken();
  const r = await buscar(`${SUPABASE_URL}/rest/v1/vitrines`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, signal: AbortSignal.timeout(5000),
    body: JSON.stringify({ token, tema, conversa_id: conversa, negocio_id: negocio, por, criado_por: criado_por || null, enviada }) });
  if (!r.ok) throw new ErroEnvio(r.status === 404 ? 503 : 502, 'Não deu para criar o link (o banco precisa da migração 014?).');
  if (negocio && enviada) await eventoNegocio(negocio, 'Link de extras "' + vitrine.TEMAS[tema].nome + '" enviado', criado_por || 'gilberto', buscar);
  return { ...(await r.json())[0], link: `${URL_PUBLICA}/e/${token}` };
}
async function lerVitrine(token, buscar = fetch) {
  if (!orcamento.tokenValido(token) || !bancoLigado()) return null;
  const r = await buscar(`${SUPABASE_URL}/rest/v1/vitrines?token=eq.${token}&select=*`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
  return r.ok ? (await r.json())[0] || null : null;
}
// Estadia do cliente (para os dias e as pessoas na página): último orçamento, ou o negócio
async function estadiaDaConversa(conversa, buscar = fetch) {
  const [ro, rn, rc] = await Promise.all([
    buscar(`${SUPABASE_URL}/rest/v1/orcamentos?conversa_id=eq.${conversa}&select=adultos,criancas_idades,data_entrada,data_saida,primeiro_nome,numero_whatsapp&order=criado_em.desc&limit=1`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null),
    buscar(`${SUPABASE_URL}/rest/v1/negocios?conversa_id=eq.${conversa}&select=data_entrada,data_saida,etapa&order=criado_em.desc&limit=1`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null),
    buscar(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${conversa}&select=numero_id,contato:contatos(nome)`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null),
  ]);
  const o = (ro && ro.ok ? (await ro.json().catch(() => []))[0] : null) || {};
  const n = (rn && rn.ok ? (await rn.json().catch(() => []))[0] : null) || {};
  const c = (rc && rc.ok ? (await rc.json().catch(() => []))[0] : null) || {};
  return { adultos: o.adultos || null, criancas_idades: o.criancas_idades || [], data_entrada: n.data_entrada || o.data_entrada || null, data_saida: n.data_saida || o.data_saida || null,
    primeiro_nome: (c.contato && c.contato.nome) || o.primeiro_nome || null, numero_whatsapp: o.numero_whatsapp || null, numero_id: c.numero_id || null };
}
// Negócio em andamento da conversa (o mais recente). campos = 'id' devolve só o id.
async function negocioDaConversa(conversa, campos = 'id', buscar = fetch) {
  const r = await buscar(`${SUPABASE_URL}/rest/v1/negocios?conversa_id=eq.${conversa}&select=${campos},etapa&order=criado_em.desc&limit=5`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
  const lista = r && r.ok ? await r.json().catch(() => []) : [];
  const n = lista.find(x => !['res', 'perd'].includes(x.etapa)) || lista[0] || null;
  return campos === 'id' ? (n ? n.id : null) : n;
}
const eventoNegocio = (negocio, texto, por, buscar = fetch) => buscar(`${SUPABASE_URL}/rest/v1/negocio_eventos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' },
  body: JSON.stringify({ negocio_id: negocio, texto: texto.slice(0, 300), por }), signal: AbortSignal.timeout(5000) }).catch(() => null);
const API_EQUIPE = {
  // Lista da equipe (para o "responsável" da conversa)
  'GET /api/equipe': async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?ativo=eq.true&select=id,nome,papel&order=nome`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    return { ok: true, equipe: r.ok ? await r.json() : [] };
  },
  // Números de WhatsApp do hotel ligados ao CRM (para escolher por onde enviar)
  'GET /api/numeros': async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/conversas?canal=eq.wa&select=numero_id&limit=1000`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    const ids = [...new Set([...(r.ok ? (await r.json()).map(x => x.numero_id) : []), ...String(process.env.WA_NUMEROS || '').split(',').map(x => x.trim())].filter(x => /^\d{1,25}$/.test(x)))];
    return { ok: true, numeros: await Promise.all(ids.map(async id => ({ id, numero: await numeroWhatsapp(id, fetch).catch(() => null) }))) };
  },
  // Modelos aprovados (e em análise) da conta do número
  'GET /api/modelos': async (corpo, eu, url) => {
    const id = String(url.searchParams.get('numero_id') || '');
    if (!/^\d{1,25}$/.test(id)) throw new ErroEnvio(400, 'Número inválido.');
    if (!WA_TOKEN) throw new ErroEnvio(503, 'O WhatsApp ainda não está configurado.');
    return { ok: true, modelos: await modelosDoNumero(id) };
  },
  // Cadastrar modelo novo: vai para a análise da Meta (aprovação costuma levar de minutos a 24 h)
  'POST /api/modelo': async corpo => {
    const id = String(corpo.numero_id || '');
    if (!/^\d{1,25}$/.test(id)) throw new ErroEnvio(400, 'Número inválido.');
    const nome = String(corpo.nome || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
    if (!nome) throw new ErroEnvio(400, 'Dê um nome ao modelo.');
    if (!['UTILITY', 'MARKETING'].includes(corpo.categoria)) throw new ErroEnvio(400, 'Categoria inválida.');
    const texto = String(corpo.texto || '').trim().slice(0, 1024);
    if (texto.length < 10) throw new ErroEnvio(400, 'Escreva o texto do modelo.');
    const vs = varsDe(texto);
    if (vs.some((n, i) => n !== i + 1)) throw new ErroEnvio(400, 'As variáveis precisam ser {{1}}, {{2}}… em ordem.');
    const exemplos = vs.map((n, i) => String((corpo.exemplos || [])[i] || ['Ana', 'sábado', '14/11'][i] || 'exemplo').slice(0, 60));
    const waba = await wabaDoNumero(id);
    const r = await chamarMeta(`${waba}/message_templates`, { name: nome, language: 'pt_BR', category: corpo.categoria,
      components: [{ type: 'BODY', text: texto, ...(vs.length ? { example: { body_text: [exemplos] } } : {}) }] }, fetch);
    if (!r.ok) throw new ErroEnvio(r.status === 400 ? 400 : 502, 'A Meta recusou o modelo: ' + String((r.json.error || {}).error_user_msg || (r.json.error || {}).message || r.status).slice(0, 200));
    return { ok: true, nome, status: r.json.status || 'PENDING' };
  },
  // Iniciar conversa (contato novo, ou fora da janela de 24 h) com um modelo aprovado
  'POST /api/iniciar-conversa': async (corpo, eu) => {
    if (!WA_TOKEN) throw new ErroEnvio(503, 'O WhatsApp ainda não está configurado.');
    let conv = null, contatoId = null, tel = null;
    if (uuidOk(corpo.conversa_id)) {
      const c = await fetch(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${corpo.conversa_id}&select=id,contato_id,numero_id,canal,contato:contatos(contato_identificadores(tipo,valor))`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
      conv = c.ok ? (await c.json())[0] : null;
      if (!conv) throw new ErroEnvio(404, 'Conversa não encontrada.');
      const wa = ((conv.contato || {}).contato_identificadores || []).find(i => i.tipo === 'whatsapp');
      if (!wa) throw new ErroEnvio(400, 'Este contato não tem WhatsApp.');
      tel = wa.valor; contatoId = conv.contato_id;
    } else {
      tel = whatsE164(corpo.telefone);
      const numeroId = String(corpo.numero_id || '');
      if (!/^\d{1,25}$/.test(numeroId)) throw new ErroEnvio(400, 'Escolha por qual número enviar.');
      const dono = await donoDoWhatsapp(tel);
      const nome = String(corpo.nome || '').trim().slice(0, 120) || null;
      if (dono) {
        contatoId = dono.contato_id;
        if (nome && !dono.nome) await patchBanco('contatos', `id=eq.${contatoId}`, { nome });
      } else {
        const ct = await fetch(`${SUPABASE_URL}/rest/v1/contatos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, body: JSON.stringify({ nome }), signal: AbortSignal.timeout(5000) });
        if (!ct.ok) throw new ErroEnvio(502, 'Não deu para criar o contato.');
        contatoId = (await ct.json())[0].id;
        await fetch(`${SUPABASE_URL}/rest/v1/contato_identificadores`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ contato_id: contatoId, tipo: 'whatsapp', valor: tel }), signal: AbortSignal.timeout(5000) });
      }
      const ex = await fetch(`${SUPABASE_URL}/rest/v1/conversas?contato_id=eq.${contatoId}&canal=eq.wa&numero_id=eq.${numeroId}&select=id,contato_id,numero_id,canal`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
      conv = ex.ok ? (await ex.json())[0] : null;
      if (!conv) {
        const nc = await fetch(`${SUPABASE_URL}/rest/v1/conversas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, body: JSON.stringify({ contato_id: contatoId, canal: 'wa', numero_id: numeroId, atribuida_a: eu.id, ultima_msg_em: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
        if (!nc.ok) throw new ErroEnvio(502, 'Não deu para abrir a conversa.');
        conv = (await nc.json())[0];
      }
    }
    // O modelo precisa existir e estar aprovado na conta deste número
    const modelos = await modelosDoNumero(conv.numero_id);
    const m = modelos.find(x => x.nome === corpo.modelo && (!corpo.idioma || x.idioma === corpo.idioma));
    if (!m) throw new ErroEnvio(400, 'Modelo não encontrado.');
    if (m.status !== 'APPROVED') throw new ErroEnvio(400, 'Este modelo ainda não foi aprovado pela Meta (situação: ' + m.status + ').');
    if (!m.suportado) throw new ErroEnvio(400, 'Este modelo tem imagem ou botão com variável: ainda não dá para enviar pelo CRM.');
    const vs = (Array.isArray(corpo.variaveis) ? corpo.variaveis : []).slice(0, m.variaveis).map(v => String(v || '').trim().slice(0, 200));
    if (vs.length < m.variaveis || vs.some(v => !v)) throw new ErroEnvio(400, 'Preencha todas as variáveis do modelo.');
    const r = await chamarMeta(`${encodeURIComponent(conv.numero_id)}/messages`, { messaging_product: 'whatsapp', recipient_type: 'individual', to: numeroParaEnvio(tel), type: 'template',
      template: { name: m.nome, language: { code: m.idioma }, ...(vs.length ? { components: [{ type: 'body', parameters: vs.map(text => ({ type: 'text', text })) }] } : {}) } }, fetch);
    if (!r.ok || !r.json.messages || !r.json.messages[0]) {
      const e = r.json.error || {};
      ultimoErroMeta = { quando: new Date().toISOString(), http: r.status, codigo: e.code || null, mensagem: String(e.message || '').slice(0, 200) };
      throw new ErroEnvio(502, 'A Meta não aceitou a mensagem' + (e.code ? ` (código ${e.code})` : '') + (e.message ? ': ' + String(e.message).slice(0, 120) : '') + '.');
    }
    const texto = [m.cabecalho, preencher(m.corpo, vs), m.rodape].filter(Boolean).join('\n\n');
    await rpc('registrar_saida_whatsapp', { p_conversa: conv.id, p_wamid: r.json.messages[0].id, p_corpo: texto, p_autor: eu.id });
    return { ok: true, conversa_id: conv.id };
  },
  // Contato do lead (nome, WhatsApp e e-mail): completar quem chegou pelo Instagram/Facebook, telefone ou balcão
  'POST /api/contato': async (corpo, eu) => {
    let contatoId = null, negocio = null;
    if (uuidOk(corpo.negocio_id)) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/negocios?id=eq.${corpo.negocio_id}&select=id,contato_id`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
      const n = r.ok ? (await r.json())[0] : null;
      if (n) { contatoId = n.contato_id; negocio = n.id; }
    } else if (uuidOk(corpo.conversa_id)) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/conversas?id=eq.${corpo.conversa_id}&select=contato_id`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
      contatoId = r.ok ? ((await r.json())[0] || {}).contato_id : null;
      negocio = await negocioDaConversa(corpo.conversa_id);
    }
    if (!contatoId) throw new ErroEnvio(404, 'Lead não encontrado.');
    const ficha = {}, feito = [];
    if (corpo.nome !== undefined) { const n = String(corpo.nome || '').trim().slice(0, 120); if (!n) throw new ErroEnvio(400, 'O nome não pode ficar vazio.'); ficha.nome = n; feito.push('nome'); }
    if (corpo.email !== undefined) { ficha.email = emailOk(corpo.email); feito.push('e-mail'); }
    if (Object.keys(ficha).length) await patchBanco('contatos', `id=eq.${contatoId}`, ficha);
    if (corpo.telefone !== undefined) {
      const tel = corpo.telefone ? whatsE164(corpo.telefone) : null;
      const r = await fetch(`${SUPABASE_URL}/rest/v1/contato_identificadores?contato_id=eq.${contatoId}&tipo=eq.whatsapp&select=id,valor`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
      const atual = r.ok ? (await r.json())[0] : null;
      if (tel && (!atual || atual.valor !== tel)) {
        const dono = await donoDoWhatsapp(tel);
        if (dono && dono.contato_id !== contatoId) throw new ErroEnvio(409, 'Esse WhatsApp já é de outro cliente: ' + (dono.nome || 'sem nome') + '.');
        if (atual) await patchBanco('contato_identificadores', `id=eq.${atual.id}`, { valor: tel });
        else {
          const ri = await fetch(`${SUPABASE_URL}/rest/v1/contato_identificadores`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ contato_id: contatoId, tipo: 'whatsapp', valor: tel }), signal: AbortSignal.timeout(5000) });
          if (!ri.ok) throw new ErroEnvio(502, 'Não deu para salvar o WhatsApp.');
        }
        feito.push('WhatsApp');
      }
    }
    if (negocio && feito.length) await eventoNegocio(negocio, 'Contato atualizado: ' + feito.join(', '), eu.id);
    return { ok: true };
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
    return { ...r, resumo: orcamento.resumo({ data_entrada: corpo.data_entrada, data_saida: corpo.data_saida, adultos: Number(corpo.adultos) || 1, criancas_idades: corpo.idades_criancas || [] }) };
  },
  // Funil: cria ou atualiza um negócio (etapa, responsável, dados da estadia); registra no histórico
  'POST /api/negocio': async (corpo, eu) => {
    const ETAPAS = { novo: 'Novo', atend: 'Em atendimento', orc: 'Orçamento enviado', pag: 'Aguardando pagamento', res: 'Reservado', perd: 'Perdido' };
    const ORIGENS = ['whatsapp', 'meta', 'insta', 'google', 'site', 'ret', 'ind', 'ag', 'ota', 'ativo'];
    const uuid = v => /^[0-9a-f-]{36}$/i.test(String(v || ''));
    const dados = {}, eventos = [];
    let atual = null;
    if (corpo.id) {
      if (!uuid(corpo.id)) throw new ErroEnvio(400, 'Negócio inválido.');
      const r = await fetch(`${SUPABASE_URL}/rest/v1/negocios?id=eq.${corpo.id}&select=id,etapa,responsavel_id`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new ErroEnvio(503, 'O funil ainda não está no banco (falta a migração 008).');
      atual = (await r.json())[0];
      if (!atual) throw new ErroEnvio(404, 'Negócio não encontrado.');
    }
    if (corpo.etapa !== undefined && (!atual || corpo.etapa !== atual.etapa)) {
      if (!ETAPAS[corpo.etapa]) throw new ErroEnvio(400, 'Etapa inválida.');
      if (corpo.etapa === 'perd' && !String(corpo.motivo_perda || '').trim()) throw new ErroEnvio(400, 'Diga o motivo da perda.');
      Object.assign(dados, { etapa: corpo.etapa, etapa_desde: new Date().toISOString(), motivo_perda: corpo.etapa === 'perd' ? String(corpo.motivo_perda).slice(0, 200) : null,
        fechado_em: ['res', 'perd'].includes(corpo.etapa) ? new Date().toISOString() : null });
      eventos.push('Movido para ' + ETAPAS[corpo.etapa] + (corpo.etapa === 'perd' ? ': ' + String(corpo.motivo_perda).toLowerCase() : ''));
    }
    if (corpo.responsavel_id !== undefined && (!atual || corpo.responsavel_id !== atual.responsavel_id)) {
      if (corpo.responsavel_id !== null && !uuid(corpo.responsavel_id)) throw new ErroEnvio(400, 'Responsável inválido.');
      dados.responsavel_id = corpo.responsavel_id;
      eventos.push('Responsável trocado');
    }
    if (corpo.origem !== undefined) { if (!ORIGENS.includes(corpo.origem)) throw new ErroEnvio(400, 'Origem inválida.'); dados.origem = corpo.origem; }
    for (const k of ['perfil', 'hospedes', 'acomodacao', 'notas']) if (corpo[k] !== undefined) dados[k] = String(corpo[k] || '').slice(0, k === 'notas' ? 4000 : 200) || null;
    for (const k of ['data_entrada', 'data_saida']) if (corpo[k] !== undefined) { if (corpo[k] && !/^\d{4}-\d{2}-\d{2}$/.test(corpo[k])) throw new ErroEnvio(400, 'Data inválida.'); dados[k] = corpo[k] || null; }
    if (corpo.valor_previsto !== undefined) { const v = corpo.valor_previsto === '' || corpo.valor_previsto === null ? null : Number(corpo.valor_previsto); if (v !== null && !(v >= 0)) throw new ErroEnvio(400, 'Valor inválido.'); dados.valor_previsto = v; }
    if (corpo.etiquetas !== undefined) dados.etiquetas = (Array.isArray(corpo.etiquetas) ? corpo.etiquetas : []).map(t => String(t).trim().slice(0, 40)).filter(Boolean).slice(0, 20);
    let id = atual && atual.id;
    if (!atual) {
      // Novo lead manual: contato (nome e, se houver, WhatsApp) + negócio
      const nome = String(corpo.nome || '').trim().slice(0, 120);
      if (!nome) throw new ErroEnvio(400, 'Diga o nome do lead.');
      const tel = corpo.telefone ? whatsE164(corpo.telefone) : null;
      const email = emailOk(corpo.email);
      if (tel) { const dono = await donoDoWhatsapp(tel); if (dono) throw new ErroEnvio(409, 'Esse WhatsApp já é de outro cliente: ' + (dono.nome || 'sem nome') + '. Abra a ficha dele no Funil.'); }
      const c = await fetch(`${SUPABASE_URL}/rest/v1/contatos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, body: JSON.stringify({ nome, ...(email ? { email } : {}) }), signal: AbortSignal.timeout(5000) });
      if (!c.ok) throw new ErroEnvio(502, 'Não deu para criar o contato.');
      const contato = (await c.json())[0];
      if (tel) await fetch(`${SUPABASE_URL}/rest/v1/contato_identificadores`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ contato_id: contato.id, tipo: 'whatsapp', valor: tel }), signal: AbortSignal.timeout(5000) }).catch(() => {});
      const n = await fetch(`${SUPABASE_URL}/rest/v1/negocios`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' },
        body: JSON.stringify({ contato_id: contato.id, origem: 'ativo', responsavel_id: eu.id, ...dados }), signal: AbortSignal.timeout(5000) });
      if (!n.ok) throw new ErroEnvio(n.status === 404 ? 503 : 502, 'Não deu para criar o negócio (o banco precisa da migração 008?).');
      id = (await n.json())[0].id;
      eventos.unshift('Lead criado');
    } else if (Object.keys(dados).length) {
      await patchBanco('negocios', `id=eq.${id}`, { ...dados, atualizado_em: new Date().toISOString() });
      if (!eventos.length) eventos.push('Dados editados');
    }
    if (eventos.length) await fetch(`${SUPABASE_URL}/rest/v1/negocio_eventos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' },
      body: JSON.stringify(eventos.map(t => ({ negocio_id: id, texto: t, por: eu.nome }))), signal: AbortSignal.timeout(5000) }).catch(() => {});
    return { ok: true, id };
  },
  // Tarefas: cria, edita ou conclui
  'POST /api/tarefa': async (corpo, eu) => {
    const uuid = v => /^[0-9a-f-]{36}$/i.test(String(v || ''));
    const dados = {};
    if (corpo.tipo !== undefined) dados.tipo = String(corpo.tipo || '').trim().slice(0, 60);
    if (corpo.descricao !== undefined) dados.descricao = String(corpo.descricao || '').slice(0, 500) || null;
    if (corpo.quando !== undefined) { const q = new Date(corpo.quando); if (isNaN(q)) throw new ErroEnvio(400, 'Data da tarefa inválida.'); dados.quando = q.toISOString(); }
    if (corpo.responsavel_id !== undefined) { if (corpo.responsavel_id !== null && !uuid(corpo.responsavel_id)) throw new ErroEnvio(400, 'Responsável inválido.'); dados.responsavel_id = corpo.responsavel_id; }
    if (corpo.feita !== undefined) { dados.feita = !!corpo.feita; dados.feita_em = corpo.feita ? new Date().toISOString() : null; }
    let negocio = corpo.negocio_id, evento;
    if (corpo.id) {
      if (!uuid(corpo.id)) throw new ErroEnvio(400, 'Tarefa inválida.');
      const r = await fetch(`${SUPABASE_URL}/rest/v1/tarefas?id=eq.${corpo.id}&select=negocio_id,tipo`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
      const t = r.ok ? (await r.json())[0] : null;
      if (!t) throw new ErroEnvio(404, 'Tarefa não encontrada.');
      negocio = t.negocio_id;
      await patchBanco('tarefas', `id=eq.${corpo.id}`, dados);
      if (corpo.feita !== undefined) evento = (corpo.feita ? 'Concluída: ' : 'Reaberta: ') + (dados.tipo || t.tipo);
    } else {
      if (!uuid(negocio)) throw new ErroEnvio(400, 'Negócio inválido.');
      if (!dados.tipo || !dados.quando) throw new ErroEnvio(400, 'Diga o tipo e quando.');
      const r = await fetch(`${SUPABASE_URL}/rest/v1/tarefas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' },
        body: JSON.stringify({ negocio_id: negocio, responsavel_id: eu.id, criado_por: eu.id, ...dados }), signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new ErroEnvio(r.status === 404 ? 503 : 502, 'Não deu para criar a tarefa (o banco precisa da migração 008?).');
      evento = 'Tarefa agendada: ' + dados.tipo;
    }
    if (evento) await fetch(`${SUPABASE_URL}/rest/v1/negocio_eventos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' },
      body: JSON.stringify({ negocio_id: negocio, texto: evento, por: eu.nome }), signal: AbortSignal.timeout(5000) }).catch(() => {});
    return { ok: true };
  },
  // Produtos (atividades e extras): o Gilberto e a página do orçamento usam esta lista
  'POST /api/produto': async corpo => {
    const dados = {};
    for (const k of ['nome', 'descricao', 'preco', 'regras', 'quando_oferecer']) if (corpo[k] !== undefined) dados[k] = String(corpo[k] || '').trim().slice(0, k === 'descricao' ? 600 : 200) || null;
    if (corpo.codigo !== undefined) dados.codigo = String(corpo.codigo || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (corpo.tipo_reserva !== undefined) { if (!['ativ', 'terc', 'simples'].includes(corpo.tipo_reserva)) throw new ErroEnvio(400, 'Tipo inválido.'); dados.tipo_reserva = corpo.tipo_reserva; }
    for (const k of ['antecedencia_dias', 'prioridade']) if (corpo[k] !== undefined) { const v = parseInt(corpo[k], 10); if (!(v >= 0 && v < 400)) throw new ErroEnvio(400, 'Número inválido.'); dados[k] = v; }
    if (corpo.ativo !== undefined) dados.ativo = !!corpo.ativo;
    try { Object.assign(dados, produtos.camposExtras(corpo, orcamento.GRUPOS)); } catch (e) { throw new ErroEnvio(400, e.message); }
    if (dados.foto || (dados.fotos && dados.fotos.length)) { await atualizarFotos(fetch, true); if ([dados.foto, ...(dados.fotos || [])].filter(Boolean).some(f => !fotoAtiva(f))) throw new ErroEnvio(400, 'Essa foto não está no Banco de fotos.'); }
    // Preço como o cliente lê: se ficar vazio, o CRM monta pelo preço em número ou pelas variações
    if (!dados.preco && (dados.preco_valor != null || (dados.variacoes && dados.variacoes.length))) dados.preco = produtos.precoTexto({ ...dados, unidade: dados.unidade || 'unidade' });
    if (corpo.id) {
      if (!/^[0-9a-f-]{36}$/i.test(corpo.id)) throw new ErroEnvio(400, 'Produto inválido.');
      if (dados.nome === null || dados.preco === null || dados.codigo === '') throw new ErroEnvio(400, 'Nome, código e preço são obrigatórios.');
      await patchBanco('produtos', `id=eq.${corpo.id}`, { ...dados, atualizado_em: new Date().toISOString() });
    } else {
      if (!dados.nome || !dados.preco || !dados.codigo) throw new ErroEnvio(400, 'Nome, código e preço são obrigatórios.');
      const r = await fetch(`${SUPABASE_URL}/rest/v1/produtos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify(dados), signal: AbortSignal.timeout(5000) });
      if (r.status === 409) throw new ErroEnvio(409, 'Já existe um produto com esse código.');
      if (!r.ok) throw new ErroEnvio(502, 'Não deu para salvar (o banco precisa da migração 009?).');
    }
    limparCatalogo();
    return { ok: true };
  },
  // Oferta de produto numa conversa (no máximo 1 por conversa; para oferecer de novo, a tela pede confirmação)
  'POST /api/oferta': async (corpo, eu) => {
    const conversa = String(corpo.conversa_id || '');
    if (!uuidOk(conversa)) throw new ErroEnvio(400, 'Conversa inválida.');
    const p = await produtoPorCodigo(corpo.produto_codigo);
    const ja = await ofertasDaConversa(conversa);
    if (ja.length && !corpo.forcar) throw new ErroEnvio(409, 'Já houve oferta nesta conversa (' + ja[0].produto_nome + ').');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/ofertas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ conversa_id: conversa, negocio_id: await negocioDaConversa(conversa), produto_codigo: p.codigo, produto_nome: p.nome, por: 'equipe', autor_id: eu.id }) });
    if (!r.ok) throw new ErroEnvio(r.status === 404 ? 503 : 502, 'Não deu para registrar a oferta (o banco precisa da migração 012?).');
    const o = (await r.json())[0];
    if (o.negocio_id) await eventoNegocio(o.negocio_id, 'Oferecido: ' + p.nome, eu.id);
    return { ok: true, oferta: o };
  },
  // Oferta enviada no WhatsApp: foto do produto, texto e botões "Eu aceito" / "Não, obrigado"
  'POST /api/oferta-enviar': async (corpo, eu) => {
    if (!WA_TOKEN) throw new ErroEnvio(503, 'O envio ainda não está configurado no servidor.');
    const p = await produtoPorCodigo(corpo.produto_codigo);
    const texto = String(corpo.texto || '').trim();
    if (texto.length < 10 || texto.length > 1000) throw new ErroEnvio(400, 'O texto da oferta precisa ter de 10 a 1.000 caracteres.');
    const { conv, para } = await carregarConversaParaEnvio(corpo.conversa_id, fetch);
    const ja = await ofertasDaConversa(conv.id);
    if (ja.length && !corpo.forcar) throw new ErroEnvio(409, 'Já houve oferta nesta conversa (' + ja[0].produto_nome + ').');
    await atualizarFotos().catch(() => {});
    const bib = orcamento.biblioteca();
    const foto = p.foto && fotoAtiva(p.foto) ? p.foto : (((bib.find(g => g.grupo === p.grupo_fotos) || {}).fotos || [])[0] || {}).arquivo || null;
    const negocio = await negocioDaConversa(conv.id);
    const ro = await fetch(`${SUPABASE_URL}/rest/v1/ofertas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ conversa_id: conv.id, negocio_id: negocio, produto_codigo: p.codigo, produto_nome: p.nome, por: 'equipe', autor_id: eu.id }) });
    if (!ro.ok) throw new ErroEnvio(ro.status === 404 ? 503 : 502, 'Não deu para registrar a oferta (o banco precisa da migração 012?).');
    const oferta = (await ro.json())[0];
    const interactive = produtos.mensagemOferta(p, texto, oferta.id, foto ? `${URL_PUBLICA}/fotos/${foto}` : null);
    const r = await chamarMeta(`${encodeURIComponent(conv.numero_id)}/messages`, { messaging_product: 'whatsapp', recipient_type: 'individual', to: para, type: 'interactive', interactive }, fetch);
    if (!r.ok || !r.json.messages || !r.json.messages[0]) {
      const e = r.json.error || {};
      ultimoErroMeta = { quando: new Date().toISOString(), http: r.status, codigo: e.code || null, mensagem: String(e.message || '').slice(0, 200) };
      await fetch(`${SUPABASE_URL}/rest/v1/ofertas?id=eq.${oferta.id}`, { method: 'DELETE', headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => {});
      throw new ErroEnvio(502, 'A Meta não aceitou a oferta' + (e.code ? ` (código ${e.code})` : '') + '.');
    }
    // Na caixa a oferta aparece como a foto com o texto e os botões que o cliente vê
    const visto = texto + '\n\n' + interactive.action.buttons.map(b => '[ ' + b.reply.title + ' ]').join(' ');
    const wamid = r.json.messages[0].id;
    const id = foto
      ? await rpc('registrar_saida_midia', { p_conversa: conv.id, p_wamid: wamid, p_tipo: 'image', p_legenda: visto, p_caminho: 'biblioteca/' + foto, p_mime: 'image/jpeg', p_nome: null, p_autor: eu.id })
      : await rpc('registrar_saida_whatsapp', { p_conversa: conv.id, p_wamid: wamid, p_corpo: visto, p_autor: eu.id });
    if (negocio) await eventoNegocio(negocio, 'Oferecido no WhatsApp: ' + p.nome, eu.id);
    return { ok: true, oferta, mensagem: { id, tipo: foto ? 'image' : 'text', arquivo: foto, corpo: visto, enviada_em: new Date().toISOString() } };
  },
  // Link de extras (aventuras | momentos): cria e, se pedido, envia no WhatsApp com foto e botão "Ver opções"
  'POST /api/vitrine': async (corpo, eu) => {
    const tema = String(corpo.tema || '');
    if (!vitrine.TEMAS[tema]) throw new ErroEnvio(400, 'Escolha o link (aventuras ou momentos).');
    let conv, para;
    if (corpo.enviar) {
      if (!WA_TOKEN) throw new ErroEnvio(503, 'O envio ainda não está configurado no servidor.');
      ({ conv, para } = await carregarConversaParaEnvio(corpo.conversa_id, fetch));
    } else {
      if (!uuidOk(corpo.conversa_id)) throw new ErroEnvio(400, 'Conversa inválida.');
      conv = { id: corpo.conversa_id };
    }
    const ja = await ofertasDaConversa(conv.id);
    if (ja.length && !corpo.forcar) throw new ErroEnvio(409, 'Já houve oferta nesta conversa (' + ja[0].produto_nome + ').');
    const v = await criarVitrine(conv.id, tema, { por: 'equipe', criado_por: eu.id });
    if (!corpo.enviar) return { ok: true, link: v.link };
    const texto = String(corpo.texto || '').trim().slice(0, 1000) || vitrine.TEMAS[tema].intro;
    await atualizarFotos().catch(() => {});
    const prods = (((await catalogo().catch(() => null)) || {}).produtos || []).filter(p => p.vitrine === tema);
    const foto = prods.map(fotosDoProduto).flat()[0] || null;
    const interactive = { type: 'cta_url', ...(foto ? { header: { type: 'image', image: { link: `${URL_PUBLICA}/fotos/${foto}` } } } : { header: { type: 'text', text: vitrine.TEMAS[tema].nome } }),
      body: { text: texto }, footer: { text: produtos.RODAPE_OFERTA }, action: { name: 'cta_url', parameters: { display_text: vitrine.TEMAS[tema].botao, url: v.link } } };
    const r = await chamarMeta(`${encodeURIComponent(conv.numero_id)}/messages`, { messaging_product: 'whatsapp', recipient_type: 'individual', to: para, type: 'interactive', interactive }, fetch);
    if (!r.ok || !r.json.messages || !r.json.messages[0]) {
      const e = r.json.error || {};
      ultimoErroMeta = { quando: new Date().toISOString(), http: r.status, codigo: e.code || null, mensagem: String(e.message || '').slice(0, 200) };
      throw new ErroEnvio(502, 'A Meta não aceitou a mensagem' + (e.code ? ` (código ${e.code})` : '') + '. O link foi criado: ' + v.link);
    }
    const visto = texto + '\n\n[ ' + vitrine.TEMAS[tema].botao + ' ] ' + v.link;
    const wamid = r.json.messages[0].id;
    const id = foto
      ? await rpc('registrar_saida_midia', { p_conversa: conv.id, p_wamid: wamid, p_tipo: 'image', p_legenda: visto, p_caminho: 'biblioteca/' + foto, p_mime: 'image/jpeg', p_nome: null, p_autor: eu.id })
      : await rpc('registrar_saida_whatsapp', { p_conversa: conv.id, p_wamid: wamid, p_corpo: visto, p_autor: eu.id });
    return { ok: true, link: v.link, mensagem: { id, tipo: foto ? 'image' : 'text', arquivo: foto, corpo: visto, enviada_em: new Date().toISOString() } };
  },
  // Resposta do cliente à oferta
  'POST /api/oferta-resposta': async (corpo, eu) => {
    if (!uuidOk(corpo.id)) throw new ErroEnvio(400, 'Oferta inválida.');
    if (!['aceito', 'recusado', 'oferecido'].includes(corpo.situacao)) throw new ErroEnvio(400, 'Situação inválida.');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/ofertas?id=eq.${corpo.id}&select=id,negocio_id,produto_nome`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    const o = r.ok ? (await r.json())[0] : null;
    if (!o) throw new ErroEnvio(404, 'Oferta não encontrada.');
    await patchBanco('ofertas', `id=eq.${o.id}`, { situacao: corpo.situacao, respondido_em: corpo.situacao === 'oferecido' ? null : new Date().toISOString() });
    if (o.negocio_id && corpo.situacao === 'recusado') await eventoNegocio(o.negocio_id, 'Recusou a oferta: ' + o.produto_nome, eu.id);
    return { ok: true };
  },
  // Venda de produto: valor calculado aqui, vai para a conta do hóspede e cria as tarefas (agendar/preparar e lançar)
  'POST /api/venda': async (corpo, eu) => {
    const conversa = String(corpo.conversa_id || '');
    if (!uuidOk(conversa)) throw new ErroEnvio(400, 'Conversa inválida.');
    const p = await produtoPorCodigo(corpo.produto_codigo);
    let v;
    try { v = produtos.calcularVenda(p, corpo); } catch (e) { throw new ErroEnvio(400, e.message); }
    const data_uso = corpo.data_uso ? String(corpo.data_uso) : null;
    if (data_uso && !/^\d{4}-\d{2}-\d{2}$/.test(data_uso)) throw new ErroEnvio(400, 'Data inválida.');
    const negocio = await negocioDaConversa(conversa, 'id,data_entrada');
    const oferta = uuidOk(corpo.oferta_id) ? corpo.oferta_id : null;
    const venda = { conversa_id: conversa, negocio_id: negocio ? negocio.id : null, oferta_id: oferta, produto_codigo: p.codigo, produto_nome: p.nome, ...v,
      data_uso, horario: String(corpo.horario || '').trim().slice(0, 40) || null, observacoes: String(corpo.observacoes || '').trim().slice(0, 500) || null, criado_por: eu.id };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/vendas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, body: JSON.stringify(venda), signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new ErroEnvio(r.status === 404 ? 503 : 502, 'Não deu para registrar a venda (o banco precisa da migração 012?).');
    const salva = (await r.json())[0];
    if (oferta) await patchBanco('ofertas', `id=eq.${oferta}`, { situacao: 'aceito', respondido_em: new Date().toISOString() }).catch(() => {});
    const tarefas = await tarefasEAlertasDaVenda(p, { ...venda, id: salva.id }, { negocio: negocio && negocio.id, responsavel: eu.id, chegada: negocio && negocio.data_entrada, pedidoDoCliente: false });
    if (negocio) {
      await eventoNegocio(negocio.id, 'Venda: ' + p.nome + (v.variacao ? ' (' + v.variacao + ')' : '') + ' · ' + produtos.brl(v.valor_total) + ' · na conta do hóspede', eu.id);
    }
    return { ok: true, venda: salva, tarefas };
  },
  // Venda lançada na conta do hóspede, ou cancelada
  'POST /api/venda-situacao': async (corpo, eu) => {
    if (!uuidOk(corpo.id)) throw new ErroEnvio(400, 'Venda inválida.');
    if (!['vendido', 'lancado', 'cancelado'].includes(corpo.situacao)) throw new ErroEnvio(400, 'Situação inválida.');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/vendas?id=eq.${corpo.id}&select=id,negocio_id,produto_nome,valor_total`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    const v = r.ok ? (await r.json())[0] : null;
    if (!v) throw new ErroEnvio(404, 'Venda não encontrada.');
    const lanc = corpo.situacao === 'lancado';
    await patchBanco('vendas', `id=eq.${v.id}`, { situacao: corpo.situacao, lancado_em: lanc ? new Date().toISOString() : null, lancado_por: lanc ? eu.id : null });
    if (corpo.situacao !== 'vendido') await resolverAlertasDaVenda(v.id, corpo.situacao === 'lancado' ? ['lancar_conta'] : ['lancar_conta', 'produto_pedido'], eu.id);
    if (v.negocio_id) await eventoNegocio(v.negocio_id, ({ lancado: 'Lançado na conta: ', cancelado: 'Venda cancelada: ', vendido: 'Venda reaberta: ' })[corpo.situacao] + v.produto_nome + ' · ' + produtos.brl(v.valor_total), eu.id);
    return { ok: true };
  },
  // Cobrança por Pix: cria no Banco do Brasil (ou no simulador) e devolve o copia e cola para mandar ao cliente
  'POST /api/cobranca': async (corpo, eu) => {
    const conversa = String(corpo.conversa_id || '');
    if (!uuidOk(conversa)) throw new ErroEnvio(400, 'Conversa inválida.');
    const valor = Math.round(Number(String(corpo.valor || '').replace(',', '.')) * 100) / 100;
    if (!(valor >= 1 && valor <= 100000)) throw new ErroEnvio(400, 'Valor inválido (de R$ 1 a R$ 100.000).');
    const tipo = ['sinal', 'total', 'outro'].includes(corpo.tipo) ? corpo.tipo : 'sinal';
    const descricao = String(corpo.descricao || '').trim().slice(0, 120) || ({ sinal: 'Sinal de 50% da hospedagem', total: 'Hospedagem (valor total)', outro: 'Hotel Cabanas' })[tipo];
    const negocio = await negocioDaConversa(conversa, 'id,etapa,data_entrada');
    const est = await estadiaDaConversa(conversa);
    const expira = prazoCobranca((negocio && negocio.data_entrada) || est.data_entrada);
    const txid = bb.novoTxid();
    const c = await bb.criarCobranca({ txid, valor, expiracaoSeg: Math.round((expira - new Date()) / 1000), descricao: 'Hotel Cabanas · ' + descricao });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/cobrancas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ txid, conversa_id: conversa, negocio_id: negocio ? negocio.id : null, tipo, descricao, valor, expira_em: expira.toISOString(), copia_e_cola: c.copia_e_cola, fonte: c.fonte, criado_por: eu.id }) });
    if (!r.ok) { await bb.cancelar(txid, c.fonte).catch(() => {}); throw new ErroEnvio(r.status === 404 ? 503 : 502, 'Não deu para registrar a cobrança (o banco precisa da migração 017?).'); }
    const cob = (await r.json())[0];
    if (negocio) {
      if (['novo', 'atend', 'orc'].includes(negocio.etapa)) await patchBanco('negocios', `id=eq.${negocio.id}`, { etapa: 'pag', etapa_desde: new Date().toISOString(), atualizado_em: new Date().toISOString() }).catch(() => {});
      await eventoNegocio(negocio.id, 'Pix gerado: ' + produtos.brl(valor) + ' (' + descricao + '), vale até ' + expira.toLocaleString('pt-BR', { timeZone: 'America/Campo_Grande', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }), eu.id);
    }
    return { ok: true, cobranca: cob };
  },
  // Cancelar, conferir agora, ou (só no simulador) simular o pagamento
  'POST /api/cobranca-acao': async (corpo, eu) => {
    if (corpo.acao === 'verificar') return { ok: true, ...(await verificarCobrancas()) };
    if (!uuidOk(corpo.id)) throw new ErroEnvio(400, 'Cobrança inválida.');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/cobrancas?id=eq.${corpo.id}&select=*`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    const cob = r.ok ? (await r.json())[0] : null;
    if (!cob) throw new ErroEnvio(404, 'Cobrança não encontrada.');
    if (corpo.acao === 'cancelar') {
      if (cob.situacao !== 'ativa') throw new ErroEnvio(409, 'Só dá para cancelar cobrança ativa.');
      await bb.cancelar(cob.txid, cob.fonte);
      await patchBanco('cobrancas', `id=eq.${cob.id}`, { situacao: 'cancelada', atualizado_em: new Date().toISOString() });
      if (cob.negocio_id) await eventoNegocio(cob.negocio_id, 'Pix cancelado: ' + produtos.brl(cob.valor), eu.id);
      return { ok: true };
    }
    if (corpo.acao === 'simular_pagamento') {
      if (cob.fonte !== 'simulador') throw new ErroEnvio(400, 'Só cobranças do simulador.');
      bb.simularPagamento(cob.txid);
      ultimaVerificacaoPix = 0;
      return { ok: true, ...(await verificarCobrancas()) };
    }
    throw new ErroEnvio(400, 'Ação inválida.');
  },
  // Sino: resolver um alerta ("✓ Lançado na conta" também marca a venda e conclui a tarefa de lançar)
  'POST /api/alerta': async (corpo, eu) => {
    if (!uuidOk(corpo.id)) throw new ErroEnvio(400, 'Alerta inválido.');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/alertas?id=eq.${corpo.id}&select=id,tipo,venda_id,negocio_id,titulo,info,situacao`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    const a = r.ok ? (await r.json())[0] : null;
    if (!a) throw new ErroEnvio(404, 'Alerta não encontrado.');
    if (a.situacao !== 'aberto') return { ok: true };
    if (a.tipo === 'lancar_conta' && a.venda_id) {
      await patchBanco('vendas', `id=eq.${a.venda_id}`, { situacao: 'lancado', lancado_em: new Date().toISOString(), lancado_por: eu.id });
      await resolverAlertasDaVenda(a.venda_id, ['lancar_conta'], eu.id);
      if (a.negocio_id) await eventoNegocio(a.negocio_id, 'Lançado na conta: ' + String(a.info || '').split(' · ')[0], eu.id);
    } else {
      await patchBanco('alertas', `id=eq.${a.id}`, { situacao: 'resolvido', resolvido_por: eu.id, resolvido_em: new Date().toISOString() });
      if (a.negocio_id) await eventoNegocio(a.negocio_id, 'Alerta resolvido: ' + a.titulo + ' · ' + String(a.info || '').split(' · ')[0], eu.id);
    }
    return { ok: true };
  },
  // Agências e operadoras parceiras
  'POST /api/agencia': async corpo => {
    const dados = {};
    for (const k of ['nome', 'cnpj', 'telefone', 'email', 'codigo_silbeck', 'observacoes']) if (corpo[k] !== undefined) dados[k] = String(corpo[k] || '').trim().slice(0, k === 'observacoes' ? 2000 : 160) || null;
    if (dados.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dados.email)) throw new ErroEnvio(400, 'E-mail inválido.');
    if (corpo.comissao !== undefined) { const c = corpo.comissao === '' || corpo.comissao === null ? null : Number(corpo.comissao); if (c !== null && !(c >= 0 && c <= 100)) throw new ErroEnvio(400, 'Comissão de 0 a 100%.'); dados.comissao = c; }
    if (corpo.ativo !== undefined) dados.ativo = !!corpo.ativo;
    if (corpo.id) {
      if (!/^[0-9a-f-]{36}$/i.test(corpo.id)) throw new ErroEnvio(400, 'Agência inválida.');
      if (dados.nome === null) throw new ErroEnvio(400, 'Diga o nome da agência.');
      await patchBanco('agencias', `id=eq.${corpo.id}`, { ...dados, atualizado_em: new Date().toISOString() });
    } else {
      if (!dados.nome) throw new ErroEnvio(400, 'Diga o nome da agência.');
      const r = await fetch(`${SUPABASE_URL}/rest/v1/agencias`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify(dados), signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new ErroEnvio(502, 'Não deu para salvar (o banco precisa da migração 009?).');
    }
    return { ok: true };
  },
  // Biblioteca de respostas (atalhos "/" da equipe, respostas fixas e de referência do Gilberto)
  'POST /api/resposta': async (corpo, eu) => {
    const dados = {};
    if (corpo.pergunta !== undefined) dados.pergunta = String(corpo.pergunta || '').trim().slice(0, 300);
    if (corpo.resposta !== undefined) dados.resposta = String(corpo.resposta || '').trim().slice(0, 4000);
    if (corpo.atalho !== undefined) dados.atalho = String(corpo.atalho || '').trim().toLowerCase().replace(/^\//, '').replace(/[^a-z0-9à-ú_-]/g, '').slice(0, 30) || null;
    if (corpo.fixa !== undefined) dados.fixa = !!corpo.fixa;
    if (corpo.valida_ate !== undefined) { if (corpo.valida_ate && !/^\d{4}-\d{2}-\d{2}$/.test(corpo.valida_ate)) throw new ErroEnvio(400, 'Data inválida.'); dados.valida_ate = corpo.valida_ate || null; }
    if (corpo.ativo !== undefined) dados.ativo = !!corpo.ativo;
    if (corpo.origem !== undefined) { if (!['equipe', 'questionario', 'revisao', 'correcao'].includes(corpo.origem)) throw new ErroEnvio(400, 'Origem inválida.'); dados.origem = corpo.origem; }
    if (corpo.id) {
      if (!/^[0-9a-f-]{36}$/i.test(corpo.id)) throw new ErroEnvio(400, 'Resposta inválida.');
      if (dados.pergunta === '' || dados.resposta === '') throw new ErroEnvio(400, 'Pergunta e resposta são obrigatórias.');
      const r = await fetch(`${SUPABASE_URL}/rest/v1/respostas?id=eq.${corpo.id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ ...dados, atualizado_em: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
      if (r.status === 409) throw new ErroEnvio(409, 'Esse atalho já está em uso.');
      if (!r.ok) throw new ErroEnvio(502, 'Não deu para salvar.');
    } else {
      if (!dados.pergunta || !dados.resposta) throw new ErroEnvio(400, 'Pergunta e resposta são obrigatórias.');
      const r = await fetch(`${SUPABASE_URL}/rest/v1/respostas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ ...dados, criado_por: eu.id }), signal: AbortSignal.timeout(5000) });
      if (r.status === 409) throw new ErroEnvio(409, 'Esse atalho já está em uso.');
      if (!r.ok) throw new ErroEnvio(502, 'Não deu para salvar' + (dados.origem === 'correcao' ? ' (o banco precisa da migração 015?).' : ' (o banco precisa da migração 009?).'));
    }
    limparCatalogo();
    return { ok: true };
  },
  // Questionário (o que o Gilberto sabe) e a importação para a biblioteca
  'GET /api/conhecimento': async () => ({ ok: true, secoes: gilberto.questionario() }),
  'POST /api/importar-questionario': async (corpo, eu) => {
    const ex = await fetch(`${SUPABASE_URL}/rest/v1/respostas?ativo=eq.true&select=pergunta`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    if (!ex.ok) throw new ErroEnvio(503, 'A biblioteca ainda não está no banco (falta a migração 009).');
    const ja = new Set((await ex.json()).map(x => x.pergunta.trim().toLowerCase()));
    const novas = gilberto.questionario().flatMap(sec => sec.itens.filter(i => i.p && !ja.has(i.p.toLowerCase())).map(i => ({ pergunta: i.p.slice(0, 300), resposta: i.r.slice(0, 4000), origem: 'questionario', criado_por: eu.id })));
    if (novas.length) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/respostas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify(novas), signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new ErroEnvio(502, 'Não deu para importar' + (r.status === 400 ? ' (o banco precisa da migração 010)' : '') + '.');
    }
    limparCatalogo();
    return { ok: true, importadas: novas.length };
  },
  'POST /api/resposta-uso': async corpo => {
    if (!/^[0-9a-f-]{36}$/i.test(String(corpo.id || ''))) throw new ErroEnvio(400, 'Resposta inválida.');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/respostas?id=eq.${corpo.id}&select=usos`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) });
    const atual = r.ok ? (await r.json())[0] : null;
    if (atual) await patchBanco('respostas', `id=eq.${corpo.id}`, { usos: (atual.usos || 0) + 1 });
    return { ok: true };
  },
  // Revisão das sugestões do Gilberto: usada, descartada (com motivo), aprovada ou reprovada
  'POST /api/sugestao': async (corpo, eu) => {
    if (!/^[0-9a-f-]{36}$/i.test(String(corpo.id || ''))) throw new ErroEnvio(400, 'Sugestão inválida.');
    if (!['usada', 'descartada', 'aprovada', 'reprovada'].includes(corpo.situacao)) throw new ErroEnvio(400, 'Situação inválida.');
    await patchBanco('sugestoes', `id=eq.${corpo.id}`, { situacao: corpo.situacao, motivo: String(corpo.motivo || '').slice(0, 300) || null, revisada_por: eu.id, revisada_em: new Date().toISOString() });
    // A sugestão enviada oferecia um produto: registra a oferta do Gilberto (se a conversa ainda não teve oferta)
    if (corpo.situacao === 'usada') {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/sugestoes?id=eq.${corpo.id}&select=conversa_id,ferramentas`, { headers: cabecalhosBanco(), signal: AbortSignal.timeout(5000) }).catch(() => null);
      const sg = r && r.ok ? (await r.json().catch(() => []))[0] : null;
      const vts = (sg && sg.ferramentas && Array.isArray(sg.ferramentas.vitrines) ? sg.ferramentas.vitrines : []).filter(uuidOk);
      if (vts.length) { // o link de extras do Gilberto foi enviado: passa a contar como oferta
        await fetch(`${SUPABASE_URL}/rest/v1/vitrines?id=in.(${vts.join(',')})`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ enviada: true }), signal: AbortSignal.timeout(5000) }).catch(() => null);
        const negocio = await negocioDaConversa(sg.conversa_id);
        if (negocio) await eventoNegocio(negocio, 'Link de extras enviado (sugestão do Gilberto)', eu.id);
        return { ok: true, oferta: 'link de extras' };
      }
      const cod = sg && sg.ferramentas && sg.ferramentas.produto_oferecido;
      if (cod && sg.conversa_id && !(await ofertasDaConversa(sg.conversa_id)).length) {
        const p = await produtoPorCodigo(cod).catch(() => null);
        if (p) {
          const negocio = await negocioDaConversa(sg.conversa_id);
          await fetch(`${SUPABASE_URL}/rest/v1/ofertas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
            body: JSON.stringify({ conversa_id: sg.conversa_id, negocio_id: negocio, produto_codigo: p.codigo, produto_nome: p.nome, por: 'gilberto', autor_id: eu.id }) }).catch(() => null);
          if (negocio) await eventoNegocio(negocio, 'Oferecido pelo Gilberto: ' + p.nome, eu.id);
          return { ok: true, oferta: p.nome };
        }
      }
    }
    return { ok: true };
  },
  // Testar o agente: conversa de mentira, sem WhatsApp e sem gravar orçamento
  'POST /api/testar': async corpo => {
    const msgs = Array.isArray(corpo.mensagens) ? corpo.mensagens.slice(-30) : [];
    await atualizarFotos().catch(() => {});
    if (!msgs.length) throw new ErroEnvio(400, 'Escreva a mensagem do cliente.');
    const historico = msgs.map((m, i) => ({ direcao: m.de === 'hotel' ? 'saida' : 'entrada', tipo: 'text', corpo: String(m.texto || '').slice(0, 4000), enviada_em: new Date(Date.now() - (msgs.length - i) * 60000).toISOString() }));
    const executores = {
      gerar_orcamento: async e => { const c = await silbeck.cotar(e); if (!c.ok) return c; const m = orcamento.montar(e, c); return m.erro ? { ok: false, erro: m.erro } : { ok: true, link: URL_PUBLICA + '/o/TESTE-sem-link-real', fonte: c.fonte, opcoes: m.opcoes, aviso: 'Teste: nenhum orçamento foi gravado.' }; },
      enviar_fotos: async e => { const f = orcamento.escolherFotos(e); return f.length ? { ok: true, modo: 'sugestao', fotos: f.map(x => ({ arquivo: x.arquivo, descricao: x.descricao })) } : { ok: false, erro: 'Sem foto na biblioteca para esse pedido.' }; },
      enviar_link_extras: async e => vitrine.TEMAS[e.tema] ? { ok: true, link: URL_PUBLICA + '/e/TESTE-sem-link-real', tema: vitrine.TEMAS[e.tema].nome, aviso: 'Teste: nenhum link foi criado.' } : { ok: false, erro: 'Tema inválido.' },
    };
    try { return { ok: true, ...(await gilberto.sugerir(historico, { canal: 'wa', nome: String(corpo.nome || 'Cliente de teste') }, executores, await catalogo())) }; }
    catch (e) { if (e instanceof gilberto.ErroSugestao) throw new ErroEnvio(e.http, e.message); throw e; }
  },
  // Banco de imagens no Drive: pastas e fotos (para escolher o que entra na biblioteca)
  'GET /api/drive': errosDrive(async (corpo, eu, url) => {
    await atualizarFotos();
    const l = await drive.listar(url.searchParams.get('pasta') || '');
    const ja = {};
    for (const g of orcamento.biblioteca()) for (const f of g.fotos) if (f.drive_id) (ja[f.drive_id] = ja[f.drive_id] || []).push(g.nome);
    return { ok: true, ...l, fotos: l.fotos.map(f => ({ ...f, na_biblioteca: ja[f.id] || [] })) };
  }),
  // Traz uma foto do Drive para uma categoria da biblioteca (recorte 4:3, 1200x900)
  'POST /api/foto': errosDrive(async (corpo, eu) => {
    const grupo = String(corpo.grupo || '');
    if (!orcamento.GRUPOS.includes(grupo)) throw new ErroEnvio(400, 'Escolha a categoria.');
    if (!drive.idValido(corpo.drive_id)) throw new ErroEnvio(400, 'Escolha a foto do Drive.');
    const descricao = String(corpo.descricao || '').trim().slice(0, 300);
    if (descricao.length < 8) throw new ErroEnvio(400, 'Descreva a foto (o Gilberto usa a descrição para escolher o que mandar).');
    const etiquetas = [...new Set([orcamento.nomeGrupo(grupo).toLowerCase(), ...(Array.isArray(corpo.etiquetas) ? corpo.etiquetas : [])
      .map(t => String(t).trim().toLowerCase().slice(0, 40)).filter(Boolean)])].slice(0, 10);
    await atualizarFotos(fetch, true);
    const g = orcamento.biblioteca().find(x => x.grupo === grupo);
    if (g && g.fotos.some(f => f.drive_id === corpo.drive_id)) throw new ErroEnvio(409, 'Essa foto já está em ' + g.nome + '.');
    const { jpg } = await drive.prepararFoto(corpo.drive_id);
    const arquivo = `${grupo}-d${crypto.randomBytes(4).toString('hex')}.jpg`;
    await gravarNoStorage('biblioteca/' + arquivo, jpg, 'image/jpeg', fetch);
    await gravarFotoAjuste({ arquivo, grupo, descricao, etiquetas, decoracao: !!corpo.decoracao, drive_id: corpo.drive_id, origem: 'drive', ativo: true, criado_por: eu.id });
    bytesFotos.set(arquivo, jpg);
    await atualizarFotos(fetch, true);
    return { ok: true, foto: { arquivo, grupo, descricao, etiquetas, decoracao: !!corpo.decoracao } };
  }),
  // Tira uma foto da biblioteca (ou devolve). Nada é apagado: some do envio, da página do orçamento e do Gilberto.
  'POST /api/foto-status': async corpo => {
    const arquivo = String(corpo.arquivo || '');
    await atualizarFotos(fetch, true);
    const todas = orcamento.biblioteca({ todas: true });
    const g = todas.find(x => [...x.fotos, ...x.removidas].some(f => f.arquivo === arquivo));
    if (!g) throw new ErroEnvio(404, 'Foto não encontrada na biblioteca.');
    const ativo = corpo.ativo !== false;
    if (fotoDoDrive(arquivo)) await patchBanco('fotos_biblioteca', 'arquivo=eq.' + encodeURIComponent(arquivo), { ativo, atualizado_em: new Date().toISOString() });
    else await gravarFotoAjuste({ arquivo, grupo: g.grupo, origem: 'base', ativo });
    await atualizarFotos(fetch, true);
    return { ok: true, arquivo, ativo };
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
  const eu = await autenticarEquipe(tokenUsuario, buscar);
  await atualizarFotos(buscar).catch(() => {});
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
      // Link de extras: criado agora, mas só conta como oferta quando a equipe enviar a sugestão
      enviar_link_extras: async e => {
        const cat = await catalogo(buscar).catch(() => null);
        const nomes = ((cat || {}).produtos || []).filter(p => p.vitrine === e.tema).map(p => p.nome);
        if (!nomes.length) return { ok: false, erro: 'Não há produtos ativos nesse tema. Não ofereça.' };
        const v = await criarVitrine(conv.id, e.tema, { por: 'gilberto', enviada: false }, buscar);
        return { ok: true, link: v.link, vitrine_id: v.id, tema: vitrine.TEMAS[e.tema].nome, produtos: nomes };
      },
      // Modo sugestão: o Gilberto escolhe as fotos; quem envia é a equipe, pelo painel da sugestão.
      enviar_fotos: async entrada => {
        const fotos = orcamento.escolherFotos(entrada);
        return fotos.length
          ? { ok: true, modo: 'sugestao', fotos: fotos.map(f => ({ arquivo: f.arquivo, descricao: f.descricao })), aviso: 'Nesta fase a equipe envia as fotos junto com a sua mensagem: escreva o texto como se as fotos fossem logo em seguida, sem descrevê-las como se você as tivesse tirado.' }
          : { ok: false, erro: 'Não há foto na biblioteca para esse pedido. Não prometa foto: ofereça descrever ou avise a equipe nas notas_internas.' };
      },
    };
    const r = await gilberto.sugerir(historico, { canal: conv.canal, nome, ofertas: await ofertasDaConversa(conv.id, buscar) }, executores, await catalogo(buscar));
    // Registro para a revisão (Ajustes do agente): o que o cliente perguntou e o que o Gilberto sugeriu
    const ultimaDoCliente = [...historico].reverse().find(m => m.direcao === 'entrada');
    const reg = await buscar(`${SUPABASE_URL}/rest/v1/sugestoes`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ conversa_id: conv.id, pergunta: ultimaDoCliente ? String(ultimaDoCliente.transcricao || ultimaDoCliente.corpo || '[' + ultimaDoCliente.tipo + ']').slice(0, 2000) : null,
        mensagem: r.mensagem, notas_internas: r.notas_internas, precisa_equipe: r.precisa_equipe, modelo: r.modelo,
        ferramentas: { cotacoes: r.cotacoes, orcamentos: r.orcamentos, fotos: (r.fotos || []).map(f => f.arquivo), produto_oferecido: r.produto_oferecido || null, vitrines: r.vitrines || [] }, pedida_por: eu.id }) }).catch(() => null);
    const sugestaoId = reg && reg.ok ? ((await reg.json().catch(() => []))[0] || {}).id : null;
    let avisoRevisao = null;
    if (!sugestaoId) { // a sugestão vale, mas não entrou na Revisão: mostra o motivo para a equipe
      const det = reg ? (await reg.text().catch(() => '')).slice(0, 200) : 'sem resposta do banco';
      console.warn(JSON.stringify({ evento: 'sugestao_nao_registrada', http: reg && reg.status, erro: det }));
      avisoRevisao = 'A sugestão não entrou na Revisão (' + (reg ? 'erro ' + reg.status : 'banco fora') + (reg && reg.status === 404 ? ': falta a migração 009' : '') + ').';
    }
    return { ok: true, ...r, sugestao_id: sugestaoId || null, aviso_revisao: avisoRevisao };
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
    const base = { ok: true, servico: 'crm-cabanas', versao, segredos: { verify: !!VERIFY, appSecret: !!APP_SECRET, supabase: bancoLigado(), supabasePublica: chavePublicaOk(), whatsappToken: !!WA_TOKEN, anthropic: !!process.env.ANTHROPIC_API_KEY }, gilberto: { instrucoes: gilberto.sistemaPronto(), modelo: gilberto.MODELO, ferramentas: gilberto.ferramentas() }, silbeck: silbeck.MODO(), pix: bb.MODO(), chaveSupabase: tipoChave(SUPABASE_KEY), ipSaida };
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

  // Página pública de extras (/e/<token>) e o pedido do cliente
  const me = url.pathname.match(/^\/e\/([A-Za-z0-9_-]{22})(\/pedido)?$/);
  if (me) {
    if (limiteExcedido(req)) { res.writeHead(429, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '60' }); return res.end('Muitos acessos. Tente de novo em 1 minuto.'); }
    const token = me[1];
    const naoAchou = () => { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...cabecalhosSeguranca() }); res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hotel Cabanas</title><p style="font-family:sans-serif;padding:24px">Página não encontrada. Fale com a gente pelo WhatsApp.</p>'); };
    if (!me[2] && req.method === 'GET') {
      const previa = url.searchParams.get('previa') === '1';
      lerVitrine(token).then(async v => {
        if (!v) return naoAchou();
        await atualizarFotos().catch(() => {});
        const [cat, est] = await Promise.all([catalogo().catch(() => null), estadiaDaConversa(v.conversa_id)]);
        const prods = ((cat || {}).produtos || []).filter(p => p.vitrine === v.tema);
        if (!previa) await rpc('registrar_abertura_vitrine', { p_token: token }).catch(() => {});
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', ...cabecalhosSeguranca() });
        res.end(vitrine.pagina(v, { produtos: prods, fotosDe: fotosDoProduto, estadia: est, previa, versao: encodeURIComponent(versao.replace(/[^\w.-]/g, '')) }));
      }).catch(() => { res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Página indisponível agora. Tente de novo em instantes.'); });
      return;
    }
    if (me[2] && req.method === 'POST') {
      lerCorpo(req, 8000).then(async corpo => {
        const v = await lerVitrine(token);
        if (!v) return json(res, 404, { ok: false, erro: 'Página não encontrada.' });
        const [cat, est] = await Promise.all([catalogo().catch(() => null), estadiaDaConversa(v.conversa_id)]);
        const prods = ((cat || {}).produtos || []).filter(p => p.vitrine === v.tema);
        const ped = vitrine.validarPedido(corpo.itens, prods, est);
        if (ped.erro) return json(res, 400, { ok: false, erro: ped.erro });
        const linhas = ped.itens.map(it => vitrine.linhaItem(it, prods.find(p => p.codigo === it.codigo)));
        if (!corpo.previa) {
          const anteriores = (v.pedido || []).map(x => x.chave);
          for (const it of ped.itens.filter(x => !anteriores.includes(x.chave))) { // o mesmo item escolhido de novo não duplica
            const ro = await fetch(`${SUPABASE_URL}/rest/v1/ofertas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, signal: AbortSignal.timeout(5000),
              body: JSON.stringify({ conversa_id: v.conversa_id, negocio_id: v.negocio_id, produto_codigo: it.codigo, produto_nome: it.nome + (it.variacao ? ' (' + it.variacao + ')' : ''), por: 'pagina', situacao: 'aceito', respondido_em: new Date().toISOString() }) }).catch(() => null);
            const of = ro && ro.ok ? (await ro.json().catch(() => []))[0] : null;
            await aceiteDoCliente({ conversa_id: v.conversa_id, oferta_id: of && of.id, produto_codigo: it.codigo, variacao: it.variacao, origem: 'vitrine', quantidade: it.quantidade, adicionais: it.adicionais, data_uso: it.data })
              .catch(err => console.warn(JSON.stringify({ evento: 'aceite_vitrine', erro: String(err.message || err).slice(0, 200) })));
          }
          await fetch(`${SUPABASE_URL}/rest/v1/vitrines?id=eq.${v.id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, signal: AbortSignal.timeout(5000),
            body: JSON.stringify({ pedido: [...(v.pedido || []), ...ped.itens.filter(x => !(v.pedido || []).some(y => y.chave === x.chave))], pedido_em: new Date().toISOString() }) }).catch(() => {});
        }
        const numero = est.numero_whatsapp || (est.numero_id ? await numeroWhatsapp(est.numero_id, fetch).catch(() => null) : null);
        const texto = 'Oi! Escolhi na página de extras: ' + linhas.join('; ') + '.';
        json(res, 200, { ok: true, whatsapp: numero ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : null });
      }).catch(e => json(res, e.http || 400, { ok: false, erro: e instanceof ErroEnvio ? e.message : 'Pedido inválido.' }));
      return;
    }
    return naoAchou();
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
        await atualizarFotos().catch(() => {});
        if (!previa) await rpc('registrar_abertura_orcamento', { p_token: token }).catch(() => {}); // antes de responder: no Cloud Run a CPU para depois da resposta
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', ...cabecalhosSeguranca() });
        res.end(orcamento.pagina(o, { previa, produtos: ((await catalogo().catch(() => null)) || {}).produtos }));
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
          // Extras marcados pelo cliente na página: só produtos ativos e opções que existem
          const prods = ((await catalogo().catch(() => null)) || {}).produtos || [];
          const extras = (Array.isArray(corpo.extras) ? corpo.extras.slice(0, 10) : []).map(e => {
            const p = prods.find(x => x.codigo === String(e && e.codigo || ''));
            if (!p) return null;
            const vs = Array.isArray(p.variacoes) ? p.variacoes : [];
            const v = vs.find(x => x.nome === e.variacao) || (vs.length === 1 ? vs[0] : null);
            return { codigo: p.codigo, nome: p.nome, variacao: v ? v.nome : null };
          }).filter((e, i, l) => e && l.findIndex(x => x && x.codigo === e.codigo) === i);
          if (!corpo.previa) {
            await fetch(`${SUPABASE_URL}/rest/v1/orcamentos?id=eq.${o.id}`, { method: 'PATCH', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ escolhida: op.codigo, escolhida_em: new Date().toISOString() }), signal: AbortSignal.timeout(5000) }).catch(() => {});
            await fetch(`${SUPABASE_URL}/rest/v1/orcamento_eventos`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=minimal' }, body: JSON.stringify({ orcamento_id: o.id, tipo: 'quero_reservar', dados: { codigo: op.codigo, extras } }), signal: AbortSignal.timeout(5000) }).catch(() => {});
            // Cada extra marcado vira oferta aceita pelo cliente: a equipe registra a venda no painel 🛍 da conversa
            if (extras.length && o.conversa_id) {
              const negocio = await negocioDaConversa(o.conversa_id);
              const ja = await ofertasDaConversa(o.conversa_id);
              for (const e of extras) {
                if (ja.some(x => x.produto_codigo === e.codigo && x.situacao === 'aceito')) continue;
                const ro = await fetch(`${SUPABASE_URL}/rest/v1/ofertas`, { method: 'POST', headers: { ...cabecalhosBanco(), Prefer: 'return=representation' }, signal: AbortSignal.timeout(5000),
                  body: JSON.stringify({ conversa_id: o.conversa_id, negocio_id: negocio, produto_codigo: e.codigo, produto_nome: e.nome + (e.variacao ? ' (' + e.variacao + ')' : ''), por: 'pagina', situacao: 'aceito', respondido_em: new Date().toISOString() }) }).catch(() => null);
                const of = ro && ro.ok ? (await ro.json().catch(() => []))[0] : null;
                await aceiteDoCliente({ conversa_id: o.conversa_id, oferta_id: of && of.id, produto_codigo: e.codigo, variacao: e.variacao, origem: 'pagina' })
                  .catch(err => console.warn(JSON.stringify({ evento: 'aceite_pagina', erro: String(err.message || err).slice(0, 200) })));
              }
            }
          }
          const cat = orcamento.CATALOGO[op.codigo];
          const nomeOp = cat ? cat.nome : op.nome;
          const texto = `Oi! Quero reservar ${/^Cabana/.test(nomeOp) ? 'a' : 'o'} ${nomeOp} de ${orcamento.periodo(o.data_entrada, o.data_saida)} (orçamento ${token.slice(0, 6)}).`
            + (extras.length ? ` Também quero incluir: ${extras.map(e => e.nome + (e.variacao ? ' (' + e.variacao + ')' : '')).join(', ')}.` : '');
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

  // Entrada da equipe: se o e-mail está na lista da equipe (tabela usuarios, ativo), cria/confirma o login no Supabase.
  // Responde sempre igual (não revela quem é da equipe). Assim o dono só precisa liberar o e-mail no SQL.
  if (url.pathname === '/entrar/preparar' && req.method === 'POST') {
    if (limiteExcedido(req)) return json(res, 429, { ok: false });
    lerCorpo(req, 2000).then(async corpo => {
      const email = String(corpo.email || '').trim().toLowerCase().slice(0, 160);
      if (!bancoLigado() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(res, 200, { ok: true });
      await prepararLogin(email).catch(e => console.warn(JSON.stringify({ evento: 'preparar_login', erro: String(e.message || e).slice(0, 200) })));
      json(res, 200, { ok: true });
    }).catch(() => json(res, 400, { ok: false }));
    return;
  }

  // Agendador do Google (a cada 2 min): confere as cobranças Pix ativas. Não devolve dado nenhum, só contagens.
  if (url.pathname === '/cron/pix' && req.method === 'POST') {
    if (!bancoLigado()) return json(res, 503, { ok: false });
    verificarCobrancas().then(r => json(res, 200, { ok: true, ...r })).catch(() => json(res, 500, { ok: false }));
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
      if (e instanceof bb.ErroBB) e = new ErroEnvio(e.http, e.message);
      if (e instanceof silbeck.ErroSilbeck) e = e.http === 400 ? new ErroEnvio(400, 'Pedido inválido: ' + e.message + '.') : new ErroEnvio(502, 'O Silbeck não respondeu agora (' + e.message + ').');
      if (!(e instanceof ErroEnvio)) console.error(JSON.stringify({ evento: 'falha_api', rota: url.pathname, erro: String(e.message || e).slice(0, 200) }));
      json(res, e.http || 500, { ok: false, erro: e instanceof ErroEnvio ? e.message : 'Não deu agora. Tente de novo.' });
    });
    return;
  }

  if (url.pathname === '/api/fotos' && req.method === 'GET') {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return json(res, 401, { ok: false, erro: 'Entre de novo.' });
    autenticarEquipe(auth.slice(7)).then(async () => { await atualizarFotos(); json(res, 200, { ok: true, grupos: orcamento.biblioteca({ todas: true }) }); })
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

  const mm = req.method === 'GET' && url.pathname.match(/^\/api\/drive\/miniatura\/([\w-]{10,100})$/);
  if (mm) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return json(res, 401, { ok: false, erro: 'Entre de novo.' });
    autenticarEquipe(auth.slice(7)).then(() => drive.miniatura(mm[1])).then(dados => {
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600', ...cabecalhosSeguranca() });
      res.end(dados);
    }).catch(e => json(res, e.http || 500, { ok: false, erro: e instanceof ErroEnvio || e instanceof drive.ErroDrive ? e.message : 'Não deu agora.' }));
    return;
  }
  const mf = req.method === 'GET' && !ESTATICOS[url.pathname] && url.pathname.match(/^\/fotos\/([\w.-]+\.jpg)$/);
  if (mf) { // foto trazida do Drive pela equipe (fica no Storage)
    bytesDaFoto(mf[1]).then(dados => {
      if (!dados) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Foto não encontrada.'); }
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=300', ...cabecalhosSeguranca() });
      res.end(dados);
    }).catch(() => { res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Indisponível agora.'); });
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
module.exports = { servidor, assinaturaValida, registrar, corpoDe, numeroParaEnvio, extDe, fotosDoProduto, prazoCobranca };
