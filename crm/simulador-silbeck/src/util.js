'use strict';
// Utilitários do simulador: datas (sempre 'yyyy-mm-dd', aritmética em UTC),
// dinheiro e o formato de erro da Silbeck (StatusCode400: { erro: [ {codigo, mensagem, campoFoco} ] }).

const TZ = 'America/Campo_Grande'; // fuso de Bonito/MS

class ErroApi extends Error {
  constructor(status, erros) {
    super(erros.map((e) => e.mensagem).join('; '));
    this.status = status;
    this.erros = erros;
  }
  get corpo() {
    return { erro: this.erros };
  }
}

function erro(status, codigo, mensagem, campoFoco = '') {
  return new ErroApi(status, [{ codigo: String(codigo), mensagem, campoFoco }]);
}
const erro400 = (codigo, mensagem, campoFoco) => erro(400, codigo, mensagem, campoFoco);

// Acumula vários erros de validação e lança todos juntos (a Silbeck devolve uma lista).
class Validador {
  constructor() { this.erros = []; }
  add(codigo, mensagem, campoFoco = '') { this.erros.push({ codigo, mensagem, campoFoco }); }
  lancarSeHouver() { if (this.erros.length) throw new ErroApi(400, this.erros); }
}

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const RE_DATA_HORA = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

function dataValida(s) {
  if (typeof s !== 'string' || !RE_DATA.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}
function dataHoraValida(s) {
  return typeof s === 'string' && RE_DATA_HORA.test(s) && dataValida(s.slice(0, 10));
}
function somarDias(s, n) {
  const d = new Date(s + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function diasEntre(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}
// Noites de uma estadia: da entrada até a véspera da saída.
function noites(entrada, saida) {
  const r = [];
  for (let d = entrada; d < saida; d = somarDias(d, 1)) r.push(d);
  return r;
}
// Dias de um período, inclusive nas duas pontas.
function diasPeriodo(ini, fim) {
  const r = [];
  for (let d = ini; d <= fim; d = somarDias(d, 1)) r.push(d);
  return r;
}
function diaSemana(s) {
  return new Date(s + 'T00:00:00Z').getUTCDay(); // 0 domingo ... 6 sábado
}
function r2(v) {
  return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
}

const fmtLocal = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});
function dataHoraLocal(date) {
  return fmtLocal.format(date); // 'yyyy-mm-dd hh:mm:ss'
}

function ehInteiro(v) {
  return Number.isInteger(typeof v === 'string' && v.trim() !== '' ? Number(v) : v);
}
function paraInt(v) {
  return typeof v === 'string' ? Number(v) : v;
}

module.exports = {
  TZ, ErroApi, erro, erro400, Validador,
  dataValida, dataHoraValida, somarDias, diasEntre, noites, diasPeriodo, diaSemana, r2,
  dataHoraLocal, ehInteiro, paraInt,
};
