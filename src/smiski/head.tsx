// Head-only variant (logo, status bar, graph nodes): its own 48 x 48 viewBox and
// line weights that adapt to the rendered size, so it stays a readable face
// from 14 px to 48 px.
import type { SmiskiPose } from './types.ts'
import { Fig, mouthPath } from './parts.tsx'

export const HEAD_VIEWBOX = '0 0 48 48'
/** Ground point of the head variant (origin of hop / boop / breathing). */
export const HEAD_GROUND: [number, number] = [24, 44]
const CX = 24
const CY = 26.6
const HR = 16.6

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp01(t)
const r2 = (n: number) => Math.round(n * 100) / 100

/** Size-dependent metrics, all in view-box units. */
export function headMetrics(size: number) {
  const t = (size - 14) / 34 // 0 at 14 px, 1 at 48 px
  const u = 48 / size // view-box units per css px
  return {
    sw: r2(lerp(1.25, 2.05, t) * u), // outline
    er: r2(Math.max(1.8, lerp(1.0, 1.7, t) * u)), // eye dot radius
    lw: r2(lerp(1.1, 1.6, t) * u), // closed-lid stroke
    ex: r2(lerp(7.0, 5.8, t)), // half eye spacing
    ey: r2(lerp(2.6, 2.9, t)), // eye height below centre
    lid: r2(lerp(3.9, 2.75, t)), // closed-lid half width
    dip: r2(lerp(3.1, 2.4, t)), // closed-lid depth
    mouth: size >= 18, // the mouth would only be noise below this
    mk: r2(lerp(1.0, 0.82, t)), // mouth scale
    my: r2(lerp(9.6, 8.6, t)), // mouth height below centre
    zw: r2(lerp(1.2, 1.55, t) * u), // z stroke
    zs: r2(lerp(8.4, 6.6, t)), // z size
  }
}

/** Where the face looks for a few poses, so a person's head keeps a hint of their pose. */
const LOOK: Partial<Record<SmiskiPose, [number, number]>> = {
  'looking-up': [0, -5],
  peeking: [-3.5, 0],
  reading: [0, 1.5],
  typing: [2.5, 0.5],
  ball: [0, -4],
  daydreaming: [1.5, -3.5],
  map: [-1, 1.5],
  writing: [-1, 2],
  coffee: [0, 1.5],
  phoning: [-2, 0],
  presenting: [3, -0.5],
  running: [3, 0],
  suitcase: [3, 0],
  backpack: [3, 0],
}

export function HeadArt({ pose, size, canSleep }: { pose: SmiskiPose; size: number; canSleep: boolean }) {
  const m = headMetrics(size)
  const [lx, ly] = LOOK[pose] ?? [0, 0]
  const mp = m.mouth ? mouthPath('small', m.my, m.mk) : null
  const lidD = (x: number) => `M${r2(x - m.lid)},${r2(m.ey - 0.9)} q${m.lid},${m.dip} ${r2(m.lid * 2)},0`
  const zd = `M0,0h${m.zs}l${-m.zs},${m.zs}h${m.zs}`
  return (
    <>
      <Fig>
        <g className="smiski-tilt">
          <circle cx={CX} cy={CY} r={HR} className="smiski-fs" style={{ strokeWidth: m.sw }} />
          <g transform={`translate(${r2(CX + lx)} ${r2(CY + ly)})`}>
            <g className="smiski-eo">
              <g className="smiski-blink">
                <g className="smiski-blink2">
                  <circle cx={-m.ex} cy={m.ey} r={m.er} className="smiski-ink" />
                  <circle cx={m.ex} cy={m.ey} r={m.er} className="smiski-ink" />
                </g>
              </g>
            </g>
            <g className="smiski-ec">
              <path d={lidD(-m.ex)} className="smiski-lid" style={{ strokeWidth: m.lw }} />
              <path d={lidD(m.ex)} className="smiski-lid" style={{ strokeWidth: m.lw }} />
            </g>
            {mp && <path d={mp} className="smiski-ink" />}
          </g>
        </g>
      </Fig>
      {canSleep && (
        <g className="smiski-zs" transform={`translate(${r2(46.4 - m.zs)} ${r2(2.2)})`}>
          <g className="smiski-z smiski-z2">
            <path d={zd} className="smiski-zl" style={{ strokeWidth: m.zw }} />
          </g>
        </g>
      )}
    </>
  )
}

/** Anchors for the overlays of the head variant. */
export const HEAD_ANCHORS = {
  bang: [41.5, 14] as [number, number],
}

/** "…" bubble for the head variant, sized in css px so the dots stay legible at 16 px. */
export function HeadBubble({ size }: { size: number }) {
  const t = (size - 14) / 34
  const u = 48 / size
  const dr = lerp(0.95, 1.45, t) * u // dot radius
  const gap = lerp(1.05, 1.8, t) * u // between dots
  const px = lerp(1.5, 3, t) * u // horizontal padding
  const py = lerp(1.25, 2.3, t) * u // vertical padding
  const sw = lerp(0.95, 1.45, t) * u // outline
  const w = 6 * dr + 2 * gap + 2 * px
  const h = 2 * dr + 2 * py
  const x0 = 23.5
  const y1 = 15.5
  const cy = y1 - h / 2
  const tail = `M${r2(x0 + h * 0.42)},${r2(y1 - 0.4)} L${r2(x0 - h * 0.08)},${r2(y1 + h * 0.36)} L${r2(x0 + h * 0.62)},${r2(y1 - h * 0.12)}`
  return (
    <g className="smiski-bubble">
      <g className="smiski-bubble-in">
        <path
          d={`${tail} M${r2(x0 + h / 2)},${r2(y1 - h)} H${r2(x0 + w - h / 2)} A${r2(h / 2)},${r2(h / 2)} 0 0 1 ${r2(x0 + w - h / 2)},${r2(y1)} H${r2(x0 + h / 2)} A${r2(h / 2)},${r2(h / 2)} 0 0 1 ${r2(x0 + h / 2)},${r2(y1 - h)} Z`}
          className="smiski-bubs"
          style={{ strokeWidth: r2(sw) }}
        />
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            cx={r2(x0 + px + dr + i * (2 * dr + gap))}
            cy={r2(cy)}
            r={r2(dr)}
            className={`smiski-ink smiski-dot smiski-dot${i + 1}`}
          />
        ))}
      </g>
    </g>
  )
}
