'use client'

import { useState } from 'react'
import { ShoppingCart, Search, Filter, Package, Eye, TrendingUp, DollarSign, AlertCircle, CheckCircle2, Clock, XCircle, Truck, Loader2, Download } from 'lucide-react'
import { formatCurrency, formatDate, getStatusBadgeClass, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { updateOrderStatus, bulkUpdateOrderStatus } from '@/lib/actions/ecommerce'
import { OrderStatus } from '@prisma/client'

const STATUS_ACTIONS: Record<string, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['processing'],
  processing: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: [],
}

export function EcommerceClient({ initialOrders, tenantId, baseCurrency = 'USD' }: { initialOrders: any[], tenantId: string, baseCurrency?: string }) {
  const [orders, setOrders] = useState(initialOrders)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [selectedOrdersIds, setSelectedOrdersIds] = useState<string[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [receiptUrlInput, setReceiptUrlInput] = useState('')

  const handleSelectOrder = (order: any) => {
    setSelectedOrder(order)
    setReceiptUrlInput(order.receiptUrl || '')
  }

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
    const res = await updateOrderStatus(tenantId, orderId, newStatus, receiptUrlInput || undefined)
    setIsUpdating(false)

    if (res.success) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, orderStatus: newStatus, receiptUrl: receiptUrlInput || o.receiptUrl } : o))
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev: any) => prev ? { ...prev, orderStatus: newStatus, receiptUrl: receiptUrlInput || prev.receiptUrl } : prev)
      }
      toast.success(`Order status updated to ${newStatus}`)
    } else {
      toast.error(res.error || 'Failed to update order status')
    }
  }

  const handleBulkUpdate = async (status: string) => {
    if (selectedOrdersIds.length === 0) return
    setIsUpdating(true)
    const res = await bulkUpdateOrderStatus(tenantId, selectedOrdersIds, status as OrderStatus)
    setIsUpdating(false)
    if (res.success) {
      setOrders(prev => prev.map(o => selectedOrdersIds.includes(o.id) ? { ...o, orderStatus: status as OrderStatus } : o))
      toast.success(`Updated ${selectedOrdersIds.length} orders`)
      setSelectedOrdersIds([])
    } else {
      toast.error(res.error || 'Bulk update failed')
    }
  }

  const handleExportCSV = () => {
    const dataToExport = selectedOrdersIds.length > 0 ? orders.filter(o => selectedOrdersIds.includes(o.id)) : filtered
    if (dataToExport.length === 0) {
      toast.error('No orders to export')
      return
    }
    const headers = ['Order ID', 'Customer', 'Items Count', 'Total', 'Status', 'Date']
    let csv = headers.join(',') + '\n'
    dataToExport.forEach(o => {
      csv += `"${o.id}","${o.guestEmail || 'Registered User'}",${o.items.length},${o.totalAmount},"${o.orderStatus}","${o.createdAt}"\n`
    })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ecommerce-orders.csv`
    link.click()
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
          { label: 'Total Revenue', value: formatCurrency(stats.revenue, baseCurrency), icon: DollarSign, color: 'bg-blue-600' },
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
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
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
            {selectedOrdersIds.length > 0 && (
              <select 
                className="form-select w-40 border-indigo-300 text-indigo-700 bg-indigo-50"
                onChange={(e) => {
                  if (e.target.value) handleBulkUpdate(e.target.value)
                  e.target.value = ''
                }}
                disabled={isUpdating}
                value=""
              >
                <option value="" disabled>Bulk Action...</option>
                <option value="paid">Mark Paid</option>
                <option value="processing">Mark Processing</option>
                <option value="shipped">Mark Shipped</option>
                <option value="completed">Mark Completed</option>
                <option value="cancelled">Mark Cancelled</option>
              </select>
            )}
            <button onClick={handleExportCSV} className="btn btn-secondary px-3 py-1.5 flex items-center gap-1.5">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-12">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={filtered.length > 0 && selectedOrdersIds.length === filtered.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrdersIds(filtered.map(o => o.id))
                        } else {
                          setSelectedOrdersIds([])
                        }
                      }}
                    />
                  </th>
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
                    className={cn('cursor-pointer hover:bg-slate-50', selectedOrder?.id === order.id ? 'bg-indigo-50' : '')}
                    onClick={() => handleSelectOrder(order)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedOrdersIds.includes(order.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedOrdersIds(prev => [...prev, order.id])
                          else setSelectedOrdersIds(prev => prev.filter(id => id !== order.id))
                        }}
                      />
                    </td>
                    <td><span className="font-mono text-xs font-semibold text-indigo-700">{order.id.slice(0, 8).toUpperCase()}</span></td>
                    <td className="text-sm">{order.guestEmail || 'Registered User'}</td>
                    <td className="text-sm text-slate-500">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</td>
                    <td className="font-semibold text-sm">{formatCurrency(Number(order.totalAmount), baseCurrency)}</td>
                    <td><span className={`badge ${getStatusBadgeClass(order.orderStatus)}`}>{order.orderStatus}</span></td>
                    <td className="text-sm text-slate-400">{formatDate(order.createdAt, 'relative')}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">No orders found.</td>
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
                  <span className="font-bold text-indigo-700">{formatCurrency(Number(selectedOrder.totalAmount), baseCurrency)}</span>
                </div>
                {selectedOrder.promoCode && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Discount ({selectedOrder.promoCode})</span>
                    <span className="text-emerald-600">-{formatCurrency(Number(selectedOrder.discountAmount), baseCurrency)}</span>
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
                        <p className="text-xs text-slate-400">x{item.quantity} @ {formatCurrency(Number(item.unitPrice), baseCurrency)}</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-700">{formatCurrency(item.quantity * Number(item.unitPrice), baseCurrency)}</span>
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
              <div className="border-t border-slate-100 pt-3 space-y-3">
                {selectedOrder.orderStatus !== 'cancelled' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Receipt URL</label>
                    <div className="flex gap-2">
                      <input 
                        type="url" 
                        value={receiptUrlInput}
                        onChange={e => setReceiptUrlInput(e.target.value)}
                        placeholder="https://..."
                        className="form-input text-sm flex-1"
                      />
                      <button 
                        onClick={() => advanceStatus(selectedOrder.id, selectedOrder.orderStatus)}
                        disabled={isUpdating}
                        className="btn btn-secondary btn-sm whitespace-nowrap"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                {STATUS_ACTIONS[selectedOrder.orderStatus]?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Update Status</p>
                    <div className="space-y-2">
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
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
