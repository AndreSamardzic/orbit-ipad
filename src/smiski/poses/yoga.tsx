import { Blob, Fig, Head, Line, limb, shape } from '../parts.tsx'
import type { PoseDef } from './types.ts'

// Lotus pose, eyes closed, hands resting on the knees.
export const yoga: PoseDef = {
  sleepy: true,
  zzz: false,
  ground: [60, 106],
  z: [84, 18],
  bang: [84, 14],
  bubble: [82, 16],
  Draw: () => (
    <Fig>
      <Blob
        parts={[
          shape('M48,48 C45,60 41,74 36,90 L84,90 C79,74 75,60 72,48 Z'),
          shape('M27,94.6 C23.6,99 25.6,106 33,106 L87,106 C94.4,106 96.4,99 93,94.6 C87.6,88 72,87.6 60,91.4 C48,87.6 32.4,88 27,94.6 Z'),
          limb('M49.6,54 C43,64 37.6,76 33.4,88'),
          limb('M70.4,54 C77,64 82.4,76 86.6,88'),
        ]}
      />
      <Line d="M43,98.4 C48,96 54.6,96.6 60,99.6 C65.4,96.6 72,96 77,98.4" />
      <Line d="M54.4,58 C52,68 47.4,78 43.6,85.4" />
      <Line d="M65.6,58 C68,68 72.6,78 76.4,85.4" />
      <Head x={60} y={31} />
    </Fig>
  ),
}
