import { Blob, Fig, Head, Line, limb } from '../parts.tsx'
import type { PoseDef } from './types.ts'

// Under a blanket, only the eyes peeking out.
export const hiding: PoseDef = {
  react: 'blanket',
  view: [0, 5],
  ground: [60, 112],
  z: [84, 22],
  bang: [86, 18],
  bubble: [82, 20],
  Draw: () => (
    <Fig>
      <Blob parts={[limb('M51,108.6 L51.4,111', 7.6), limb('M69,108.6 L68.6,111', 7.6)]} />
      <Head x={60} y={50} />
      {/* lower blanket: its top edge hides the mouth */}
      <path
        d="M38.6,58.6 C47,63 73,63 81.4,58.6 C91,68 101,90 103.6,107 C104,110.4 101,111.6 96.4,110.6 C89,109.2 83.4,111.6 75.4,110.2 C67.4,108.8 60,111.6 52.4,110.2 C44.6,108.8 37.4,111.4 27.4,110.4 C20.4,111.4 16.4,110.6 16.6,107 C19,90 29,68 38.6,58.6 Z"
        className="smiski-ps"
      />
      <Line d="M47.6,70 C45.8,82 43.4,94 41.4,106" />
      <Line d="M72.4,70 C74.2,82 76.6,94 78.6,106" />
      <circle cx={31} cy={95} r={2.4} className="smiski-inkp2" />
      <circle cx={60} cy={86} r={2.4} className="smiski-inkp2" />
      <circle cx={89} cy={95} r={2.4} className="smiski-inkp2" />
      <circle cx={47} cy={102} r={2.4} className="smiski-inkp2" />
      <circle cx={73} cy={102} r={2.4} className="smiski-inkp2" />
      {/* hood: lifts a little on hover */}
      <g className="smiski-lift" style={{ transformOrigin: '36px 62px' }}>
        <path
          d="M35.6,63.4 C29.6,42 41,22.6 60,22.6 C79,22.6 90.4,42 84.4,63.4 C81.4,54.4 72.4,46.2 60,46.2 C47.6,46.2 38.6,54.4 35.6,63.4 Z"
          className="smiski-ps"
        />
        <circle cx={60} cy={34} r={2.4} className="smiski-inkp2" />
        <circle cx={44} cy={42} r={2.4} className="smiski-inkp2" />
        <circle cx={76} cy={42} r={2.4} className="smiski-inkp2" />
      </g>
    </Fig>
  ),
}
