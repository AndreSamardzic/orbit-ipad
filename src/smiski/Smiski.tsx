import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import type { SmiskiProps } from './types.ts'
import { POSE_DEFS } from './poses/index.ts'
import { Bang, Bubble, Zs } from './parts.tsx'
import { HEAD_ANCHORS, HEAD_GROUND, HEAD_VIEWBOX, HeadArt, HeadBubble } from './head.tsx'
import { watchBlink } from './blink.ts'
import './smiski.css'

/** One-shot hover reactions. 'wake': a sleeper opens its eyes; 'poke': blink +
 *  bounce; 'special': the pose's own reaction (confetti, lean-out, ...) + blink;
 *  'stir': a forced sleeper twitches without waking. */
type Reaction = 'wake' | 'poke' | 'special' | 'stir'

const REACT_MS: Record<Reaction, number> = { wake: 1400, poke: 700, special: 950, stir: 700 }
/** How long a woken sleeper stays awake after the pointer leaves. */
const DOZE_MS = 1500
const BOOP_MS = 480

export function Smiski({
  pose,
  size = 64,
  variant = 'full',
  mood = 'auto',
  interactive = true,
  busy = false,
  label,
  className,
  onClick,
}: SmiskiProps) {
  const def = POSE_DEFS[pose] ?? POSE_DEFS.sleeping
  const head = variant === 'head'
  const sleepy = Boolean(def.sleepy)
  const [ptr, setPtr] = useState(false)
  const [foc, setFoc] = useState(false)
  const [woke, setWoke] = useState(false)
  const [reaction, setReaction] = useState<Reaction | null>(null)
  const [boop, setBoop] = useState<'' | 'a' | 'b'>('')
  // Per-instance phase offsets so a grid of figures never breathes in sync.
  const [seed] = useState(() => ({ br: -Math.random() * 4, zo: -Math.round(Math.random() * 16) * 0.2 }))
  const timers = useRef<{ doze?: number; react?: number; boop?: number }>({})
  const ref = useRef<HTMLSpanElement>(null)

  const awake = mood === 'awake' ? true : mood === 'asleep' ? false : !sleepy || woke
  const canWake = mood === 'auto' && sleepy
  const canSleep = mood === 'asleep' || canWake
  const hover = interactive && (ptr || foc)
  const clickable = typeof onClick === 'function'

  useEffect(
    () => () => {
      const t = timers.current
      window.clearTimeout(t.doze)
      window.clearTimeout(t.react)
      window.clearTimeout(t.boop)
    },
    [],
  )

  // Idle blinks come from one shared scheduler (see blink.ts).
  useEffect(() => (ref.current ? watchBlink(ref.current) : undefined), [])

  // A different pose or a forced mood starts from its natural state again.
  useEffect(() => {
    window.clearTimeout(timers.current.doze)
    setWoke(false)
  }, [pose, mood])

  // Waving: speed the idle wave up while hovered, keeping its phase (no jump).
  const waves = !head && def.react === 'wave'
  useEffect(() => {
    if (!waves || !ref.current) return
    ref.current.querySelectorAll('.smiski-wave').forEach((n) => {
      n.getAnimations().forEach((a) => a.updatePlaybackRate(hover ? 3.2 : 1))
    })
  }, [hover, waves])

  const fire = (r: Reaction) => {
    window.clearTimeout(timers.current.react)
    setReaction(r)
    timers.current.react = window.setTimeout(() => setReaction(null), REACT_MS[r])
  }

  const enter = () => {
    if (!interactive) return
    window.clearTimeout(timers.current.doze)
    if (canWake && !woke) {
      setWoke(true)
      fire('wake')
    } else if (!reaction) {
      const special = !head && def.react !== undefined && def.react !== 'poke'
      fire(!awake ? 'stir' : special ? 'special' : 'poke')
    }
  }

  const leave = () => {
    if (!interactive || !canWake) return
    window.clearTimeout(timers.current.doze)
    timers.current.doze = window.setTimeout(() => setWoke(false), DOZE_MS)
  }

  const activate = () => {
    onClick?.()
    if (!interactive) return
    window.clearTimeout(timers.current.boop)
    setBoop((b) => (b === 'a' ? 'b' : 'a'))
    timers.current.boop = window.setTimeout(() => setBoop(''), BOOP_MS)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      activate()
    }
  }

  const ground = head ? HEAD_GROUND : def.ground
  const [vx, vy, vw] = head ? [0, 0, 48] : [def.view?.[0] ?? 0, def.view?.[1] ?? 0, 120]
  const style = {
    // view-box origin of boop / hop (inner groups) ...
    '--smiski-ox': `${ground[0]}px`,
    '--smiski-oy': `${ground[1]}px`,
    // ... and the same ground point as a percentage of the box, for breathing,
    // which runs on the <svg> element itself so the compositor can do it
    // without repaints (the outer span keeps a still box for hit-testing).
    '--smiski-gx': `${(((ground[0] - vx) / vw) * 100).toFixed(1)}%`,
    '--smiski-gy': `${(((ground[1] - vy) / vw) * 100).toFixed(1)}%`,
    '--smiski-br': `${seed.br.toFixed(2)}s`,
    '--smiski-zo': `${seed.zo.toFixed(2)}s`,
  } as CSSProperties

  const Draw = def.Draw
  const bangAt = head ? HEAD_ANCHORS.bang : def.bang

  return (
    <span
      ref={ref}
      className={`smiski smiski--${head ? 'head' : 'full'}${className ? ` ${className}` : ''}`}
      role={clickable ? 'button' : label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={clickable || label ? undefined : true}
      tabIndex={clickable ? 0 : undefined}
      data-pose={pose}
      data-awake={awake}
      data-hover={hover || undefined}
      data-react={(interactive && reaction) || undefined}
      data-boop={boop || undefined}
      data-busy={busy || undefined}
      data-small={size < 36 || undefined}
      data-clickable={clickable || undefined}
      style={{ ...style, width: size, height: size }}
      onPointerEnter={() => {
        setPtr(true)
        if (!foc) enter()
      }}
      onPointerLeave={() => {
        setPtr(false)
        if (!foc) leave()
      }}
      onFocus={(e) => {
        if (!e.currentTarget.matches(':focus-visible')) return
        setFoc(true)
        if (!ptr) enter()
      }}
      onBlur={() => {
        if (!foc) return
        setFoc(false)
        if (!ptr) leave()
      }}
      onClick={clickable || interactive ? activate : undefined}
      onKeyDown={clickable ? onKeyDown : undefined}
    >
      <svg
        className="smiski-svg"
        width={size}
        height={size}
        viewBox={head ? HEAD_VIEWBOX : `${vx} ${vy} 120 120`}
        aria-hidden
        focusable="false"
      >
      {head ? <HeadArt pose={pose} size={size} canSleep={canSleep} /> : <Draw />}
      {!head && canSleep && def.zzz !== false && <Zs x={def.z[0]} y={def.z[1]} />}
      {canWake && <Bang x={bangAt[0]} y={bangAt[1]} s={head ? 0.62 : 1} />}
      {busy &&
        (head ? <HeadBubble size={size} /> : <Bubble x={def.bubble[0]} y={def.bubble[1]} flip={def.bubbleFlip} />)}
      </svg>
    </span>
  )
}
