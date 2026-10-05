import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import type {Roteiro, Tela} from './roteiro';

const FPS = 30, FUSAO = 10, FECHO = 90;
const CREME = '#F7F1E6', LARANJA = '#F58634';
export const duracaoTotal = (r: Roteiro) => Math.round(r.telas.length * r.segundosPorTela * FPS) + FECHO;

const fontes = `
@font-face{font-family:Josefin;font-weight:600;src:url(${staticFile('fontes/josefin-sans-latin-600-normal.woff2')}) format('woff2')}
@font-face{font-family:Josefin;font-weight:400;src:url(${staticFile('fontes/josefin-sans-latin-400-normal.woff2')}) format('woff2')}
@font-face{font-family:Playfair;font-style:italic;src:url(${staticFile('fontes/playfair-display-latin-400-italic.woff2')}) format('woff2')}`;

const sombra = '0 2px 18px rgba(0,0,0,.55), 0 0 4px rgba(0,0,0,.35)';

// Foto com movimento lento (zoom ou deslize), recortada em 9:16 a partir da foto horizontal
const Foto: React.FC<{src: string; mover?: Tela['mover']; dur: number}> = ({src, mover = 'zoom', dur}) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, dur], [0, 1], {extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)});
  const escala = mover === 'zoom' ? 1.0 + 0.08 * t : 1.08;
  const x = mover === 'esquerda' ? interpolate(t, [0, 1], [6, -6]) : mover === 'direita' ? interpolate(t, [0, 1], [-6, 6]) : 0;
  return <AbsoluteFill style={{overflow: 'hidden'}}>
    <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${escala}) translateX(${x}%)`}} />
    <AbsoluteFill style={{background: 'linear-gradient(to bottom, rgba(20,14,8,.25), rgba(20,14,8,0) 30%, rgba(20,14,8,.05) 50%, rgba(20,14,8,.65))'}} />
  </AbsoluteFill>;
};

// Copy palavra por palavra: cada palavra sobe e aparece com mola; a palavra de destaque acende em laranja
const Copy: React.FC<{tela: Tela}> = ({tela}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const palavras = tela.texto.toUpperCase().split(' ');
  const inicio = FUSAO;
  const contador = tela.contador ? Math.round(interpolate(f, [inicio, inicio + 24], [tela.contador.de, tela.contador.ate], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)})) : null;
  const apoioOp = interpolate(f, [inicio + 18, inicio + 28], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 330, paddingLeft: 90, paddingRight: 90}}>
    {contador !== null && <div style={{fontFamily: 'Josefin', fontWeight: 600, fontSize: 150, color: CREME, textShadow: sombra, lineHeight: 1, marginBottom: 10}}>{contador}<span style={{fontSize: 70}}>{tela.contador!.sufixo}</span></div>}
    <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 20px', textAlign: 'center'}}>
      {palavras.map((p, i) => {
        const s = spring({frame: f - inicio - i * 4, fps, config: {damping: 14, stiffness: 120}});
        const dest = tela.destaque && p === tela.destaque.toUpperCase();
        return <span key={i} style={{fontFamily: 'Josefin', fontWeight: 600, fontSize: 64, letterSpacing: '.06em', lineHeight: 1.25, color: dest ? LARANJA : CREME, textShadow: sombra, opacity: s, transform: `translateY(${(1 - s) * 40}px)`, display: 'inline-block'}}>{p}</span>;
      })}
    </div>
    {tela.apoio && <div style={{marginTop: 18, fontFamily: 'Playfair', fontStyle: 'italic', fontSize: 40, color: CREME, textShadow: sombra, opacity: apoioOp}}>{tela.apoio}</div>}
  </AbsoluteFill>;
};

// Selo do logo no alto (padrão do kit)
const Selo: React.FC = () => <AbsoluteFill style={{alignItems: 'center', paddingTop: 150}}><Img src={staticFile('logo.png')} style={{height: 110, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.4))'}} /></AbsoluteFill>;

const Fecho: React.FC<{r: Roteiro; foto: string}> = ({r, foto}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const s = spring({frame: f - 6, fps, config: {damping: 16}});
  const l2 = interpolate(f, [24, 38], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill>
    <Foto src={foto} mover="zoom" dur={FECHO} />
    <AbsoluteFill style={{background: 'rgba(20,14,8,.55)'}} />
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 40}}>
      <Img src={staticFile('logo.png')} style={{height: 230, opacity: s, transform: `scale(${0.9 + 0.1 * s})`}} />
      <div style={{fontFamily: 'Josefin', fontWeight: 600, fontSize: 38, letterSpacing: '.3em', color: CREME, opacity: s}}>{r.fecho.linha1}</div>
      <div style={{fontFamily: 'Playfair', fontStyle: 'italic', fontSize: 64, color: CREME, opacity: l2, transform: `translateY(${(1 - l2) * 20}px)`}}>{r.fecho.linha2}</div>
    </AbsoluteFill>
  </AbsoluteFill>;
};

export const ReelsCopy: React.FC<{roteiro: Roteiro}> = ({roteiro: r}) => {
  const f = useCurrentFrame();
  const durTela = Math.round(r.segundosPorTela * FPS), total = duracaoTotal(r);
  const vol = (fr: number) => interpolate(fr, [0, 12, total - 40, total], [0, r.musica?.volume ?? 0.8, r.musica?.volume ?? 0.8, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{backgroundColor: '#140e08'}}>
    <style>{fontes}</style>
    {r.telas.map((t, i) => {
      const de = i * durTela;
      return <Sequence key={i} from={de} durationInFrames={durTela + FUSAO}>
        <AbsoluteFill style={{opacity: i === 0 ? 1 : interpolate(f - de, [0, FUSAO], [0, 1], {extrapolateRight: 'clamp'})}}>
          <Foto src={t.foto} mover={t.mover} dur={durTela + FUSAO} />
          <Selo />
          <Copy tela={t} />
        </AbsoluteFill>
      </Sequence>;
    })}
    <Sequence from={r.telas.length * durTela} durationInFrames={FECHO}>
      <AbsoluteFill style={{opacity: interpolate(f - r.telas.length * durTela, [0, FUSAO], [0, 1], {extrapolateRight: 'clamp'})}}>
        <Fecho r={r} foto={r.telas[0].foto} />
      </AbsoluteFill>
    </Sequence>
    {r.musica && <Audio src={staticFile(r.musica.arquivo)} startFrom={Math.round(r.musica.inicioSeg * FPS)} volume={vol} />}
  </AbsoluteFill>;
};
