import { Blob, Fig, Head, limb, shape } from '../parts.tsx'
import { standBody } from './body.ts'
import type { PoseDef } from './types.ts'

// Standing, a warm mug held close in both hands, steam curling up.
export const coffee: PoseDef = {
  ground: [60, 112],
  z: [86, 20],
  bang: [86, 14],
  bubble: [82, 16],
  Draw: () => (
    <Fig>
      <Blob parts={[shape(standBody())]} />
      <Head x={60} y={31} look={[0, 1.8]} />
      {/* mug with handle */}
      <path d="M71,68.6 C80,67.4 81,79.4 71,79.6" className="smiski-ln" style={{ strokeWidth: '3.6px' }} />
      <path d="M47.6,63.4 H72.4 V77.4 Q72.4,84 65.8,84 H54.2 Q47.6,84 47.6,77.4 Z" className="smiski-ps" />
      <path d="M47.6,68.4 H72.4" className="smiski-ln" />
      <g className="smiski-aw">
        <path d="M56,60.6 q-2,-2.2 0,-4.4 q2,-2.2 0,-4.4" className="smiski-mk" />
        <path d="M64,60.6 q-2,-2.2 0,-4.4 q2,-2.2 0,-4.4" className="smiski-mk" />
      </g>
      <Blob parts={[limb('M48.6,54 C43.4,62 43.4,72 48.4,77.6'), limb('M71.4,54 C76.6,62 76.6,72 71.6,77.6')]} />
    </Fig>
  ),
}
