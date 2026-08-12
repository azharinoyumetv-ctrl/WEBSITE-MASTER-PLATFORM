'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Lock, AlertCircle, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { DagangOSBrand } from '@/components/DagangOSBrand'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError('Missing reset token.')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const { resetPassword } = await import('@/lib/actions/auth')
      const res = await resetPassword(token, password)
      
      if (res.success) {
        toast.success('Password reset successfully! You can now log in.')
        router.push('/auth/login')
      } else {
        setError(res.error || 'An error occurred. Please try again.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
        <div className="text-white text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Invalid Request</h2>
          <p className="text-slate-400 mb-6">No reset token provided in the URL.</p>
          <Link href="/auth/login" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium transition-colors">Back to Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-slide-up">
          <DagangOSBrand className="mb-8" dark />

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Create New Password</h2>
            <p className="text-slate-400 text-sm">Please enter a strong password for your account.</p>
          </div>

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg text-sm mt-4"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Resetting...</span></>
              ) : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
