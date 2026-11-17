import { Blob, Fig, Head, limb, shape, LEG } from '../parts.tsx'
import type { PoseDef } from './types.ts'

// Sitting on the floor, legs stretched out, looking ahead.
export const sitting: PoseDef = {
  view: [0, 6],
  ground: [60, 108],
  z: [66, 26],
  bang: [68, 24],
  bubble: [66, 26],
  Draw: () => (
    <Fig>
      <Blob parts={[limb('M40,66 C34,78 30,90 29,101', 7.6)]} />
      <Blob
        parts={[
          shape('M38.6,58 C35,72 33.4,90 36,101 C37.4,105.4 42,106.6 50,106.6 L57.4,106.6 C61,96 61,72 57,58 Z'),
          limb('M52,100.2 L84,100.8', LEG + 1.2),
          limb('M83,100.8 C88.6,100.8 90.6,98.4 91,93.4', 8.6),
        ]}
      />
      <Blob parts={[limb('M53,63 C57,72 62,82 68,89')]} />
      <Head x={46} y={46} look={[5, 0]} turn={0.9} />
    </Fig>
  ),
}
