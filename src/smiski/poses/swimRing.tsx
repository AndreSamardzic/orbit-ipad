import { Blob, Fig, Head, limb, shape } from '../parts.tsx'
import { standBody } from './body.ts'
import type { PoseDef } from './types.ts'

// Ring: centre (60, 80), outer radii 32 x 13, inner 19 x 6.
const BACK = 'M28,80 A32,13 0 0,1 92,80 L79,80 A19,6 0 0,0 41,80 Z'
const FRONT = 'M28,80 A32,13 0 0,0 92,80 L79,80 A19,6 0 0,1 41,80 Z'

// Beach day: standing in the shallows inside a fat striped swim ring.
export const swimRing: PoseDef = {
  ground: [60, 112],
  z: [88, 22],
  bang: [88, 16],
  bubble: [84, 18],
  Draw: () => (
    <>
      <Fig>
        {/* back half of the ring, the body, then the front half with stripes */}
        <path d={BACK} className="smiski-ps" />
        <Blob parts={[shape(standBody())]} />
        <Head x={60} y={31} look={[0, 0.8]} />
        <path d={FRONT} className="smiski-ps" />
        <path d="M44,84.4 L42.6,90.4 M60,87.4 V92 M76,84.4 L77.4,90.4" className="smiski-ln" style={{ strokeWidth: '4.6px', stroke: 'var(--smiski-prop-2, #e8d9c4)' }} />
        <Blob parts={[limb('M48.6,56 C42,61 37.4,67 35.4,73.6'), limb('M71.4,56 C78,61 82.6,67 84.6,73.6')]} />
      </Fig>
      {/* water around the legs */}
      <g className="smiski-aw">
        <path d="M14,101 q4,-3 8,0 t8,0 M90,101 q4,-3 8,0 t8,0 M30,109 q4,-3 8,0 t8,0 t8,0 t8,0 t8,0 t8,0" className="smiski-mk" />
      </g>
    </>
  ),
}
