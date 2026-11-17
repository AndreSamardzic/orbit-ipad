import { Blob, Fig, Head, Line, limb, shape } from '../parts.tsx'
import { armLines, hangingArm, standBody } from './body.ts'
import type { PoseDef } from './types.ts'

// Standing, head tilted back, gazing up at a little sparkle.
export const lookingUp: PoseDef = {
  ground: [60, 112],
  z: [84, 20],
  bang: [86, 16],
  bubble: [38, 22],
  bubbleFlip: true,
  Draw: () => (
    <>
      <Fig>
        <Blob parts={[shape(standBody()), limb(hangingArm(-1, 0, 1.4)), limb(hangingArm(1, 0, 1.4))]} />
        {[...armLines(-1, 0, 1.4), ...armLines(1, 0, 1.4)].map((d) => (
          <Line key={d} d={d} />
        ))}
        <Head x={60} y={31} rot={-9} look={[3.6, -8.8]} />
      </Fig>
      <g className="smiski-aw" transform="translate(96 13)">
        <path d="M0,-7.6 Q1.2,-1.2 7.6,0 Q1.2,1.2 0,7.6 Q-1.2,1.2 -7.6,0 Q-1.2,-1.2 0,-7.6 Z" className="smiski-fs smiski-twinkle" style={{ strokeWidth: '1.8px' }} />
      </g>
    </>
  ),
}
