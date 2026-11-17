import { Blob, Fig, Head, limb, shape, LEG } from '../parts.tsx'
import type { PoseDef } from './types.ts'

// Straining under a dumbbell that is clearly too heavy.
export const lifting: PoseDef = {
  ground: [60, 110],
  z: [93, 62],
  bang: [90, 52],
  bubble: [52, 20],
  Draw: () => (
    <Fig>
      <g className="smiski-strain">
        {/* bar + plates behind the head */}
        <path d="M24,24.4 H96" className="smiski-lnb" style={{ strokeWidth: '4.2px' }} />
        <rect x={13} y={11.6} width={10} height={25.6} rx={3} className="smiski-p2s" />
        <rect x={7.2} y={16.4} width={7} height={16} rx={2.4} className="smiski-p2s" />
        <rect x={97} y={11.6} width={10} height={25.6} rx={3} className="smiski-p2s" />
        <rect x={105.8} y={16.4} width={7} height={16} rx={2.4} className="smiski-p2s" />
      </g>
      <Blob
        parts={[
          shape('M48.6,56 C46,66 45,78 46.4,88 C47.4,94 52,96 60,96 C68,96 72.6,94 73.6,88 C75,78 74,66 71.4,56 Z'),
          limb('M51,90 C44,92 39.6,96 39.4,101 C39.2,104 39.6,106 40,106.6', LEG),
          limb('M69,90 C76,92 80.4,96 80.6,101 C80.8,104 80.4,106 80,106.6', LEG),
          limb('M33.6,107 L44.6,107', LEG - 1),
          limb('M86.4,107 L75.4,107', LEG - 1),
        ]}
      />
      <Head x={60} y={44} />
      <g className="smiski-strain">
        <Blob parts={[limb('M48,61 C40,55 34,44 32.4,28'), limb('M72,61 C80,55 86,44 87.6,28')]} />
      </g>
      <path d="M86.4,40.6 C88.6,43.8 89.4,46 87.6,47.6 C86,48.8 84,47.6 84.4,45.4 C84.6,44 85.4,42.6 86.4,40.6 Z" className="smiski-ps smiski-aw" style={{ strokeWidth: '1.6px' }} />
    </Fig>
  ),
}
