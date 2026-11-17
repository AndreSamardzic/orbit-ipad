import { Blob, Fig, Head, Line, limb, shape, ARM } from '../parts.tsx'
import { armLines, hangingArm, standBody } from './body.ts'
import type { PoseDef } from './types.ts'

// Standing, one arm up, waving hello.
export const waving: PoseDef = {
  react: 'wave',
  ground: [60, 112],
  z: [24, 24],
  bang: [86, 14],
  bubble: [82, 16],
  Draw: () => (
    <Fig>
      <Blob
        parts={[
          shape(standBody()),
          limb(hangingArm(-1)),
          limb('M71.4,53 C80,52 86.6,43.6 90,29', ARM, { cls: 'smiski-wave', origin: [71.4, 54] }),
        ]}
      />
      {armLines(-1).map((d) => (
        <Line key={d} d={d} />
      ))}
      <g className="smiski-wave smiski-aw" style={{ transformOrigin: '71.4px 54px' }}>
        <path d="M99,23.5 q3,4.2 0.4,8.6" className="smiski-mk" />
        <path d="M103.2,20 q4.4,6.6 0.6,13.6" className="smiski-mk" />
      </g>
      <Head x={60} y={31} rot={4} />
    </Fig>
  ),
}
