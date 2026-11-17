import { Blob, Fig, Head, Line, limb, shape, ARM } from '../parts.tsx'
import { standBody } from './body.ts'
import type { PoseDef } from './types.ts'

// Big morning stretch: arms reaching high overhead, up on tiptoes, yawning.
export const stretching: PoseDef = {
  ground: [60, 112],
  z: [92, 40],
  bang: [92, 36],
  bubble: [88, 40],
  Draw: () => (
    <Fig>
      <g transform="rotate(-5 60 111)">
        <Blob
          parts={[
            shape(standBody(0, { top: 54, crotch: 91 })),
            limb('M49.6,60.6 C38.4,57 31.6,44 33.6,30 C34.4,23.6 36.4,17.6 38.6,12.6', ARM),
            limb('M70.4,60.6 C81.6,57 88.4,44 86.4,30 C85.6,23.6 83.6,17.6 81.4,12.6', ARM),
          ]}
        />
        <Line d="M53.8,66.4 C53.4,73 53.8,79 54.6,84" />
        <Line d="M66.2,66.4 C66.6,73 66.2,79 65.4,84" />
        <Head x={60} y={39} rot={-3} look={[0, -2.6]} mouth="o" />
      </g>
    </Fig>
  ),
}
