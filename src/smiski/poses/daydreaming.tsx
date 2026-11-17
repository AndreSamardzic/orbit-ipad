import { Blob, Fig, Head, limb, shape, LEG } from '../parts.tsx'
import type { PoseDef } from './types.ts'

// Lying on its back, one hand tucked behind the head, a leg crossed over the
// raised knee, watching a cloud drift by.
export const daydreaming: PoseDef = {
  sleepy: true,
  view: [0, 4],
  ground: [64, 100],
  z: [56, 58],
  bang: [58, 56],
  bubble: [54, 58],
  Draw: () => (
    <>
      <g className="smiski-aw">
        <path
          d="M84,34 C80.4,34 78.6,31 80,28.4 C78.6,24 83,21 86.6,23 C88,18.6 94.6,18 96.6,22.4 C100.6,21 104,24.6 102.6,28.2 C105,30 104,34 100.6,34 Z"
          className="smiski-ps"
          style={{ strokeWidth: '1.8px' }}
        />
      </g>
      <Fig>
        {/* raised knee, behind the body */}
        <Blob parts={[limb('M76,96 C80,86 84,76 88.6,72 C92,70.6 95,82 97.6,97', LEG), limb('M97.6,97 L103.6,98.4', LEG - 0.6)]} />
        {/* elbow up, the hand tucked behind the head */}
        <Blob parts={[limb('M50,86 C50,72 48,60 42.6,55.4 C37,51.6 31.6,55 29.4,60')]} />
        <Blob
          parts={[
            shape('M44,84 C46,78 56,76.4 66,78 C76,79.6 84,83 85,90 C86,96.6 82,100.4 75,100.4 L48,100.4 C42,100.4 40,96 40.6,91 Z'),
          ]}
        />
        {/* the crossed leg resting on the knee, foot in the air */}
        <Blob parts={[limb('M78,90 C82,82 86,75 90.6,70.4 C96,68.6 102,68.4 107.6,64.4', LEG)]} />
        <Blob parts={[limb('M55,85 C61,89 67,91 73,89')]} />
        <Head x={30} y={81} rot={-14} look={[2.6, -5]} />
      </Fig>
    </>
  ),
}
