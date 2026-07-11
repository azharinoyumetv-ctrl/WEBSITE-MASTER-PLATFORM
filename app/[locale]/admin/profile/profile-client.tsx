'use client'

import { useState } from 'react'
import { User, Mail, Phone, Save, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { updateProfile, generateMfaSecret, verifyAndEnableMfa } from '@/lib/actions/profile'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'

export function ProfileClient({ initialUser, tenantId }: { initialUser: any, tenantId: string }) {
  const [formData, setFormData] = useState({
    firstName: initialUser?.firstName || '',
    lastName: initialUser?.lastName || '',
    phoneNumber: initialUser?.profile?.phoneNumber || '',
  })
  const [isSaving, setIsSaving] = useState(false)

  const [isMfaEnabled, setIsMfaEnabled] = useState(initialUser?.authCredential?.isMfaEnabled || false)
  const [mfaSecret, setMfaSecret] = useState('')
  const [mfaQr, setMfaQr] = useState('')
  const [mfaToken, setMfaToken] = useState('')
  const [isMfaLoading, setIsMfaLoading] = useState(false)

  const handleEnableMfa = async () => {
    setIsMfaLoading(true)
    const res = await generateMfaSecret(tenantId, initialUser.id)
    if (res.success && res.uri) {
      setMfaSecret(res.secret)
      const qr = await QRCode.toDataURL(res.uri)
      setMfaQr(qr)
    } else {
      toast.error('Failed to generate MFA secret')
    }
    setIsMfaLoading(false)
  }

  const handleVerifyMfa = async () => {
    setIsMfaLoading(true)
    const res = await verifyAndEnableMfa(tenantId, initialUser.id, mfaSecret, mfaToken)
    if (res.success) {
      toast.success('MFA enabled successfully')
      setIsMfaEnabled(true)
      setMfaSecret('')
      setMfaQr('')
      setMfaToken('')
    } else {
      toast.error(res.error || 'Invalid token')
    }
    setIsMfaLoading(false)
  }

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

      <div className="max-w-2xl mt-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-indigo-600" /> Two-Factor Authentication
          </h3>
          {isMfaEnabled ? (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-4 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
              <span>MFA is currently enabled for your account.</span>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Enhance your account security by enabling Two-Factor Authentication (MFA).
              </p>
              {!mfaSecret ? (
                <button onClick={handleEnableMfa} disabled={isMfaLoading} className="btn btn-primary">
                  {isMfaLoading ? 'Loading...' : 'Setup MFA'}
                </button>
              ) : (
                <div className="bg-slate-50 p-4 rounded-lg space-y-4">
                  <div className="flex justify-center bg-white p-4 rounded-lg w-max mx-auto border border-slate-200">
                    {mfaQr && <img src={mfaQr} alt="MFA QR Code" className="w-48 h-48" />}
                  </div>
                  <p className="text-center text-sm text-slate-500 font-mono bg-slate-100 p-2 rounded">
                    {mfaSecret}
                  </p>
                  <p className="text-sm text-center text-slate-600">
                    Scan the QR code with your authenticator app, then enter the 6-digit code below to verify.
                  </p>
                  <div className="flex gap-2 max-w-sm mx-auto">
                    <input 
                      type="text" 
                      maxLength={6} 
                      value={mfaToken} 
                      onChange={e => setMfaToken(e.target.value)} 
                      placeholder="000000" 
                      className="form-input text-center text-lg tracking-widest"
                    />
                    <button onClick={handleVerifyMfa} disabled={isMfaLoading || mfaToken.length < 6} className="btn btn-primary">
                      Verify
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
