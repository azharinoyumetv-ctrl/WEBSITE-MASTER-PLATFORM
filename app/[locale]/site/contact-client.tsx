'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { submitContactForm } from '@/lib/actions/site'
import { useTranslations } from 'next-intl'
import { Turnstile } from '@marsidev/react-turnstile'

export function ContactClient({ tenantId }: { tenantId: string }) {
  const t = useTranslations('Storefront')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.message) {
      return toast.error(t('form_required_error'))
    }
    if (!turnstileToken && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      return toast.error(t('security_check_error'))
    }

    setIsSubmitting(true)
    const res = await submitContactForm(tenantId, { ...formData, turnstileToken })
    setIsSubmitting(false)

    if (res.success) {
      toast.success(t('message_sent'))
      setFormData({ name: '', email: '', subject: '', message: '' })
      setTurnstileToken(null)
    } else {
      toast.error(t('message_failed'))
    }
  }

  return (
    <div className="relative overflow-hidden bg-white rounded-[1.75rem] p-8 shadow-[0_16px_45px_rgba(15,23,42,.08)] border border-slate-200">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500" />
      <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">{t('project_brief')}</p>
      <h2 className="mt-2 text-2xl font-black text-slate-950 mb-6">{t('send_message')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isSubmitting}>
        <div>
          <label htmlFor="contact-name" className="block text-sm font-medium text-slate-700 mb-1.5">{t('full_name')} <span aria-hidden className="text-red-500">*</span></label>
          <input 
            id="contact-name"
            name="name"
            type="text" 
            autoComplete="name"
            placeholder={t('name_placeholder')} 
            required
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 text-sm" 
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-sm font-medium text-slate-700 mb-1.5">{t('email')} <span aria-hidden className="text-red-500">*</span></label>
          <input 
            id="contact-email"
            name="email"
            type="email" 
            autoComplete="email"
            placeholder={t('email_placeholder')} 
            required
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 text-sm" 
          />
        </div>
        <div>
          <label htmlFor="contact-subject" className="block text-sm font-medium text-slate-700 mb-1.5">{t('subject')}</label>
          <input 
            id="contact-subject"
            name="subject"
            type="text" 
            autoComplete="off"
            placeholder={t('subject_placeholder')} 
            value={formData.subject}
            onChange={e => setFormData({ ...formData, subject: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 text-sm" 
          />
        </div>
        <div>
          <label htmlFor="contact-message" className="block text-sm font-medium text-slate-700 mb-1.5">{t('message')} <span aria-hidden className="text-red-500">*</span></label>
          <textarea 
            id="contact-message"
            name="message"
            rows={5} 
            placeholder={t('message_placeholder')}  
            required
            value={formData.message}
            onChange={e => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 text-sm resize-none" 
          />
        </div>
        
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <div className="py-2">
            <Turnstile 
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} 
              onSuccess={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
            />
          </div>
        )}

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl font-black text-slate-950 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 bg-gradient-to-r from-emerald-300 to-sky-400"
        >
          {isSubmitting ? t('btn_sending') : t('btn_send')}
        </button>
      </form>
    </div>
  )
}
