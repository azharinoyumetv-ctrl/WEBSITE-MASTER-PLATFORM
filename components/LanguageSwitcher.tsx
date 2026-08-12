'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Check, ChevronDown, Globe } from 'lucide-react'

export function LanguageSwitcher({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const onSelectChange = (newLocale: string) => {
    startTransition(() => {
      const newPath = /^\/(en|id)(\/|$)/.test(pathname)
        ? pathname.replace(/^\/(en|id)(\/|$)/, `/${newLocale}/`)
        : `/${newLocale}${pathname}`

      setIsOpen(false)
      router.replace(newPath)
      router.refresh()
    })
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={isPending}
        onClick={() => setIsOpen(open => !open)}
        aria-label="Change language"
        aria-expanded={isOpen}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400/70 disabled:opacity-60 ${
          variant === 'dark'
            ? 'border-white/15 bg-white/10 text-white hover:bg-white/15'
            : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-emerald-300 hover:text-slate-950'
        }`}
      >
        <Globe className="w-4 h-4" />
        {locale.toUpperCase()}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-40 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/15 z-50 animate-scale-in">
          <button
            type="button"
            onClick={() => onSelectChange('en')}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-100 ${locale === 'en' ? 'bg-slate-50 font-bold text-slate-950' : 'text-slate-600'}`}
          >
            <span>English</span>
            {locale === 'en' && <Check className="w-4 h-4 text-emerald-600" />}
          </button>
          <button
            type="button"
            onClick={() => onSelectChange('id')}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-100 ${locale === 'id' ? 'bg-slate-50 font-bold text-slate-950' : 'text-slate-600'}`}
          >
            <span>Bahasa Indonesia</span>
            {locale === 'id' && <Check className="w-4 h-4 text-emerald-600" />}
          </button>
        </div>
      )}
    </div>
  )
}
