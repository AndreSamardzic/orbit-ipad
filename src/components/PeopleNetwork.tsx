// People network (Personen → Netzwerk). Me in the middle, everyone else on
// rings by how close they are to me (src/lib/network.ts: ringLayout). Touch:
// one finger pans, two fingers pinch-zoom around their midpoint, the wheel /
// trackpad zooms too. Tap a person: their links light up, a card offers
// "Öffnen"; someone not linked to me directly shows the path "über wen".
// "Weg zu …" then a second tap: the shortest path between the two.
//
// Like the desktop graph, the view lives in CSS variables (--k/--tx/--ty) and
// an SVG transform written from a ref, so a pinch never re-renders React.
// Zoom spreads the positions; heads keep their size from 1× up and shrink
// below it, so the overview never piles them up.
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { ExternalLink, Maximize2, Minus, Plus, Route, X } from 'lucide-react'
import { Smiski } from '../smiski/Smiski.tsx'
import type { SmiskiPose } from '../smiski/poseTypes.ts'
import { useData } from '../lib/store.ts'
import { useT } from '../lib/i18n.ts'
import { go } from '../lib/router.ts'
import { ME, adjacency, linkKey, pathBetween, ringLayout, shortestPath, validLinks } from '../lib/network.ts'
import type { Lang, Person } from '../lib/types.ts'
import '../styles/network.css'

// ------------------------------------------------------------------ strings

const fmt = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''))

export const NET_L = {
  de: {
    view: 'Ansicht', grid: 'Raster', network: 'Netzwerk', me: 'Ich', you: 'du',
    hint: 'Tippe auf eine Person · zwei Finger zoomen und verschieben',
    hintPair: 'Tippe auf die zweite Person – oder auf dich',
    open: 'Öffnen', pathTo: 'Weg zu …', close: 'Schließen', cancel: 'Abbrechen',
    direct: 'Direkt mit dir verbunden', via: 'Über {names}', noPathMe: 'Noch keine Verbindung zu dir',
    link1: '1 Verbindung', linkN: '{n} Verbindungen', and: 'und',
    path: 'Weg', noPath: 'Keine Verbindung zwischen {a} und {b}', hop1: 'direkt', hopN: '{n} Schritte',
    legendDirect: 'direkt', legendVia: 'über andere', legendNone: 'ohne Verbindung', focus: '{n} im Filter',
    noLinks: 'Noch keine Verbindungen. Leg sie auf der Seite einer Person unter „Verbindungen“ an.',
    zoomIn: 'Vergrößern', zoomOut: 'Verkleinern', fit: 'Alles zeigen',
    connections: 'Verbindungen', connect: 'Verbinden', pick: 'Person wählen …', label: 'Bezeichnung', labelPh: 'z. B. Lerngruppe (optional)',
    strength: 'Stärke', s1: 'locker', s2: 'normal', s3: 'eng', remove: 'Verbindung entfernen', none: 'Noch keine Verbindungen.',
    allLinked: 'Schon mit allen verbunden.', meOption: 'Ich ({name})',
  },
  en: {
    view: 'View', grid: 'Grid', network: 'Network', me: 'Me', you: 'you',
    hint: 'Tap a person · two fingers to zoom and pan',
    hintPair: 'Tap the second person – or yourself',
    open: 'Open', pathTo: 'Path to …', close: 'Close', cancel: 'Cancel',
    direct: 'Linked to you directly', via: 'Via {names}', noPathMe: 'Not connected to you yet',
    link1: '1 link', linkN: '{n} links', and: 'and',
    path: 'Path', noPath: 'No connection between {a} and {b}', hop1: 'direct', hopN: '{n} steps',
    legendDirect: 'direct', legendVia: 'via others', legendNone: 'not connected', focus: '{n} in filter',
    noLinks: 'No links yet. Add them on a person’s page under “Links”.',
    zoomIn: 'Zoom in', zoomOut: 'Zoom out', fit: 'Show all',
    connections: 'Links', connect: 'Link', pick: 'Pick a person …', label: 'Label', labelPh: 'e.g. study group (optional)',
    strength: 'Strength', s1: 'loose', s2: 'normal', s3: 'close', remove: 'Remove link', none: 'No links yet.',
    allLinked: 'Linked to everyone already.', meOption: 'Me ({name})',
  },
} as const satisfies Record<Lang, Record<string, string>>

export type NetStrings = (typeof NET_L)[Lang]

export function useNetL(): NetStrings {
  return NET_L[useT().lang]
}

const joinNames = (names: string[], and: string) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} ${and} ${names.at(-1)}`)

// ------------------------------------------------------------------ view constants

/** Head size of a person / of me, logical px at 1×. */
const NODE = 52
const ME_SIZE = 80
/** Below this zoom heads shrink with it, down to HEAD_MIN. */
const HEAD_MIN = 0.8
/** Screen px a name needs next to its neighbour; below that only heads show. */
const LABEL_ROOM = 64
const ZOOM_MIN = 0.6
const ZOOM_MAX = 5
const ZOOM_STEP = 1.4
/** The fitted view never blows a small network up more than this. */
const FIT_MAX = 1.25
const TAP_SLOP = 8

const Head = memo(Smiski)

type NodeFlags = { dim: boolean; sel: boolean; onPath: boolean; showLabel: boolean }

const NodeButton = memo(function NodeButton({
  id,
  name,
  aria,
  pose,
  me,
  style,
  dim,
  sel,
  onPath,
  showLabel,
  onTap,
}: { id: string; name: string; aria: string; pose: SmiskiPose; me: boolean; style: CSSProperties; onTap: (id: string) => void } & NodeFlags) {
  return (
    <button
      type="button"
      className={`net-node${me ? ' is-me' : ''}${dim ? ' is-dim' : ''}${sel ? ' is-sel' : ''}${onPath ? ' is-path' : ''}${showLabel ? ' show-label' : ''}`}
      style={style}
      aria-label={aria}
      aria-pressed={sel}
      onClick={() => onTap(id)}
    >
      <Head pose={pose} size={me ? ME_SIZE : NODE} variant={me ? 'full' : 'head'} interactive={false} mood={sel || onPath ? 'awake' : 'auto'} />
      <span className="net-label">{name}</span>
    </button>
  )
})

// ------------------------------------------------------------------ component

export function PeopleNetwork({ people, focus = null }: { people: Person[]; focus?: ReadonlySet<string> | null }) {
  const { links: allLinks, settings } = useData()
  const L = useNetL()
  const meName = settings.name.trim() || L.me

  // ---- layout (re-run when the canvas turns between landscape and portrait)
  const wrapRef = useRef<HTMLDivElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const [aspect, setAspect] = useState(1.4)
  const known = useMemo(() => new Set(people.map((p) => p.id)), [people])
  const links = useMemo(() => validLinks(allLinks, known), [allLinks, known])
  const shape = JSON.stringify([people.map((p) => [p.id, p.name]), links.map((l) => [l.a, l.b, l.strength]), aspect])
  const layout = useMemo(() => ringLayout(people, links, { aspect }), [shape])
  const adj = useMemo(() => adjacency(links), [links])
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])
  const nameOf = (id: string) => (id === ME ? meName : byId.get(id)?.name || '…')

  // ---- selection & paths
  const [sel, setSel] = useState<string | null>(null)
  const [pairFrom, setPairFrom] = useState<string | null>(null)
  const [pair, setPair] = useState<{ a: string; b: string; path: string[] | null } | null>(null)
  // a person deleted elsewhere: drop the stale selection
  const selId = sel && (sel === ME || byId.has(sel)) ? sel : null

  const autoPath = useMemo(() => (selId && selId !== ME && !adj.get(ME)?.has(selId) ? shortestPath(adj, ME, selId) : null), [selId, adj])
  const path = pair ? pair.path : autoPath
  const pathNodes = useMemo(() => new Set(path ?? []), [path])
  const pathEdges = useMemo(() => {
    const s = new Set<string>()
    if (path) for (let i = 1; i < path.length; i++) s.add(linkKey(path[i - 1], path[i]))
    return s
  }, [path])

  const latest = useRef({ selId, pairFrom })
  latest.current = { selId, pairFrom }
  const onTap = useMemo(
    () => (id: string) => {
      const { selId: s, pairFrom: pf } = latest.current
      if (pf && id !== pf) {
        setPair({ a: pf, b: id, path: pathBetween(adj, pf, id) })
        setPairFrom(null)
        setSel(null)
        return
      }
      setPairFrom(null)
      setPair(null)
      setSel(s === id ? null : id)
    },
    [adj],
  )
  const clearAll = () => {
    setSel(null)
    setPair(null)
    setPairFrom(null)
  }

  // ---- view: screen = logical · k + (x, y); logical (0,0) is me
  const view = useRef({ k: 1, x: 0, y: 0, fitK: 1, auto: true })
  const applyView = () => {
    const el = wrapRef.current
    if (!el) return
    const v = view.current
    el.style.setProperty('--k', String(v.k))
    el.style.setProperty('--tx', `${v.x}px`)
    el.style.setProperty('--ty', `${v.y}px`)
    el.style.setProperty('--node-s', String(Math.max(HEAD_MIN, Math.min(1, v.k))))
    gRef.current?.setAttribute('transform', `translate(${v.x} ${v.y}) scale(${v.k})`)
    el.toggleAttribute('data-far', layout.nn * v.k < LABEL_ROOM)
  }
  const fitView = () => {
    const el = wrapRef.current
    if (!el || !el.clientWidth) return
    const v = view.current
    const k = Math.min(el.clientWidth / (2 * layout.halfW), el.clientHeight / (2 * layout.halfH), FIT_MAX)
    Object.assign(v, { k, fitK: k, x: el.clientWidth / 2, y: el.clientHeight / 2, auto: true })
    applyView()
  }
  /** A nudge that moved the view out of the card's way (undone when the card closes, unless the user moved since). */
  const nudge = useRef<{ fromAuto: boolean } | null>(null)
  const glide = useRef(0)
  const userMoved = () => {
    nudge.current = null
    cancelAnimationFrame(glide.current)
  }
  const glideY = (to: number, done?: () => void) => {
    cancelAnimationFrame(glide.current)
    const v = view.current
    const from = v.y
    if (document.documentElement.dataset.motion === 'off') {
      v.y = to
      applyView()
      done?.()
      return
    }
    const t0 = performance.now()
    const step = (now: number) => {
      const f = Math.min(1, (now - t0) / 240)
      v.y = from + (to - from) * (1 - (1 - f) ** 3)
      applyView()
      if (f < 1) glide.current = requestAnimationFrame(step)
      else done?.()
    }
    glide.current = requestAnimationFrame(step)
  }
  const zoomAt = (px: number, py: number, factor: number) => {
    userMoved()
    const v = view.current
    const k = Math.min(v.fitK * ZOOM_MAX, Math.max(v.fitK * ZOOM_MIN, v.k * factor))
    v.x = px - ((px - v.x) * k) / v.k
    v.y = py - ((py - v.y) * k) / v.k
    v.k = k
    v.auto = false
    applyView()
  }
  const zoomCenter = (factor: number) => {
    const el = wrapRef.current
    if (el) zoomAt(el.clientWidth / 2, el.clientHeight / 2, factor)
  }
  const fitAll = () => {
    userMoved()
    fitView()
  }
  const fns = useRef({ applyView, fitView, zoomAt })
  fns.current = { applyView, fitView, zoomAt }

  // measure: aspect for the layout, fit for the view (a resize keeps a view the user moved)
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      if (!el.clientWidth || !el.clientHeight) return
      const a = Math.round(Math.min(1.9, Math.max(0.7, el.clientWidth / el.clientHeight)) * 10) / 10
      setAspect((prev) => (prev === a ? prev : a))
      if (view.current.auto) fns.current.fitView()
      else fns.current.applyView()
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useLayoutEffect(() => {
    if (view.current.auto) fns.current.fitView()
    else fns.current.applyView()
  }, [layout])

  // React's wheel listener is passive; preventDefault (no page scroll) needs a native one.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const b = el.getBoundingClientRect()
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      fns.current.zoomAt(e.clientX - b.left, e.clientY - b.top, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ---- gestures. Capture only once a pointer really moves (capturing on press
  // would send a node's click to the canvas); the click that ends a gesture is swallowed.
  const pts = useRef(new Map<number, { x: number; y: number }>())
  const gest = useRef<
    | { mode: 'pan'; id: number; sx: number; sy: number; vx: number; vy: number; moved: boolean }
    | { mode: 'pinch'; d0: number; mx: number; my: number; k0: number; x0: number; y0: number }
    | null
  >(null)
  const swallow = useRef(false)
  const local = (e: ReactPointerEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - b.left, y: e.clientY - b.top }
  }
  const startPan = (id: number, p: { x: number; y: number }, moved: boolean) => {
    gest.current = { mode: 'pan', id, sx: p.x, sy: p.y, vx: view.current.x, vy: view.current.y, moved }
  }
  const startPinch = () => {
    const [p, q] = [...pts.current.values()]
    const v = view.current
    gest.current = { mode: 'pinch', d0: Math.max(1, Math.hypot(p.x - q.x, p.y - q.y)), mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2, k0: v.k, x0: v.x, y0: v.y }
  }
  const handlers = {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (pts.current.size === 0) swallow.current = false
      cancelAnimationFrame(glide.current)
      const p = local(e)
      pts.current.set(e.pointerId, p)
      if (pts.current.size === 1) startPan(e.pointerId, p, false)
      else if (pts.current.size === 2) {
        swallow.current = true
        userMoved()
        for (const id of pts.current.keys()) {
          try {
            e.currentTarget.setPointerCapture(id)
          } catch {
            /* pointer already gone */
          }
        }
        e.currentTarget.toggleAttribute('data-panning', true)
        startPinch()
      }
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!pts.current.has(e.pointerId)) return
      const p = local(e)
      pts.current.set(e.pointerId, p)
      const g = gest.current
      const v = view.current
      if (g?.mode === 'pinch' && pts.current.size >= 2) {
        const [a, b] = [...pts.current.values()]
        const k = Math.min(v.fitK * ZOOM_MAX, Math.max(v.fitK * ZOOM_MIN, (g.k0 * Math.hypot(a.x - b.x, a.y - b.y)) / g.d0))
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        // the logical point under the first midpoint stays under the fingers
        v.x = mx - ((g.mx - g.x0) / g.k0) * k
        v.y = my - ((g.my - g.y0) / g.k0) * k
        v.k = k
        v.auto = false
        applyView()
      } else if (g?.mode === 'pan' && g.id === e.pointerId) {
        if (!g.moved) {
          if (Math.hypot(p.x - g.sx, p.y - g.sy) < TAP_SLOP) return
          g.moved = true
          swallow.current = true
          userMoved()
          e.currentTarget.setPointerCapture(e.pointerId)
          e.currentTarget.toggleAttribute('data-panning', true)
        }
        v.x = g.vx + p.x - g.sx
        v.y = g.vy + p.y - g.sy
        v.auto = false
        applyView()
      }
    },
    onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => endPointer(e),
    onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => endPointer(e),
    onClickCapture: (e: ReactMouseEvent) => {
      if (!swallow.current) return
      swallow.current = false
      e.stopPropagation()
      e.preventDefault()
    },
  }
  const endPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pts.current.delete(e.pointerId)) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    if (pts.current.size === 1) {
      // pinch → pan with the finger that stays
      const [[id, p]] = [...pts.current.entries()]
      startPan(id, p, true)
    } else if (pts.current.size === 0) {
      gest.current = null
      e.currentTarget.toggleAttribute('data-panning', false)
    }
  }

  // ---- what lights up
  const neighbours = (id: string) => adj.get(id)
  const focusOn = !!focus && !selId && !pair
  const inFocus = (id: string) => !focus || id === ME || focus.has(id)
  const nodeFlags = (id: string): NodeFlags => {
    const isSel = id === selId || (!!pair && (id === pair.a || id === pair.b)) || id === pairFrom
    const onPath = pathNodes.has(id)
    let dim = false
    if (pair) dim = !onPath && !isSel
    else if (selId) dim = !isSel && !onPath && !neighbours(selId)?.has(id)
    else if (focusOn) dim = !inFocus(id)
    const showLabel = isSel || onPath || (!!selId && !!neighbours(selId)?.has(id))
    return { dim, sel: isSel, onPath, showLabel }
  }
  const edgeState = (a: string, b: string) => {
    const onPath = pathEdges.has(linkKey(a, b))
    const lit = !pair && !!selId && (a === selId || b === selId)
    const focusLit = focusOn && inFocus(a) && inFocus(b) && (a !== ME || b !== ME)
    return { onPath, lit: lit || focusLit }
  }
  const active = !!(selId || pair || focusOn)

  // node styles depend on the layout only: the same objects every tap, so memoized nodes skip
  const styles = useMemo(() => {
    const m = new Map<string, CSSProperties>()
    let maxD = 1
    for (const p of layout.pos.values()) maxD = Math.max(maxD, Math.hypot(p.x, p.y))
    for (const [id, p] of layout.pos) {
      const half = (id === ME ? ME_SIZE : NODE) / 2
      m.set(id, { ['--x' as string]: `${p.x}px`, ['--y' as string]: `${p.y}px`, ['--half' as string]: `${half}px`, ['--appear-delay' as string]: `${((Math.hypot(p.x, p.y) / maxD) * 0.4).toFixed(3)}s` } as CSSProperties)
    }
    return m
  }, [layout])

  const ringCounts = [0, 1, 2].map((g) => layout.rings.filter((r) => r.group === g).reduce((n, r) => n + r.ids.length, 0))
  const meLinks = adj.get(ME)?.size ?? 0

  // edge labels for what is lit (selected person's links, the path)
  const labelled = links.filter((l) => {
    const s = edgeState(l.a, l.b)
    return l.label && (s.onPath || (s.lit && !focusOn))
  })

  // keep the selected person / the path above the card: nudge the view up, undo it when the card closes
  useLayoutEffect(() => {
    const el = wrapRef.current
    const v = view.current
    const cardEl = el?.querySelector<HTMLElement>('.net-card')
    if (!el || !cardEl) {
      const n = nudge.current
      nudge.current = null
      if (n?.fromAuto) fns.current.fitView()
      return
    }
    const ids = pair ? (pair.path ?? [pair.a, pair.b]) : selId ? [selId, ...(autoPath ?? [])] : []
    if (!ids.length) return
    const s = Math.max(HEAD_MIN, Math.min(1, v.k))
    let top = Infinity
    let bottom = -Infinity
    for (const id of ids) {
      const p = layout.pos.get(id)
      if (!p) continue
      const y = p.y * v.k + v.y
      const half = ((id === ME ? ME_SIZE : NODE) / 2) * s
      top = Math.min(top, y - half)
      bottom = Math.max(bottom, y + half + 22 * s)
    }
    const limit = cardEl.getBoundingClientRect().top - el.getBoundingClientRect().top - 12
    const dy = Math.min(bottom - limit, top - 12)
    if (dy > 1) {
      nudge.current = nudge.current ?? { fromAuto: v.auto }
      v.auto = false
      glideY(v.y - dy)
    }
  }, [selId, pair, pairFrom, autoPath, layout])

  // ---- the card
  let card: ReactNode = null
  if (pairFrom) {
    card = (
      <div className="net-card is-hint" role="status">
        <Route size={18} aria-hidden />
        <span className="grow">{L.hintPair}</span>
        <button type="button" className="btn" onClick={() => setPairFrom(null)}>
          {L.cancel}
        </button>
      </div>
    )
  } else if (pair) {
    const hopsN = pair.path ? pair.path.length - 1 : 0
    card = (
      <div className="net-card" role="status">
        <div className="net-card-main">
          <span className="net-card-kicker">
            <Route size={14} aria-hidden /> {L.path}
            {pair.path && <span className="muted"> · {hopsN === 1 ? L.hop1 : fmt(L.hopN, { n: hopsN })}</span>}
          </span>
          {pair.path ? (
            <ol className="net-chain">
              {pair.path.map((id, i) => {
                const lab = i > 0 ? links.find((l) => linkKey(l.a, l.b) === linkKey(pair.path![i - 1], id))?.label : undefined
                return (
                  <li key={id}>
                    {i > 0 && <span className="net-arrow" aria-hidden>{lab ? `– ${lab} →` : '→'}</span>}
                    <button type="button" className="net-chip" onClick={() => (id === ME ? onTap(ME) : go('people', id))}>
                      <Smiski pose={id === ME ? settings.mePose : (byId.get(id)?.pose ?? 'sleeping')} size={24} variant="head" interactive={false} />
                      {nameOf(id)}
                    </button>
                  </li>
                )
              })}
            </ol>
          ) : (
            <strong>{fmt(L.noPath, { a: nameOf(pair.a), b: nameOf(pair.b) })}</strong>
          )}
        </div>
        <button type="button" className="icon-btn" aria-label={L.close} onClick={clearAll}>
          <X size={18} />
        </button>
      </div>
    )
  } else if (selId) {
    const p = selId === ME ? null : byId.get(selId)
    const n = neighbours(selId)?.size ?? 0
    const direct = p ? links.find((l) => linkKey(l.a, l.b) === linkKey(ME, selId)) : undefined
    const relation = !p ? null : direct ? `${L.direct}${direct.label ? ` · ${direct.label}` : ''}` : autoPath ? fmt(L.via, { names: joinNames(autoPath.slice(1, -1).map(nameOf), L.and) }) : L.noPathMe
    card = (
      <div className="net-card" role="status">
        <Smiski pose={p ? p.pose : settings.mePose} size={52} variant="head" interactive={false} />
        <div className="net-card-main">
          <strong className="net-card-name">
            {nameOf(selId)}
            {!p && <span className="muted"> ({L.you})</span>}
          </strong>
          {relation && <span className={autoPath ? 'net-via' : 'muted'}>{relation}</span>}
          <span className="muted small">
            {n === 1 ? L.link1 : fmt(L.linkN, { n })}
            {p && p.tags.length > 0 && ` · ${p.tags.join(' · ')}`}
          </span>
        </div>
        <div className="net-card-actions">
          <button type="button" className="btn" onClick={() => setPairFrom(selId)}>
            <Route size={16} /> {L.pathTo}
          </button>
          {p && (
            <button type="button" className="btn primary" onClick={() => go('people', p.id)}>
              <ExternalLink size={16} /> {L.open}
            </button>
          )}
          <button type="button" className="icon-btn" aria-label={L.close} onClick={clearAll}>
            <X size={18} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="net">
      <div
        ref={wrapRef}
        className={`net-canvas${active ? ' has-active' : ''}${pairFrom ? ' is-picking' : ''}`}
        {...handlers}
        onKeyDown={(e) => e.key === 'Escape' && clearAll()}
        onClick={(e) => {
          // a tap on the empty sky clears the selection
          const t = e.target as Element
          if (t === e.currentTarget || t.tagName === 'svg' || t.classList.contains('net-sky')) clearAll()
        }}
      >
        <div className="net-sky" aria-hidden />
        <svg aria-hidden>
          <g ref={gRef}>
            {layout.rings.map((r, i) => (
              <ellipse key={i} className={`net-ring g${r.group}`} cx={0} cy={0} rx={r.rx} ry={r.ry} vectorEffect="non-scaling-stroke" />
            ))}
            {links.map((l) => {
              const a = layout.pos.get(l.a)
              const b = layout.pos.get(l.b)
              if (!a || !b) return null
              const s = edgeState(l.a, l.b)
              return (
                <line
                  key={l.id}
                  className={`net-edge s${l.strength}${l.a === ME || l.b === ME ? ' is-me' : ''}${s.lit ? ' is-lit' : ''}${s.onPath ? ' is-path' : ''}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
          </g>
        </svg>
        {labelled.map((l) => {
          const a = layout.pos.get(l.a)!
          const b = layout.pos.get(l.b)!
          return (
            <span
              key={l.id}
              className="net-edge-label"
              style={{ ['--x' as string]: `${(a.x + b.x) / 2}px`, ['--y' as string]: `${(a.y + b.y) / 2}px`, ['--len' as string]: Math.hypot(a.x - b.x, a.y - b.y).toFixed(1) } as CSSProperties}
            >
              {l.label}
            </span>
          )
        })}
        <NodeButton id={ME} name={meName} aria={`${meName} (${L.you})`} pose={settings.mePose} me style={styles.get(ME)!} onTap={onTap} {...nodeFlags(ME)} />
        {people.map((p) => {
          const st = styles.get(p.id)
          if (!st) return null
          return <NodeButton key={p.id} id={p.id} name={p.name || '…'} aria={p.name || '…'} pose={p.pose} me={false} style={st} onTap={onTap} {...nodeFlags(p.id)} />
        })}
        {!card && <div className="net-hint">{links.length === 0 && people.length > 0 ? L.noLinks : L.hint}</div>}
        {card && (
          <div className="net-card-wrap" onPointerDown={(e) => e.stopPropagation()}>
            {card}
          </div>
        )}
        <div className="net-zoom" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => zoomCenter(ZOOM_STEP)} aria-label={L.zoomIn} title={L.zoomIn}>
            <Plus size={18} aria-hidden />
          </button>
          <button type="button" onClick={() => zoomCenter(1 / ZOOM_STEP)} aria-label={L.zoomOut} title={L.zoomOut}>
            <Minus size={18} aria-hidden />
          </button>
          <button type="button" onClick={fitAll} aria-label={L.fit} title={L.fit}>
            <Maximize2 size={16} aria-hidden />
          </button>
        </div>
      </div>
      <div className="net-legend muted small">
        <span>
          <i className="net-dot is-me" aria-hidden /> {meName} · {meLinks === 1 ? L.link1 : fmt(L.linkN, { n: meLinks })}
        </span>
        {ringCounts[0] > 0 && (
          <span>
            <i className="net-dot g0" aria-hidden /> {ringCounts[0]} {L.legendDirect}
          </span>
        )}
        {ringCounts[1] > 0 && (
          <span>
            <i className="net-dot g1" aria-hidden /> {ringCounts[1]} {L.legendVia}
          </span>
        )}
        {ringCounts[2] > 0 && (
          <span>
            <i className="net-dot g2" aria-hidden /> {ringCounts[2]} {L.legendNone}
          </span>
        )}
        {focus && <span>{fmt(L.focus, { n: people.filter((p) => focus.has(p.id)).length })}</span>}
      </div>
    </div>
  )
}
