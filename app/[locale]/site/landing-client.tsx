'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronRight, Calculator, Monitor, Play, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function LandingClient({ primaryColor }: { primaryColor: string }) {
  const t = useTranslations('Storefront')
  const [selectedPackage, setSelectedPackage] = useState('landing_page')
  const [enabledAddons, setEnabledAddons] = useState<string[]>([])
  const [previewMode, setPreviewMode] = useState('landing_page')

  const packages: Record<string, { name: string, price: number, desc: string }> = {
    landing_page: { name: 'Landing Page', price: 2500000, desc: 'Single-page highly optimized for conversions' },
    company_profile: { name: 'Company Profile', price: 4000000, desc: 'Professional corporate presence with dynamic pages' },
    business_website: { name: 'Business Website + Admin', price: 8000000, desc: 'Full CMS with secure tenant dashboard' },
    ecommerce: { name: 'E-Commerce Platform', price: 15000000, desc: 'Complete storefront with cart and payment gateways' },
    restaurant: { name: 'Restaurant System', price: 20000000, desc: 'Menu, tables, booking calendar, and staff queues' },
    retail_pos: { name: 'Retail POS + Website', price: 25000000, desc: 'Unified online store and offline retail browser POS' },
    custom: { name: 'Custom Platform', price: 30000000, desc: 'Enterprise bespoke solutions' },
  }

  const addonsList = [
    { key: 'ai', name: 'AI Copywriter Suite', price: 250000, desc: 'LLM generated descriptions' },
    { key: 'booking', name: 'Booking Calendar Scheduler', price: 500000, desc: 'Appointments & rosters' },
    { key: 'crm', name: 'CRM & Customer Timelines', price: 400000, desc: 'Spend tracking log' },
    { key: 'api', name: 'Developer Webhooks Portal', price: 750000, desc: 'External sync keys' },
  ]

  const toggleAddon = (key: string) => {
    if (enabledAddons.includes(key)) {
      setEnabledAddons(enabledAddons.filter(k => k !== key))
    } else {
      setEnabledAddons([...enabledAddons, key])
    }
  }

  const calculateTotal = () => {
    const pkgPrice = packages[selectedPackage]?.price || 0
    const addonsPrice = enabledAddons.reduce((acc, key) => {
      const addon = addonsList.find(a => a.key === key)
      return acc + (addon ? addon.price : 0)
    }, 0)
    return pkgPrice + addonsPrice
  }

  const formatRp = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num)
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen">
      {/* Interactive Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-32 bg-slate-950 text-white">
        <div 
          className="absolute inset-0 opacity-15"
          style={{ background: `radial-gradient(circle at 30% 30%, ${primaryColor}, transparent 60%)` }}
        />
        <div className="max-w-5xl mx-auto px-6 md:px-8 relative z-10 flex flex-col items-center text-center justify-center space-y-6">
            <span 
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border text-slate-200"
              style={{ borderColor: `${primaryColor}40` }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
              {t('dynamic_modular_active')}
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              {t('hero_title1')} <br />
              <span style={{ color: primaryColor }}>
                {t('hero_title2')}
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
              {t('hero_subtitle')}
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <a 
                href="/shop" 
                className="px-8 py-4 text-white font-bold rounded-xl shadow-lg transition-all text-sm hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                {t('explore_packages')}
              </a>
              <a href="/contact" className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all text-sm">
                {t('contact_sales')}
              </a>
            </div>
          </div>
      </section>

      {/* Interactive Price Estimator */}
      <section className="py-24 max-w-7xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">{t('calculator_title')}</h2>
            <p className="text-slate-500">
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
                    className={`p-4 rounded-xl text-left border transition-all duration-200 ${
                      selectedPackage === key 
                        ? 'text-slate-900' 
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-bold text-sm text-slate-900">{pkg.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{pkg.desc}</p>
                    <p className="text-sm font-semibold mt-2" style={{ color: primaryColor }}>
                      {pkg.price > 0 ? formatRp(pkg.price) : t('custom_quote')}
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
                    className={`flex items-center justify-between p-4 bg-white border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors ${
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
                    <span className="text-sm font-semibold animate-pulse" style={{ color: primaryColor }}>{formatRp(addon.price)} /mo</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing Ledger Card */}
          <div className="lg:col-span-5 bg-white border border-slate-200 p-6 rounded-2xl shadow-lg sticky top-24">
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
                    <span className="font-semibold text-slate-900">{formatRp(addon?.price || 0)} /mo</span>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-between items-baseline mb-6">
              <span className="font-bold text-slate-900">{t('total_setup_cost')}</span>
              <span className="text-3xl font-extrabold text-slate-900">{formatRp(calculateTotal())}</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg leading-relaxed mb-6">
              {t('infra_note')}
            </div>

            <a 
              href="/contact"
              className="block text-center py-3.5 text-white font-bold rounded-xl transition-opacity hover:opacity-90 shadow-lg text-sm w-full"
              style={{ backgroundColor: primaryColor }}
            >
              {t('order_platform')}
            </a>
          </div>

        </div>
      </section>

      {/* Dynamic CTA */}
      <section className="py-20 bg-indigo-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.1),transparent_50%)]" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{t('cta_title')}</h2>
          <p className="text-lg opacity-80 mb-8 max-w-xl mx-auto">
            {t('cta_subtitle')}
          </p>
          <a href="/shop" className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-lg transition-colors inline-block">
            {t('choose_price_plan')}
          </a>
        </div>
      </section>
    </div>
  )
}
