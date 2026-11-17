import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Copy, ExternalLink, MessageSquarePlus, Square, Trash2 } from 'lucide-react'
import { Markdown } from '../components/Markdown.tsx'
import { toast } from '../components/ui.tsx'
import { Smiski } from '../smiski/Smiski.tsx'
import { getData, uid, update, useData } from '../lib/store.ts'
import { useT } from '../lib/i18n.ts'
import { go } from '../lib/router.ts'
import { ask, claudeLink, errorText, MODELS } from '../lib/claude.ts'
import type { Chat, ChatMessage, ClaudeModel } from '../lib/types.ts'

const putChat = (chat: Chat) => update('chats', (prev) => [chat, ...prev.filter((c) => c.id !== chat.id)].slice(0, 50))

export function Ask() {
  const data = useData()
  const { t } = useT()
  const [chatId, setChatId] = useState<string | null>(() => data.chats[0]?.id ?? null)
  // A question typed on the start page arrives here once: sent right away with a
  // key, otherwise left in the box (opening claude.ai needs a fresh tap).
  const [draft] = useState(() => {
    const v = sessionStorage.getItem('orbit-ask-draft') ?? ''
    sessionStorage.removeItem('orbit-ask-draft')
    return v
  })
  const [input, setInput] = useState(() => (data.settings.apiKey.trim() ? '' : draft))
  const [busy, setBusy] = useState(false)
  const [streamText, setStreamText] = useState('')
  const abort = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const chat = data.chats.find((c) => c.id === chatId) ?? null
  const hasKey = data.settings.apiKey.trim().length > 0
  const name = data.settings.name.trim()

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [chat?.messages.length, streamText])
  useEffect(
    () => () => {
      abort.current?.abort()
    },
    [],
  )

  const send = async (text: string, fresh = false) => {
    const q = text.trim()
    if (!q || busy) return
    if (!hasKey) {
      window.open(claudeLink(q, getData(), data.settings.shareContext), '_blank')
      return
    }
    const userMsg: ChatMessage = { role: 'user', content: q, at: Date.now() }
    const base: Chat = (!fresh && chat) || { id: uid(), title: q.slice(0, 60), messages: [], updatedAt: Date.now() }
    let cur: Chat = { ...base, messages: [...base.messages, userMsg], updatedAt: Date.now() }
    putChat(cur)
    setChatId(cur.id)
    setInput('')
    setBusy(true)
    setStreamText('')
    const ctl = new AbortController()
    abort.current = ctl
    let acc = ''
    try {
      const full = await ask({
        data: getData(),
        history: cur.messages,
        withContext: data.settings.shareContext,
        signal: ctl.signal,
        onText: (d) => {
          acc += d
          setStreamText(acc)
        },
      })
      cur = { ...cur, messages: [...cur.messages, { role: 'assistant', content: full, at: Date.now() }], updatedAt: Date.now() }
    } catch (err) {
      if (ctl.signal.aborted) {
        if (acc) cur = { ...cur, messages: [...cur.messages, { role: 'assistant', content: `${acc} …`, at: Date.now() }] }
      } else {
        cur = { ...cur, messages: [...cur.messages, { role: 'assistant', content: errorText(err, data.settings.lang), at: Date.now(), error: true }] }
      }
    } finally {
      putChat(cur)
      setBusy(false)
      setStreamText('')
      abort.current = null
    }
  }

  useEffect(() => {
    if (!draft || !hasKey) return
    // Deferred so StrictMode's mount/unmount/mount in dev sends exactly once.
    const timer = setTimeout(() => void send(draft, true), 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const suggestions = [t('ask.s1'), t('ask.s2'), t('ask.s3'), t('ask.s4')]

  return (
    <div className="page ask">
      <div className="split">
        <aside className="split-list chat-list">
          <button
            type="button"
            className="btn primary wide"
            onClick={() => {
              abort.current?.abort()
              setChatId(null)
            }}
          >
            <MessageSquarePlus size={16} /> {t('ask.newChat')}
          </button>
          {data.chats.length > 0 && (
          <ul className="list">
            {data.chats.map((c) => (
              <li key={c.id} className={`row chat-row ${c.id === chatId ? 'active' : ''}`}>
                <button type="button" className="grow chat-title" onClick={() => setChatId(c.id)}>
                  {c.title}
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  aria-label={t('ask.deleteChat')}
                  onClick={() => {
                    update('chats', (prev) => prev.filter((x) => x.id !== c.id))
                    if (c.id === chatId) setChatId(null)
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
          )}
        </aside>

        <section className="split-detail chat">
          <div className="chat-mobile-head">
            <select value={chatId ?? ''} onChange={(e) => setChatId(e.target.value || null)} aria-label={t('ask.chats')} className="grow">
              <option value="">{t('ask.newChat')}</option>
              {data.chats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="icon-btn"
              aria-label={t('ask.newChat')}
              onClick={() => {
                abort.current?.abort()
                setChatId(null)
              }}
            >
              <MessageSquarePlus size={18} />
            </button>
          </div>
          <div className="chat-scroll">
            {!chat && (
              <div className="chat-hello">
                <Smiski pose="thinking" size={110} busy={busy} />
                <h2>{t('ask.hello', { name: name ? ` ${name}` : '' })}</h2>
                {!hasKey && (
                  <p className="hint">
                    {t('ask.noKey')}{' '}
                    <button type="button" className="link-btn" onClick={() => go('settings')}>
                      {t('nav.settings')} →
                    </button>
                    <br />
                    {t('ask.openClaudeHint')}
                  </p>
                )}
                <div className="chips center">
                  {suggestions.map((s) => (
                    <button key={s} type="button" className="chip" onClick={() => void send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chat?.messages.map((m, i) => (
              <div key={i} className={`msg ${m.role} ${m.error ? 'error' : ''}`}>
                {m.role === 'assistant' ? <Markdown text={m.content} /> : <p>{m.content}</p>}
                {m.role === 'assistant' && !m.error && (
                  <button
                    type="button"
                    className="icon-btn tiny"
                    aria-label={t('ask.copy')}
                    onClick={() => {
                      void navigator.clipboard?.writeText(m.content)
                      toast('✓')
                    }}
                  >
                    <Copy size={13} />
                  </button>
                )}
              </div>
            ))}
            {busy && (
              <div className="msg assistant streaming">
                {streamText ? <Markdown text={streamText} /> : <Smiski pose="thinking" variant="head" size={28} busy />}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault()
              void send(input)
            }}
          >
            <div className="composer-opts">
              <label className="mini-toggle">
                <input type="checkbox" checked={data.settings.shareContext} onChange={(e) => update('settings', (s) => ({ ...s, shareContext: e.target.checked }))} />
                {t('ask.context')}
              </label>
              {hasKey && (
                <select value={data.settings.model} onChange={(e) => update('settings', (s) => ({ ...s, model: e.target.value as ClaudeModel }))} aria-label={t('set.model')}>
                  {MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              )}
              <span className="grow" />
              {input.trim() && (
                <a className="link-btn" href={claudeLink(input, data, data.settings.shareContext)} target="_blank" rel="noreferrer">
                  <ExternalLink size={13} /> {t('ask.openClaude')}
                </a>
              )}
            </div>
            <div className="composer-row">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('ask.placeholder')}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send(input)
                  }
                }}
              />
              {busy ? (
                <button type="button" className="send" onClick={() => abort.current?.abort()} aria-label={t('ask.stop')}>
                  <Square size={16} />
                </button>
              ) : (
                <button type="submit" className="send" disabled={!input.trim()} aria-label={hasKey ? t('ask.send') : t('ask.openClaude')}>
                  {hasKey ? <ArrowUp size={18} /> : <ExternalLink size={16} />}
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
