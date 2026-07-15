import Image from 'next/image'

import { COMPANY } from '@/lib/company'
import { cn } from '@/lib/utils'

type DagangOSBrandProps = {
  className?: string
  compact?: boolean
  dark?: boolean
  showName?: boolean
}

/**
 * The wordmark follows the supplied DagangOS reference: navy "Dagang",
 * green "O", blue "S", and the legal company name beneath it.
 */
export function DagangOSBrand({ className, compact = false, dark = false, showName = true }: DagangOSBrandProps) {
  return (
    <div className={cn('flex items-center gap-2.5 min-w-0', className)} aria-label={COMPANY.legalName}>
      <div className="rounded-lg overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
        <Image
          src="/dagangos-logo.jpg"
          alt="DagangOS"
          width={compact ? 32 : 40}
          height={compact ? 32 : 40}
          className={cn(compact ? 'w-8 h-8' : 'w-10 h-10', 'object-cover')}
          priority
        />
      </div>
      {showName && (
        <div className="min-w-0 leading-none">
          <p className={cn('font-extrabold tracking-tight whitespace-nowrap', compact ? 'text-base' : 'text-lg', dark ? 'text-white' : 'text-slate-950')}>
            Dagang<span className="text-emerald-400">O</span><span className="text-sky-400">S</span>
          </p>
          <p className={cn('mt-1 text-[10px] font-semibold tracking-[0.12em] whitespace-nowrap', dark ? 'text-slate-300' : 'text-slate-600')}>
            Digital Indonesia
          </p>
        </div>
      )}
    </div>
  )
}
