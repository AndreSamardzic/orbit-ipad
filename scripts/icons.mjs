// Renders the home-screen icons (PNG) from the Smiski head SVG with Chromium.
// Needs playwright-core somewhere resolvable: PLAYWRIGHT_CORE=/path/to/playwright-core.
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_CORE ?? 'playwright-core')
const svg = readFileSync(new URL('../public/orbit-icon.svg', import.meta.url), 'utf8')
const sizes = { 'icon-180.png': 180, 'icon-192.png': 192, 'icon-512.png': 512, 'icon-maskable-512.png': 512 }
const browser = await chromium.launch()
const page = await browser.newPage()
for (const [name, size] of Object.entries(sizes)) {
  const pad = name.includes('maskable') ? 0.2 : 0.12
  const inner = Math.round(size * (1 - 2 * pad))
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0;width:${size}px;height:${size}px;background:#f5f5f2;display:grid;place-items:center">
    <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`)
  writeFileSync(new URL(`../public/${name}`, import.meta.url), await page.screenshot({ type: 'png' }))
}
await browser.close()
console.log('icons written')
