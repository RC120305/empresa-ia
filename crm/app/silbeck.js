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

// ---------------------------------------------------------------- cliente da API
// Modo "simulador" (padrão enquanto a ponte com o hotel não funciona): sobe o simulador FICTÍCIO dentro do
// próprio CRM, em 127.0.0.1, e cota nele. Modo "real": usa o endereço e as credenciais do cofre.
const MODO = () => (process.env.SILBECK_MODO || 'simulador').toLowerCase() === 'real' ? 'real' : 'simulador';

let simulador = null; // Promise<{ base }>
function subirSimulador() {
  if (!simulador) {
    simulador = new Promise((ok, falha) => {
      let mod;
      for (const p of ['./simulador-silbeck', '../simulador-silbeck']) {
        try { mod = { Simulador: require(p + '/src/simulador').Simulador, criarServidor: require(p + '/src/servidor').criarServidor }; break; } catch (e) { /* próximo */ }
      }
      if (!mod) return falha(new Error('simulador do Silbeck não encontrado no servidor'));
      const srv = mod.criarServidor(new mod.Simulador({}), { log: () => {} });
      srv.listen(0, '127.0.0.1', () => ok({ base: `http://127.0.0.1:${srv.address().port}/datasnap/rest` }));
      srv.unref();
    }).catch(e => { simulador = null; throw e; });
  }
  return simulador;
}

// Códigos do Silbeck REAL → códigos do CRM (fotos, descrições do orçamento, regra de menores de 5 anos).
// Visto no Silbeck do hotel em 08/10/2026. Só os pares certos; os outros seguem com o código e o nome do Silbeck
// até o dono confirmar (ver /saude/silbeck-cotacao). O simulador já usa os códigos do CRM.
const CODIGO_DO_CRM = { CAB: 'CBD', CABT: 'CBT', CABMAS: 'CBM', CON: 'CJ', QSUP: 'QES', QSTD: 'QST', STD: 'STD', STD1: 'CST', DPLS: 'SUP', BANG4C: 'BGE' };
// BANG3 (Bangalô Triplo) e BANG4 (Bangalô Quádruplo) ficam com o código do Silbeck: os dois são o "Bangalô" do CRM
// (fotos e descrição do BG, em orcamento.js); juntá-los num código só misturaria as vagas.
const paraCRM = lista => Array.isArray(lista) ? lista.map(t => t && t.codigo && CODIGO_DO_CRM[t.codigo] ? { ...t, codigo: CODIGO_DO_CRM[t.codigo], codigo_silbeck: t.codigo } : t) : lista;
class ErroSilbeck extends Error { constructor(msg, http) { super(msg); this.http = http; } }

let token = null; // { valor, ate, base }
async function conexao(buscar) {
  if (MODO() === 'simulador') return { ...(await subirSimulador()), id: 'teste', sec: 'teste', fonte: 'simulador' };
  const [base, id, sec] = await Promise.all(['silbeck-url', 'silbeck-client-id', 'silbeck-client-secret'].map(n => segredo(n, buscar)));
  if (!base || !id || !sec) throw new ErroSilbeck('Silbeck sem endereço ou credenciais no cofre');
  return { base: base.replace(/\/+$/, ''), id, sec, fonte: 'silbeck' };
}
// expires_in vem como 30 sem unidade confirmada: renova a cada 25 s (o pior caso) e ao receber 401/403.
async function obterToken(c, buscar, renovar) {
  if (!renovar && token && token.base === c.base && token.ate > Date.now()) return token.valor;
  const q = new URLSearchParams({ client_id: c.id, client_secret: c.sec });
  const r = await buscar(`${c.base}/v1/Liberar?${q}`, { method: 'POST', signal: AbortSignal.timeout(10000) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || !j.access_token) throw new ErroSilbeck('o Silbeck recusou o login (' + r.status + ')', r.status);
  token = { valor: j.access_token, ate: Date.now() + 25000, base: c.base };
  return token.valor;
}
async function chamar(metodo, caminho, corpo, buscar = fetch) {
  const c = await conexao(buscar);
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const t = await obterToken(c, buscar, tentativa > 0);
    const r = await buscar(c.base + caminho, {
      method: metodo, signal: AbortSignal.timeout(15000),
      headers: { Authorization: 'Bearer ' + t, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    if ((r.status === 401 || r.status === 403) && tentativa === 0) continue; // token vencido: renova uma vez
    const j = await r.json().catch(() => null);
    if (!r.ok) {
      const e = j && Array.isArray(j.erro) ? j.erro.map(x => x.mensagem).join(' ') : (j && j.error) || '';
      throw new ErroSilbeck(`Silbeck ${caminho.split('?')[0]} ${r.status}${e ? ': ' + String(e).slice(0, 200) : ''}`, r.status);
    }
    if (c.fonte !== 'simulador' && j && typeof j === 'object') { // códigos das acomodações na língua do CRM
      if (j.listaTipoApartamento) j.listaTipoApartamento = paraCRM(j.listaTipoApartamento);
      if (j.listaTipoApto) j.listaTipoApto = paraCRM(j.listaTipoApto);
    }
    return { dados: j, fonte: c.fonte };
  }
  throw new ErroSilbeck('o Silbeck recusou o token duas vezes', 401);
}

// Cadastros que mudam pouco: guardados por 1 hora.
const cadastros = {};
async function cadastro(caminho, chave, buscar) {
  const k = MODO() + caminho;
  if (cadastros[k] && cadastros[k].ate > Date.now()) return cadastros[k].v;
  const { dados } = await chamar('GET', caminho, null, buscar);
  const v = (dados && dados[chave]) || [];
  cadastros[k] = { v, ate: Date.now() + 3600e3 };
  return v;
}

// No máximo 2 chamadas ao mesmo tempo (o servidor do Silbeck fica dentro do hotel).
async function emFila(itens, fn, limite = 2) {
  const out = new Array(itens.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, async () => {
    while (i < itens.length) { const k = i++; out[k] = await fn(itens[k]).catch(e => ({ erro: e })); }
  }));
  return out;
}

const somarDias = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const hojeBonito = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Campo_Grande' }).format(new Date());
const reais = v => Math.round(v * 100) / 100;
const SEM_MENORES_DE_5 = new Set(['CBD', 'CBT']); // Cabana Casal e Cabana Tripla (regra do hotel; o Silbeck não aplica)

// Regra do hotel (P68a): até 4 anos não paga (cortesia); 5 anos ou mais paga.
function categoriasDoGrupo(categorias, adultos, idades) {
  const cat = t => (categorias.find(c => Number(c.tipo) === t) || {}).id; // o Silbeck real manda o tipo como texto ("1")
  const pequenos = idades.filter(x => x <= 4).length, pagantesCriancas = idades.length - pequenos;
  const lista = [{ id: cat(1), quantidade: adultos }];
  if (pagantesCriancas) lista.push({ id: cat(3), quantidade: pagantesCriancas });
  if (pequenos) lista.push({ id: cat(4), quantidade: pequenos });
  if (lista.some(c => c.id == null)) throw new ErroSilbeck('categorias de hóspede não encontradas no Silbeck');
  return { lista, pequenos, pagantesCriancas };
}

// ---------- Combinações (grupo em mais de uma acomodação; dono, 05/10/2026) ----------
// Regras: toda acomodação tem ao menos 1 adulto; até 4 anos fica com um adulto e não vai para Cabana Casal/Tripla;
// automático até 4 acomodações e 16 pessoas (acima disso, a equipe, que pode negociar condição de grupo).
const LIMITE_ACOMODACOES = 4, LIMITE_PESSOAS = 16;
const cabe = (t, adultos, idades) => adultos >= 1 && adultos + idades.length <= t.maximoOcupantes && !(idades.some(i => i <= 4) && SEM_MENORES_DE_5.has(t.codigo));
// Código único da combinação: maiores primeiro (ex.: CBM+STD, BGE+BGE)
const ordemQuartos = (a, b) => b.maximoOcupantes - a.maximoOcupantes || a.codigo.localeCompare(b.codigo);
const codigoCombinacao = codigos => codigos.join('+');
function nomeCombinacao(quartos) {
  const vistos = [];
  for (const q of quartos) { const v = vistos.find(x => x.codigo === q.codigo); if (v) v.n++; else vistos.push({ codigo: q.codigo, nome: q.nome, n: 1 }); }
  return vistos.map(v => (v.n > 1 ? v.n + ' × ' : '') + v.nome).join(' + ');
}
// Distribui o grupo: 1 adulto em cada; depois as crianças (as menores primeiro) e os outros adultos onde sobra mais lugar
function distribuir(tipos, adultos, idades) {
  if (adultos < tipos.length) return null;
  const quartos = tipos.map(t => ({ t, adultos: 1, idades: [] }));
  const livre = q => q.t.maximoOcupantes - q.adultos - q.idades.length;
  const poe = (fn, pode) => { const alvo = quartos.filter(q => livre(q) > 0 && pode(q)).sort((a, b) => livre(b) - livre(a))[0]; if (!alvo) return false; fn(alvo); return true; };
  for (const i of [...idades].sort((a, b) => a - b)) if (!poe(q => q.idades.push(i), q => !(i <= 4 && SEM_MENORES_DE_5.has(q.t.codigo)))) return null;
  for (let a = tipos.length; a < adultos; a++) if (!poe(q => q.adultos++, () => true)) return null;
  return quartos.map(q => ({ t: q.t, adultos: q.adultos, idades: q.idades }));
}
// Promoção do site (dono, 08/10/2026): −41% a partir de 2 diárias, como no motor de reservas (1 diária: preço cheio).
// Fica DESLIGADA até o valor da API bater com o preço cheio do motor; a equipe liga em Ajustes (config promocao_site).
// Aplicada num ponto só (tarifa): vale para a cotação, as combinações e as diárias enviadas na reserva.
let PROMO = { ligada: false, percentual: 41, minimo_diarias: 2 }, fontePromo = null, promoAte = 0;
const definirFontePromocao = fn => { fontePromo = fn; promoAte = 0; };
async function promocao() {
  if (fontePromo && promoAte < Date.now()) {
    try { const p = await fontePromo(); PROMO = { ligada: false, percentual: 41, minimo_diarias: 2, ...(p || {}) }; } catch (e) { /* mantém a última */ }
    promoAte = Date.now() + 60000;
  }
  return PROMO;
}
async function tarifa(corpo, buscar) {
  const r = await chamar('POST', '/v1/Tarifario/Valor', corpo, buscar);
  const p = await promocao(), pct = Number(p.percentual);
  const noites = Math.round((new Date(corpo.dataSaida) - new Date(corpo.dataEntrada)) / 864e5);
  if (!p.ligada || !(pct > 0 && pct < 100) || noites < (Number(p.minimo_diarias) || 2) || !Array.isArray(r.dados)) return r;
  const f = 1 - pct / 100, n = x => Number(x || 0);
  r.dados = r.dados.map(d => ({ ...d, valorCheio: n(d.valor), taxasCheias: n(d.valorTaxaServico) + n(d.valorTaxaISS),
    valor: reais(n(d.valor) * f), valorTaxaServico: reais(n(d.valorTaxaServico) * f), valorTaxaISS: reais(n(d.valorTaxaISS) * f) }));
  r.promocao = pct;
  return r;
}
// Preço ao cliente igual ao do site (dono, 09/10/2026): o motor de reservas mostra só as diárias, sem somar a taxa de
// serviço nem o ISS que o Tarifario/Valor devolve à parte (ex.: Cabana Casal 18 a 20/10: 2 × R$ 780,57 = R$ 1.561,14).
// As taxas seguem no resultado (campo taxas), só para consulta.
const SOMAR_TAXAS = false;
const precoAoCliente = (diarias, taxas) => reais(diarias + (SOMAR_TAXAS ? taxas : 0));
// Preço cheio (sem a promoção) de uma lista de diárias devolvida por tarifa()
const cheio = dias => reais(dias.reduce((s, d) => s + (d.valorCheio != null ? d.valorCheio + (SOMAR_TAXAS ? d.taxasCheias : 0) : Number(d.valor || 0) + (SOMAR_TAXAS ? Number(d.valorTaxaServico || 0) + Number(d.valorTaxaISS || 0) : 0)), 0));
// Preço de uma acomodação para uma ocupação (Tarifario/Valor), com cache dentro da mesma consulta
async function precoQuarto(t, ini, fim, adultos, idades, categorias, cache, buscar) {
  const { lista } = categoriasDoGrupo(categorias, adultos, idades);
  const chave = t.codigo + '|' + JSON.stringify(lista);
  if (!cache.has(chave)) cache.set(chave, tarifa({ dataEntrada: ini, dataSaida: fim, idTipoApartamento: t.id, listaCategoriaHospede: lista }, buscar).then(p => {
    const dias = p && Array.isArray(p.dados) ? p.dados : [];
    if (!dias.length) return null;
    const diarias = reais(dias.reduce((s, d) => s + Number(d.valor || 0), 0));
    const taxas = reais(dias.reduce((s, d) => s + Number(d.valorTaxaServico || 0) + Number(d.valorTaxaISS || 0), 0));
    return { diarias, taxas, valor_total: precoAoCliente(diarias, taxas), dias, ...(p.promocao ? { valor_cheio: cheio(dias), promocao: p.promocao } : {}) };
  }).catch(() => null));
  return cache.get(chave);
}
// Monta a opção de combinação (preço exato de cada acomodação pela ocupação dela)
async function precificar(quartos, ini, fim, noites, categorias, cache, buscar) {
  const precos = await emFila(quartos, q => precoQuarto(q.t, ini, fim, q.adultos, q.idades, categorias, cache, buscar));
  if (precos.some(p => !p)) return null;
  const acomodacoes = quartos.map((q, i) => ({ codigo: q.t.codigo, nome: q.t.nome, adultos: q.adultos, idades_criancas: q.idades, valor_total: precos[i].valor_total, ...(precos[i].valor_cheio ? { valor_cheio: precos[i].valor_cheio } : {}), diarias: precos[i].diarias, taxas: precos[i].taxas }));
  const total = reais(acomodacoes.reduce((s, a) => s + a.valor_total, 0));
  return { codigo: codigoCombinacao(quartos.map(q => q.t).sort(ordemQuartos).map(t => t.codigo)), nome: nomeCombinacao(acomodacoes), combinacao: true, acomodacoes,
    capacidade: quartos.reduce((s, q) => s + q.t.maximoOcupantes, 0), valor_total: total, media_por_noite: reais(total / noites), parcela_6x: reais(total / 6),
    diarias: reais(acomodacoes.reduce((s, a) => s + a.diarias, 0)), taxas: reais(acomodacoes.reduce((s, a) => s + a.taxas, 0)),
    ...(precos.every(p => p.valor_cheio) ? { valor_cheio: reais(precos.reduce((s, p) => s + p.valor_cheio, 0)), promocao: precos[0].promocao } : {}) };
}
const temVagas = (tipos, vagas) => { const n = {}; for (const t of tipos) n[t.codigo] = (n[t.codigo] || 0) + 1; return Object.entries(n).every(([c, q]) => (vagas[c] || 0) >= q); };
// Grupos pedidos pelo cliente ("os avós num quarto separado"): confere se somam o grupo todo
function gruposValidos(grupos, adultos, idades) {
  if (!Array.isArray(grupos) || grupos.length < 2) return null;
  const gs = grupos.map(g => ({ adultos: Number(g && g.adultos), idades: Array.isArray(g && g.idades_criancas) ? g.idades_criancas.map(Number) : [] }));
  if (gs.some(g => !Number.isInteger(g.adultos) || g.adultos < 1)) return { erro: 'Cada acomodação precisa de pelo menos 1 adulto (grupos_por_acomodacao).' };
  const soma = gs.reduce((s, g) => s + g.adultos, 0), todas = gs.flatMap(g => g.idades).sort((a, b) => a - b).join(',');
  if (soma !== adultos || todas !== [...idades].sort((a, b) => a - b).join(',')) return { erro: 'grupos_por_acomodacao não soma o grupo todo (adultos e idades das crianças).' };
  return { grupos: gs };
}
// Lista as combinações possíveis com vaga e devolve até 5 variadas (da mais em conta à de mais conforto)
async function combinacoes({ tipos, vagas, categorias, ini, fim, noites, adultos, idades, grupos }, buscar) {
  const cache = new Map(), livres = tipos.filter(t => vagas[t.codigo] > 0);
  let candidatas = []; // [{ quartos: [{t, adultos, idades}], estimativa }]
  if (grupos) {
    // Cada grupo numa acomodação em que caiba; preço exato de cada (tipo, grupo)
    const porGrupo = grupos.map(g => livres.filter(t => cabe(t, g.adultos, g.idades)));
    if (porGrupo.some(l => !l.length)) return { combinacoes: [], erro: 'Algum dos grupos pedidos não cabe em nenhuma acomodação com vaga.' };
    const precos = new Map();
    await emFila(porGrupo.flatMap((l, gi) => l.map(t => ({ t, gi }))), async ({ t, gi }) => precos.set(t.codigo + '|' + gi, await precoQuarto(t, ini, fim, grupos[gi].adultos, grupos[gi].idades, categorias, cache, buscar)));
    const visitar = (gi, escolha) => {
      if (candidatas.length > 5000) return;
      if (gi === grupos.length) { if (temVagas(escolha, vagas) && escolha.every((t, i) => precos.get(t.codigo + '|' + i))) candidatas.push({ quartos: escolha.map((t, i) => ({ t, adultos: grupos[i].adultos, idades: grupos[i].idades })), estimativa: escolha.reduce((s, t, i) => s + precos.get(t.codigo + '|' + i).valor_total, 0) }); return; }
      for (const t of porGrupo[gi]) visitar(gi + 1, [...escolha, t]);
    };
    visitar(0, []);
  } else {
    // Menor número de acomodações em que o grupo cabe; distribuição automática
    const base = new Map();
    await emFila(livres, async t => base.set(t.codigo, await precoQuarto(t, ini, fim, Math.min(2, t.maximoOcupantes), [], categorias, cache, buscar)));
    const ordenados = [...livres].sort(ordemQuartos);
    for (let k = 2; k <= LIMITE_ACOMODACOES && !candidatas.length; k++) {
      const multi = (de, escolha) => {
        if (escolha.length === k) {
          if (!temVagas(escolha, vagas)) return;
          const q = distribuir(escolha, adultos, idades);
          if (q && escolha.every(t => base.get(t.codigo))) candidatas.push({ quartos: q, estimativa: escolha.reduce((s, t) => s + base.get(t.codigo).valor_total, 0) });
          return;
        }
        for (let i = de; i < ordenados.length; i++) multi(i, [...escolha, ordenados[i]]);
      };
      multi(0, []);
    }
  }
  // Uma combinação por código (a mais barata), escolhendo 5 variadas pela estimativa
  const porCodigo = new Map();
  for (const c of candidatas.sort((a, b) => a.estimativa - b.estimativa)) {
    const cod = codigoCombinacao([...c.quartos].map(q => q.t).sort(ordemQuartos).map(t => t.codigo));
    if (!porCodigo.has(cod)) porCodigo.set(cod, c);
  }
  const lista = [...porCodigo.values()], n = lista.length;
  const escolhidas = [...new Set([0, 1, Math.floor(n / 2), n - 2, n - 1].filter(i => i >= 0 && i < n))].map(i => lista[i]);
  const opcoes = (await emFila(escolhidas, c => precificar(grupos ? c.quartos : [...c.quartos].sort((a, b) => ordemQuartos(a.t, b.t)), ini, fim, noites, categorias, cache, buscar))).filter(Boolean);
  opcoes.sort((a, b) => a.valor_total - b.valor_total);
  return { combinacoes: opcoes };
}

// consultar_disponibilidade (crm/gilberto/ferramentas.json): vagas e valores de hoje para um período e um grupo.
async function cotar(entrada, buscar = fetch) {
  const { data_entrada: ini, data_saida: fim } = entrada;
  const adultos = Number(entrada.adultos);
  const idades = Array.isArray(entrada.idades_criancas) ? entrada.idades_criancas.map(Number) : [];
  const erro = m => ({ ok: false, erro: m });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ini || '') || !/^\d{4}-\d{2}-\d{2}$/.test(fim || '')) return erro('Datas no formato AAAA-MM-DD.');
  if (ini < hojeBonito()) return erro('A data de entrada já passou. Confirme as datas com o cliente.');
  if (fim <= ini) return erro('A saída precisa ser depois da entrada.');
  const noites = Math.round((new Date(fim) - new Date(ini)) / 864e5);
  if (noites > 30) return erro('Período acima de 30 noites: passe para a equipe.');
  if (!Number.isInteger(adultos) || adultos < 1) return erro('É preciso ao menos 1 adulto.');
  if (idades.some(x => !Number.isInteger(x) || x < 0 || x > 17)) return erro('Informe a idade de cada criança (0 a 17 anos).');

  const [tipos, categorias] = await Promise.all([cadastro('/v1/TipoApartamento', 'listaTipoApartamento', buscar), cadastro('/v1/CategoriaHospede', 'listaCategoriaHospede', buscar)]);
  const { lista, pequenos, pagantesCriancas } = categoriasDoGrupo(categorias, adultos, idades);
  const pessoas = adultos + idades.length;

  const disp = await chamar('GET', `/v1/Disponibilidade?dataInicial=${ini}&DataFinal=${somarDias(fim, -1)}&DetalharDiaADia=true`, null, buscar);
  const vagas = {};
  for (const t of (disp.dados && disp.dados.listaTipoApto) || []) {
    const dias = t.listaSituacaoTipoApto || [];
    vagas[t.codigo] = dias.length ? Math.min(...dias.map(d => d.qtdeDisponivel)) : 0;
  }
  const candidatos = [], semVaga = [], naoComporta = [];
  for (const t of tipos) {
    if (pessoas > t.maximoOcupantes || (pequenos && SEM_MENORES_DE_5.has(t.codigo))) { naoComporta.push(t.nome); continue; }
    if (!(vagas[t.codigo] > 0)) { semVaga.push(t.nome); continue; }
    candidatos.push(t);
  }
  const pedidos = gruposValidos(entrada.grupos_por_acomodacao, adultos, idades);
  if (pedidos && pedidos.erro) return erro(pedidos.erro);
  const precos = pedidos ? [] : await emFila(candidatos, t => tarifa({ dataEntrada: ini, dataSaida: fim, idTipoApartamento: t.id, listaCategoriaHospede: lista }, buscar));
  const opcoes = [];
  if (!pedidos) candidatos.forEach((t, i) => {
    const p = precos[i];
    if (!p || p.erro || !Array.isArray(p.dados)) return;
    const diarias = p.dados.reduce((s, d) => s + Number(d.valor || 0), 0);
    const taxas = p.dados.reduce((s, d) => s + Number(d.valorTaxaServico || 0) + Number(d.valorTaxaISS || 0), 0);
    const total = precoAoCliente(diarias, taxas);
    opcoes.push({ codigo: t.codigo, nome: t.nome, capacidade: t.maximoOcupantes, vagas_no_periodo: vagas[t.codigo],
      valor_total: total, media_por_noite: reais(total / noites), parcela_6x: reais(total / 6), diarias: reais(diarias), taxas: reais(taxas),
      ...(p.promocao ? { valor_cheio: cheio(p.dados), promocao: p.promocao } : {}) });
  });
  opcoes.sort((a, b) => a.valor_total - b.valor_total);
  const r = { ok: true, fonte: disp.fonte, periodo: { entrada: ini, saida: fim, noites }, grupo: { adultos, idades_criancas: idades, pagantes: adultos + pagantesCriancas },
    opcoes, esgotados_no_periodo: semVaga, nao_comportam_o_grupo: naoComporta };
  const pr = await promocao();
  if (pr.ligada && noites >= (Number(pr.minimo_diarias) || 2)) r.promocao = `Valores já com o desconto de ${pr.percentual}% do site (a partir de ${pr.minimo_diarias || 2} diárias); valor_cheio é o preço sem o desconto. Pode dizer ao cliente que é o mesmo preço promocional do site.`;
  else if (pr.ligada) r.promocao = `1 diária sai pelo preço cheio; a partir de ${pr.minimo_diarias || 2} diárias há ${pr.percentual}% de desconto (o mesmo do site). Vale oferecer a 2ª noite.`;
  // Combinação: quando o cliente pede acomodações separadas ou quando o grupo não cabe (ou não há vaga) numa acomodação só
  if (pedidos || !opcoes.length) {
    if (pessoas > LIMITE_PESSOAS || (pedidos && pedidos.grupos.length > LIMITE_ACOMODACOES)) r.aviso = `Grupo grande (mais de ${LIMITE_PESSOAS} pessoas ou de ${LIMITE_ACOMODACOES} acomodações): quem monta é a equipe, que pode negociar uma condição de grupo. Use abrir_alerta.`;
    else if (adultos >= 2 || pedidos) {
      const cb = await combinacoes({ tipos, vagas, categorias, ini, fim, noites, adultos, idades, grupos: pedidos && pedidos.grupos }, buscar);
      r.opcoes = cb.combinacoes;
      if (cb.combinacoes.length) r.aviso = 'Combinações de acomodações' + (pedidos ? ' na divisão que o cliente pediu' : ' (o grupo não cabe ou não há vaga numa acomodação só)') + ': cada opção traz quem fica em cada acomodação. Use o código da combinação (ex.: CBM+STD) em gerar_orcamento e em criar_reserva.';
      else r.aviso = cb.erro || 'Não há combinação de acomodações com vaga para esse grupo nessas datas.';
    }
  }
  if (disp.fonte === 'simulador') r.atencao = 'VALORES FICTÍCIOS DO SIMULADOR (teste): não são preços reais do hotel.';
  return r;
}

// Vagas por tipo e por dia (painel "Vagas" da conversa). Só leitura.
// Data do dia como AAAA-MM-DD, venha ela "2026-10-18", "2026-10-18T00:00:00" ou "18/10/2026"
const diaISO = x => { const t = String(x || ''); const br = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/); return br ? `${br[3]}-${br[2]}-${br[1]}` : t.slice(0, 10); };
async function vagas(inicio, dias, buscar = fetch) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio || '')) throw new ErroSilbeck('data inicial inválida', 400);
  const n = Math.min(62, Math.max(1, Number(dias) || 14)); // até 62 noites (o mapa da aba Vagas mostra 60)
  const [tipos, disp] = await Promise.all([cadastro('/v1/TipoApartamento', 'listaTipoApartamento', buscar),
    chamar('GET', `/v1/Disponibilidade?dataInicial=${inicio}&DataFinal=${somarDias(inicio, n - 1)}&DetalharDiaADia=true`, null, buscar)]);
  const porCod = Object.fromEntries(((disp.dados && disp.dados.listaTipoApto) || []).map(t => [t.codigo, t]));
  return { ok: true, fonte: disp.fonte, inicio, dias: Array.from({ length: n }, (_, i) => somarDias(inicio, i)),
    tipos: tipos.map(t => ({ codigo: t.codigo, nome: t.nome, total: t.quantidade ?? (porCod[t.codigo] || {}).qtdeMapa, capacidade: t.maximoOcupantes,
      vagas: Array.from({ length: n }, (_, i) => { const d = somarDias(inicio, i); const x = ((porCod[t.codigo] || {}).listaSituacaoTipoApto || []).find(y => diaISO(y.data) === d); return x ? Number(x.qtdeDisponivel) : null; }) })) };
}

// criar_reserva: confere a vaga e o preço de novo (na mesma hora) e cria a reserva NÃO CONFIRMADA no Silbeck.
// O preço vai sempre do Tarifario/Valor (nunca digitado). Se mudou em relação ao orçamento, não cria (o cliente precisa
// de um novo OK). A reserva confirma sozinha quando o adiantamento (pagamento) é lançado (regra da Silbeck, P46).
// Itens da reserva no Silbeck (o id de cada item é a "conta" onde o pagamento é lançado). Procura pela data de
// entrada (a mais segura) e, se não achar, pela data de cadastro de hoje. Devolve só ids, tipo e situação.
async function itensDaReserva(idReserva, dataEntrada, buscar = fetch) {
  const filtros = [];
  if (/^\d{4}-\d{2}-\d{2}$/.test(dataEntrada || '')) filtros.push(`dataInicial=${dataEntrada}&dataFinal=${dataEntrada}&tipoData=entrada`);
  filtros.push(`dataInicial=${hojeBonito()}&dataFinal=${hojeBonito()}&tipoData=cadastro`);
  let erro = null;
  for (const f of filtros) {
    const lr = await chamar('GET', `/v1/ListaReserva?${f}&idReserva=${idReserva}`, null, buscar).catch(e => { erro = e; return null; });
    const lista = (lr && lr.dados && (lr.dados.listaReserva || lr.dados)) || [];
    const r = (Array.isArray(lista) ? lista : []).find(x => String(x.id) === String(idReserva));
    const itens = (r && r.listaReservaItem) || [];
    if (itens.length) return itens.map(x => ({ ...x, codigo_crm: CODIGO_DO_CRM[x.codigoTipoApartamento] || x.codigoTipoApartamento || null }));
  }
  if (erro) throw erro;
  return [];
}
// Pensão das reservas diretas: 4 = café da manhã incluído (cadastro TipoPensao do Silbeck do Cabanas)
const PENSAO = Number(process.env.SILBECK_ID_PENSAO || 4);
async function reservar(e, buscar = fetch) {
  const ini = e.data_entrada, fim = e.data_saida;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ini || '') || !/^\d{4}-\d{2}-\d{2}$/.test(fim || '') || fim <= ini) return { ok: false, erro: 'Datas inválidas.' };
  if (ini < hojeBonito()) return { ok: false, erro: 'A data de entrada já passou.' };
  const titular = String(e.titular || '').trim();
  if (titular.split(/\s+/).length < 2) return { ok: false, erro: 'Falta o nome completo do titular.' };
  // Uma acomodação (codigo + grupo) ou uma combinação (quartos: [{codigo, adultos, idades_criancas}], um item por acomodação)
  const pedidos = Array.isArray(e.quartos) && e.quartos.length ? e.quartos : [{ codigo: e.codigo, adultos: e.adultos, idades_criancas: e.idades_criancas }];
  if (pedidos.length > LIMITE_ACOMODACOES) return { ok: false, erro: `Mais de ${LIMITE_ACOMODACOES} acomodações: a equipe monta.` };
  const [tipos, categorias] = await Promise.all([cadastro('/v1/TipoApartamento', 'listaTipoApartamento', buscar), cadastro('/v1/CategoriaHospede', 'listaCategoriaHospede', buscar)]);
  const qs = [];
  for (const q of pedidos) {
    const codigo = String(q.codigo || '').toUpperCase(), tipo = tipos.find(t => t.codigo === codigo);
    if (!tipo) return { ok: false, erro: 'Acomodação ' + codigo + ' não encontrada no Silbeck.' };
    const adultos = Number(q.adultos), idades = (q.idades_criancas || []).map(Number);
    if (!cabe(tipo, adultos, idades)) return { ok: false, erro: tipo.nome + ' não comporta o grupo.' };
    qs.push({ t: tipo, adultos, idades });
  }
  const disp = await chamar('GET', `/v1/Disponibilidade?dataInicial=${ini}&DataFinal=${somarDias(fim, -1)}&DetalharDiaADia=true`, null, buscar);
  const vagas = {};
  for (const t of (disp.dados && disp.dados.listaTipoApto) || []) vagas[t.codigo] = (t.listaSituacaoTipoApto || []).length ? Math.min(...t.listaSituacaoTipoApto.map(d => d.qtdeDisponivel)) : 0;
  if (!temVagas(qs.map(q => q.t), vagas)) {
    const falta = qs.find(q => !temVagas(qs.filter(x => x.t.codigo === q.t.codigo).map(x => x.t), vagas));
    return { ok: false, sem_vaga: true, erro: (falta ? falta.t.nome : 'A acomodação') + ' não tem mais vaga nessas datas.' };
  }
  const cache = new Map();
  const precos = await emFila(qs, q => precoQuarto(q.t, ini, fim, q.adultos, q.idades, categorias, cache, buscar));
  if (precos.some(p => !p)) return { ok: false, erro: 'O Silbeck não devolveu a tarifa.' };
  const total = reais(precos.reduce((s, p) => s + p.valor_total, 0));
  if (e.valor_esperado != null && Math.abs(total - Number(e.valor_esperado)) > 0.5) return { ok: false, preco_mudou: true, valor_novo: total, erro: 'O valor mudou desde o orçamento.' };
  // Hóspedes: o titular e os acompanhantes, na ordem, preenchendo as acomodações (os primeiros de cada uma são os adultos)
  const nomes = [titular, ...(e.acompanhantes || []).map(String).map(n => n.trim()).filter(Boolean).slice(0, 20)];
  let k = 0;
  const itens = qs.map((q, i) => {
    const lugares = q.adultos + q.idades.length, hospedes = [];
    for (let h = 0; h < lugares && k < nomes.length; h++, k++) hospedes.push({ nome: nomes[k], adulto: h < q.adultos });
    return { idTipoApartamento: q.t.id, quantidadeAdulto: q.adultos, quantidadeCrianca: q.idades.length, dataEntrada: ini, dataSaida: fim, qtdeApartamento: 1,
      idTipoPensao: String(PENSAO), valorTotalDiaria: precos[i].diarias, listaHospede: hospedes,
      listaData: precos[i].dias.map(d => ({ data: d.data, valorDiaria: Number(d.valor), ...(d.idTarifario != null ? { idTarifario: d.idTarifario } : {}), idTipoPensao: d.idTipoPensao != null ? d.idTipoPensao : PENSAO })) };
  });
  const corpo = {
    titular, email: e.email || undefined, telefone: e.telefone || undefined,
    observacao: ('Reserva feita pelo CRM (WhatsApp)' + (qs.length > 1 ? ` · ${qs.length} acomodações` : '') + (e.observacao ? '. ' + e.observacao : '')).slice(0, 250),
    listaReservaItem: itens,
  };
  const r = await chamar('POST', '/v1/reserva', corpo, buscar);
  const id = r.dados && r.dados.id;
  if (!id) throw new ErroSilbeck('o Silbeck não devolveu o número da reserva');
  // Cada item da reserva (idConta) recebe a sua parte do pagamento depois
  const doSilbeck = [...await itensDaReserva(id, ini, buscar).catch(() => [])];
  const saida = qs.map((q, i) => {
    const pos = doSilbeck.findIndex(x => Number(x.idTipoApartamento) === Number(q.t.id) && (x.quantidadeAdulto == null || Number(x.quantidadeAdulto) === q.adultos));
    const it = pos >= 0 ? doSilbeck.splice(pos, 1)[0] : null;
    return { codigo: q.t.codigo, nome: q.t.nome, adultos: q.adultos, idades_criancas: q.idades, valor_total: precos[i].valor_total, item_id: it ? String(it.id) : null };
  });
  const combinada = qs.length > 1;
  return { ok: true, fonte: r.fonte, reserva_id: String(id), item_id: saida[0].item_id, itens: saida,
    acomodacao: combinada ? nomeCombinacao(saida) : qs[0].t.nome, codigo: combinada ? codigoCombinacao(qs.map(q => q.t).sort(ordemQuartos).map(t => t.codigo)) : qs[0].t.codigo, valor_total: total };
}
// Preço e vaga de uma combinação escolhida pelo código (ex.: ["CBM","STD"]), com a distribuição automática
// ou com a divisão pedida pelo cliente (grupos_por_acomodacao). Usada quando o orçamento pede uma combinação
// que não veio na lista da consulta.
async function cotarCombinacao(entrada, codigos, buscar = fetch) {
  const { data_entrada: ini, data_saida: fim } = entrada;
  const adultos = Number(entrada.adultos), idades = (entrada.idades_criancas || []).map(Number);
  const erro = m => ({ ok: false, erro: m });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ini || '') || !/^\d{4}-\d{2}-\d{2}$/.test(fim || '') || fim <= ini) return erro('Datas inválidas.');
  if (!Array.isArray(codigos) || codigos.length < 2 || codigos.length > LIMITE_ACOMODACOES) return erro(`Uma combinação tem de 2 a ${LIMITE_ACOMODACOES} acomodações.`);
  if (adultos + idades.length > LIMITE_PESSOAS) return erro(`Grupo acima de ${LIMITE_PESSOAS} pessoas: a equipe monta.`);
  const [tipos, categorias] = await Promise.all([cadastro('/v1/TipoApartamento', 'listaTipoApartamento', buscar), cadastro('/v1/CategoriaHospede', 'listaCategoriaHospede', buscar)]);
  const ts = codigos.map(c => tipos.find(t => t.codigo === String(c).toUpperCase()));
  if (ts.some(t => !t)) return erro('Código de acomodação desconhecido na combinação.');
  const disp = await chamar('GET', `/v1/Disponibilidade?dataInicial=${ini}&DataFinal=${somarDias(fim, -1)}&DetalharDiaADia=true`, null, buscar);
  const vagas = {};
  for (const t of (disp.dados && disp.dados.listaTipoApto) || []) vagas[t.codigo] = (t.listaSituacaoTipoApto || []).length ? Math.min(...t.listaSituacaoTipoApto.map(d => d.qtdeDisponivel)) : 0;
  if (!temVagas(ts, vagas)) return { ok: false, sem_vaga: true, erro: 'Não há vagas para essa combinação nessas datas.' };
  const pedidos = gruposValidos(entrada.grupos_por_acomodacao, adultos, idades);
  if (pedidos && pedidos.erro) return erro(pedidos.erro);
  let quartos = null;
  if (pedidos) {
    if (pedidos.grupos.length !== ts.length) return erro('A combinação precisa ter uma acomodação para cada grupo pedido.');
    const perm = (resto, feitos) => { // acha uma acomodação para cada grupo
      if (!resto.length) return feitos;
      const g = pedidos.grupos[feitos.length];
      for (let i = 0; i < resto.length; i++) if (cabe(resto[i], g.adultos, g.idades)) { const r = perm(resto.filter((_, j) => j !== i), [...feitos, { t: resto[i], adultos: g.adultos, idades: g.idades }]); if (r) return r; }
      return null;
    };
    quartos = perm(ts, []);
  } else quartos = distribuir([...ts].sort(ordemQuartos), adultos, idades);
  if (!quartos) return erro('O grupo não cabe nessa combinação (lembrando: 1 adulto em cada acomodação; menores de 5 anos não ficam na Cabana Casal nem na Tripla).');
  const noites = Math.round((new Date(fim) - new Date(ini)) / 864e5);
  const op = await precificar(quartos, ini, fim, noites, categorias, new Map(), buscar);
  if (!op) return erro('O Silbeck não devolveu a tarifa.');
  return { ok: true, fonte: disp.fonte, opcao: op };
}
// Pagamento recebido: lança o adiantamento no item da reserva (Pix = tipo 8). A reserva confirma sozinha.
async function lancarAdiantamento({ item_id, valor, observacao, tipo = 8 }, buscar = fetch) { // tipo: 8 Pix/depósito, 1 dinheiro
  const r = await chamar('POST', '/v1/Adiantamento', { valor: reais(Number(valor)), idConta: Number(item_id), tipoFormaPagamento: tipo, observacao: String(observacao || '').slice(0, 200) }, buscar);
  return { ok: true, id: r.dados && r.dados.id, confirmado: !!(r.dados && r.dados.confirmado), fonte: r.fonte };
}

// Cotação passo a passo (dono, 08/10/2026: o real falhou e o motivo só ia para o log). Mostra só o formato das
// respostas (nomes dos campos, contagens, status), nunca dados de hóspedes. Usado por /saude/silbeck-cotacao.
let ultimaFalhaCotacao = null;
const registrarFalhaCotacao = (pedido, e) => { ultimaFalhaCotacao = { quando: new Date().toISOString(), pedido, erro: String((e && e.message) || e).slice(0, 300) }; };
async function diagnosticoCotacao({ entrada, saida, adultos = 2 } = {}, buscar = fetch) {
  const ini = /^\d{4}-\d{2}-\d{2}$/.test(entrada || '') ? entrada : somarDias(hojeBonito(), 45);
  const fim = /^\d{4}-\d{2}-\d{2}$/.test(saida || '') && saida > ini ? saida : somarDias(ini, 2);
  const out = { modo: MODO(), pedido: { entrada: ini, saida: fim, adultos: Number(adultos) || 2 }, passos: {}, ultimaFalhaCotacao };
  const chaves = o => o && typeof o === 'object' ? Object.keys(o).slice(0, 25) : typeof o;
  const passo = async (nome, fn) => { const t = Date.now(); try { out.passos[nome] = { ok: true, ...(await fn()), ms: Date.now() - t }; return true; } catch (e) { out.passos[nome] = { ok: false, erro: String(e.message || e).slice(0, 300), ms: Date.now() - t }; return false; } };
  let tipos = [], categorias = [];
  await passo('tiposDeApartamento', async () => { const { dados } = await chamar('GET', '/v1/TipoApartamento', null, buscar); tipos = (dados && dados.listaTipoApartamento) || [];
    return { campos: chaves(dados), quantos: tipos.length, camposDoItem: chaves(tipos[0]), acomodacoes: tipos.map(t => [t.codigo_silbeck || t.codigo, t.codigo_silbeck ? '→ ' + t.codigo : 'sem par no CRM', t.nome, 'até ' + t.maximoOcupantes, t.quantidade + ' un.'].join(' · ')), comMaximoOcupantes: tipos.filter(t => Number(t.maximoOcupantes) > 0).length }; });
  await passo('categoriasDeHospede', async () => { const { dados } = await chamar('GET', '/v1/CategoriaHospede', null, buscar); categorias = (dados && dados.listaCategoriaHospede) || [];
    return { campos: chaves(dados), quantos: categorias.length, camposDoItem: chaves(categorias[0]), tipos: categorias.map(c => c.tipo) }; });
  let disp = null;
  await passo('disponibilidade', async () => { const r = await chamar('GET', `/v1/Disponibilidade?dataInicial=${ini}&DataFinal=${somarDias(fim, -1)}&DetalharDiaADia=true`, null, buscar); disp = r.dados;
    const l = (disp && disp.listaTipoApto) || [];
    return { campos: chaves(disp), tiposNaLista: l.length, camposDoItem: chaves(l[0]), camposDoDia: chaves(((l[0] || {}).listaSituacaoTipoApto || [])[0]), codigos: l.map(t => t.codigo).slice(0, 20) }; });
  const t0 = tipos[0];
  if (t0) await passo('tarifa', async () => {
    const cat = (categorias.find(c => Number(c.tipo) === 1) || {}).id;
    const { dados } = await chamar('POST', '/v1/Tarifario/Valor', { dataEntrada: ini, dataSaida: fim, idTipoApartamento: t0.id, listaCategoriaHospede: [{ id: cat, quantidade: out.pedido.adultos }] }, buscar);
    return { tipo: t0.codigo, categoriaAdulto: cat ?? null, eLista: Array.isArray(dados), campos: chaves(Array.isArray(dados) ? dados[0] : dados), itens: Array.isArray(dados) ? dados.length : null };
  });
  await passo('cotacaoCompleta', async () => { const r = await cotar({ data_entrada: ini, data_saida: fim, adultos: out.pedido.adultos, idades_criancas: [] }, buscar);
    return { resultado: r.ok ? 'ok' : 'erro', erro: r.erro || null, opcoes: (r.opcoes || []).map(o => o.codigo + ' ' + o.valor_total), esgotados: (r.esgotados_no_periodo || []).length, naoComportam: (r.nao_comportam_o_grupo || []).length }; });
  return out;
}
// Preço por pensão (dono, 08/10/2026: o Gilberto cotou acima do motor de reservas). Para algumas acomodações, pede o
// Tarifario/Valor sem pensão e com cada pensão cadastrada, mostrando diária, taxas e total. Sem dados de hóspedes.
async function diagnosticoTarifa({ entrada, saida, adultos = 2, codigos = 'CBD,CBT,BGE' } = {}, buscar = fetch) {
  const ini = /^\d{4}-\d{2}-\d{2}$/.test(entrada || '') ? entrada : somarDias(hojeBonito(), 45);
  const fim = /^\d{4}-\d{2}-\d{2}$/.test(saida || '') && saida > ini ? saida : somarDias(ini, 2);
  const n = Math.round((new Date(fim) - new Date(ini)) / 864e5), ad = Number(adultos) || 2;
  const [tipos, categorias] = await Promise.all([cadastro('/v1/TipoApartamento', 'listaTipoApartamento', buscar), cadastro('/v1/CategoriaHospede', 'listaCategoriaHospede', buscar)]);
  const pens = await chamar('GET', '/v1/TipoPensao', null, buscar).then(r => r.dados).catch(e => ({ erro: String(e.message || e).slice(0, 200) }));
  const listaPensoes = Array.isArray(pens) ? pens : (pens && (pens.listaTipoPensao || pens.lista || Object.values(pens).find(Array.isArray))) || [];
  const adulto = (categorias.find(c => Number(c.tipo) === 1) || {}).id;
  const out = { pedido: { entrada: ini, saida: fim, noites: n, adultos: ad }, pensoes: listaPensoes.map(p => ({ id: p.id, nome: p.nome || p.descricao || null })), erroPensoes: pens && pens.erro || null, precos: {} };
  const cotar1 = async (t, extra) => {
    try {
      const { dados } = await chamar('POST', '/v1/Tarifario/Valor', { dataEntrada: ini, dataSaida: fim, idTipoApartamento: t.id, listaCategoriaHospede: [{ id: adulto, quantidade: ad }], ...extra }, buscar);
      const d = Array.isArray(dados) ? dados : [];
      const soma = k => reais(d.reduce((x, y) => x + Number(y[k] || 0), 0));
      const diarias = soma('valor'), taxas = reais(soma('valorTaxaServico') + soma('valorTaxaISS'));
      return { diarias, servico: soma('valorTaxaServico'), iss: soma('valorTaxaISS'), total: reais(diarias + taxas), porNoite: reais((diarias + taxas) / (n || 1)), noitesDistintas: [...new Set(d.map(x => x.valor))].slice(0, 4), campos: Object.keys(d[0] || {}) };
    } catch (e) { return { erro: String(e.message || e).slice(0, 160) }; }
  };
  for (const cod of String(codigos).split(',').map(x => x.trim().toUpperCase()).filter(Boolean).slice(0, 4)) {
    const t = tipos.find(x => x.codigo === cod);
    if (!t) { out.precos[cod] = { erro: 'tipo não encontrado' }; continue; }
    const r = { nome: t.nome, codigo_silbeck: t.codigo_silbeck || t.codigo, semPensao: await cotar1(t, {}), comQuantidadeAdulto: await cotar1(t, { listaCategoriaHospede: undefined, quantidadeAdulto: ad }) };
    for (const p of listaPensoes.slice(0, 6)) r['pensao_' + p.id] = await cotar1(t, { idTipoPensao: p.id });
    out.precos[cod] = r;
  }
  return out;
}
// Tarifário do motor (dono, 08/10/2026): no Silbeck há "TARIFA MOTOR DE RESERVAS BT 2026" (000027), "AT 2026" (000028)
// e o "AGENDAMENTO RESERVA ONLINE" (000003), que escolhe o tarifário por período. O Tarifario/Valor não documenta campo
// para isso: este teste manda variações (campos não documentados) e mostra qual muda o valor. Sem dados de hóspedes.
async function diagnosticoTarifario({ entrada, saida, adultos = 2, codigo = 'CBD' } = {}, buscar = fetch) {
  const ini = /^\d{4}-\d{2}-\d{2}$/.test(entrada || '') ? entrada : somarDias(hojeBonito(), 45);
  const fim = /^\d{4}-\d{2}-\d{2}$/.test(saida || '') && saida > ini ? saida : somarDias(ini, 1);
  const n = Math.round((new Date(fim) - new Date(ini)) / 864e5), ad = Number(adultos) || 2;
  const [tipos, categorias] = await Promise.all([cadastro('/v1/TipoApartamento', 'listaTipoApartamento', buscar), cadastro('/v1/CategoriaHospede', 'listaCategoriaHospede', buscar)]);
  const t = tipos.find(x => x.codigo === String(codigo).toUpperCase());
  if (!t) return { erro: 'tipo não encontrado: ' + codigo };
  const adulto = (categorias.find(c => Number(c.tipo) === 1) || {}).id;
  const VARIANTES = {
    padrao: {}, idTarifario_27: { idTarifario: 27 }, idTarifario_28: { idTarifario: 28 },
    codigoTarifario_000027: { codigoTarifario: '000027' }, codigoTarifario_000028: { codigoTarifario: '000028' },
    idAgendamentoTarifa_3: { idAgendamentoTarifa: 3 }, idAgendamento_3: { idAgendamento: 3 }, codigoAgendamento_000003: { codigoAgendamento: '000003' },
    idTarifarioAgendamento_3: { idTarifarioAgendamento: 3 }, reservaOnline: { reservaOnline: true }, idReservaPortal_motor: { origem: 'MOTOR' },
  };
  const out = { pedido: { tipo: t.codigo_silbeck || t.codigo, entrada: ini, saida: fim, noites: n, adultos: ad }, variantes: {} };
  for (const [nome, extra] of Object.entries(VARIANTES)) {
    try {
      const { dados } = await chamar('POST', '/v1/Tarifario/Valor', { dataEntrada: ini, dataSaida: fim, idTipoApartamento: t.id, listaCategoriaHospede: [{ id: adulto, quantidade: ad }], ...extra }, buscar);
      const d = Array.isArray(dados) ? dados : [];
      const v = reais(d.reduce((x, y) => x + Number(y.valor || 0), 0)), iss = reais(d.reduce((x, y) => x + Number(y.valorTaxaISS || 0) + Number(y.valorTaxaServico || 0), 0));
      out.variantes[nome] = { diariaMedia: reais(v / (n || 1)), comTaxasPorNoite: reais((v + iss) / (n || 1)), campos: Object.keys(d[0] || {}).join(',') };
    } catch (e) { out.variantes[nome] = { erro: String(e.message || e).slice(0, 160) }; }
  }
  return out;
}
// Cadastro de Empresas do Silbeck (agências, operadoras e empresas que faturam): 250 por página. Para quando a página
// vem incompleta, vazia ou repetida (se a API ignorar o parâmetro), com teto de 40 páginas.
const soDigitos = t => String(t || '').replace(/\D/g, '');
async function empresas(buscar = fetch) {
  const todas = [], vistos = new Set();
  for (let pagina = 1; pagina <= 40; pagina++) {
    const { dados } = await chamar('GET', '/v1/Empresa?pagina=' + pagina, null, buscar);
    const lista = (dados && (dados.listaEmpresa || (Array.isArray(dados) ? dados : null))) || [];
    const novas = lista.filter(e => e && e.id != null && !vistos.has(String(e.id)));
    novas.forEach(e => vistos.add(String(e.id)));
    todas.push(...novas.map(e => ({ silbeck_id: String(e.id), codigo: e.codigo != null && String(e.codigo).trim() ? String(e.codigo).trim() : null,
      nome: String(e.nome || '').trim().replace(/\s+/g, ' ').slice(0, 160), cnpj: soDigitos(e.documento) || null,
      telefone: String(e.celular || e.telefone || '').trim().slice(0, 40) || null, email: String(e.email || '').trim().slice(0, 160) || null })));
    if (lista.length < 250 || !novas.length) break;
  }
  return todas.filter(e => e.nome);
}
// Reservas do Silbeck num período (tipoData: cadastro, entrada...), resumidas para o controle das agências:
// empresa (agência), comissão, datas, diárias, adiantamentos ativos e situação. Em blocos de até 31 dias.
// Valor de hospedagem de um item: o Silbeck real pode deixar o valorTotalDiaria zerado na lista; aí vale o total das
// diárias (listaTotal) ou a soma dia a dia (listaData)
function valorDoItem(x) {
  const v = Number(x.valorTotalDiaria);
  if (v > 0) return v;
  const tot = (x.listaTotal || []).reduce((t, y) => t + (Number(y && y.diaria && y.diaria.valor) || 0), 0);
  if (tot > 0) return tot;
  return (x.listaData || []).reduce((t, y) => t + (Number(y.valorDiaria) || 0), 0) * (Number(x.qtdeApartamento) || 1);
}
const noitesDoItem = x => Math.max(0, Math.round((Date.parse(diaISO(x.dataSaida)) - Date.parse(diaISO(x.dataEntrada))) / 864e5));
// Estado de origem do hóspede (ficha no Silbeck): sigla da UF; país quando não é o Brasil
const UFS = { ACRE: 'AC', ALAGOAS: 'AL', AMAPA: 'AP', AMAZONAS: 'AM', BAHIA: 'BA', CEARA: 'CE', 'DISTRITO FEDERAL': 'DF', 'ESPIRITO SANTO': 'ES', GOIAS: 'GO', MARANHAO: 'MA',
  'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS', 'MINAS GERAIS': 'MG', PARA: 'PA', PARAIBA: 'PB', PARANA: 'PR', PERNAMBUCO: 'PE', PIAUI: 'PI', 'RIO DE JANEIRO': 'RJ',
  'RIO GRANDE DO NORTE': 'RN', 'RIO GRANDE DO SUL': 'RS', RONDONIA: 'RO', RORAIMA: 'RR', 'SANTA CATARINA': 'SC', 'SAO PAULO': 'SP', SERGIPE: 'SE', TOCANTINS: 'TO' };
const SIGLAS = new Set(Object.values(UFS));
function origemHospede(h) {
  const tira = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  const pais = tira(h.pais), est = tira(h.estado);
  if (pais && !/^(BRASIL|BRAZIL|BR|BRA)$/.test(pais)) return { pais: String(h.pais).trim() };
  const uf = SIGLAS.has(est) ? est : UFS[est] || null;
  return uf ? { uf } : null;
}
function resumoReserva(r) {
  const itens = r.listaReservaItem || [];
  const vivos = itens.filter(x => Number(x.status) !== 3);
  const base = vivos.length ? vivos : itens;
  const dia = x => diaISO(x);
  const soma = (l, f) => Math.round(l.reduce((t, x) => t + (Number(f(x)) || 0), 0) * 100) / 100;
  const adiant = soma(base.flatMap(x => (x.listaAdiantamento || []).filter(a => !a.situacao || /^ativ/i.test(a.situacao))), a => a.valor);
  const st = base.length ? Number(base[0].status) : null;
  return { silbeck_id: String(r.id), codigo_empresa: r.codigoEmpresa != null && String(r.codigoEmpresa).trim() ? String(r.codigoEmpresa).trim() : null,
    comissao_pct: Number(r.percentualComissaoEmpresa) > 0 ? Number(r.percentualComissaoEmpresa) : null, titular: r.titular || null,
    acomodacao: [...new Set(base.map(x => x.nomeTipoApartamento || x.codigoTipoApartamento).filter(Boolean))].join(' + ') || null,
    data_entrada: base.length ? base.map(x => dia(x.dataEntrada)).sort()[0] : null, data_saida: base.length ? base.map(x => dia(x.dataSaida)).sort().at(-1) : null,
    valor_total: soma(base, valorDoItem), sinal_pago: adiant, status_silbeck: st, status_descricao: base.length ? (base[0].statusDescricao || null) : null,
    cancelada: itens.length > 0 && !vivos.length,
    // Para o Painel: canal, data de cadastro, hóspedes e noites (apartamento × noite)
    portal: String(r.nomePortal || '').trim() || null, cadastro: r.dataHora ? dia(r.dataHora) : null,
    pax: base.reduce((t, x) => t + ((Number(x.quantidadeAdulto) || 0) + (Number(x.quantidadeCrianca) || 0)) * (Number(x.qtdeApartamento) || 1), 0),
    noites: base.reduce((t, x) => t + noitesDoItem(x) * (Number(x.qtdeApartamento) || 1), 0), // diárias vendidas (apartamento × noite)
    estadia: base.length ? Math.max(...base.map(noitesDoItem)) : 0, // noites que o hóspede fica
    // Origem: o primeiro hóspede com estado (ou país) na ficha; o titular costuma vir primeiro
    origem: base.flatMap(x => x.listaHospede || []).map(origemHospede).find(Boolean) || null };
}
// Relatório de ocupação do Silbeck (geral): por dia e totais do período
async function ocupacao({ de, ate }, buscar = fetch) {
  const { dados } = await chamar('GET', `/v1/Ocupacao?dataInicial=${de}&dataFinal=${ate}&tipoLista=0`, null, buscar);
  return dados || {};
}
async function listaReservas({ de, ate, tipoData = 'cadastro', idReserva } = {}, buscar = fetch) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(de || '') || !/^\d{4}-\d{2}-\d{2}$/.test(ate || '') || ate < de) throw new ErroSilbeck('período inválido', 400);
  const saida = [];
  for (let ini = de; ini <= ate; ini = somarDias(ini, 31)) {
    const fim = somarDias(ini, 30) < ate ? somarDias(ini, 30) : ate;
    const { dados } = await chamar('GET', `/v1/ListaReserva?dataInicial=${ini}&dataFinal=${fim}&tipoData=${tipoData}${idReserva ? '&idReserva=' + idReserva : ''}`, null, buscar);
    const lista = (dados && (dados.listaReserva || dados)) || [];
    if (Array.isArray(lista)) saida.push(...lista.map(resumoReserva));
  }
  return [...new Map(saida.map(r => [r.silbeck_id, r])).values()];
}
// Diagnóstico de uma reserva (/saude/silbeck-reserva): itens, situação e adiantamentos, sem nomes nem contatos
async function diagnosticoReserva({ id, entrada } = {}, buscar = fetch) {
  if (!/^\d+$/.test(String(id || ''))) throw new ErroSilbeck('informe o número da reserva (id)', 400);
  const itens = await itensDaReserva(id, entrada, buscar);
  return { reserva: String(id), achou: itens.length > 0, itens: itens.map(x => ({ item_id: x.id, codigo: x.codigoTipoApartamento, codigo_crm: x.codigo_crm, status: x.statusDescricao || x.status,
    entrada: x.dataEntrada, saida: x.dataSaida, adiantamentos: (x.listaAdiantamento || []).length,
    valores: { valorTotalDiaria: x.valorTotalDiaria ?? null, listaTotal_diaria: (x.listaTotal || []).map(y => y && y.diaria ? y.diaria.valor : null), listaData_soma: (x.listaData || []).reduce((t, y) => t + (Number(y.valorDiaria) || 0), 0), usado: valorDoItem(x) } })) };
}
module.exports = { ocupacao, somarDias, listaReservas, _resumoReserva: resumoReserva, empresas, diagnosticoReserva, itensDaReserva, definirFontePromocao, promocao, diagnosticoTarifario, diagnosticoTarifa, _paraCRM: paraCRM, _diaISO: diaISO, _categoriasDoGrupo: categoriasDoGrupo, diagnosticoCotacao, registrarFalhaCotacao, diagnostico, diagnosticoCache, segredo, cotar, cotarCombinacao, vagas, reservar, lancarAdiantamento, distribuir, MODO, ErroSilbeck, LIMITE_ACOMODACOES, LIMITE_PESSOAS };
