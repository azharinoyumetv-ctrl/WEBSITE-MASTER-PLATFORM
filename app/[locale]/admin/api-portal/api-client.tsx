'use client'

import { useState } from 'react'
import { Code2, Key, Link2, Copy, Trash2, Eye, EyeOff, CheckCircle2, ShieldAlert, Plus, Zap, Loader2, Save, Edit2 } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { createApiKey, createWebhook, deleteApiKey, deleteWebhook, testWebhookDispatch, rotateApiKey, updateApiKey, updateWebhook } from '@/lib/actions/api'

const WEBHOOK_EVENTS = [
  { id: 'order.created', label: 'Order Created' },
  { id: 'order.updated', label: 'Order Updated' },
  { id: 'inventory.updated', label: 'Inventory Updated' },
  { id: 'payment.captured', label: 'Payment Captured' }
]

const API_SCOPES = [
  { id: 'catalog:read', label: 'Read Catalog' },
  { id: 'catalog:write', label: 'Write Catalog' },
  { id: 'orders:read', label: 'Read Orders' },
  { id: 'orders:write', label: 'Write Orders' },
  { id: 'inventory:read', label: 'Read Inventory' },
  { id: 'inventory:write', label: 'Write Inventory' }
]

export function ApiPortalClient({ initialKeys, initialWebhooks, telemetry, tenantId }: { initialKeys: any[], initialWebhooks: any[], telemetry: any, tenantId: string }) {
  const [keys, setKeys] = useState(initialKeys)
  const [webhooks, setWebhooks] = useState(initialWebhooks)
  const [showKey, setShowKey] = useState<string | null>(null)
  const [isCreatingKey, setIsCreatingKey] = useState(false)
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false)
  const [testingWebhooks, setTestingWebhooks] = useState<Record<string, boolean>>({})
  
  const [editingWebhook, setEditingWebhook] = useState<any>(null)
  const [editingKey, setEditingKey] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Custom Key Generator Modal States
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false)
  const [newKeyForm, setNewKeyForm] = useState({ keyName: '', scopes: ['catalog:read'], expiresInDays: 30 })
  const [generatedKey, setGeneratedKey] = useState<any | null>(null)

  const activeKeys = keys.filter(key => key.isActive && (!key.expiresAt || new Date(key.expiresAt) > new Date())).length
  const activeWebhooks = webhooks.filter(webhook => webhook.isActive).length
  const deliveryFailures = webhooks.reduce((total, webhook) => total + Number(webhook.failureCount || 0), 0)
  const errorRate = telemetry?.requestCount ? Math.round((telemetry.errorCount / telemetry.requestCount) * 1000) / 10 : null

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const handleCreateKey = async () => {
    if (!newKeyForm.keyName.trim()) {
      return toast.error('Key Name is required')
    }
    setIsCreatingKey(true)
    const res = await createApiKey(tenantId, newKeyForm.keyName, newKeyForm.scopes, newKeyForm.expiresInDays)
    setIsCreatingKey(false)
    if (res.success) {
      setKeys([res.key, ...keys])
      setGeneratedKey(res.key)
      setShowCreateKeyModal(false)
      toast.success('API Key created successfully')
    } else {
      toast.error('Failed to create key: ' + res.error)
    }
  }

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke and delete this API key?')) return
    const res = await deleteApiKey(tenantId, id)
    if (res.success) {
      setKeys(keys.filter(k => k.id !== id))
      toast.success('API Key deleted')
    } else {
      toast.error('Failed to delete key')
    }
  }

  const handleRotateKey = async (id: string) => {
    if (!confirm('Rotate this key? The old key will expire in 7 days.')) return
    const res = await rotateApiKey(tenantId, id)
    if (res.success && res.key) {
      // Create a local var to avoid type errors in callbacks
      const newKey = res.key
      setKeys(keys.map(k => k.id === id ? { ...k, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() } : k))
      setKeys(prev => [newKey, ...prev])
      toast.success('API Key rotated')
      setShowKey(newKey.id)
    } else {
      toast.error('Failed to rotate key')
    }
  }

  const handleCreateWebhook = async () => {
    setEditingWebhook({ isNew: true, targetUrl: '', subscribedEvents: ['order.created'] })
  }

  const handleSaveWebhook = async () => {
    if (!editingWebhook.targetUrl.startsWith('http')) {
      return toast.error('URL must start with http or https')
    }
    setIsSaving(true)
    if (editingWebhook.isNew) {
      const res = await createWebhook(tenantId, editingWebhook.targetUrl, editingWebhook.subscribedEvents)
      if (res.success) {
        setWebhooks([res.webhook, ...webhooks])
        toast.success('Webhook endpoint added')
        setEditingWebhook(null)
      } else {
        toast.error('Failed to add webhook: ' + res.error)
      }
    } else {
      const res = await updateWebhook(tenantId, editingWebhook.id, {
        targetUrl: editingWebhook.targetUrl,
        subscribedEvents: editingWebhook.subscribedEvents
      })
      if (res.success) {
        setWebhooks(webhooks.map(w => w.id === editingWebhook.id ? { ...w, targetUrl: editingWebhook.targetUrl, subscribedEvents: editingWebhook.subscribedEvents } : w))
        toast.success('Webhook updated')
        setEditingWebhook(null)
      } else {
        toast.error('Failed to update webhook: ' + res.error)
      }
    }
    setIsSaving(false)
  }

  const handleSaveKey = async () => {
    setIsSaving(true)
    const res = await updateApiKey(tenantId, editingKey.id, {
      keyName: editingKey.keyName,
      scopes: editingKey.scopes
    })
    setIsSaving(false)
    if (res.success) {
      setKeys(keys.map(k => k.id === editingKey.id ? { ...k, keyName: editingKey.keyName, scopes: editingKey.scopes } : k))
      toast.success('API Key updated')
      setEditingKey(null)
    } else {
      toast.error('Failed to update API Key')
    }
  }

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook endpoint?')) return
    const res = await deleteWebhook(tenantId, id)
    if (res.success) {
      setWebhooks(webhooks.filter(w => w.id !== id))
      toast.success('Webhook deleted')
    } else {
      toast.error('Failed to delete webhook')
    }
  }

  const handleTestWebhook = async (id: string) => {
    setTestingWebhooks(prev => ({ ...prev, [id]: true }))
    const res = await testWebhookDispatch(tenantId, id)
    setTestingWebhooks(prev => ({ ...prev, [id]: false }))

    if (res.success) {
      toast.success(res.message || 'Test payload sent')
    } else {
      toast.error('Test failed: ' + res.error)
    }
  }

  const handleResetFailures = async (id: string) => {
    const res = await updateWebhook(tenantId, id, { failureCount: 0 })
    if (res.success) {
      setWebhooks(webhooks.map(w => w.id === id ? { ...w, failureCount: 0 } : w))
      toast.success('Failures reset')
    } else {
      toast.error('Failed to reset failures')
    }
  }

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">API & Webhooks</h2>
          <p className="section-desc">Manage developer access keys and event subscriptions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* API Keys */}
        <div className="card flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900">API Keys</h3>
            </div>
            <button onClick={() => { setNewKeyForm({ keyName: '', scopes: ['catalog:read'], expiresInDays: 30 }); setShowCreateKeyModal(true) }} className="btn btn-secondary btn-sm">
              <Plus className="w-4 h-4" /> Generate Key
            </button>
          </div>
          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[400px]">
            {keys.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <Key className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm">No API keys generated yet.</p>
              </div>
            )}
            {keys.length > 0 && keys.map(k => (
              <div key={k.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900">{k.keyName}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Created {formatDate(k.createdAt)} · Used {k.lastUsedAt ? formatDate(k.lastUsedAt, 'relative') : 'Never'}</p>
                    {k.expiresAt && <p className="text-xs text-red-500 mt-0.5">Expires {formatDate(k.expiresAt)}</p>}
                    
                    <div className="mt-3">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Usage (Lifetime)</span>
                        <span className="text-[10px] text-slate-700">{k.requestCount || 0} reqs</span>
                      </div>
                      <div className="h-1.5 w-48 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-500", (k.requestCount || 0) > 10000 ? "bg-amber-500" : "bg-emerald-500")}
                          style={{ width: `${Math.min(100, ((k.requestCount || 0) / 20000) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('badge text-[10px]', k.isActive && !k.expiresAt ? 'badge-success' : k.expiresAt ? 'badge-warning' : 'badge-neutral')}>
                      {k.isActive ? (k.expiresAt ? 'Expiring' : 'Active') : 'Revoked'}
                    </span>
                    <button onClick={() => setEditingKey(k)} className="p-1 text-slate-400 hover:text-indigo-500 transition-colors" title="Edit Key">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleRotateKey(k.id)} className="p-1 text-slate-400 hover:text-indigo-500 transition-colors" title="Rotate Key">
                      <Zap className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteKey(k.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors" title="Revoke Key">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex-1 bg-slate-900 rounded-lg p-2 flex items-center justify-between">
                    <code className="text-xs text-emerald-400 font-mono break-all">
                      {showKey === k.id && k.rawKey ? `${k.keyPrefix}${k.rawKey}` : `${k.keyPrefix}${'•'.repeat(32)}`}
                    </code>
                    <div className="flex gap-1 shrink-0">
                      {k.rawKey && (
                        <button onClick={() => setShowKey(showKey === k.id ? null : k.id)} className="p-1 text-slate-400 hover:text-white transition-colors">
                          {showKey === k.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          if (k.rawKey) {
                            copyToClipboard(`${k.keyPrefix}${k.rawKey}`)
                          } else {
                            toast.error('Key is hidden for security. Please generate a new one.')
                          }
                        }} 
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {(k.scopes as string[] || []).map((s: string) => <span key={s} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-mono">{s}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Webhooks */}
        <div className="card flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-900">Webhooks</h3>
            </div>
            <button onClick={handleCreateWebhook} disabled={isCreatingWebhook} className="btn btn-secondary btn-sm">
              {isCreatingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 
              {isCreatingWebhook ? 'Adding...' : 'Add Endpoint'}
            </button>
          </div>
          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[400px]">
            {webhooks.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <Link2 className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm">No webhooks configured yet.</p>
              </div>
            )}
            {webhooks.length > 0 && webhooks.map(w => (
              <div key={w.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="font-mono text-sm text-slate-700 truncate">{w.targetUrl}</h4>
                    {w.failureCount > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-red-500 flex items-center gap-1 font-medium">
                          <ShieldAlert className="w-3 h-3" /> {w.failureCount} recent delivery failures
                        </p>
                        <button onClick={() => handleResetFailures(w.id)} className="text-[10px] text-slate-500 hover:text-slate-900 underline">
                          Reset
                        </button>
                      </div>
                    )}
                  </div>
                  <span className={cn('badge text-[10px]', w.isActive ? 'badge-success' : 'badge-neutral')}>{w.isActive ? 'Active' : 'Disabled'}</span>
                </div>
                
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Subscribed Events</p>
                  <div className="flex flex-wrap gap-1">
                    {(w.subscribedEvents as string[] || []).map((e: string) => <span key={e} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">{e}</span>)}
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Signing Secret</p>
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-100">
                    <code className="text-[10px] font-mono text-slate-600 truncate flex-1">{w.secretSigningToken || 'Hidden'}</code>
                    {w.secretSigningToken && (
                      <button onClick={() => copyToClipboard(w.secretSigningToken)} className="text-slate-400 hover:text-indigo-500">
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button 
                    onClick={() => handleTestWebhook(w.id)} 
                    disabled={testingWebhooks[w.id]}
                    className="btn btn-ghost btn-sm text-xs"
                  >
                    {testingWebhooks[w.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />} 
                    {testingWebhooks[w.id] ? 'Sending...' : 'Send Test'}
                  </button>
                  <button onClick={() => handleDeleteWebhook(w.id)} className="btn btn-ghost btn-sm text-xs text-red-500"><Trash2 className="w-3 h-3" /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h3 className="text-base font-semibold text-slate-900">Developer activity</h3>
          <p className="text-xs text-slate-500 mt-1">Configuration health and recorded tenant API activity from the last 30 days.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4"><p className="text-xs font-semibold text-indigo-700">Active API keys</p><p className="mt-1 text-2xl font-black text-indigo-950">{activeKeys}</p></div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-700">Active webhook endpoints</p><p className="mt-1 text-2xl font-black text-emerald-950">{activeWebhooks}</p></div>
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-4"><p className="text-xs font-semibold text-rose-700">Recorded delivery failures</p><p className="mt-1 text-2xl font-black text-rose-950">{deliveryFailures}</p></div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-sky-100 bg-sky-50 p-4"><p className="text-xs font-semibold text-sky-700">Recorded API requests</p><p className="mt-1 text-2xl font-black text-sky-950">{telemetry?.requestCount ?? 0}</p></div>
          <div className="rounded-xl border border-violet-100 bg-violet-50 p-4"><p className="text-xs font-semibold text-violet-700">P95 latency</p><p className="mt-1 text-2xl font-black text-violet-950">{telemetry?.p95LatencyMs == null ? '—' : `${telemetry.p95LatencyMs} ms`}</p></div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-700">API error rate</p><p className="mt-1 text-2xl font-black text-amber-950">{errorRate == null ? '—' : `${errorRate}%`}</p></div>
        </div>
        {telemetry?.requestCount ? (
          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-100">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2 font-semibold">Route</th><th className="px-3 py-2 font-semibold">Status</th><th className="px-3 py-2 font-semibold">Latency</th><th className="px-3 py-2 font-semibold">Recorded</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {telemetry.recentRequests.map((request: any, index: number) => <tr key={`${request.route}-${request.createdAt}-${index}`} className="text-slate-700"><td className="px-3 py-2 font-mono">{request.method} {request.route}</td><td className={cn('px-3 py-2 font-semibold', request.statusCode >= 400 ? 'text-rose-600' : 'text-emerald-600')}>{request.statusCode}</td><td className="px-3 py-2">{request.latencyMs} ms</td><td className="px-3 py-2">{formatDate(request.createdAt, 'relative')}</td></tr>)}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-4 text-xs leading-5 text-slate-500">No recorded tenant API requests yet. Metrics appear only after an attributable request reaches the control plane; DagangOS does not display synthetic traffic.</p>}
      </div>

      {/* Edit Webhook Modal */}
      {editingWebhook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-slide-up">
            <h3 className="text-lg font-bold mb-4">{editingWebhook.isNew ? 'Add Webhook Endpoint' : 'Edit Webhook'}</h3>
            <div className="space-y-4">
              <div>
                <label className="form-label">Endpoint URL</label>
                <input 
                  type="url" 
                  value={editingWebhook.targetUrl} 
                  onChange={e => setEditingWebhook({...editingWebhook, targetUrl: e.target.value})}
                  className="form-input" 
                  placeholder="https://api.example.com/webhook"
                />
              </div>
              <div>
                <label className="form-label mb-2 block">Subscribed Events</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3 bg-slate-50">
                  {WEBHOOK_EVENTS.map(event => (
                    <label key={event.id} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="form-checkbox text-indigo-600 rounded"
                        checked={editingWebhook.subscribedEvents.includes(event.id)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setEditingWebhook({
                            ...editingWebhook,
                            subscribedEvents: isChecked 
                              ? [...editingWebhook.subscribedEvents, event.id]
                              : editingWebhook.subscribedEvents.filter((id: string) => id !== event.id)
                          });
                        }}
                      />
                      <span className="text-sm font-medium text-slate-700">{event.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditingWebhook(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSaveWebhook} disabled={isSaving} className="btn btn-primary">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit API Key Modal */}
      {editingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-slide-up">
            <h3 className="text-lg font-bold mb-4">Edit API Key</h3>
            <div className="space-y-4">
              <div>
                <label className="form-label">Key Name</label>
                <input 
                  type="text" 
                  value={editingKey.keyName} 
                  onChange={e => setEditingKey({...editingKey, keyName: e.target.value})}
                  className="form-input" 
                />
              </div>
              <div>
                <label className="form-label mb-2 block">Scopes</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3 bg-slate-50">
                  {API_SCOPES.map(scope => (
                    <label key={scope.id} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="form-checkbox text-indigo-600 rounded"
                        checked={(editingKey.scopes || []).includes(scope.id)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          const currentScopes = editingKey.scopes || [];
                          setEditingKey({
                            ...editingKey,
                            scopes: isChecked 
                              ? [...currentScopes, scope.id]
                              : currentScopes.filter((id: string) => id !== scope.id)
                          });
                        }}
                      />
                      <span className="text-sm font-medium text-slate-700">{scope.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditingKey(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSaveKey} disabled={isSaving} className="btn btn-primary">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate API Key Modal */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-slide-up">
            <h3 className="text-lg font-bold mb-4">Generate API Key</h3>
            <div className="space-y-4">
              <div>
                <label className="form-label">Key Name</label>
                <input 
                  type="text" 
                  value={newKeyForm.keyName} 
                  onChange={e => setNewKeyForm({...newKeyForm, keyName: e.target.value})}
                  className="form-input" 
                  placeholder="e.g. Production Client"
                />
              </div>
              <div>
                <label className="form-label">Expires In</label>
                <select 
                  value={newKeyForm.expiresInDays} 
                  onChange={e => setNewKeyForm({...newKeyForm, expiresInDays: parseInt(e.target.value)})}
                  className="form-select"
                >
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                  <option value="365">365 Days</option>
                  <option value="0">Never</option>
                </select>
              </div>
              <div>
                <label className="form-label mb-2 block">Scopes</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3 bg-slate-50">
                  {API_SCOPES.map(scope => (
                    <label key={scope.id} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="form-checkbox text-indigo-600 rounded"
                        checked={newKeyForm.scopes.includes(scope.id)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setNewKeyForm({
                            ...newKeyForm,
                            scopes: isChecked 
                              ? [...newKeyForm.scopes, scope.id]
                              : newKeyForm.scopes.filter((id: string) => id !== scope.id)
                          });
                        }}
                      />
                      <span className="text-sm font-medium text-slate-700">{scope.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCreateKeyModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleCreateKey} disabled={isCreatingKey} className="btn btn-primary">
                {isCreatingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Success API Key Modal */}
      {generatedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-slide-up">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-6 h-6" /> Key Generated Successfully
            </h3>
            <p className="text-sm text-slate-600 mb-4">Make sure to copy your API key now. You won't be able to see it again!</p>
            
            <div className="bg-slate-900 rounded-lg p-3 flex items-center justify-between mb-6">
              <code className="text-xs text-emerald-400 font-mono break-all select-all">
                {generatedKey.keyPrefix}{generatedKey.rawKey}
              </code>
              <button 
                onClick={() => copyToClipboard(`${generatedKey.keyPrefix}${generatedKey.rawKey}`)} 
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={() => setGeneratedKey(null)} 
                className="btn btn-primary bg-slate-900 text-white hover:bg-slate-800"
              >
                Close & I have copied it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
