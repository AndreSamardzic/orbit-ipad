import { Blob, Fig, Head, Line, limb, shape, LEG } from '../parts.tsx'
import type { PoseDef } from './types.ts'

// Sitting on a little bench, elbow on the knee, chin propped on the fist.
export const thinking: PoseDef = {
  view: [0, 2],
  ground: [60, 110],
  z: [84, 22],
  bang: [86, 18],
  bubble: [40, 22],
  bubbleFlip: true,
  Draw: () => (
    <>
      {/* bench */}
      <path d="M33,91 H87 Q89.4,91 89.4,93.4 V96.4 Q89.4,98.8 87,98.8 H33 Q30.6,98.8 30.6,96.4 V93.4 Q30.6,91 33,91 Z" className="smiski-p2s" />
      <path d="M37,98.8 V109.6 M83,98.8 V109.6" className="smiski-lnb" style={{ strokeWidth: '4.4px' }} />
      <Fig>
        <Blob
          parts={[
            shape('M48.6,53 C45.6,64 44.6,80 46,89 C47,94 52,95.4 60,95.4 C68,95.4 73,94 74,89 C75.4,80 74.4,64 71.4,53 Z'),
            limb('M53.6,93 C53.4,98 53.2,101.6 53.2,105', LEG),
            limb('M66.4,93 C66.6,98 66.8,101.6 66.8,105', LEG),
            limb('M71.4,59 C74,68 73,78 68.4,85.6'),
          ]}
        />
        <Line d="M66.6,64 C67.8,70.4 67.4,76.6 64.8,81.2" />
        <Head x={61} y={37} rot={12} look={[0.8, -0.4]} />
        {/* forearm in front of the body: elbow on the knee, fist under the chin */}
        <Blob parts={[limb('M51.6,89.6 C52.2,80 53.4,70 55.6,61.6', 7.6), limb('M55.4,61.8 L56.2,60.4', 9.6)]} />
        <Line d="M52.6,62.8 q2.2,-1.8 5,-1.4" />
      </Fig>
      <g className="smiski-think smiski-aw">
        <circle cx={90} cy={15.6} r={1.9} className="smiski-mkf" />
        <circle cx={96.8} cy={11.8} r={2.3} className="smiski-mkf" />
        <circle cx={104.2} cy={8} r={2.7} className="smiski-mkf" />
      </g>
    </>
  ),
}
