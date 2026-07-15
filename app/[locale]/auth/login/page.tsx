'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, Loader2, Lock, Mail, AlertCircle, CheckCircle } from 'lucide-react'
import { DagangOSBrand } from '@/components/DagangOSBrand'
import toast from 'react-hot-toast'
import { useTranslations } from 'next-intl'

export default function LoginPage() {
  const t = useTranslations('Auth')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [captchaSvg, setCaptchaSvg] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaCode, setMfaCode] = useState('')

  const fetchCaptcha = async () => {
    try {
      const res = await fetch('/api/auth/captcha')
      if (res.ok) {
        const data = await res.json()
        setCaptchaSvg(data.svg)
        setCaptchaToken(data.token)
        setCaptchaAnswer('')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await signIn('credentials', {
        email,
        password,
        captchaToken,
        captchaAnswer,
        mfaCode,
        redirect: false,
      })

      if (res?.error) {
        if (res.error === "CAPTCHA_REQUIRED" || res.error === "INVALID_CAPTCHA") {
          setError(res.error === "INVALID_CAPTCHA" ? "Invalid CAPTCHA answer." : "Too many failed attempts. Please solve the CAPTCHA.")
          fetchCaptcha()
        } else if (res.error === "MFA_REQUIRED" || res.error === "INVALID_MFA") {
          setMfaRequired(true)
          setError(res.error === "INVALID_MFA" ? "Invalid authenticator code." : "")
        } else {
          setError(res.error)
        }
      } else {
        toast.success('Login successful! Redirecting...')
        router.push('/admin/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative">
        {/* Background grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        
        {/* Logo */}
        <DagangOSBrand className="relative" dark />

        {/* Hero text */}
        <div className="relative">
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            {t('hero_title_1')}<br />
            at{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
              {t('hero_title_2')}
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md leading-relaxed">
            {t('hero_desc')}
          </p>

          {/* Feature list */}
          <div className="mt-8 space-y-3">
            {[
              t('feat_1'),
              t('feat_2'),
              t('feat_3'),
              t('feat_4'),
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-slate-300 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="relative glass-dark rounded-xl p-5 max-w-md">
          <p className="text-slate-300 text-sm leading-relaxed italic">
            {t('testimonial')}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">FA</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">{t('testimonial_author')}</p>
              <p className="text-slate-400 text-xs">{t('testimonial_title')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — Login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 max-w-lg lg:max-w-md">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Mobile logo */}
          <DagangOSBrand className="mb-8 lg:hidden" dark />

          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{t('welcome')}</h2>
            <p className="text-slate-400 text-sm">{t('signin_subtitle')}</p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('email_label')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white 
                             placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40
                             focus:border-indigo-500/40 transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-300">{t('password_label')}</label>
                <Link href="/auth/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  {t('forgot_password')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl text-white 
                             placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40
                             focus:border-indigo-500/40 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            


            {/* MFA Input */}
            {mfaRequired && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Authenticator Code</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="6-digit code"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white 
                               placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40
                               focus:border-indigo-500/40 transition-all text-sm"
                  />
                </div>
              </div>
            )}

            {/* Captcha Input */}
            {captchaSvg && (
              <div className="animate-in fade-in slide-in-from-top-2 bg-white/5 p-4 rounded-xl border border-white/10">
                <label className="block text-sm font-medium text-slate-300 mb-2">Security Check</label>
                <div className="flex gap-4 items-center">
                  <div 
                    className="bg-white rounded overflow-hidden flex-shrink-0"
                    dangerouslySetInnerHTML={{ __html: captchaSvg }} 
                  />
                  <input
                    type="text"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    placeholder="Type characters"
                    required
                    className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-white 
                               placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 
                         disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl 
                         transition-all duration-200 text-sm shadow-lg shadow-indigo-900/50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('btn_logging_in')}</span>
                </>
              ) : (
                t('btn_login')
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Need an account?{' '}
            <Link href="/auth/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Request access
            </Link>
          </p>

          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-center text-xs text-slate-600">
              Bcrypt password hashing (cost 12) · HttpOnly secure session cookies
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
