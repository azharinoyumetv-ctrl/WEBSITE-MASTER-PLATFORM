'use client'

import { useState } from 'react'
import { Code2, Key, Link2, Copy, Trash2, Eye, EyeOff, CheckCircle2, ShieldAlert, Plus, Zap, Loader2 } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { createApiKey, createWebhook, deleteApiKey, deleteWebhook, testWebhookDispatch, rotateApiKey } from '@/lib/actions/api'

export function ApiPortalClient({ initialKeys, initialWebhooks, tenantId }: { initialKeys: any[], initialWebhooks: any[], tenantId: string }) {
  const [keys, setKeys] = useState(initialKeys)
  const [webhooks, setWebhooks] = useState(initialWebhooks)
  const [showKey, setShowKey] = useState<string | null>(null)
  const [isCreatingKey, setIsCreatingKey] = useState(false)
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false)
  const [testingWebhooks, setTestingWebhooks] = useState<Record<string, boolean>>({})

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const handleCreateKey = async () => {
    setIsCreatingKey(true)
    const res = await createApiKey(tenantId, 'New API Key ' + (keys.length + 1))
    setIsCreatingKey(false)
    if (res.success) {
      setKeys([res.key, ...keys])
      toast.success('API Key created successfully')
    } else {
      toast.error('Failed to create key')
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
    const url = window.prompt('Enter the webhook endpoint URL (e.g. https://your-server.com/webhook):')
    if (!url) return
    if (!url.startsWith('http')) {
      return toast.error('URL must start with http or https')
    }

    setIsCreatingWebhook(true)
    const res = await createWebhook(tenantId, url, ['order.created', 'inventory.updated'])
    setIsCreatingWebhook(false)

    if (res.success) {
      setWebhooks([res.webhook, ...webhooks])
      toast.success('Webhook endpoint added successfully')
    } else {
      toast.error('Failed to add webhook: ' + res.error)
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
            <button onClick={handleCreateKey} disabled={isCreatingKey} className="btn btn-secondary btn-sm">
              {isCreatingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Generate Key
            </button>
          </div>
          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[400px]">
            {keys.map(k => (
              <div key={k.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900">{k.keyName}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Created {formatDate(k.createdAt)} · Used {k.lastUsedAt ? formatDate(k.lastUsedAt, 'relative') : 'Never'} · {k.requestCount || 0} reqs</p>
                    {k.expiresAt && <p className="text-xs text-red-500 mt-0.5">Expires {formatDate(k.expiresAt)}</p>}
                    <div className="flex gap-1 mt-1">
                      {k.scopes?.map((s: string) => (
                        <span key={s} className="badge badge-neutral text-[9px]">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('badge text-[10px]', k.isActive && !k.expiresAt ? 'badge-success' : k.expiresAt ? 'badge-warning' : 'badge-neutral')}>
                      {k.isActive ? (k.expiresAt ? 'Expiring' : 'Active') : 'Revoked'}
                    </span>
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
            {keys.length === 0 && <p className="p-4 text-sm text-slate-500">No API keys found.</p>}
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
            {webhooks.map(w => (
              <div key={w.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="font-mono text-sm text-slate-700 truncate">{w.targetUrl}</h4>
                    {w.failureCount > 0 && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> {w.failureCount} recent delivery failures
                      </p>
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
            {webhooks.length === 0 && <p className="p-4 text-sm text-slate-500">No webhooks found.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
