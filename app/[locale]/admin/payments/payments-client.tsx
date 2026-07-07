'use client'

import { useState } from 'react'
import { CreditCard, DollarSign, TrendingUp, RefreshCw, AlertTriangle, CheckCircle2, Clock, Search } from 'lucide-react'
import { formatCurrency, formatDate, getStatusBadgeClass, cn } from '@/lib/utils'

export function PaymentsClient({ initialPayments }: { initialPayments: any[] }) {
  const [payments, setPayments] = useState(initialPayments)
  const [search, setSearch] = useState('')

  const filtered = payments.filter(p =>
    p.id.includes(search.toLowerCase()) || (p.externalTransactionId?.includes(search) ?? false)
  )

  const stats = {
    total: payments.reduce((s, p) => s + (p.paymentStatus === 'succeeded' ? Number(p.amount) : 0), 0),
    succeeded: payments.filter(p => p.paymentStatus === 'succeeded').length,
    failed: payments.filter(p => p.paymentStatus === 'failed').length,
    initiated: payments.filter(p => p.paymentStatus === 'initiated').length,
  }

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">Payment Ledger</h2>
          <p className="section-desc">Transaction history and payment gateway status</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Captured', value: formatCurrency(stats.total), icon: DollarSign, color: 'bg-emerald-600' },
          { label: 'Succeeded', value: stats.succeeded, icon: CheckCircle2, color: 'bg-indigo-600' },
          { label: 'Pending', value: stats.initiated, icon: Clock, color: 'bg-amber-500' },
          { label: 'Failed', value: stats.failed, icon: AlertTriangle, color: 'bg-red-500' },
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

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} className="form-input pl-9" id="payment-search" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Order</th>
              <th>Gateway</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <div>
                    <p className="font-mono text-xs font-semibold text-slate-700">{p.id.slice(0, 8).toUpperCase()}</p>
                    {p.externalTransactionId && (
                      <p className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">{p.externalTransactionId}</p>
                    )}
                  </div>
                </td>
                <td className="font-mono text-xs text-indigo-600">{p.orderId?.slice(0, 8).toUpperCase() || 'N/A'}</td>
                <td>
                  <span className="badge badge-neutral capitalize">{p.processorKey}</span>
                </td>
                <td className="font-semibold">{formatCurrency(Number(p.amount))} <span className="text-xs text-slate-400">{p.currency}</span></td>
                <td><span className={`badge ${getStatusBadgeClass(p.paymentStatus)}`}>{p.paymentStatus}</span></td>
                <td className="text-sm text-slate-400">{formatDate(p.createdAt, 'relative')}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">No payments found.</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">Showing {filtered.length} of {payments.length} transactions</p>
        </div>
      </div>

      {/* Webhook Log */}
      <div className="mt-6 card p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Webhook Events</h3>
        <div className="space-y-2">
          {[
            { event: 'payment.succeeded', payload: 'pi_3OxK8j2e...', time: '2m ago', status: 'delivered' },
            { event: 'payment.succeeded', payload: 'pi_3OxL9k3f...', time: '1h ago', status: 'delivered' },
            { event: 'payment.initiated', payload: 'paypal_003', time: '2h ago', status: 'pending' },
          ].map((wh, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', wh.status === 'delivered' ? 'bg-emerald-500' : 'bg-amber-500')} />
              <code className="text-xs text-slate-700 flex-1">{wh.event}</code>
              <code className="text-xs text-slate-400">{wh.payload}</code>
              <span className="text-xs text-slate-400">{wh.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
