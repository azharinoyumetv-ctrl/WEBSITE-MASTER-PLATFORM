'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Globe, Users, Shield, Package, ShoppingCart,
  CreditCard, Monitor, Warehouse, Users2, CalendarCheck, Sparkles,
  Bell, BarChart3, Code2, Settings, ChevronLeft, ChevronRight,
  LogOut, Building2, Menu, X, AlertCircle, ToggleLeft,
  Activity, FileText, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getUnreadAlertCount, getMonitoringStatus } from '@/lib/actions/monitoring'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { signOut } from 'next-auth/react'

type NavItem = {
  href: string
  icon: React.ElementType
  label: string
  requiredModule?: string
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    label: 'Core',
    items: [
      { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/admin/tenants', icon: Building2, label: 'Tenants', requiredModule: 'admin_module' },
      { href: '/admin/modules', icon: ToggleLeft, label: 'Modules', requiredModule: 'admin_module' },
    ],
  },
  {
    label: 'Identity',
    items: [
      { href: '/admin/users', icon: Users, label: 'Users', requiredModule: 'user_management' },
      { href: '/admin/rbac', icon: Shield, label: 'Access Control', requiredModule: 'rbac_module' },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { href: '/admin/catalog', icon: Package, label: 'Catalog', requiredModule: 'catalog_module' },
      { href: '/admin/ecommerce', icon: ShoppingCart, label: 'E-commerce', requiredModule: 'ecommerce_module' },
      { href: '/admin/payments', icon: CreditCard, label: 'Payments', requiredModule: 'payment_module' },
      { href: '/admin/pos', icon: Monitor, label: 'POS Terminal', requiredModule: 'pos_module' },
      { href: '/admin/pos/shifts', icon: CalendarCheck, label: 'Shift Scheduler', requiredModule: 'pos_module' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/inventory', icon: Warehouse, label: 'Inventory', requiredModule: 'inventory_module' },
      { href: '/admin/crm', icon: Users2, label: 'CRM', requiredModule: 'crm_module' },
      { href: '/admin/booking', icon: CalendarCheck, label: 'Booking', requiredModule: 'booking_module' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/admin/ai', icon: Sparkles, label: 'AI Assistant', requiredModule: 'ai_module' },
      { href: '/admin/notifications', icon: Bell, label: 'Notifications', requiredModule: 'notification_module' },
      { href: '/admin/analytics', icon: BarChart3, label: 'Analytics', requiredModule: 'analytics_module' },
    ],
  },
  {
    label: 'Developer',
    items: [
      { href: '/admin/api-portal', icon: Code2, label: 'API Portal', requiredModule: 'api_module' },
      { href: '/admin/monitoring', icon: Activity, label: 'Monitoring' },
      { href: '/admin/feature-flags', icon: Zap, label: 'Feature Flags' },
    ],
  },
  {
    label: 'Config',
    items: [
      { href: '/admin/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
  navGroups: NavGroup[]
  user?: { name: string, role: string }
}

function Sidebar({ collapsed, onToggle, navGroups, user }: SidebarProps) {
  const pathname = usePathname()
  const t = useTranslations('AdminSidebar')

  return (
    <aside
      className={cn(
        'h-screen flex flex-col bg-slate-900 border-r border-white/5 transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 border-b border-white/10 px-4', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center flex-shrink-0">
          <Globe className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h2 className="text-white font-bold text-lg leading-tight truncate">Website Master</h2>
            <p className="text-slate-400 text-[10px] uppercase tracking-wider mt-0.5 truncate"><span className="text-indigo-400 font-semibold">Platform</span> / DagangOS</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-2">
            {!collapsed && (
              <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest px-3 py-1 mb-1">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              // Extract a translation key from the label (e.g. "Access Control" -> "access_control")
              const tKey = item.label.toLowerCase().replace(/ /g, '_').replace('-', '') as any
              // Fallback to item.label if translation is missing (though we've added them all)
              let translatedLabel = item.label
              try { translatedLabel = t(tKey) } catch(e) {}
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? translatedLabel : undefined}
                  className={cn(
                    'flex items-center rounded-lg transition-all duration-150 mb-0.5',
                    collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/8'
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span className="text-sm font-medium truncate">{translatedLabel}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-2 flex items-center justify-between">
        <Link
          href="/admin/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/8 transition-all duration-150 flex-1',
            collapsed ? 'justify-center px-2' : ''
          )}
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{user?.name ? user.name.substring(0, 2).toUpperCase() : 'AD'}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name || 'Admin User'}</p>
              <p className="text-slate-400 text-xs truncate">{t('tenant_admin')}</p>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button 
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="p-2 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="border-t border-white/10 p-2">
        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={cn(
            'mt-1 w-full flex items-center justify-center rounded-lg py-2 text-slate-500 hover:text-white hover:bg-white/8 transition-all duration-150'
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  )
}

export function TopBar({ onMobileMenuToggle, tenant }: { onMobileMenuToggle: () => void, tenant?: any }) {
  const pathname = usePathname()
  const t = useTranslations('AdminSidebar')
  const [unreadCount, setUnreadCount] = useState(0)
  const [sysStatus, setSysStatus] = useState('operational')
  const [recentAlerts, setRecentAlerts] = useState<any[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  
  useEffect(() => {
    if (!tenant?.id) return

    const refreshData = () => {
      getUnreadAlertCount(tenant.id).then(res => {
        if (res?.count !== undefined) {
          setUnreadCount(res.count)
          setSysStatus(res.count > 0 ? 'issues' : 'operational')
        }
      })
      getMonitoringStatus(tenant.id).then((res: any) => {
        if (res?.monitoring?.alertHistory) {
          setRecentAlerts(res.monitoring.alertHistory)
        }
      })
    }

    refreshData()
    const int = setInterval(refreshData, 15000)
    return () => clearInterval(int)
  }, [tenant])

  const getPageTitle = () => {
    if (pathname.includes('/dashboard')) return t('dashboard')
    if (pathname.includes('/tenants')) return t('tenants')
    if (pathname.includes('/modules')) return t('modules')
    if (pathname.includes('/users')) return t('users')
    if (pathname.includes('/rbac')) return t('access_control')
    if (pathname.includes('/catalog')) return t('catalog')
    if (pathname.includes('/ecommerce')) return t('ecommerce')
    if (pathname.includes('/payments')) return t('payments')
    if (pathname.includes('/pos/shifts')) return t('shift_scheduler')
    if (pathname.includes('/pos')) return t('pos_terminal')
    if (pathname.includes('/inventory')) return t('inventory')
    if (pathname.includes('/crm')) return t('crm')
    if (pathname.includes('/booking')) return t('booking')
    if (pathname.includes('/ai')) return t('ai_assistant')
    if (pathname.includes('/notifications')) return t('notifications')
    if (pathname.includes('/analytics')) return t('analytics')
    if (pathname.includes('/api-portal')) return t('api_portal')
    if (pathname.includes('/monitoring')) return 'System Monitoring'
    if (pathname.includes('/settings')) return t('settings')
    return 'Admin Console'
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-slate-900">{getPageTitle()}</h1>
          <p className="text-xs text-slate-400 hidden sm:block">{tenant?.companyName || 'DagangOS'} · {tenant?.plan || 'enterprise'} plan</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <LanguageSwitcher />

        {/* Status indicator */}
        <div className={cn(
          "hidden sm:flex items-center gap-2 px-3 py-1.5 border rounded-full",
          sysStatus === 'operational' ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
        )}>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full animate-pulse",
            sysStatus === 'operational' ? "bg-emerald-500" : "bg-amber-500"
          )} />
          <span className={cn(
            "text-xs font-medium",
            sysStatus === 'operational' ? "text-emerald-700" : "text-amber-700"
          )}>
            {sysStatus === 'operational' ? 'All Systems Operational' : 'Active Incidents'}
          </span>
        </div>

        {/* Alert bell */}
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden">
                <div className="p-3 border-b border-slate-100 font-medium text-sm">Recent Notifications</div>
                <div className="max-h-64 overflow-y-auto">
                  {recentAlerts.length > 0 ? (
                    recentAlerts.map(alert => (
                      <div key={alert.id} className="p-3 border-b border-slate-50 hover:bg-slate-50 text-sm">
                        <div className="font-medium text-slate-900">{alert.message}</div>
                        <div className="text-xs text-slate-500 mt-1">{alert.time}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-slate-500">No recent notifications</div>
                  )}
                </div>
                <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
                  <Link href="/admin/notifications" className="text-xs font-medium text-indigo-600 hover:text-indigo-700" onClick={() => setIsDropdownOpen(false)}>
                    View all notifications
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Public site link */}
        <Link
          href="/site"
          target="_blank"
          className="hidden sm:flex items-center gap-2 btn btn-secondary btn-sm"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>View Site</span>
        </Link>
      </div>
    </header>
  )
}

export default function AdminLayoutClient({ children, enabledModules, user, tenant }: { children: React.ReactNode, enabledModules: string[], user?: { name: string, role: string }, tenant?: any }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Keyboard navigation shortcuts event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return
      }

      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'd':
            router.push('/admin/dashboard')
            break
          case 's':
            router.push('/admin/settings')
            break
          case 'p':
            router.push('/admin/pos')
            break
          case 'i':
            router.push('/admin/inventory')
            break
          case 'b':
            router.push('/admin/booking')
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  // Filter navigation groups based on enabled modules
  const filteredNavGroups = NAVIGATION_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => !item.requiredModule || enabledModules.includes(item.requiredModule))
  })).filter(group => group.items.length > 0)

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} navGroups={filteredNavGroups} user={user} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative flex-shrink-0">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} navGroups={filteredNavGroups} user={user} />
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 rounded text-white/60 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMobileMenuToggle={() => setMobileOpen(!mobileOpen)} tenant={tenant} />
        <main className="flex-1 overflow-y-auto">
          {!mounted ? (
            <div className="p-6 space-y-6 animate-pulse">
              <div className="h-8 bg-slate-200 rounded w-1/4" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="h-32 bg-slate-200 rounded-xl" />
                <div className="h-32 bg-slate-200 rounded-xl" />
                <div className="h-32 bg-slate-200 rounded-xl" />
              </div>
              <div className="h-64 bg-slate-200 rounded-xl" />
            </div>
          ) : (
            <div className="animate-fade-in">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
