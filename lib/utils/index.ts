import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

// Format date
export function formatDate(date: string | Date, format: 'short' | 'long' | 'relative' = 'short'): string {
  const d = new Date(date)
  if (format === 'relative') {
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
  }
  if (format === 'long') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Generate random UUID (client-side)
export function generateId(): string {
  return crypto.randomUUID()
}

// Truncate text
export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.slice(0, length)}...` : str
}

// Get initials
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Capitalize first letter
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Format order status to badge class
export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    active: 'badge-success',
    enabled: 'badge-success',
    completed: 'badge-success',
    confirmed: 'badge-success',
    succeeded: 'badge-success',
    paid: 'badge-success',
    online: 'badge-success',
    published: 'badge-success',
    pending: 'badge-warning',
    pending_payment: 'badge-warning',
    pending_requirements: 'badge-warning',
    awaiting_payment: 'badge-warning',
    quoted: 'badge-info',
    processing: 'badge-info',
    shipped: 'badge-info',
    initiated: 'badge-info',
    open: 'badge-info',
    suspended: 'badge-error',
    cancelled: 'badge-error',
    failed: 'badge-error',
    offline: 'badge-neutral',
    maintenance: 'badge-neutral',
    inactive: 'badge-neutral',
    disabled: 'badge-neutral',
    pending_verification: 'badge-warning',
    reassigned: 'badge-purple',
  }
  return map[status.toLowerCase()] || 'badge-neutral'
}

// Format bytes
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Generate random color based on string
export function stringToColor(str: string): string {
  const colors = [
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', 
    '#EC4899', '#06B6D4', '#EF4444', '#6366F1'
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Module key to display name
export function moduleKeyToName(key: string): string {
  const map: Record<string, string> = {
    website_module: 'Website',
    admin_module: 'Admin Panel',
    user_management: 'User Management',
    rbac_module: 'Access Control',
    catalog_module: 'Catalog',
    ecommerce_module: 'E-commerce',
    payment_module: 'Payments',
    pos_module: 'Point of Sale',
    inventory_module: 'Inventory',
    crm_module: 'CRM',
    booking_module: 'Booking',
    ai_module: 'AI Assistant',
    notification_module: 'Notifications',
    analytics_module: 'Analytics',
    api_module: 'API Portal',
  }
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Debounce
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeout: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }) as T
}

// Clamp number
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// Check if valid UUID
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Sanitize HTML (basic XSS prevention)
export function sanitizeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Parse theme config and generate CSS variables
export function generateThemeCssVars(themeConfig: Record<string, unknown>): Record<string, string> {
  const colors = (themeConfig?.colors as Record<string, string>) || {}
  const typography = (themeConfig?.typography as Record<string, string>) || {}
  
  const vars: Record<string, string> = {}
  if (colors.primary) vars['--tenant-color-primary'] = colors.primary
  if (colors.secondary) vars['--tenant-color-secondary'] = colors.secondary
  if (colors.background) vars['--tenant-color-bg'] = colors.background
  if (colors.text) vars['--tenant-color-text'] = colors.text
  if (typography.base_font) vars['--tenant-font-family'] = typography.base_font
  if (typography.headings) vars['--tenant-font-headings'] = typography.headings
  
  return vars
}

// Rate calculation
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}
