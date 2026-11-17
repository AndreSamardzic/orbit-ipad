import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_CORE)
const BASE = process.env.BASE ?? 'http://127.0.0.1:4190/'
const OUT = process.env.OUT ?? '/tmp/orbit-ipad-shots'
const ok = (c, m) => { if (!c) { console.error('FAIL', m); process.exitCode = 1 } else console.log('ok  ', m) }
const d = new Date(); const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
writeFileSync(`${OUT}/Vorlesungsplan.ics`, `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:x1\r\nSUMMARY:Testvorlesung\r\nDTSTART;TZID=Europe/Berlin:${ymd}T235000\r\nDTEND;TZID=Europe/Berlin:${ymd}T235900\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`)
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, acceptDownloads: true, timezoneId: 'Europe/Berlin' })
const page = await ctx.newPage()
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => m.type() === 'error' && errors.push(m.text())); page.on('requestfailed', (r) => errors.push('reqfail '+r.url()+' '+r.failure()?.errorText))
let apiReq = null
await page.route('https://api.anthropic.com/**', async (route) => {
  const req = route.request()
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST' } })
  apiReq = { url: req.url(), headers: req.headers(), body: JSON.parse(req.postData()) }
  const ev = (type, data) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`
  const msg = { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } }
  const body = ev('message_start', { message: msg }) + ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }) +
    ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'Heute: **Test' } }) + ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'vorlesung**.' } }) +
    ev('content_block_stop', { index: 0 }) + ev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 5 } }) + ev('message_stop', {})
  await route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream', 'access-control-allow-origin': '*' }, body })
})
await page.goto(BASE + '#/calendar')
await page.locator('input[type=file][accept*=ics]').setInputFiles(`${OUT}/Vorlesungsplan.ics`)
await page.getByText('1 Termine aus „Vorlesungsplan“').waitFor()
ok(await page.locator('.cal-day.is-today').getByText('Testvorlesung').count() === 1, 'ICS import shows event today')
ok(await page.locator('select').first().inputValue() === 'lectures', 'source kind guessed as lectures')
await page.goto(BASE + '#/tasks')
await page.getByPlaceholder('Neue Aufgabe').fill('Persistenztest')
await page.keyboard.press('Enter')
await page.getByRole('checkbox', { name: 'Persistenztest' }).click()
await page.waitForTimeout(400)
await page.reload()
ok(await page.getByRole('checkbox', { name: 'Persistenztest' }).getAttribute('aria-checked') === 'true', 'task persisted (done) after reload')
await page.goto(BASE + '#/settings')
await page.getByLabel('Dein Vorname').fill('Alex')
await page.locator('input[type=password]').fill('sk-ant-test-123')
await page.waitForTimeout(400)
const dl = page.waitForEvent('download'); await page.getByRole('button', { name: 'Backup exportieren' }).click()
const file = await (await dl).path(); const backup = JSON.parse(require('node:fs').readFileSync(file, 'utf8'))
ok(backup.format === 'orbit-ipad-backup' && backup.data.tasks.length === 1, 'backup exported')
ok(backup.data.settings.apiKey === '', 'API key NOT in backup')
await page.goto(BASE + '#/start')
await page.getByPlaceholder('Frag Claude').fill('Was steht heute an?')
await page.keyboard.press('Enter')
await page.locator('.msg.assistant strong', { hasText: 'Testvorlesung' }).waitFor({ timeout: 8000 })
ok(true, 'streamed answer rendered with markdown')
ok(apiReq.headers['x-api-key'] === 'sk-ant-test-123' || apiReq.headers['authorization'] === 'Bearer sk-ant-test-123', 'API key sent (x-api-key or Bearer)')
ok(apiReq.headers['anthropic-dangerous-direct-browser-access'] === 'true', 'browser-access header')
ok(apiReq.body.model === 'claude-opus-5-5' && apiReq.body.stream === true && apiReq.body.fallbacks === 'default', 'model/stream/fallbacks in body')
ok((apiReq.headers['anthropic-beta'] ?? '').includes('server-side-fallback-2026-07-01'), 'fallback beta header')
ok(apiReq.body.system.includes('Testvorlesung') && apiReq.body.system.includes('Alex'), 'context (event + name) in system prompt')
await page.waitForTimeout(400); await page.reload()
ok(await page.locator('.msg.assistant').count() === 1, 'chat persisted after reload')
page.on('dialog', (dlg) => dlg.accept())
await page.goto(BASE + '#/settings')
await page.locator('input[type=file][accept*=json]').setInputFiles(file)
await page.waitForTimeout(400)
ok(await page.locator('input[type=password]').inputValue() === 'sk-ant-test-123', 'API key kept after backup import')
console.log('page errors:', errors.length ? errors : 'none')
await browser.close()
