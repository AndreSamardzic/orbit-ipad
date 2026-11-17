// Markdown → text a speech synthesizer can read, and chunking into short
// utterances (WebKit/Edge stall or cut off very long ones). Pure — tested.

const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}\u{20E3}]/gu

function inline(s: string): string {
  let t = s
  t = t.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  t = t.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1')
  t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  t = t.replace(/<https?:\/\/[^>]+>/gi, '').replace(/\b(?:https?:\/\/|www\.)\S+/gi, '')
  t = t.replace(/`([^`]*)`/g, (_m, c: string) => (c.length > 40 ? '' : c))
  t = t.replace(/<br\s*\/?>/gi, ' ').replace(/<\/?[a-z][^>]*>/gi, '')
  t = t.replace(/(\*\*|__)(.+?)\1/g, '$2').replace(/~~(.+?)~~/g, '$1')
  t = t.replace(/(^|[\s(])[*_]([^*_\s][^*_]*?)[*_](?=[\s).,!?:;]|$)/g, '$1$2').replace(/\*\*|__/g, '')
  t = t.replace(/\s*(?:→|->|⇒|=>)\s*/g, ', ')
  t = t.replace(/[•·▪►✓✔✗✘]/g, ' ').replace(EMOJI, '')
  t = t.replace(/\\([\\`*_{}[\]()#+\-.!|>])/g, '$1')
  return t.replace(/\s+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim()
}

/** Markdown answer → plain sentences. Code blocks become `codeLabel`, tables are dropped. */
export function toSpeech(md: string, codeLabel = ''): string {
  const out: string[] = []
  let inCode = false
  for (const raw of md.replace(/\r/g, '').split('\n')) {
    const line = raw.trim()
    if (/^(```|~~~)/.test(line)) {
      if (!inCode && codeLabel) out.push(codeLabel)
      inCode = !inCode
      continue
    }
    if (inCode || !line) continue
    if (/^\|.*\|$/.test(line) || /^[-*_]{3,}$/.test(line)) continue
    let t = line.replace(/^#{1,6}\s+/, '').replace(/^>\s?/, '').replace(/^(?:[-*+]|\d+[.)])\s+/, '').replace(/^\[[ xX]\]\s+/, '')
    t = inline(t)
    if (!t) continue
    // headings and list items become sentences of their own
    if (!/[.!?:;…]$/.test(t)) t += '.'
    out.push(t)
  }
  return out.join(' ').replace(/\s+/g, ' ').trim()
}

/** Splits into utterances of at most `max` characters, at sentence ends where possible. */
export function chunks(text: string, max = 200): string[] {
  const sentences = text.match(/[^.!?…]+(?:[.!?…]+|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? []
  const out: string[] = []
  let cur = ''
  const push = (s: string) => {
    if (s.trim()) out.push(s.trim())
  }
  for (const s of sentences) {
    if (s.length > max) {
      push(cur)
      cur = ''
      // long sentence: split at commas, then at spaces
      let rest = s
      while (rest.length > max) {
        let cut = rest.lastIndexOf(', ', max)
        if (cut < max / 3) cut = rest.lastIndexOf(' ', max)
        if (cut <= 0) cut = max
        push(rest.slice(0, cut + 1))
        rest = rest.slice(cut + 1)
      }
      cur = rest
      continue
    }
    if ((cur + ' ' + s).trim().length > max) {
      push(cur)
      cur = s
    } else cur = (cur + ' ' + s).trim()
  }
  push(cur)
  return out
}

/** At most `max` characters, cut after a full sentence. */
export function clip(text: string, max = 700): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  return end > max / 3 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(' '))} …`
}
