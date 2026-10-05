// Roteiro do piloto: Cabana Master (fatos de contexto/hotel-operacional.md). "destaque" = palavra que acende na cor da marca.
export type Tela = {foto: string; texto: string; destaque?: string; apoio?: string; contador?: {de: number; ate: number; sufixo: string}; mover?: 'zoom' | 'esquerda' | 'direita'};
export type Roteiro = {telas: Tela[]; segundosPorTela: number; fecho: {linha1: string; linha2: string}; musica?: {arquivo: string; inicioSeg: number; volume: number}};

export const roteiro: Roteiro = {
  segundosPorTela: 2.4,
  telas: [
    {foto: 'fotos/externa.jpg', texto: 'Cabana Master', destaque: 'Master', apoio: 'a maior acomodação do Cabanas', mover: 'zoom'},
    {foto: 'fotos/casal.jpg', texto: 'dois ambientes', contador: {de: 0, ate: 85, sufixo: ' m²'}, mover: 'esquerda'},
    {foto: 'fotos/banheira.jpg', texto: 'banheira de hidromassagem para\u00a02', destaque: 'hidromassagem', apoio: 'pétalas: decoração especial (opcional)', mover: 'zoom'},
    {foto: 'fotos/solteiro.jpg', texto: 'para 2 a\u00a05 pessoas', destaque: 'a\u00a05', mover: 'direita'},
    {foto: 'fotos/balanco.jpg', texto: 'varanda com balanço', destaque: 'balanço', mover: 'esquerda'},
  ],
  fecho: {linha1: 'BONITO - MS', linha2: 'Reserve pelo link da bio'},
  musica: {arquivo: 'musica.mp3', inicioSeg: 98, volume: 0.8},
};
