'use client'

import { useState, useEffect } from 'react'
import { Warehouse, AlertTriangle, CheckCircle2, TrendingDown, MapPin, Package, RefreshCw, ArrowUpDown, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { adjustInventory, transferStock } from '@/lib/actions/inventory'

const STATUS_CONFIG = {
  optimal: { label: 'Optimal', color: 'badge-success', icon: CheckCircle2 },
  low: { label: 'Low Stock', color: 'badge-warning', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'badge-error', icon: TrendingDown },
}

export function InventoryClient({ initialLocations, initialBalances, tenantId }: { initialLocations: any[], initialBalances: any[], tenantId: string }) {
  const [balances, setBalances] = useState(initialBalances)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [adjustModal, setAdjustModal] = useState<any | null>(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [isAdjusting, setIsAdjusting] = useState(false)

  // Transfer State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [transferSourceBalanceId, setTransferSourceBalanceId] = useState('')
  const [transferTargetLocationId, setTransferTargetLocationId] = useState('')
  const [transferQty, setTransferQty] = useState('')
  const [isTransferring, setIsTransferring] = useState(false)

  // Sync state if initial balances change via revalidatePath
  // (Next.js passes new props after server action invalidates cache)
  useEffect(() => { setBalances(initialBalances) }, [initialBalances])

  const filteredBalances = balances.filter(b => {
    const matchSearch = b.catalogItem?.title?.toLowerCase().includes(search.toLowerCase()) || false
    const matchLoc = !selectedLocation || b.locationId === selectedLocation
    return matchSearch && matchLoc
  })

  const criticalCount = balances.filter(b => b.status === 'critical').length
  const lowCount = balances.filter(b => b.status === 'low').length
  const totalItems = balances.reduce((s, b) => s + b.quantityOnHand, 0)

  const doAdjust = async () => {
    if (!adjustModal) return
    const newQty = parseInt(adjustQty)
    if (isNaN(newQty)) { toast.error('Invalid quantity'); return }
    
    setIsAdjusting(true)
    const res = await adjustInventory(tenantId, adjustModal.id, newQty)
    setIsAdjusting(false)

    if (res.success) {
      setBalances(prev => prev.map(b => b.id === adjustModal.id ? { ...b, ...res.balance, catalogItem: b.catalogItem } : b))
      toast.success(`Adjusted ${adjustModal.catalogItem?.title} by ${newQty > 0 ? '+' : ''}${newQty}`)
      setAdjustModal(null)
      setAdjustQty('')
    } else {
      toast.error(res.error || 'Failed to adjust inventory')
    }
  }

  const handleTransfer = async () => {
    const qty = parseInt(transferQty)
    if (!transferSourceBalanceId || !transferTargetLocationId || isNaN(qty) || qty <= 0) {
      toast.error('Please fill out all fields correctly')
      return
    }
    const sourceBal = balances.find(b => b.id === transferSourceBalanceId)
    if (!sourceBal) return

    setIsTransferring(true)
    const res = await transferStock(tenantId, sourceBal.locationId, transferTargetLocationId, sourceBal.catalogItemId, qty)
    setIsTransferring(false)

    if (res.success) {
      toast.success('Stock transferred successfully')
      setIsTransferModalOpen(false)
      setTransferSourceBalanceId('')
      setTransferTargetLocationId('')
      setTransferQty('')
    } else {
      toast.error((res as any).error || 'Transfer failed')
    }
  }

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">Inventory Management</h2>
          <p className="section-desc">Multi-location stock tracking and low-stock alerts</p>
        </div>
        <button onClick={() => setIsTransferModalOpen(true)} className="btn btn-secondary">
          <ArrowUpDown className="w-4 h-4" />
          Transfer Stock
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Stock Units', value: totalItems, icon: Package, color: 'bg-indigo-600' },
          { label: 'Locations', value: initialLocations.length, icon: MapPin, color: 'bg-blue-600' },
          { label: 'Low Stock', value: lowCount, icon: AlertTriangle, color: 'bg-amber-500' },
          { label: 'Critical', value: criticalCount, icon: TrendingDown, color: 'bg-red-500' },
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

      {/* Alerts */}
      {criticalCount > 0 && (
        <div className="alert-error mb-4">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span><strong>{criticalCount} item{criticalCount > 1 ? 's' : ''}</strong> are at critical stock level. Immediate restocking required.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Locations sidebar */}
        <div className="lg:col-span-1">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Locations</h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedLocation(null)}
                className={cn('w-full text-left px-3 py-2 rounded-lg text-sm transition-colors', !selectedLocation ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50')}
              >
                All Locations
              </button>
              {initialLocations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc.id)}
                  className={cn('w-full text-left px-3 py-2 rounded-lg text-sm transition-colors', selectedLocation === loc.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50')}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', loc.isActive ? 'bg-emerald-500' : 'bg-slate-300')} />
                    <span className="truncate">{loc.locationName}</span>
                  </div>
                  <p className="text-xs text-slate-400 ml-4 mt-0.5 capitalize">{loc.locationType}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Inventory table */}
        <div className="lg:col-span-3">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="form-input pl-9" id="inventory-search" />
          </div>
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>On Hand</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.map(bal => {
                  const statusConf = STATUS_CONFIG[bal.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.optimal
                  const available = bal.quantityOnHand - bal.quantityReserved
                  return (
                    <tr key={bal.id}>
                      <td className="font-medium text-slate-900">{bal.catalogItem?.title || 'Unknown Item'}</td>
                      <td className="font-bold text-slate-900">{bal.quantityOnHand}</td>
                      <td className="text-amber-600">{bal.quantityReserved}</td>
                      <td className={cn('font-semibold', available <= 0 ? 'text-red-500' : 'text-emerald-600')}>{available}</td>
                      <td className="text-slate-400">{bal.lowStockThreshold}</td>
                      <td><span className={`badge ${statusConf.color}`}>{statusConf.label}</span></td>
                      <td>
                        <button
                          onClick={() => { setAdjustModal(bal); setAdjustQty('') }}
                          className="btn btn-secondary btn-sm"
                          id={`adjust-${bal.id}`}
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {filteredBalances.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">No inventory records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm animate-scale-in">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold">Adjust Stock</h3>
              <p className="text-sm text-slate-500">{adjustModal.catalogItem?.title}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-4 text-center">
                <div className="flex-1 p-3 bg-slate-50 rounded-xl">
                  <p className="text-2xl font-bold text-slate-900">{adjustModal.quantityOnHand}</p>
                  <p className="text-xs text-slate-400">Current Stock</p>
                </div>
              </div>
              <div>
                <label className="form-label">Adjustment Quantity</label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="+10 or -5"
                  className="form-input"
                  id="adjust-qty"
                />
                <p className="text-xs text-slate-400 mt-1">Use positive numbers to add, negative to deduct</p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setAdjustModal(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={doAdjust} disabled={isAdjusting} className="btn btn-primary" id="confirm-adjust-btn">
                {isAdjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isAdjusting ? 'Adjusting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-scale-in">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold">Transfer Stock</h3>
              <p className="text-sm text-slate-500">Move inventory between locations</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Source Item & Location</label>
                <select className="form-select" value={transferSourceBalanceId} onChange={e => setTransferSourceBalanceId(e.target.value)}>
                  <option value="">Select source...</option>
                  {balances.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.catalogItem?.title} ({b.location?.locationName}) - {b.quantityOnHand} available
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Target Location</label>
                <select className="form-select" value={transferTargetLocationId} onChange={e => setTransferTargetLocationId(e.target.value)}>
                  <option value="">Select destination...</option>
                  {initialLocations.map(loc => {
                    const sourceBal = balances.find(b => b.id === transferSourceBalanceId)
                    if (sourceBal && sourceBal.locationId === loc.id) return null // Hide source location
                    return <option key={loc.id} value={loc.id}>{loc.locationName}</option>
                  })}
                </select>
              </div>
              <div>
                <label className="form-label">Quantity to Transfer</label>
                <input
                  type="number"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  placeholder="Enter quantity"
                  className="form-input"
                  min="1"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsTransferModalOpen(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleTransfer} disabled={isTransferring} className="btn btn-primary">
                {isTransferring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isTransferring ? 'Transferring...' : 'Complete Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
