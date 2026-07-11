'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BarChart3, TrendingUp, Users, Eye, ShoppingCart, DollarSign, Globe, Smartphone, Monitor, Tablet, RefreshCw, Database, Mail, X } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatCurrency, cn } from '@/lib/utils'
import { backfillAnalyticsSummaries, saveAnalyticsSchedule } from '@/lib/actions/analytics'
import toast from 'react-hot-toast'

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4']

export function AnalyticsClient({ initialData, tenantId }: { initialData: any; tenantId?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentDays = searchParams.get('days') || '7'
  const dateRange = currentDays + 'd'
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Email Schedule State
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleConfig, setScheduleConfig] = useState({ frequency: 'weekly', email: '' })
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)

  const deviceData = initialData.deviceBreakdown.map((d: any) => ({
    name: d.device, value: d.sessions, percentage: d.percentage,
  }))

  const handleBackfill = () => {
    if (!tenantId) return
    startTransition(async () => {
      const res = await backfillAnalyticsSummaries(tenantId, 7)
      if (res.success) {
        setBackfillMsg(`Seeded ${res.upserted} summary entries. Charts have been updated.`)
        router.refresh()
      } else {
        setBackfillMsg(`Backfill failed: ${(res as any).error}`)
      }
    })
  }

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
    if (!scheduleConfig.email) {
      toast.error('Email is required')
      return
    }
    setIsSavingSchedule(true)
    const res = await saveAnalyticsSchedule(tenantId || '', scheduleConfig)
    setIsSavingSchedule(false)
    if (res.success) {
      toast.success('Report schedule saved')
      setShowScheduleModal(false)
    } else {
      toast.error(res.error || 'Failed to save schedule')
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
          {tenantId && (
            <button
              onClick={handleBackfill}
              disabled={isPending}
              title="Seed 7 days of test analytics summaries based on real order + pageview data"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5" />
              {isPending ? 'Seeding...' : 'Seed Test'}
            </button>
          )}
          <button onClick={() => setShowScheduleModal(true)} className="btn btn-secondary px-3 py-1.5 text-sm">
            <Mail className="w-4 h-4 mr-1.5 inline" /> Schedule
          </button>
          <button onClick={handleExportCSV} className="btn btn-primary px-3 py-1.5 text-sm">
            Export CSV
          </button>
        </div>
      </div>

      {backfillMsg && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
          {backfillMsg}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Page Views', value: initialData.pageViews.toLocaleString(), icon: Eye, color: 'bg-indigo-600', trend: '+12.7%' },
          { label: 'Unique Visitors', value: initialData.uniqueVisitors.toLocaleString(), icon: Users, color: 'bg-emerald-600', trend: '+8.3%' },
          { label: 'Conversions', value: initialData.conversions, icon: ShoppingCart, color: 'bg-amber-500', trend: '+5.1%' },
          { label: 'Revenue', value: formatCurrency(initialData.revenue), icon: DollarSign, color: 'bg-purple-600', trend: '+18.4%' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">{s.label}</p>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', s.color)}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="stat-value">{s.value}</p>
            <p className="text-xs font-medium text-emerald-600">{s.trend} vs prev period</p>
          </div>
        ))}
      </div>

      {/* Traffic over time */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Traffic & Revenue Trend</h3>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={initialData.dailyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="rvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
            <YAxis yAxisId="pv" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis yAxisId="rv" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
            <Tooltip />
            <Area yAxisId="pv" type="monotone" dataKey="pageViews" name="Page Views" stroke="#4F46E5" strokeWidth={2} fill="url(#pvGrad)" />
            <Area yAxisId="rv" type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" strokeWidth={2} fill="url(#rvGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Orders per day */}
        <div className="lg:col-span-2 card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Orders Per Day</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={initialData.dailyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip />
              <Bar dataKey="orders" name="Orders" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Device breakdown */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Device Breakdown</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={deviceData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                {deviceData.map((_: any, i: number) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
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

      {/* Top Pages */}
      <div className="card p-5">
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
                    style={{ width: `${(page.views / initialData.topPages[0].views) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
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
                <label className="form-label">Recipient Email</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="admin@example.com"
                  value={scheduleConfig.email}
                  onChange={e => setScheduleConfig({ ...scheduleConfig, email: e.target.value })}
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
