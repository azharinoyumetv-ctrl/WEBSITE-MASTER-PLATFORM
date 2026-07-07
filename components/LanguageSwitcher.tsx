'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition()
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  
  // Since we are not using next-intl/navigation to avoid complex setups,
  // we can manually manipulate the pathname.
  // The pathname from next/navigation does NOT include the locale if middleware rewrite is complex,
  // BUT in our setup, the URL actually has /en/ or /id/.
  // Wait, if it has /en/, `usePathname` returns `/en/...`.
  // Let's safely swap the prefix.
  const onSelectChange = (newLocale: string) => {
    startTransition(() => {
      // Find the current locale in the path and replace it
      const newPath = pathname.replace(/^\/(en|id)(\/|$)/, `/${newLocale}/`)
      router.replace(newPath)
      router.refresh()
    })
  }

  return (
    <div className="relative group">
      <button 
        disabled={isPending}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        <Globe className="w-4 h-4" />
        {locale.toUpperCase()}
      </button>
      <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="p-1">
          <button 
            onClick={() => onSelectChange('en')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${locale === 'en' ? 'font-bold' : ''}`}
          >
            🇬🇧 English
          </button>
          <button 
            onClick={() => onSelectChange('id')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${locale === 'id' ? 'font-bold' : ''}`}
          >
            🇮🇩 Bahasa
          </button>
        </div>
      </div>
    </div>
  )
}
