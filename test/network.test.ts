import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ME, adjacency, spreadOnCircle, linkLabels, linksWithout, pathBetween, ringGroups, ringLayout, shortestPath, upsertLink, validLinks } from '../src/lib/network.ts'
import type { PersonLink } from '../src/lib/types.ts'

const L = (id: string, a: string, b: string, strength: 1 | 2 | 3 = 2, label?: string): PersonLink => ({ id, a, b, strength, label })
const people = ['lena', 'jonas', 'mira', 'tim', 'ana', 'ben'].map((id) => ({ id, name: id[0].toUpperCase() + id.slice(1) }))
// me – lena (3), me – jonas (1), lena – mira, mira – tim, ana – ben, nobody – ghost
const links = [L('1', ME, 'lena', 3, 'Lerngruppe'), L('2', 'jonas', ME, 1), L('3', 'lena', 'mira'), L('4', 'mira', 'tim'), L('5', 'ana', 'ben', 2, 'WG'), L('6', 'ghost', 'lena')]

test('validLinks drops links to unknown people and self-links', () => {
  const ok = validLinks([...links, L('7', 'tim', 'tim')], new Set(people.map((p) => p.id)))
  assert.deepEqual(ok.map((l) => l.id), ['1', '2', '3', '4', '5'])
})

test('ringGroups: direct (strongest first), via others (fewer hops first), unlinked', () => {
  const g = ringGroups(people, validLinks(links, new Set(people.map((p) => p.id))))
  assert.deepEqual(g, [['lena', 'jonas'], ['mira', 'tim'], ['ana', 'ben']])
})

test('shortestPath / pathBetween', () => {
  const adj = adjacency(validLinks(links, new Set(people.map((p) => p.id))))
  assert.deepEqual(shortestPath(adj, ME, 'tim'), [ME, 'lena', 'mira', 'tim'])
  assert.equal(shortestPath(adj, ME, 'ben'), null)
  assert.deepEqual(shortestPath(adj, 'ana', 'ana'), ['ana'])
  // jonas and tim only meet via me: allowed as a fallback
  assert.deepEqual(pathBetween(adj, 'jonas', 'tim'), ['jonas', ME, 'lena', 'mira', 'tim'])
  // a path that avoids me wins over a shorter one through me
  const adj2 = adjacency([L('a', ME, 'x'), L('b', ME, 'y'), L('c', 'x', 'z'), L('d', 'z', 'y')])
  assert.deepEqual(pathBetween(adj2, 'x', 'y'), ['x', 'z', 'y'])
  assert.deepEqual(shortestPath(adj2, 'x', 'y'), ['x', ME, 'y'])
})

test('link editing helpers', () => {
  let n = 0
  const id = () => `n${++n}`
  let ls = upsertLink([], 'lena', 'mira', 2, '  Lerngruppe ', id)
  assert.deepEqual(ls, [{ id: 'n1', a: 'lena', b: 'mira', strength: 2, label: 'Lerngruppe' }])
  ls = upsertLink(ls, 'mira', 'lena', 3, '', id)
  assert.deepEqual(ls, [{ id: 'n1', a: 'lena', b: 'mira', strength: 3, label: undefined }])
  assert.equal(upsertLink(ls, 'tim', 'tim', 1, undefined, id).length, 1)
  assert.deepEqual(linksWithout(links, 'lena').map((l) => l.id), ['2', '4', '5'])
  assert.deepEqual(linkLabels(links), ['Lerngruppe', 'WG'])
})

test('ringLayout: me at the centre, each group on its own ring, no two heads on top of each other', () => {
  const lay = ringLayout(people, links, { aspect: 1.5 })
  assert.deepEqual(lay.pos.get(ME), { x: 0, y: 0 })
  assert.deepEqual(lay.rings.map((r) => r.group), [0, 1, 2])
  assert.equal(lay.pos.size, people.length + 1)
  const ring = (id: string) => lay.rings.findIndex((r) => r.ids.includes(id))
  assert.ok(ring('lena') < ring('mira') && ring('mira') < ring('ana'))
  // rings are wider than tall in landscape and grow outwards
  for (const r of lay.rings) assert.ok(r.rx > r.ry)
  assert.ok(lay.rings[1].ry > lay.rings[0].ry)
  assert.ok(lay.nn > 60)
  // portrait: taller than wide
  const port = ringLayout(people, links, { aspect: 0.75 })
  for (const r of port.rings) assert.ok(r.ry > r.rx)
  // a big group spills over onto further rings, keeping heads apart
  const many = Array.from({ length: 30 }, (_, i) => ({ id: `p${i}`, name: `P${String(i).padStart(2, '0')}` }))
  const big = ringLayout(many, many.map((p, i) => L(`l${i}`, ME, p.id)), { aspect: 1 })
  assert.ok(big.rings.length >= 2 && big.rings.every((r) => r.group === 0))
  assert.equal(big.rings.reduce((n, r) => n + r.ids.length, 0), 30)
  assert.ok(big.nn >= 80, `heads too close: ${big.nn}`)
  // empty network: just me
  const none = ringLayout([], [])
  assert.equal(none.pos.size, 1)
  assert.equal(none.rings.length, 0)
})

test('ringLayout: linked pairs sit side by side, follow their inner neighbour', () => {
  const lay = ringLayout(people, links, { aspect: 1.5, spacing: 92 })
  const d = (a: string, b: string) => Math.hypot(lay.pos.get(a)!.x - lay.pos.get(b)!.x, lay.pos.get(a)!.y - lay.pos.get(b)!.y)
  // ana – ben are only linked to each other: neighbours on their ring, not opposite
  assert.ok(d('ana', 'ben') < 130, `ana–ben ${d('ana', 'ben')}`)
  // mira sits outside lena (her only link inwards), tim next to mira
  assert.ok(d('lena', 'mira') < d('jonas', 'mira'))
  assert.ok(d('mira', 'tim') < 140, `mira–tim ${d('mira', 'tim')}`)
  // nobody overlaps
  assert.ok(lay.nn >= 80, `nn ${lay.nn}`)
})

test('spreadOnCircle keeps order and the minimum gap', () => {
  const x = spreadOnCircle([10, 12, 14, 500], 1000, 100)
  for (let i = 1; i < x.length; i++) assert.ok(x[i] - x[i - 1] >= 99.9, `${x}`)
  assert.ok(x[0] + 1000 - x[3] >= 99.9)
  assert.deepEqual(spreadOnCircle([1, 2, 3], 120, 100), [1, 41, 81])
})
