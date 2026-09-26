#!/usr/bin/env node
// Renderiza uma peça HTML em PNG no tamanho exato do formato.
// Uso: node design/ferramentas/renderizar.js <peca.html> <saida.png> [feed|story]
//   feed   = 1080 x 1440 (3:4, padrão do feed orgânico desde 2026-09-26; casa com a grade do perfil)
//   feed45 = 1080 x 1350 (4:5, anúncios no feed)   story = 1080 x 1920 (9:16, Reels/Stories)
const path = require('path');
const { execSync } = require('child_process');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  const raiz = execSync('npm root -g').toString().trim();
  ({ chromium } = require(path.join(raiz, 'playwright')));
}

const [entrada, saida, formato = 'feed'] = process.argv.slice(2);
if (!entrada || !saida) {
  console.error('Uso: node renderizar.js <peca.html> <saida.png> [feed|feed45|story]');
  process.exit(1);
}
const tamanhos = {
  feed: { width: 1080, height: 1440 },
  feed45: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
};
const viewport = tamanhos[formato];
if (!viewport) {
  console.error(`Formato desconhecido: ${formato}. Use feed, feed45 ou story.`);
  process.exit(1);
}

(async () => {
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ viewport });
  await pagina.goto('file://' + path.resolve(entrada));
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForLoadState('networkidle');
  await pagina.screenshot({ path: saida });
  await navegador.close();
  console.log(`OK: ${saida} (${viewport.width} x ${viewport.height})`);
})();
