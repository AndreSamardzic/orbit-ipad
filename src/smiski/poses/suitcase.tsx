import { Blob, Fig, Head, Line, limb, shape } from '../parts.tsx'
import { armLines, hangingArm, standBody } from './body.ts'
import type { PoseDef } from './types.ts'

const DX = 12

// Off on a trip: walking along, pulling a rolling suitcase behind.
export const suitcase: PoseDef = {
  ground: [66, 112],
  z: [96, 22],
  bang: [96, 16],
  bubble: [92, 18],
  Draw: () => (
    <>
      {/* suitcase: shell, stripe, sticker, wheels */}
      <g transform="rotate(-6 30 108)">
        <rect x={14} y={70} width={30} height={36} rx={4} className="smiski-p2s" />
        <path d="M14,80 H44" className="smiski-ln" />
        <circle cx={34} cy={93} r={4} className="smiski-ps" style={{ strokeWidth: '1.8px' }} />
        <circle cx={20} cy={109} r={2.6} className="smiski-ls" />
        <circle cx={38} cy={109} r={2.6} className="smiski-ls" />
      </g>
      <path d="M38,70.6 L48.6,58.6" className="smiski-lnb" style={{ strokeWidth: '3px' }} />
      <Fig>
        <Blob parts={[limb('M61,54 C56,58 52,60 48.4,59.4')]} />
        <Blob parts={[shape(standBody(DX)), limb(hangingArm(1, DX, 1))]} />
        {armLines(1, DX, 1).map((d) => (
          <Line key={d} d={d} />
        ))}
        <Head x={72} y={31} rot={3} look={[4, 0]} turn={0.9} />
      </Fig>
    </>
  ),
}
