'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export function MetricsButton({ serviceName }: { serviceName: string }) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  const handleRefresh = async () => {
    setIsRefreshing(true)
    router.refresh()
    setIsRefreshing(false)
    toast.success(`Health check refreshed for ${serviceName}`)
  }

  return (
    <button 
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 flex items-center gap-1 ml-auto"
    >
      {isRefreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
      Refresh
    </button>
  )
}
