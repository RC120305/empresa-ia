'use strict';
// Testes automáticos do simulador: sobem o servidor numa porta livre e percorrem o fluxo do CRM
// e os erros. Rodar com:  node --test testes/fluxo.test.js   (ou npm test)

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const RAIZ = path.join(__dirname, '..');
const ARQ_TMP = path.join(__dirname, '.tmp-estado-teste.json');
let proc;
let base; // http://127.0.0.1:PORTA
let api; // base + /datasnap/rest
let token;

before(async () => {
  proc = spawn(process.execPath, ['server.js', '--porta', '0', '--silencioso'], { cwd: RAIZ, stdio: ['ignore', 'pipe', 'inherit'] });
  const porta = await new Promise((resolve, reject) => {
    let buf = '';
    const t = setTimeout(() => reject(new Error('simulador não subiu')), 5000);
    proc.stdout.on('data', (c) => {
      buf += c;
      const m = buf.match(/SIMULADOR_PRONTO porta=(\d+)/);
      if (m) { clearTimeout(t); resolve(Number(m[1])); }
    });
  });
  base = `http://127.0.0.1:${porta}`;
  api = `${base}/datasnap/rest`;
});

after(() => {
  if (proc) proc.kill();
  if (fs.existsSync(ARQ_TMP)) fs.unlinkSync(ARQ_TMP);
});

async function chamar(metodo, caminho, { corpo, tk = token, url = api, signal } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (tk) headers.Authorization = `Bearer ${tk}`;
  const r = await fetch(url + caminho, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo), signal });
  const txt = await r.text();
  return { status: r.status, corpo: txt ? JSON.parse(txt) : null, headers: r.headers };
}
const admin = (metodo, caminho, corpo) => chamar(metodo, caminho, { corpo, tk: null, url: base });
async function liberar() {
  const r = await chamar('POST', '/v1/Liberar?client_id=teste&client_secret=teste', { tk: null });
  assert.equal(r.status, 200);
  return r.corpo.access_token;
}

// Estado compartilhado entre os passos do fluxo feliz
const ENTRADA = '2026-11-10';
const SAIDA = '2026-11-13';
let cotacao;
let idReserva;
let idItem;

test('1. /v1/Liberar devolve token Bearer (credenciais de TESTE)', async () => {
  const r = await chamar('POST', '/v1/Liberar?client_id=teste&client_secret=teste', { tk: null });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.token_type, 'Bearer');
  assert.equal(typeof r.corpo.access_token, 'string');
  assert.equal(r.corpo.expires_in, 30);
  assert.match(r.headers.get('x-simulador'), /silbeck-sim/);
  token = r.corpo.access_token;
});

test('2. /v1/Liberar sem credenciais devolve 400 no formato da Silbeck', async () => {
  const r = await chamar('POST', '/v1/Liberar', { tk: null });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.erro[0].codigo, 'CREDENCIAIS_OBRIGATORIAS');
  assert.equal(r.corpo.erro[0].campoFoco, 'client_id');
});

test('3. cadastros: 11 tipos e 21 apartamentos', async () => {
  const t = await chamar('GET', '/v1/TipoApartamento');
  assert.equal(t.status, 200);
  assert.equal(t.corpo.listaTipoApartamento.length, 11);
  assert.equal(t.corpo.listaTipoApartamento.reduce((s, x) => s + x.quantidade, 0), 21);
  const a = await chamar('GET', '/v1/Apartamento');
  assert.equal(a.corpo.listaApartamento.length, 21);
  const c = await chamar('GET', '/v1/CategoriaHospede');
  assert.deepEqual(c.corpo.listaCategoriaHospede.map((x) => x.tipo), [1, 2, 3, 4]);
});

test('4. disponibilidade por dia e tipo, com ocupação do seed', async () => {
  const r = await chamar('GET', `/v1/Disponibilidade?dataInicial=${ENTRADA}&DataFinal=2026-11-12`);
  assert.equal(r.status, 200);
  const cbd = r.corpo.listaTipoApto.find((t) => t.codigo === 'CBD');
  assert.equal(cbd.qtdeMapa, 3);
  assert.equal(cbd.listaSituacaoTipoApto.length, 3);
  assert.deepEqual(cbd.listaSituacaoTipoApto[0], { data: ENTRADA, qtdeDisponivel: 3, qtdeOcupado: 0, qtdeManutencao: 0 });
  // Réveillon: as 3 Cabanas Casal estão vendidas no seed
  const rv = await chamar('GET', '/v1/Disponibilidade?dataInicial=2026-12-31&DataFinal=2026-12-31');
  assert.equal(rv.corpo.listaTipoApto.find((t) => t.codigo === 'CBD').listaSituacaoTipoApto[0].qtdeDisponivel, 0);
  // Manutenção do apto 106 (STD) entre 16 e 18/11
  const mn = await chamar('GET', '/v1/Disponibilidade?dataInicial=2026-11-17&DataFinal=2026-11-17');
  assert.equal(mn.corpo.listaTipoApto.find((t) => t.codigo === 'STD').listaSituacaoTipoApto[0].qtdeManutencao, 1);
});

test('5. tarifa por dia (Tarifario/Valor) e limite de capacidade', async () => {
  const r = await chamar('POST', '/v1/Tarifario/Valor', { corpo: { dataEntrada: ENTRADA, dataSaida: SAIDA, quantidadeAdulto: 2, idTipoApartamento: 1, idTipoPensao: 4 } });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.length, 3);
  assert.deepEqual(r.corpo.map((d) => d.data), ['2026-11-10', '2026-11-11', '2026-11-12']);
  for (const d of r.corpo) assert.ok(d.valor > 0 && 'valorTaxaServico' in d && 'valorTaxaISS' in d);
  cotacao = r.corpo;
  // Criança até 5 anos (categoria 4, cortesia) não muda o preço
  const c = await chamar('POST', '/v1/Tarifario/Valor', { corpo: { dataEntrada: ENTRADA, dataSaida: SAIDA, codigoTipoApartamento: 'BG', listaCategoriaHospede: [{ id: 1, quantidade: 2 }, { id: 4, quantidade: 1 }] } });
  const s = await chamar('POST', '/v1/Tarifario/Valor', { corpo: { dataEntrada: ENTRADA, dataSaida: SAIDA, codigoTipoApartamento: 'BG', quantidadeAdulto: 2 } });
  assert.deepEqual(c.corpo, s.corpo);
  const cap = await chamar('POST', '/v1/Tarifario/Valor', { corpo: { dataEntrada: ENTRADA, dataSaida: SAIDA, quantidadeAdulto: 3, idTipoApartamento: 1 } });
  assert.equal(cap.status, 400);
  assert.equal(cap.corpo.erro[0].codigo, 'CAPACIDADE_EXCEDIDA');
});

test('6. cria reserva: entra NÃO CONFIRMADA', async () => {
  const corpo = {
    titular: 'TESTE AUTOMATIZADO CRM', email: 'teste.crm@exemplo.test', telefone: '(67) 90000-1234', idReservaPortal: 7, idFaturamento: 1,
    observacao: 'Reserva de teste do simulador',
    listaReservaItem: [{
      idTipoApartamento: 1, quantidadeAdulto: 2, quantidadeCrianca: 0, dataEntrada: ENTRADA, dataSaida: SAIDA, qtdeApartamento: 1,
      idTipoPensao: '4', idTarifario: 1, valorTotalDiaria: cotacao.reduce((s, d) => s + d.valor, 0),
      listaHospede: [{ nome: 'TESTE AUTOMATIZADO CRM', adulto: true }, { nome: 'ACOMPANHANTE AUTOMATIZADO', adulto: true }],
      listaData: cotacao.map((d) => ({ data: d.data, valorDiaria: d.valor, idTarifario: 1, idTipoPensao: 4 })),
    }],
  };
  const r = await chamar('POST', '/v1/reserva', { corpo });
  assert.equal(r.status, 200, JSON.stringify(r.corpo));
  assert.equal(typeof r.corpo.id, 'string');
  idReserva = Number(r.corpo.id);
  const l = await chamar('GET', `/v1/ListaReserva?dataInicial=${ENTRADA}&dataFinal=${ENTRADA}&idReserva=${idReserva}`);
  assert.equal(l.corpo.listaReserva.length, 1);
  const res = l.corpo.listaReserva[0];
  assert.equal(res.nomePortal, 'CRM WhatsApp');
  const it = res.listaReservaItem[0];
  idItem = it.id;
  assert.equal(it.status, 1);
  assert.equal(it.statusDescricao, 'Não confirmada');
  assert.equal(it.listaData.length, 3);
  assert.equal(it.listaTotal[0].adiantamento, 0);
  // A vaga foi consumida
  const d = await chamar('GET', `/v1/Disponibilidade?dataInicial=${ENTRADA}&DataFinal=${ENTRADA}`);
  assert.equal(d.corpo.listaTipoApto.find((t) => t.codigo === 'CBD').listaSituacaoTipoApto[0].qtdeDisponivel, 2);
});

test('7. adiantamento Pix (tipo 8) confirma a reserva', async () => {
  const total = cotacao.reduce((s, d) => s + d.valor, 0);
  const r = await chamar('POST', '/v1/Adiantamento', { corpo: { valor: Math.round(total / 2), idConta: idItem, tipoFormaPagamento: 8, observacao: 'Pix BB (teste)' } });
  assert.equal(r.status, 200, JSON.stringify(r.corpo));
  assert.equal(r.corpo.confirmado, true);
  assert.match(r.corpo.dataDeposito, /^\d{4}-\d{2}-\d{2}$/);
  const l = await chamar('GET', `/v1/ListaReserva?dataInicial=${ENTRADA}&dataFinal=${ENTRADA}&idReserva=${idReserva}`);
  const it = l.corpo.listaReserva[0].listaReservaItem[0];
  assert.equal(it.status, 2);
  assert.equal(it.statusDescricao, 'Confirmada');
  assert.ok(it.dataHoraEfetivacao);
  assert.equal(it.listaAdiantamento.length, 1);
  assert.equal(it.listaAdiantamento[0].situacao, 'Ativo');
  assert.equal(it.listaTotal[0].adiantamento, Math.round(total / 2));
});

test('8. adiantamento cartão (tipo 4): só 4 últimos dígitos, NSU e parcelas', async () => {
  const ruim = await chamar('POST', '/v1/Adiantamento', { corpo: { valor: 100, idConta: idItem, tipoFormaPagamento: 4, numeroCartao: '4111111111111111', nsuCartao: '123456' } });
  assert.equal(ruim.status, 400);
  assert.equal(ruim.corpo.erro[0].codigo, 'NUMERO_CARTAO_INVALIDO');
  const ok = await chamar('POST', '/v1/Adiantamento', { corpo: { valor: 100, idConta: idItem, tipoFormaPagamento: 4, bandeiraCartao: '00001', nsuCartao: '123456', codigoAutorizacaoCartao: 'AUT123', numeroCartao: '1234', quantidadeParcelas: 3 } });
  assert.equal(ok.status, 200);
  const semConta = await chamar('POST', '/v1/Adiantamento', { corpo: { valor: 100, idConta: 999999, tipoFormaPagamento: 8 } });
  assert.equal(semConta.status, 400);
  assert.equal(semConta.corpo.erro[0].campoFoco, 'idConta');
});

test('9. ListaReserva por data de cadastro (sincronização a cada 5 min) e filtro de status', async () => {
  const hoje = (await admin('GET', '/_sim')).corpo.agora.slice(0, 10);
  const l = await chamar('GET', `/v1/ListaReserva?dataInicial=${hoje}&dataFinal=${hoje}&tipoData=cadastro`);
  assert.ok(l.corpo.listaReserva.some((r) => r.id === idReserva));
  const nc = await chamar('GET', '/v1/ListaReserva?dataInicial=2026-11-01&dataFinal=2026-12-31&tipoData=entrada&status=1');
  assert.ok(nc.corpo.listaReserva.length >= 2);
  for (const r of nc.corpo.listaReserva) for (const it of r.listaReservaItem) assert.equal(it.status, 1);
  const semData = await chamar('GET', '/v1/ListaReserva');
  assert.equal(semData.status, 400);
});

test('10. erros de token: sem token, token inválido, token expirado (relógio e /_sim/falha)', async () => {
  const sem = await chamar('GET', '/v1/TipoApartamento', { tk: null });
  assert.equal(sem.status, 401);
  assert.equal(sem.corpo.erro[0].codigo, 'TOKEN_NAO_INFORMADO');
  const inv = await chamar('GET', '/v1/TipoApartamento', { tk: 'abc' });
  assert.equal(inv.status, 401);
  assert.equal(inv.corpo.erro[0].codigo, 'TOKEN_INVALIDO');
  // Expiração pelo relógio simulado: TTL padrão 1800 s
  const t2 = await liberar();
  await admin('POST', '/_sim/relogio', { avancarSegundos: 1801 });
  const exp = await chamar('GET', '/v1/TipoApartamento', { tk: t2 });
  assert.equal(exp.status, 401);
  assert.equal(exp.corpo.erro[0].codigo, 'TOKEN_EXPIRADO');
  await admin('POST', '/_sim/relogio', { real: true });
  // Expiração forçada de todos os tokens
  token = await liberar();
  await admin('POST', '/_sim/falha', { tipo: 'token_expirado' });
  const exp2 = await chamar('GET', '/v1/TipoApartamento');
  assert.equal(exp2.status, 401);
  token = await liberar();
  assert.equal((await chamar('GET', '/v1/TipoApartamento')).status, 200);
});

test('11. sem vaga: tipo esgotado no Réveillon', async () => {
  const r = await chamar('POST', '/v1/reserva', { corpo: { titular: 'TESTE SEM VAGA', listaReservaItem: [{ idTipoApartamento: 1, quantidadeAdulto: 2, dataEntrada: '2026-12-30', dataSaida: '2027-01-01', qtdeApartamento: 1 }] } });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.erro[0].codigo, 'SEM_DISPONIBILIDADE');
  assert.equal(r.corpo.erro[0].campoFoco, 'listaReservaItem[0].idTipoApartamento');
});

test('12. sem vaga entre a cotação e a reserva (/_sim/falha sem_vaga)', async () => {
  const corpoItem = { idTipoApartamento: 2, quantidadeAdulto: 2, dataEntrada: '2026-11-24', dataSaida: '2026-11-26', qtdeApartamento: 1 };
  const d = await chamar('GET', '/v1/Disponibilidade?dataInicial=2026-11-24&DataFinal=2026-11-25');
  assert.equal(d.corpo.listaTipoApto.find((t) => t.codigo === 'CBT').listaSituacaoTipoApto[0].qtdeDisponivel, 1);
  await admin('POST', '/_sim/falha', { tipo: 'sem_vaga' });
  const r = await chamar('POST', '/v1/reserva', { corpo: { titular: 'TESTE VAGA ACABOU', listaReservaItem: [corpoItem] } });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.erro[0].codigo, 'SEM_DISPONIBILIDADE');
});

test('13. validações da reserva (titular, empresa inexistente, listaData incompleta)', async () => {
  const r = await chamar('POST', '/v1/reserva', { corpo: { codigoEmpresa: '000', listaReservaItem: [{ idTipoApartamento: 6, quantidadeAdulto: 2, dataEntrada: '2026-11-03', dataSaida: '2026-11-05', listaData: [{ data: '2026-11-03', valorDiaria: 400 }] }] } });
  assert.equal(r.status, 400);
  const campos = r.corpo.erro.map((e) => e.campoFoco);
  assert.ok(campos.includes('titular'));
  assert.ok(campos.includes('codigoEmpresa'));
  assert.ok(campos.includes('listaReservaItem[0].listaData'));
});

test('14. reserva de agência (codigoEmpresa + faturamento empresa) aparece com empresa e comissão', async () => {
  const r = await chamar('POST', '/v1/reserva', { corpo: { titular: 'CLIENTE DE AGÊNCIA FICTÍCIO', codigoEmpresa: '903', idFaturamento: 2, voucher: 'AGUAS-TESTE-1', listaReservaItem: [{ idTipoApartamento: 6, quantidadeAdulto: 2, dataEntrada: '2026-11-03', dataSaida: '2026-11-05' }] } });
  assert.equal(r.status, 200);
  const l = await chamar('GET', `/v1/ListaReserva?dataInicial=2026-11-03&dataFinal=2026-11-03&idReserva=${r.corpo.id}`);
  const res = l.corpo.listaReserva[0];
  assert.equal(res.codigoEmpresa, '903');
  assert.equal(res.empresa, 'AGÊNCIA TESTE ÁGUAS CLARAS VIAGENS');
  assert.equal(res.faturamento, 'Empresa');
  assert.equal(res.percentualComissaoEmpresa, 10);
});

test('15. equipe cancela no Silbeck (/_sim/cancelar): CRM enxerga status 3, vaga volta, adiantamento recusado', async () => {
  const c = await admin('POST', '/_sim/cancelar', { idReserva, motivo: 'Cliente desistiu (teste)' });
  assert.equal(c.status, 200);
  const l = await chamar('GET', `/v1/ListaReserva?dataInicial=${ENTRADA}&dataFinal=${ENTRADA}&status=3`);
  assert.ok(l.corpo.listaReserva.some((r) => r.id === idReserva));
  const ativas = await chamar('GET', `/v1/ListaReserva?dataInicial=${ENTRADA}&dataFinal=${ENTRADA}&ativo=true`);
  assert.ok(!ativas.corpo.listaReserva.some((r) => r.id === idReserva));
  const d = await chamar('GET', `/v1/Disponibilidade?dataInicial=${ENTRADA}&DataFinal=${ENTRADA}`);
  assert.equal(d.corpo.listaTipoApto.find((t) => t.codigo === 'CBD').listaSituacaoTipoApto[0].qtdeDisponivel, 3);
  const a = await chamar('POST', '/v1/Adiantamento', { corpo: { valor: 50, idConta: idItem, tipoFormaPagamento: 8 } });
  assert.equal(a.status, 400);
  assert.equal(a.corpo.erro[0].codigo, 'RESERVA_INATIVA');
});

test('16. a API não expõe cancelar/alterar (como no real)', async () => {
  for (const [m, p] of [['DELETE', '/v1/reserva'], ['PUT', '/v1/reserva'], ['POST', '/v1/reserva/cancelar'], ['PATCH', '/v1/reserva']]) {
    const r = await chamar(m, p, { corpo: { id: idReserva } });
    assert.ok([404, 405].includes(r.status), `${m} ${p} -> ${r.status}`);
  }
});

test('17. equipe altera datas (/_sim/alterar): ListaReserva mostra a mudança', async () => {
  const seed = await chamar('GET', '/v1/ListaReserva?dataInicial=2026-11-19&dataFinal=2026-11-19');
  const res = seed.corpo.listaReserva.find((r) => r.titular === 'CICLANA FICTÍCIA SOUZA');
  const it = res.listaReservaItem[0];
  const r = await admin('POST', '/_sim/alterar', { idReservaItem: it.id, dataEntrada: '2026-11-26', dataSaida: '2026-11-28' });
  assert.equal(r.status, 200, JSON.stringify(r.corpo));
  const l = await chamar('GET', `/v1/ListaReserva?dataInicial=2026-11-26&dataFinal=2026-11-26&idReserva=${res.id}`);
  const novo = l.corpo.listaReserva[0].listaReservaItem[0];
  assert.equal(novo.dataSaida, '2026-11-28');
  assert.equal(novo.listaData.length, 2);
});

test('18. falhas injetadas: erro 500 (uma vez), timeout e queda', async () => {
  await admin('POST', '/_sim/falha', { tipo: 'erro500', rota: '/v1/Disponibilidade' });
  const e = await chamar('GET', '/v1/Disponibilidade?dataInicial=2026-11-01&DataFinal=2026-11-01');
  assert.equal(e.status, 500);
  const ok = await chamar('GET', '/v1/Disponibilidade?dataInicial=2026-11-01&DataFinal=2026-11-01');
  assert.equal(ok.status, 200);
  await admin('POST', '/_sim/falha', { tipo: 'timeout', rota: '/v1/TipoApartamento', atrasoMs: 1500 });
  await assert.rejects(chamar('GET', '/v1/TipoApartamento', { signal: AbortSignal.timeout(300) }));
  await admin('POST', '/_sim/falha', { tipo: 'queda', rota: '/v1/Produto' });
  await assert.rejects(chamar('GET', '/v1/Produto'));
  assert.equal((await chamar('GET', '/v1/Produto')).status, 200);
});

test('19. timeout depois de gravar: a reserva existe mesmo sem resposta (risco de duplicar)', async () => {
  await admin('POST', '/_sim/falha', { tipo: 'timeout', rota: '/v1/reserva', gravar: true, atrasoMs: 1000 });
  await assert.rejects(chamar('POST', '/v1/reserva', { corpo: { titular: 'TESTE TIMEOUT GRAVOU', voucher: 'CRM-IDEMP-001', listaReservaItem: [{ idTipoApartamento: 10, quantidadeAdulto: 2, dataEntrada: '2026-11-05', dataSaida: '2026-11-06' }] }, signal: AbortSignal.timeout(300) }));
  const l = await chamar('GET', '/v1/ListaReserva?dataInicial=2026-11-05&dataFinal=2026-11-05');
  assert.ok(l.corpo.listaReserva.some((r) => r.voucher === 'CRM-IDEMP-001'));
});

test('20. ficha do hóspede (FNRH), check-in, estadia e mapa', async () => {
  const r = await chamar('POST', '/v1/reserva', { corpo: { titular: 'TESTE CHECKIN', listaReservaItem: [{ idTipoApartamento: 7, quantidadeAdulto: 1, dataEntrada: '2026-11-15', dataSaida: '2026-11-16', listaHospede: [{ nome: 'TESTE CHECKIN', adulto: true }] }] } });
  const l = await chamar('GET', `/v1/ListaReserva?dataInicial=2026-11-15&dataFinal=2026-11-15&idReserva=${r.corpo.id}`);
  const it = l.corpo.listaReserva[0].listaReservaItem[0];
  const f = await chamar('POST', '/v1/FichaHospede', { corpo: { idReservaItemHospede: String(it.listaHospede[0].id), nome: 'TESTE CHECKIN DA SILVA', celular: '(67) 90000-5555', dataNascimento: '1990-01-01', sexo: 'F', cpf: '000.000.000-00', estado: 'SP', motivoViagem: 4, meioTransporte: 3, previsaoEntrada: '2026-11-15 15:00:00' } });
  assert.equal(f.status, 200, JSON.stringify(f.corpo));
  const ruim = await chamar('POST', '/v1/FichaHospede', { corpo: { idReservaItemHospede: String(it.listaHospede[0].id), sexo: 'X' } });
  assert.equal(ruim.status, 400);
  const l2 = await chamar('GET', `/v1/ListaReserva?dataInicial=2026-11-15&dataFinal=2026-11-15&idReserva=${r.corpo.id}`);
  assert.equal(l2.corpo.listaReserva[0].listaReservaItem[0].listaHospede[0].nome, 'TESTE CHECKIN DA SILVA');
  const c = await chamar('POST', '/v1/reserva/checkin', { corpo: { idReservaItem: it.id, codigoApartamento: '107' } });
  assert.equal(c.status, 200);
  const hoje = (await admin('GET', '/_sim')).corpo.agora.slice(0, 10);
  const e = await chamar('GET', `/v1/ListaEstadia?dataInicial=${hoje}&dataFinal=${hoje}&tipoData=entrada&fechado=false`);
  assert.ok(e.corpo.listaEstadia.some((x) => x.apartamento === '107' && x.idReserva === Number(r.corpo.id)));
  const m = await chamar('GET', '/v1/MapaApartamento');
  assert.equal(m.corpo.find((a) => a.codigo === '107').situacao, 'Ocupado');
  const nf = await chamar('POST', '/v1/reserva/checkin', { corpo: { idReservaItem: 1 } });
  assert.equal(nf.status, 404);
});

test('21. cadastros paginados (250 por página) e POST Tarifario bloqueado', async () => {
  const p1 = await chamar('GET', '/v1/Hospede?pagina=1');
  const p2 = await chamar('GET', '/v1/Hospede?pagina=2');
  assert.equal(p1.corpo.listaHospede.length, 250);
  assert.ok(p2.corpo.listaHospede.length > 0);
  assert.notEqual(p1.corpo.listaHospede[0].id, p2.corpo.listaHospede[0].id);
  const emp = await chamar('GET', '/v1/Empresa');
  assert.ok(emp.corpo.listaEmpresa.some((x) => x.codigo === '901' && x.documento));
  const t = await chamar('POST', '/v1/Tarifario', { corpo: { dataInicial: '2026-11-01', dataFinal: '2026-11-30', idTarifario: 1, pensoes: [] } });
  assert.equal(t.status, 403);
});

test('22. demais rotas respondem no formato do swagger', async () => {
  const hoje = (await admin('GET', '/_sim')).corpo.agora.slice(0, 10);
  const checks = [
    ['/v1/Ocupacao?dataInicial=2026-12-30&dataFinal=2026-12-31', (c) => c.listaOcupacao.length === 2 && 'revPar' in c.listaOcupacao[0] && 'aptoTotalPercentual' in c],
    [`/v1/Lancamento?dataInicial=2026-09-01&dataFinal=${hoje}`, (c) => Array.isArray(c.ListaProduto) && c.ListaProduto.length >= 1],
    ['/v1/ExtratoConta?codigoApartamento=101', (c) => Array.isArray(c.listaSetor) && 'valorAberto' in c.listaTotal[0]],
    ['/v1/Produto', (c) => c.listaProduto.length > 0],
    ['/v1/Insumo', (c) => c.listaInsumo.length > 0],
    ['/v1/Setor', (c) => c.listaSetor.length > 0],
    ['/v1/TipoPensao', (c) => c.listaTipoPensao.some((p) => p.id === 4)],
    ['/v1/Cidade', (c) => c.listaCidade.length > 0],
    ['/v1/Profissao', (c) => c.listaProfissao.length > 0],
    ['/v1/Fornecedor', (c) => c.listaFornecedor.length > 0],
  ];
  for (const [p, ok] of checks) {
    const r = await chamar('GET', p);
    assert.equal(r.status, 200, p);
    assert.ok(ok(r.corpo), p);
  }
  const lim = await chamar('PUT', '/v1/Apartamento/Limpeza', { corpo: { codigo: '101', limpeza: true } });
  assert.equal(lim.status, 200);
  const fs1 = await chamar('POST', '/v1/Fechadura/Senha', { corpo: { idReserva: '50001', senha: '1234' } });
  assert.equal(fs1.status, 200);
  const fc = await chamar('POST', '/v1/Fechadura/Checkin', { corpo: { idReserva: '999', dataHora: '2026-11-06 15:00:00' } });
  assert.equal(fc.status, 404);
});

test('23. grafia diferente do swagger funciona, mas gera aviso no cabeçalho', async () => {
  const r = await chamar('GET', '/v1/Disponibilidade?dataInicial=2026-11-01&datafinal=2026-11-01');
  assert.equal(r.status, 200);
  assert.match(decodeURIComponent(r.headers.get('x-sim-avisos')), /DataFinal/);
});

test('24. salvar e recarregar o estado em JSON; reset volta ao seed', async () => {
  const s = await admin('POST', '/_sim/salvar', { arquivo: ARQ_TMP });
  assert.equal(s.status, 200);
  const salvo = JSON.parse(fs.readFileSync(ARQ_TMP, 'utf8'));
  const n = salvo.reservas.length;
  assert.ok(n > 10);
  await admin('POST', '/_sim/reset');
  const depoisReset = (await admin('GET', '/_sim/estado')).corpo.reservas.length;
  assert.equal(depoisReset, 10);
  await admin('POST', '/_sim/carregar', { arquivo: ARQ_TMP });
  assert.equal((await admin('GET', '/_sim/estado')).corpo.reservas.length, n);
  await admin('POST', '/_sim/reset');
});
