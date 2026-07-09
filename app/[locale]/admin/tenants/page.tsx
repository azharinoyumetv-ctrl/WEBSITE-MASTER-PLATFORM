import { getTenants } from '@/lib/actions/tenant'
import { TenantsClient } from './tenants-client'
import { AlertTriangle } from 'lucide-react'

export default async function TenantsPage() {
  const res = await getTenants()

  if (!res.success) {
    const errorMsg = (res as any).error || 'Unknown error'
    return (
      <div className="page-container animate-slide-up">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Failed to load tenants</p>
            <p className="text-xs text-red-500 mt-1 font-mono">{errorMsg}</p>
            <p className="text-xs text-red-600 mt-2">
              This is likely caused by a broken production build or a database connection issue. Run <code className="font-mono bg-red-100 px-1 rounded">npm run build</code> and restart the server.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const tenants = res.tenants!

  return <TenantsClient initialTenants={tenants} />
}
