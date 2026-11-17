import { Blob, Fig, Head, Line, limb, shape, LEG } from '../parts.tsx'
import type { PoseDef } from './types.ts'

// Curled up on its side on a little pillow, fast asleep.
export const sleeping: PoseDef = {
  sleepy: true,
  view: [0, 2],
  ground: [60, 92],
  z: [60, 32],
  bang: [62, 30],
  bubble: [58, 34],
  Draw: () => (
    <>
      <path
        d="M11.4,77 C10.6,72 14.4,70.2 21,70.6 C30,71 40,71 48.6,70.4 C55,70 58,72.6 57.6,77.6 C57.2,82.6 57.6,86.2 55,89 C51.2,91.6 40.4,91.4 31,91.4 C22,91.4 15.4,91.8 13.4,88.4 C12.4,84.8 12.4,81 11.4,77 Z"
        className="smiski-ps"
      />
      <Fig>
        <Blob
          parts={[
            shape('M49,66 C57,58 70,54.6 82,56.4 C96,58.6 104.6,69 102.2,80.6 C100.6,87.6 95,91.6 87,91.6 L63,91.6 C54.6,91.6 48.6,87 48,79 Z'),
          ]}
        />
        <Line d="M101,86.4 C94.6,81.6 85.6,80.4 78.6,82.6" />
        <Blob parts={[limb('M89.6,81.6 C83,84.4 75,86 70.4,86 C66.4,86 65.6,91.2 70,91.6 L83.4,91.8', LEG + 0.4)]} />
        <Blob parts={[limb('M59.6,67 C59.4,74 56,79 49.6,81.4')]} />
        <Head x={35.4} y={57.6} rot={-26} />
      </Fig>
    </>
  ),
}
