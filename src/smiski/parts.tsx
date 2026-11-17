// Drawing primitives shared by every pose. All geometry lives in a 120 x 120
// viewBox. Colours come only from CSS classes in smiski.css, which read the four
// --smiski-* tokens (always with their light-mode fallbacks).
import type { ReactNode } from 'react'

/** Head radius used by every full-body pose, so all poses read as one character. */
export const R = 21
/** Outer outline width. */
export const T = 2.6
/** Fill width of an arm / a leg (the outline adds T on both sides). */
export const ARM = 7.6
export const LEG = 9.4

// ------------------------------------------------------------------ body union
// A "blob" is a set of overlapping parts drawn as one silhouette: first every
// part's outline (line colour, widened by 2T), then every part's fill on top.
// Overlaps therefore merge without seams, and the outline stays on the outside.

export type Tone = 'body' | 'prop' | 'prop2'

export interface Part {
  d: string
  /** Stroke width of a limb centre-line. Omit for a closed, filled shape. */
  w?: number
  /** Optional animation class applied to both passes of this part (kept in sync). */
  cls?: string
  /** transform-origin (view-box user units) for an animated part. */
  origin?: [number, number]
}

/** A closed shape. */
export const shape = (d: string, extra?: Omit<Part, 'd' | 'w'>): Part => ({ d, ...extra })
/** A stubby limb: a round-capped centre-line of fill width `w`. */
export const limb = (d: string, w: number = ARM, extra?: Omit<Part, 'd' | 'w'>): Part => ({ d, w, ...extra })

const toneSuffix: Record<Tone, string> = { body: '', prop: ' smiski-tp', prop2: ' smiski-tp2' }

function wrap(p: Part, key: string, el: ReactNode) {
  if (!p.cls) return el
  return (
    <g
      key={key}
      className={p.cls}
      style={p.origin ? { transformOrigin: `${p.origin[0]}px ${p.origin[1]}px` } : undefined}
    >
      {el}
    </g>
  )
}

export function Blob({ parts, tone = 'body', className }: { parts: Part[]; tone?: Tone; className?: string }) {
  const t = toneSuffix[tone]
  return (
    <g className={className}>
      {parts.map((p, i) =>
        wrap(
          p,
          `o${i}`,
          p.w === undefined ? (
            <path key={`o${i}`} d={p.d} className="smiski-uo" strokeWidth={T * 2} />
          ) : (
            <path key={`o${i}`} d={p.d} className="smiski-ulo" strokeWidth={p.w + T * 2} />
          ),
        ),
      )}
      {parts.map((p, i) =>
        wrap(
          p,
          `f${i}`,
          p.w === undefined ? (
            <path key={`f${i}`} d={p.d} className={`smiski-uf${t}`} />
          ) : (
            <path key={`f${i}`} d={p.d} className={`smiski-ulf${t}`} strokeWidth={p.w} />
          ),
        ),
      )}
    </g>
  )
}

/** Thin inner detail line (1.8). */
export function Line({ d, w, className }: { d: string; w?: number; className?: string }) {
  return <path d={d} className={`smiski-ln${className ? ` ${className}` : ''}`} strokeWidth={w} />
}

// ------------------------------------------------------------------ the figure
// Everything that belongs to the character (not to a static prop) goes inside
// <Fig>. The two nested groups carry the click boop and the hover hop/bounce;
// their transform-origin is the pose's ground point, set on the <svg> as
// --smiski-ox/--smiski-oy, so several <Fig> groups inside one pose (behind and
// in front of a prop) move as one body.
export function Fig({ children }: { children: ReactNode }) {
  return (
    <g className="smiski-boop">
      <g className="smiski-hop">{children}</g>
    </g>
  )
}

// ------------------------------------------------------------------ head + face
export interface FaceOpts {
  /** Face offset from the head centre (looking direction). */
  look?: [number, number]
  /** Horizontal squeeze of the eye spacing for three-quarter views (1 = front). */
  turn?: number
  /** Mouth shape. */
  mouth?: 'small' | 'o' | 'none'
}

/** Eye geometry for a head of radius r. */
export function faceMetrics(r: number) {
  const k = r / R
  return {
    ex: 7.2 * k, // half eye spacing (0.34 x head diameter)
    ey: 3.4 * k, // eyes at ~58 % of head height
    er: 2.2 * Math.max(k, 0.78),
    my: 10.1 * k,
    lw: 2.8 * Math.max(k, 0.8), // closed-lid half width
  }
}

export function mouthPath(kind: FaceOpts['mouth'], my: number, k = 1): string | null {
  if (kind === 'none') return null
  if (kind === 'o') {
    const rx = 2.1 * k
    const ry = 2.5 * k
    return `M${-rx},${my} a${rx},${ry} 0 1,0 ${rx * 2},0 a${rx},${ry} 0 1,0 ${-rx * 2},0Z`
  }
  // small, slightly open mouth: flat-ish top, rounded bottom
  const w = 2.7 * k
  return (
    `M${-w},${my - 0.5 * k} Q0,${my - 1.5 * k} ${w},${my - 0.5 * k}` +
    ` Q${w + 0.35 * k},${my + 1.5 * k} 0,${my + 1.75 * k} Q${-w - 0.35 * k},${my + 1.5 * k} ${-w},${my - 0.5 * k}Z`
  )
}

export function Face({ r = R, look = [0, 0], turn = 1, mouth = 'small' }: FaceOpts & { r?: number }) {
  const m = faceMetrics(r)
  const k = r / R
  const ex = m.ex * turn
  const mp = mouthPath(mouth, m.my, Math.max(k, 0.8))
  return (
    <g transform={look[0] || look[1] ? `translate(${look[0]} ${look[1]})` : undefined}>
      <g className="smiski-eo">
        <g className="smiski-blink">
          <g className="smiski-blink2">
            <circle cx={-ex} cy={m.ey} r={m.er} className="smiski-ink" />
            <circle cx={ex} cy={m.ey} r={m.er} className="smiski-ink" />
          </g>
        </g>
      </g>
      <g className="smiski-ec">
        <path d={`M${-ex - m.lw},${m.ey - 0.7} q${m.lw},${2.9 * Math.max(k, 0.8)} ${m.lw * 2},0`} className="smiski-lid" />
        <path d={`M${ex - m.lw},${m.ey - 0.7} q${m.lw},${2.9 * Math.max(k, 0.8)} ${m.lw * 2},0`} className="smiski-lid" />
      </g>
      {mp && <path d={mp} className="smiski-ink" />}
    </g>
  )
}

export interface HeadProps extends FaceOpts {
  x: number
  y: number
  r?: number
  /** Head tilt in degrees (positive = clockwise). */
  rot?: number
  children?: ReactNode
}

/** Round head with the face. `children` render inside the head's local frame, on top. */
export function Head({ x, y, r = R, rot = 0, look, turn, mouth, children }: HeadProps) {
  return (
    <g transform={`translate(${x} ${y})${rot ? ` rotate(${rot})` : ''}`}>
      <circle r={r} className="smiski-fs" />
      <Face r={r} look={look} turn={turn} mouth={mouth} />
      {children}
    </g>
  )
}

// ------------------------------------------------------------------ overlays
/** Two floating z's. (x, y) is the lower-left corner of the first, smaller z. */
export function Zs({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const z = (size: number) => `M0,0h${size}l${-size},${size}h${size}`
  return (
    <g className="smiski-zs" transform={`translate(${x} ${y})${s !== 1 ? ` scale(${s})` : ''}`}>
      <g transform="translate(0 -6)">
        <g className="smiski-z smiski-z1">
          <path d={z(6)} className="smiski-zl" />
        </g>
      </g>
      <g transform="translate(8.6 -19.6)">
        <g className="smiski-z smiski-z2">
          <path d={z(8.4)} className="smiski-zl" />
        </g>
      </g>
    </g>
  )
}

/** Tiny "!" that pops up when a sleeper is woken. (x, y) = bottom of the dot. */
export function Bang({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y})${s !== 1 ? ` scale(${s})` : ''}`}>
      <g className="smiski-bang">
        <path d="M0,-15.5 L0,-6.5" className="smiski-bangl" />
        <circle cx={0} cy={-1.6} r={1.75} className="smiski-mkf" />
      </g>
    </g>
  )
}

/** "…" speech bubble. (x, y) = tip of the tail (points down-left at the head). */
export function Bubble({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g
      className="smiski-bubble"
      transform={`translate(${x} ${y})${flip ? ' scale(-1 1)' : ''}${s !== 1 ? ` scale(${s})` : ''}`}
    >
      <g className="smiski-bubble-in">
        <path
          d="M0,0 C1.6,-2.2 3,-4 3.2,-5.6 H7 C3.6,-5.6 2.6,-8.3 2.6,-11.2 C2.6,-15.6 5.8,-18.2 10.6,-18.2 H22.8 C27.6,-18.2 30.8,-15.6 30.8,-11.2 C30.8,-6.8 27.6,-4.4 22.8,-4.4 H9 C7,-2.4 3.6,-0.6 0,0 Z"
          className="smiski-bubs"
        />
        <circle cx={10.4} cy={-11.3} r={1.75} className="smiski-ink smiski-dot smiski-dot1" />
        <circle cx={16.7} cy={-11.3} r={1.75} className="smiski-ink smiski-dot smiski-dot2" />
        <circle cx={23} cy={-11.3} r={1.75} className="smiski-ink smiski-dot smiski-dot3" />
      </g>
    </g>
  )
}
