import { Blob, Fig, Head, limb, shape } from '../parts.tsx'
import { standBody } from './body.ts'
import type { PoseDef } from './types.ts'

// Carrying a stack of boxes that hides the lower half of its face.
export const carrying: PoseDef = {
  ground: [60, 112],
  z: [86, 18],
  bang: [88, 14],
  bubble: [84, 16],
  Draw: () => (
    <Fig>
      <Blob parts={[shape(standBody())]} />
      <Head x={60} y={30} />
      <g transform="rotate(-3 60 52)">
        <rect x={39} y={38.4} width={42} height={24} rx={2.6} className="smiski-p2s" />
        <path d="M55,38.4 V62.4 M65,38.4 V62.4" className="smiski-ln" />
        <path d="M55,38.4 H65 V48 H55 Z" className="smiski-ps" style={{ strokeWidth: '1.8px' }} />
      </g>
      <rect x={35} y={62} width={50} height={28} rx={2.6} className="smiski-p2s" />
      <path d="M35,70 H85" className="smiski-ln" />
      <path d="M54,62 H66 V74 H54 Z" className="smiski-ps" style={{ strokeWidth: '1.8px' }} />
      <Blob parts={[limb('M34,76 L34.6,82', 6.8), limb('M86,76 L85.4,82', 6.8)]} />
    </Fig>
  ),
}
