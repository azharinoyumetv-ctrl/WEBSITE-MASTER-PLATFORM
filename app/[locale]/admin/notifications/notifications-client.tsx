'use client'

import { useState } from 'react'
import { Bell, Mail, MessageSquare, Settings2, Plus, Edit2, Trash2, Eye, CheckCircle2, Search, Loader2, X } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { updateNotificationTemplate, saveNotificationGateway, createNotificationTemplate, dispatchTestNotification, toggleNotificationGateway, deleteNotificationTemplate, retryNotificationLog } from '@/lib/actions/notifications'

export function NotificationsClient({ initialTemplates, initialLogs = [], initialGateway, tenantId }: { initialTemplates: any[], initialLogs?: any[], initialGateway?: any, tenantId: string }) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [logs, setLogs] = useState(initialLogs)
  const [gateway, setGateway] = useState(initialGateway)
  const [activeTab, setActiveTab] = useState<'templates' | 'logs' | 'settings'>('templates')
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null)
  
  // Edited values
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  // Settings values
  const [smtpConfig, setSmtpConfig] = useState({
    host: initialGateway?.providerConfig?.host || '',
    port: initialGateway?.providerConfig?.port || '587',
    encryption: initialGateway?.providerConfig?.encryption || 'TLS',
    username: initialGateway?.providerConfig?.username || '',
    password: initialGateway?.providerConfig?.password || ''
  })
  const [isSavingSmtp, setIsSavingSmtp] = useState(false)
  
  const [isGatewayActive, setIsGatewayActive] = useState(initialGateway?.isActive ?? false)
  const [isTogglingGateway, setIsTogglingGateway] = useState(false)

  // New Template State
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ templateKey: '', channelType: 'email' })

  const handleCreateTemplate = async () => {
    if (!newTemplate.templateKey) return
    setIsCreatingTemplate(true)
    const res = await createNotificationTemplate(tenantId, {
      ...newTemplate,
      subjectLine: newTemplate.channelType === 'email' ? 'New Notification' : undefined,
      htmlBodyMarkup: 'Hello {{customer_name}},'
    })
    setIsCreatingTemplate(false)
    if (res.success && res.template) {
      toast.success('Template created')
      setTemplates([...templates, res.template])
      setIsNewTemplateModalOpen(false)
      setNewTemplate({ templateKey: '', channelType: 'email' })
      handleSelect(res.template)
    } else {
      toast.error(res.error || 'Failed to create template')
    }
  }

  const handleTestSend = async () => {
    if (!selectedTemplate) return
    const toastId = toast.loading('Dispatching test notification...')
    const res = await dispatchTestNotification(tenantId, selectedTemplate.id)
    if (res.success) {
      toast.success(res.message || 'Success', { id: toastId })
    } else {
      toast.error(res.error || 'Failed to dispatch test', { id: toastId })
    }
  }

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

    if (res.success && res.template) {
      toast.success('Template Saved')
      setTemplates(prev => prev.map(t => t.id === res.template.id ? res.template : t))
      setSelectedTemplate(res.template)
    } else {
      toast.error(res.error || 'Failed to save template')
    }
  }

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return
    if (!confirm('Are you sure you want to delete this template?')) return
    const toastId = toast.loading('Deleting...')
    const res = await deleteNotificationTemplate(tenantId, selectedTemplate.id)
    if (res.success) {
      toast.success('Deleted', { id: toastId })
      setTemplates(prev => prev.filter(t => t.id !== selectedTemplate.id))
      setSelectedTemplate(null)
    } else {
      toast.error(res.error || 'Failed to delete', { id: toastId })
    }
  }

  const handleRetryLog = async (logId: string) => {
    const toastId = toast.loading('Retrying...')
    const res = await retryNotificationLog(tenantId, logId)
    if (res.success) {
      toast.success('Queued for retry', { id: toastId })
      setLogs(prev => prev.map((l: any) => l.id === logId ? { ...l, status: 'pending', retryCount: l.retryCount + 1, deliveryError: null } : l))
    } else {
      toast.error(res.error || 'Failed to retry', { id: toastId })
    }
  }

  const handleSaveSmtp = async () => {
    setIsSavingSmtp(true)
    const res = await saveNotificationGateway(tenantId, 'email', 'custom_smtp', smtpConfig)
    setIsSavingSmtp(false)

    if (res.success && res.gateway) {
      setGateway(res.gateway)
      setIsGatewayActive(res.gateway.isActive)
      toast.success('SMTP Configuration Saved')
    } else {
      toast.error(res.error || 'Failed to save configuration')
    }
  }

  const handleToggleGateway = async () => {
    if (!gateway) {
      toast.error('Save configuration first')
      return
    }
    setIsTogglingGateway(true)
    const newState = !isGatewayActive
    const res = await toggleNotificationGateway(tenantId, gateway.id, newState)
    setIsTogglingGateway(false)
    if (res.success) {
      setIsGatewayActive(newState)
      toast.success(`Gateway ${newState ? 'enabled' : 'disabled'}`)
    } else {
      toast.error(res.error || 'Failed to toggle gateway')
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
                <button onClick={() => setIsNewTemplateModalOpen(true)} className="p-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100">
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
                  <div className="flex items-center gap-2">
                    <button onClick={handleTestSend} className="btn btn-secondary btn-sm flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> Test
                    </button>
                    <button onClick={handleDeleteTemplate} className="btn btn-secondary btn-sm flex items-center gap-1 text-red-500 hover:bg-red-50 hover:border-red-200">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="btn btn-primary btn-sm flex items-center gap-1">
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Save
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
            <thead><tr><th>Recipient</th><th>Template</th><th>Channel</th><th>Status</th><th>Time</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id}>
                  <td className="font-medium text-slate-800 text-sm">{log.recipient}</td>
                  <td className="text-xs text-slate-500 font-mono">{log.channelType}</td>
                  <td>
                    <span className={cn('badge text-[10px] uppercase', log.channelType === 'email' ? 'badge-blue' : 'badge-emerald')}>{log.channelType}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <span className={cn('badge text-[10px]', log.status === 'delivered' ? 'badge-success' : (log.status === 'pending' ? 'badge-amber' : 'badge-error'))}>{log.status.toUpperCase()}</span>
                      {log.retryCount > 0 && <span className="text-[10px] text-slate-400">({log.retryCount} retries)</span>}
                    </div>
                    {log.deliveryError && <p className="text-[10px] text-red-500 mt-1 max-w-xs truncate" title={log.deliveryError}>{log.deliveryError}</p>}
                  </td>
                  <td className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="text-right">
                    {log.status === 'failed' && (
                      <button onClick={() => handleRetryLog(log.id)} className="btn btn-secondary btn-sm text-xs py-1 px-2">Retry</button>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={6} className="text-center text-slate-500 py-8">No recent notification logs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="card p-5 max-w-2xl">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">SMTP Configuration</h3>
              <p className="text-xs text-slate-500">Enable or configure your email gateway</p>
            </div>
            {gateway && (
              <button 
                onClick={handleToggleGateway} 
                disabled={isTogglingGateway}
                className={cn('px-4 py-1.5 rounded-full text-xs font-medium transition-colors', isGatewayActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
              >
                {isTogglingGateway ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                {isGatewayActive ? 'Gateway Enabled' : 'Gateway Disabled'}
              </button>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="form-label">SMTP Host</label>
              <input type="text" className="form-input" placeholder="smtp.sendgrid.net" value={smtpConfig.host} onChange={e => setSmtpConfig({...smtpConfig, host: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Port</label>
                <input type="text" className="form-input" placeholder="587" value={smtpConfig.port} onChange={e => setSmtpConfig({...smtpConfig, port: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Encryption</label>
                <select className="form-select" value={smtpConfig.encryption} onChange={e => setSmtpConfig({...smtpConfig, encryption: e.target.value})}>
                  <option value="TLS">TLS</option>
                  <option value="SSL">SSL</option>
                  <option value="None">None</option>
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Username</label>
              <input type="text" className="form-input" placeholder="apikey" value={smtpConfig.username} onChange={e => setSmtpConfig({...smtpConfig, username: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input type="password" className="form-input" placeholder="••••••••••••••••" value={smtpConfig.password} onChange={e => setSmtpConfig({...smtpConfig, password: e.target.value})} />
            </div>
            <button className="btn btn-primary" onClick={handleSaveSmtp} disabled={isSavingSmtp}>
              {isSavingSmtp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save Configuration
            </button>
          </div>
        </div>
      )}

      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-900">New Template</h3>
              <button onClick={() => setIsNewTemplateModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="form-label">Template Key</label>
                <input type="text" className="form-input" placeholder="e.g. order_confirmation" value={newTemplate.templateKey} onChange={e => setNewTemplate({...newTemplate, templateKey: e.target.value.toLowerCase().replace(/\s+/g, '_')})} />
              </div>
              <div>
                <label className="form-label">Channel Type</label>
                <select className="form-select" value={newTemplate.channelType} onChange={e => setNewTemplate({...newTemplate, channelType: e.target.value})}>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setIsNewTemplateModalOpen(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleCreateTemplate} disabled={isCreatingTemplate || !newTemplate.templateKey} className="btn btn-primary">
                {isCreatingTemplate ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
