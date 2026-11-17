import { Blob, Fig, Head, Line, limb, shape } from '../parts.tsx'
import { standBody } from './body.ts'
import type { PoseDef } from './types.ts'

const DX = 6

// Hiking: a tall backpack with a bedroll on top, a walking stick in hand.
export const backpack: PoseDef = {
  ground: [66, 112],
  z: [96, 24],
  bang: [94, 16],
  bubble: [90, 18],
  Draw: () => (
    <Fig>
      {/* backpack behind the body */}
      <rect x={28} y={34} width={22} height={12} rx={6} className="smiski-ps" />
      <path d="M33,34 V46 M45,34 V46" className="smiski-ln" />
      <rect x={30} y={44} width={24} height={44} rx={6} className="smiski-p2s" />
      <rect x={33} y={66} width={15} height={14} rx={3} className="smiski-p2s" style={{ strokeWidth: '1.8px' }} />
      <Blob parts={[shape(standBody(DX))]} />
      <Head x={66} y={31} rot={4} look={[4.4, 0]} turn={0.9} />
      {/* shoulder strap */}
      <path d="M56.6,52 C60,62 60,72 57,84" className="smiski-lnb" style={{ strokeWidth: '3.4px' }} />
      {/* walking stick, then the hand on it */}
      <Blob tone="prop2" parts={[limb('M92,50 L88,111', 3.6)]} />
      <Line d="M90.2,62 L90.8,65 M89.8,67 L90.4,70" />
      <Blob parts={[limb('M77.4,54 C83,60 87,64 90.6,64.6')]} />
    </Fig>
  ),
}
