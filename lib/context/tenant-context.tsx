'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

type TenantContextType = {
  tenantId: string | null
  roles: string[]
  isLoading: boolean
}

const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  roles: [],
  isLoading: true,
})

export function TenantProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()

  const value = {
    tenantId: (session?.user as any)?.tenantId || null,
    roles: (session?.user as any)?.roles || [],
    isLoading: status === 'loading',
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}
