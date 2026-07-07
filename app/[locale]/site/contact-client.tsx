'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { submitContactForm } from '@/lib/actions/site'
import { useTranslations } from 'next-intl'

export function ContactClient({ tenantId, primaryColor }: { tenantId: string, primaryColor: string }) {
  const t = useTranslations('Storefront')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.message) {
      return toast.error('Please fill in all required fields.')
    }

    setIsSubmitting(true)
    const res = await submitContactForm(tenantId, formData)
    setIsSubmitting(false)

    if (res.success) {
      toast.success('Your message has been sent successfully!')
      setFormData({ name: '', email: '', subject: '', message: '' })
    } else {
      toast.error('Failed to send message. Please try again.')
    }
  }

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">{t('send_message')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('full_name')} <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            placeholder={t('name_placeholder')} 
            required
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 text-sm" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('email')} <span className="text-red-500">*</span></label>
          <input 
            type="email" 
            placeholder={t('email_placeholder')} 
            required
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 text-sm" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('subject')}</label>
          <input 
            type="text" 
            placeholder={t('subject_placeholder')} 
            value={formData.subject}
            onChange={e => setFormData({ ...formData, subject: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 text-sm" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('message')} <span className="text-red-500">*</span></label>
          <textarea 
            rows={5} 
            placeholder={t('message_placeholder')}  
            required
            value={formData.message}
            onChange={e => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 text-sm resize-none" 
          />
        </div>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {isSubmitting ? t('btn_sending') : t('btn_send')}
        </button>
      </form>
    </div>
  )
}
