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
 * The public DagangOS Web brand is a tightly cropped supplied wordmark so it
 * stays sharp in compact headers without showing a transparent canvas area.
 */
export function DagangOSBrand({ className, compact = false, dark = false, showName = true }: DagangOSBrandProps) {
  return (
    <div className={cn('flex min-w-0 flex-col items-start leading-none', className)} aria-label={COMPANY.legalName}>
      <div className={cn('relative shrink-0 overflow-hidden', compact ? 'h-11 w-40' : 'h-14 w-52')}>
        <Image
          src="/dagangos-web-wordmark-cropped.png"
          alt="DagangOS Web"
          fill
          sizes={compact ? '160px' : '208px'}
          className={cn('object-contain', dark && 'brightness-[2.1] saturate-125 drop-shadow-[0_0_8px_rgba(96,165,250,0.34)]')}
          priority
        />
      </div>
      {showName && (
        <p className={cn('mt-0.5 w-full pl-[24%] text-center whitespace-nowrap font-semibold tracking-[0.1em]', compact ? 'text-[7px]' : 'text-[10px]', dark ? 'text-slate-300' : 'text-slate-600')}>
          {COMPANY.legalName}
        </p>
      )}
    </div>
  )
}
