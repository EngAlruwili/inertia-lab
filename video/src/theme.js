import { loadFont as loadCairo } from '@remotion/google-fonts/Cairo';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';

export const arabic = loadCairo('normal', { weights: ['600', '700', '800'], subsets: ['arabic', 'latin'] }).fontFamily;
export const sans = loadInter('normal', { weights: ['400', '600', '800'], subsets: ['latin'] }).fontFamily;
export const mono = loadMono('normal', { weights: ['500', '700'], subsets: ['latin'] }).fontFamily;

export const C = {
  bg: '#070b12',
  panel: '#0e1520',
  line: '#1f2b3d',
  text: '#e6edf6',
  muted: '#8a9ab0',
  accent: '#36d6ff',
  none: '#ff5a5f',
  gfl: '#ffb020',
  gfm: '#2ee6a6',
  sun: '#ffd166',
};
