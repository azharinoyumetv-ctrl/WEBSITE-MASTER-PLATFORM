'use client'

import { useMemo, useState } from 'react'
import { ArrowUpRight, Calculator, Cloud, Layers3, ShieldCheck, Sparkles } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { packages, addonsList } from '@/lib/constants/packages'

const PACKAGE_CALCULATOR_VERSION = 'v2'
const HOSTINGER_REFERRAL_URL = 'https://www.hostinger.com?REFERRALCODE=DAGANGOS'

export function LandingClient({ primaryColor }: { primaryColor: string }) {
  const t = useTranslations('Storefront')
  const locale = useLocale()
  const [selectedPackage, setSelectedPackage] = useState<string>('landing_page')
  const [enabledAddons, setEnabledAddons] = useState<string[]>([])
  const [previewMode, setPreviewMode] = useState<string>('landing_page')

  const toggleAddon = (key: string) => {
    setEnabledAddons(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const selectedPackageData = useMemo(() => packages[selectedPackage] || null, [selectedPackage])
  const enabledAddonsData = useMemo(
    () => enabledAddons.map(key => addonsList.find(addon => addon.key === key)).filter(Boolean),
    [enabledAddons],
  )
  const total = useMemo(() => {
    const pkgPrice = selectedPackageData?.price || 0
    const addonsPrice = enabledAddonsData.reduce((acc, addon) => acc + (addon?.price || 0), 0)
    return pkgPrice + addonsPrice
  }, [selectedPackageData, enabledAddonsData])

  const formatRp = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num)
  }

  const projectSetupHref = useMemo(() => {
    const params = new URLSearchParams({
      package: selectedPackage,
      v: PACKAGE_CALCULATOR_VERSION,
    })
    if (enabledAddons.length > 0) {
      params.set('addons', enabledAddons.join(','))
    }
    return `/${locale}/project-setup?${params.toString()}`
  }, [selectedPackage, enabledAddons, locale])

  return (
    <div className="w-full min-h-screen bg-[#f7fafc]">
      {/* Interactive Hero Section */}
      <section className="relative isolate overflow-hidden py-24 md:py-32 dagangos-aurora text-white">
        <div className="absolute inset-0 opacity-60 dagangos-grid" />
        <div className="absolute -left-32 top-12 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl dagangos-orb" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl dagangos-orb-delayed" />
        <div className="max-w-7xl mx-auto px-6 md:px-8 relative z-10 grid items-center gap-14 lg:grid-cols-[1.1fr_.9fr]">
          <div className="max-w-3xl">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-slate-100 backdrop-blur"
              style={{ boxShadow: `0 0 0 1px ${primaryColor}35, 0 0 36px ${primaryColor}26` }}
            >
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" /></span>
              {t('dynamic_modular_active')}
            </span>
            <h1 className="mt-7 text-5xl md:text-7xl font-black tracking-[-0.055em] leading-[0.95]">
              {t('hero_title1')} <br />
              <span className="bg-gradient-to-r from-emerald-300 via-cyan-200 to-sky-400 bg-clip-text text-transparent">
                {t('hero_title2')}
              </span>
            </h1>
            <p className="mt-7 text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed">
              {t('hero_subtitle')}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="/shop"
                className="dagangos-cta-gradient dagangos-play-card group inline-flex items-center gap-2 px-6 py-3.5 font-bold rounded-xl text-sm"
              >
                {t('explore_packages')} <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <a href={projectSetupHref} className="dagangos-play-card inline-flex items-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl border border-white/15 backdrop-blur transition-all hover:-translate-y-1 text-sm">
                <Calculator className="w-4 h-4" /> {t('contact_sales')}
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-300" /> Tenant-ready architecture</span>
              <span className="inline-flex items-center gap-2"><Layers3 className="w-4 h-4 text-sky-300" /> 15+ connected modules</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none dagangos-float">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-emerald-300/30 via-sky-400/20 to-indigo-500/20 blur-2xl" />
            <div className="dagangos-shimmer relative rounded-[1.75rem] border border-white/15 bg-slate-950/70 p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /></div>
                <span className="text-xs font-medium text-slate-400">DagangOS command centre</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="col-span-2 rounded-2xl border border-white/10 bg-white/[.06] p-5">
                  <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Your modular stack</span><Sparkles className="w-4 h-4 text-emerald-300" /></div>
                  <div className="mt-5 flex items-end gap-2 h-20">
                    {[38, 58, 47, 76, 66, 92, 82].map((height, index) => <span key={index} className="dagangos-spark-bar flex-1 rounded-t-full bg-gradient-to-t from-emerald-500 to-sky-400 opacity-90" style={{ height: `${height}%`, animationDelay: `${index * 150}ms` }} />)}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><p className="text-2xl font-black">15+</p><p className="mt-1 text-xs text-slate-400">Modules ready</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><p className="text-2xl font-black text-emerald-300">1</p><p className="mt-1 text-xs text-slate-400">Unified workspace</p></div>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-5 rounded-2xl border border-emerald-200/25 bg-emerald-400/10 px-4 py-3 backdrop-blur dagangos-float-delayed"><p className="text-xs text-emerald-100">Launch with clarity</p><p className="text-sm font-bold text-white">Design · Commerce · Ops</p></div>
          </div>
        </div>
      </section>

      {/* Interactive Price Estimator */}
      <section className="relative py-24 max-w-7xl mx-auto px-6 md:px-8">
        <div className="absolute top-20 right-4 h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl pointer-events-none" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700"><span className="h-px w-8 bg-emerald-500" /> Build your stack</div>
            <h2 className="text-3xl md:text-5xl font-black tracking-[-0.04em] text-slate-950">{t('calculator_title')}</h2>
            <p className="text-slate-600 max-w-2xl leading-relaxed">
              {t('calculator_subtitle')}
            </p>

            {/* Packages dropdown selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('select_core_package')}</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(packages).map(([key, pkg]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPackage(key)}
                    style={selectedPackage === key 
                      ? { borderColor: primaryColor, backgroundColor: `${primaryColor}08` } 
                      : {}}
                    className={`dagangos-play-card group relative overflow-hidden p-4 rounded-2xl text-left border transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                      selectedPackage === key 
                        ? 'text-slate-900 shadow-md'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {selectedPackage === key && <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500" />}
                    <p className="font-bold text-sm text-slate-900">{pkg.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{pkg.desc}</p>
                    <p className="text-sm font-semibold mt-2" style={{ color: primaryColor }}>
                      {pkg.key === 'custom' ? 'Starting at ' : ''}{pkg.price > 0 ? formatRp(pkg.price) : t('custom_quote')} <span className="text-xs font-medium text-slate-500">one-time</span>
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Add-ons selection checkbox list */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('optional_addons')}</label>
              <div className="space-y-3">
                {addonsList.map(addon => (
                  <div 
                    key={addon.key} 
                    onClick={() => toggleAddon(addon.key)}
                    style={enabledAddons.includes(addon.key) 
                      ? { borderColor: primaryColor, boxShadow: `0 0 0 1px ${primaryColor}` } 
                      : {}}
                    className={`dagangos-play-card flex items-center justify-between p-4 bg-white border rounded-2xl cursor-pointer hover:bg-slate-50 hover:shadow-md transition-all ${
                      enabledAddons.includes(addon.key) ? '' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input 
                        type="checkbox" 
                        checked={enabledAddons.includes(addon.key)} 
                        onChange={() => {}} // Controlled by outer div click
                        style={enabledAddons.includes(addon.key) ? { color: primaryColor } : {}}
                        className="mt-1 rounded border-slate-300 focus:ring-0"
                      />
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{addon.name}</p>
                        <p className="text-slate-500 text-xs">{addon.desc}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: primaryColor }}>{formatRp(addon.price)} <span className="text-xs font-medium text-slate-500">one-time</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing Ledger Card */}
          <div className="dagangos-play-card dagangos-shimmer lg:col-span-5 relative overflow-hidden bg-white border border-slate-200 p-6 rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,.12)] sticky top-24">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500" />
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5" style={{ color: primaryColor }} />
              {t('estimate_ledger')}
            </h3>
            
            <div className="space-y-4 border-b border-slate-100 pb-4 mb-4 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>{packages[selectedPackage]?.name}</span>
                <span className="font-semibold text-slate-900">{formatRp(packages[selectedPackage]?.price || 0)}</span>
              </div>
              
              {enabledAddons.map(key => {
                const addon = addonsList.find(a => a.key === key)
                return (
                  <div key={key} className="flex justify-between text-xs">
                    <span>{addon?.name}</span>
                    <span className="font-semibold text-slate-900">{formatRp(addon?.price || 0)} one-time</span>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-between items-baseline mb-6">
              <span className="font-bold text-slate-900">{t('total_setup_cost')}</span>
              <span className="text-3xl font-extrabold text-slate-900">{formatRp(total)}</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl leading-relaxed mb-4">
              {t('infra_note')}
            </div>
            <p className="mb-4 text-xs leading-relaxed text-slate-500">Data and infrastructure remain under the client&apos;s control. Source-code/IP transfer is a separately quoted enterprise option.</p>

            <a
              href={HOSTINGER_REFERRAL_URL}
              target="_blank"
              rel="noreferrer sponsored"
              className="group mb-6 flex gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-emerald-300"><Cloud className="h-5 w-5" /></span>
              <span className="min-w-0 text-left">
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-950">{t('hosting_partner_title')} <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-600">{t('hosting_partner_desc')}</span>
                <span className="mt-2 inline-block text-xs font-bold text-emerald-700">{t('hosting_partner_cta')}</span>
              </span>
            </a>

            <a 
              href={projectSetupHref}
              className="block text-center py-3.5 text-white font-bold rounded-xl transition-opacity hover:opacity-90 shadow-lg text-sm w-full"
              style={{ backgroundColor: primaryColor }}
            >
              Mulai Proyek
            </a>
          </div>

        </div>
      </section>

      {/* Dynamic CTA */}
      <section className="py-24 text-white relative isolate overflow-hidden dagangos-aurora">
        <div className="absolute inset-0 dagangos-grid opacity-40" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl dagangos-orb" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <Sparkles className="w-7 h-7 text-emerald-300 mx-auto mb-5 dagangos-float" />
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{t('cta_title')}</h2>
          <p className="text-lg opacity-80 mb-8 max-w-xl mx-auto">
            {t('cta_subtitle')}
          </p>
          <a href="/shop" className="dagangos-cta-gradient dagangos-play-card group inline-flex items-center gap-2 px-8 py-3.5 font-bold rounded-xl">
            {t('choose_price_plan')}
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </section>
    </div>
  )
}
