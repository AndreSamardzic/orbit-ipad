import { Blob, Fig, Head, limb, shape, LEG } from '../parts.tsx'
import type { PoseDef } from './types.ts'

// Lying on its side, head propped up on one hand, legs stretched out.
export const lounging: PoseDef = {
  sleepy: true,
  view: [0, 6],
  ground: [64, 101],
  z: [52, 30],
  bang: [54, 28],
  bubble: [52, 32],
  Draw: () => (
    <Fig>
      <Blob
        parts={[
          shape('M40,78 C42,72 52,70 64,72.5 C74,74.5 82,78 84,86 C86,94 84,100.5 76,100.5 L46,100.5 C38,100.5 35,94 36,88 C36.6,84 38,80 40,78 Z'),
          limb('M80,95 L109,96.5', LEG),
        ]}
      />
      <Blob parts={[limb('M80,87 C86,82 92,78 96,78.6 C100,79.4 103,86 106,92', LEG)]} />
      <Blob parts={[limb('M50,76 C58,78 66,81 72,84')]} />
      <Blob parts={[limb('M42,80 C36,86 30,92 28.5,96 C27,92 26.5,84 28.5,74')]} />
      <Head x={34} y={53} rot={-12} />
    </Fig>
  ),
}
