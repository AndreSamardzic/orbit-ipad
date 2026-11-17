import { Blob, Fig, Head, limb, shape, LEG } from '../parts.tsx'
import type { PoseDef } from './types.ts'

const r2 = (n: number) => Math.round(n * 100) / 100
const twists = Array.from({ length: 14 }, (_, i) => `M75.4,${r2(-2 + i * 9)} L80.6,${r2(2.6 + i * 9)}`).join(' ')

// Hanging on a rope, hands up, legs wrapped around it.
export const climbing: PoseDef = {
  view: [-6, 0],
  ground: [62, 112],
  z: [17, 27],
  bang: [26, 20],
  bubble: [26, 22],
  bubbleFlip: true,
  Draw: () => (
    <>
      {/* the rope runs out of the frame top and bottom: a nested viewport clips it */}
      <svg x={-30} y={0} width={180} height={120} overflow="hidden">
        <Blob tone="prop2" parts={[limb('M78,-4 L78,124', 6.2)]} />
        <path d={twists} className="smiski-ln" style={{ strokeWidth: '1.5px' }} />
      </svg>
      <Fig>
        <Blob parts={[limb('M57,93 C65,97 71,101 75.4,105', LEG)]} />
        <Blob
          parts={[
            shape('M42,62 C38,72 39,86 44,92.4 C48,97 56,97.4 61,93.4 C66,88.4 67,74 64,62 Z'),
            limb('M59,90.6 C67,88.6 75,87.6 81,89.6 C84,90.6 84,94.6 79,95.6', LEG),
          ]}
        />
        <Head x={46} y={45} look={[5.4, -2.8]} turn={0.86} />
        <Blob parts={[limb('M59,64 C65,59.4 70.6,57 75.6,57.6'), limb('M62,62 C66.4,50 69.6,40 74.6,31.4')]} />
      </Fig>
    </>
  ),
}
