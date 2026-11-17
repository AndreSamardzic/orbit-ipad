import { Blob, Fig, Head, Line, limb, shape } from '../parts.tsx'
import type { PoseDef } from './types.ts'

// Sitting cross-legged, a clipboard on the knees, scribbling notes with a pencil.
export const writing: PoseDef = {
  ground: [60, 108],
  z: [84, 18],
  bang: [86, 14],
  bubble: [82, 16],
  Draw: () => (
    <Fig>
      <Blob
        parts={[
          shape('M47,50 C44,62 43,78 44.5,92 L75.5,92 C77,78 76,62 73,50 Z'),
          shape('M33,96 C37,89.6 50,89.6 60,93.6 C70,89.6 83,89.6 87,96 C91,102 87,107.6 80,107.6 L40,107.6 C33,107.6 29,102 33,96 Z'),
        ]}
      />
      <Line d="M47,100 C52,97 56,97.4 60,100 C64,97.4 68,97 73,100" />
      <Head x={60} y={35} look={[-1.4, 3.6]} />
      {/* clipboard, tilted on the lap */}
      <g transform="rotate(-8 58 82)">
        <rect x={40} y={70} width={34} height={24} rx={2.4} className="smiski-p2s" />
        <rect x={43.4} y={72.6} width={27.2} height={18.6} rx={1.4} className="smiski-ps" style={{ strokeWidth: '1.8px' }} />
        <rect x={52} y={68} width={10} height={5} rx={1.6} className="smiski-ps" style={{ strokeWidth: '1.8px' }} />
        <path d="M47,78 H66 M47,82.6 H63 M47,87.2 H58" className="smiski-ln" style={{ strokeWidth: '1.5px' }} />
      </g>
      <Blob parts={[limb('M48,56 C43.4,64 41.4,72 42.4,79', 7.2)]} />
      {/* pencil under the writing hand */}
      <Blob tone="prop2" parts={[limb('M62.6,88.6 L71.4,76.4', 3.4)]} />
      <Blob parts={[limb('M72.4,56 C77.4,64 77.6,74 70.4,80.6', 7.4)]} />
    </Fig>
  ),
}
