import { Blob, Fig, Head, Line, limb, shape } from '../parts.tsx'
import type { PoseDef } from './types.ts'

// Sitting cross-legged with big headphones on, one hand on an ear cup, grooving.
export const headphones: PoseDef = {
  ground: [60, 106],
  z: [12, 30],
  bang: [24, 16],
  bubble: [30, 18],
  bubbleFlip: true,
  Draw: () => (
    <>
      <Fig>
        <Blob
          parts={[
            shape('M48,48 C45,60 41,74 36,90 L84,90 C79,74 75,60 72,48 Z'),
            shape('M27,94.6 C23.6,99 25.6,106 33,106 L87,106 C94.4,106 96.4,99 93,94.6 C87.6,88 72,87.6 60,91.4 C48,87.6 32.4,88 27,94.6 Z'),
            limb('M49.6,54 C43,64 37.6,76 33.4,88'),
          ]}
        />
        <Line d="M43,98.4 C48,96 54.6,96.6 60,99.6 C65.4,96.6 72,96 77,98.4" />
        <Line d="M54.4,58 C52,68 47.4,78 43.6,85.4" />
        <Head x={60} y={31} rot={9}>
          {/* band + ear cups, in the head's own (tilted) frame */}
          <Blob tone="prop2" parts={[limb('M-21.6,-2 C-23,-27 23,-27 21.6,-2', 3.4)]} />
          <rect x={-27.4} y={-8} width={8.4} height={17} rx={3.6} className="smiski-p2s" />
          <rect x={19} y={-8} width={8.4} height={17} rx={3.6} className="smiski-p2s" />
        </Head>
        <Blob parts={[limb('M70.4,54 C79,57 85,50 83.6,43')]} />
      </Fig>
      <g className="smiski-think smiski-aw">
        <g>
          <ellipse cx={96} cy={30} rx={2.6} ry={2} className="smiski-mkf" />
          <path d="M98.4,29.6 V19.6 q3,1 4.4,3.6" className="smiski-mk" />
        </g>
        <g>
          <ellipse cx={104} cy={46} rx={2.4} ry={1.8} className="smiski-mkf" />
          <path d="M106.2,45.6 V36.6" className="smiski-mk" />
        </g>
        <g>
          <ellipse cx={92} cy={58} rx={2.2} ry={1.7} className="smiski-mkf" />
          <path d="M94.2,57.6 V49.4 q2.6,0.8 3.8,3" className="smiski-mk" />
        </g>
      </g>
    </>
  ),
}
