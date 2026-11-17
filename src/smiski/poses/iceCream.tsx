import { Blob, Fig, Head, Line, limb, shape } from '../parts.tsx'
import { armLines, hangingArm, standBody } from './body.ts'
import type { PoseDef } from './types.ts'

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315]

// Summer: an ice cream cone with two scoops (one drip) under a little sun.
export const iceCream: PoseDef = {
  ground: [60, 112],
  z: [26, 40],
  bang: [86, 10],
  bubble: [36, 22],
  bubbleFlip: true,
  Draw: () => (
    <>
      <g transform="translate(19 18)">
        <circle r={7} className="smiski-p2s" style={{ strokeWidth: '1.8px' }} />
        {RAYS.map((a) => (
          <path key={a} d="M0,-10.4 V-13.4" transform={`rotate(${a})`} className="smiski-mk" />
        ))}
      </g>
      <Fig>
        <Blob parts={[shape(standBody()), limb(hangingArm(-1))]} />
        {armLines(-1).map((d) => (
          <Line key={d} d={d} />
        ))}
        <Head x={58} y={31} rot={-4} look={[3.6, 0.6]} turn={0.94} />
        {/* cone, scoops, drip */}
        <path d="M76.6,46 L90.6,46 L83.6,66 Z" className="smiski-p2s" />
        <path d="M79,50 L87,58 M84,48 L88.6,52.6 M88,50 L80.4,57.6" className="smiski-ln" style={{ strokeWidth: '1.4px' }} />
        <circle cx={83.6} cy={33.6} r={6.6} className="smiski-ps" />
        <path d="M75.4,46.4 C74,38 93.2,38 91.8,46.4 C90,48.6 89,46.4 87.6,47.6 C86.4,52 84.4,52 84,47.8 C81,48.6 77,49 75.4,46.4 Z" className="smiski-ps" />
        <Blob parts={[limb('M71.4,55 C78,60 82,62 82.4,64')]} />
      </Fig>
    </>
  ),
}
