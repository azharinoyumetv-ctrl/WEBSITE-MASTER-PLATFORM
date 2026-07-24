'use client'

import { FormEvent, useEffect, useState } from 'react'
import { ArrowUpRight, Loader2, MessageCircle, Send, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

type ChatMessage = {
  id: string
  author: 'assistant' | 'visitor'
  text: string
}

export function SupportChatWidget() {
  const t = useTranslations('Storefront')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    author: 'assistant',
    text: t('support_welcome'),
  }])

  useEffect(() => {
    const openChat = () => setOpen(true)
    window.addEventListener('dagangos:open-support-chat', openChat)
    return () => window.removeEventListener('dagangos:open-support-chat', openChat)
  }, [])

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const message = draft.trim()
    if (!message || isSending) return

    const visitorMessage: ChatMessage = { id: crypto.randomUUID(), author: 'visitor', text: message }
    setMessages(current => [...current, visitorMessage])
    setDraft('')
    setIsSending(true)

    try {
      const response = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationId: 'storefront',
          messages: [...messages, visitorMessage].map(item => ({
            role: item.author === 'visitor' ? 'user' : 'assistant',
            content: item.text,
          })),
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Support chat is temporarily unavailable.')

      setMessages(current => [
        ...current,
        {
          id: crypto.randomUUID(),
          author: 'assistant',
          text: payload.reply || 'Your message has been delivered to the DagangOS support team.',
        },
      ])
    } catch (error) {
      setMessages(current => [
        ...current,
        {
          id: crypto.randomUUID(),
          author: 'assistant',
          text: error instanceof Error ? error.message : 'Support chat is temporarily unavailable.',
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 sm:right-8">
      {open && (
        <section aria-label="DagangOS support chat" className="mb-4 flex w-[min(23rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-[1.5rem] border border-white/15 bg-slate-950 shadow-[0_28px_80px_rgba(2,6,23,.45)]">
          <div className="relative overflow-hidden border-b border-white/10 px-5 py-4">
            <div className="absolute inset-0 dagangos-aurora opacity-80" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-white">{t('support_title')}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> {t('support_scope')}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label={t('close_support')} className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="max-h-80 min-h-48 space-y-3 overflow-y-auto bg-slate-950 p-4">
            {messages.map(item => (
              <div key={item.id} className={`flex ${item.author === 'visitor' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${item.author === 'visitor' ? 'rounded-br-md bg-emerald-400 text-slate-950' : 'rounded-bl-md border border-white/10 bg-white/[.06] text-slate-200'}`}>{item.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="border-t border-white/10 bg-slate-900 p-3">
            <label className="sr-only" htmlFor="dagangos-support-message">{t('support_placeholder')}</label>
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[.05] p-1.5 focus-within:border-emerald-300/60">
              <textarea id="dagangos-support-message" value={draft} onChange={event => setDraft(event.target.value)} rows={1} maxLength={2000} placeholder={t('support_placeholder')} className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-slate-500" />
              <button type="submit" disabled={!draft.trim() || isSending} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-45" aria-label={t('send_support_message')}>
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </section>
      )}

      <button type="button" onClick={() => setOpen(current => !current)} aria-expanded={open} aria-label={open ? t('close_support') : t('open_support')} className="group flex items-center gap-2 rounded-2xl border border-emerald-200/30 bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-[0_18px_45px_rgba(2,6,23,.35)] transition hover:-translate-y-1 hover:bg-slate-900">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-300 to-sky-400 text-slate-950"><MessageCircle className="h-4 w-4" /></span>
        <span className="hidden sm:inline">{t('support_button')}</span>
        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </button>
    </div>
  )
}
