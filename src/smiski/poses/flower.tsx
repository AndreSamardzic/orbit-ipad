import { Blob, Fig, Head, Line, limb, shape } from '../parts.tsx'
import { armLines, hangingArm, standBody } from './body.ts'
import type { PoseDef } from './types.ts'

const PETALS = [0, 72, 144, 216, 288]

// Spring: holding up a big flower and leaning in to smell it.
export const flower: PoseDef = {
  ground: [60, 112],
  z: [20, 26],
  bang: [28, 18],
  bubble: [32, 20],
  bubbleFlip: true,
  Draw: () => (
    <Fig>
      <Blob parts={[shape(standBody()), limb(hangingArm(-1))]} />
      {armLines(-1).map((d) => (
        <Line key={d} d={d} />
      ))}
      <Head x={57} y={32} rot={10} look={[3.4, 1.6]} turn={0.92} />
      {/* stem with a leaf, blossom */}
      <path d="M74,76 C76,64 78,54 82,42" className="smiski-lnb" style={{ fill: 'none' }} />
      <path d="M77.4,60 C82,56 88,57 89.4,60 C86,63 81,63.4 77.4,60 Z" className="smiski-p2s" style={{ strokeWidth: '1.8px' }} />
      <g transform="translate(83 36)">
        {PETALS.map((a) => (
          <ellipse key={a} cx={0} cy={-6.6} rx={4.4} ry={5.6} transform={`rotate(${a})`} className="smiski-ps" style={{ strokeWidth: '1.8px' }} />
        ))}
        <circle r={4} className="smiski-p2s" style={{ strokeWidth: '1.8px' }} />
      </g>
      <Blob parts={[limb('M71.4,55 C77,61 78,68 74.6,73.4')]} />
    </Fig>
  ),
}
