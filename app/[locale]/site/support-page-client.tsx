'use client'

import { MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'

export function SupportPageClient() {
  return (
    <div className="min-h-[62vh] bg-[#f7fafc] py-16 sm:py-24">
      <section className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-slate-950 px-7 py-16 text-center text-white shadow-2xl sm:px-12">
        <div className="absolute inset-0 dagangos-aurora" />
        <div className="absolute inset-0 dagangos-grid opacity-40" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-100"><Sparkles className="h-3.5 w-3.5" /> DagangOS support desk</span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-black tracking-[-0.04em] sm:text-6xl">Talk to the team building your next storefront.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">Start a secure internal chat for project questions, account assistance, or a guided package recommendation.</p>
          <button type="button" onClick={() => window.dispatchEvent(new Event('dagangos:open-support-chat'))} className="mt-9 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-black text-slate-950 shadow-xl transition hover:-translate-y-1"><MessageCircle className="h-4 w-4" /> Open support chat</button>
          <div className="mx-auto mt-10 flex max-w-xl flex-wrap justify-center gap-x-6 gap-y-3 text-xs text-slate-300"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /> No WhatsApp redirect</span><span>Messages stay in the DagangOS support flow</span></div>
        </div>
      </section>
    </div>
  )
}
