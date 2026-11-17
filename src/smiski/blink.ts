// One shared, low-frequency scheduler for idle blinks. A CSS keyframe blink
// would be sampled every frame for every figure on screen; this instead
// flips a `data-blink` attribute for ~170 ms every 4-7 s per figure (random
// per instance, so a grid never blinks in sync). CSS decides whether the
// blink is visible (only when awake and data-motion is on).
const live = new Map<Element, number>()
let timer = 0

const nextGap = () => 4000 + Math.random() * 3000

function blink(el: Element) {
  el.setAttribute('data-blink', '')
  window.setTimeout(() => el.removeAttribute('data-blink'), 170)
}

function tick() {
  if (document.hidden) return
  const now = performance.now()
  for (const [el, due] of live) {
    if (now < due) continue
    blink(el)
    // now and then a double blink
    if (Math.random() < 0.18) window.setTimeout(() => live.has(el) && blink(el), 330)
    live.set(el, now + nextGap())
  }
}

export function watchBlink(el: Element): () => void {
  live.set(el, performance.now() + 600 + Math.random() * 6400)
  if (!timer) timer = window.setInterval(tick, 200)
  return () => {
    live.delete(el)
    if (live.size === 0 && timer) {
      window.clearInterval(timer)
      timer = 0
    }
  }
}
