import { Blob, Fig, Head, limb, shape, LEG } from '../parts.tsx'
import type { PoseDef } from './types.ts'

// Mid-stride, leaning into the run, arms pumping, speed lines behind.
export const running: PoseDef = {
  ground: [60, 110],
  z: [90, 20],
  bang: [88, 14],
  bubble: [84, 18],
  Draw: () => (
    <>
      <ellipse cx={62} cy={111} rx={20} ry={2.2} className="smiski-ink" opacity={0.16} />
      <g className="smiski-aw">
        <path d="M10,58 H24 M6,68 H22 M12,78 H24" className="smiski-mk" />
      </g>
      <Fig>
        <g transform="rotate(9 60 80)">
          {/* back arm and back leg (kicked up behind) */}
          <Blob parts={[limb('M51,58 C45,64 40,70 35.6,71')]} />
          <Blob parts={[limb('M54,86 C48,94 42,98 34,96', LEG)]} />
          <Blob
            parts={[
              shape('M48.6,50 C45.4,60 44.4,76 47.4,86 C49.6,92.6 70.4,92.6 72.6,86 C75.6,76 74.6,60 71.4,50 Z'),
              limb('M65,86 C71,92 77,96 79,104', LEG),
              limb('M79,104 L86,104', LEG - 0.6),
            ]}
          />
        </g>
        <Head x={64} y={35} rot={10} look={[4.6, 0.4]} turn={0.9} />
        <Blob parts={[limb('M72,62 C79,68 85,66 88,58')]} />
      </Fig>
    </>
  ),
}
