import { Blob, Fig, Head, limb, shape } from '../parts.tsx'
import { standBody } from './body.ts'
import type { PoseDef } from './types.ts'

// Shyly holding out a wrapped present with a big bow.
export const gift: PoseDef = {
  ground: [60, 112],
  z: [86, 20],
  bang: [86, 14],
  bubble: [82, 16],
  Draw: () => (
    <>
      <Fig>
        <Blob parts={[shape(standBody())]} />
        <Head x={60} y={31} rot={9} look={[0.6, 2]} />
        {/* box, ribbon, bow */}
        <rect x={44} y={66} width={32} height={26} rx={2.4} className="smiski-p2s" />
        <path d="M55.6,66 H64.4 V92 H55.6 Z" className="smiski-ps" style={{ strokeWidth: '1.8px' }} />
        <path d="M60,66 C52,56 44,60 49,65.6 Z M60,66 C68,56 76,60 71,65.6 Z" className="smiski-ps" style={{ strokeWidth: '1.8px' }} />
        <Blob parts={[limb('M48.6,55 C43,62 41,70 43.4,77'), limb('M71.4,55 C77,62 79,70 76.6,77')]} />
      </Fig>
      <g className="smiski-aw">
        <circle cx={32} cy={60} r={1.8} className="smiski-mkf" />
        <circle cx={90} cy={56} r={1.8} className="smiski-mkf" />
        <path d="M86,70 q2.4,-3 4.6,0 q2.2,3 4.6,0" className="smiski-mk" />
      </g>
    </>
  ),
}
