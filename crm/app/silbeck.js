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
  const cat = t => (categorias.find(c => c.tipo === t) || {}).id;
  const pequenos = idades.filter(x => x <= 4).length, pagantesCriancas = idades.length - pequenos;
  const lista = [{ id: cat(1), quantidade: adultos }];
  if (pagantesCriancas) lista.push({ id: cat(3), quantidade: pagantesCriancas });
  if (pequenos) lista.push({ id: cat(4), quantidade: pequenos });
  if (lista.some(c => c.id == null)) throw new ErroSilbeck('categorias de hóspede não encontradas no Silbeck');
  return { lista, pequenos, pagantesCriancas };
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
  const precos = await emFila(candidatos, t => chamar('POST', '/v1/Tarifario/Valor', { dataEntrada: ini, dataSaida: fim, idTipoApartamento: t.id, listaCategoriaHospede: lista }, buscar));
  const opcoes = [];
  candidatos.forEach((t, i) => {
    const p = precos[i];
    if (!p || p.erro || !Array.isArray(p.dados)) return;
    const diarias = p.dados.reduce((s, d) => s + Number(d.valor || 0), 0);
    const taxas = p.dados.reduce((s, d) => s + Number(d.valorTaxaServico || 0) + Number(d.valorTaxaISS || 0), 0);
    const total = reais(diarias + taxas);
    opcoes.push({ codigo: t.codigo, nome: t.nome, capacidade: t.maximoOcupantes, vagas_no_periodo: vagas[t.codigo],
      valor_total: total, media_por_noite: reais(total / noites), parcela_6x: reais(total / 6), diarias: reais(diarias), taxas: reais(taxas) });
  });
  opcoes.sort((a, b) => a.valor_total - b.valor_total);
  const r = { ok: true, fonte: disp.fonte, periodo: { entrada: ini, saida: fim, noites }, grupo: { adultos, idades_criancas: idades, pagantes: adultos + pagantesCriancas },
    opcoes, esgotados_no_periodo: semVaga, nao_comportam_o_grupo: naoComporta };
  if (!opcoes.length && pessoas > Math.max(0, ...tipos.map(t => t.maximoOcupantes))) r.aviso = 'O grupo não cabe em uma acomodação: a combinação (ex.: 2 acomodações) é montada pela equipe nesta fase.';
  if (disp.fonte === 'simulador') r.atencao = 'VALORES FICTÍCIOS DO SIMULADOR (teste): não são preços reais do hotel.';
  return r;
}

// Vagas por tipo e por dia (painel "Vagas" da conversa). Só leitura.
async function vagas(inicio, dias, buscar = fetch) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio || '')) throw new ErroSilbeck('data inicial inválida', 400);
  const n = Math.min(31, Math.max(1, Number(dias) || 14));
  const [tipos, disp] = await Promise.all([cadastro('/v1/TipoApartamento', 'listaTipoApartamento', buscar),
    chamar('GET', `/v1/Disponibilidade?dataInicial=${inicio}&DataFinal=${somarDias(inicio, n - 1)}&DetalharDiaADia=true`, null, buscar)]);
  const porCod = Object.fromEntries(((disp.dados && disp.dados.listaTipoApto) || []).map(t => [t.codigo, t]));
  return { ok: true, fonte: disp.fonte, inicio, dias: Array.from({ length: n }, (_, i) => somarDias(inicio, i)),
    tipos: tipos.map(t => ({ codigo: t.codigo, nome: t.nome, total: t.quantidade, capacidade: t.maximoOcupantes,
      vagas: Array.from({ length: n }, (_, i) => { const d = somarDias(inicio, i); const x = ((porCod[t.codigo] || {}).listaSituacaoTipoApto || []).find(y => y.data === d); return x ? x.qtdeDisponivel : null; }) })) };
}

// criar_reserva: confere a vaga e o preço de novo (na mesma hora) e cria a reserva NÃO CONFIRMADA no Silbeck.
// O preço vai sempre do Tarifario/Valor (nunca digitado). Se mudou em relação ao orçamento, não cria (o cliente precisa
// de um novo OK). A reserva confirma sozinha quando o adiantamento (pagamento) é lançado (regra da Silbeck, P46).
async function reservar(e, buscar = fetch) {
  const codigo = String(e.codigo || '').toUpperCase(), ini = e.data_entrada, fim = e.data_saida;
  const adultos = Number(e.adultos), idades = (e.idades_criancas || []).map(Number);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ini || '') || !/^\d{4}-\d{2}-\d{2}$/.test(fim || '') || fim <= ini) return { ok: false, erro: 'Datas inválidas.' };
  if (ini < hojeBonito()) return { ok: false, erro: 'A data de entrada já passou.' };
  const titular = String(e.titular || '').trim();
  if (titular.split(/\s+/).length < 2) return { ok: false, erro: 'Falta o nome completo do titular.' };
  const [tipos, categorias] = await Promise.all([cadastro('/v1/TipoApartamento', 'listaTipoApartamento', buscar), cadastro('/v1/CategoriaHospede', 'listaCategoriaHospede', buscar)]);
  const tipo = tipos.find(t => t.codigo === codigo);
  if (!tipo) return { ok: false, erro: 'Acomodação ' + codigo + ' não encontrada no Silbeck.' };
  if (adultos + idades.length > tipo.maximoOcupantes) return { ok: false, erro: tipo.nome + ' não comporta o grupo.' };
  const { lista } = categoriasDoGrupo(categorias, adultos, idades);
  const disp = await chamar('GET', `/v1/Disponibilidade?dataInicial=${ini}&DataFinal=${somarDias(fim, -1)}&DetalharDiaADia=true`, null, buscar);
  const t = ((disp.dados && disp.dados.listaTipoApto) || []).find(x => x.codigo === codigo);
  const vagas = t && (t.listaSituacaoTipoApto || []).length ? Math.min(...t.listaSituacaoTipoApto.map(d => d.qtdeDisponivel)) : 0;
  if (!(vagas > 0)) return { ok: false, sem_vaga: true, erro: tipo.nome + ' não tem mais vaga nessas datas.' };
  const preco = await chamar('POST', '/v1/Tarifario/Valor', { dataEntrada: ini, dataSaida: fim, idTipoApartamento: tipo.id, listaCategoriaHospede: lista }, buscar);
  const dias = Array.isArray(preco.dados) ? preco.dados : [];
  if (!dias.length) return { ok: false, erro: 'O Silbeck não devolveu a tarifa.' };
  const diarias = reais(dias.reduce((s, d) => s + Number(d.valor || 0), 0));
  const total = reais(diarias + dias.reduce((s, d) => s + Number(d.valorTaxaServico || 0) + Number(d.valorTaxaISS || 0), 0));
  if (e.valor_esperado != null && Math.abs(total - Number(e.valor_esperado)) > 0.5) return { ok: false, preco_mudou: true, valor_novo: total, erro: 'O valor mudou desde o orçamento.' };
  const hospedes = [{ nome: titular, adulto: true }, ...(e.acompanhantes || []).map(String).filter(Boolean).slice(0, 10).map((n, i) => ({ nome: n, adulto: i < adultos - 1 }))];
  const corpo = {
    titular, email: e.email || undefined, telefone: e.telefone || undefined,
    observacao: ('Reserva feita pelo CRM (WhatsApp)' + (e.observacao ? '. ' + e.observacao : '')).slice(0, 250),
    listaReservaItem: [{ idTipoApartamento: tipo.id, quantidadeAdulto: adultos, quantidadeCrianca: idades.length, dataEntrada: ini, dataSaida: fim, qtdeApartamento: 1,
      valorTotalDiaria: diarias, listaHospede: hospedes,
      listaData: dias.map(d => ({ data: d.data, valorDiaria: Number(d.valor), ...(d.idTarifario != null ? { idTarifario: d.idTarifario } : {}), ...(d.idTipoPensao != null ? { idTipoPensao: d.idTipoPensao } : {}) })) }],
  };
  const r = await chamar('POST', '/v1/reserva', corpo, buscar);
  const id = r.dados && r.dados.id;
  if (!id) throw new ErroSilbeck('o Silbeck não devolveu o número da reserva');
  // O item da reserva (idConta) é o que recebe o pagamento depois
  const hoje = hojeBonito();
  const lr = await chamar('GET', `/v1/ListaReserva?dataInicial=${hoje}&dataFinal=${hoje}&tipoData=cadastro&idReserva=${id}`, null, buscar).catch(() => null);
  const res = ((lr && lr.dados && (lr.dados.listaReserva || lr.dados)) || []);
  const item = ((Array.isArray(res) ? res : []).find(x => String(x.id) === String(id)) || {}).listaReservaItem;
  return { ok: true, fonte: r.fonte, reserva_id: String(id), item_id: item && item[0] ? String(item[0].id) : null, acomodacao: tipo.nome, codigo, valor_total: total };
}
// Pagamento recebido: lança o adiantamento no item da reserva (Pix = tipo 8). A reserva confirma sozinha.
async function lancarAdiantamento({ item_id, valor, observacao }, buscar = fetch) {
  const r = await chamar('POST', '/v1/Adiantamento', { valor: reais(Number(valor)), idConta: Number(item_id), tipoFormaPagamento: 8, observacao: String(observacao || '').slice(0, 200) }, buscar);
  return { ok: true, id: r.dados && r.dados.id, confirmado: !!(r.dados && r.dados.confirmado), fonte: r.fonte };
}

module.exports = { diagnostico, diagnosticoCache, segredo, cotar, vagas, reservar, lancarAdiantamento, MODO, ErroSilbeck };
