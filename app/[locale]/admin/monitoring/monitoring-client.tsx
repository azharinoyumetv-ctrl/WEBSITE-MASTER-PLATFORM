'use client'

import { useState, useEffect } from 'react'
import { Activity, Server, Database, Globe, AlertTriangle, CheckCircle2, Clock, Plus, Loader2, Trash2, Edit2, Play, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMonitoringStatus, getIncidentLogs, logIncident, resolveIncident, getMonitoringRules, createMonitoringRule, updateMonitoringRule, deleteMonitoringRule } from '@/lib/actions/monitoring'
import { MetricsButton } from './metrics-button'
import toast from 'react-hot-toast'

export function MonitoringClient({ tenantId, initialData, initialIncidents, initialRules = [] }: { tenantId: string, initialData: any, initialIncidents: any[], initialRules?: any[] }) {
  const [data, setData] = useState(initialData)
  const [incidents, setIncidents] = useState(initialIncidents)
  const [rules, setRules] = useState(initialRules)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Incident Modal
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [incidentForm, setIncidentForm] = useState({ title: '', description: '', serviceName: 'postgres_rls' })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const [res, incRes, rulesRes] = await Promise.all([
      getMonitoringStatus(tenantId),
      getIncidentLogs(tenantId),
      getMonitoringRules(tenantId)
    ])
    if (res.success && res.monitoring) setData(res.monitoring)
    if (incRes.success && incRes.incidents) setIncidents(incRes.incidents)
    if (rulesRes.success && rulesRes.rules) setRules(rulesRes.rules)
    setIsRefreshing(false)
  }

  // Poll every 15s
  useEffect(() => {
    const t = setInterval(handleRefresh, 15000)
    return () => clearInterval(t)
  }, [tenantId])

  const handleLogIncident = async () => {
    if(!incidentForm.title || !incidentForm.description) return toast.error('Required fields missing')
    setIsSubmitting(true)
    const res = await logIncident(tenantId, incidentForm)
    setIsSubmitting(false)
    if(res.success) {
      toast.success('Incident logged')
      setShowModal(false)
      setIncidentForm({ title: '', description: '', serviceName: 'postgres_rls' })
      handleRefresh()
    } else toast.error(res.error)
  }

  const handleResolveIncident = async (id: string) => {
    const res = await resolveIncident(tenantId, id)
    if(res.success) {
      toast.success('Incident resolved')
      handleRefresh()
    } else {
      toast.error(res.error || 'Failed to resolve')
    }
  }

  // Rule Form State
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [ruleForm, setRuleForm] = useState({ name: '', metric: 'error_rate', threshold: '', operator: 'gt', windowSeconds: 300, severity: 'WARNING' })
  
  const handleSaveRule = async () => {
    setIsSubmitting(true)
    const payload = { ...ruleForm, threshold: parseFloat(ruleForm.threshold) }
    const res = editingRuleId 
      ? await updateMonitoringRule(tenantId, editingRuleId, payload)
      : await createMonitoringRule(tenantId, payload)
    setIsSubmitting(false)
    if (res.success) {
      toast.success('Rule saved')
      setShowRuleModal(false)
      handleRefresh()
    } else toast.error(res.error)
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Delete rule?')) return
    const res = await deleteMonitoringRule(tenantId, id)
    if (res.success) {
      toast.success('Rule deleted')
      handleRefresh()
    } else toast.error(res.error)
  }

  const toggleRuleActive = async (id: string, current: boolean) => {
    const res = await updateMonitoringRule(tenantId, id, { isActive: !current })
    if (res.success) {
      setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !current } : r))
      toast.success(!current ? 'Rule activated' : 'Rule paused')
    } else toast.error(res.error)
  }

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">System Monitoring</h2>
          <p className="section-desc">Real-time platform health, performance, and incident logs</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Log Incident
          </button>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 border rounded-full",
            data.systemStatus === 'healthy' ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              data.systemStatus === 'healthy' ? "bg-emerald-500" : "bg-amber-500"
            )} />
            <span className={cn(
              "text-sm font-medium",
              data.systemStatus === 'healthy' ? "text-emerald-700" : "text-amber-700"
            )}>
              {data.systemStatus === 'healthy' ? 'All Systems Operational' : 'Degraded Performance'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Services List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4 flex flex-col justify-center items-center text-center">
              <p className="text-sm font-medium text-slate-500">Active POS Sessions</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{data.liveMetrics?.activeSessions || 0}</p>
            </div>
            <div className="card p-4 flex flex-col justify-center items-center text-center">
              <p className="text-sm font-medium text-slate-500">Pending Orders</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{data.liveMetrics?.activeOrders || 0}</p>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Infrastructure Nodes</h3>
              {isRefreshing && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>
            <div className="space-y-4">
              {data.nodes.map((node: any) => (
                <div key={node.service} className="flex items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 mr-4">
                    {node.service.includes('postgres') && <Database className="w-5 h-5 text-indigo-500" />}
                    {node.service.includes('gateway') && <Globe className="w-5 h-5 text-blue-500" />}
                    {node.service.includes('redis') && <Server className="w-5 h-5 text-red-500" />}
                    {(!node.service.includes('postgres') && !node.service.includes('gateway') && !node.service.includes('redis')) && <Activity className="w-5 h-5 text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900 font-mono text-sm">{node.service}</h4>
                      <span className={cn('badge text-[10px]', node.status === 'up' ? 'badge-success' : 'badge-error')}>{node.status.toUpperCase()}</span>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-slate-500">
                      <span>Uptime: <strong className="text-slate-700">{node.uptime}</strong></span>
                      {'latency' in node && <span>Latency: <strong className="text-slate-700">{node.latency}</strong></span>}
                      {'connections' in node && <span>Connections: <strong className="text-slate-700">{node.connections}</strong></span>}
                    </div>
                  </div>
                  <div className="text-right flex items-center justify-end">
                    <MetricsButton serviceName={node.service} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Alert Rules</h3>
              <button 
                onClick={() => { setEditingRuleId(null); setRuleForm({ name: '', metric: 'error_rate', threshold: '', operator: 'gt', windowSeconds: 300, severity: 'WARNING' }); setShowRuleModal(true) }} 
                className="btn btn-secondary px-2 py-1 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" /> New Rule
              </button>
            </div>
            {rules.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 border border-dashed rounded-lg">No alert rules configured.</p>
            ) : (
              <div className="space-y-3">
                {rules.map((rule: any) => (
                  <div key={rule.id} className="flex items-center p-3 bg-white border rounded-xl hover:border-slate-300">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', rule.isActive ? 'bg-emerald-500' : 'bg-slate-300')} />
                        <h4 className="font-medium text-slate-900 text-sm">{rule.name}</h4>
                        <span className={cn('badge text-[10px]', rule.severity === 'CRITICAL' ? 'badge-error' : 'badge-warning')}>{rule.severity}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        {rule.metric} {rule.operator === 'gt' ? '>' : rule.operator === 'lt' ? '<' : '='} {rule.threshold} 
                        <span className="text-slate-400"> (within {rule.windowSeconds}s)</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleRuleActive(rule.id, rule.isActive)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded" title={rule.isActive ? 'Pause' : 'Activate'}>
                        {rule.isActive ? <Square className="w-4 h-4 fill-slate-400" /> : <Play className="w-4 h-4 fill-emerald-500 text-emerald-500" />}
                      </button>
                      <button onClick={() => { setEditingRuleId(rule.id); setRuleForm({ ...rule, threshold: rule.threshold?.toString() || '' }); setShowRuleModal(true) }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteRule(rule.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Alerts Log */}
        <div className="lg:col-span-1">
          <div className="card p-5 h-full">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Incident Log</h3>
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-100" />
              <div className="space-y-4">
                {incidents.length > 0 ? (
                  incidents.map((incident: any) => (
                    <div key={incident.id} className="relative pl-10">
                      <div className={cn(
                        'absolute left-0 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center z-10',
                        incident.status === 'investigating' ? 'bg-amber-100 text-amber-500' : 'bg-blue-100 text-blue-500'
                      )}>
                        {incident.status === 'investigating' ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{incident.title}</p>
                          <p className="text-[10px] text-slate-500 my-0.5">{incident.description}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{incident.serviceName}</p>
                          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(incident.createdAt).toLocaleString()}</p>
                        </div>
                        {incident.status === 'investigating' && (
                          <button
                            onClick={() => handleResolveIncident(incident.id)}
                            className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50 flex-shrink-0"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="pl-10 relative">
                    <div className="absolute left-0 w-7 h-7 rounded-full border-2 border-white bg-slate-100 text-slate-400 flex items-center justify-center z-10">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">No alerts yet</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Your system is running smoothly with no recent incidents.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-900">Log New Incident</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="form-label">Service Name</label>
                <select value={incidentForm.serviceName} onChange={e => setIncidentForm({...incidentForm, serviceName: e.target.value})} className="form-select">
                  {data.nodes.map((n: any) => <option key={n.service} value={n.service}>{n.service}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Title</label>
                <input type="text" value={incidentForm.title} onChange={e => setIncidentForm({...incidentForm, title: e.target.value})} className="form-input" />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea value={incidentForm.description} onChange={e => setIncidentForm({...incidentForm, description: e.target.value})} className="form-textarea" rows={3} />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleLogIncident} disabled={isSubmitting} className="btn btn-primary">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-900">{editingRuleId ? 'Edit Rule' : 'New Alert Rule'}</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="form-label">Rule Name</label>
                <input type="text" value={ruleForm.name} onChange={e => setRuleForm({...ruleForm, name: e.target.value})} className="form-input" placeholder="e.g. High Error Rate" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Metric</label>
                  <select value={ruleForm.metric} onChange={e => setRuleForm({...ruleForm, metric: e.target.value})} className="form-select">
                    <option value="error_rate">Error Rate (%)</option>
                    <option value="db_latency">DB Latency (ms)</option>
                    <option value="cpu_usage">CPU Usage (%)</option>
                    <option value="failed_payments">Failed Payments</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Condition</label>
                  <div className="flex gap-2">
                    <select value={ruleForm.operator} onChange={e => setRuleForm({...ruleForm, operator: e.target.value})} className="form-select w-20">
                      <option value="gt">&gt;</option>
                      <option value="lt">&lt;</option>
                      <option value="eq">=</option>
                    </select>
                    <input type="number" value={ruleForm.threshold} onChange={e => setRuleForm({...ruleForm, threshold: e.target.value})} className="form-input flex-1" placeholder="Val" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Window (seconds)</label>
                  <input type="number" value={ruleForm.windowSeconds} onChange={e => setRuleForm({...ruleForm, windowSeconds: parseInt(e.target.value) || 0})} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Severity</label>
                  <select value={ruleForm.severity} onChange={e => setRuleForm({...ruleForm, severity: e.target.value})} className="form-select">
                    <option value="WARNING">Warning</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setShowRuleModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSaveRule} disabled={isSubmitting || !ruleForm.name || !ruleForm.threshold} className="btn btn-primary">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
