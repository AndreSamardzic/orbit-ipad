import { Blob, Fig, Head, Line, limb, shape } from '../parts.tsx'
import { standBody } from './body.ts'
import type { PoseDef } from './types.ts'

// Mid-hop over a skipping rope that swings under the feet.
export const jumpRope: PoseDef = {
  ground: [60, 112],
  z: [92, 22],
  bang: [86, 10],
  bubble: [82, 12],
  Draw: () => (
    <>
      <ellipse cx={60} cy={113} rx={14} ry={2} className="smiski-ink" opacity={0.16} />
      <Fig>
        {/* the rope swings behind the legs and under the feet */}
        <path d="M33,84 C30,117 90,117 87,84" className="smiski-lnb" />
        <Blob
          parts={[
            shape(standBody(0, { top: 42, crotch: 86, foot: 103 })),
            limb('M48.6,52 C42,58 37,66 34.4,74'),
            limb('M71.4,52 C78,58 83,66 85.6,74'),
          ]}
        />
        <Line d="M53.8,58 C53.4,64 53.8,70 54.6,75" />
        <Line d="M66.2,58 C66.6,64 66.2,70 65.4,75" />
        <Head x={60} y={27} look={[0, 1]} />
        {/* handles */}
        <rect x={29.6} y={73} width={7} height={11} rx={3} className="smiski-p2s" />
        <rect x={83.4} y={73} width={7} height={11} rx={3} className="smiski-p2s" />
      </Fig>
      <g className="smiski-aw">
        <path d="M18,96 q-3,4 0,8 M102,96 q3,4 0,8" className="smiski-mk" />
      </g>
    </>
  ),
}
