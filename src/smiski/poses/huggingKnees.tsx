import { Blob, Fig, Head, limb, shape, LEG } from '../parts.tsx'
import type { PoseDef } from './types.ts'

// Sitting with knees pulled up, arms wrapped around them, chin over the knees.
export const huggingKnees: PoseDef = {
  view: [0, 5],
  ground: [60, 109],
  z: [84, 24],
  bang: [84, 20],
  bubble: [80, 22],
  Draw: () => (
    <Fig>
      <Blob
        parts={[
          shape('M41,66 C34.5,75 32.6,94 36,103.6 C37.6,107.6 46,108.6 60,108.6 C74,108.6 82.4,107.6 84,103.6 C87.4,94 85.5,75 79,66 Z'),
        ]}
      />
      <Head x={60} y={42} />
      <Blob parts={[limb('M52,65.5 C51.6,78 51.2,90 51,102', LEG + 0.6), limb('M68,65.5 C68.4,78 68.8,90 69,102', LEG + 0.6)]} />
      <Blob parts={[limb('M37.6,72 C38.6,84 46,89.4 55.6,88.4'), limb('M82.4,72 C81.4,84 74,89.4 64.4,88.4')]} />
    </Fig>
  ),
}
