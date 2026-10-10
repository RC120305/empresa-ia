// Testes da calculadora de diária: node teste-calculadora.js (também roda dentro do teste.js).
// Caso de referência = exemplo real estudado (crm/calculadora-diaria.md §3). Diferença de até 1 centavo é aceita
// nos preços por quarto (a planilha original arredonda os multiplicadores antes).
const assert = require('assert');
const { calcular, limparEntrada, compararCustos, totaisCustos, ErroCalculo, somar, LINHAS_FIXOS, LINHAS_VARIAVEIS } = require(require('path').join(__dirname, 'calculadora'));

const perto = (a, b, msg, tol = 0.011) => assert.ok(Math.abs(a - b) <= tol, `${msg}: veio ${a}, esperado ${b}`);
const lista = valores => Object.fromEntries(valores.map((v, i) => [`l${i}`, v]));

const FIXOS = [60, 0, 0, 3800, 3000, 630, 304, 0, 250, 400, 400, 500, 250, 300, 200, 800, 100, 150, 60, 150, 0, 0, 0];
const VARIAVEIS = [24, 3, 8, 5, 12, 4, 3, 3, 0, 0];
const exemplo = () => ({
  quartos: [{ nome: 'Duplo Standard', qtde: 3, cap: 2, mult: 1 }, { nome: 'Duplo Vista Mar', qtde: 2, cap: 2, mult: 1.2 },
    { nome: 'Família', qtde: 1, cap: 4, mult: 1.55 }, { nome: '(vazio)', qtde: 0, cap: 2, mult: 1 }],
  ocupacao: 0.35, diasAlta: 30, diasBaixa: 150, diariaAtual: 300, margem: 0.2,
  custosFixos: lista(FIXOS), custosVariaveis: lista(VARIAVEIS),
  taxas: { imposto: 0.06, cartao: 0.038, debito: 0.02, booking: 0.13, airbnb: 0.1, parcelas: 5, juros: 0.025 },
  temporadas: { baixa: 0.55935, media: 1.23752, alta: 1.73873 }, // da planilha, sem arredondar
});

const r = calcular(exemplo());
assert.deepEqual([r.base.quartos, r.base.disponiveis, r.base.vendidas], [6, 180, 63]);
perto(r.indicadores.custoFixoPorDiaria, 180.22, 'custo fixo por diária');
perto(r.precos.amigo, 242.22, 'diária amigo');
perto(r.precos.limpa, 290.67, 'diária limpa');
perto(r.precos.base, 309.22, 'diária base');
perto(r.precos.padrao, 322.25, 'diária padrão');
perto(r.precos.booking, 376.51, 'Booking');
perto(r.precos.airbnb, 346.03, 'Airbnb');
perto(r.precos.parcelada, 374.09, 'parcelada');
perto(r.precos.debito, 315.94, 'débito');
perto(r.comparacao.diferenca, -22.25, 'diferença vs padrão');
perto(r.comparacao.diferencaPct, -0.069, 'diferença %', 0.0006);
assert.equal(r.comparacao.situacao, 'abaixo');
perto(r.indicadores.faturamentoPotencial, 58004.43, 'faturamento potencial', 0.05);
perto(r.indicadores.faturamentoEstimado, 18900, 'faturamento estimado');
perto(r.indicadores.custoVariavelMensal, 3906, 'custo variável mensal');
perto(r.indicadores.custoTotalMensal, 15260, 'custo total mensal');
perto(r.indicadores.margemContribuicao, 238, 'margem de contribuição');
perto(r.indicadores.margemContribuicaoPct, 0.7933, 'margem de contribuição %', 0.0001);
perto(r.indicadores.pontoEquilibrioDiarias, 47.7, 'ponto de equilíbrio (diárias)', 0.05);
perto(r.indicadores.pontoEquilibrioPct, 0.265, 'ponto de equilíbrio %', 0.0005);
perto(r.indicadores.lucroMensal, 2506, 'lucro mensal');
perto(r.indicadores.sobraPorDiaria, 39.78, 'sobra por diária');
const q = Object.fromEntries(r.quartos.map(x => [x.nome, x]));
assert.equal(r.quartos.length, 3, 'quarto sem quantidade é ignorado');
for (const [nome, dir, book, minima, medio] of [
  ['Duplo Standard', [180.25, 398.78, 560.29], [210.6, 465.93, 654.63], 242.22, 322.25],
  ['Duplo Vista Mar', [216.3, 478.54, 672.34], [252.72, 559.12, 785.56], 290.67, 386.7],
  ['Família', [279.39, 618.11, 868.44], [326.43, 722.19, 1014.68], 375.44, 499.48]]) {
  ['baixa', 'media', 'alta'].forEach((k, i) => { perto(q[nome].direta[k], dir[i], `${nome} direta ${k}`, 0.02); perto(q[nome].booking[k], book[i], `${nome} Booking ${k}`, 0.02); });
  perto(q[nome].minima, minima, `${nome} mínima`); perto(q[nome].medioAnual, medio, `${nome} médio anual`);
}
// A média ponderada pelos dias dos multiplicadores é 1,00 (a receita anual não muda)
const m = r.temporadas.multiplicadores, d = r.temporadas.dias;
perto((m.baixa * d.baixa + m.media * d.media + m.alta * d.alta) / 365, 1, 'média ponderada das temporadas', 0.001);
assert.deepEqual(d, { baixa: 150, media: 185, alta: 30 });

// Multiplicadores padrão (sem informar) também normalizam para 1,00 e mantêm a ordem baixa < média < alta
const sem = calcular({ ...exemplo(), temporadas: undefined }).temporadas;
perto((sem.multiplicadores.baixa * 150 + sem.multiplicadores.media * 185 + sem.multiplicadores.alta * 30) / 365, 1, 'padrão normalizado', 0.001);
assert.ok(sem.multiplicadores.baixa < sem.multiplicadores.media && sem.multiplicadores.media < sem.multiplicadores.alta);

// Sem diária atual: preços saem, comparação e indicadores de lucro não
const sd = calcular({ ...exemplo(), diariaAtual: '' });
assert.equal(sd.comparacao, null); assert.equal(sd.indicadores.lucroMensal, undefined); perto(sd.precos.padrao, 322.25, 'padrão sem atual');
// Diária acima do padrão = "ok"; abaixo do custo variável = aviso e sem ponto de equilíbrio
assert.equal(calcular({ ...exemplo(), diariaAtual: 400 }).comparacao.situacao, 'ok');
const ruim = calcular({ ...exemplo(), diariaAtual: 50 });
assert.equal(ruim.indicadores.pontoEquilibrioDiarias, undefined); assert.ok(ruim.avisos.some(a => /ponto de equilíbrio/.test(a)));
// Aceita número como texto com vírgula (campo digitado) e custos como total ou lista
assert.equal(somar('1500,50', 'x'), 1500.5); assert.equal(somar('3.800', 'x'), 3800); assert.equal(somar('3.800,50', 'x'), 3800.5); assert.equal(somar('1.234.567', 'x'), 1234567); assert.equal(somar('3800.5', 'x'), 3800.5); assert.equal(somar('12.5', 'x'), 12.5);
assert.equal(limparEntrada({ diariaAtual: '1.200' }).diariaAtual, 1200); assert.equal(limparEntrada({ quartos: [{ nome: 'A', qtde: 1, mult: '1.25' }] }).quartos[0].mult, 1.25, 'multiplicador não é dinheiro'); assert.equal(somar([100, '', null, 20], 'x'), 120); assert.equal(somar(undefined, 'x'), 0);
perto(calcular({ ...exemplo(), custosFixos: 11354, custosVariaveis: [62], ocupacao: '0,35' }).precos.padrao, 322.25, 'custos como total e texto');
// Mais ocupação dilui o custo fixo: diária cai
assert.ok(calcular({ ...exemplo(), ocupacao: 0.5 }).precos.padrao < r.precos.padrao);
// Taxas que somam 100% ou mais, entradas inválidas e dias demais dão erro claro em português
assert.throws(() => calcular({ ...exemplo(), taxas: { ...exemplo().taxas, imposto: 0.5, cartao: 0.5 } }), /somam 100%/);
assert.throws(() => calcular({ ...exemplo(), taxas: { ...exemplo().taxas, imposto: 6 } }), /entre 0% e 100%/);
assert.throws(() => calcular({ ...exemplo(), ocupacao: 0 }), /ocupação/);
assert.throws(() => calcular({ ...exemplo(), ocupacao: 35 }), /ocupação/);
assert.throws(() => calcular({ ...exemplo(), quartos: [] }), /ao menos um tipo de quarto/);
assert.throws(() => calcular({ ...exemplo(), diasAlta: 300, diasBaixa: 100 }), /somam mais que o ano/);
assert.throws(() => calcular({ ...exemplo(), custosFixos: { a: -5 } }), /negativo/);
assert.throws(() => calcular({ ...exemplo(), custosFixos: { a: 'abc' } }), /número válido/);
// limparEntrada: guarda só campos e linhas conhecidos, aceita vírgula, vazio vira null; o que sai calcula igual ao original
const porChave = (linhas, valores) => Object.fromEntries(linhas.map((l, i) => [l.chave, valores[i]]));
const real = () => ({ ...exemplo(), custosFixos: porChave(LINHAS_FIXOS, FIXOS), custosVariaveis: porChave(LINHAS_VARIAVEIS, VARIAVEIS) });
const suja = { ...real(), custosFixos: { ...porChave(LINHAS_FIXOS, FIXOS), intruso: 99 }, extra: 'x', taxas: { ...exemplo().taxas, intruso: 1 }, quartos: [...exemplo().quartos, { nome: '', qtde: '' }] };
const limpa = limparEntrada(suja);
assert.equal(limpa.extra, undefined); assert.equal(limpa.taxas.intruso, undefined); assert.equal(Object.keys(limpa.custosFixos).length, 23);
assert.equal(limpa.quartos.length, 4, 'linha de quarto totalmente vazia sai');
assert.deepEqual(limparEntrada({ quartos: [{ nome: 'A', qtde: '2', mult: '1,5' }], ocupacao: '0,3', temporadas: { baixa: '', media: '', alta: '' } }).quartos, [{ nome: 'A', qtde: 2, cap: null, mult: 1.5 }]);
assert.equal(limparEntrada({ temporadas: { baixa: '', media: null } }).temporadas, null);
perto(calcular(limpa).precos.padrao, 322.25, 'calcula igual depois de limpar');
perto(calcular(limparEntrada({ ...real(), temporadas: { baixa: '', media: '', alta: '' } })).quartos[0].direta.media, calcular({ ...real(), temporadas: undefined }).quartos[0].direta.media, 'temporadas vazias = padrão');
assert.throws(() => limparEntrada({ ocupacao: 5 }), ErroCalculo); assert.throws(() => limparEntrada({ margem: -1 }), /fora do limite/);
assert.throws(() => limparEntrada({ custosFixos: { salarios: 'abc' } }), /número válido/); assert.throws(() => limparEntrada({ quartos: 'x' }), /lista/);
assert.throws(() => limparEntrada({ quartos: Array(5).fill({ nome: 'x', qtde: 1e12 }) }), /fora do limite/);
assert.equal(limparEntrada({ quartos: Array(40).fill({ nome: 'x', qtde: 1 }) }).quartos.length, 20, 'no máximo 20 tipos');
try { calcular({}); } catch (e) { assert.ok(e instanceof ErroCalculo, 'erro de dado é ErroCalculo'); }
// Custos mudam: compararCustos acusa a mudança e só renova a data das linhas alteradas
const antes = limparEntrada(real());
let cmp = compararCustos(antes, limparEntrada(real()), '2026-10-10');
assert.equal(cmp.mudou, false); assert.deepEqual(cmp.datas, { fixos: {}, vars: {}, taxas: {} });
const depoisE = limparEntrada({ ...real(), custosFixos: { ...porChave(LINHAS_FIXOS, FIXOS), salarios: 4200 }, taxas: { ...exemplo().taxas, booking: 0.16 } });
cmp = compararCustos(antes, depoisE, '2026-11-02', { fixos: { salarios: '2026-10-10', contador: '2026-10-10' }, vars: {}, taxas: {} });
assert.equal(cmp.mudou, true); assert.deepEqual(cmp.datas.fixos, { salarios: '2026-11-02', contador: '2026-10-10' }, 'só o salário muda de data');
assert.deepEqual(cmp.datas.taxas, { booking: '2026-11-02' }); assert.deepEqual(cmp.datas.vars, {});
cmp = compararCustos(null, antes, '2026-10-10'); assert.equal(cmp.mudou, true); assert.equal(cmp.datas.fixos.salarios, '2026-10-10'); assert.equal(cmp.datas.fixos.aluguel, undefined, 'linha que continua zero não ganha data');
assert.equal(compararCustos(null, limparEntrada({}), 'x').mudou, false, 'tudo zerado não é mudança');
assert.deepEqual(totaisCustos(antes), { fixos: 11354, variaveis: 62 }); assert.deepEqual(totaisCustos(null), { fixos: 0, variaveis: 0 });
// Listas de custos para a tela: chaves únicas e a quantidade do modelo estudado
assert.equal(LINHAS_FIXOS.length, 23); assert.equal(LINHAS_VARIAVEIS.length, 10);
assert.equal(new Set([...LINHAS_FIXOS, ...LINHAS_VARIAVEIS].map(l => l.chave)).size, 33);
console.log('Calculadora de diária: todos os testes passaram');
