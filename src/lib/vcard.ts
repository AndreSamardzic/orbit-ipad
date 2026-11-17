// Reads the .vcf files iOS Contacts shares ("Kontakt teilen"): name, mail,
// phone, birthday, note. Several cards per file are fine.
import { unfold, parseProp, unescapeText } from './ics.ts'

export interface VCardPerson {
  name: string
  email?: string
  phone?: string
  birthday?: string
  note?: string
}

export function parseVCards(text: string): VCardPerson[] {
  const out: VCardPerson[] = []
  let cur: VCardPerson | null = null
  for (const line of unfold(text)) {
    const upper = line.toUpperCase()
    if (upper === 'BEGIN:VCARD') {
      cur = { name: '' }
      continue
    }
    if (!cur) continue
    if (upper === 'END:VCARD') {
      if (cur.name) out.push(cur)
      cur = null
      continue
    }
    const p = parseProp(line)
    if (!p) continue
    const name = p.name.replace(/^ITEM\d+\./, '')
    const v = unescapeText(p.value).trim()
    if (name === 'FN' && v) cur.name = v
    else if (name === 'N' && !cur.name) {
      const [last = '', first = ''] = p.value.split(';').map(unescapeText)
      cur.name = `${first} ${last}`.trim()
    } else if (name === 'EMAIL' && !cur.email) cur.email = v
    else if (name === 'TEL' && !cur.phone) cur.phone = v
    else if (name === 'NOTE') cur.note = v
    else if (name === 'BDAY') {
      const m = /^(\d{4}|--)-?(\d{2})-?(\d{2})/.exec(v)
      if (m) cur.birthday = m[1] === '--' || m[1] === '1604' ? `${m[2]}-${m[3]}` : `${m[1]}-${m[2]}-${m[3]}`
    }
  }
  return out
}
