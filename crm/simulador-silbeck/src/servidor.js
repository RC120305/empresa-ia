'use strict';
// Servidor HTTP do simulador (http nativo do Node, sem dependências).
// Caminhos da API: /datasnap/rest/v1/... (como no real). Também aceita /v1/... sem o prefixo.
// Rotas de administração (imitam a equipe mexendo no Silbeck e injetam falhas): /_sim/...

const http = require('http');
const U = require('./util');

const PREFIXO = '/datasnap/rest';

// --------------------------------------------------------------------- contexto de requisição
function criarContexto(sim, req, url, corpoTexto) {
  const avisos = [];
  const params = url.searchParams;
  const ctx = {
    sim, req, url, avisos,
    corpoTexto,
    // Lê parâmetro de query sem diferenciar maiúsculas (o DataSnap real costuma aceitar);
    // se a grafia não for a do swagger, registra um aviso no cabeçalho X-Sim-Avisos.
    q(nome) {
      if (params.has(nome)) return params.get(nome);
      for (const [k, v] of params) {
        if (k.toLowerCase() === nome.toLowerCase()) {
          avisos.push(`parâmetro '${k}' com grafia diferente do swagger ('${nome}')`);
          return v;
        }
      }
      return null;
    },
    data(nome, obrigatorio = true) {
      const v = ctx.q(nome);
      if (v == null || v === '') {
        if (obrigatorio) throw U.erro400('PARAMETRO_OBRIGATORIO', `Parâmetro '${nome}' é obrigatório (yyyy-mm-dd).`, nome);
        return null;
      }
      if (!U.dataValida(v)) throw U.erro400('DATA_INVALIDA', `Parâmetro '${nome}' deve estar no formato yyyy-mm-dd.`, nome);
      return v;
    },
    bool(nome, padrao = null) {
      const v = ctx.q(nome);
      if (v == null || v === '') return padrao;
      if (/^true$/i.test(v)) return true;
      if (/^false$/i.test(v)) return false;
      throw U.erro400('PARAMETRO_INVALIDO', `Parâmetro '${nome}' deve ser true ou false.`, nome);
    },
    int(nome) {
      const v = ctx.q(nome);
      if (v == null || v === '') return null;
      if (!/^-?\d+$/.test(v)) throw U.erro400('PARAMETRO_INVALIDO', `Parâmetro '${nome}' deve ser inteiro.`, nome);
      return Number(v);
    },
    json() {
      if (!corpoTexto) throw U.erro400('CORPO_OBRIGATORIO', 'Corpo JSON obrigatório.', '');
      try {
        return JSON.parse(corpoTexto);
      } catch (e) {
        throw U.erro400('JSON_INVALIDO', `JSON inválido: ${e.message}`, '');
      }
    },
  };
  return ctx;
}

function periodo(ctx, nIni = 'dataInicial', nFim = 'dataFinal') {
  const ini = ctx.data(nIni);
  const fim = ctx.data(nFim);
  if (fim < ini) throw U.erro400('PERIODO_INVALIDO', `${nFim} deve ser maior ou igual a ${nIni}.`, nFim);
  if (U.diasEntre(ini, fim) > 366) throw U.erro400('PERIODO_INVALIDO', 'Período máximo do simulador: 366 dias.', nFim);
  return [ini, fim];
}

// --------------------------------------------------------------------- rotas da API (swagger)
const API = [
  ['POST', '/v1/Liberar', false, (ctx) => {
    let id = ctx.q('client_id');
    let secret = ctx.q('client_secret');
    if ((!id || !secret) && ctx.corpoTexto && /x-www-form-urlencoded/i.test(ctx.req.headers['content-type'] || '')) {
      const f = new URLSearchParams(ctx.corpoTexto);
      id = id || f.get('client_id'); secret = secret || f.get('client_secret');
      ctx.avisos.push('credenciais lidas do corpo x-www-form-urlencoded (a Silbeck confirmou: no real vão na URL)');
    }
    const auth = ctx.req.headers.authorization || '';
    if ((!id || !secret) && /^Basic\s+/i.test(auth)) {
      const [u, p] = Buffer.from(auth.replace(/^Basic\s+/i, ''), 'base64').toString().split(':');
      id = id || u; secret = secret || p;
      ctx.avisos.push('credenciais lidas da autenticação Basic (a Silbeck confirmou: no real vão na URL)');
    }
    if (!id || !secret) throw U.erro400('CREDENCIAIS_OBRIGATORIAS', 'Informe client_id e client_secret.', !id ? 'client_id' : 'client_secret');
    return ctx.sim.emitirToken();
  }],

  ['GET', '/v1/Ocupacao', true, (ctx) => {
    const [ini, fim] = periodo(ctx);
    const tipoLista = ctx.int('tipoLista');
    if (tipoLista != null && (tipoLista < 0 || tipoLista > 14)) throw U.erro400('PARAMETRO_INVALIDO', 'tipoLista deve ser de 0 a 14.', 'tipoLista');
    if (tipoLista) ctx.avisos.push(`tipoLista=${tipoLista} não é agrupado pelo simulador; devolvido o geral (0)`);
    const ignorados = ['cidadeOrigemHospede', 'listaUFOrigemHospede', 'codigoEmpresa', 'codigoPortal', 'codigoTipoApartamento', 'codigoFaturamento']
      .filter((p) => ctx.q(p) != null);
    if (ignorados.length) ctx.avisos.push(`filtros ignorados pelo simulador: ${ignorados.join(', ')}`);
    return ctx.sim.ocupacao({ dataInicial: ini, dataFinal: fim, somenteReservaConfirmada: ctx.bool('somenteReservaConfirmada', false) });
  }],

  ['GET', '/v1/Disponibilidade', true, (ctx) => {
    const [ini, fim] = periodo(ctx, 'dataInicial', 'DataFinal');
    return ctx.sim.disponibilidade(ini, fim, ctx.bool('DetalharDiaADia', true));
  }],

  ['POST', '/v1/Tarifario/Valor', true, (ctx) => ctx.sim.tarifarioValor(ctx.json())],

  ['GET', '/v1/ListaEstadia', true, (ctx) => {
    const [ini, fim] = periodo(ctx);
    const tipoData = ctx.q('tipoData') || 'entrada';
    if (!['entrada', 'ocupacao', 'saida'].includes(tipoData)) throw U.erro400('PARAMETRO_INVALIDO', 'tipoData deve ser entrada, ocupacao ou saida.', 'tipoData');
    return ctx.sim.listaEstadia({ dataInicial: ini, dataFinal: fim, tipoData, fechado: ctx.bool('fechado', null) });
  }],

  ['GET', '/v1/ListaReserva', true, (ctx) => {
    const [ini, fim] = periodo(ctx);
    const tipoData = ctx.q('tipoData') || 'entrada';
    if (!['cadastro', 'efetivacao', 'entrada', 'ocupacao', 'saida'].includes(tipoData)) {
      throw U.erro400('PARAMETRO_INVALIDO', 'tipoData deve ser cadastro, efetivacao, entrada, ocupacao ou saida.', 'tipoData');
    }
    const status = ctx.int('status');
    if (status != null && (status < 0 || status > 5)) throw U.erro400('PARAMETRO_INVALIDO', 'status deve ser de 0 a 5.', 'status');
    return ctx.sim.listaReserva({ dataInicial: ini, dataFinal: fim, tipoData, idReserva: ctx.int('idReserva'), status, ativo: ctx.bool('ativo', null) });
  }],

  ['GET', '/v1/Lancamento', true, (ctx) => {
    const [ini, fim] = periodo(ctx);
    const sim = ctx.sim;
    const f = { idSetor: ctx.int('idSetor'), codigoSetor: ctx.q('codigoSetor'), idProduto: ctx.int('idProduto'), codigoProduto: ctx.q('codigoProduto') };
    const inativos = ctx.bool('incluirInativos', false);
    if (ctx.q('padraoRds') != null) ctx.avisos.push('padraoRds ignorado pelo simulador');
    const lista = sim.estado.lancamentos.filter((l) => {
      const d = l.dataHora.slice(0, 10);
      const prod = sim.cat.produtos.find((p) => p.id === l.idProduto) || {};
      const set = sim.cat.setores.find((s) => s.id === l.idSetor) || {};
      return d >= ini && d <= fim && (inativos || l.ativo)
        && (f.idSetor == null || l.idSetor === f.idSetor) && (!f.codigoSetor || set.codigo === f.codigoSetor)
        && (f.idProduto == null || l.idProduto === f.idProduto) && (!f.codigoProduto || prod.codigo === f.codigoProduto);
    }).map((l) => {
      const prod = sim.cat.produtos.find((p) => p.id === l.idProduto) || {};
      const set = sim.cat.setores.find((s) => s.id === l.idSetor) || {};
      return {
        id: l.id, dataHora: l.dataHora, idProduto: l.idProduto, codigoProduto: prod.codigo, nomeProduto: prod.nome,
        idSetor: l.idSetor, codigoSetor: set.codigo, nomeSetor: set.nome, quantidade: l.quantidade, valorUnitario: l.valorUnitario,
        ativo: l.ativo, dataHoraEstorno: l.dataHoraEstorno || '', nomeUsuario: l.nomeUsuario, idUsuario: l.idUsuario,
      };
    });
    return { ListaProduto: lista };
  }],

  ['GET', '/v1/Apartamento', true, (ctx) => ({
    listaApartamento: ctx.sim.cat.apartamentos.map((a) => ({ id: a.id, codigo: a.codigo, codigoTipoApartamento: ctx.sim.tipoPorId(a.idTipo).codigo })),
  })],

  ['PUT', '/v1/Apartamento/Limpeza', true, (ctx) => {
    const b = ctx.json();
    const apto = b && ctx.sim.aptoPorCodigo(b.codigo);
    if (!apto) throw U.erro400('APARTAMENTO_INVALIDO', `Apartamento ${b && b.codigo} não encontrado.`, 'codigo');
    if (typeof b.limpeza !== 'boolean') throw U.erro400('PARAMETRO_INVALIDO', 'limpeza deve ser true ou false.', 'limpeza');
    ctx.sim.estado.limpeza[apto.codigo] = b.limpeza ? 1 : 0;
    return {};
  }],

  ['GET', '/v1/TipoApartamento', true, (ctx) => ({
    listaTipoApartamento: ctx.sim.cat.tiposApartamento.map(({ id, codigo, nome, quantidade, maximoOcupantes }) => ({ id, codigo, nome, quantidade, maximoOcupantes })),
  })],
  ['GET', '/v1/Produto', true, (ctx) => ({ listaProduto: ctx.sim.cat.produtos.map(({ id, codigo, nome }) => ({ id, codigo, nome })) })],
  ['GET', '/v1/Insumo', true, (ctx) => ({ listaInsumo: ctx.sim.cat.insumos.map(({ id, codigo, nome }) => ({ id, codigo, nome })) })],
  ['GET', '/v1/Setor', true, (ctx) => ({ listaSetor: ctx.sim.cat.setores.map(({ id, codigo, nome }) => ({ id, codigo, nome })) })],
  ['GET', '/v1/TipoPensao', true, (ctx) => ({ listaTipoPensao: ctx.sim.cat.tiposPensao.map(({ id, codigo, nome }) => ({ id, codigo, nome })) })],
  ['GET', '/v1/CategoriaHospede', true, (ctx) => ({ listaCategoriaHospede: ctx.sim.cat.categoriasHospede.map(({ id, nome, tipo }) => ({ id, nome, tipo })) })],
  ['GET', '/v1/Cidade', true, (ctx) => ({ listaCidade: ctx.sim.cat.cidades.map(({ id, nome, estado }) => ({ id, nome, estado })) })],
  ['GET', '/v1/Profissao', true, (ctx) => ({ listaProfissao: ctx.sim.cat.profissoes.map(({ id, nome }) => ({ id, nome })) })],

  ['GET', '/v1/Empresa', true, (ctx) => ({ listaEmpresa: ctx.sim.paginar(ctx.sim.estado.empresas, ctx.int('pagina')).map((p) => ctx.sim.pessoa(p, 'J')) })],
  ['GET', '/v1/Fornecedor', true, (ctx) => ({ listaFornecedor: ctx.sim.paginar(ctx.sim.estado.fornecedores, ctx.int('pagina')).map((p) => ctx.sim.pessoa(p, 'J')) })],
  ['GET', '/v1/Hospede', true, (ctx) => ({ listaHospede: ctx.sim.paginar(ctx.sim.estado.hospedes, ctx.int('pagina')).map((p) => ctx.sim.pessoa(p, 'F')) })],

  ['POST', '/v1/Tarifario', true, (ctx) => {
    const sim = ctx.sim;
    if (!sim.estado.config.permitirPostTarifario) {
      throw U.erro(403, 'SEM_PERMISSAO', 'Usuário sem permissão para alterar o tarifário (o CRM não deve usar este endpoint).', '');
    }
    const b = ctx.json();
    if (!U.dataValida(b.dataInicial) || !U.dataValida(b.dataFinal)) throw U.erro400('DATA_INVALIDA', 'dataInicial/dataFinal yyyy-mm-dd.', 'dataInicial');
    if (!sim.tarifario(b.idTarifario)) throw U.erro400('TARIFARIO_INVALIDO', 'idTarifario não encontrado.', 'idTarifario');
    let n = 0;
    for (const p of b.pensoes || []) {
      if (!sim.pensao(p.idTipoPensao)) throw U.erro400('TIPO_PENSAO_INVALIDO', `Pensão ${p.idTipoPensao} não encontrada.`, 'pensoes.idTipoPensao');
      for (const v of p.valores || []) {
        if (!sim.tipoPorId(v.idTipoApartamento)) throw U.erro400('TIPO_APARTAMENTO_INVALIDO', `Tipo ${v.idTipoApartamento} não encontrado.`, 'pensoes.valores.idTipoApartamento');
        sim.estado.tarifas.overrides.push({ dataInicial: b.dataInicial, dataFinal: b.dataFinal, idTarifario: Number(b.idTarifario), idTipoPensao: Number(p.idTipoPensao), idTipoApartamento: Number(v.idTipoApartamento), idCategoriaHospede: v.idCategoriaHospede, quantidade: Number(v.quantidade), valor: Number(v.valor) });
        n++;
      }
    }
    ctx.avisos.push(`${n} valores de tarifário gravados no simulador`);
    return {};
  }],

  ['POST', '/v1/FichaHospede', true, (ctx) => {
    const r = ctx.sim.fichaHospede(ctx.json());
    ctx.avisos.push(...r.avisos);
    return {};
  }],

  ['GET', '/v1/ExtratoConta', true, (ctx) => {
    const sim = ctx.sim;
    const codigo = ctx.q('codigoApartamento');
    const outros = ['codigoFuncionario', 'codigoAvulsa', 'codigoEmpresa'].filter((p) => ctx.q(p));
    if (!codigo && !outros.length) throw U.erro400('PARAMETRO_OBRIGATORIO', 'Informe codigoApartamento, codigoFuncionario, codigoAvulsa ou codigoEmpresa.', 'codigoApartamento');
    if (!codigo) { ctx.avisos.push('simulador só tem extrato por codigoApartamento; devolvendo vazio'); return { listaSetor: [], listaTotal: [] }; }
    if (!sim.aptoPorCodigo(codigo)) throw U.erro400('APARTAMENTO_INVALIDO', `Apartamento ${codigo} não encontrado.`, 'codigoApartamento');
    const apto = sim.aptoPorCodigo(codigo);
    const est = sim.estado.estadias.find((e) => e.idApartamento === apto.id && e.fechado === 0);
    const [, itEst] = est ? sim.acharItem(est.idReservaItem) : [null, null];
    // Diárias já geradas (noites anteriores a hoje) entram como lançamentos do setor Recepção.
    const diarias = itEst ? itEst.listaData.filter((d) => d.data < sim.hoje()).map((d) => ({
      id: `D${d.data}`, dataHora: `${d.data} 23:59:00`, codigoApartamento: codigo, idProduto: 1000, idSetor: 1, quantidade: 1,
      valorUnitario: d.valorDiaria, ativo: true, nomeUsuario: 'AUDITORIA.NOTURNA', idUsuario: 1,
    })) : [];
    const lancs = diarias.concat(sim.estado.lancamentos.filter((l) => l.codigoApartamento === codigo));
    const setores = [...new Set(lancs.map((l) => l.idSetor))].map((idSetor) => {
      const set = sim.cat.setores.find((s) => s.id === idSetor) || {};
      const ls = lancs.filter((l) => l.idSetor === idSetor).map((l, i) => {
        const prod = sim.cat.produtos.find((p) => p.id === l.idProduto) || {};
        return {
          id: i + 1 + idSetor * 1000, idProduto: l.idProduto, codigoProduto: prod.codigo, nomeProduto: prod.nome, dataHora: l.dataHora,
          quantidade: l.quantidade, valorUnitario: l.valorUnitario, valorTotal: U.r2(l.quantidade * l.valorUnitario), ativo: l.ativo,
          faturado: false, nomeUsuario: l.nomeUsuario, idUsuario: l.idUsuario,
        };
      });
      return { id: idSetor, nome: set.nome, idMoeda: 1, simboloMoeda: 'R$', valorTotal: U.r2(ls.filter((x) => x.ativo).reduce((s, x) => s + x.valorTotal, 0)), listaLancamento: ls };
    });
    const total = U.r2(setores.reduce((s, x) => s + x.valorTotal, 0));
    const adiant = itEst ? U.r2(itEst.listaAdiantamento.filter((a) => a.situacao === 'Ativo').reduce((s, a) => s + a.valor, 0)) : 0;
    const iss = U.r2((total * sim.estado.config.taxaISSPercentual) / 100);
    return {
      listaSetor: setores,
      listaTotal: [{ idMoeda: 1, simboloMoeda: 'R$', faturado: false, valorTotal: total, valorDesconto: 0, valorTaxaServico: 0, valorTaxaISS: iss, valorAdiantamento: adiant, valorAberto: U.r2(total + iss - adiant) }],
    };
  }],

  ['GET', '/v1/MapaApartamento', true, (ctx) => ctx.sim.mapaApartamento()],

  ['POST', '/v1/reserva', true, (ctx) => {
    const b = ctx.json();
    const sim = ctx.sim;
    const f = sim.falhas.findIndex((x) => x.tipo === 'sem_vaga');
    if (f >= 0) {
      const falha = sim.falhas[f];
      if (--falha.vezes <= 0) sim.falhas.splice(f, 1);
      const ids = sim.ocuparVagasRestantes(b);
      ctx.avisos.push(`falha 'sem_vaga': outro canal ocupou as vagas restantes (reservas ${ids.join(', ') || 'nenhuma'})`);
    }
    const r = sim.criarReserva(b, { origem: 'api', nomeUsuario: 'API' });
    ctx.avisos.push(...r._avisos);
    return { id: String(r.id) };
  }],

  ['POST', '/v1/reserva/checkin', true, (ctx) => {
    ctx.sim.checkin(ctx.json());
    return {};
  }],

  ['POST', '/v1/Fechadura/Senha', true, (ctx) => {
    const b = ctx.json();
    if (!b || !ctx.sim.acharReserva(b.idReserva)) throw U.erro(404, 'RESERVA_NAO_ENCONTRADA', 'Reserva não encontrada.', 'idReserva');
    if (!b.senha || !/^\d{4,8}$/.test(String(b.senha))) throw U.erro400('SENHA_INVALIDA', 'Senha deve ter de 4 a 8 dígitos (regra do simulador).', 'senha');
    ctx.sim.estado.fechaduras.push({ tipo: 'senha', idReserva: Number(b.idReserva), senha: '****', quando: ctx.sim.agora() });
    return {};
  }],

  ['POST', '/v1/Fechadura/Checkin', true, (ctx) => {
    const b = ctx.json();
    if (!b || !ctx.sim.acharReserva(b.idReserva)) throw U.erro(404, 'RESERVA_NAO_ENCONTRADA', 'Reserva não encontrada.', 'idReserva');
    if (b.dataHora && !U.dataHoraValida(b.dataHora)) throw U.erro400('DATA_INVALIDA', 'dataHora no formato yyyy-mm-dd hh:mm:ss.', 'dataHora');
    ctx.sim.estado.fechaduras.push({ tipo: 'checkin', idReserva: Number(b.idReserva), dataHora: b.dataHora || ctx.sim.agora(), quando: ctx.sim.agora() });
    return {};
  }],

  ['POST', '/v1/Adiantamento', true, (ctx) => ctx.sim.lancarAdiantamento(ctx.json())],
];

// --------------------------------------------------------------------- rotas /_sim (administração)
const ADMIN = [
  ['GET', '/_sim', (ctx) => ({
    simulador: 'Simulador da API Hotel v1 da Silbeck (FICTÍCIO)',
    agora: ctx.sim.agora(),
    rotas: ADMIN.map(([m, p]) => `${m} ${p}`),
    falhasArmadas: ctx.sim.falhas,
    tokensAtivos: ctx.sim.tokens.size,
    arquivoEstado: ctx.sim.arquivoEstado,
  })],
  ['GET', '/_sim/estado', (ctx) => ctx.sim.estado],
  ['GET', '/_sim/log', (ctx) => ({ log: ctx.sim.log.slice(-(ctx.int('n') || 100)) })],
  ['POST', '/_sim/reset', (ctx) => { const b = ctx.corpoTexto ? ctx.json() : {}; ctx.sim.resetar({ vazio: !!b.vazio }); return { ok: true, reservas: ctx.sim.estado.reservas.length }; }],
  ['POST', '/_sim/salvar', (ctx) => {
    const b = ctx.corpoTexto ? ctx.json() : {};
    const arq = b.arquivo || ctx.sim.arquivoEstado;
    if (!arq) throw U.erro400('ARQUIVO_OBRIGATORIO', 'Informe {"arquivo": "caminho.json"} ou suba o simulador com SIM_ESTADO.', 'arquivo');
    return { ok: true, arquivo: ctx.sim.salvar(arq) };
  }],
  ['POST', '/_sim/carregar', (ctx) => { const b = ctx.json(); ctx.sim.carregar(b.arquivo); return { ok: true, reservas: ctx.sim.estado.reservas.length }; }],
  ['POST', '/_sim/config', (ctx) => {
    const b = ctx.json();
    const permitidos = Object.keys(ctx.sim.estado.config);
    for (const k of Object.keys(b)) {
      if (!permitidos.includes(k)) throw U.erro400('CONFIG_INVALIDA', `Chave '${k}' não existe. Use: ${permitidos.join(', ')}.`, k);
      ctx.sim.estado.config[k] = b[k];
    }
    return ctx.sim.estado.config;
  }],
  ['POST', '/_sim/relogio', (ctx) => {
    const b = ctx.json();
    const sim = ctx.sim;
    if (b.avancarSegundos != null) sim.estado.relogioOffsetMs += Number(b.avancarSegundos) * 1000;
    else if (b.agora) {
      const alvo = Date.parse(b.agora.replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(b.agora) ? '' : '-04:00'));
      if (isNaN(alvo)) throw U.erro400('DATA_INVALIDA', 'agora deve ser yyyy-mm-dd hh:mm:ss (horário de Bonito).', 'agora');
      sim.estado.relogioOffsetMs = alvo - Date.now();
    } else if (b.real) sim.estado.relogioOffsetMs = 0;
    return { agora: sim.agora() };
  }],
  ['POST', '/_sim/falha', (ctx) => {
    const b = ctx.json();
    const tipos = ['timeout', 'erro500', 'queda', 'lento', 'token_expirado', 'sem_vaga'];
    if (!tipos.includes(b.tipo)) throw U.erro400('FALHA_INVALIDA', `tipo deve ser: ${tipos.join(', ')}.`, 'tipo');
    if (b.tipo === 'token_expirado') return { ok: true, tokensExpirados: ctx.sim.expirarTodosTokens() };
    const f = { tipo: b.tipo, rota: b.rota || null, metodo: b.metodo ? String(b.metodo).toUpperCase() : null, vezes: b.vezes || 1, atrasoMs: b.atrasoMs, gravar: !!b.gravar };
    ctx.sim.falhas.push(f);
    return { ok: true, falha: f };
  }],
  ['DELETE', '/_sim/falha', (ctx) => { ctx.sim.falhas = []; return { ok: true }; }],
  ['POST', '/_sim/cancelar', (ctx) => { const r = ctx.sim.cancelar(ctx.json()); return ctx.sim.reservaParaSaida(r, r.itens); }],
  ['POST', '/_sim/alterar', (ctx) => { const r = ctx.sim.alterar(ctx.json()); return ctx.sim.reservaParaSaida(r, r.itens); }],
  ['POST', '/_sim/noshow', (ctx) => { const b = ctx.json(); const r = ctx.sim.alterar({ idReservaItem: b.idReservaItem, status: 5 }); return ctx.sim.reservaParaSaida(r, r.itens); }],
  ['POST', '/_sim/adiantamento-situacao', (ctx) => { const a = ctx.sim.alterarAdiantamento(ctx.json()); const { _cartao, _tipoFormaPagamento, ...out } = a; return out; }],
  ['POST', '/_sim/reserva-manual', (ctx) => {
    const b = ctx.json();
    const { nomeUsuario, idNoPortal, status, ignorarDisponibilidade, ...corpo } = b;
    const r = ctx.sim.criarReserva(corpo, { origem: 'equipe', nomeUsuario: nomeUsuario || 'RECEPCAO.SIMULADA', idNoPortal, status: status != null ? Number(status) : 1, ignorarDisponibilidade: !!ignorarDisponibilidade });
    return ctx.sim.reservaParaSaida(r, r.itens);
  }],
  ['POST', '/_sim/checkout', (ctx) => ctx.sim.checkout(ctx.json())],
  ['POST', '/_sim/manutencao', (ctx) => ctx.sim.criarManutencao(ctx.json())],
  ['POST', '/_sim/manutencao/liberar', (ctx) => {
    const b = ctx.json();
    const m = ctx.sim.estado.manutencoes.find((x) => x.id === Number(b.id));
    if (!m) throw U.erro(404, 'MANUTENCAO_NAO_ENCONTRADA', 'Manutenção não encontrada.', 'id');
    m.situacao = 1;
    return m;
  }],
  ['POST', '/_sim/empresa', (ctx) => {
    const b = ctx.json();
    if (!b.nome || !b.codigo) throw U.erro400('CAMPOS_OBRIGATORIOS', 'Informe codigo e nome.', 'codigo');
    if (ctx.sim.empresaPorCodigo(b.codigo)) throw U.erro400('EMPRESA_DUPLICADA', 'Código já usado.', 'codigo');
    const e = { id: ++ctx.sim.estado.seq.empresa, percentualComissao: 10, pais: 'BRASIL', ...b, codigo: String(b.codigo) };
    ctx.sim.estado.empresas.push(e);
    return e;
  }],
  ['POST', '/_sim/lancamento', (ctx) => {
    const b = ctx.json();
    if (!ctx.sim.aptoPorCodigo(b.codigoApartamento)) throw U.erro400('APARTAMENTO_INVALIDO', 'codigoApartamento inválido.', 'codigoApartamento');
    const l = { id: `L${ctx.sim.estado.lancamentos.length + 1}`, dataHora: ctx.sim.agora(), ativo: true, dataHoraEstorno: '', nomeUsuario: 'RECEPCAO.SIMULADA', idUsuario: 30, quantidade: 1, ...b };
    ctx.sim.estado.lancamentos.push(l);
    return l;
  }],
];

// --------------------------------------------------------------------- servidor
function acharRota(lista, metodo, caminho, avisos) {
  const exata = lista.find((r) => r[0] === metodo && r[1] === caminho);
  if (exata) return exata;
  const ci = lista.find((r) => r[0] === metodo && r[1].toLowerCase() === caminho.toLowerCase());
  if (ci) { avisos.push(`caminho '${caminho}' com grafia diferente do swagger ('${ci[1]}')`); return ci; }
  return null;
}

function mascarar(texto) {
  if (!texto) return texto;
  return texto.slice(0, 2000).replace(/("client_secret"\s*:\s*")[^"]*/g, '$1***').replace(/(client_secret=)[^&]*/g, '$1***');
}

function criarServidor(sim, opts = {}) {
  const log = opts.log || (() => {});
  const servidor = http.createServer((req, res) => {
    const inicio = Date.now();
    const pedacos = [];
    req.on('data', (c) => pedacos.push(c));
    req.on('end', async () => {
      const corpoTexto = Buffer.concat(pedacos).toString('utf8');
      const url = new URL(req.url, 'http://simulador');
      let caminho = url.pathname.replace(/\/+$/, '') || '/';
      const ctx = criarContexto(sim, req, url, corpoTexto);
      let status = 200;
      let corpo;
      const registrar = () => {
        const entrada = { quando: sim.agora(), metodo: req.method, caminho: url.pathname + mascarar(url.search), status, ms: Date.now() - inicio, avisos: ctx.avisos, corpo: req.method !== 'GET' ? mascarar(corpoTexto) : undefined };
        sim.log.push(entrada);
        if (sim.log.length > 500) sim.log.shift();
        log(`${req.method} ${url.pathname} -> ${status} (${entrada.ms} ms)${ctx.avisos.length ? ' avisos: ' + ctx.avisos.join(' | ') : ''}`);
      };
      const responder = () => {
        const txt = corpo === undefined ? '' : JSON.stringify(corpo);
        const cab = { 'Content-Type': 'application/json; charset=utf-8', 'X-Simulador': 'silbeck-sim (FICTICIO)' };
        if (ctx.avisos.length) cab['X-Sim-Avisos'] = encodeURIComponent(ctx.avisos.join(' | '));
        res.writeHead(status, cab);
        res.end(txt);
      };
      try {
        if (caminho === '/_sim' || caminho.startsWith('/_sim/')) {
          const rota = acharRota(ADMIN, req.method, caminho, ctx.avisos);
          if (!rota) throw U.erro(404, 'ROTA_NAO_ENCONTRADA', `Rota de administração ${req.method} ${caminho} não existe. Veja GET /_sim.`, '');
          corpo = await rota[2](ctx);
          if (req.method !== 'GET') sim.salvarSeConfigurado();
        } else {
          if (caminho.toLowerCase().startsWith(PREFIXO.toLowerCase())) caminho = caminho.slice(PREFIXO.length);
          else if (caminho.toLowerCase().startsWith('/v1/')) ctx.avisos.push(`sem o prefixo ${PREFIXO}: no real use ${PREFIXO}${caminho}`);
          const rota = acharRota(API, req.method, caminho, ctx.avisos);
          if (!rota) {
            const outroMetodo = API.find((r) => r[1].toLowerCase() === caminho.toLowerCase());
            if (outroMetodo) throw U.erro(405, 'METODO_NAO_PERMITIDO', `Método ${req.method} não disponível para ${outroMetodo[1]} (use ${outroMetodo[0]}).`, '');
            throw U.erro(404, 'ROTA_NAO_ENCONTRADA', `Recurso ${req.method} ${caminho} não existe na API Hotel v1.`, '');
          }
          // Falhas injetadas (timeout, 500, queda, lento) que casam com esta rota.
          const i = sim.falhas.findIndex((f) => f.tipo !== 'sem_vaga' && (!f.rota || f.rota.toLowerCase() === rota[1].toLowerCase()) && (!f.metodo || f.metodo === req.method));
          let falha = null;
          if (i >= 0) {
            falha = sim.falhas[i];
            if (--falha.vezes <= 0) sim.falhas.splice(i, 1);
            ctx.avisos.push(`falha injetada: ${falha.tipo}`);
          }
          if (falha && falha.tipo === 'queda') { status = 0; registrar(); req.socket.destroy(); return; }
          if (falha && falha.tipo === 'erro500') {
            status = 500; corpo = { error: 'Erro interno simulado: Access violation at address 00000000 (falha injetada pelo /_sim/falha)' };
            registrar(); return responder();
          }
          if (falha && falha.tipo === 'lento') await new Promise((r) => setTimeout(r, falha.atrasoMs || 5000));
          if (falha && falha.tipo === 'timeout') {
            // Opcionalmente grava antes de "sumir" (o CRM precisa lidar com reserva duplicada ao repetir).
            if (falha.gravar) {
              try {
                if (rota[2]) sim.validarToken(req.headers.authorization);
                await rota[3](ctx);
                ctx.avisos.push('requisição PROCESSADA antes do timeout (gravar:true)');
                sim.salvarSeConfigurado();
              } catch (e) { ctx.avisos.push(`requisição falhou antes do timeout: ${e.message}`); }
            }
            status = 0; registrar();
            setTimeout(() => req.socket.destroy(), falha.atrasoMs || 60000);
            return;
          }
          if (rota[2]) sim.validarToken(req.headers.authorization);
          corpo = await rota[3](ctx);
          if (req.method !== 'GET') sim.salvarSeConfigurado();
        }
      } catch (e) {
        if (e instanceof U.ErroApi) { status = e.status; corpo = e.corpo; } else {
          status = 500; corpo = { error: `Erro interno do simulador: ${e.message}` };
          log(e.stack);
        }
      }
      registrar();
      responder();
    });
  });
  return servidor;
}

module.exports = { criarServidor, API, ADMIN, PREFIXO };
