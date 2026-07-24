'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { AlertCircle, ArrowUpRight, CheckCircle, Eye, EyeOff, Layers3, Loader2, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { DagangOSBrand } from '@/components/DagangOSBrand'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
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
    } catch (error) {
      console.error(error)
    }
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
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
        if (res.error === 'CAPTCHA_REQUIRED' || res.error === 'INVALID_CAPTCHA') {
          setError(res.error === 'INVALID_CAPTCHA' ? 'Invalid CAPTCHA answer.' : 'Too many failed attempts. Please solve the CAPTCHA.')
          fetchCaptcha()
        } else if (res.error === 'MFA_REQUIRED' || res.error === 'INVALID_MFA') {
          setMfaRequired(true)
          setError(res.error === 'INVALID_MFA' ? 'Invalid authenticator code.' : '')
        } else {
          setError(res.error)
        }
      } else {
        toast.success('Login successful! Redirecting...')
        router.push('/admin/dashboard')
        router.refresh()
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const features = [t('feat_1'), t('feat_2'), t('feat_3')]

  return (
    <main className="relative isolate min-h-screen overflow-hidden dagangos-aurora px-5 py-6 sm:px-8 lg:px-12">
      <div className="absolute inset-0 dagangos-grid opacity-35" />
      <div className="absolute -left-24 top-32 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl dagangos-orb" />
      <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl dagangos-orb-delayed" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between">
        <DagangOSBrand dark />
        <LanguageSwitcher variant="dark" />
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-104px)] max-w-7xl items-center gap-12 py-12 lg:grid-cols-[1fr_430px] lg:py-16">
        <section className="hidden max-w-xl lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-100 backdrop-blur">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" /></span>
            DagangOS workspace
          </div>
          <h1 className="mt-7 text-5xl font-black leading-[0.98] tracking-[-0.05em] text-white xl:text-6xl">
            {t('hero_title_1')}<br />
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-200 to-sky-400 bg-clip-text text-transparent">{t('hero_title_2')}</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-300">{t('hero_desc')}</p>

          <div className="mt-9 grid gap-3">
            {features.map((feature, index) => {
              const Icon = index === 0 ? ShieldCheck : index === 1 ? CheckCircle : Layers3
              return (
                <div key={feature} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-slate-100 backdrop-blur">
                  <Icon className="h-5 w-5 shrink-0 text-emerald-300" />
                  {feature}
                </div>
              )
            })}
          </div>
        </section>

        <section className="w-full rounded-[2rem] border border-white/70 bg-white/95 p-6 shadow-2xl shadow-slate-950/35 backdrop-blur sm:p-8 animate-scale-in">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><Sparkles className="h-3.5 w-3.5" /> Secure workspace</span>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950">{t('welcome')}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{t('signin_subtitle')}</p>
            </div>
            <div className="rounded-2xl bg-slate-950 p-3 text-emerald-300"><ShieldCheck className="h-5 w-5" /></div>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">{t('email_label')}</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-bold text-slate-700">{t('password_label')}</label>
                <Link href="/auth/forgot-password" className="text-xs font-bold text-emerald-700 transition-colors hover:text-emerald-800">{t('forgot_password')}</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-11 text-sm text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
                <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

            {mfaRequired && (
              <div className="animate-scale-in">
                <label className="mb-2 block text-sm font-bold text-slate-700">Authenticator Code</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} placeholder="6-digit code" required className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
                </div>
              </div>
            )}

            {captchaSvg && (
              <div className="animate-scale-in rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="mb-2 block text-sm font-bold text-slate-700">Security Check</label>
                <div className="flex items-center gap-3">
                  <div className="shrink-0 overflow-hidden rounded-lg bg-white" dangerouslySetInnerHTML={{ __html: captchaSvg }} />
                  <input type="text" value={captchaAnswer} onChange={(event) => setCaptchaAnswer(event.target.value)} placeholder="Type characters" required className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
                </div>
              </div>
            )}

            <button type="submit" id="login-submit" disabled={isLoading} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />{t('btn_logging_in')}</> : <>{t('btn_login')}<ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></>}
            </button>
          </form>

          <div className="mt-7 border-t border-slate-100 pt-5 text-center">
            <p className="text-sm text-slate-500">Workspace access is issued by DagangOS once your project is provisioned.</p>
            <p className="mt-3 text-xs text-slate-400">Bcrypt password hashing (cost 12) · HttpOnly secure session cookies</p>
          </div>
        </section>
      </div>
    </main>
  )
}
