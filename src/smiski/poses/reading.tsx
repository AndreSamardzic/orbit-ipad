import { Blob, Fig, Head, Line, limb, shape } from '../parts.tsx'
import type { PoseDef } from './types.ts'

// Sitting cross-legged, nose in an open book.
export const reading: PoseDef = {
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
      <Head x={60} y={35} look={[0, 2.6]} />
      {/* open book, covers towards us, pages peeking over the top */}
      <path d="M35.5,62.4 Q47,60.2 58.6,64.8 L61.4,64.8 Q73,60.2 84.5,62.4 L85,66 Q73,64 61.4,68.4 L58.6,68.4 Q47,64 35,66 Z" className="smiski-ps" />
      <path d="M35,65.4 Q47,63.4 58.6,68 L58.6,88.6 Q47,84.4 36.2,85.6 Z" className="smiski-p2s" />
      <path d="M85,65.4 Q73,63.4 61.4,68 L61.4,88.6 Q73,84.4 83.8,85.6 Z" className="smiski-p2s" />
      <path d="M58.6,68 L61.4,68 L61.4,88.6 L58.6,88.6 Z" className="smiski-ls" />
      <Blob parts={[limb('M34.6,72.6 L35.4,79.6', 6.4), limb('M85.4,72.6 L84.6,79.6', 6.4)]} />
    </Fig>
  ),
}
