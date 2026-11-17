import type { CSSProperties } from 'react'
import { Blob, Fig, Head, limb, shape, ARM } from '../parts.tsx'
import { standBody } from './body.ts'
import type { PoseDef } from './types.ts'

const v = (dx: number, dy: number, rot: number) => ({ '--dx': `${dx}px`, '--dy': `${dy}px`, '--rot': `${rot}deg` }) as CSSProperties
const thin = { strokeWidth: '1.4px' }

// Burst pieces start at the hands and fly out on hover. [x, y, dx, dy, rot, kind]
const BURST: [number, number, number, number, number, 'r' | 'f' | 'd'][] = [
  [29, 34, -14, -16, 160, 'r'],
  [31, 33, -20, -2, 0, 'd'],
  [30, 31, -6, -24, 210, 'f'],
  [28, 35, -22, 10, -120, 'r'],
  [32, 32, 2, -28, 0, 'd'],
  [91, 34, 14, -16, -160, 'f'],
  [89, 33, 20, -2, 0, 'd'],
  [90, 31, 6, -24, -210, 'r'],
  [92, 35, 22, 10, 120, 'f'],
  [88, 32, -2, -28, 0, 'd'],
]

// Both arms up, a happy little jump, confetti in the air.
export const cheering: PoseDef = {
  react: 'confetti',
  ground: [60, 112],
  z: [97, 28],
  bang: [90, 48],
  bubble: [80, 21],
  Draw: () => (
    <>
      <ellipse cx={60} cy={112.6} rx={17} ry={2.2} className="smiski-ink" opacity={0.16} />
      <Fig>
        <Blob
          parts={[
            shape(standBody(0, { top: 50, crotch: 90, foot: 106.4 })),
            limb('M49,57.6 C41,54 33.6,47 28.6,36.6', ARM),
            limb('M71,57.6 C79,54 86.4,47 91.4,36.6', ARM),
          ]}
        />
        <Head x={60} y={38} />
      </Fig>
      {/* confetti that is always there (while awake) */}
      <g className="smiski-aw">
        <rect x={20} y={20} width={4} height={6.4} rx={1} transform="rotate(-24 22 23)" className="smiski-p2s" style={{ strokeWidth: '1.6px' }} />
        <rect x={101} y={22} width={4} height={6.4} rx={1} transform="rotate(28 103 25.2)" className="smiski-fs" style={{ strokeWidth: '1.6px' }} />
        <path d="M38,12 q2.4,-3 4.6,0 q2.2,3 4.6,0" className="smiski-mk" />
        <path d="M71,7 q2.4,-3 4.6,0 q2.2,3 4.6,0" className="smiski-mk" />
        <circle cx={109} cy={40} r={2} className="smiski-mkf" />
        <circle cx={15} cy={38} r={2} className="smiski-mkf" />
        <circle cx={60} cy={7} r={1.8} className="smiski-mkf" />
      </g>
      {/* burst on hover */}
      <g className="smiski-burst">
        {BURST.map(([x, y, dx, dy, rot, k], i) =>
          k === 'd' ? (
            <circle key={i} cx={x} cy={y} r={1.7} className="smiski-mkf" style={v(dx, dy, rot)} />
          ) : (
            <rect
              key={i}
              x={x - 1.6}
              y={y - 2.6}
              width={3.2}
              height={5.2}
              rx={1}
              className={k === 'r' ? 'smiski-p2s' : 'smiski-fs'}
              style={{ ...thin, ...v(dx, dy, rot) }}
            />
          ),
        )}
      </g>
    </>
  ),
}
