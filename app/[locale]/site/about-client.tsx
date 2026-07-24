'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowUpRight, Award, Check, CircleDot, Globe2, Layers3, ShieldCheck, Sparkles, Target } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

type AboutTab = 'mission' | 'vision' | 'values'

export function AboutClient({ primaryColor, siteTitle }: { primaryColor: string; siteTitle: string }) {
  const t = useTranslations('Storefront')
  const locale = useLocale()
  const [activeTab, setActiveTab] = useState<AboutTab>('mission')

  const tabContent = {
    mission: {
      icon: Target,
      eyebrow: t('tab_mission'),
      title: t('mission_title'),
      body: t('mission_text'),
    },
    vision: {
      icon: Globe2,
      eyebrow: t('tab_vision'),
      title: t('vision_title'),
      body: t('vision_text'),
    },
    values: {
      icon: Award,
      eyebrow: t('tab_values'),
      title: t('values_title'),
      body: '',
    },
  } satisfies Record<AboutTab, { icon: typeof Target; eyebrow: string; title: string; body: string }>

  const current = tabContent[activeTab]
  const Icon = current.icon

  return (
    <div className="min-h-screen overflow-hidden bg-[#f7fafc]">
      <section className="relative isolate overflow-hidden bg-slate-950 py-24 text-white md:py-32">
        <div className="absolute inset-0 dagangos-aurora" />
        <div className="absolute inset-0 opacity-50 dagangos-grid" />
        <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl dagangos-orb" />
        <div className="absolute -right-28 bottom-0 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl dagangos-orb-delayed" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 md:px-8 lg:grid-cols-[1.1fr_.9fr]">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-100 backdrop-blur">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" /></span>
              {siteTitle}
            </span>
            <h1 className="mt-7 text-5xl font-black leading-[.95] tracking-[-.055em] md:text-7xl">
              {t('about_hero1')}<br />
              <span className="bg-gradient-to-r from-emerald-300 via-cyan-200 to-sky-400 bg-clip-text text-transparent">{t('about_hero2')}</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-slate-300 md:text-xl">{t('about_subtitle')}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={`/${locale}/site/catalog`} className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-black text-slate-950 shadow-[0_16px_45px_rgba(15,23,42,.35)] transition hover:-translate-y-1">
                {t('explore_packages')} <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link href={`/${locale}/project-setup?package=landing_page&v=v2`} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-1 hover:bg-white/15">
                <Sparkles className="h-4 w-4 text-emerald-300" /> {t('contact_sales')}
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md dagangos-float lg:max-w-none">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-emerald-300/30 via-sky-400/20 to-indigo-500/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-slate-950/70 p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4"><span className="text-xs font-bold text-slate-300">DagangOS Digital Indonesia</span><CircleDot className="h-4 w-4 text-emerald-300" /></div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="col-span-2 rounded-2xl border border-white/10 bg-white/[.06] p-5"><p className="text-sm text-slate-400">{t('about_ownership_label')}</p><p className="mt-2 text-2xl font-black">{t('about_ownership_title')} <span className="text-emerald-300">{t('about_ownership_accent')}</span></p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><Layers3 className="h-5 w-5 text-sky-300" /><p className="mt-4 text-sm font-bold">15+ {t('stat_modules')}</p><p className="mt-1 text-xs text-slate-400">{t('about_connected_stack')}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><ShieldCheck className="h-5 w-5 text-emerald-300" /><p className="mt-4 text-sm font-bold">{t('about_self_hosted')}</p><p className="mt-1 text-xs text-slate-400">{t('about_data_yours')}</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-6 py-24 md:px-8">
        <div className="absolute right-10 top-20 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="relative grid gap-10 lg:grid-cols-[.78fr_1.22fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-emerald-700">{t('about_title')}</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.04em] text-slate-950 md:text-5xl">{t('about_principles')}</h2>
            <div className="mt-8 grid gap-2">
              {(Object.keys(tabContent) as AboutTab[]).map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left text-sm font-bold transition ${activeTab === tab ? 'border-slate-950 bg-slate-950 text-white shadow-xl' : 'border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-emerald-300'}`}>
                  {tabContent[tab].eyebrow}<ArrowUpRight className={`h-4 w-4 ${activeTab === tab ? 'text-emerald-300' : 'text-slate-400'}`} />
                </button>
              ))}
            </div>
          </div>
          <article className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,.1)] md:p-12">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500" />
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50" style={{ color: primaryColor }}><Icon className="h-7 w-7" /></div>
            <p className="mt-8 text-xs font-black uppercase tracking-[.16em] text-emerald-700">{current.eyebrow}</p>
            <h3 className="mt-3 text-3xl font-black tracking-[-.04em] text-slate-950 md:text-4xl">{current.title}</h3>
            {activeTab === 'values' ? (
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {[t('val_1'), t('val_2'), t('val_3'), t('val_4')].map((value) => <li key={value} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-relaxed text-slate-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{value}</li>)}
              </ul>
            ) : <p className="mt-7 max-w-2xl text-lg leading-relaxed text-slate-600">{current.body}</p>}
          </article>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-slate-950 py-20 text-white">
        <div className="absolute inset-0 opacity-35 dagangos-grid" />
        <div className="relative mx-auto grid max-w-7xl gap-4 px-6 md:grid-cols-3 md:px-8">
          {[
            [t('about_card_delivery_title'), t('about_card_delivery_desc')],
            [t('about_card_infrastructure_title'), t('about_card_infrastructure_desc')],
            [t('about_card_indonesia_title'), t('about_card_indonesia_desc')],
          ].map(([title, detail]) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[.05] p-6 backdrop-blur"><p className="text-lg font-black">{title}</p><p className="mt-2 text-sm leading-relaxed text-slate-400">{detail}</p></div>)}
        </div>
      </section>
    </div>
  )
}
