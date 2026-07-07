'use client'

import { useState } from 'react'
import { Bell, Mail, MessageSquare, Settings2, Plus, Edit2, Trash2, Eye, CheckCircle2, Search, Loader2 } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { updateNotificationTemplate } from '@/lib/actions/notifications'

export function NotificationsClient({ initialTemplates, tenantId }: { initialTemplates: any[], tenantId: string }) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [activeTab, setActiveTab] = useState<'templates' | 'logs' | 'settings'>('templates')
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null)
  
  // Edited values
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSelect = (tmpl: any) => {
    setSelectedTemplate(tmpl)
    setEditSubject(tmpl.subjectLine || '')
    setEditBody(tmpl.htmlBodyMarkup || '')
  }

  const handleSave = async () => {
    if (!selectedTemplate) return
    setIsSaving(true)
    const res = await updateNotificationTemplate(tenantId, selectedTemplate.id, {
      subjectLine: editSubject,
      htmlBodyMarkup: editBody
    })
    setIsSaving(false)

    if (res.success) {
      toast.success('Template Saved')
      setTemplates(prev => prev.map(t => t.id === res.template.id ? res.template : t))
      setSelectedTemplate(res.template)
    } else {
      toast.error(res.error || 'Failed to save template')
    }
  }

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">Notifications</h2>
          <p className="section-desc">Manage transactional emails, SMS, and in-app alerts</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          {(['templates', 'logs', 'settings'] as const).map(t => (
            <button 
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn('px-4 py-1.5 text-sm font-medium rounded-md transition-all capitalize', activeTab === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700')}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Templates</h3>
                <button onClick={() => toast.success('New template')} className="p-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {templates.map(tmpl => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleSelect(tmpl)}
                    className={cn('w-full text-left p-3 rounded-xl border transition-all', selectedTemplate?.id === tmpl.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50')}
                  >
                    <div className="flex items-center justify-between">
                      <p className={cn('text-sm font-medium', selectedTemplate?.id === tmpl.id ? 'text-indigo-700' : 'text-slate-800')}>{tmpl.templateKey.replace(/_/g, ' ')}</p>
                      <div className="flex gap-1 text-[10px] uppercase font-bold text-slate-500">
                        {tmpl.channelType === 'email' && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded flex items-center gap-1"><Mail className="w-3 h-3" /> Email</span>}
                        {tmpl.channelType === 'sms' && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded flex items-center gap-1"><MessageSquare className="w-3 h-3" /> SMS</span>}
                      </div>
                    </div>
                  </button>
                ))}
                {templates.length === 0 && <p className="text-sm text-slate-500">No templates found.</p>}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedTemplate ? (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 capitalize">Edit: {selectedTemplate.templateKey.replace(/_/g, ' ')}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => toast.success('Preview sent')} className="btn btn-secondary btn-sm"><Eye className="w-4 h-4" /> Test Send</button>
                    <button onClick={handleSave} disabled={isSaving} className="btn btn-primary btn-sm">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedTemplate.channelType === 'email' && (
                    <div>
                      <label className="form-label">Subject Line</label>
                      <input type="text" className="form-input" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
                    </div>
                  )}
                  <div>
                    <label className="form-label">Content Body</label>
                    <p className="text-xs text-slate-400 mb-2">Available variables: <code>{'{{customer_name}}'}</code>, <code>{'{{order_id}}'}</code>, <code>{'{{company_name}}'}</code></p>
                    <textarea 
                      className="form-textarea font-mono text-sm bg-slate-900 text-slate-300 p-4 rounded-xl min-h-[200px]"
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="card p-12 text-center h-full flex flex-col items-center justify-center">
                <Mail className="w-12 h-12 text-slate-200 mb-3" />
                <p className="text-slate-500">Select a template to edit</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex gap-3">
             <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search recipient..." className="form-input pl-9" />
            </div>
          </div>
          <table className="data-table">
            <thead><tr><th>Recipient</th><th>Template</th><th>Channel</th><th>Status</th><th>Time</th></tr></thead>
            <tbody>
              <tr><td>customer@example.com</td><td>Order Confirmation</td><td>Email</td><td><span className="badge badge-success">Delivered</span></td><td className="text-sm text-slate-500">2 mins ago</td></tr>
              <tr><td>+81 90-1234-5678</td><td>Welcome SMS</td><td>SMS</td><td><span className="badge badge-success">Delivered</span></td><td className="text-sm text-slate-500">1 hour ago</td></tr>
              <tr><td>admin@company.com</td><td>Low Stock Alert</td><td>Email</td><td><span className="badge badge-warning">Bounced</span></td><td className="text-sm text-slate-500">3 hours ago</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="card p-5 max-w-2xl">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">SMTP Configuration</h3>
          <div className="space-y-4">
            <div><label className="form-label">SMTP Host</label><input type="text" className="form-input" placeholder="smtp.sendgrid.net" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="form-label">Port</label><input type="text" className="form-input" placeholder="587" /></div>
              <div><label className="form-label">Encryption</label>
                <select className="form-select"><option>TLS</option><option>SSL</option><option>None</option></select>
              </div>
            </div>
            <div><label className="form-label">Username</label><input type="text" className="form-input" placeholder="apikey" /></div>
            <div><label className="form-label">Password</label><input type="password" className="form-input" placeholder="••••••••••••••••" /></div>
            <button className="btn btn-primary" onClick={() => toast.success('Settings Saved')}>Save Configuration</button>
          </div>
        </div>
      )}
    </div>
  )
}
