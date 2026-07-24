'use client'

import { useState } from 'react'
import { CreditCard, DollarSign, TrendingUp, RefreshCw, AlertTriangle, CheckCircle2, Clock, Search, Edit2, Loader2, ShieldAlert, FileText, UploadCloud, Check, X, Download } from 'lucide-react'
import { formatCurrency, formatDate, getStatusBadgeClass, cn } from '@/lib/utils'
import { refundPayment, capturePayment, manualAdjustPayment, createOrUpdateDispute } from '@/lib/actions/payments'
import toast from 'react-hot-toast'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export function PaymentsClient({ initialPayments, initialDisputes = [], tenantId }: { initialPayments: any[], initialDisputes?: any[], tenantId: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [payments, setPayments] = useState(initialPayments)
  const [disputes, setDisputes] = useState<any[]>(initialDisputes)
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<'transactions' | 'disputes'>((searchParams.get('tab') as 'transactions' | 'disputes') || 'transactions')
  
  const [adjustingPayment, setAdjustingPayment] = useState<any>(null)
  const [adjustAmount, setAdjustAmount] = useState<string>('')
  const [adjustReason, setAdjustReason] = useState<string>('')

  const [selectedDispute, setSelectedDispute] = useState<any | null>(null)
  const [evidenceText, setEvidenceText] = useState('')
  const [evidenceFile, setEvidenceFile] = useState('')

  const filtered = payments.filter(p =>
    p.id.includes(search.toLowerCase()) || (p.externalTransactionId?.includes(search) ?? false)
  )

  const stats = {
    total: payments.reduce((s, p) => s + (p.paymentStatus === 'succeeded' ? Number(p.amount) : 0), 0),
    succeeded: payments.filter(p => p.paymentStatus === 'succeeded').length,
    failed: payments.filter(p => p.paymentStatus === 'failed').length,
    initiated: payments.filter(p => p.paymentStatus === 'initiated').length,
  }

  const handleAction = async (actionFn: any, paymentId: string, actionName: string) => {
    setIsProcessing(prev => ({ ...prev, [paymentId]: true }))
    const res = await actionFn(tenantId, paymentId)
    setIsProcessing(prev => ({ ...prev, [paymentId]: false }))
    
    if (res.success) {
      toast.success(`Payment ${actionName} successfully`)
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, ...res.payment } : p))
    } else {
      toast.error(`Failed to ${actionName}: ` + res.error)
    }
  }

  const handleManualAdjust = async () => {
    if (!adjustAmount || isNaN(Number(adjustAmount))) {
      return toast.error('Enter a valid amount')
    }
    
    setIsProcessing(prev => ({ ...prev, [adjustingPayment.id]: true }))
    const res = await manualAdjustPayment(tenantId, adjustingPayment.id, Number(adjustAmount), adjustReason)
    setIsProcessing(prev => ({ ...prev, [adjustingPayment.id]: false }))

    if (res.success) {
      toast.success('Payment adjusted successfully')
      setPayments(prev => prev.map(p => p.id === adjustingPayment.id ? { ...p, ...res.payment } : p))
      setAdjustingPayment(null)
      setAdjustAmount('')
      setAdjustReason('')
    } else {
      toast.error('Failed to adjust payment: ' + res.error)
    }
  }

  const handleCreateManualDispute = async (p: any) => {
    if (!confirm('Flag this payment as disputed for manual review/hold?')) return
    setIsProcessing(prev => ({ ...prev, [p.id]: true }))
    const res = await createOrUpdateDispute(tenantId, p.id, {
      status: 'under_review',
      reason: 'Manual Admin Flagged Dispute'
    })
    setIsProcessing(prev => ({ ...prev, [p.id]: false }))

    if (res.success) {
      toast.success('Dispute created under review')
      setDisputes(prev => [res.dispute, ...prev])
      setPayments(prev => prev.map(pay => pay.id === p.id ? { ...pay, paymentStatus: 'disputed' } : pay))
    } else {
      toast.error('Failed to flag dispute: ' + res.error)
    }
  }

  const handleUpdateDisputeStatus = async (newStatus: string) => {
    setIsProcessing(prev => ({ ...prev, [selectedDispute.id]: true }))
    const res = await createOrUpdateDispute(tenantId, selectedDispute.paymentId, {
      status: newStatus,
      evidenceText,
      evidenceFile
    })
    setIsProcessing(prev => ({ ...prev, [selectedDispute.id]: false }))

    if (res.success) {
      toast.success(`Dispute status updated to ${newStatus}`)
      const updatedDispute = { ...selectedDispute, status: newStatus, evidenceText, evidenceFile }
      setDisputes(prev => prev.map(d => d.id === selectedDispute.id ? updatedDispute : d))
      
      setPayments(prev => prev.map(p => p.id === selectedDispute.paymentId ? { 
        ...p, 
        paymentStatus: newStatus === 'lost' ? 'refunded' : 'disputed'
      } : p))
      
      setSelectedDispute(null)
    } else {
      toast.error('Failed to update dispute: ' + res.error)
    }
  }

  const updateFilters = (key: string, val: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (val) {
      params.set(key, val)
    } else {
      params.delete(key)
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleExportCSV = () => {
    if (activeTab === 'transactions') {
      if (payments.length === 0) {
        toast.error('No transactions to export')
        return
      }
      const headers = ['Transaction ID', 'External ID', 'Order ID', 'Gateway', 'Amount', 'Currency', 'Status', 'Date']
      let csvContent = headers.join(',') + '\n'
      payments.forEach(p => {
        csvContent += `"${p.id}","${p.externalTransactionId || ''}","${p.orderId || ''}","${p.paymentGateway || ''}",${p.amount},"${p.currency || 'IDR'}","${p.paymentStatus}","${new Date(p.createdAt).toLocaleDateString()}"\n`
      })
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'payments_export.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Payments list exported successfully')
    } else {
      if (disputes.length === 0) {
        toast.error('No disputes to export')
        return
      }
      const headers = ['Dispute ID', 'Payment ID', 'Reason', 'Status', 'Amount', 'Date']
      let csvContent = headers.join(',') + '\n'
      disputes.forEach(d => {
        csvContent += `"${d.id}","${d.paymentId}","${d.reason}","${d.status}",${d.amount || 0},"${new Date(d.createdAt).toLocaleDateString()}"\n`
      })
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'disputes_export.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Disputes list exported successfully')
    }
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

      <div className="flex border-b border-slate-200 mb-6">
        <button 
          onClick={() => {
            setActiveTab('transactions')
            updateFilters('tab', 'transactions')
          }}
          className={cn("px-4 py-2 text-sm font-semibold border-b-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500", activeTab === 'transactions' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-600 hover:text-slate-900")}
        >
          Transactions
        </button>
        <button 
          onClick={() => {
            setActiveTab('disputes')
            updateFilters('tab', 'disputes')
          }}
          className={cn("px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500", activeTab === 'disputes' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-600 hover:text-slate-900")}
        >
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          Disputes & Chargebacks
          {disputes.filter(d => d.status === 'under_review').length > 0 && (
            <span className="bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-[10px]">
              {disputes.filter(d => d.status === 'under_review').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'transactions' ? (
        <>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search transactions..." 
                value={search} 
                onChange={(e) => {
                  setSearch(e.target.value)
                  updateFilters('q', e.target.value)
                }} 
                className="form-input pl-9 focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                id="payment-search" 
              />
            </div>
            <button onClick={handleExportCSV} className="btn btn-secondary flex items-center gap-1.5 focus:ring-2 focus:ring-indigo-500">
              <Download className="w-4 h-4" /> Export CSV
            </button>
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
                  <th className="text-right">Actions</th>
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
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.paymentStatus === 'initiated' && (
                          <button 
                            onClick={() => handleAction(capturePayment, p.id, 'captured')} 
                            disabled={isProcessing[p.id]}
                            className="btn btn-ghost btn-sm text-emerald-600"
                          >
                            {isProcessing[p.id] ? 'Processing...' : 'Capture'}
                          </button>
                        )}
                        {p.paymentStatus === 'succeeded' && (
                          <>
                            <button 
                              onClick={() => handleAction(refundPayment, p.id, 'refunded')} 
                              disabled={isProcessing[p.id]}
                              className="btn btn-ghost btn-sm text-red-500"
                            >
                              {isProcessing[p.id] ? 'Processing...' : 'Refund'}
                            </button>
                            <button 
                              onClick={() => handleCreateManualDispute(p)} 
                              disabled={isProcessing[p.id]}
                              className="btn btn-ghost btn-sm text-amber-500"
                            >
                              Dispute
                            </button>
                            <button 
                              onClick={() => setAdjustingPayment(p)} 
                              disabled={isProcessing[p.id]}
                              className="btn btn-ghost btn-sm text-indigo-500"
                            >
                              Adjust
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">No payments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-400">Showing {filtered.length} of {payments.length} transactions</p>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={handleExportCSV} className="btn btn-secondary flex items-center gap-1.5 focus:ring-2 focus:ring-indigo-500">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
          <div className="card overflow-hidden">
            <table className="data-table">
            <thead>
              <tr>
                <th>Dispute ID</th>
                <th>Payment Ref</th>
                <th>Reason</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map(d => (
                <tr key={d.id}>
                  <td><code className="text-xs">{d.id.slice(0, 8).toUpperCase()}</code></td>
                  <td><code className="text-xs text-indigo-600">{d.paymentId.slice(0, 8).toUpperCase()}</code></td>
                  <td>{d.reason}</td>
                  <td className="font-semibold">{formatCurrency(Number(d.amount))}</td>
                  <td>
                    <span className={cn('badge text-[10px] capitalize', 
                      d.status === 'won' ? 'badge-success' :
                      d.status === 'lost' ? 'badge-error' :
                      d.status === 'evidence_submitted' ? 'badge-info' : 'badge-warning'
                    )}>
                      {d.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-xs text-slate-400">{formatDate(d.createdAt)}</td>
                  <td className="text-right">
                    <button onClick={() => {
                      setSelectedDispute(d)
                      setEvidenceText(d.evidenceText || '')
                      setEvidenceFile(d.evidenceFile || '')
                    }} className="btn btn-ghost btn-sm text-indigo-600">
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
              {disputes.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">No disputes recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">Showing {disputes.length} disputes</p>
          </div>
        </div>
      </>
      )}

      {adjustingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-slide-up">
            <h3 className="text-lg font-bold mb-4">Manual Adjustment</h3>
            <p className="text-sm text-slate-500 mb-4">
              Adjusting payment <span className="font-mono">{adjustingPayment.id.slice(0, 8)}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="form-label">Adjustment Amount</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={adjustAmount} 
                  onChange={e => setAdjustAmount(e.target.value)}
                  className="form-input" 
                  placeholder="-10.00 or 5.50"
                />
                <p className="text-[10px] text-slate-400 mt-1">Use negative values to deduct</p>
              </div>
              <div>
                <label className="form-label">Reason</label>
                <input 
                  type="text" 
                  value={adjustReason} 
                  onChange={e => setAdjustReason(e.target.value)}
                  className="form-input" 
                  placeholder="e.g. Disputed charge, manual tip"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setAdjustingPayment(null)} className="btn btn-secondary">Cancel</button>
              <button 
                onClick={handleManualAdjust} 
                disabled={isProcessing[adjustingPayment.id]} 
                className="btn btn-primary"
              >
                {isProcessing[adjustingPayment.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />} 
                Adjust
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-slide-up">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold">Manage Dispute</h3>
              <span className={cn('badge text-[10px] capitalize', 
                selectedDispute.status === 'won' ? 'badge-success' :
                selectedDispute.status === 'lost' ? 'badge-error' :
                selectedDispute.status === 'evidence_submitted' ? 'badge-info' : 'badge-warning'
              )}>
                {selectedDispute.status.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1 text-xs text-slate-600">
                <p><strong>Dispute ID:</strong> <span className="font-mono">{selectedDispute.id}</span></p>
                <p><strong>Payment Reference:</strong> <span className="font-mono">{selectedDispute.paymentId}</span></p>
                <p><strong>Reason:</strong> {selectedDispute.reason}</p>
                <p><strong>Disputed Amount:</strong> {formatCurrency(Number(selectedDispute.amount))}</p>
              </div>

              <div>
                <label className="form-label">Evidence Text</label>
                <textarea 
                  value={evidenceText}
                  onChange={e => setEvidenceText(e.target.value)}
                  className="form-input min-h-[80px]"
                  placeholder="Provide tracking numbers, delivery confirmations, or explanation..."
                />
              </div>

              <div>
                <label className="form-label">Evidence Document Link (Optional)</label>
                <input 
                  type="text"
                  value={evidenceFile}
                  onChange={e => setEvidenceFile(e.target.value)}
                  className="form-input"
                  placeholder="https://example.com/receipt.pdf"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 justify-between">
              <div className="flex gap-2">
                <button 
                  onClick={() => handleUpdateDisputeStatus('won')} 
                  disabled={isProcessing[selectedDispute.id]}
                  className="btn btn-sm btn-secondary text-emerald-600 border-emerald-100 hover:bg-emerald-50"
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Mark Won
                </button>
                <button 
                  onClick={() => handleUpdateDisputeStatus('lost')} 
                  disabled={isProcessing[selectedDispute.id]}
                  className="btn btn-sm btn-secondary text-red-500 border-red-100 hover:bg-red-50"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Mark Lost
                </button>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setSelectedDispute(null)} className="btn btn-sm btn-secondary">Cancel</button>
                <button 
                  onClick={() => handleUpdateDisputeStatus('evidence_submitted')} 
                  disabled={isProcessing[selectedDispute.id]}
                  className="btn btn-sm btn-primary"
                >
                  {isProcessing[selectedDispute.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-1" />} 
                  Submit Evidence
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
