// People network: pure helpers (no DOM, no React) — ring layout, shortest
// paths, link editing. Tested in test/network.test.ts.
//
// Links are user-made and undirected (`a`–`b` == `b`–`a`). A link to the user
// themself uses the special id ME in `a` or `b`; there is no Person record for it.
import type { PersonLink } from './types.ts'

/** The user's own node id in `PersonLink.a` / `.b`. */
export const ME = 'me'

export type Strength = PersonLink['strength']

export interface Pt {
  x: number
  y: number
}

/** 0 = linked directly to me, 1 = reachable via others, 2 = no path to me. */
export type RingGroup = 0 | 1 | 2

export interface Ring {
  group: RingGroup
  /** Half-axes of the ellipse, logical px. */
  rx: number
  ry: number
  ids: string[]
}

export interface NetLayout {
  /** Centre (me) at 0,0. */
  pos: Map<string, Pt>
  rings: Ring[]
  /** Half extents of everything incl. room for heads and names. */
  halfW: number
  halfH: number
  /** Median distance to the nearest neighbour — decides when names fit. */
  nn: number
}

export interface LayoutOpts {
  /** Ellipse width / height; follow the canvas (landscape > 1, portrait < 1). */
  aspect?: number
  /** Centre-to-centre room along a ring (head + name). */
  spacing?: number
  /** Vertical half-axis of the innermost ring (with aspect < 1 the horizontal one). */
  first?: number
  /** Distance between two rings. */
  gap?: number
  /** Room around the outermost ring for heads and names, sideways / up and down. */
  padX?: number
  padY?: number
}

const TAU = 2 * Math.PI

// ------------------------------------------------------------------ graph basics

const ends = (l: PersonLink): [string, string] => [l.a, l.b]

/** Links whose two ends exist (`known` people or ME) and differ. */
export function validLinks(links: readonly PersonLink[], known: ReadonlySet<string>): PersonLink[] {
  const ok = (id: string) => id === ME || known.has(id)
  return links.filter((l) => l.a !== l.b && ok(l.a) && ok(l.b))
}

/** id → (neighbour → strength). Duplicate links between the same pair add up. */
export function adjacency(links: readonly PersonLink[]): Map<string, Map<string, number>> {
  const adj = new Map<string, Map<string, number>>()
  for (const l of links) {
    for (const [x, y] of [ends(l), [l.b, l.a] as [string, string]]) {
      let m = adj.get(x)
      if (!m) adj.set(x, (m = new Map()))
      m.set(y, (m.get(y) ?? 0) + l.strength)
    }
  }
  return adj
}

export const linkKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`)

export const touches = (l: PersonLink, id: string): boolean => l.a === id || l.b === id

export const otherEnd = (l: PersonLink, id: string): string => (l.a === id ? l.b : l.a)

export const findLink = (links: readonly PersonLink[], a: string, b: string): PersonLink | undefined =>
  links.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))

/** Everything except the links of a deleted person. */
export const linksWithout = (links: readonly PersonLink[], id: string): PersonLink[] => links.filter((l) => !touches(l, id))

/** Adds a link, or updates label/strength if the pair is already linked. */
export function upsertLink(links: readonly PersonLink[], a: string, b: string, strength: Strength, label: string | undefined, newId: () => string): PersonLink[] {
  if (a === b) return [...links]
  const lab = label?.trim() || undefined
  const have = findLink(links, a, b)
  if (have) return links.map((l) => (l === have ? { ...l, strength, label: lab } : l))
  return [...links, { id: newId(), a, b, strength, label: lab }]
}

/** All distinct labels in use, for suggestions. */
export const linkLabels = (links: readonly PersonLink[]): string[] =>
  [...new Set(links.map((l) => l.label?.trim()).filter((x): x is string => !!x))].sort((x, y) => x.localeCompare(y))

/** Hops from `from` to every reachable id (BFS). */
export function hops(adj: Map<string, Map<string, number>>, from: string): Map<string, number> {
  const d = new Map<string, number>([[from, 0]])
  const q = [from]
  for (let i = 0; i < q.length; i++) {
    const cur = q[i]
    for (const n of adj.get(cur)?.keys() ?? []) {
      if (d.has(n)) continue
      d.set(n, d.get(cur)! + 1)
      q.push(n)
    }
  }
  return d
}

/**
 * Shortest path (fewest hops) from `from` to `to`, both included, or null.
 * `avoid` ids are never used as a stop in between (still allowed as an end).
 * Among equally short paths the one with the stronger first links wins
 * (neighbours are tried strongest first), so the result is deterministic.
 */
export function shortestPath(adj: Map<string, Map<string, number>>, from: string, to: string, avoid: ReadonlySet<string> = new Set()): string[] | null {
  if (from === to) return [from]
  const prev = new Map<string, string>([[from, from]])
  const q = [from]
  for (let i = 0; i < q.length; i++) {
    const cur = q[i]
    if (cur !== from && avoid.has(cur)) continue
    const ns = [...(adj.get(cur) ?? [])].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    for (const [n] of ns) {
      if (prev.has(n)) continue
      prev.set(n, cur)
      if (n === to) {
        const path = [to]
        let p = to
        while (p !== from) path.push((p = prev.get(p)!))
        return path.reverse()
      }
      q.push(n)
    }
  }
  return null
}

/**
 * "Über wen kenne ich X": between two people, try without passing through me
 * first (otherwise almost everything runs via me); only then allow me.
 */
export function pathBetween(adj: Map<string, Map<string, number>>, a: string, b: string): string[] | null {
  if (a === ME || b === ME) return shortestPath(adj, a, b)
  return shortestPath(adj, a, b, new Set([ME])) ?? shortestPath(adj, a, b)
}

// ------------------------------------------------------------------ ring layout

/** Ramanujan's ellipse perimeter. */
export const perimeter = (a: number, b: number): number => Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)))

/** Arc-length table of an ellipse, starting at parameter `t0`: arc length ↔ parameter. */
export function arcTable(a: number, b: number, t0: number): { total: number; tAt(s: number): number; sAt(t: number): number } {
  const M = 720
  const cum = [0]
  let px = a * Math.cos(t0)
  let py = b * Math.sin(t0)
  for (let j = 1; j <= M; j++) {
    const t = t0 + (TAU * j) / M
    const x = a * Math.cos(t)
    const y = b * Math.sin(t)
    cum.push(cum[j - 1] + Math.hypot(x - px, y - py))
    px = x
    py = y
  }
  const total = cum[M]
  const tAt = (s0: number) => {
    const s = ((s0 % total) + total) % total
    let lo = 0
    let hi = M
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (cum[mid] <= s) lo = mid
      else hi = mid
    }
    const f = cum[lo + 1] > cum[lo] ? (s - cum[lo]) / (cum[lo + 1] - cum[lo]) : 0
    return t0 + (TAU * (lo + f)) / M
  }
  const sAt = (t: number) => {
    const u = ((((t - t0) % TAU) + TAU) % TAU) / TAU * M
    const j = Math.min(M - 1, Math.floor(u))
    return cum[j] + (u - j) * (cum[j + 1] - cum[j])
  }
  return { total, tAt, sAt }
}

/** `n` ellipse parameters equally spaced by arc length, the first at `t0`. */
export function arcSlots(a: number, b: number, n: number, t0: number): number[] {
  const { total, tAt } = arcTable(a, b, t0)
  return Array.from({ length: Math.max(0, n) }, (_, k) => tAt((total * k) / n))
}

/**
 * Positions on a circle of length `total` (sorted ascending), pushed apart
 * until neighbours are at least `gap` apart; the order is kept. If they do
 * not fit, they end up evenly spaced.
 */
export function spreadOnCircle(sorted: readonly number[], total: number, gap: number): number[] {
  const n = sorted.length
  if (n < 2) return [...sorted]
  if (n * gap >= total) return sorted.map((_, i) => sorted[0] + (total * i) / n)
  const x = [...sorted]
  for (let it = 0; it < 400; it++) {
    let moved = false
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      const d = j === 0 ? x[0] + total - x[n - 1] : x[j] - x[i]
      if (d < gap - 1e-6) {
        const push = (gap - d) / 2
        x[i] -= push
        x[j] += push
        moved = true
      }
    }
    if (!moved) break
  }
  return x
}

/** Middle of the widest empty sector between the given angles (null if none). */
function widestGapMid(angles: number[]): number | null {
  if (!angles.length) return null
  const as = angles.map((a) => ((a % TAU) + TAU) % TAU).sort((x, y) => x - y)
  let gap = -1
  let at = 0
  for (let i = 0; i < as.length; i++) {
    const a = as[i]
    const b = i + 1 < as.length ? as[i + 1] : as[0] + TAU
    if (b - a > gap) {
      gap = b - a
      at = a + (b - a) / 2
    }
  }
  return at
}

const angDiff = (x: number, y: number) => {
  const d = Math.abs(x - y) % TAU
  return d > Math.PI ? TAU - d : d
}

/**
 * Which group each person belongs to and the order inside it:
 * 0 directly linked to me (strongest link first), 1 reachable via others
 * (fewer hops first), 2 no path to me (people with links first). Ties by name.
 */
export function ringGroups(people: ReadonlyArray<{ id: string; name: string }>, links: readonly PersonLink[]): string[][] {
  const adj = adjacency(links)
  const d = hops(adj, ME)
  const mine = adj.get(ME) ?? new Map<string, number>()
  const name = new Map(people.map((p) => [p.id, p.name]))
  const byName = (x: string, y: string) => (name.get(x) ?? '').localeCompare(name.get(y) ?? '') || x.localeCompare(y)
  const g: string[][] = [[], [], []]
  for (const p of people) {
    const h = d.get(p.id)
    g[h === 1 ? 0 : h === undefined ? 2 : 1].push(p.id)
  }
  g[0].sort((x, y) => (mine.get(y) ?? 0) - (mine.get(x) ?? 0) || byName(x, y))
  g[1].sort((x, y) => d.get(x)! - d.get(y)! || byName(x, y))
  g[2].sort((x, y) => Number(adj.has(y)) - Number(adj.has(x)) || byName(x, y))
  return g
}

/**
 * Me in the middle, everyone else on elliptical rings around me: group by
 * group from the inside out (a group never shares a ring with the next one,
 * a big group spills over onto further rings).
 *
 * Along a ring: people whose links lead inwards sit at the mean angle of
 * their already placed neighbours (ring-mates linked to them follow), pushed
 * apart to at least `spacing`; a ring with no such links is a greedy chain
 * (each next person the one most linked to the last), cut into clusters of
 * linked people that sit side by side, the clusters spread evenly around the
 * ring — or, for a lone cluster, into the emptiest direction. A full ring
 * falls back to evenly spaced slots. Desktop ORBIT's ring layout, adapted to
 * small personal networks.
 */
export function ringLayout(people: ReadonlyArray<{ id: string; name: string }>, allLinks: readonly PersonLink[], opts: LayoutOpts = {}): NetLayout {
  const aspect = opts.aspect ?? 1.4
  const spacing = opts.spacing ?? 92
  const first = opts.first ?? 104
  const gap = opts.gap ?? 78
  const padX = opts.padX ?? 64
  const padY = opts.padY ?? 50
  const links = validLinks(allLinks, new Set(people.map((p) => p.id)))
  const groups = ringGroups(people, links)
  // the shorter half-axis is `r`; the ellipse stretches along the longer side
  const axes = (r: number): [number, number] => (aspect >= 1 ? [r * aspect, r] : [r, r / aspect])

  const rings: Ring[] = []
  groups.forEach((ids, group) => {
    let i = 0
    while (i < ids.length) {
      const r = first + rings.length * gap
      const [rx, ry] = axes(r)
      const cap = Math.max(4, Math.floor(perimeter(rx, ry) / spacing))
      rings.push({ group: group as RingGroup, rx, ry, ids: ids.slice(i, i + cap) })
      i += cap
    }
  })

  const adj = new Map<string, Map<string, number>>()
  for (const [k, m] of adjacency(links)) {
    if (k === ME) continue
    const n = new Map(m)
    n.delete(ME)
    if (n.size) adj.set(k, n)
  }
  const w = (x: string, y: string) => adj.get(x)?.get(y) ?? 0
  // ellipse parameter per placed person; all rings share the aspect, so the same t is the same direction
  const angle = new Map<string, number>()
  const t0 = -Math.PI / 2
  const pos = new Map<string, Pt>([[ME, { x: 0, y: 0 }]])

  for (const ring of rings) {
    const ids = ring.ids
    const n = ids.length
    const { total, tAt, sAt } = arcTable(ring.rx, ring.ry, t0)
    const full = n * spacing >= total * 0.9
    const evenly = (order: string[], off = 0) => order.forEach((s, i) => angle.set(s, tAt((total * (i + off)) / n)))

    // wishes: the mean direction of placed neighbours, then of ring-mates that already have one
    const want = new Map<string, number>()
    for (let grew = true; grew; ) {
      grew = false
      for (const s of ids) {
        if (want.has(s)) continue
        let sx = 0
        let sy = 0
        for (const [o, v] of adj.get(s) ?? []) {
          const a = angle.get(o) ?? want.get(o)
          if (a === undefined) continue
          sx += v * Math.cos(a)
          sy += v * Math.sin(a)
        }
        if (sx || sy) {
          want.set(s, Math.atan2(sy, sx))
          grew = true
        }
      }
    }

    if (want.size === 0) {
      // greedy chain
      const left = new Set(ids)
      const strength = (s: string) => ids.reduce((acc, o) => acc + w(s, o), 0)
      let cur = ids.reduce((best, s) => (strength(s) > strength(best) ? s : best), ids[0])
      const order: string[] = []
      while (left.size) {
        order.push(cur)
        left.delete(cur)
        if (!left.size) break
        let next = ''
        let bw = -1
        for (const s of left) {
          // the last two placed count, so a chain does not jump between groups
          const v = 2 * w(cur, s) + (order.length > 1 ? w(order[order.length - 2], s) : 0)
          if (v > bw) {
            bw = v
            next = s
          }
        }
        cur = next
      }
      if (full) evenly(order)
      else {
        const clusters: string[][] = []
        for (const s of order) {
          const c = clusters.at(-1)
          if (c && c.some((o) => w(o, s) > 0)) c.push(s)
          else clusters.push([s])
        }
        const free = (total - n * spacing) / clusters.length
        const placed = [...angle.values()]
        const centre = clusters.length === 1 && placed.length ? sAt(widestGapMid(placed)!) : 0
        let at = centre - (clusters[0].length * spacing) / 2
        for (const c of clusters) {
          c.forEach((s, i) => angle.set(s, tAt(at + (i + 0.5) * spacing)))
          at += c.length * spacing + free
        }
      }
    } else {
      // people without any link inwards go into the widest gaps between the wishes
      for (const s of ids) if (!want.has(s)) want.set(s, widestGapMid([...want.values()])!)
      const order = [...ids].sort((x, y) => sAt(want.get(x)!) - sAt(want.get(y)!) || x.localeCompare(y))
      if (full) {
        // turn the evenly spaced ring so the slots match the wishes best
        const slots = arcSlots(ring.rx, ring.ry, n, t0)
        let bestOff = 0
        let bestCost = Infinity
        for (let off = 0; off < n; off++) {
          let cost = 0
          for (let i = 0; i < n; i++) cost += angDiff(want.get(order[i])!, slots[(i + off) % n])
          if (cost < bestCost - 1e-9) {
            bestCost = cost
            bestOff = off
          }
        }
        order.forEach((s, i) => angle.set(s, slots[(i + bestOff) % n]))
      } else {
        const spread = spreadOnCircle(order.map((s) => sAt(want.get(s)!)), total, spacing)
        order.forEach((s, i) => angle.set(s, tAt(spread[i])))
      }
    }
    for (const s of ids) {
      const a = angle.get(s)!
      pos.set(s, { x: ring.rx * Math.cos(a), y: ring.ry * Math.sin(a) })
    }
  }

  const outer = rings.at(-1)
  const [ox, oy] = outer ? [outer.rx, outer.ry] : axes(first * 0.6)
  return { pos, rings, halfW: ox + padX, halfH: oy + padY, nn: medianNearest([...pos.values()]) }
}

export function medianNearest(pts: readonly Pt[]): number {
  if (pts.length < 2) return Infinity
  const d = pts.map((a) => {
    let m = Infinity
    for (const b of pts) if (b !== a) m = Math.min(m, Math.hypot(a.x - b.x, a.y - b.y))
    return m
  })
  d.sort((x, y) => x - y)
  return d[Math.floor(d.length / 2)]
}
