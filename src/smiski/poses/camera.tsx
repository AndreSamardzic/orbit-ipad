import { Blob, Fig, Head, limb, shape } from '../parts.tsx'
import { standBody } from './body.ts'
import type { PoseDef } from './types.ts'

// Snapping a holiday photo: a camera held up in front of one eye, a flash.
export const camera: PoseDef = {
  ground: [60, 112],
  z: [18, 26],
  bang: [28, 16],
  bubble: [34, 18],
  bubbleFlip: true,
  Draw: () => (
    <>
      <Fig>
        <Blob parts={[shape(standBody())]} />
        <Head x={56} y={31} rot={-4} look={[-2.6, 0]} />
        {/* camera: body, top bump, lens */}
        <rect x={66} y={27.4} width={9} height={5} rx={1.6} className="smiski-p2s" style={{ strokeWidth: '1.8px' }} />
        <rect x={56} y={31.4} width={28} height={18} rx={3.2} className="smiski-p2s" />
        <circle cx={67} cy={40.4} r={6.4} className="smiski-ps" />
        <circle cx={67} cy={40.4} r={2.8} className="smiski-ls" />
        <circle cx={79.4} cy={35.4} r={1.4} className="smiski-mkf" />
        <Blob parts={[limb('M49,55 C46,51 49.4,46.4 55,46.4'), limb('M71.4,55 C79,56 85,52 84.6,46.4')]} />
      </Fig>
      <g className="smiski-aw" transform="translate(96 22)">
        <path d="M0,-7.6 Q1.2,-1.2 7.6,0 Q1.2,1.2 0,7.6 Q-1.2,1.2 -7.6,0 Q-1.2,-1.2 0,-7.6 Z" className="smiski-fs smiski-twinkle" style={{ strokeWidth: '1.8px' }} />
      </g>
    </>
  ),
}
