'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  TrendingUp, TrendingDown, Users, ShoppingCart, CreditCard, 
  Package, Activity, AlertTriangle, CheckCircle2, ArrowRight,
  BarChart3, Warehouse, Globe, Clock, Zap, ToggleLeft, Download, Settings
} from 'lucide-react'
import { formatCurrency, formatDate, getStatusBadgeClass, cn } from '@/lib/utils'
import { DashboardChart } from './dashboard-chart'
import { updateDashboardWidgets } from '@/lib/actions/dashboard'
import toast from 'react-hot-toast'

function StatCard({ 
  label, value, trend, trendLabel, icon: Icon, color, href 
}: {
  label: string
  value: string | number
  trend?: number
  trendLabel?: string
  icon: React.ElementType
  color: string
  href?: string
}) {
  const TrendIcon = trend && trend >= 0 ? TrendingUp : TrendingDown

  const content = (
    <div className={cn('stat-card group', href && 'cursor-pointer hover:shadow-md transition-all duration-200')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value mt-1">{value}</p>
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={cn('flex items-center gap-1.5 text-xs font-medium', trend >= 0 ? 'text-emerald-600' : 'text-red-500')}>
          <TrendIcon className="w-3.5 h-3.5" />
          <span>{Math.abs(trend)}% {trendLabel || 'vs last month'}</span>
        </div>
      )}
      {href && (
        <div className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-indigo-600 transition-colors">
          <span>View details</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </div>
      )}
    </div>
  )

  if (href) return <Link href={href}>{content}</Link>
  return content
}

function SystemHealthCard({ monitoringData }: { monitoringData: any }) {
  return (
    <div className="card h-full flex flex-col">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-500" />
          System Health
        </h3>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
          monitoringData.systemStatus === 'healthy' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {monitoringData.systemStatus}
        </span>
      </div>
      
      <div className="p-5 flex-1 flex flex-col justify-center">
        <div className="space-y-4">
          {monitoringData.nodes.map((node: any) => (
            <div key={node.service} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${node.status === 'up' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium text-slate-700 capitalize">{node.service.replace('_', ' ')}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-900">{node.latency}</p>
                <p className="text-[10px] text-slate-400">Up: {node.uptime}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RecentOrdersCard({ orders }: { orders: any[] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Recent Orders</h3>
        <Link href="/admin/ecommerce" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors flex items-center gap-1">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-3">
        {orders.length === 0 && <div className="text-xs text-slate-500 py-4 text-center">No recent orders.</div>}
        {orders.slice(0, 5).map((order) => (
          <div key={order.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Order #{order.id.slice(-6).toUpperCase()}</p>
                <p className="text-[10px] text-slate-400">{formatDate(order.createdAt, 'short')}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-900">{formatCurrency(order.totalAmount)}</p>
              <span className={`badge mt-0.5 text-[9px] ${getStatusBadgeClass(order.paymentStatus)}`}>
                {order.paymentStatus}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InventoryAlertsCard({ items }: { items: any[] }) {
  return (
    <div className="card h-full flex flex-col">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-amber-500" />
          Inventory Alerts
        </h3>
        {items.length > 0 && (
          <span className="badge badge-error text-[10px]">{items.length} Critical</span>
        )}
      </div>
      <div className="p-5 flex-1">
        <div className="space-y-3">
          {items.length === 0 && <div className="text-xs text-slate-500 py-4 text-center">Inventory levels healthy.</div>}
          {items.slice(0, 5).map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-xs font-semibold text-slate-900 truncate">{item.catalogItem?.title}</p>
                <p className="text-[10px] text-slate-400">{item.location?.locationName}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-red-600">{item.quantityOnHand} left</p>
                <p className="text-[9px] text-slate-400">Min: {item.lowStockThreshold}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ModuleStatusCard({ modules }: { modules: any[] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Module Capabilities</h3>
        <Link href="/admin/modules" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors flex items-center gap-1">
          Manage <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {modules.map((mod) => (
          <div key={mod.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
            <ToggleLeft className={cn("w-4 h-4", mod.isEnabled ? "text-emerald-500" : "text-slate-300")} />
            <span className="text-xs font-medium text-slate-700 capitalize">{mod.moduleType.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AuditLogCard({ logs }: { logs: any[] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
        <Link href="/admin/settings" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors flex items-center gap-1">
          View logs <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-3">
        {logs.length === 0 && <div className="text-xs text-slate-500 py-4 text-center">No recent activity.</div>}
        {logs.slice(0, 5).map((log) => (
          <div key={log.id} className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-indigo-700 text-[10px] font-bold">
                {log.userName?.split(' ').map((n: string) => n[0]).join('') || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-700">
                <span className="font-semibold">{log.userName || 'System'}</span>{' '}
                <span className="text-slate-400">{log.actionPerformed.replace(/_/g, ' ')}</span>{' '}
                <span className="font-medium text-slate-600 truncate">{log.targetResource}</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {formatDate(log.createdAt, 'relative')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardClient({
  m,
  a,
  monitoringData,
  metricsError,
  analyticsError,
  initialWidgets,
  tenantId,
  userId
}: {
  m: any,
  a: any,
  monitoringData: any,
  metricsError: any,
  analyticsError: any,
  initialWidgets?: Record<string, boolean> | null,
  tenantId: string,
  userId: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const days = searchParams.get('days') || '7'
  
  // Custom Widgets State
  const [showWidgetSettings, setShowWidgetSettings] = useState(false)
  
  const defaultWidgets = {
    kpi: true,
    revenueChart: true,
    systemHealth: true,
    recentOrders: true,
    inventoryAlerts: true,
    auditLog: true,
    moduleStatus: true
  }

  const [activeWidgets, setActiveWidgets] = useState<Record<string, boolean>>(
    initialWidgets || defaultWidgets
  )

  const handleExport = () => {
    let csv = "Metric,Value\n"
    csv += `Total Revenue,${m.revenue}\n`
    csv += `Total Orders,${m.totalOrders}\n`
    csv += `Page Views,${a.pageViews}\n`
    csv += `Conversions,${a.conversions}\n`
    
    csv += "\nDaily Data\nDate,Revenue,Orders,Page Views\n"
    a.dailyData.forEach((d: any) => {
      csv += `${d.date},${d.revenue},${d.orders},${d.pageViews}\n`
    })
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dashboard-export-${days}d.csv`
    link.click()
  }

  const toggleWidget = async (key: string) => {
    const newWidgets = {
      ...activeWidgets,
      [key]: !activeWidgets[key]
    }
    setActiveWidgets(newWidgets)
    
    // Persist immediately in the background
    const res = await updateDashboardWidgets(tenantId, userId, newWidgets)
    if (!res.success) {
      toast.error('Failed to save widget preferences')
    }
  }

  return (
    <div className="page-container animate-slide-up">
      {/* Welcome banner */}
      <div className="mb-6 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-20" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">Welcome to Dashboard 👋</h2>
              <p className="text-indigo-200 text-sm mt-1">
                Here's what's happening with your platform today.
              </p>
            </div>
            <div className="flex gap-2">
              <select 
                value={days}
                onChange={(e) => router.push(`?days=${e.target.value}`)}
                className="bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-white/50 [&>option]:text-slate-900"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
              <button onClick={handleExport} className="bg-white/10 hover:bg-white/20 border border-white/20 transition-colors text-white text-sm rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                <Download className="w-4 h-4" /> Export
              </button>
              <button onClick={() => setShowWidgetSettings(!showWidgetSettings)} className="bg-white/10 hover:bg-white/20 border border-white/20 transition-colors text-white text-sm rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                <Settings className="w-4 h-4" /> Widgets
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm text-indigo-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Platform Active</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-indigo-200">
              <Activity className="w-4 h-4 text-emerald-300" />
              <span>All systems operational</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-indigo-200">
              <Zap className="w-4 h-4 text-yellow-300" />
              <span>{m.modules.filter((mod: any) => mod.isEnabled).length} modules active</span>
            </div>
          </div>
        </div>
      </div>

      {showWidgetSettings && (
        <div className="mb-6 card p-4 animate-scale-in">
          <h3 className="text-sm font-semibold mb-3">Customize Widgets</h3>
          <div className="flex flex-wrap gap-3">
            {Object.keys(activeWidgets).map(key => (
              <label key={key} className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-100 rounded px-3 py-1.5 hover:bg-slate-100 transition-colors">
                <input type="checkbox" checked={activeWidgets[key]} onChange={() => toggleWidget(key)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                <span className="text-xs font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Error banners for failed server actions */}
      {metricsError && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Error loading dashboard metrics</p>
            <p className="text-xs text-red-500 mt-0.5 font-mono">{metricsError}</p>
            <p className="text-xs text-red-600 mt-1">The figures below may be incomplete. Check server logs and ensure the production build is up to date.</p>
          </div>
        </div>
      )}
      {analyticsError && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700">Error loading analytics data</p>
            <p className="text-xs text-amber-500 mt-0.5 font-mono">{analyticsError}</p>
          </div>
        </div>
      )}

      {/* KPI Stats */}
      {activeWidgets.kpi && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Revenue" value={formatCurrency(m.revenue)} icon={CreditCard} color="bg-indigo-600" href="/admin/payments" />
          <StatCard label="Page Views" value={a.pageViews.toLocaleString()} icon={BarChart3} color="bg-blue-600" href="/admin/analytics" />
          <StatCard label="Total Orders" value={m.totalOrders} icon={ShoppingCart} color="bg-emerald-600" href="/admin/ecommerce" />
          <StatCard label="Conversion Rate" value={a.pageViews > 0 ? `${((a.conversions || 0) / a.pageViews * 100).toFixed(1)}%` : '0%'} icon={Users} color="bg-amber-500" href="/admin/analytics" />
        </div>
      )}

      {/* Revenue Chart */}
      {activeWidgets.revenueChart && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Revenue & Orders — Last {days} Days</h3>
              <p className="text-xs text-slate-400 mt-0.5">Daily revenue performance</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span className="text-slate-500">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-500">Orders</span>
              </div>
            </div>
          </div>
          {a.dailyData.length > 0 ? (
            <DashboardChart data={a.dailyData} />
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              Not enough data to display chart.
            </div>
          )}
        </div>
      )}

      {/* Secondary grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {activeWidgets.systemHealth && <SystemHealthCard monitoringData={monitoringData} />}
        {activeWidgets.recentOrders && <RecentOrdersCard orders={m.recentOrders} />}
        {activeWidgets.inventoryAlerts && <InventoryAlertsCard items={m.criticalItems} />}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeWidgets.auditLog && <AuditLogCard logs={m.recentLogs} />}
        {activeWidgets.moduleStatus && <ModuleStatusCard modules={m.modules} />}
      </div>
    </div>
  )
}
