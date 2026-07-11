import Link from 'next/link'
import {
  TrendingUp, TrendingDown, Users, ShoppingCart, CreditCard, 
  Package, Activity, AlertTriangle, CheckCircle2, ArrowRight,
  BarChart3, Warehouse, Globe, Clock, Zap, ToggleLeft,
  Building2,
} from 'lucide-react'
import { formatCurrency, formatDate, getStatusBadgeClass, cn } from '@/lib/utils'
import { getMonitoringStatus } from '@/lib/actions/monitoring'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardMetrics } from '@/lib/actions/dashboard'
import { getAnalytics } from '@/lib/actions/analytics'
import { DashboardChart } from './dashboard-chart'

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
        {orders.map((order) => (
          <div key={order.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900">{order.id.slice(-6).toUpperCase()}</p>
              <p className="text-xs text-slate-400 truncate">{order.guestEmail || `User ${order.userId?.slice(0, 8)}...`}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-semibold text-slate-900">{formatCurrency(Number(order.totalAmount))}</p>
              <span className={`badge text-[10px] ${getStatusBadgeClass(order.orderStatus)}`}>
                {order.orderStatus}
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
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Inventory Alerts</h3>
        <span className="badge badge-warning text-[10px]">{items.length} items</span>
      </div>
      <div className="space-y-2.5">
        {items.length === 0 && <div className="text-xs text-slate-500 py-4 text-center">All inventory is healthy.</div>}
        {items.map((item) => (
          <div key={item.id} className={cn(
            'flex items-center gap-3 p-2.5 rounded-lg border',
            item.status === 'critical' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          )}>
            <AlertTriangle className={cn('w-4 h-4 flex-shrink-0', item.status === 'critical' ? 'text-red-500' : 'text-amber-500')} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{item.itemTitle}</p>
              <p className="text-xs text-slate-500">{item.quantityOnHand} remaining</p>
            </div>
            <span className={cn('badge text-[10px]', item.status === 'critical' ? 'badge-error' : 'badge-warning')}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
      <Link
        href="/admin/inventory"
        className="mt-4 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
      >
        Manage inventory <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  )
}

function ModuleStatusCard({ modules }: { modules: any[] }) {
  const enabledModules = modules.filter(m => m.isEnabled).length
  
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Active Modules</h3>
        <span className="text-xs text-slate-400">{enabledModules}/{modules.length} enabled</span>
      </div>
      <div className="space-y-1.5">
        {modules.length === 0 && <div className="text-xs text-slate-500 py-4 text-center">No modules configured.</div>}
        {modules.slice(0, 6).map((mod) => (
          <div key={mod.moduleKey} className="flex items-center justify-between py-1.5">
            <span className="text-xs text-slate-700 capitalize">{mod.moduleKey.replace('_', ' ')}</span>
            <div className={cn(
              'w-6 h-3 rounded-full flex items-center transition-colors duration-200 cursor-pointer',
              mod.isEnabled ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'
            )}>
              <div className="w-2.5 h-2.5 bg-white rounded-full mx-0.5 shadow-sm" />
            </div>
          </div>
        ))}
      </div>
      <Link
        href="/admin/modules"
        className="mt-4 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
      >
        Manage all modules <ArrowRight className="w-3 h-3" />
      </Link>
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

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  const [metricsRes, analyticsRes, monitoringRes] = await Promise.all([
    getDashboardMetrics(tenantId),
    getAnalytics(tenantId),
    getMonitoringStatus(tenantId)
  ])

  const metricsError = !metricsRes.success ? (metricsRes as any).error : null
  const analyticsError = !analyticsRes.success ? (analyticsRes as any).error : null
  
  const m = metricsRes.success && metricsRes.metrics ? metricsRes.metrics : {
    totalOrders: 0, revenue: 0, recentLogs: [], recentOrders: [], criticalItems: [], modules: []
  }

  const a = analyticsRes.success && analyticsRes.analytics ? analyticsRes.analytics : {
    pageViews: 0, conversions: 0, dailyData: []
  }

  const monitoringData = monitoringRes.success && monitoringRes.monitoring ? monitoringRes.monitoring : {
    systemStatus: 'degraded',
    nodes: [],
    alertHistory: []
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(m.revenue)}
          icon={CreditCard}
          color="bg-indigo-600"
          href="/admin/payments"
        />
        <StatCard
          label="Page Views"
          value={a.pageViews.toLocaleString()}
          icon={BarChart3}
          color="bg-blue-600"
          href="/admin/analytics"
        />
        <StatCard
          label="Total Orders"
          value={m.totalOrders}
          icon={ShoppingCart}
          color="bg-emerald-600"
          href="/admin/ecommerce"
        />
        <StatCard
          label="Conversion Rate"
          value={a.pageViews > 0 ? `${((a.conversions || 0) / a.pageViews * 100).toFixed(1)}%` : '0%'}
          icon={Users}
          color="bg-amber-500"
          href="/admin/analytics"
        />
      </div>

      {/* Revenue Chart */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Revenue & Orders — Last 7 Days</h3>
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

      {/* Secondary grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <SystemHealthCard monitoringData={monitoringData} />
        <RecentOrdersCard orders={m.recentOrders} />
        <InventoryAlertsCard items={m.criticalItems} />
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AuditLogCard logs={m.recentLogs} />
        <ModuleStatusCard modules={m.modules} />
      </div>
    </div>
  )
}
