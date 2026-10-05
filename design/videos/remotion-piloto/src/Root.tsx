import React from 'react';
import {Composition} from 'remotion';
import {ReelsCopy, duracaoTotal} from './ReelsCopy';
import {roteiro} from './roteiro';

export const RemotionRoot: React.FC = () => (
  <Composition id="ReelsCopy" component={ReelsCopy} durationInFrames={duracaoTotal(roteiro)} fps={30} width={1080} height={1920} defaultProps={{roteiro}} />
);
