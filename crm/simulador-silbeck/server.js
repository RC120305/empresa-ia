#!/usr/bin/env node
'use strict';
// SIMULADOR da API Hotel v1 da Silbeck (SB Hotel) para construir e testar o CRM do Hotel Cabanas.
// NUNCA use credenciais reais aqui e NUNCA aponte o CRM em teste para o servidor real do hotel.
//
// Uso:  node server.js [--porta 8366] [--host 127.0.0.1] [--estado arquivo.json] [--seed dados/seed.json] [--silencioso]
// Ou por variáveis: SIM_PORTA, SIM_HOST, SIM_ESTADO, SIM_SEED, SIM_SILENCIOSO=1

const path = require('path');
const { Simulador } = require('./src/simulador');
const { criarServidor, PREFIXO } = require('./src/servidor');

function arg(nome) {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const porta = Number(arg('porta') ?? process.env.SIM_PORTA ?? 8366);
const host = arg('host') ?? process.env.SIM_HOST ?? '127.0.0.1';
const estado = arg('estado') ?? process.env.SIM_ESTADO;
const seed = arg('seed') ?? process.env.SIM_SEED;
const silencioso = process.argv.includes('--silencioso') || process.env.SIM_SILENCIOSO === '1';

const sim = new Simulador({
  seedPath: seed ? path.resolve(seed) : undefined,
  arquivoEstado: estado ? path.resolve(estado) : undefined,
});
const servidor = criarServidor(sim, { log: silencioso ? () => {} : (m) => console.log(`[sim ${sim.agora()}] ${m}`) });

servidor.listen(porta, host, () => {
  const p = servidor.address().port;
  // Linha lida pelos testes automáticos; não mudar o formato.
  console.log(`SIMULADOR_PRONTO porta=${p}`);
  console.log(`Simulador Silbeck (FICTÍCIO) em http://${host}:${p}${PREFIXO}/v1/...  | administração: http://${host}:${p}/_sim`);
  console.log('AVISO: nunca use credenciais reais nem aponte o CRM em teste para o servidor real do hotel.');
  if (sim.arquivoEstado) console.log(`Estado salvo em: ${sim.arquivoEstado}`);
});

function encerrar() {
  if (sim.arquivoEstado) sim.salvar(sim.arquivoEstado);
  servidor.close();
  process.exit(0);
}
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
