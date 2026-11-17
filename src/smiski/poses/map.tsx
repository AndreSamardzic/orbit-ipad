import { Blob, Fig, Head, limb, shape } from '../parts.tsx'
import { standBody } from './body.ts'
import type { PoseDef } from './types.ts'

// Holding a big unfolded map, head tilted, not quite sure where it is.
export const map: PoseDef = {
  ground: [60, 112],
  z: [88, 22],
  bang: [88, 16],
  bubble: [84, 18],
  Draw: () => (
    <Fig>
      <Blob parts={[shape(standBody())]} />
      <Head x={60} y={31} rot={-11} look={[-1, 2.4]} />
      {/* four folded panels, alternating light and shade */}
      <path d="M24,58 L42,55.4 L42,87.4 L24,90 Z" className="smiski-ps" />
      <path d="M42,55.4 L60,58 L60,90 L42,87.4 Z" className="smiski-p2s" />
      <path d="M60,58 L78,55.4 L78,87.4 L60,90 Z" className="smiski-ps" />
      <path d="M78,55.4 L96,58 L96,90 L78,87.4 Z" className="smiski-p2s" />
      <path d="M30,82 C38,74 46,80 52,72 C58,64 66,76 74,68 C80,62 84,70 88,66" className="smiski-mk" strokeDasharray="2.6 3" />
      <path d="M85.6,63.6 L90.4,68.4 M90.4,63.6 L85.6,68.4" className="smiski-mk" />
      <Blob parts={[limb('M23.4,61 L24.4,67', 6.6), limb('M96.6,61 L95.6,67', 6.6)]} />
      <g className="smiski-aw">
        <path d="M88,12.4 C88,8.6 95,8.6 95,12.6 C95,15.6 91.4,15.8 91.4,19" className="smiski-mk" />
        <circle cx={91.4} cy={23.4} r={1.5} className="smiski-mkf" />
      </g>
    </Fig>
  ),
}
