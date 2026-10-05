// Renderiza o piloto: node render.mjs [saida.mp4]. Usa o Chromium já instalado no ambiente (sem baixar navegador).
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import path from 'node:path';
const saida = process.argv[2] || 'out/REELS-COPY-MASTER-remotion.mp4';
const browserExecutable = process.env.REMOTION_CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'ReelsCopy', browserExecutable});
await renderMedia({composition, serveUrl, codec: 'h264', outputLocation: saida, browserExecutable, crf: 20, concurrency: 2,
  onProgress: ({progress}) => { if (Math.round(progress * 100) % 25 === 0) process.stdout.write(`${Math.round(progress * 100)}% `); }});
console.log(`\nOK: ${saida} (${composition.durationInFrames / composition.fps} s)`);
