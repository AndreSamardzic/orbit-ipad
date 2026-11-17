import { Blob, Fig, Head, Line, limb, shape } from '../parts.tsx'
import { armLines, hangingArm, standBody } from './body.ts'
import type { PoseDef } from './types.ts'

const DX = -7
/** The umbrella sits right of centre so its shaft runs past the head, not across the face. */
const U = 16

const DROPS: [number, number][] = [
  [10, 40],
  [20, 60],
  [8, 80],
  [26, 94],
  [106, 50],
  [112, 72],
  [102, 90],
]

// Autumn: standing snug under an umbrella while it rains around it.
export const umbrella: PoseDef = {
  view: [0, -2],
  ground: [53, 112],
  z: [18, 28],
  bang: [24, 30],
  bubble: [28, 34],
  bubbleFlip: true,
  Draw: () => (
    <>
      <Fig>
        <Blob parts={[shape(standBody(DX, { top: 52, crotch: 92 })), limb(hangingArm(-1, DX, 0.8))]} />
        {armLines(-1, DX, 0.8).map((d) => (
          <Line key={d} d={d} />
        ))}
        <Head x={53} y={37} rot={-4} look={[1.4, -1.6]} />
        <g transform={`translate(${U} 0)`}>
          {/* shaft with the J handle, canopy, ribs */}
          <path d="M62,8 V64 C62,70 70,70 70,64" className="smiski-lnb" />
          <path
            d="M22,22 C24,2 98,0 100,22 C95,18.6 90,18.6 87.4,22 C83,18.6 76,18.6 74,22 C70,18.6 64,18.6 61,22 C58,18.6 52,18.6 48,22 C44.6,18.6 38,18.6 35,22 C31,18.6 26,18.6 22,22 Z"
            className="smiski-p2s"
          />
          <path d="M61,22 C59,12 60,6 61,2.4 M35,22 C38,12 46,6 54,3 M87.4,22 C84,12 76,6 68,3" className="smiski-ln" />
        </g>
        <Blob parts={[limb('M64.4,56 C70,60.6 74.4,61.4 78.6,59.6')]} />
      </Fig>
      <g className="smiski-aw">
        {DROPS.map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x},${y} q-2.4,3.6 0,4.8 q2.4,-1.2 0,-4.8 Z`} className="smiski-mk" />
        ))}
      </g>
    </>
  ),
}
