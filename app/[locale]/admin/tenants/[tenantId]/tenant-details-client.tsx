'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateTenantStatus, deleteTenant } from '@/lib/actions/tenant'
import toast from 'react-hot-toast'
import { Ban, Trash2, CheckCircle } from 'lucide-react'

export function TenantDetailsClient({ tenantId, currentStatus }: { tenantId: string, currentStatus: string }) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleToggleStatus = async () => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
    if (!confirm(`Are you sure you want to ${newStatus} this tenant?`)) return
    
    setIsUpdating(true)
    const res = await updateTenantStatus(tenantId, newStatus as any)
    setIsUpdating(false)
    
    if (res.success) {
      toast.success(`Tenant ${newStatus} successfully`)
      router.refresh()
    } else {
      toast.error(res.error || 'Failed to update tenant status')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`CRITICAL WARNING: Are you absolutely sure you want to permanently delete this tenant? All associated data will be destroyed.`)) return
    
    setIsDeleting(true)
    const res = await deleteTenant(tenantId)
    setIsDeleting(false)
    
    if (res.success) {
      toast.success('Tenant deleted successfully')
      router.push('/admin/tenants')
    } else {
      toast.error(res.error || 'Failed to delete tenant')
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button 
        onClick={handleToggleStatus}
        disabled={isUpdating || isDeleting}
        className="btn btn-secondary text-slate-700 bg-white hover:bg-slate-50 border border-slate-200"
      >
        {currentStatus === 'active' ? (
          <><Ban className="w-4 h-4 text-amber-500" /> Suspend Tenant</>
        ) : (
          <><CheckCircle className="w-4 h-4 text-emerald-500" /> Activate Tenant</>
        )}
      </button>
      
      <button 
        onClick={handleDelete}
        disabled={isUpdating || isDeleting}
        className="btn bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
      >
        <Trash2 className="w-4 h-4" />
        {isDeleting ? 'Deleting...' : 'Delete Tenant Permanently'}
      </button>
    </div>
  )
}
