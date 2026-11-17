// The Start page's orbit (port of desktop ORBIT's OrbitView): you — a Smiski — in the
// middle, the day's things circling you, the closer the more urgent. Appointments sit at
// their clock time on a 12-hour face with a red hand at now; untimed planets drift slowly
// (only with animations on). Touch: no tooltips — a tap selects a planet and shows it below
// the orbit with an "Open" button; a second tap on the same planet opens it.
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Smiski } from '../smiski/Smiski.tsx'
import type { SmiskiPose } from '../smiski/poseTypes.ts'
import { clockAngle, type Planet, type PlanetKind, type StartStrings } from '../lib/start.ts'

const SIZE = 400
const C = SIZE / 2
export const RING_R = [74, 122, 170] as const
/** Invisible touch target around each planet (viewBox units: ≥ 44px down to a 330px orbit). */
const HIT_R = 27

const KINDS: PlanetKind[] = ['event', 'lecture', 'deadline', 'task', 'person']

function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180
  return [C + r * Math.cos(a), C + r * Math.sin(a)]
}

function radius(p: Planet): number {
  if (p.kind === 'person') return 11
  return p.ring === 0 ? 9 : p.severity === 3 ? 8 : 6.5
}

const short = (s: string, n = 22) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/**
 * Inner-ring labels. Timed planets put theirs on the outside of the ring (away from the
 * Smiski in the middle); drifting ones keep it under the dot, since their side changes.
 */
function Label({ p, x, y, r }: { p: Planet; x: number; y: number; r: number }) {
  if (!p.timed) {
    return (
      <text className="orbit-planet__label" x={x} y={y + r + 13} textAnchor="middle">
        {short(p.label)}
      </text>
    )
  }
  const a = ((p.angle - 90) * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const anchor = cos > 0.35 ? 'start' : cos < -0.35 ? 'end' : 'middle'
  const d = r + 7
  const lx = x + cos * d
  const ly = y + sin * d + (anchor === 'middle' ? (sin < 0 ? -4 : 10) : 4)
  return (
    <text className="orbit-planet__label" x={lx} y={ly} textAnchor={anchor}>
      {short(p.label, 20)}
    </text>
  )
}

export function OrbitView({
  planets,
  hidden,
  now,
  pose,
  L,
  describe,
  onOpen,
}: {
  planets: Planet[]
  /** Planets that did not fit. */
  hidden: number
  now: number
  pose: SmiskiPose
  L: StartStrings
  /** Second line for the selected planet (time, due, age …). */
  describe: (p: Planet) => string
  onOpen: (p: Planet) => void
}) {
  const [sel, setSel] = useState<string | null>(null)
  const selected = planets.find((p) => p.id === sel) ?? null
  const hand = clockAngle(now)
  const [hx, hy] = polar(RING_R[2] + 8, hand)
  const [hx0, hy0] = polar(52, hand) // starts outside the Smiski (the face is drawn on top of it)
  const present = new Set(planets.map((p) => p.kind))

  const tap = (p: Planet) => {
    if (sel === p.id) onOpen(p)
    else setSel(p.id)
  }

  const dot = (p: Planet) => {
    const [x, y] = polar(RING_R[p.ring], p.angle)
    const r = radius(p)
    const label = `${L.kind[p.kind]}: ${p.label} · ${describe(p)}`
    const showLabel = p.ring === 0 && !p.past
    return (
      <g
        key={p.id}
        className={['orbit-planet', `is-${p.kind}`, p.past && 'is-past', p.severity === 3 && 'is-critical', sel === p.id && 'is-selected'].filter(Boolean).join(' ')}
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-pressed={sel === p.id}
        onClick={(e) => {
          e.stopPropagation()
          tap(p)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen(p)
          }
        }}
      >
        <circle className="orbit-planet__hit" cx={x} cy={y} r={HIT_R} />
        {showLabel && <circle className="orbit-planet__halo motion-only" cx={x} cy={y} r={r + 6} />}
        {sel === p.id && <circle className="orbit-planet__ring" cx={x} cy={y} r={r + 5} />}
        <circle className="orbit-planet__dot" cx={x} cy={y} r={r} />
        {/* text inside a drifting group counter-rotates so it stays upright */}
        {(p.initials || showLabel) && (
          <g className={p.timed ? undefined : 'orbit-upright'}>
            {p.initials && (
              <text className="orbit-planet__initials" x={x} y={y} dy="0.35em" textAnchor="middle">
                {p.initials}
              </text>
            )}
            {showLabel && <Label p={p} x={x} y={y} r={r} />}
          </g>
        )}
      </g>
    )
  }

  const timed = planets.filter((p) => p.timed)
  const drifting = planets.filter((p) => !p.timed)

  return (
    <div className="orbit-view">
      {/* layers: glow disc, Smiski, then the face on top (it only catches taps on planets) so
          labels never hide behind the figure */}
      <div className="orbit-view__stage" onClick={() => setSel(null)}>
        <div className="orbit-view__glow" style={{ width: `${(RING_R[0] * 2 * 100) / SIZE}%` }} aria-hidden />
        <div className="orbit-view__me">
          <Smiski pose={pose} size={84} />
        </div>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="orbit-view__svg" role="group" aria-label={L.orbitLabel}>
          {RING_R.map((r, i) => (
            <circle key={r} className={`orbit-ring orbit-ring--${i}`} cx={C} cy={C} r={r} />
          ))}
          {Array.from({ length: 12 }, (_, h) => {
            const [x1, y1] = polar(RING_R[2] + 4, h * 30)
            const [x2, y2] = polar(RING_R[2] + (h % 3 === 0 ? 12 : 8), h * 30)
            return <line key={h} className={`orbit-tick${h % 3 === 0 ? ' is-major' : ''}`} x1={x1} y1={y1} x2={x2} y2={y2} />
          })}
          {[12, 3, 6, 9].map((h) => {
            const [x, y] = polar(RING_R[2] + 22, (h % 12) * 30)
            return (
              <text key={h} className="orbit-hour" x={x} y={y} dy="0.35em" textAnchor="middle">
                {h}
              </text>
            )
          })}
          <line className="orbit-hand" x1={hx0} y1={hy0} x2={hx} y2={hy} />
          <circle className="orbit-hand__tip" cx={hx} cy={hy} r={3} />
          <g className="orbit-drift">{drifting.map(dot)}</g>
          <g className="orbit-timed">{timed.map(dot)}</g>
        </svg>
      </div>

      {selected ? (
        <div className={`orbit-pick is-${selected.kind}`} role="status">
          <span className="orbit-pick__dot" aria-hidden />
          <span className="orbit-pick__main">
            <span className="orbit-pick__title">{selected.label}</span>
            <span className="orbit-pick__sub">
              {L.kind[selected.kind]} · {describe(selected)}
            </span>
          </span>
          <button type="button" className="btn orbit-pick__go" onClick={() => onOpen(selected)}>
            {L.open} <ArrowRight size={16} />
          </button>
        </div>
      ) : planets.length === 0 ? (
        <p className="orbit-view__caption">{L.orbitEmpty}</p>
      ) : (
        <>
          <ul className="orbit-legend">
            {KINDS.filter((k) => present.has(k)).map((k) => (
              <li key={k} className={`orbit-legend__item is-${k}`}>
                <span className="orbit-legend__dot" aria-hidden />
                {L.kind[k]}
              </li>
            ))}
          </ul>
          <p className="orbit-view__caption">
            {L.orbitCaption} · {L.orbitHint}
            {hidden > 0 && <> · {L.orbitMore(hidden)}</>}
          </p>
        </>
      )}
    </div>
  )
}
