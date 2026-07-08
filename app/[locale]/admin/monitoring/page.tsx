import { Activity, Server, Database, Globe, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMonitoringStatus } from '@/lib/actions/monitoring'

export default async function MonitoringPage() {
  const res = await getMonitoringStatus()
  
  if (!res.success || !res.monitoring) {
    return <div className="p-8 text-red-500">Failed to load monitoring data.</div>
  }

  const data = res.monitoring

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">System Monitoring</h2>
          <p className="section-desc">Real-time platform health, performance, and incident logs</p>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Services List */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Infrastructure Nodes</h3>
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
                      {'hitRate' in node && <span>Hit Rate: <strong className="text-slate-700">{node.hitRate as string}</strong></span>}
                      {'connections' in node && <span>Connections: <strong className="text-slate-700">{node.connections}</strong></span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <button className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Metrics &rarr;</button>
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
                {data.alertHistory.length > 0 ? (
                  data.alertHistory.map((alert: any) => (
                    <div key={alert.id} className="relative pl-10">
                      <div className={cn(
                        'absolute left-0 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center z-10',
                        alert.severity === 'WARNING' ? 'bg-amber-100 text-amber-500' : 'bg-blue-100 text-blue-500'
                      )}>
                        {alert.severity === 'WARNING' ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{alert.message}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{alert.service}</p>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(alert.timestamp).toLocaleString()}</p>
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
    </div>
  )
}
