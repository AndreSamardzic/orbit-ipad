import { Blob, Fig, Head, limb, shape } from '../parts.tsx'
import type { PoseDef } from './types.ts'

// A big one sitting and hugging a little one close.
export const hugging: PoseDef = {
  ground: [60, 109],
  z: [84, 18],
  bang: [86, 14],
  bubble: [82, 16],
  Draw: () => (
    <Fig>
      <Blob
        parts={[
          shape('M43,50 C37,62 34,84 36,100 C37,106 44,108.6 60,108.6 C76,108.6 83,106 84,100 C86,84 83,62 77,50 Z'),
          limb('M40,104 L33.6,105.4', 9),
          limb('M80,104 L86.4,105.4', 9),
        ]}
      />
      <Head x={60} y={33} look={[0, 2]} />
      {/* the little one */}
      <Blob
        parts={[
          shape('M53.4,82 C51,88 50.6,96 51.6,101 C52.2,104.6 55,105.8 60,105.8 C65,105.8 67.8,104.6 68.4,101 C69.4,96 69,88 66.6,82 Z'),
        ]}
      />
      <Head x={60} y={73} r={13.6} />
      <Blob parts={[limb('M44.6,58 C38,72 42,90 53.4,93.2'), limb('M75.4,58 C82,72 78,90 66.6,93.2')]} />
    </Fig>
  ),
}
