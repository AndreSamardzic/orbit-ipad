// Claude straight from the iPad with the user's private API key. No server in
// between: the browser talks to api.anthropic.com (CORS opt-in below).
import Anthropic from '@anthropic-ai/sdk'
import { eventsOn, fmtTime, startMs, dayKey, fmtDay } from './dates.ts'
import type { ChatMessage, ClaudeModel, Data } from './types.ts'

export const MODELS: { id: ClaudeModel; label: string }[] = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5' },
]

/** what the model learns about the user's day: compact plain text, built fresh per question. */
export function buildContext(d: Data, now = new Date()): string {
  const lang = d.settings.lang
  const today = dayKey(now)
  const lines: string[] = [`Now: ${now.toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB')} (${fmtDay(today, lang)})`]
  const todays = eventsOn(d.events, today)
  if (todays.length) {
    lines.push('', "Today's calendar:")
    for (const e of todays) lines.push(`- ${e.allDay ? 'all day' : fmtTime(startMs(e), lang)} ${e.title}${e.location ? ` @ ${e.location}` : ''}`)
  }
  const moodleIds = new Set(d.sources.filter((s) => s.kind === 'moodle').map((s) => s.id))
  const upcoming = d.events
    .filter((e) => moodleIds.has(e.sourceId) && startMs(e) >= now.getTime())
    .sort((a, b) => startMs(a) - startMs(b))
    .slice(0, 10)
  if (upcoming.length) {
    lines.push('', 'Upcoming deadlines:')
    for (const e of upcoming) lines.push(`- ${new Date(startMs(e)).toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB')} ${e.title}${e.category ? ` (${e.category})` : ''}`)
  }
  const open = d.tasks.filter((t) => !t.done).sort((a, b) => a.prio - b.prio || (a.due ?? '9').localeCompare(b.due ?? '9')).slice(0, 25)
  if (open.length) {
    lines.push('', 'Open tasks:')
    for (const t of open) lines.push(`- [P${t.prio}] ${t.title}${t.due ? ` (due ${t.due})` : ''}`)
  }
  const pinned = d.notes.filter((n) => n.pinned).slice(0, 5)
  for (const n of pinned) lines.push('', `Pinned note "${n.title || 'untitled'}":`, n.body.slice(0, 2000))
  return lines.join('\n')
}

function systemPrompt(d: Data, withContext: boolean): string {
  const name = d.settings.name.trim()
  const lang = d.settings.lang === 'de' ? 'German' : 'English'
  const base = `You are the assistant inside ORBIT, ${name ? `${name}'s` : 'a'} personal iPad app for studying at DHBW Mannheim and private life. Answer in ${lang} unless asked otherwise. Be concise and concrete; use Markdown sparingly. You cannot change anything in the app yourself — suggest, and the user acts.`
  return withContext ? `${base}\n\n<orbit_context>\n${buildContext(d)}\n</orbit_context>` : base
}

export interface AskOptions {
  data: Data
  history: ChatMessage[]
  withContext: boolean
  signal: AbortSignal
  onText: (delta: string) => void
}

export async function ask({ data, history, withContext, signal, onText }: AskOptions): Promise<string> {
  const client = new Anthropic({ apiKey: data.settings.apiKey.trim(), dangerouslyAllowBrowser: true, maxRetries: 1 })
  const messages: Anthropic.Beta.BetaMessageParam[] = history.filter((m) => !m.error && m.content.trim()).map((m) => ({ role: m.role, content: m.content }))
  const stream = client.beta.messages.stream(
    {
      model: data.settings.model,
      max_tokens: 64000,
      betas: ['server-side-fallback-2026-07-01'],
      // A policy decline is retried server-side on a suitable model instead of ending the answer.
      fallbacks: 'default',
      output_config: { effort: data.settings.model === 'claude-haiku-5-5' ? 'low' : 'medium' },
      system: systemPrompt(data, withContext),
      messages,
    } as Anthropic.Beta.MessageCreateParamsStreaming,
    { signal },
  )
  for await (const ev of stream) {
    if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') onText(ev.delta.text)
  }
  const final = await stream.finalMessage()
  if (final.stop_reason === 'refusal') throw new Error('refusal')
  return final.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
}

export function errorText(err: unknown, lang: 'de' | 'en'): string {
  const de = lang === 'de'
  if (err instanceof Anthropic.AuthenticationError) return de ? 'API-Key ungültig – bitte in den Einstellungen prüfen.' : 'Invalid API key — check Settings.'
  if (err instanceof Anthropic.PermissionDeniedError) return de ? 'Kein Zugriff auf dieses Modell mit diesem Key.' : 'This key has no access to that model.'
  if (err instanceof Anthropic.RateLimitError) return de ? 'Zu viele Anfragen oder Guthaben aufgebraucht – kurz warten oder Konto prüfen.' : 'Rate limited or out of credit — wait or check your account.'
  if (err instanceof Anthropic.BadRequestError) return (de ? 'Anfrage abgelehnt: ' : 'Request rejected: ') + err.message
  if (err instanceof Anthropic.APIConnectionError) return de ? 'Keine Verbindung zu Anthropic – bist du online?' : 'Cannot reach Anthropic — are you online?'
  if (err instanceof Anthropic.APIError) return `API ${err.status}: ${err.message}`
  if (err instanceof Error && err.message === 'refusal') return de ? 'Claude hat diese Anfrage abgelehnt.' : 'Claude declined this request.'
  return err instanceof Error ? err.message : String(err)
}

/** claude.ai prefill link: uses the private Claude subscription, no key needed. */
export function claudeLink(question: string, data: Data, withContext: boolean): string {
  const text = withContext ? `${question}\n\n---\nKontext aus meiner ORBIT-App:\n${buildContext(data)}` : question
  return `https://claude.ai/new?q=${encodeURIComponent(text.slice(0, 6000))}`
}
