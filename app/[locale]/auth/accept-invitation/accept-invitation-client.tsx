'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { acceptInvitation, getInvitationSummary } from '@/lib/actions/invitation'
import { DagangOSBrand } from '@/components/DagangOSBrand'

export function AcceptInvitationClient({ token }: { token: string }) {
  const [summary, setSummary] = useState<any>(null)
  const [error, setError] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    getInvitationSummary(token).then((result) => {
      if (result.success) setSummary(result.invitation)
      else setError(result.error || 'This invitation is invalid or has expired.')
    }).catch(() => setError('Unable to verify this invitation.'))
  }, [token])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (password !== confirmation) {
      setError('Passwords do not match.')
      return
    }
    setSaving(true)
    const result = await acceptInvitation(token, password, firstName, lastName)
    setSaving(false)
    if (result.success) setCompleted(true)
    else setError(result.error || 'Unable to activate this invitation.')
  }

  return <main className="min-h-screen dagangos-aurora relative isolate overflow-hidden px-5 py-8 text-white sm:px-8">
    <div className="absolute inset-0 dagangos-grid opacity-35" />
    <section className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center">
      <div className="w-full rounded-[2rem] border border-white/15 bg-slate-950/75 p-7 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-10">
        <DagangOSBrand dark className="mb-9" />
        {completed ? <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300" />
          <h1 className="mt-5 text-3xl font-black">Workspace activated</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">Your account is ready. Sign in with the password you just created.</p>
          <Link href="/auth/login" className="btn btn-primary mt-7 inline-flex">Sign in</Link>
        </div> : error && !summary ? <div className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-amber-300" />
          <h1 className="mt-5 text-3xl font-black">Invitation unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{error}</p>
          <Link href="/auth/login" className="mt-7 inline-flex text-sm font-bold text-emerald-300 hover:text-emerald-200">Back to sign in</Link>
        </div> : !summary ? <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-300" /></div> : <>
          <div className="flex items-start gap-4"><div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-emerald-300"><ShieldCheck className="h-6 w-6" /></div><div><p className="text-sm font-bold text-emerald-300">Secure workspace invitation</p><h1 className="mt-1 text-3xl font-black">Activate your access</h1><p className="mt-2 text-sm text-slate-300">{summary.companyName} / {summary.roleName}</p></div></div>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"><Mail className="mr-2 inline h-4 w-4 text-emerald-300" />{summary.email}</div>
            <div className="grid gap-4 sm:grid-cols-2"><input id="invite-first-name" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" className="form-input" /><input id="invite-last-name" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" className="form-input" /></div>
            <div className="relative"><KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="invite-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} minLength={12} required placeholder="Create a password (12+ characters)" className="form-input pl-10 pr-11" /><button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
            <input id="invite-password-confirmation" type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)} minLength={12} required placeholder="Confirm password" className="form-input" />
            {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
            <button id="accept-invitation-submit" disabled={saving} className="btn btn-primary w-full justify-center">{saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Activating...</> : 'Activate workspace access'}</button>
          </form>
        </>}
      </div>
    </section>
  </main>
}
