import Link from 'next/link'
import { ArrowLeft, MailCheck, ShieldCheck } from 'lucide-react'
import { DagangOSBrand } from '@/components/DagangOSBrand'

export default function RegisterPage() {
  return (
    <main className="min-h-screen dagangos-aurora relative isolate overflow-hidden px-6 py-12 text-white">
      <div className="absolute inset-0 dagangos-grid opacity-35" />
      <div className="relative mx-auto flex min-h-[calc(100vh-6rem)] max-w-lg items-center">
        <section className="w-full rounded-[2rem] border border-white/15 bg-slate-950/65 p-7 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-10">
          <DagangOSBrand dark className="mb-10" />
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300">
            <MailCheck className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-black tracking-[-0.04em]">Access by invitation</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            DagangOS workspaces are created after your project has been reviewed and provisioned. Your welcome email contains your temporary domain and a secure link to set your password.
          </p>
          <div className="mt-7 flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" />
            <p>Do not create an account here. If you are waiting for access, reply to your DagangOS project email.</p>
          </div>
          <Link href="/auth/login" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-emerald-300 transition hover:text-emerald-200">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </section>
      </div>
    </main>
  )
}
