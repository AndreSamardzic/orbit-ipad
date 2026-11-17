// Fuzzy matcher for the search palette (ported from desktop ORBIT web/src/lib/fuzzy.ts).
// A query matches when its characters appear in order AND every character either
// continues the previous match or starts a word ("lw" → "Lena Weber", "ub4" →
// "Übungsblatt 4"), so loose mid-word scatter is rejected. Case- and
// diacritics-insensitive. Pure — no DOM, no React; test/fuzzy.test.ts imports it.

export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

const BOUNDARY = /[\s\-_/.(),:;“”„"'·|]/

function isWordStart(t: string, i: number): boolean {
  return i === 0 || BOUNDARY.test(t[i - 1]) || (t[i - 1] >= 'a' && t[i - 1] <= 'z' && /[0-9]/.test(t[i]))
}

/** Best score for matching q[qi..] into t[ti..]; -1 when impossible. */
function search(q: string, t: string, qi: number, ti: number, prev: number, memo: Map<number, number>): number {
  if (qi === q.length) return 0
  const key = qi * 4096 + ti * 2 + (prev >= 0 && prev === ti - 1 ? 1 : 0)
  const hit = memo.get(key)
  if (hit !== undefined) return hit
  let best = -1
  const c = q[qi]
  for (let i = ti; i < t.length; i++) {
    if (t[i] !== c) continue
    const contiguous = prev >= 0 && i === prev + 1
    const start = isWordStart(t, i)
    if (!contiguous && !start) continue
    const rest = search(q, t, qi + 1, i + 1, i, memo)
    if (rest < 0) continue
    const s = rest + (contiguous ? 12 : 0) + (start ? 18 : 0) + 4 - Math.min(i - ti, 20) * 0.2
    if (s > best) best = s
  }
  memo.set(key, best)
  return best
}

/** Score > 0 means match. Higher is better. */
export function fuzzyScore(query: string, text: string): number {
  const q = fold(query.trim()).replace(/\s+/g, ' ')
  if (!q) return 1
  const t = fold(text)
  if (!t) return 0
  const direct = t.indexOf(q)
  if (direct !== -1) {
    const atWord = isWordStart(t, direct)
    return 1000 - Math.min(direct, 100) * 2 + (atWord ? 300 : 0) + (t.length === q.length ? 200 : 0)
  }
  // every query word appears (any order)
  const words = q.split(' ').filter(Boolean)
  if (words.length > 1 && words.every((w) => t.includes(w))) return 600 - Math.min(t.length, 200) / 10
  const compact = q.replace(/ /g, '')
  if (compact.length < 2 || t.length > 2000) return 0
  const s = search(compact, t, 0, 0, -1, new Map())
  return s > 0 ? 100 + s - t.length / 50 : 0
}

/** Plain substring match (for subtitles/keywords, where fuzzy is too noisy). */
export function containsScore(query: string, text: string): number {
  const q = fold(query.trim())
  if (!q) return 0
  const i = fold(text).indexOf(q)
  return i === -1 ? 0 : 400 - Math.min(i, 200)
}
