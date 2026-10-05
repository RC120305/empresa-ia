// Animador Cabanas: transforma um roteiro JSON em MP4 9:16, quadro a quadro (inspirado no Remotion, feito em casa).
// Uso: node design/ferramentas/animador/animar.mjs <roteiro.json> [saida.mp4] [--trabalhadores 4] [--previa]
//   --previa: renderiza em 540x960 (metade), mais rápido, para conferir.
// O roteiro diz o modelo (arquivo em modelos/) e o conteúdo; fotos e música com caminho relativo ao roteiro.
// Requer: Playwright (npm global) + Chromium do ambiente, e o ffmpeg do imageio-ffmpeg (pip install imageio-ffmpeg).
import {createRequire} from 'node:module';
import {execSync, spawnSync} from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {fileURLToPath, pathToFileURL} from 'node:url';

const args = process.argv.slice(2), opc = n => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : null; };
const previa = args.includes('--previa'); if (previa) args.splice(args.indexOf('--previa'), 1);
const nTrab = Number(opc('--trabalhadores') || Math.min(4, os.cpus().length));
const [arqRoteiro, saidaArg] = args;
if (!arqRoteiro) { console.error('Uso: node animar.mjs <roteiro.json> [saida.mp4] [--trabalhadores N] [--previa]'); process.exit(1); }
const dirMotor = path.dirname(fileURLToPath(import.meta.url)), dirRot = path.dirname(path.resolve(arqRoteiro));
const roteiro = JSON.parse(fs.readFileSync(arqRoteiro, 'utf8'));
const saida = path.resolve(saidaArg || path.join(dirRot, roteiro.saida || 'saida.mp4'));
const abs = p => (/^(https?|file|data):/.test(p) ? p : pathToFileURL(path.resolve(dirRot, p)).href);
// troca todo campo "foto"/"fotos" por caminho absoluto, para o motor achar a partir da pasta dele
const fixa = o => Array.isArray(o) ? o.map(fixa) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, k === 'foto' && typeof v === 'string' ? abs(v) : fixa(v)])) : o;
const rot = fixa(roteiro);

const req = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'));
const {chromium} = req('playwright');
const ffmpeg = execSync(`python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"`).toString().trim();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'animador-'));
const escala = previa ? 0.5 : 1;

const t0 = Date.now();
const nav = await chromium.launch({args: ['--allow-file-access-from-files', '--disable-web-security']});
const {w = 1080, h = 1920} = rot.formato || {};
const abre = async () => {
  const pg = await nav.newPage({viewport: {width: w, height: h}, deviceScaleFactor: escala});
  const erros = []; pg.on('pageerror', e => erros.push(e.message));
  await pg.goto(pathToFileURL(path.join(dirMotor, 'motor.html')).href);
  const info = await pg.evaluate(r => iniciar(r), rot).catch(e => { throw new Error(e.message + ' ' + erros.join(' | ')); });
  return {pg, info, erros};
};
const primeiro = await abre(); const {quadros, fps} = primeiro.info;
console.log(`Modelo ${rot.modelo}: ${quadros} quadros (${(quadros / fps).toFixed(1)} s), ${nTrab} trabalhador(es)${previa ? ', prévia 540x960' : ''}`);
const pags = [primeiro, ...(await Promise.all(Array.from({length: nTrab - 1}, abre)))];
let feitos = 0;
await Promise.all(pags.map(async ({pg, erros}, k) => {
  for (let f = k; f < quadros; f += nTrab) {
    await pg.evaluate(n => quadro(n), f);
    await pg.screenshot({path: path.join(tmp, `q${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92});
    if (erros.length) throw new Error(erros.join(' | '));
    if (++feitos % 60 === 0) process.stdout.write(`${Math.round(100 * feitos / quadros)}% `);
  }
}));
await nav.close();

const m = roteiro.musica, dur = quadros / fps;
const a = ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(tmp, 'q%05d.jpg')];
if (m) a.push('-ss', String(m.inicioSeg || 0), '-i', path.resolve(dirRot, m.arquivo));
a.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart');
if (m) a.push('-af', `volume=${m.volume ?? 0.8},afade=t=in:d=0.4,afade=t=out:st=${(dur - 1.3).toFixed(2)}:d=1.3`, '-c:a', 'aac', '-b:a', '160k', '-shortest');
a.push('-t', dur.toFixed(3), saida);
fs.mkdirSync(path.dirname(saida), {recursive: true});
const r = spawnSync(ffmpeg, a, {stdio: 'inherit'});
fs.rmSync(tmp, {recursive: true, force: true});
if (r.status !== 0) process.exit(r.status || 1);
console.log(`\nOK: ${saida} (${dur.toFixed(1)} s) em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
