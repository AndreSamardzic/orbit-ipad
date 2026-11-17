import { Blob, Fig, Head, Line, limb, shape } from '../parts.tsx'
import { standBody } from './body.ts'
import type { PoseDef } from './types.ts'

// Balancing a ball on its head, arms out to the sides, eyes on the ball.
export const ball: PoseDef = {
  ground: [60, 112],
  z: [86, 34],
  bang: [90, 30],
  bubble: [84, 34],
  Draw: () => (
    <Fig>
      <Blob
        parts={[
          shape(standBody(0, { top: 58, crotch: 92 })),
          limb('M48.6,64 C41,64 33,60 26,55'),
          limb('M71.4,64 C79,64 87,60 94,55'),
        ]}
      />
      <Line d="M53.8,70 C53.4,76 53.8,81 54.6,86" />
      <Line d="M66.2,70 C66.6,76 66.2,81 65.4,86" />
      <Head x={60} y={41} look={[0, -4.4]} />
      {/* the ball, with two seams */}
      <circle cx={61} cy={10.4} r={9.4} className="smiski-ps" />
      <path d="M52.6,6.6 C57,10 65,10 69.6,6.4 M54.4,16.6 C58,12.6 64.4,12.6 67.6,16.8" className="smiski-ln" />
      <g className="smiski-aw">
        <path d="M44,6 q-3,3.6 -0.4,7.4 M78,6 q3,3.6 0.4,7.4" className="smiski-mk" />
      </g>
    </Fig>
  ),
}
