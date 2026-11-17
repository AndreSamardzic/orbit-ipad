import { Blob, Fig, Head, limb, shape } from '../parts.tsx'
import { standBody } from './body.ts'
import type { PoseDef } from './types.ts'

const FLAKES: [number, number][] = [
  [16, 20],
  [24, 50],
  [12, 78],
  [104, 66],
]
const flake = 'M0,-3.6 V3.6 M-3.1,-1.8 L3.1,1.8 M-3.1,1.8 L3.1,-1.8'

// Winter: bobble hat and scarf, winding up to throw a snowball.
export const snowball: PoseDef = {
  ground: [60, 112],
  z: [94, 40],
  bang: [96, 38],
  bubble: [38, 16],
  bubbleFlip: true,
  Draw: () => (
    <>
      <Fig>
        <Blob
          parts={[
            shape(standBody()),
            limb('M48.6,56 C42,60 38,62 33.4,60.6'),
            limb('M71.4,54 C80,51 86,42 85,31'),
          ]}
        />
        <Head x={58} y={31} rot={-6} look={[-2, 0.6]}>
          {/* bobble hat in the head's own frame */}
          <path d="M-19.6,-6 C-19,-24 19,-24 19.6,-6 Z" className="smiski-ps" />
          <path d="M-20.6,-6.6 H20.6 V-1.6 H-20.6 Z" className="smiski-p2s" style={{ strokeWidth: '1.8px' }} />
          <circle cx={0} cy={-22.6} r={4.4} className="smiski-p2s" style={{ strokeWidth: '1.8px' }} />
        </Head>
        {/* scarf round the neck with a dangling end */}
        <path d="M41,49 Q60,58 77,49 L76.4,55.6 Q60,64 41.6,55.6 Z" className="smiski-p2s" />
        <path d="M47,57 L44.6,74 L51.4,74.6 L53,59.4 Z" className="smiski-p2s" />
        <path d="M46,76 V79 M48.6,76.2 V79.2 M51,76.4 V79.4" className="smiski-ln" style={{ strokeWidth: '1.5px' }} />
        <circle cx={85.6} cy={25.6} r={6.2} className="smiski-ps" />
      </Fig>
      <g className="smiski-aw">
        {FLAKES.map(([x, y]) => (
          <path key={`${x}-${y}`} d={flake} transform={`translate(${x} ${y})`} className="smiski-mk" style={{ strokeWidth: '1.5px' }} />
        ))}
      </g>
    </>
  ),
}
