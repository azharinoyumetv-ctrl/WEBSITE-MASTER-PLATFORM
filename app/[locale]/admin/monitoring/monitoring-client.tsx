'use client'

import { useState, useEffect } from 'react'
import { Activity, Server, Database, Globe, AlertTriangle, CheckCircle2, Clock, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMonitoringStatus, getIncidentLogs, logIncident } from '@/lib/actions/monitoring'
import { MetricsButton } from './metrics-button'
import toast from 'react-hot-toast'

export function MonitoringClient({ tenantId, initialData, initialIncidents }: { tenantId: string, initialData: any, initialIncidents: any[] }) {
  const [data, setData] = useState(initialData)
  const [incidents, setIncidents] = useState(initialIncidents)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Incident Modal
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [incidentForm, setIncidentForm] = useState({ title: '', description: '', serviceName: 'postgres_rls' })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const [res, incRes] = await Promise.all([
      getMonitoringStatus(),
      getIncidentLogs(tenantId)
    ])
    if (res.success && res.monitoring) setData(res.monitoring)
    if (incRes.success && incRes.incidents) setIncidents(incRes.incidents)
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
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{incident.title}</p>
                        <p className="text-[10px] text-slate-500 my-0.5">{incident.description}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{incident.serviceName}</p>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(incident.createdAt).toLocaleString()}</p>
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
    </div>
  )
}
