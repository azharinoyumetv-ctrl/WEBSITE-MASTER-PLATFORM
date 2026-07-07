'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import { TenantProvider } from '@/lib/context/tenant-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TenantProvider>{children}</TenantProvider>
    </SessionProvider>
  )
}
