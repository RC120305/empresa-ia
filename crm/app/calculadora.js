// Calculadora de diária ideal do Hotel Cabanas: cálculo puro (sem banco, sem rede).
// Especificação e casos de teste: crm/calculadora-diaria.md. Todas as fórmulas foram conferidas
// contra um exemplo real (custo total 242,22; diária padrão 322,25; ponto de equilíbrio 26,5%...).
// Percentuais entram como fração (0,13 = 13%). A tela converte "13" para 0,13 antes de chamar.

// Erro de dado informado (vira 400 com a mensagem na tela); qualquer outro erro é bug.
class ErroCalculo extends Error {}

const DIAS_MES = 30;
const DIAS_ANO = 365;

// Linhas de custo que o dono informa uma vez (a tela monta o formulário a partir daqui).
const LINHAS_FIXOS = [
  ['tarifas_bancarias', 'Tarifas bancárias'], ['emprestimos', 'Parcelas de empréstimos'], ['aluguel', 'Aluguel ou arrendamento'],
  ['salarios', 'Salários (total bruto)'], ['pro_labore', 'Pró-labore dos sócios'], ['ferias_13', 'Provisão de férias e 13º'],
  ['fgts', 'FGTS sobre salários'], ['inss', 'INSS sobre salários'], ['outros_pessoal', 'Outros custos de pessoal'],
  ['contador', 'Contador'], ['marketing', 'Anúncios e marketing (média mensal)'], ['manutencao', 'Reserva para manutenção'],
  ['sistemas', 'Sistemas (reservas, site, canais)'], ['limpeza_basica', 'Material básico de limpeza'],
  ['agua_fixa', 'Água (parte fixa da conta)'], ['energia_fixa', 'Energia elétrica (parte fixa da conta)'],
  ['telefone', 'Telefone e celular'], ['internet', 'Internet'], ['tv', 'TV a cabo e streaming'], ['iptu', 'IPTU e taxas municipais (mensal)'],
  ['jardim', 'Jardinagem e área externa'], ['capacitacao', 'Cursos e capacitação'], ['outros_fixos', 'Outros custos fixos'],
].map(([chave, nome]) => ({ chave, nome }));
const LINHAS_VARIAVEIS = [
  ['cafe', 'Café da manhã (2 pessoas)'], ['agua', 'Água variável'], ['energia', 'Energia variável'], ['limpeza', 'Limpeza e piscina'],
  ['lavanderia', 'Lavanderia (enxoval completo)'], ['reposicao', 'Reposição de enxoval e utensílios'],
  ['manutencao_corretiva', 'Manutenção corretiva'], ['amenities', 'Amenities, brindes e cortesias'],
  ['hora_extra', 'Horas extras por diária'], ['outros_variaveis', 'Outros custos variáveis'],
].map(([chave, nome]) => ({ chave, nome }));

// Referência de multiplicadores por tipo de quarto (duplo padrão = 1,00).
const MULTIPLICADORES_REF = [
  { tipo: 'Single', min: 0.55, max: 0.65 }, { tipo: 'Duplo padrão', min: 1, max: 1 }, { tipo: 'Duplo com varanda', min: 1.05, max: 1.15 },
  { tipo: 'Duplo com vista', min: 1.15, max: 1.25 }, { tipo: 'Triplo', min: 1.25, max: 1.35 }, { tipo: 'Hidromassagem', min: 1.3, max: 1.5 },
  { tipo: 'Quádruplo', min: 1.45, max: 1.6 }, { tipo: 'Suíte master', min: 1.55, max: 1.8 }, { tipo: '5 a 6 pessoas', min: 1.7, max: 2 },
  { tipo: 'Banheiro compartilhado', min: 0.4, max: 0.55 },
];

// Relação entre as temporadas, a partir do exemplo estudado (baixa ≈ 0,45 e alta ≈ 1,40 da média).
// O dono pode trocar; o cálculo normaliza para a média ponderada pelos dias ser 1,00.
const TEMPORADAS_PADRAO = { baixa: 0.452, media: 1, alta: 1.405 };

const cent = x => Math.round(x * 100) / 100;
// Dinheiro digitado no padrão brasileiro: "3.800" e "3.800,50" são milhares; "3800,5" e "3800.5" são decimais.
const brDinheiro = t => { t = t.trim(); return t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t; };
const num = (v, nome, { dinheiro = false } = {}) => {
  const n = typeof v === 'string' ? Number(dinheiro ? brDinheiro(v) : v.trim().replace(',', '.')) : Number(v);
  if (v === null || v === undefined || v === '' || !Number.isFinite(n)) throw new ErroCalculo(`Informe um número válido em "${nome}".`);
  return n;
};
const opc = v => (v === null || v === undefined || v === '' ? null : v);
const frac = (v, nome, { padrao = 0, obrigatorio = false } = {}) => {
  if (opc(v) === null) { if (obrigatorio) throw new ErroCalculo(`Informe "${nome}".`); return padrao; }
  const n = num(v, nome);
  if (n < 0 || n >= 1) throw new ErroCalculo(`"${nome}" deve ficar entre 0% e 100% (ex.: 13 para 13%).`);
  return n;
};
// Aceita um total, uma lista ou um objeto { chave: valor } e devolve a soma (valores vazios = 0).
function somar(custos, nome) {
  if (custos === null || custos === undefined) return 0;
  const valores = typeof custos === 'object' ? Object.values(custos) : [custos];
  return valores.reduce((s, v) => {
    if (opc(v) === null) return s;
    const n = num(v, nome, { dinheiro: true });
    if (n < 0) throw new ErroCalculo(`"${nome}" não pode ter valor negativo.`);
    return s + n;
  }, 0);
}
const divisor = (nome, ...partes) => {
  const d = 1 - partes.reduce((s, p) => s + p, 0);
  if (d <= 0) throw new ErroCalculo(`Impostos e taxas somam 100% ou mais no preço "${nome}": revise os percentuais.`);
  return d;
};

// Limpa o que veio da tela antes de guardar: só os campos conhecidos, números de verdade (vírgula aceita),
// custos só nas linhas conhecidas. Campo vazio fica null (rascunho incompleto pode ser salvo; calcular() exige o resto).
const MAX = 1e9;
function limpar(v, nome, { min = 0, max = MAX, dinheiro = false } = {}) {
  if (opc(v) === null) return null;
  const n = num(v, nome, { dinheiro });
  if (n < min || n > max) throw new ErroCalculo(`"${nome}" fora do limite permitido.`);
  return n;
}
function limparEntrada(e = {}) {
  if (!e || typeof e !== 'object') throw new ErroCalculo('Dados inválidos.');
  if (!Array.isArray(e.quartos || [])) throw new ErroCalculo('Os tipos de quarto devem ser uma lista.');
  const custos = (origem, linhas, rotulo) => Object.fromEntries(linhas.map(l => [l.chave, limpar((origem || {})[l.chave], `${rotulo}: ${l.nome}`, { dinheiro: true }) || 0]));
  const t = e.taxas || {}, tp = e.temporadas || null;
  return {
    quartos: (e.quartos || []).slice(0, 20).map(q => ({
      nome: String((q && q.nome) || '').trim().slice(0, 60), qtde: limpar(q && q.qtde, 'quantidade de quartos', { max: 1000 }),
      cap: limpar(q && q.cap, 'capacidade', { max: 100 }), mult: limpar(q && q.mult, 'multiplicador', { max: 10 }),
    })).filter(q => q.nome || q.qtde),
    ocupacao: limpar(e.ocupacao, 'ocupação média anual', { max: 1 }), diasAlta: limpar(e.diasAlta, 'dias de alta temporada', { max: 365 }),
    diasBaixa: limpar(e.diasBaixa, 'dias de baixa temporada', { max: 365 }), diariaAtual: limpar(e.diariaAtual, 'diária atual', { dinheiro: true }),
    margem: limpar(e.margem, 'margem de lucro', { max: 10 }),
    custosFixos: custos(e.custosFixos, LINHAS_FIXOS, 'custo fixo'), custosVariaveis: custos(e.custosVariaveis, LINHAS_VARIAVEIS, 'custo variável'),
    taxas: Object.fromEntries(['imposto', 'cartao', 'debito', 'booking', 'airbnb', 'agencia', 'juros'].map(k => [k, limpar(t[k], `taxa ${k}`, { max: 1 })])
      .concat([['parcelas', limpar(t.parcelas, 'número de parcelas', { max: 60 })]])),
    temporadas: tp && ['baixa', 'media', 'alta'].some(k => opc(tp[k]) !== null) ? Object.fromEntries(['baixa', 'media', 'alta'].map(k => [k, limpar(tp[k], `multiplicador da temporada ${k}`, { max: 20 })])) : null,
  };
}

// Custos mudam com o tempo: compara o que estava salvo com o que chegou e devolve se algo mudou e a data
// de atualização de cada linha (só as linhas que mudaram ganham a data de hoje; as demais mantêm a anterior).
const GRUPOS_CUSTO = [['fixos', 'custosFixos'], ['vars', 'custosVariaveis'], ['taxas', 'taxas']];
function compararCustos(antes, depois, hoje, datasAntes = {}) {
  const datas = Object.fromEntries(GRUPOS_CUSTO.map(([g]) => [g, { ...(datasAntes[g] || {}) }]));
  let mudou = false;
  for (const [g, campo] of GRUPOS_CUSTO) for (const k of Object.keys((depois || {})[campo] || {})) {
    const antigo = Number(((antes || {})[campo] || {})[k] ?? 0) || 0, novo = Number(depois[campo][k] ?? 0) || 0;
    if (antigo !== novo) { datas[g][k] = hoje; mudou = true; }
  }
  return { mudou, datas };
}
const totaisCustos = e => ({ fixos: cent(somar((e || {}).custosFixos, 'custos fixos')), variaveis: cent(somar((e || {}).custosVariaveis, 'custos variáveis')) });

// entrada: { quartos:[{nome,qtde,cap,mult}], ocupacao, diasAlta, diasBaixa, diariaAtual?, margem?,
//            custosFixos, custosVariaveis, taxas:{imposto,cartao,debito,booking,airbnb,agencia,parcelas,juros},
//            temporadas?:{baixa,media,alta} }
function calcular(entrada = {}) {
  const tipos = (entrada.quartos || []).filter(q => opc(q.qtde) !== null && Number(q.qtde) > 0).map(q => ({
    nome: String(q.nome || 'Quarto').trim() || 'Quarto', qtde: Math.round(num(q.qtde, 'quantidade de quartos')),
    cap: q.cap ? Math.round(num(q.cap, 'capacidade')) : null,
    mult: opc(q.mult) === null ? 1 : num(q.mult, `multiplicador de ${q.nome || 'quarto'}`),
  }));
  if (!tipos.length) throw new ErroCalculo('Cadastre ao menos um tipo de quarto com quantidade.');
  if (tipos.some(t => t.mult <= 0)) throw new ErroCalculo('O multiplicador de cada quarto deve ser maior que zero.');
  const quartos = tipos.reduce((s, t) => s + t.qtde, 0);

  const ocupacao = num(entrada.ocupacao, 'ocupação média anual');
  if (ocupacao <= 0 || ocupacao > 1) throw new ErroCalculo('A ocupação deve ser maior que 0% e no máximo 100% (ex.: 30 para 30%).');
  const margem = opc(entrada.margem) === null ? 0.2 : num(entrada.margem, 'margem de lucro');
  if (margem < 0) throw new ErroCalculo('A margem de lucro não pode ser negativa.');
  const diasAlta = opc(entrada.diasAlta) === null ? 0 : num(entrada.diasAlta, 'dias de alta temporada');
  const diasBaixa = opc(entrada.diasBaixa) === null ? 0 : num(entrada.diasBaixa, 'dias de baixa temporada');
  const diasMedia = DIAS_ANO - diasAlta - diasBaixa;
  if (diasAlta < 0 || diasBaixa < 0 || diasMedia < 0) throw new ErroCalculo('Os dias de alta e baixa temporada somam mais que o ano.');

  const t = entrada.taxas || {};
  const imposto = frac(t.imposto, 'imposto sobre a receita'), cartao = frac(t.cartao, 'taxa do cartão de crédito');
  const debito = frac(t.debito, 'taxa do cartão de débito'), booking = frac(t.booking, 'comissão do Booking');
  const airbnb = frac(t.airbnb, 'comissão do Airbnb'), agencia = frac(t.agencia, 'comissão de agências');
  const parcelas = opc(t.parcelas) === null ? 1 : Math.max(1, Math.round(num(t.parcelas, 'número de parcelas')));
  const juros = frac(t.juros, 'juros ao mês do parcelamento');

  const F = somar(entrada.custosFixos, 'custos fixos'), V = somar(entrada.custosVariaveis, 'custos variáveis por diária');
  const disponiveis = quartos * DIAS_MES, vendidas = disponiveis * ocupacao;

  // Preços do quarto duplo padrão. Os percentuais somam no denominador (não em cascata).
  const custoFixoPorDiaria = F / vendidas, custoTotal = custoFixoPorDiaria + V;
  const limpa = custoTotal * (1 + margem);
  const preco = {
    amigo: custoTotal, limpa,
    base: limpa / divisor('base', imposto),
    padrao: limpa / divisor('padrão', imposto, cartao),
    booking: limpa / divisor('Booking', imposto, booking, cartao),
    airbnb: limpa / divisor('Airbnb', imposto, airbnb),
    agencia: limpa / divisor('agência', imposto, agencia, cartao),
    parcelada: limpa / divisor('parcelado', imposto, cartao, juros * parcelas),
    debito: limpa / divisor('débito', imposto, debito),
  };

  // Comparação com a diária atual (opcional) e indicadores.
  const atual = opc(entrada.diariaAtual) === null ? null : num(entrada.diariaAtual, 'diária atual', { dinheiro: true });
  const ind = { custoFixoPorDiaria, custoVariavelPorDiaria: V, faturamentoPotencial: disponiveis * preco.padrao, custoFixoMensal: F,
    custoVariavelMensal: V * vendidas, custoTotalMensal: F + V * vendidas };
  let comparacao = null;
  const avisos = [];
  if (atual !== null && atual > 0) {
    comparacao = { atual, diferenca: atual - preco.padrao, diferencaPct: (atual - preco.padrao) / preco.padrao,
      situacao: atual < preco.padrao ? 'abaixo' : 'ok' };
    ind.faturamentoEstimado = vendidas * atual;
    ind.lucroMensal = vendidas * (atual * (1 - imposto) - V) - F;
    ind.sobraPorDiaria = ind.lucroMensal / vendidas;
    const mc = atual - V; // margem de contribuição (o ponto de equilíbrio ignora o imposto, como na planilha original)
    ind.margemContribuicao = mc; ind.margemContribuicaoPct = mc / atual;
    if (mc > 0) { ind.pontoEquilibrioDiarias = F / mc; ind.pontoEquilibrioPct = F / mc / disponiveis; }
    else avisos.push('A diária atual não cobre nem o custo variável: não há ponto de equilíbrio.');
  }
  if (F === 0) avisos.push('Nenhum custo fixo informado: o resultado só considera o custo variável.');
  if (V === 0) avisos.push('Nenhum custo variável informado.');
  if (ocupacao < 0.1) avisos.push('Ocupação abaixo de 10%: o custo fixo por diária fica muito alto; confira o número.');

  // Temporadas: normaliza para a média ponderada pelos dias ser 1,00 (a receita anual do quarto não muda).
  const informadas = Object.fromEntries(Object.entries(entrada.temporadas || {}).filter(([, v]) => opc(v) !== null));
  const bruto = { ...TEMPORADAS_PADRAO, ...informadas };
  for (const k of ['baixa', 'media', 'alta']) { bruto[k] = num(bruto[k], `multiplicador da temporada ${k}`); if (bruto[k] <= 0) throw new ErroCalculo('Os multiplicadores de temporada devem ser maiores que zero.'); }
  const dias = { baixa: diasBaixa, media: diasMedia, alta: diasAlta };
  const media = (dias.baixa * bruto.baixa + dias.media * bruto.media + dias.alta * bruto.alta) / DIAS_ANO;
  const temporada = Object.fromEntries(['baixa', 'media', 'alta'].map(k => [k, bruto[k] / media]));

  // Preço por tipo de quarto = preço do canal × multiplicador do quarto × multiplicador da temporada.
  const porQuarto = tipos.map(q => {
    const lin = base => Object.fromEntries(['baixa', 'media', 'alta'].map(k => [k, cent(base * q.mult * temporada[k])]));
    return { nome: q.nome, qtde: q.qtde, cap: q.cap, mult: q.mult, direta: lin(preco.padrao), booking: lin(preco.booking),
      minima: cent(custoTotal * q.mult), medioAnual: cent(preco.padrao * q.mult) };
  });

  const arred = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v !== 'number' ? v : (/Pct$/.test(k) ? Math.round(v * 10000) / 10000 : cent(v))]));
  return {
    base: { quartos, disponiveis, vendidas: Math.round(vendidas * 100) / 100, diasMedia, custoFixoMensal: cent(F), custoVariavelPorDiaria: cent(V) },
    precos: arred(preco),
    comparacao: comparacao && arred(comparacao),
    indicadores: arred(ind),
    temporadas: { dias, multiplicadores: Object.fromEntries(Object.entries(temporada).map(([k, v]) => [k, Math.round(v * 10000) / 10000])) },
    quartos: porQuarto,
    avisos,
  };
}

module.exports = { calcular, limparEntrada, compararCustos, totaisCustos, ErroCalculo, somar, LINHAS_FIXOS, LINHAS_VARIAVEIS, MULTIPLICADORES_REF, TEMPORADAS_PADRAO };
