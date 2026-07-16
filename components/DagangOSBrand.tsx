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
 * The public DagangOS Web brand is a single supplied wordmark. Its PNG has a
 * transparent matte so it works cleanly on both light and dark product areas.
 */
export function DagangOSBrand({ className, compact = false, dark = false, showName = true }: DagangOSBrandProps) {
  return (
    <div className={cn('flex min-w-0 flex-col items-center leading-none', className)} aria-label={COMPANY.legalName}>
      <div className={cn('relative shrink-0 overflow-hidden', compact ? 'h-9 w-40' : 'h-12 w-[12.75rem]')}>
        <Image
          src="/dagangos-web-wordmark.png"
          alt="DagangOS Web"
          fill
          sizes={compact ? '160px' : '204px'}
          className={cn('object-cover', dark && 'brightness-[2.1] saturate-125 drop-shadow-[0_0_8px_rgba(96,165,250,0.34)]')}
          priority
        />
      </div>
      {showName && (
        <p className={cn('mt-0.5 w-full whitespace-nowrap text-center font-semibold tracking-[0.1em]', compact ? 'text-[7px]' : 'text-[10px]', dark ? 'text-slate-300' : 'text-slate-600')}>
          {COMPANY.legalName}
        </p>
      )}
    </div>
  )
}
