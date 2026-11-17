import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_CORE)
const BASE = process.env.BASE ?? 'http://127.0.0.1:4190/'
const OUT = process.env.OUT ?? '/tmp/orbit-ipad-shots'
const now = new Date()
const pad = (n) => String(n).padStart(2, '0')
const dk = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const at = (h, m, addDays = 0) => { const d = new Date(now); d.setDate(d.getDate() + addDays); d.setHours(h, m, 0, 0); return d.toISOString() }
const today = dk(now)
const tomorrow = dk(new Date(now.getTime() + 86400000))
const data = {
  settings: { lang: 'de', theme: 'light', glow: true, motion: true, name: 'Alex', mePose: 'typing', apiKey: '', model: 'claude-opus-5-5', shareContext: true },
  tasks: [
    { id: 't1', title: 'Hausarbeit Kapitel 3 gliedern', done: false, prio: 1, due: tomorrow, createdAt: 1 },
    { id: 't2', title: 'Karteikarten Statistik', done: false, prio: 2, createdAt: 2 },
    { id: 't3', title: 'Bahnticket buchen', done: false, prio: 3, due: dk(new Date(now.getTime() - 86400000)), createdAt: 3 },
    { id: 't4', title: 'Mail an Studiengangsleitung', done: true, prio: 2, createdAt: 4, doneAt: Date.now() },
  ],
  notes: [
    { id: 'n1', title: 'Lernplan Klausur', body: '## Woche 1\n- Kapitel 1–3\n- **Übungsblatt 4**\n\n## Woche 2\n- Altklausuren', pinned: true, updatedAt: Date.now() },
    { id: 'n2', title: 'Ideen Bachelorarbeit', body: 'Conversational Analytics?\nKosten pro Anfrage', pinned: false, updatedAt: Date.now() - 86400000 },
  ],
  people: [
    { id: 'p1', name: 'Lena', pose: 'reading', note: 'Lerngruppe Statistik', tags: ['wi24', 'lerngruppe'], updatedAt: 1 },
    { id: 'p2', name: 'Jonas', pose: 'running', note: '', tags: ['wi24'], updatedAt: 1, birthday: today.slice(5) },
    { id: 'p3', name: 'Mira', pose: 'camera', note: '', tags: ['privat'], updatedAt: 1 },
    { id: 'p4', name: 'Tim', pose: 'coffee', note: '', tags: [], updatedAt: 1 },
  ],
  sources: [
    { id: 's1', name: 'Vorlesungsplan WI24', kind: 'lectures', importedAt: Date.now(), count: 4 },
    { id: 's2', name: 'Moodle', kind: 'moodle', importedAt: Date.now(), count: 2 },
  ],
  events: [
    { id: 'e1', sourceId: 's1', title: 'Statistik II', start: at(9, 0), end: at(11, 30), allDay: false, location: 'Raum 164C' },
    { id: 'e2', sourceId: 's1', title: 'Wirtschaftsinformatik', start: at(13, 0), end: at(15, 15), allDay: false, location: 'Raum 033B' },
    { id: 'e3', sourceId: 's1', title: 'Programmieren', start: at(9, 0, 1), end: at(12, 15, 1), allDay: false },
    { id: 'e4', sourceId: 's1', title: 'Projektmanagement', start: at(10, 0, 2), end: at(12, 0, 2), allDay: false },
    { id: 'e5', sourceId: 's2', title: 'Abgabe Übungsblatt 4', start: at(23, 59, 1), allDay: false, category: 'Statistik II' },
    { id: 'e6', sourceId: 's2', title: 'Hausarbeit Entwurf', start: at(12, 0, 6), allDay: false, category: 'WI' },
  ],
  chats: [],
}
const browser = await chromium.launch()
for (const [vw, vh, tag] of [[1180, 820, 'land'], [820, 1180, 'port']]) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1, hasTouch: true })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(BASE)
  await page.evaluate(async (data) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open('orbit-ipad', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
    await new Promise((res) => { const t = db.transaction('kv', 'readwrite'); for (const [k, v] of Object.entries(data)) t.objectStore('kv').put(v, k); t.oncomplete = res })
  }, data)
  const routes = tag === 'land' ? ['', 'calendar', 'tasks', 'notes/n1', 'people', 'people/p1', 'ask', 'settings'] : ['', 'calendar', 'tasks', 'notes', 'ask']
  for (const r of routes) {
    await page.goto(`${BASE}#/${r}`)
    await page.reload()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${OUT}/${tag}-${r.replace('/', '_') || 'start'}.png` })
  }
  if (tag === 'land') {
    await page.evaluate(async () => {
      const db = await new Promise((res) => { const r = indexedDB.open('orbit-ipad', 1); r.onsuccess = () => res(r.result) })
      const s = await new Promise((res) => { const g = db.transaction('kv').objectStore('kv').get('settings'); g.onsuccess = () => res(g.result) })
      await new Promise((res) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put({ ...s, theme: 'dark' }, 'settings'); t.oncomplete = res })
    })
    for (const r of ['', 'people']) {
      await page.goto(`${BASE}#/${r}`); await page.reload(); await page.waitForTimeout(500)
      await page.screenshot({ path: `${OUT}/dark-${r || 'start'}.png` })
    }
  }
  console.log(tag, 'errors:', errors.length ? errors : 'none')
  await ctx.close()
}
await browser.close()
