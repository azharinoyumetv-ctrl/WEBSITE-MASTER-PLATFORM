'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Globe, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('Missing verification token.')
      return
    }

    const verify = async () => {
      const { verifyEmailToken } = await import('@/lib/actions/auth')
      const res = await verifyEmailToken(token)
      if (res.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMsg(res.error || 'Verification failed')
      }
    }
    
    verify()
  }, [token])

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 items-center justify-center">
      <div className="w-full max-w-sm animate-slide-up text-center bg-white/5 border border-white/10 p-8 rounded-2xl">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg mx-auto mb-6">
          <Globe className="w-6 h-6 text-white" />
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Verifying Email...</h2>
            <p className="text-slate-400 text-sm">Please wait while we verify your account.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Email Verified</h2>
            <p className="text-slate-400 text-sm mb-6">Your account is now active. You can log in.</p>
            <Link href="/auth/login" className="px-6 py-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors">
              Go to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
            <p className="text-slate-400 text-sm mb-6">{errorMsg}</p>
            <Link href="/auth/login" className="px-6 py-2 w-full bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors">
              Return to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
