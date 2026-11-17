import { Blob, Fig, Head, Line, limb, shape } from '../parts.tsx'
import { armLines, hangingArm, standBody } from './body.ts'
import type { PoseDef } from './types.ts'

const DX = -20

// Standing next to a little flip chart, pointing at a rising bar chart.
export const presenting: PoseDef = {
  ground: [40, 112],
  z: [10, 24],
  bang: [44, 14],
  bubble: [18, 20],
  bubbleFlip: true,
  Draw: () => (
    <>
      {/* easel + board */}
      <path d="M80,62 L74,110 M104,62 L110,110 M92,62 V106" className="smiski-lnb" />
      <rect x={70} y={20} width={44} height={44} rx={2.6} className="smiski-ps" />
      <rect x={77} y={46} width={7} height={12} rx={1.2} className="smiski-p2s" style={{ strokeWidth: '1.8px' }} />
      <rect x={88} y={38} width={7} height={20} rx={1.2} className="smiski-p2s" style={{ strokeWidth: '1.8px' }} />
      <rect x={99} y={29} width={7} height={29} rx={1.2} className="smiski-p2s" style={{ strokeWidth: '1.8px' }} />
      <Fig>
        <Blob parts={[shape(standBody(DX)), limb(hangingArm(-1, DX))]} />
        {armLines(-1, DX).map((d) => (
          <Line key={d} d={d} />
        ))}
        <Head x={40} y={31} rot={6} look={[4.4, -1]} turn={0.9} />
        {/* pointer stick, then the arm holding it */}
        <path d="M60,46 L80,34" className="smiski-lnb" style={{ strokeWidth: '3px' }} />
        <Blob parts={[limb('M50.4,54 C56,54 60,50 62.4,45')]} />
      </Fig>
    </>
  ),
}
