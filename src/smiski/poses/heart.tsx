import type { CSSProperties } from 'react'
import { Blob, Fig, Head, limb, shape } from '../parts.tsx'
import { standBody } from './body.ts'
import type { PoseDef } from './types.ts'

const v = (dx: number, dy: number, rot: number) => ({ '--dx': `${dx}px`, '--dy': `${dy}px`, '--rot': `${rot}deg` }) as CSSProperties
const r2 = (n: number) => Math.round(n * 100) / 100
/** Small heart centred on (x, y), in absolute coordinates (the burst animates `transform`). */
const tiny = (x: number, y: number, s = 1) => {
  const X = (n: number) => r2(x + n * s)
  const Y = (n: number) => r2(y + n * s)
  return `M${X(0)},${Y(2.6)} C${X(-4.4)},${Y(-0.6)} ${X(-3.2)},${Y(-4.6)} ${X(0)},${Y(-2.4)} C${X(3.2)},${Y(-4.6)} ${X(4.4)},${Y(-0.6)} ${X(0)},${Y(2.6)} Z`
}

// Little hearts fly out of the big one on hover. [x, y, dx, dy, rot]
const BURST: [number, number, number, number, number][] = [
  [48, 66, -18, -20, -30],
  [72, 66, 18, -20, 30],
  [60, 62, 0, -30, 0],
  [44, 76, -24, -4, -20],
  [76, 76, 24, -4, 20],
]

// Hugging a big heart to its chest, little hearts floating up.
export const heart: PoseDef = {
  react: 'confetti',
  ground: [60, 112],
  z: [88, 22],
  bang: [86, 14],
  bubble: [82, 16],
  Draw: () => (
    <>
      <Fig>
        <Blob parts={[shape(standBody())]} />
        <Head x={60} y={31} rot={-8} look={[0, 1.6]} />
        <path d="M60,92 C40,80 36,70 38.4,63 C41,55 52,54 60,62.4 C68,54 79,55 81.6,63 C84,70 80,80 60,92 Z" className="smiski-p2s" />
        <path d="M45,64 C46,61 49,59.6 52,60.4" className="smiski-ln" style={{ stroke: 'var(--smiski-prop, #fff)', strokeWidth: '2.2px' }} />
        <Blob parts={[limb('M48.6,55 C40,62 38,72 46,77.4'), limb('M71.4,55 C80,62 82,72 74,77.4')]} />
      </Fig>
      <g className="smiski-think smiski-aw">
        <path d={tiny(90, 34, 1.1)} className="smiski-mkf" />
        <path d={tiny(98, 22, 1.4)} className="smiski-mkf" />
        <path d={tiny(26, 30, 1.2)} className="smiski-mkf" />
      </g>
      <g className="smiski-burst">
        {BURST.map(([x, y, dx, dy, rot], i) => (
          <path key={i} d={tiny(x, y)} className="smiski-mkf" style={v(dx, dy, rot)} />
        ))}
      </g>
    </>
  ),
}
