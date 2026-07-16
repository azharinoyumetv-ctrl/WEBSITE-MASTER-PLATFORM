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
 * Keep the supplied commerce mark separate from the responsive wordmark. This
 * preserves a sharp icon while keeping brand text readable on dark headers.
 */
export function DagangOSBrand({ className, compact = false, dark = false, showName = true }: DagangOSBrandProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2 leading-none', className)} aria-label={COMPANY.legalName}>
      <div className={cn('relative shrink-0 overflow-hidden', compact ? 'h-10 w-8' : 'h-12 w-10')}>
        <Image
          src="/dagangos-web-mark.png"
          alt=""
          fill
          sizes={compact ? '32px' : '40px'}
          className={cn('object-contain', dark && 'brightness-125 saturate-125 drop-shadow-[0_0_8px_rgba(96,165,250,0.26)]')}
          priority
        />
      </div>
      <div className="min-w-0">
        <p className={cn('whitespace-nowrap font-black tracking-[-0.045em]', compact ? 'text-lg' : 'text-2xl', dark ? 'text-slate-100' : 'text-slate-950')}>
          Dagang<span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-sky-400 bg-clip-text text-transparent">OS Web</span>
        </p>
        {showName && (
          <p className={cn('mt-0.5 whitespace-nowrap font-semibold tracking-[0.08em]', compact ? 'text-[7px]' : 'text-[10px]', dark ? 'text-slate-300' : 'text-slate-600')}>
            {COMPANY.legalName}
          </p>
        )}
      </div>
    </div>
  )
}
