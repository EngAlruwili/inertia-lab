import { Composition, registerRoot } from 'remotion';
import { Main, FPS, TOTAL_FRAMES } from './Main.jsx';

const Root = () => (
  <Composition
    id="InertiaLab"
    component={Main}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={1080}
    height={1350}
  />
);

registerRoot(Root);
