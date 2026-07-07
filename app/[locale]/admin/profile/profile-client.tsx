'use client'

import { useState } from 'react'
import { User, Mail, Phone, Save, Loader2 } from 'lucide-react'
import { updateProfile } from '@/lib/actions/profile'
import toast from 'react-hot-toast'

export function ProfileClient({ initialUser, tenantId }: { initialUser: any, tenantId: string }) {
  const [formData, setFormData] = useState({
    firstName: initialUser?.firstName || '',
    lastName: initialUser?.lastName || '',
    phoneNumber: initialUser?.profile?.phoneNumber || '',
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    const res = await updateProfile(tenantId, initialUser.id, formData)
    setIsSaving(false)

    if (res.success) {
      toast.success('Profile updated successfully')
    } else {
      toast.error(res.error || 'Failed to update profile')
    }
  }

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">My Profile</h2>
          <p className="section-desc">Manage your personal information and preferences</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="card p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">First Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="form-input pl-9"
                  placeholder="First Name"
                />
              </div>
            </div>
            <div>
              <label className="form-label">Last Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="form-input pl-9"
                  placeholder="Last Name"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">Email Address (Read Only)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={initialUser?.email || ''}
                readOnly
                className="form-input pl-9 bg-slate-50 opacity-70 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="form-input pl-9"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button type="submit" disabled={isSaving} className="btn btn-primary">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
