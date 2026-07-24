'use client'

import { useState } from 'react'
import { Search, Loader2, Package, FileText, XCircle } from 'lucide-react'
import { getUserOrders, cancelOrder } from '@/lib/actions/ecommerce'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export function OrdersClient({ tenantId }: { tenantId: string }) {
  const [email, setEmail] = useState('')
  const [orders, setOrders] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setIsSearching(true)
    const res = await getUserOrders(tenantId, email)
    setIsSearching(false)
    setHasSearched(true)
    if (res.success) {
      setOrders(res.orders || [])
    } else {
      toast.error(res.error || 'Failed to fetch orders')
    }
  }

  const handleCancel = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return
    setCancellingId(orderId)
    const res = await cancelOrder(tenantId, orderId, 'Cancelled by customer', email)
    setCancellingId(null)
    if (res.success) {
      toast.success('Order cancelled')
      setOrders(orders.map(o => o.id === orderId ? { ...o, orderStatus: 'cancelled' } : o))
    } else {
      toast.error(res.error || 'Failed to cancel order')
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Find Your Orders</h2>
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address..." 
              className="form-input pl-9"
              required
            />
          </div>
          <button type="submit" disabled={isSearching} className="btn btn-primary whitespace-nowrap">
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search Orders'}
          </button>
        </form>
      </div>

      {hasSearched && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="card p-12 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">No orders found</h3>
              <p className="text-slate-500">We couldn't find any orders for {email}</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="card p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Order #{order.id.slice(0, 8)}</p>
                    <p className="font-semibold text-slate-900">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge ${
                      order.orderStatus === 'completed' ? 'badge-success' :
                      order.orderStatus === 'cancelled' ? 'badge-error' :
                      order.orderStatus === 'shipped' ? 'bg-indigo-100 text-indigo-700' :
                      'badge-warning'
                    }`}>
                      {order.orderStatus.toUpperCase()}
                    </span>
                    <span className="text-lg font-bold">{formatCurrency(Number(order.totalAmount))}</span>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{item.catalogItem?.title || 'Unknown Item'}</p>
                        <p className="text-slate-500">Qty: {item.quantity}</p>
                      </div>
                      <div className="font-medium text-slate-900">
                        {formatCurrency(Number(item.totalPrice))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-6 border-t border-slate-100">
                  {order.receiptUrl ? (
                    <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="btn btn-secondary flex-1 sm:flex-none justify-center">
                      <FileText className="w-4 h-4 mr-2" /> View Receipt
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">No receipt available</span>
                  )}
                  
                  {['pending', 'pending_requirements', 'awaiting_payment'].includes(order.orderStatus) && (
                    <button 
                      onClick={() => handleCancel(order.id)} 
                      disabled={cancellingId === order.id}
                      className="btn btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200 flex-1 sm:flex-none justify-center ml-auto"
                    >
                      {cancellingId === order.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
