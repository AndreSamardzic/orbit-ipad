import { Blob, Fig, Head, limb, shape, LEG } from '../parts.tsx'
import type { PoseDef } from './types.ts'

// Sitting on the floor at a tiny laptop, hands on the keys.
export const typing: PoseDef = {
  react: 'type',
  view: [0, 5],
  ground: [56, 108],
  z: [56, 24],
  bang: [58, 22],
  bubble: [56, 24],
  Draw: () => (
    <>
      <Fig>
        <Blob parts={[limb('M42,68 C48,76 56,84 64,89', 7.2, { cls: 'smiski-tap2' })]} />
        <Blob
          parts={[
            shape('M27,60 C23.4,73 22.6,90 25.6,101 C27,105.6 31.6,106.8 40,106.8 L50,106.8 C53.6,96 53.6,73 49.4,60 Z'),
            limb('M44,101.4 C52,101.8 60,102 68,102.2', LEG),
          ]}
        />
      </Fig>
      {/* laptop: lid leaning back, base on the floor */}
      <path d="M78.4,99.6 L86.6,66.8 Q87.4,63.8 90.4,64.4 L95.4,65.6 Q98.2,66.4 97.4,69.4 L89.2,100.6 Z" className="smiski-p2s" />
      <path d="M84.2,94.4 L90.6,69.6" className="smiski-ln" style={{ stroke: 'var(--smiski-prop, #fff)', strokeWidth: '2.4px' }} />
      <path d="M56,98.6 H92.6 Q96,98.6 96,101.8 V102.2 Q96,105.4 92.6,105.4 H59 Q56,105.4 56,102.2 Z" className="smiski-p2s" />
      <g>
        <rect x={62} y={100.8} width={4.4} height={1.8} rx={0.8} className="smiski-ink smiski-key" />
        <rect x={68.6} y={100.8} width={4.4} height={1.8} rx={0.8} className="smiski-ink smiski-key" />
        <rect x={75.2} y={100.8} width={4.4} height={1.8} rx={0.8} className="smiski-ink smiski-key" />
        <rect x={81.8} y={100.8} width={4.4} height={1.8} rx={0.8} className="smiski-ink smiski-key" />
      </g>
      <Fig>
        <Head x={38} y={45} look={[5.6, 1.2]} turn={0.88} />
        <Blob parts={[limb('M47,68 C51,78 55.4,88 59.4,94.6', 7.6, { cls: 'smiski-tap1' })]} />
      </Fig>
    </>
  ),
}
