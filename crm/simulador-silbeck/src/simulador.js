'use strict';
// Núcleo do simulador: estado em memória (com opção de salvar em JSON) e as regras de negócio
// imitando o SB Hotel (Silbeck). Tudo aqui é FICTÍCIO.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const U = require('./util');

const STATUS_DESC = {
  0: 'Em andamento', 1: 'Não confirmada', 2: 'Confirmada', 3: 'Cancelada', 4: 'Check-in efetuado', 5: 'No-show',
};
const STATUS_OCUPA = new Set([0, 1, 2, 4]); // status que ocupam vaga
const FORMAS_PAGAMENTO = { 1: 'Dinheiro', 4: 'Cartão', 5: 'Outra moeda', 6: 'Cheque', 8: 'Depósito bancário (PIX)' };

class Simulador {
  constructor(opts = {}) {
    this.seedPath = opts.seedPath || path.join(__dirname, '..', 'dados', 'seed.json');
    this.arquivoEstado = opts.arquivoEstado || null;
    this.tokens = new Map(); // token -> expira em (ms, relógio simulado)
    this.falhas = []; // falhas injetadas (não persistem)
    this.log = []; // últimas requisições
    if (this.arquivoEstado && fs.existsSync(this.arquivoEstado)) {
      this.estado = JSON.parse(fs.readFileSync(this.arquivoEstado, 'utf8'));
    } else {
      this.resetar();
    }
  }

  // ---------------------------------------------------------------- estado
  resetar({ vazio = false } = {}) {
    const seed = JSON.parse(fs.readFileSync(this.seedPath, 'utf8'));
    this.tokens.clear();
    this.falhas = [];
    this.estado = {
      versao: 1,
      config: { ...seed.config },
      catalogo: seed.catalogo,
      tarifas: seed.tarifas,
      empresas: seed.empresas || [],
      fornecedores: seed.fornecedores || [],
      hospedes: [],
      reservas: [],
      estadias: [],
      manutencoes: [],
      lancamentos: seed.lancamentos || [],
      fechaduras: [],
      limpeza: {},
      seq: { reserva: 50000, item: 80000, itemHospede: 90000, hospede: 10000, adiantamento: 70000, estadia: 60000, manutencao: 100, empresa: 600 },
      relogioOffsetMs: 0,
    };
    for (const a of this.estado.catalogo.apartamentos) this.estado.limpeza[a.codigo] = 1;
    for (const h of seed.hospedes || []) this.novoHospede(h);
    const n = this.estado.config.gerarHospedesFicticios || 0;
    const cidades = this.estado.catalogo.cidades;
    for (let i = 1; i <= n; i++) {
      const c = cidades[i % cidades.length];
      const num = String(i).padStart(4, '0');
      this.novoHospede({
        nome: `HÓSPEDE FICTÍCIO ${num}`, documento: `000.000.${num.slice(0, 3)}-${num.slice(2)}`,
        celular: `(67) 90001-${num}`, email: `hospede${num}@exemplo.test`, cidade: c.nome, estado: c.estado,
        sexo: i % 2 ? 'F' : 'M', dataNascimento: `${1960 + (i % 40)}-0${1 + (i % 9)}-1${i % 10}`,
      });
    }
    if (!vazio) {
      for (const m of seed.manutencoes || []) this.criarManutencao(m);
      for (const r of seed.reservas || []) this.carregarReservaSeed(r);
    }
    this.salvarSeConfigurado();
  }

  carregarReservaSeed(r) {
    const { _sim: s = {}, ...corpo } = r;
    const reserva = this.criarReserva(corpo, {
      dataHora: s.dataHora, nomeUsuario: s.nomeUsuario, idNoPortal: s.idNoPortal, origem: 'seed',
    });
    for (const a of s.adiantamentos || []) {
      const it = reserva.itens[0];
      const { percentual, ...resto } = a;
      this.lancarAdiantamento({ valor: U.r2((this.totaisItem(it)[0].totalGeral.valor * percentual) / 100), idConta: it.id, ...resto }, { data: s.dataHora.slice(0, 10) });
    }
    if (s.status === 2) for (const it of reserva.itens) { it.status = 2; it.dataHoraEfetivacao = s.dataHora; }
    if (s.status === 3) this.cancelar({ idReserva: reserva.id, motivo: 'Cancelada (seed)' });
    if (s.checkin) this.checkin({ idReservaItem: reserva.itens[0].id, codigoApartamento: s.checkin.codigoApartamento }, s.checkin);
  }

  salvarSeConfigurado() {
    if (this.arquivoEstado) this.salvar(this.arquivoEstado);
  }
  salvar(arquivo) {
    fs.writeFileSync(arquivo, JSON.stringify(this.estado, null, 2));
    return arquivo;
  }
  carregar(arquivo) {
    this.estado = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    this.tokens.clear();
  }

  // ---------------------------------------------------------------- relógio
  agoraMs() { return Date.now() + (this.estado.relogioOffsetMs || 0); }
  agora() { return U.dataHoraLocal(new Date(this.agoraMs())); }
  hoje() { return this.agora().slice(0, 10); }

  // ---------------------------------------------------------------- tokens
  emitirToken() {
    const token = crypto.randomBytes(24).toString('hex');
    this.tokens.set(token, this.agoraMs() + this.estado.config.tokenTtlSeg * 1000);
    return { access_token: token, token_type: 'Bearer', expires_in: this.estado.config.expiresInRetornado };
  }
  validarToken(cabecalho) {
    if (!cabecalho || !/^Bearer\s+/i.test(cabecalho)) {
      throw U.erro(401, 'TOKEN_NAO_INFORMADO', 'Token de acesso não informado. Use o cabeçalho Authorization: Bearer <access_token> obtido em /v1/Liberar.', 'Authorization');
    }
    const token = cabecalho.replace(/^Bearer\s+/i, '').trim();
    const exp = this.tokens.get(token);
    if (!exp) throw U.erro(401, 'TOKEN_INVALIDO', 'Token de acesso inválido.', 'Authorization');
    if (exp <= this.agoraMs()) {
      this.tokens.delete(token);
      throw U.erro(401, 'TOKEN_EXPIRADO', 'Token de acesso expirado. Chame /v1/Liberar novamente.', 'Authorization');
    }
  }
  expirarTodosTokens() {
    const n = this.tokens.size;
    for (const k of this.tokens.keys()) this.tokens.set(k, 0);
    return n;
  }

  // ---------------------------------------------------------------- catálogo
  get cat() { return this.estado.catalogo; }
  tipoPorId(id) { return this.cat.tiposApartamento.find((t) => t.id === Number(id)); }
  tipoPorCodigo(c) { return this.cat.tiposApartamento.find((t) => t.codigo.toUpperCase() === String(c).toUpperCase()); }
  aptoPorId(id) { return this.cat.apartamentos.find((a) => a.id === Number(id)); }
  aptoPorCodigo(c) { return this.cat.apartamentos.find((a) => a.codigo === String(c)); }
  pensao(id) { return this.cat.tiposPensao.find((p) => p.id === Number(id)); }
  tarifario(id) { return this.cat.tarifarios.find((t) => t.id === Number(id)); }
  faturamento(id) { return this.cat.faturamentos.find((f) => f.id === Number(id)); }
  portal(id) { return this.cat.portais.find((p) => p.id === Number(id)); }
  empresaPorCodigo(c) { return this.estado.empresas.find((e) => e.codigo === String(c)); }
  categoria(id) { return this.cat.categoriasHospede.find((c) => c.id === Number(id)); }
  todosItens() {
    const r = [];
    for (const res of this.estado.reservas) for (const it of res.itens) r.push([res, it]);
    return r;
  }
  acharItem(idItem) {
    for (const [res, it] of this.todosItens()) if (it.id === Number(idItem)) return [res, it];
    return [null, null];
  }
  acharReserva(id) { return this.estado.reservas.find((r) => r.id === Number(id)); }

  novoHospede(h) {
    const id = ++this.estado.seq.hospede;
    const reg = {
      id, codigo: String(id), nome: h.nome || '', dataNascimento: h.dataNascimento || '', telefone: h.telefone || '',
      celular: h.celular || '', email: h.email || '', cidade: h.cidade || '', cep: h.cep || '', bairro: h.bairro || '',
      estado: h.estado || '', pais: h.pais || 'BRASIL', sexo: h.sexo || '', documento: h.documento || '', tipoPessoa: 'F',
    };
    this.estado.hospedes.push(reg);
    return reg;
  }

  // ---------------------------------------------------------------- disponibilidade
  ocupadoNoDia(idTipo, dia, ignorarItem) {
    let n = 0;
    for (const [, it] of this.todosItens()) {
      if (it.idTipoApartamento === idTipo && STATUS_OCUPA.has(it.status) && it.id !== ignorarItem
        && it.dataEntrada <= dia && dia < it.dataSaida) n += it.qtdeApartamento;
    }
    return n;
  }
  manutencaoNoDia(idTipo, dia) {
    let n = 0;
    for (const m of this.estado.manutencoes) {
      const a = this.aptoPorCodigo(m.codigoApartamento);
      if (a && a.idTipo === idTipo && m.situacao === 0 && m.dataInicial <= dia && dia <= m.dataFinal) n++;
    }
    return n;
  }
  disponivelNoDia(tipo, dia, ignorarItem) {
    return tipo.quantidade - this.ocupadoNoDia(tipo.id, dia, ignorarItem) - this.manutencaoNoDia(tipo.id, dia);
  }

  disponibilidade(dataInicial, dataFinal, detalhar) {
    const dias = U.diasPeriodo(dataInicial, dataFinal);
    return {
      listaTipoApto: this.cat.tiposApartamento.map((t) => {
        const situacao = dias.map((d) => {
          const ocup = this.ocupadoNoDia(t.id, d);
          const man = this.manutencaoNoDia(t.id, d);
          return { data: d, qtdeDisponivel: t.quantidade - ocup - man, qtdeOcupado: ocup, qtdeManutencao: man };
        });
        let lista = situacao;
        if (!detalhar) {
          // Suposição do simulador: sem detalhe, devolve 1 linha com o pior dia do período.
          const pior = situacao.reduce((a, b) => (b.qtdeDisponivel < a.qtdeDisponivel ? b : a), situacao[0]);
          lista = [{ ...pior, data: dataInicial }];
        }
        return { id: t.id, codigo: t.codigo, nome: t.nome, qtdeMapa: t.quantidade, listaSituacaoTipoApto: lista };
      }),
    };
  }

  // ---------------------------------------------------------------- tarifas
  calcularDiaria(tipo, dia, pagantes, idTipoPensao) {
    const t = this.estado.tarifas;
    const cfg = this.estado.config;
    const pens = this.pensao(idTipoPensao);
    const ov = (t.overrides || []).find((o) => o.idTipoApartamento === tipo.id && o.idTipoPensao === pens.id
      && o.quantidade === pagantes && o.dataInicial <= dia && dia <= o.dataFinal);
    let valor;
    if (ov) {
      valor = ov.valor;
    } else {
      let base = t.basePorTipo[tipo.codigo] || 500;
      const temp = (t.temporadas || []).find((x) => x.dataInicial <= dia && dia <= x.dataFinal);
      if (temp) base *= temp.multiplicador;
      const ds = U.diaSemana(dia);
      if (ds === 5 || ds === 6) base *= 1 + t.fimDeSemanaPercentual / 100; // noites de sexta e sábado
      valor = Math.round(base) + Math.max(0, pagantes - 2) * t.valorPessoaExtra + (pens.adicionalPorPagante || 0) * pagantes;
    }
    valor = U.r2(valor);
    return {
      data: dia, valor,
      valorTaxaServico: U.r2((valor * cfg.taxaServicoPercentual) / 100),
      valorTaxaISS: U.r2((valor * cfg.taxaISSPercentual) / 100),
    };
  }

  tarifarioValor(b) {
    const v = new U.Validador();
    if (!b || typeof b !== 'object' || Array.isArray(b)) throw U.erro400('CORPO_INVALIDO', 'Corpo JSON inválido.', '');
    if (!U.dataValida(b.dataEntrada)) v.add('DATA_INVALIDA', "Informe 'dataEntrada' no formato yyyy-mm-dd.", 'dataEntrada');
    if (!U.dataValida(b.dataSaida)) v.add('DATA_INVALIDA', "Informe 'dataSaida' no formato yyyy-mm-dd.", 'dataSaida');
    if (U.dataValida(b.dataEntrada) && U.dataValida(b.dataSaida) && b.dataSaida <= b.dataEntrada) {
      v.add('PERIODO_INVALIDO', 'A data de saída deve ser maior que a data de entrada.', 'dataSaida');
    }
    let tipo = null;
    if (b.idTipoApartamento != null && b.idTipoApartamento !== '') tipo = this.tipoPorId(b.idTipoApartamento);
    else if (b.codigoTipoApartamento) tipo = this.tipoPorCodigo(b.codigoTipoApartamento);
    if (!tipo) v.add('TIPO_APARTAMENTO_INVALIDO', 'Informe um idTipoApartamento ou codigoTipoApartamento válido.', b.idTipoApartamento != null ? 'idTipoApartamento' : 'codigoTipoApartamento');
    const idPensao = b.idTipoPensao != null && b.idTipoPensao !== '' ? Number(b.idTipoPensao) : this.estado.config.idTipoPensaoPadrao;
    if (!this.pensao(idPensao)) v.add('TIPO_PENSAO_INVALIDO', `Tipo de pensão ${b.idTipoPensao} não encontrado.`, 'idTipoPensao');

    let pagantes = 0; let total = 0; let adultos = 0;
    if (Array.isArray(b.listaCategoriaHospede) && b.listaCategoriaHospede.length) {
      b.listaCategoriaHospede.forEach((c, i) => {
        const cat = this.categoria(c && c.id);
        const q = Number(c && c.quantidade);
        if (!cat) { v.add('CATEGORIA_INVALIDA', `Categoria de hóspede ${c && c.id} não encontrada.`, `listaCategoriaHospede[${i}].id`); return; }
        if (!Number.isInteger(q) || q < 0) { v.add('QUANTIDADE_INVALIDA', 'Quantidade inválida.', `listaCategoriaHospede[${i}].quantidade`); return; }
        total += q;
        if (cat.tipo === 1 || cat.tipo === 3) pagantes += q;
        if (cat.tipo === 1 || cat.tipo === 2) adultos += q;
      });
    } else {
      const a = Number(b.quantidadeAdulto);
      const c = b.quantidadeCrianca == null ? 0 : Number(b.quantidadeCrianca);
      if (!Number.isInteger(a) || a < 1) v.add('QUANTIDADE_ADULTO_INVALIDA', 'Informe quantidadeAdulto (mínimo 1) ou listaCategoriaHospede.', 'quantidadeAdulto');
      if (!Number.isInteger(c) || c < 0) v.add('QUANTIDADE_CRIANCA_INVALIDA', 'quantidadeCrianca inválida.', 'quantidadeCrianca');
      adultos = a; total = a + c; pagantes = a + c; // suposição: sem categorias, criança conta como pagante
    }
    if (adultos < 1 && !v.erros.length) v.add('QUANTIDADE_ADULTO_INVALIDA', 'É necessário ao menos 1 adulto.', 'listaCategoriaHospede');
    if (tipo && total > tipo.maximoOcupantes) {
      v.add('CAPACIDADE_EXCEDIDA', `${tipo.nome} comporta no máximo ${tipo.maximoOcupantes} ocupantes (informado: ${total}).`, 'quantidadeAdulto');
    }
    v.lancarSeHouver();
    return U.noites(b.dataEntrada, b.dataSaida).map((d) => this.calcularDiaria(tipo, d, pagantes, idPensao));
  }

  // ---------------------------------------------------------------- reservas
  /**
   * Cria uma reserva a partir do corpo UpdateReserva.
   * opts: dataHora, nomeUsuario, idNoPortal, origem ('api' | 'equipe' | 'seed'), status, ignorarDisponibilidade
   */
  criarReserva(b, opts = {}) {
    const v = new U.Validador();
    if (!b || typeof b !== 'object' || Array.isArray(b)) throw U.erro400('CORPO_INVALIDO', 'Corpo JSON inválido.', '');
    const avisos = [];
    if (typeof b.titular !== 'string' || !b.titular.trim()) v.add('TITULAR_OBRIGATORIO', 'O titular da reserva é obrigatório.', 'titular');

    let portal = null;
    if (b.idReservaPortal != null && b.idReservaPortal !== '' && Number(b.idReservaPortal) !== 0) {
      portal = this.portal(b.idReservaPortal);
      if (!portal) v.add('PORTAL_INVALIDO', `Portal ${b.idReservaPortal} não cadastrado.`, 'idReservaPortal');
    }
    let empresa = null;
    if (b.codigoEmpresa != null && String(b.codigoEmpresa).trim() !== '') {
      empresa = this.empresaPorCodigo(b.codigoEmpresa);
      if (!empresa) v.add('EMPRESA_INVALIDA', `Empresa de código ${b.codigoEmpresa} não cadastrada.`, 'codigoEmpresa');
    }
    const idFat = b.idFaturamento != null && b.idFaturamento !== '' ? Number(b.idFaturamento) : this.estado.config.idFaturamentoPadrao;
    const fat = this.faturamento(idFat);
    if (!fat) v.add('FATURAMENTO_INVALIDO', `Faturamento ${b.idFaturamento} não cadastrado.`, 'idFaturamento');
    if (empresa && fat && fat.tipo !== 'empresa') {
      avisos.push('Reserva com codigoEmpresa mas idFaturamento não é o de empresa: no real a comissão da agência pode sair errada (orientação da Silbeck).');
    }

    const itensIn = b.listaReservaItem;
    if (!Array.isArray(itensIn) || !itensIn.length) v.add('ITEM_OBRIGATORIO', 'Informe ao menos um item em listaReservaItem.', 'listaReservaItem');
    const itens = [];
    (Array.isArray(itensIn) ? itensIn : []).forEach((x, i) => {
      const cf = (c) => `listaReservaItem[${i}].${c}`;
      if (!x || typeof x !== 'object') { v.add('ITEM_INVALIDO', 'Item inválido.', `listaReservaItem[${i}]`); return; }
      const tipo = this.tipoPorId(x.idTipoApartamento);
      if (!tipo) v.add('TIPO_APARTAMENTO_INVALIDO', `Tipo de apartamento ${x.idTipoApartamento} não encontrado.`, cf('idTipoApartamento'));
      const a = Number(x.quantidadeAdulto);
      const c = x.quantidadeCrianca == null || x.quantidadeCrianca === '' ? 0 : Number(x.quantidadeCrianca);
      const q = x.qtdeApartamento == null ? 1 : Number(x.qtdeApartamento);
      if (!Number.isInteger(a) || a < 1) v.add('QUANTIDADE_ADULTO_INVALIDA', 'quantidadeAdulto deve ser no mínimo 1.', cf('quantidadeAdulto'));
      if (!Number.isInteger(c) || c < 0) v.add('QUANTIDADE_CRIANCA_INVALIDA', 'quantidadeCrianca inválida.', cf('quantidadeCrianca'));
      if (!Number.isInteger(q) || q < 1) v.add('QTDE_APARTAMENTO_INVALIDA', 'qtdeApartamento deve ser no mínimo 1.', cf('qtdeApartamento'));
      const datasOk = U.dataValida(x.dataEntrada) && U.dataValida(x.dataSaida);
      if (!U.dataValida(x.dataEntrada)) v.add('DATA_INVALIDA', 'dataEntrada deve estar no formato yyyy-mm-dd.', cf('dataEntrada'));
      if (!U.dataValida(x.dataSaida)) v.add('DATA_INVALIDA', 'dataSaida deve estar no formato yyyy-mm-dd.', cf('dataSaida'));
      if (datasOk && x.dataSaida <= x.dataEntrada) v.add('PERIODO_INVALIDO', 'A data de saída deve ser maior que a data de entrada.', cf('dataSaida'));
      if (tipo && Number.isInteger(a) && Number.isInteger(c) && a + c > tipo.maximoOcupantes) {
        v.add('CAPACIDADE_EXCEDIDA', `${tipo.nome} comporta no máximo ${tipo.maximoOcupantes} ocupantes por apartamento.`, cf('quantidadeAdulto'));
      }
      const idPensao = x.idTipoPensao != null && x.idTipoPensao !== '' ? Number(x.idTipoPensao) : this.estado.config.idTipoPensaoPadrao;
      if (!this.pensao(idPensao)) v.add('TIPO_PENSAO_INVALIDO', `Tipo de pensão ${x.idTipoPensao} não encontrado.`, cf('idTipoPensao'));
      const idTar = x.idTarifario != null && x.idTarifario !== '' ? Number(x.idTarifario) : this.estado.config.idTarifarioPadrao;
      if (!this.tarifario(idTar)) v.add('TARIFARIO_INVALIDO', `Tarifário ${x.idTarifario} não encontrado.`, cf('idTarifario'));
      let apto = null;
      if (x.idApartamento != null && x.idApartamento !== '' && Number(x.idApartamento) !== 0) {
        apto = this.aptoPorId(x.idApartamento);
        if (!apto) v.add('APARTAMENTO_INVALIDO', `Apartamento ${x.idApartamento} não encontrado.`, cf('idApartamento'));
        else if (tipo && apto.idTipo !== tipo.id) v.add('APARTAMENTO_INVALIDO', `Apartamento ${apto.codigo} não é do tipo ${tipo.codigo}.`, cf('idApartamento'));
        else if (datasOk && this.aptoAlocadoNoPeriodo(apto.id, x.dataEntrada, x.dataSaida)) {
          v.add('APARTAMENTO_OCUPADO', `Apartamento ${apto.codigo} já está reservado no período.`, cf('idApartamento'));
        }
      }
      if (x.listaHospede != null && !Array.isArray(x.listaHospede)) v.add('LISTA_HOSPEDE_INVALIDA', 'listaHospede deve ser uma lista.', cf('listaHospede'));
      (Array.isArray(x.listaHospede) ? x.listaHospede : []).forEach((h, j) => {
        if (!h || typeof h.nome !== 'string' || !h.nome.trim()) v.add('HOSPEDE_NOME_OBRIGATORIO', 'Nome do hóspede é obrigatório.', `${cf('listaHospede')}[${j}].nome`);
      });
      let listaData = null;
      if (datasOk && x.dataSaida > x.dataEntrada) {
        const ns = U.noites(x.dataEntrada, x.dataSaida);
        if (x.listaData != null) {
          if (!Array.isArray(x.listaData) || x.listaData.length !== ns.length) {
            v.add('LISTA_DATA_INVALIDA', `listaData deve ter uma linha por noite (${ns.length}).`, cf('listaData'));
          } else {
            listaData = [];
            x.listaData.forEach((d, j) => {
              if (!d || d.data !== ns[j]) v.add('LISTA_DATA_INVALIDA', `listaData[${j}].data deveria ser ${ns[j]}.`, `${cf('listaData')}[${j}].data`);
              else if (typeof d.valorDiaria !== 'number' || d.valorDiaria < 0) v.add('VALOR_DIARIA_INVALIDO', 'valorDiaria inválido.', `${cf('listaData')}[${j}].valorDiaria`);
              else listaData.push({ data: d.data, valorDiaria: U.r2(d.valorDiaria), idTarifario: d.idTarifario != null ? Number(d.idTarifario) : idTar, idTipoPensao: d.idTipoPensao != null ? Number(d.idTipoPensao) : idPensao });
            });
          }
        } else if (tipo && this.pensao(idPensao) && Number.isInteger(a)) {
          listaData = ns.map((d) => ({ data: d, valorDiaria: this.calcularDiaria(tipo, d, a + (Number.isInteger(c) ? c : 0), idPensao).valor, idTarifario: idTar, idTipoPensao: idPensao }));
          avisos.push(`Item ${i}: listaData não enviada; o simulador calculou as diárias pelo tarifário.`);
        }
      }
      itens.push({ x, tipo, a, c, q, idPensao, idTar, apto, listaData });
    });
    v.lancarSeHouver();

    // Disponibilidade: soma a demanda do pedido inteiro por tipo e dia.
    if (!opts.ignorarDisponibilidade) {
      const demanda = new Map();
      itens.forEach((it, i) => {
        for (const d of U.noites(it.x.dataEntrada, it.x.dataSaida)) {
          const k = `${it.tipo.id}|${d}`;
          const cur = demanda.get(k) || { q: 0, i, tipo: it.tipo, d };
          cur.q += it.q;
          demanda.set(k, cur);
        }
      });
      for (const { q, i, tipo, d } of demanda.values()) {
        const disp = this.disponivelNoDia(tipo, d);
        if (disp < q) {
          v.add('SEM_DISPONIBILIDADE', `Não há disponibilidade para ${tipo.nome} (${tipo.codigo}) em ${d}: disponível ${Math.max(0, disp)}, solicitado ${q}.`, `listaReservaItem[${i}].idTipoApartamento`);
        }
      }
      v.lancarSeHouver();
    }

    const dataHora = opts.dataHora || this.agora();
    const reserva = {
      id: ++this.estado.seq.reserva,
      dataHora,
      idNoPortal: opts.idNoPortal || '',
      nomePortal: portal ? portal.nome : '',
      idFaturamento: fat.id,
      faturamento: fat.nome,
      codigoRegime: b.codigoRegime != null ? String(b.codigoRegime) : '',
      empresa: empresa ? empresa.nome : '',
      titular: b.titular.trim(),
      numeroDocumento: b.numeroDocumento || '',
      tipoReserva: 'Individual',
      nomeUsuario: opts.nomeUsuario || 'API',
      telefone: b.telefone || '',
      email: b.email || '',
      voucher: b.voucher || '',
      IDReservaPortal: portal ? portal.id : 0,
      nomePromotorDeVendas: '',
      comissaoPromotorDeVendas: 0,
      percentualComissaoEmpresa: empresa ? empresa.percentualComissao || 0 : 0,
      codigoEmpresa: empresa ? empresa.codigo : '',
      observacao: b.observacao || '',
      _origem: opts.origem || 'api',
      _avisos: avisos,
      _historico: [{ dataHora, acao: `criada (${opts.origem || 'api'})` }],
      itens: [],
    };
    for (const it of itens) {
      const listaHospede = (it.x.listaHospede || []).map((h) => {
        const cad = this.novoHospede({ nome: h.nome.trim(), documento: h.numeroDocumento || '' });
        return {
          id: ++this.estado.seq.itemHospede, idHospede: cad.id, nome: h.nome.trim(), adulto: h.adulto !== false,
          numeroDocumento: h.numeroDocumento || '', categoria: h.adulto === false ? 'Criança' : 'Adulto', dataNascimento: '',
          telefone: '', celular: '', email: '', cidade: '', estado: '', pais: '', sexo: '',
        };
      });
      const soma = U.r2(it.listaData.reduce((s, d) => s + d.valorDiaria, 0));
      let valorTotalDiaria = soma;
      if (typeof it.x.valorTotalDiaria === 'number') {
        valorTotalDiaria = U.r2(it.x.valorTotalDiaria);
        if (Math.abs(valorTotalDiaria - soma) > 0.01) avisos.push(`valorTotalDiaria (${valorTotalDiaria}) difere da soma de listaData (${soma}).`);
      }
      reserva.itens.push({
        id: ++this.estado.seq.item,
        idApartamento: it.apto ? it.apto.id : 0,
        idTipoApartamento: it.tipo.id,
        quantidadeAdulto: it.a,
        quantidadeCrianca: it.c,
        dataEntrada: it.x.dataEntrada,
        dataSaida: it.x.dataSaida,
        qtdeApartamento: it.q,
        idTipoPensao: it.idPensao,
        idTarifario: it.idTar,
        status: opts.status != null ? opts.status : 1,
        dataHoraEfetivacao: opts.status === 2 ? dataHora : '',
        idEstadia: 0,
        valorTotalDiaria,
        listaHospede,
        listaData: it.listaData,
        listaAdiantamento: [],
        listaItemExtra: [],
      });
    }
    this.estado.reservas.push(reserva);
    return reserva;
  }

  aptoAlocadoNoPeriodo(idApto, entrada, saida, ignorarItem) {
    return this.todosItens().some(([, it]) => it.idApartamento === idApto && it.id !== ignorarItem && STATUS_OCUPA.has(it.status)
      && it.dataEntrada < saida && entrada < it.dataSaida);
  }

  // ---------------------------------------------------------------- adiantamento
  lancarAdiantamento(b, opts = {}) {
    const v = new U.Validador();
    if (!b || typeof b !== 'object' || Array.isArray(b)) throw U.erro400('CORPO_INVALIDO', 'Corpo JSON inválido.', '');
    if (typeof b.valor !== 'number' || !(b.valor > 0)) v.add('VALOR_INVALIDO', 'Informe um valor maior que zero.', 'valor');
    const [res, it] = this.acharItem(b.idConta);
    if (!U.ehInteiro(b.idConta) || !it) v.add('CONTA_NAO_ENCONTRADA', `Item de reserva (idConta) ${b.idConta} não encontrado.`, 'idConta');
    const tipo = Number(b.tipoFormaPagamento);
    if (!FORMAS_PAGAMENTO[tipo]) v.add('FORMA_PAGAMENTO_INVALIDA', 'tipoFormaPagamento deve ser 1, 4, 5, 6 ou 8.', 'tipoFormaPagamento');
    if (it && (it.status === 3 || it.status === 5)) v.add('RESERVA_INATIVA', `Item ${it.id} está ${STATUS_DESC[it.status].toLowerCase()}; não aceita adiantamento.`, 'idConta');
    let bandeira = null;
    let parcelas = 1;
    if (tipo === 4) {
      if (b.numeroCartao != null && b.numeroCartao !== '' && !/^\d{4}$/.test(String(b.numeroCartao))) {
        v.add('NUMERO_CARTAO_INVALIDO', 'Envie somente os 4 últimos dígitos do cartão.', 'numeroCartao');
      }
      if (b.bandeiraCartao != null && b.bandeiraCartao !== '') {
        bandeira = this.cat.bandeiras.find((x) => x.codigo === String(b.bandeiraCartao));
        if (!bandeira) v.add('BANDEIRA_INVALIDA', `Bandeira ${b.bandeiraCartao} não cadastrada.`, 'bandeiraCartao');
      }
      parcelas = b.quantidadeParcelas == null ? 1 : Number(b.quantidadeParcelas);
      if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > this.estado.config.maxParcelasCartao) {
        v.add('PARCELAS_INVALIDAS', `quantidadeParcelas deve ser de 1 a ${this.estado.config.maxParcelasCartao}.`, 'quantidadeParcelas');
      }
    }
    v.lancarSeHouver();

    const fp = this.cat.formasPagamento[String(tipo)];
    const data = opts.data || this.hoje();
    const ad = {
      id: ++this.estado.seq.adiantamento,
      idFormaPagamento: bandeira ? bandeira.idFormaPagamento : fp.idFormaPagamento,
      idContaCorrente: fp.idContaCorrente,
      data,
      situacao: 'Ativo',
      valor: U.r2(b.valor),
      observacao: b.observacao || '',
      confirmar: true,
      simboloMoeda: 'R$',
      iDMoeda: 1,
      _tipoFormaPagamento: tipo,
      _cartao: tipo === 4 ? {
        bandeira: bandeira ? bandeira.nome : '', nsu: b.nsuCartao || '', autorizacao: b.codigoAutorizacaoCartao || '',
        ultimos4: b.numeroCartao || '', parcelas,
      } : null,
    };
    it.listaAdiantamento.push(ad);
    // Regra informada pela Silbeck: a reserva criada "não confirmada" confirma sozinha ao lançar o adiantamento.
    if (it.status === 0 || it.status === 1) {
      it.status = 2;
      it.dataHoraEfetivacao = opts.data ? `${data} 12:00:00` : this.agora();
      res._historico.push({ dataHora: this.agora(), acao: `item ${it.id} confirmado pelo adiantamento ${ad.id}` });
    }
    return { id: ad.id, confirmado: it.status === 2 || it.status === 4, dataDeposito: data };
  }

  // ---------------------------------------------------------------- saída ListaReserva
  totaisItem(it) {
    const diaria = U.r2(it.listaData.reduce((s, d) => s + d.valorDiaria, 0) * it.qtdeApartamento);
    const cfg = this.estado.config;
    const ts = U.r2((diaria * cfg.taxaServicoPercentual) / 100);
    const iss = U.r2((diaria * cfg.taxaISSPercentual) / 100);
    const adiant = U.r2(it.listaAdiantamento.filter((a) => a.situacao === 'Ativo').reduce((s, a) => s + a.valor, 0));
    const zero = { valor: 0, taxaServico: 0, taxaISS: 0 };
    return [{
      idQuebra: 1, idMoeda: 1, codigoMoeda: 'BRL', simboloMoeda: 'R$', adiantamento: adiant, usoCredito: 0,
      diaria: { valor: diaria, taxaServico: ts, taxaISS: iss }, diferencaDiaria: { ...zero }, extra: { ...zero }, turismo: { ...zero },
      totalGeral: { valor: diaria, taxaServico: ts, taxaISS: iss },
    }];
  }

  reservaParaSaida(r, itens) {
    return {
      id: r.id, dataHora: r.dataHora, idNoPortal: r.idNoPortal, nomePortal: r.nomePortal, idFaturamento: r.idFaturamento,
      faturamento: r.faturamento, codigoRegime: r.codigoRegime, empresa: r.empresa, titular: r.titular,
      numeroDocumento: r.numeroDocumento, tipoReserva: r.tipoReserva, nomeUsuario: r.nomeUsuario, telefone: r.telefone,
      email: r.email, voucher: r.voucher, IDReservaPortal: r.IDReservaPortal, nomePromotorDeVendas: r.nomePromotorDeVendas,
      comissaoPromotorDeVendas: r.comissaoPromotorDeVendas, percentualComissaoEmpresa: r.percentualComissaoEmpresa,
      codigoEmpresa: r.codigoEmpresa,
      listaReservaItem: itens.map((it) => {
        const tipo = this.tipoPorId(it.idTipoApartamento);
        const apto = this.aptoPorId(it.idApartamento);
        const pens = this.pensao(it.idTipoPensao);
        return {
          id: it.id, idApartamento: it.idApartamento, apartamento: apto ? apto.codigo : '', idTipoApartamento: it.idTipoApartamento,
          codigoTipoApartamento: tipo.codigo, nomeTipoApartamento: tipo.nome, nomeTipoPensao: pens ? pens.nome : '',
          quantidadeAdulto: it.quantidadeAdulto, quantidadeCrianca: it.quantidadeCrianca, dataEntrada: it.dataEntrada,
          dataSaida: it.dataSaida, qtdeApartamento: it.qtdeApartamento, idTipoPensao: String(it.idTipoPensao), status: it.status,
          statusDescricao: STATUS_DESC[it.status], idTarifario: it.idTarifario, idEstadia: it.idEstadia,
          dataHoraEfetivacao: it.dataHoraEfetivacao, valorTotalDiaria: it.valorTotalDiaria,
          listaHospede: it.listaHospede.map(({ ficha, ...h }) => h),
          listaData: it.listaData.map((d) => ({ ...d, idMoeda: 1, simboloMoeda: 'R$' })),
          listaTotal: this.totaisItem(it),
          listaAdiantamento: it.listaAdiantamento.map(({ _tipoFormaPagamento, _cartao, ...a }) => a),
          listaItemExtra: it.listaItemExtra,
        };
      }),
    };
  }

  listaReserva({ dataInicial, dataFinal, tipoData = 'entrada', idReserva, status, ativo }) {
    const dentro = (d) => d && d.slice(0, 10) >= dataInicial && d.slice(0, 10) <= dataFinal;
    const out = [];
    for (const r of this.estado.reservas) {
      if (idReserva != null && r.id !== idReserva) continue;
      const itens = r.itens.filter((it) => {
        if (status != null && it.status !== status) return false;
        if (ativo === true && (it.status === 3 || it.status === 5)) return false;
        if (ativo === false && !(it.status === 3 || it.status === 5)) return false;
        switch (tipoData) {
          case 'cadastro': return dentro(r.dataHora);
          case 'efetivacao': return dentro(it.dataHoraEfetivacao);
          case 'entrada': return dentro(it.dataEntrada);
          case 'saida': return dentro(it.dataSaida);
          case 'ocupacao': return it.dataEntrada <= dataFinal && it.dataSaida > dataInicial;
          default: return false;
        }
      });
      if (itens.length) out.push(this.reservaParaSaida(r, itens));
    }
    return { listaReserva: out };
  }

  // ---------------------------------------------------------------- ficha (FNRH)
  fichaHospede(b) {
    const v = new U.Validador();
    if (!b || typeof b !== 'object' || Array.isArray(b)) throw U.erro400('CORPO_INVALIDO', 'Corpo JSON inválido.', '');
    if (b.idReservaItemHospede == null || b.idReservaItemHospede === '') v.add('ID_OBRIGATORIO', 'Informe idReservaItemHospede.', 'idReservaItemHospede');
    const enumOk = (campo, valores) => {
      if (b[campo] != null && b[campo] !== '' && !valores.includes(b[campo])) v.add('VALOR_INVALIDO', `${campo} fora dos valores aceitos (${valores.join(', ')}).`, campo);
    };
    enumOk('sexo', ['F', 'M', 'N', 'O']);
    enumOk('tipoDocumento', [1, 2, 3, 4, 5]);
    enumOk('raca', [1, 2, 3, 4, 5, 6]);
    enumOk('deficiencia', [1, 2, 3, 4, 5, 6, 7]);
    enumOk('motivoViagem', [1, 2, 3, 4, 5, 6, 7, 8]);
    enumOk('meioTransporte', [1, 2, 3, 4, 5, 6, 7, 8]);
    if (b.dataNascimento && !U.dataValida(b.dataNascimento)) v.add('DATA_INVALIDA', 'dataNascimento no formato yyyy-mm-dd.', 'dataNascimento');
    for (const c of ['previsaoEntrada', 'previsaoSaida']) {
      if (b[c] && !U.dataHoraValida(b[c])) v.add('DATA_INVALIDA', `${c} no formato yyyy-mm-dd hh:mm:ss.`, c);
    }
    if (b.cpf && String(b.cpf).replace(/\D/g, '').length !== 11) v.add('CPF_INVALIDO', 'CPF deve ter 11 dígitos.', 'cpf');
    for (const c of ['estado', 'ultimaProcedenciaEstado', 'proximoDestinoEstado']) {
      if (b[c] && !/^[A-Za-z]{2}$/.test(b[c])) v.add('UF_INVALIDA', `${c} deve ser a sigla da UF (ex.: MS).`, c);
    }
    v.lancarSeHouver();

    const id = Number(b.idReservaItemHospede);
    let alvo = null;
    let avisos = [];
    for (const [, it] of this.todosItens()) {
      const h = it.listaHospede.find((x) => x.id === id);
      if (h) { alvo = h; break; }
    }
    if (!alvo) {
      // Ambiguidade do swagger ("campo 'id' do array 'listaReservaItem'"): se vier o id do ITEM, o simulador
      // inclui um hóspede novo nesse item.
      const [, it] = this.acharItem(id);
      if (!it) throw U.erro400('HOSPEDE_NAO_ENCONTRADO', `Hóspede do item de reserva ${b.idReservaItemHospede} não encontrado.`, 'idReservaItemHospede');
      if (!b.nome) throw U.erro400('NOME_OBRIGATORIO', 'Para incluir hóspede novo no item, informe o nome.', 'nome');
      const cad = this.novoHospede({ nome: b.nome });
      alvo = { id: ++this.estado.seq.itemHospede, idHospede: cad.id, nome: b.nome, adulto: true, numeroDocumento: '', categoria: 'Adulto', dataNascimento: '', telefone: '', celular: '', email: '', cidade: '', estado: '', pais: '', sexo: '' };
      it.listaHospede.push(alvo);
      avisos.push(`idReservaItemHospede ${id} é um id de ITEM; hóspede novo ${alvo.id} incluído.`);
    }
    for (const c of ['nome', 'email', 'telefone', 'celular', 'dataNascimento', 'sexo', 'numeroDocumento', 'cidade', 'estado', 'pais']) {
      if (b[c] != null && b[c] !== '') alvo[c] = b[c];
    }
    alvo.ficha = { ...b, gravadoEm: this.agora() };
    const cad = this.estado.hospedes.find((h) => h.id === alvo.idHospede);
    if (cad) {
      Object.assign(cad, {
        nome: alvo.nome, email: b.email || cad.email, telefone: b.telefone || cad.telefone, celular: b.celular || cad.celular,
        dataNascimento: b.dataNascimento || cad.dataNascimento, sexo: b.sexo || cad.sexo, cidade: b.cidade || cad.cidade,
        estado: b.estado || cad.estado, pais: b.pais || cad.pais, cep: b.cep || cad.cep, bairro: b.bairro || cad.bairro,
        documento: b.cpf || b.numeroDocumento || cad.documento,
      });
    }
    return { avisos };
  }

  // ---------------------------------------------------------------- estadia, check-in, mapa
  checkin(b, opts = {}) {
    if (!b || typeof b !== 'object') throw U.erro400('CORPO_INVALIDO', 'Corpo JSON inválido.', '');
    let res; let it;
    if (b.idReservaItem != null && b.idReservaItem !== '') {
      [res, it] = this.acharItem(b.idReservaItem);
    } else if (b.idReserva != null && b.idReserva !== '') {
      if (!b.codigoApartamento) throw U.erro400('APARTAMENTO_OBRIGATORIO', 'Com idReserva, informe codigoApartamento.', 'codigoApartamento');
      res = this.acharReserva(b.idReserva);
      const apto = this.aptoPorCodigo(b.codigoApartamento);
      if (res) {
        it = res.itens.find((x) => apto && x.idApartamento === apto.id && (x.status === 1 || x.status === 2))
          || res.itens.find((x) => apto && x.idTipoApartamento === apto.idTipo && (x.status === 1 || x.status === 2));
      }
    } else {
      throw U.erro400('ID_OBRIGATORIO', 'Informe idReservaItem, ou idReserva + codigoApartamento.', 'idReservaItem');
    }
    if (!it) throw U.erro(404, 'RESERVA_NAO_ENCONTRADA', 'Reserva não encontrada.', 'idReservaItem');
    if (!(it.status === 1 || it.status === 2)) throw U.erro400('STATUS_INVALIDO', `Item ${it.id} está "${STATUS_DESC[it.status]}"; check-in não permitido.`, 'idReservaItem');
    const codigo = b.codigoApartamento || (this.aptoPorId(it.idApartamento) || {}).codigo;
    const apto = codigo && this.aptoPorCodigo(codigo);
    if (!apto) throw U.erro400('APARTAMENTO_OBRIGATORIO', 'Informe codigoApartamento válido (o item não tem apartamento alocado).', 'codigoApartamento');
    if (this.estado.estadias.some((e) => e.idApartamento === apto.id && e.fechado === 0)) {
      throw U.erro400('APARTAMENTO_OCUPADO', `Apartamento ${apto.codigo} já está ocupado.`, 'codigoApartamento');
    }
    const est = {
      id: ++this.estado.seq.estadia, idApartamento: apto.id, fechado: 0, dataEntrada: opts.dataEntrada || this.hoje(),
      horaEntrada: opts.horaEntrada || this.agora().slice(11, 16), dataSaida: it.dataSaida, horaSaida: '13:00',
      idReserva: res.id, idReservaItem: it.id,
    };
    this.estado.estadias.push(est);
    it.status = 4; it.idEstadia = est.id; it.idApartamento = apto.id;
    this.estado.limpeza[apto.codigo] = 0;
    res._historico.push({ dataHora: this.agora(), acao: `check-in do item ${it.id} no apartamento ${apto.codigo}` });
    return est;
  }

  checkout(b) {
    const est = b.idEstadia != null
      ? this.estado.estadias.find((e) => e.id === Number(b.idEstadia))
      : this.estado.estadias.find((e) => e.fechado === 0 && (this.aptoPorId(e.idApartamento) || {}).codigo === String(b.codigoApartamento));
    if (!est || est.fechado) throw U.erro(404, 'ESTADIA_NAO_ENCONTRADA', 'Estadia aberta não encontrada.', 'idEstadia');
    est.fechado = 1; est.dataSaida = this.hoje(); est.horaSaida = this.agora().slice(11, 16);
    this.estado.limpeza[this.aptoPorId(est.idApartamento).codigo] = 0;
    return est;
  }

  estadiaParaSaida(e) {
    const apto = this.aptoPorId(e.idApartamento);
    const tipo = this.tipoPorId(apto.idTipo);
    const [res, it] = this.acharItem(e.idReservaItem);
    const pens = it && this.pensao(it.idTipoPensao);
    return {
      id: e.id, apartamento: apto.codigo, fechado: e.fechado, codigoTipoApartamento: tipo.codigo, nomeTipoApartamento: tipo.nome,
      dataEntrada: e.dataEntrada, horaEntrada: e.horaEntrada, dataSaida: e.dataSaida, horaSaida: e.horaSaida,
      faturamento: res ? res.faturamento : '', empresa: res ? res.empresa : '', idReserva: e.idReserva,
      idReservaNoPortal: res ? res.idNoPortal : '', nomePortal: res ? res.nomePortal : '', tipoReserva: res ? res.tipoReserva : '',
      dataHoraReserva: res ? res.dataHora : '', nomeTipoPensao: pens ? pens.nome : '', observacaoInterna: res ? res.observacao : '',
      observacaoExterna: '', observacaoAlimentosEBebidas: '',
      listaHospede: (it ? it.listaHospede : []).map((h) => ({
        id: h.id, idHospede: h.idHospede, nome: h.nome, categoria: h.categoria, dataNascimento: h.dataNascimento, telefone: h.telefone,
        celular: h.celular, email: h.email, cidade: h.cidade, estado: h.estado, pais: h.pais, sexo: h.sexo,
      })),
      listaData: (it ? it.listaData : []).map((d) => ({
        data: d.data, ValorDiaria: d.valorDiaria, ValorDiariaPrevista: d.valorDiaria, ValorDiariaMediaPrevista: d.valorDiaria,
        ValorDiferencaDiariaLiquidaPrevista: 0, ValorDiferencaDiariaMediaPrevista: 0,
        ValorDiariaGerou: d.data < this.hoje() ? d.valorDiaria : 0, ValorDiariaMediaGerou: d.data < this.hoje() ? d.valorDiaria : 0,
        ValorDiferencaDiariaGerou: 0, ValorDiferencaDiariaMediaGerou: 0, ValorDiariaInclusoGerou: 0,
      })),
    };
  }

  listaEstadia({ dataInicial, dataFinal, tipoData = 'entrada', fechado }) {
    const lista = this.estado.estadias.filter((e) => {
      if (fechado === true && e.fechado !== 1) return false;
      if (fechado === false && e.fechado !== 0) return false;
      if (tipoData === 'saida') return e.dataSaida >= dataInicial && e.dataSaida <= dataFinal;
      if (tipoData === 'ocupacao') return e.dataEntrada <= dataFinal && e.dataSaida > dataInicial;
      return e.dataEntrada >= dataInicial && e.dataEntrada <= dataFinal;
    });
    return { listaEstadia: lista.map((e) => this.estadiaParaSaida(e)) };
  }

  criarManutencao(m) {
    const apto = this.aptoPorCodigo(m.codigoApartamento);
    if (!apto) throw U.erro400('APARTAMENTO_INVALIDO', `Apartamento ${m.codigoApartamento} não existe.`, 'codigoApartamento');
    if (!U.dataValida(m.dataInicial) || !U.dataValida(m.dataFinal) || m.dataFinal < m.dataInicial) {
      throw U.erro400('PERIODO_INVALIDO', 'dataInicial/dataFinal inválidas.', 'dataInicial');
    }
    const reg = { id: ++this.estado.seq.manutencao, codigoApartamento: apto.codigo, dataInicial: m.dataInicial, dataFinal: m.dataFinal, motivo: m.motivo || '', situacao: 0 };
    this.estado.manutencoes.push(reg);
    return reg;
  }

  mapaApartamento() {
    const hoje = this.hoje();
    return this.cat.apartamentos.map((a) => {
      const est = this.estado.estadias.find((e) => e.idApartamento === a.id && e.fechado === 0);
      const man = this.estado.manutencoes.find((m) => m.codigoApartamento === a.codigo && m.situacao === 0 && m.dataInicial <= hoje && hoje <= m.dataFinal);
      let prox = null;
      for (const [r, it] of this.todosItens()) {
        if (it.idApartamento === a.id && (it.status === 1 || it.status === 2) && it.dataSaida > hoje && (!prox || it.dataEntrada < prox[1].dataEntrada)) prox = [r, it];
      }
      const tipo = this.tipoPorId(a.idTipo);
      return {
        id: a.id, codigo: a.codigo, codigoTipoApartamento: tipo.codigo,
        situacao: est ? 'Ocupado' : man ? 'Manutenção' : 'Livre',
        limpeza: this.estado.limpeza[a.codigo] ? 1 : 0,
        estadia: est ? this.estadiaParaSaida(est) : null,
        manutencao: man ? { id: man.id, dataInicial: man.dataInicial, dataFinal: man.dataFinal, motivo: man.motivo, situacao: man.situacao } : null,
        reserva: prox ? this.reservaParaSaida(prox[0], [prox[1]]) : null,
      };
    });
  }

  // ---------------------------------------------------------------- ocupação
  ocupacao({ dataInicial, dataFinal, somenteReservaConfirmada }) {
    const totalAptos = this.cat.apartamentos.length;
    const capacidade = this.cat.tiposApartamento.reduce((s, t) => s + t.quantidade * t.maximoOcupantes, 0);
    const statusOk = somenteReservaConfirmada ? new Set([2, 4]) : new Set([1, 2, 4]);
    const itens = this.todosItens().map(([, it]) => it).filter((it) => statusOk.has(it.status));
    const noDia = (d) => {
      let apto = 0; let pax = 0; let ent = 0; let entPax = 0; let sai = 0; let saiPax = 0; let diaria = 0;
      for (const it of itens) {
        const p = (it.quantidadeAdulto + it.quantidadeCrianca) * it.qtdeApartamento;
        if (it.dataEntrada <= d && d < it.dataSaida) {
          apto += it.qtdeApartamento; pax += p;
          const ld = it.listaData.find((x) => x.data === d);
          diaria += (ld ? ld.valorDiaria : 0) * it.qtdeApartamento;
        }
        if (it.dataEntrada === d) { ent += it.qtdeApartamento; entPax += p; }
        if (it.dataSaida === d) { sai += it.qtdeApartamento; saiPax += p; }
      }
      return { apto, pax, ent, entPax, sai, saiPax, diaria: U.r2(diaria) };
    };
    const dias = U.diasPeriodo(dataInicial, dataFinal);
    let aptoTotal = 0; let paxTotal = 0; let totalDiaria = 0;
    const lista = dias.map((d) => {
      const x = noDia(d);
      const ant = noDia(U.somarDias(d, -1));
      aptoTotal += x.apto; paxTotal += x.pax; totalDiaria += x.diaria;
      return {
        data: d,
        pax: { diaAnterior: ant.pax, saida: x.saiPax, entrada: x.entPax, total: x.pax, percentual: U.r2((x.pax / capacidade) * 100), diariaMedia: x.pax ? Math.round(x.diaria / x.pax) : 0 },
        apto: { diaAnterior: ant.apto, saida: x.sai, entrada: x.ent, total: x.apto, percentual: U.r2((x.apto / totalAptos) * 100), diariaMedia: x.apto ? U.r2(x.diaria / x.apto) : 0 },
        totalDiaria: x.diaria,
        revPar: U.r2(x.diaria / totalAptos),
      };
    });
    const comEntrada = itens.filter((it) => it.dataEntrada >= dataInicial && it.dataEntrada <= dataFinal);
    const perm = comEntrada.length ? comEntrada.reduce((s, it) => s + U.diasEntre(it.dataEntrada, it.dataSaida), 0) / comEntrada.length : 0;
    return {
      listaOcupacao: lista,
      mediaPermanencia: U.r2(perm),
      paxTotal,
      paxTotalPercentual: U.r2((paxTotal / (capacidade * dias.length)) * 100),
      paxTotalDiariaMedia: paxTotal ? U.r2(totalDiaria / paxTotal) : 0,
      aptoTotal,
      aptoTotalPercentual: U.r2((aptoTotal / (totalAptos * dias.length)) * 100),
      aptoTotalDiariaMedia: aptoTotal ? U.r2(totalDiaria / aptoTotal) : 0,
      totalDiaria: U.r2(totalDiaria),
    };
  }

  // ---------------------------------------------------------------- ações "manuais" da equipe (/_sim)
  cancelar({ idReserva, idReservaItem, motivo, devolverAdiantamentos }) {
    let alvos = [];
    let res;
    if (idReservaItem != null) {
      const [r, it] = this.acharItem(idReservaItem);
      res = r; if (it) alvos = [it];
    } else {
      res = this.acharReserva(idReserva);
      if (res) alvos = res.itens;
    }
    if (!alvos.length) throw U.erro(404, 'RESERVA_NAO_ENCONTRADA', 'Reserva/item não encontrado.', idReservaItem != null ? 'idReservaItem' : 'idReserva');
    for (const it of alvos) {
      if (it.status === 4) throw U.erro400('STATUS_INVALIDO', `Item ${it.id} já fez check-in.`, 'idReservaItem');
      it.status = 3;
      if (devolverAdiantamentos) for (const a of it.listaAdiantamento) if (a.situacao === 'Ativo') a.situacao = 'Devolvido';
    }
    res._historico.push({ dataHora: this.agora(), acao: `cancelada pela equipe (simulado): ${motivo || 'sem motivo'}` });
    return res;
  }

  alterar(b) {
    const [res, it] = b.idReservaItem != null ? this.acharItem(b.idReservaItem) : [this.acharReserva(b.idReserva), null];
    if (!res) throw U.erro(404, 'RESERVA_NAO_ENCONTRADA', 'Reserva não encontrada.', 'idReserva');
    for (const c of ['titular', 'telefone', 'email', 'voucher', 'observacao', 'numeroDocumento']) if (b[c] != null) res[c] = b[c];
    if (b.codigoEmpresa != null) {
      const emp = b.codigoEmpresa === '' ? null : this.empresaPorCodigo(b.codigoEmpresa);
      if (b.codigoEmpresa !== '' && !emp) throw U.erro400('EMPRESA_INVALIDA', 'Empresa não cadastrada.', 'codigoEmpresa');
      res.codigoEmpresa = emp ? emp.codigo : ''; res.empresa = emp ? emp.nome : ''; res.percentualComissaoEmpresa = emp ? emp.percentualComissao : 0;
    }
    const item = it || (b.idReservaItem == null && res.itens.length === 1 ? res.itens[0] : null);
    const mexeItem = ['dataEntrada', 'dataSaida', 'idTipoApartamento', 'quantidadeAdulto', 'quantidadeCrianca', 'qtdeApartamento', 'status', 'idApartamento', 'listaData'].some((c) => b[c] != null);
    if (mexeItem) {
      if (!item) throw U.erro400('ITEM_OBRIGATORIO', 'Reserva com mais de um item: informe idReservaItem.', 'idReservaItem');
      const novo = {
        dataEntrada: b.dataEntrada || item.dataEntrada, dataSaida: b.dataSaida || item.dataSaida,
        idTipoApartamento: b.idTipoApartamento != null ? Number(b.idTipoApartamento) : item.idTipoApartamento,
        quantidadeAdulto: b.quantidadeAdulto != null ? Number(b.quantidadeAdulto) : item.quantidadeAdulto,
        quantidadeCrianca: b.quantidadeCrianca != null ? Number(b.quantidadeCrianca) : item.quantidadeCrianca,
        qtdeApartamento: b.qtdeApartamento != null ? Number(b.qtdeApartamento) : item.qtdeApartamento,
      };
      const tipo = this.tipoPorId(novo.idTipoApartamento);
      if (!tipo) throw U.erro400('TIPO_APARTAMENTO_INVALIDO', 'Tipo inexistente.', 'idTipoApartamento');
      if (!U.dataValida(novo.dataEntrada) || !U.dataValida(novo.dataSaida) || novo.dataSaida <= novo.dataEntrada) throw U.erro400('PERIODO_INVALIDO', 'Período inválido.', 'dataEntrada');
      if (!b.ignorarDisponibilidade && STATUS_OCUPA.has(b.status != null ? Number(b.status) : item.status)) {
        for (const d of U.noites(novo.dataEntrada, novo.dataSaida)) {
          if (this.disponivelNoDia(tipo, d, item.id) < novo.qtdeApartamento) throw U.erro400('SEM_DISPONIBILIDADE', `Sem disponibilidade para ${tipo.codigo} em ${d}. Use ignorarDisponibilidade:true para forçar (overbooking).`, 'dataEntrada');
        }
      }
      const mudouPeriodoOuTipo = novo.dataEntrada !== item.dataEntrada || novo.dataSaida !== item.dataSaida || novo.idTipoApartamento !== item.idTipoApartamento
        || novo.quantidadeAdulto !== item.quantidadeAdulto || novo.quantidadeCrianca !== item.quantidadeCrianca;
      if (novo.idTipoApartamento !== item.idTipoApartamento) item.idApartamento = 0;
      Object.assign(item, novo);
      if (b.idApartamento != null) item.idApartamento = Number(b.idApartamento);
      if (b.status != null) item.status = Number(b.status);
      if (Array.isArray(b.listaData)) {
        item.listaData = b.listaData.map((d) => ({ data: d.data, valorDiaria: U.r2(d.valorDiaria), idTarifario: item.idTarifario, idTipoPensao: item.idTipoPensao }));
      } else if (mudouPeriodoOuTipo && b.recalcularDiarias !== false) {
        item.listaData = U.noites(item.dataEntrada, item.dataSaida).map((d) => ({
          data: d, valorDiaria: this.calcularDiaria(tipo, d, item.quantidadeAdulto + item.quantidadeCrianca, item.idTipoPensao).valor,
          idTarifario: item.idTarifario, idTipoPensao: item.idTipoPensao,
        }));
      }
      item.valorTotalDiaria = U.r2(item.listaData.reduce((s, d) => s + d.valorDiaria, 0));
    }
    res._historico.push({ dataHora: this.agora(), acao: `alterada pela equipe (simulado): ${Object.keys(b).join(', ')}` });
    return res;
  }

  alterarAdiantamento({ idAdiantamento, situacao }) {
    const ok = ['Ativo', 'Estornado', 'Transferido', 'Cancelado', 'Devolvido'];
    if (!ok.includes(situacao)) throw U.erro400('SITUACAO_INVALIDA', `situacao deve ser: ${ok.join(', ')}.`, 'situacao');
    for (const [res, it] of this.todosItens()) {
      const a = it.listaAdiantamento.find((x) => x.id === Number(idAdiantamento));
      if (a) {
        a.situacao = situacao;
        res._historico.push({ dataHora: this.agora(), acao: `adiantamento ${a.id} → ${situacao} (simulado)` });
        return a;
      }
    }
    throw U.erro(404, 'ADIANTAMENTO_NAO_ENCONTRADO', 'Adiantamento não encontrado.', 'idAdiantamento');
  }

  // Ocupa todas as vagas restantes dos tipos/datas pedidos, como se outro canal (Booking) tivesse vendido antes.
  ocuparVagasRestantes(corpoReserva) {
    const criadas = [];
    for (const x of (corpoReserva && corpoReserva.listaReservaItem) || []) {
      const tipo = this.tipoPorId(x.idTipoApartamento);
      if (!tipo || !U.dataValida(x.dataEntrada) || !U.dataValida(x.dataSaida) || x.dataSaida <= x.dataEntrada) continue;
      const ns = U.noites(x.dataEntrada, x.dataSaida);
      const livres = Math.min(...ns.map((d) => this.disponivelNoDia(tipo, d)));
      if (livres > 0) {
        const r = this.criarReserva({
          titular: 'CONCORRENTE FICTÍCIO (VAGA ACABOU)', idReservaPortal: 3,
          listaReservaItem: [{ idTipoApartamento: tipo.id, quantidadeAdulto: 1, dataEntrada: x.dataEntrada, dataSaida: x.dataSaida, qtdeApartamento: livres }],
        }, { origem: 'falha-sem-vaga', nomeUsuario: 'INTEGRACAO.BOOKING', idNoPortal: `BK-SIM-${Date.now()}`, status: 2 });
        criadas.push(r.id);
      }
    }
    return criadas;
  }

  // ---------------------------------------------------------------- cadastros paginados
  paginar(lista, pagina) {
    const por = this.estado.config.registrosPorPagina;
    const p = pagina == null ? 1 : Math.max(1, pagina);
    return lista.slice((p - 1) * por, p * por);
  }
  pessoa(p, tipoPessoa) {
    return {
      id: p.id, codigo: p.codigo, nome: p.nome, dataNascimento: p.dataNascimento ? (p.dataNascimento.length === 10 ? `${p.dataNascimento} 00:00:00` : p.dataNascimento) : '',
      telefone: p.telefone || '', celular: p.celular || '', email: p.email || '', cidade: p.cidade || '', cep: p.cep || '',
      bairro: p.bairro || '', estado: p.estado || '', pais: p.pais || '', sexo: p.sexo || '', documento: p.documento || '',
      tipoPessoa: p.tipoPessoa || tipoPessoa,
    };
  }
}

module.exports = { Simulador, STATUS_DESC, FORMAS_PAGAMENTO };
