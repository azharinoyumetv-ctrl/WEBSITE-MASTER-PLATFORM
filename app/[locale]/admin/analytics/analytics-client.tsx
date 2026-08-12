'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BarChart3, TrendingUp, Users, Eye, ShoppingCart, DollarSign, Globe, Smartphone, Monitor, Tablet, RefreshCw, Mail, X, Trash2, Play, Download, Clock, FileText } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { createReportSchedule, updateReportSchedule, deleteReportSchedule, triggerGenerateReport } from '@/lib/actions/analytics'
import toast from 'react-hot-toast'

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4']

export function AnalyticsClient({ initialData, initialSchedules = [], initialReports = [], tenantId }: { initialData: any; initialSchedules?: any[]; initialReports?: any[]; tenantId?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentDays = searchParams.get('days') || '7'
  const dateRange = currentDays + 'd'

  const [schedules, setSchedules] = useState<any[]>(initialSchedules)
  const [reports, setReports] = useState<any[]>(initialReports)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleConfig, setScheduleConfig] = useState({ reportName: 'Standard Analytics Summary', frequency: 'weekly', recipient: '', format: 'csv' })
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)
  const [isProcessingSchedule, setIsProcessingSchedule] = useState<Record<string, boolean>>({})

  const deviceData = initialData.deviceBreakdown.map((d: any) => ({
    name: d.device, value: d.sessions, percentage: d.percentage,
  }))

  const handleExportCSV = () => {
    if (!initialData.dailyData || initialData.dailyData.length === 0) {
      toast.error('No data to export')
      return
    }
    const headers = ['Date', 'Page Views', 'Unique Visitors', 'Orders', 'Revenue', 'Bounce Rate']
    let csvContent = headers.join(',') + '\n'
    
    initialData.dailyData.forEach((d: any) => {
      csvContent += `${d.date},${d.pageViews},${d.uniqueVisitors || 0},${d.orders},${d.revenue},${d.bounceRate}\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `analytics-export-${dateRange}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSaveSchedule = async () => {
    if (!scheduleConfig.reportName) {
      return toast.error('Report name is required')
    }
    if (!scheduleConfig.recipient) {
      return toast.error('Recipient email is required')
    }
    setIsSavingSchedule(true)
    const res = await createReportSchedule(tenantId || '', scheduleConfig)
    setIsSavingSchedule(false)
    if (res.success && res.schedule) {
      toast.success('Report schedule configured & initial report generated')
      setSchedules([res.schedule, ...schedules])
      setShowScheduleModal(false)
      router.refresh()
    } else {
      toast.error(res.error || 'Failed to save schedule')
    }
  }

  const handleToggleSchedule = async (s: any) => {
    setIsProcessingSchedule(prev => ({ ...prev, [s.id]: true }))
    const res = await updateReportSchedule(tenantId || '', s.id, { isActive: !s.isActive })
    setIsProcessingSchedule(prev => ({ ...prev, [s.id]: false }))
    if (res.success && res.schedule) {
      toast.success(`Schedule status updated`)
      setSchedules(prev => prev.map(item => item.id === s.id ? res.schedule : item))
    } else {
      toast.error(res.error || 'Failed to update schedule')
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report schedule?')) return
    setIsProcessingSchedule(prev => ({ ...prev, [id]: true }))
    const res = await deleteReportSchedule(tenantId || '', id)
    setIsProcessingSchedule(prev => ({ ...prev, [id]: false }))
    if (res.success) {
      toast.success('Schedule deleted')
      setSchedules(prev => prev.filter(item => item.id !== id))
    } else {
      toast.error(res.error || 'Failed to delete schedule')
    }
  }

  const handleRunScheduleNow = async (id: string) => {
    setIsProcessingSchedule(prev => ({ ...prev, [id]: true }))
    const res = await triggerGenerateReport(tenantId || '', id)
    setIsProcessingSchedule(prev => ({ ...prev, [id]: false }))
    if (res.success && res.report) {
      toast.success('Report generated successfully!')
      setReports([res.report, ...reports])
    } else {
      toast.error(res.error || 'Failed to trigger report generation')
    }
  }

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">Analytics</h2>
          <p className="section-desc">Traffic, conversions, and revenue insights</p>
        </div>
        <div className="flex items-center gap-2">
          {['7d', '30d', '90d'].map(r => (
            <button
              key={r}
              onClick={() => router.push(`?days=${r.replace('d', '')}`)}
              className={cn('px-3 py-1.5 text-sm rounded-lg transition-colors', dateRange === r ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}
            >
              {r}
            </button>
          ))}
          <button onClick={() => setShowScheduleModal(true)} className="btn btn-secondary px-3 py-1.5 text-sm">
            <Mail className="w-4 h-4 mr-1.5 inline" /> Report Schedules
          </button>
          <button onClick={handleExportCSV} className="btn btn-primary px-3 py-1.5 text-sm">
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Page Views', value: initialData.pageViews.toLocaleString(), icon: Eye, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Unique Visitors', value: initialData.uniqueVisitors.toLocaleString(), icon: Users, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Conversions', value: initialData.conversions.toLocaleString(), icon: ShoppingCart, color: 'text-amber-600 bg-amber-50' },
          { label: 'Revenue', value: formatCurrency(initialData.revenue), icon: DollarSign, color: 'text-rose-600 bg-rose-50' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{s.label}</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{s.value}</h3>
            </div>
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', s.color)}>
              <s.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Traffic & Engagement</h3>
            <span className="text-xs text-indigo-600 font-semibold">{dateRange} view</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={initialData.dailyData}>
                <defs>
                  <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="pageViews" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#colorPv)" name="Page Views" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5 flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Device breakdown</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={deviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                  {deviceData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-3">
            {initialData.deviceBreakdown.map((d: any, i: number) => {
              const Icon = d.device === 'Mobile' ? Smartphone : d.device === 'Tablet' ? Tablet : Monitor
              return (
                <div key={d.device} className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i] }} />
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-700 flex-1">{d.device}</span>
                  <span className="text-xs font-semibold text-slate-700">{d.percentage}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card p-5 lg:col-span-1">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Top Pages</h3>
          <div className="space-y-3">
            {initialData.topPages.map((page: any, i: number) => (
              <div key={page.page} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 font-mono truncate">{page.page}</span>
                    <span className="text-xs font-semibold text-slate-700 ml-2 flex-shrink-0">{page.views.toLocaleString()} views</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${(page.views / Math.max(1, initialData.topPages[0]?.views || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Report Schedules</h3>
          <div className="overflow-x-auto">
            <table className="data-table w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 font-semibold uppercase">
                  <th className="py-2">Report Name</th>
                  <th className="py-2">Frequency</th>
                  <th className="py-2">Format</th>
                  <th className="py-2">Recipient</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {schedules.map(s => (
                  <tr key={s.id}>
                    <td className="py-3.5 font-medium text-slate-900">{s.reportName}</td>
                    <td className="py-3.5 capitalize">{s.frequency}</td>
                    <td className="py-3.5 uppercase text-xs font-mono">{s.format}</td>
                    <td className="py-3.5 text-slate-500 font-mono text-xs">{s.recipient}</td>
                    <td className="py-3.5">
                      <button 
                        onClick={() => handleToggleSchedule(s)}
                        disabled={isProcessingSchedule[s.id]}
                        className={cn("badge text-[10px]", s.isActive ? "badge-success" : "badge-neutral")}
                      >
                        {s.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleRunScheduleNow(s.id)}
                          disabled={isProcessingSchedule[s.id]}
                          title="Generate report snapshot now"
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteSchedule(s.id)}
                          disabled={isProcessingSchedule[s.id]}
                          title="Delete schedule"
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {schedules.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400 text-xs">No active report schedules configured.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Generated Report History Log</h3>
        <div className="overflow-x-auto">
          <table className="data-table w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 font-semibold uppercase">
                <th className="py-2">Report Document</th>
                <th className="py-2">Generated Timestamp</th>
                <th className="py-2 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {reports.map(r => (
                <tr key={r.id}>
                  <td className="py-3.5 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span className="font-semibold text-slate-800">{r.reportName}</span>
                  </td>
                  <td className="py-3.5 text-slate-500 flex items-center gap-1.5 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(r.createdAt, 'long')}
                  </td>
                  <td className="py-3.5 text-right">
                    <a 
                      href={r.fileUrl} 
                      download={r.reportName.replace(/\s+/g, '_') + (r.fileUrl.includes('csv') ? '.csv' : '.json')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Get File
                    </a>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-6 text-slate-400 text-xs">No reports generated yet. Add a schedule to generate initial reports.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Schedule Email Report</h3>
              <button onClick={() => setShowScheduleModal(false)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="form-label">Report Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Weekly Executive Summary"
                  value={scheduleConfig.reportName}
                  onChange={e => setScheduleConfig({ ...scheduleConfig, reportName: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Recipient Email</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="admin@example.com"
                  value={scheduleConfig.recipient}
                  onChange={e => setScheduleConfig({ ...scheduleConfig, recipient: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Frequency</label>
                <select 
                  className="form-input"
                  value={scheduleConfig.frequency}
                  onChange={e => setScheduleConfig({ ...scheduleConfig, frequency: e.target.value })}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="form-label">Report Format</label>
                <select 
                  className="form-input"
                  value={scheduleConfig.format}
                  onChange={e => setScheduleConfig({ ...scheduleConfig, format: e.target.value })}
                >
                  <option value="csv">CSV Spreadsheet</option>
                  <option value="json">JSON Metadata</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setShowScheduleModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSaveSchedule} disabled={isSavingSchedule} className="btn btn-primary">
                {isSavingSchedule ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
