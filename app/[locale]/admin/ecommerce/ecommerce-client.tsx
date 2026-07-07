'use client'

import { useState } from 'react'
import { ShoppingCart, Search, Filter, Package, Eye, TrendingUp, DollarSign, AlertCircle, CheckCircle2, Clock, XCircle, Truck, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate, getStatusBadgeClass, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { updateOrderStatus } from '@/lib/actions/ecommerce'
import { OrderStatus } from '@prisma/client'

const STATUS_ACTIONS: Record<string, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['processing'],
  processing: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: [],
}

export function EcommerceClient({ initialOrders, tenantId }: { initialOrders: any[], tenantId: string }) {
  const [orders, setOrders] = useState(initialOrders)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const filtered = orders.filter(o => {
    const matchSearch = o.id.includes(search.toLowerCase()) || (o.guestEmail?.includes(search) ?? false)
    const matchStatus = filterStatus === 'all' || o.orderStatus === filterStatus
    return matchSearch && matchStatus
  })

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.orderStatus === 'pending').length,
    completed: orders.filter(o => o.orderStatus === 'completed').length,
    revenue: orders.filter(o => !['cancelled'].includes(o.orderStatus)).reduce((sum, o) => sum + Number(o.totalAmount), 0),
  }

  const advanceStatus = async (orderId: string, newStatus: OrderStatus) => {
    setIsUpdating(true)
    const res = await updateOrderStatus(tenantId, orderId, newStatus)
    setIsUpdating(false)

    if (res.success) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, orderStatus: newStatus } : o))
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev: any) => prev ? { ...prev, orderStatus: newStatus } : prev)
      }
      toast.success(`Order status updated to ${newStatus}`)
    } else {
      toast.error(res.error || 'Failed to update order status')
    }
  }

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">E-commerce Orders</h2>
          <p className="section-desc">Manage customer orders and fulfillment pipeline</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Orders', value: stats.total, icon: ShoppingCart, color: 'bg-indigo-600' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-amber-500' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'bg-emerald-600' },
          { label: 'Total Revenue', value: formatCurrency(stats.revenue), icon: DollarSign, color: 'bg-blue-600' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">{s.label}</p>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', s.color)}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="stat-value">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Order list */}
        <div className={cn(selectedOrder ? 'lg:col-span-3' : 'lg:col-span-5')}>
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="form-input pl-9" id="order-search" />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="form-select w-36" id="order-status-filter">
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr
                    key={order.id}
                    className={cn('cursor-pointer', selectedOrder?.id === order.id ? 'bg-indigo-50' : '')}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td><span className="font-mono text-xs font-semibold text-indigo-700">{order.id.slice(0, 8).toUpperCase()}</span></td>
                    <td className="text-sm">{order.guestEmail || 'Registered User'}</td>
                    <td className="text-sm text-slate-500">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</td>
                    <td className="font-semibold text-sm">{formatCurrency(Number(order.totalAmount))}</td>
                    <td><span className={`badge ${getStatusBadgeClass(order.orderStatus)}`}>{order.orderStatus}</span></td>
                    <td className="text-sm text-slate-400">{formatDate(order.createdAt, 'relative')}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">No orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order detail */}
        {selectedOrder && (
          <div className="lg:col-span-2 animate-slide-in-right">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Order Detail</h3>
                <button onClick={() => setSelectedOrder(null)} className="p-1.5 rounded text-slate-400 hover:bg-slate-100 text-xs">✕</button>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Order ID</span>
                  <span className="font-mono font-semibold text-xs">{selectedOrder.id.toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Status</span>
                  <span className={`badge ${getStatusBadgeClass(selectedOrder.orderStatus)}`}>{selectedOrder.orderStatus}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Customer</span>
                  <span className="font-medium">{selectedOrder.guestEmail || 'Registered User'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total</span>
                  <span className="font-bold text-indigo-700">{formatCurrency(Number(selectedOrder.totalAmount))}</span>
                </div>
                {selectedOrder.promoCode && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Discount ({selectedOrder.promoCode})</span>
                    <span className="text-emerald-600">-{formatCurrency(Number(selectedOrder.discountAmount))}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="border-t border-slate-100 pt-3 mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{item.catalogItem?.title || 'Unknown Item'}</p>
                        <p className="text-xs text-slate-400">x{item.quantity} @ {formatCurrency(Number(item.unitPrice))}</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-700">{formatCurrency(item.quantity * Number(item.unitPrice))}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping */}
              {selectedOrder.shippingAddress && Object.keys(selectedOrder.shippingAddress).length > 0 && (
                <div className="border-t border-slate-100 pt-3 mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ship to</p>
                  <p className="text-xs text-slate-600">
                    {selectedOrder.shippingAddress.street || 'N/A'}, {selectedOrder.shippingAddress.city || 'N/A'},{' '}
                    {selectedOrder.shippingAddress.country || 'N/A'} {selectedOrder.shippingAddress.zip || 'N/A'}
                  </p>
                </div>
              )}

              {/* Actions */}
              {STATUS_ACTIONS[selectedOrder.orderStatus]?.length > 0 && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Update Status</p>
                  {STATUS_ACTIONS[selectedOrder.orderStatus].map((next: string) => (
                    <button
                      key={next}
                      disabled={isUpdating}
                      onClick={() => advanceStatus(selectedOrder.id, next as OrderStatus)}
                      className={cn('btn btn-sm w-full capitalize flex justify-center items-center', next === 'cancelled' ? 'btn-danger' : 'btn-primary')}
                      id={`order-status-${next}`}
                    >
                      {isUpdating && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
                      Mark as {next}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
