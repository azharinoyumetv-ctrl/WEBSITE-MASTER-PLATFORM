'use client'

import { useState, useEffect } from 'react'
import { Warehouse, AlertTriangle, CheckCircle2, TrendingDown, MapPin, Package, RefreshCw, ArrowUpDown, Search, Loader2, Plus, Edit2, Trash2, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { adjustInventory, transferStock, addInventoryBalance, updateInventoryBalance, deleteInventoryBalance, createLocation, updateLocation, deleteLocation } from '@/lib/actions/inventory'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

const STATUS_CONFIG = {
  optimal: { label: 'Optimal', color: 'badge-success', icon: CheckCircle2 },
  low: { label: 'Low Stock', color: 'badge-warning', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'badge-error', icon: TrendingDown },
}

export function InventoryClient({ initialLocations, initialBalances, catalogItems, tenantId }: { initialLocations: any[], initialBalances: any[], catalogItems: any[], tenantId: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [balances, setBalances] = useState(initialBalances)
  const [locations, setLocations] = useState(initialLocations)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(searchParams.get('location') || null)
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [adjustModal, setAdjustModal] = useState<any | null>(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [isAdjusting, setIsAdjusting] = useState(false)

  // QR State
  const [qrModal, setQrModal] = useState<any | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  // Location Management State
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [locationName, setLocationName] = useState('')
  const [locationType, setLocationType] = useState('warehouse')
  const [editingLocation, setEditingLocation] = useState<any | null>(null)
  const [isSavingLocation, setIsSavingLocation] = useState(false)

  // Add State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addLocationId, setAddLocationId] = useState('')
  const [addCatalogItemId, setAddCatalogItemId] = useState('')
  const [addQty, setAddQty] = useState('')
  const [addThreshold, setAddThreshold] = useState('5')
  const [isAdding, setIsAdding] = useState(false)

  // Edit State
  const [editModal, setEditModal] = useState<any | null>(null)
  const [editQty, setEditQty] = useState('')
  const [editReserved, setEditReserved] = useState('')
  const [editThreshold, setEditThreshold] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Transfer State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [transferSourceBalanceId, setTransferSourceBalanceId] = useState('')
  const [transferTargetLocationId, setTransferTargetLocationId] = useState('')
  const [transferQty, setTransferQty] = useState('')
  const [isTransferring, setIsTransferring] = useState(false)

  // Sync state if initial balances change via revalidatePath
  useEffect(() => { 
    setBalances(initialBalances)
    setLocations(initialLocations)
  }, [initialBalances, initialLocations])

  const filteredBalances = balances.filter(b => {
    const matchSearch = b.catalogItem?.title?.toLowerCase().includes(search.toLowerCase()) || false
    const matchLoc = !selectedLocation || b.locationId === selectedLocation
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchSearch && matchLoc && matchStatus
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

  const exportToCSV = () => {
    const headers = ['Item', 'SKU', 'Location', 'Quantity On Hand', 'Reserved', 'Status', 'Last Updated']
    const csvContent = [
      headers.join(','),
      ...filteredBalances.map(b => [
        `"${b.catalogItem?.title || ''}"`,
        `"${b.catalogItem?.sku || ''}"`,
        `"${locations.find(l => l.id === b.locationId)?.name || 'Unknown'}"`,
        b.quantityOnHand,
        b.quantityReserved,
        b.status,
        new Date(b.updatedAt).toISOString()
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `inventory-export-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const generateQRCode = async (balance: any) => {
    try {
      const QRCode = (await import('qrcode')).default
      const url = await QRCode.toDataURL(JSON.stringify({ 
        id: balance.catalogItem?.id, 
        sku: balance.catalogItem?.sku 
      }))
      setQrDataUrl(url)
      setQrModal(balance)
    } catch (err) {
      toast.error('Failed to generate QR code')
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

  const handleAdd = async () => {
    const qty = parseInt(addQty)
    const threshold = parseInt(addThreshold)
    if (!addLocationId || !addCatalogItemId || isNaN(qty) || isNaN(threshold)) {
      toast.error('Please fill out all fields correctly')
      return
    }
    setIsAdding(true)
    const res = await addInventoryBalance(tenantId, addLocationId, addCatalogItemId, qty, threshold)
    setIsAdding(false)
    if (res.success) {
      toast.success('Inventory added successfully')
      setBalances(prev => [...prev, res.balance])
      setIsAddModalOpen(false)
      setAddLocationId('')
      setAddCatalogItemId('')
      setAddQty('')
      setAddThreshold('5')
    } else {
      toast.error(res.error || 'Failed to add inventory')
    }
  }

  const handleEdit = async () => {
    if (!editModal) return
    const qty = parseInt(editQty)
    const reserved = parseInt(editReserved)
    const threshold = parseInt(editThreshold)
    if (isNaN(qty) || isNaN(reserved) || isNaN(threshold)) {
      toast.error('Invalid numbers')
      return
    }
    setIsEditing(true)
    const res = await updateInventoryBalance(tenantId, editModal.id, { quantityOnHand: qty, quantityReserved: reserved, lowStockThreshold: threshold })
    setIsEditing(false)
    if (res.success) {
      toast.success('Inventory updated')
      setBalances(prev => prev.map(b => b.id === editModal.id ? { ...b, ...res.balance, catalogItem: b.catalogItem } : b))
      setEditModal(null)
    } else {
      toast.error(res.error || 'Failed to update inventory')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inventory record?')) return
    const res = await deleteInventoryBalance(tenantId, id)
    if (res.success) {
      toast.success('Inventory deleted')
      setBalances(prev => prev.filter(b => b.id !== id))
    } else {
      toast.error(res.error || 'Failed to delete inventory')
    }
  }

  const handleSaveLocation = async () => {
    if (!locationName) {
      toast.error('Location name is required')
      return
    }
    setIsSavingLocation(true)
    if (editingLocation) {
      const res = await updateLocation(tenantId, editingLocation.id, { locationName, locationType })
      if (res.success) {
        toast.success('Location updated')
        setLocations(prev => prev.map(l => l.id === editingLocation.id ? res.location : l))
        setIsLocationModalOpen(false)
      } else {
        toast.error(res.error || 'Failed to update location')
      }
    } else {
      const res = await createLocation(tenantId, locationName, locationType)
      if (res.success) {
        toast.success('Location created')
        setLocations(prev => [...prev, res.location])
        setIsLocationModalOpen(false)
      } else {
        toast.error(res.error || 'Failed to create location')
      }
    }
    setIsSavingLocation(false)
  }

  const handleDeleteLocation = async (id: string) => {
    if (!confirm('Are you sure? This will delete all inventory in this location.')) return
    const res = await deleteLocation(tenantId, id)
    if (res.success) {
      toast.success('Location deleted')
      setLocations(prev => prev.filter(l => l.id !== id))
      if (selectedLocation === id) setSelectedLocation(null)
    } else {
      toast.error(res.error || 'Failed to delete location')
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

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">Inventory Management</h2>
          <p className="section-desc">Multi-location stock tracking and low-stock alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsTransferModalOpen(true)} className="btn btn-secondary">
            <ArrowUpDown className="w-4 h-4" />
            Transfer Stock
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Add Stock
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Stock Units', value: totalItems, icon: Package, color: 'bg-indigo-600' },
          { label: 'Locations', value: locations.length, icon: MapPin, color: 'bg-blue-600' },
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Locations</h3>
              <button 
                onClick={() => { setEditingLocation(null); setLocationName(''); setLocationType('warehouse'); setIsLocationModalOpen(true) }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedLocation(null)}
                className={cn('w-full text-left px-3 py-2 rounded-lg text-sm transition-colors', !selectedLocation ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50')}
              >
                All Locations
              </button>
              {locations.map(loc => (
                <div key={loc.id} className="group relative flex items-center">
                  <button
                    onClick={() => setSelectedLocation(loc.id)}
                    className={cn('flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors', selectedLocation === loc.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50')}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', loc.isActive ? 'bg-emerald-500' : 'bg-slate-300')} />
                      <span className="truncate">{loc.locationName}</span>
                    </div>
                    <p className="text-xs text-slate-400 ml-4 mt-0.5 capitalize">{loc.locationType}</p>
                  </button>
                  <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1">
                    <button onClick={() => { setEditingLocation(loc); setLocationName(loc.locationName); setLocationType(loc.locationType); setIsLocationModalOpen(true) }} className="p-1 hover:bg-slate-200 rounded">
                      <Edit2 className="w-3 h-3 text-slate-500" />
                    </button>
                    <button onClick={() => handleDeleteLocation(loc.id)} className="p-1 hover:bg-red-100 rounded">
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Inventory table */}
        <div className="lg:col-span-3">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search inventory by item or SKU..." 
                value={search} 
                onChange={(e) => {
                  setSearch(e.target.value)
                  updateFilters('q', e.target.value)
                }} 
                className="form-input pl-9 focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
              />
            </div>
            <select 
              className="form-select w-full sm:w-48 focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
              value={statusFilter} 
              onChange={(e) => {
                setStatusFilter(e.target.value)
                updateFilters('status', e.target.value)
              }}
            >
              <option value="all">All Statuses</option>
              <option value="optimal">Optimal</option>
              <option value="low">Low Stock</option>
              <option value="critical">Critical</option>
            </select>
            <select 
              className="form-select w-full sm:w-48 focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
              value={selectedLocation || ''} 
              onChange={(e) => {
                const val = e.target.value || null
                setSelectedLocation(val)
                updateFilters('location', val)
              }}
            >
              <option value="">All Locations</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <button onClick={exportToCSV} className="btn btn-secondary flex items-center gap-1.5 focus:ring-2 focus:ring-indigo-500">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={() => setIsTransferModalOpen(true)} className="btn btn-secondary flex items-center gap-2 focus:ring-2 focus:ring-indigo-500">
              <ArrowUpDown className="w-4 h-4" /> Transfer
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary flex items-center gap-2 focus:ring-2 focus:ring-indigo-500">
              <Plus className="w-4 h-4" /> Add Stock
            </button>
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => generateQRCode(bal)}
                            className="btn btn-secondary btn-sm"
                            title="Generate QR"
                          >
                            QR
                          </button>
                          <button
                            onClick={() => { setAdjustModal(bal); setAdjustQty('') }}
                            className="btn btn-secondary btn-sm"
                            title="Adjust Quantity"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditModal(bal)
                              setEditQty(bal.quantityOnHand.toString())
                              setEditReserved(bal.quantityReserved.toString())
                              setEditThreshold(bal.lowStockThreshold.toString())
                            }}
                            className="btn btn-secondary btn-sm"
                            title="Edit Record"
                          >
                            <Edit2 className="w-4 h-4 text-slate-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(bal.id)}
                            className="btn btn-secondary btn-sm hover:bg-red-50 hover:border-red-200"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
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

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-scale-in">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold">Add Stock</h3>
              <p className="text-sm text-slate-500">Add a new inventory balance record</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Location</label>
                <select className="form-select" value={addLocationId} onChange={e => setAddLocationId(e.target.value)}>
                  <option value="">Select location...</option>
                  {initialLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.locationName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Catalog Item</label>
                <select className="form-select" value={addCatalogItemId} onChange={e => setAddCatalogItemId(e.target.value)}>
                  <option value="">Select item...</option>
                  {catalogItems.map(item => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Quantity On Hand</label>
                  <input type="number" value={addQty} onChange={(e) => setAddQty(e.target.value)} className="form-input" min="0" />
                </div>
                <div>
                  <label className="form-label">Low Stock Threshold</label>
                  <input type="number" value={addThreshold} onChange={(e) => setAddThreshold(e.target.value)} className="form-input" min="0" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleAdd} disabled={isAdding} className="btn btn-primary">
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isAdding ? 'Adding...' : 'Add Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm animate-scale-in">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold">Edit Stock Record</h3>
              <p className="text-sm text-slate-500">{editModal.catalogItem?.title}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Quantity On Hand</label>
                <input type="number" value={editQty} onChange={(e) => setEditQty(e.target.value)} className="form-input" min="0" />
              </div>
              <div>
                <label className="form-label">Quantity Reserved</label>
                <input type="number" value={editReserved} onChange={(e) => setEditReserved(e.target.value)} className="form-input" min="0" />
              </div>
              <div>
                <label className="form-label">Low Stock Threshold</label>
                <input type="number" value={editThreshold} onChange={(e) => setEditThreshold(e.target.value)} className="form-input" min="0" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setEditModal(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleEdit} disabled={isEditing} className="btn btn-primary">
                {isEditing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isEditing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm animate-scale-in">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold">{editingLocation ? 'Edit Location' : 'New Location'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Location Name</label>
                <input type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)} className="form-input" placeholder="e.g. Main Warehouse" />
              </div>
              <div>
                <label className="form-label">Location Type</label>
                <select className="form-select" value={locationType} onChange={(e) => setLocationType(e.target.value)}>
                  <option value="warehouse">Warehouse</option>
                  <option value="storefront">Storefront</option>
                  <option value="supplier">Supplier Dropship</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsLocationModalOpen(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSaveLocation} disabled={isSavingLocation} className="btn btn-primary">
                {isSavingLocation ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isSavingLocation ? 'Saving...' : 'Save Location'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-scale-in text-center">
            <h3 className="text-xl font-bold mb-2">{qrModal.catalogItem?.title}</h3>
            <p className="text-slate-500 mb-6 font-mono text-sm">SKU: {qrModal.catalogItem?.sku}</p>
            {qrDataUrl && (
              <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 mx-auto mb-6 rounded-lg shadow-sm border border-slate-100" />
            )}
            <button onClick={() => setQrModal(null)} className="btn btn-primary w-full">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
