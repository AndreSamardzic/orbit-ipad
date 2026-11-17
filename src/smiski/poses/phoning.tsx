import { Blob, Fig, Head, Line, limb, shape } from '../parts.tsx'
import { armLines, hangingArm, standBody } from './body.ts'
import type { PoseDef } from './types.ts'

// Standing, a little phone held to the side of the head, listening.
export const phoning: PoseDef = {
  ground: [60, 112],
  z: [20, 26],
  bang: [30, 18],
  bubble: [36, 20],
  bubbleFlip: true,
  Draw: () => (
    <Fig>
      <Blob parts={[shape(standBody()), limb(hangingArm(-1))]} />
      {armLines(-1).map((d) => (
        <Line key={d} d={d} />
      ))}
      <Head x={58} y={31} rot={-7} look={[-1.6, 0.4]} />
      {/* phone against the cheek */}
      <g transform="rotate(14 82 34)">
        <rect x={77} y={21} width={10} height={20} rx={2.6} className="smiski-p2s" />
        <path d="M80,24.6 H84" className="smiski-ln" />
      </g>
      <Blob parts={[limb('M70.4,54 C79,58 86.4,54 84.6,42')]} />
      <g className="smiski-aw">
        <path d="M93,20 q3,3.4 0.2,7.4" className="smiski-mk" />
        <path d="M97.6,16.4 q4.6,5.8 0.4,12.6" className="smiski-mk" />
      </g>
    </Fig>
  ),
}
