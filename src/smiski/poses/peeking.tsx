import { Blob, Fig, Head, Line, limb } from '../parts.tsx'
import type { PoseDef } from './types.ts'

// Peeking round the edge of a wall: head and one hand, a foot at the bottom.
export const peeking: PoseDef = {
  react: 'peek',
  view: [18, 0],
  ground: [70, 112],
  z: [30, 24],
  bang: [34, 22],
  bubble: [58, 25],
  bubbleFlip: true,
  Draw: () => (
    <>
      <Fig>
        <Blob parts={[limb('M78,109.4 L71.4,109.6', 8)]} />
        <g className="smiski-lean" style={{ transformOrigin: '76px 112px' }}>
          <Head x={64} y={48} rot={-14} look={[-4.4, 0]} />
        </g>
      </Fig>
      <path d="M75,8 Q75,4.6 78.4,4.6 H113 Q116,4.6 116,8 V112.4 Q116,115.4 113,115.4 H78.4 Q75,115.4 75,112.4 Z" className="smiski-ps" />
      <Line d="M81,12 V108" />
      <Fig>
        <g className="smiski-lean" style={{ transformOrigin: '76px 112px' }}>
          <Blob parts={[limb('M80.4,70.6 C78,70.2 75.4,70.6 73.6,72.2', 7.8)]} />
          <Line d="M76.6,68.4 q-1.4,2.6 -0.2,5" />
        </g>
      </Fig>
    </>
  ),
}
