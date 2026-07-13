'use client'

import { useState, useEffect, useRef } from 'react'
import { Monitor, ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, Search, Wifi, Clock, FileText, ArrowDownCircle, ArrowUpCircle, Download, LayoutList, X } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { processPosPayment, openSession, closeCashDrawerSession, generateReceipt, openCashDrawer, recordCashDrop, recordCashPayout, getEndOfDayReport, getCashDrawerEvents } from '@/lib/actions/pos'

export function PosClient({ initialTerminal, initialCatalogItems, initialSession, tenantId, userId, baseCurrency = 'USD' }: { initialTerminal: any, initialCatalogItems: any[], initialSession: any, tenantId: string, userId: string, baseCurrency?: string }) {
  const [cart, setCart] = useState<Array<{id: string; title: string; price: number; qty: number}>>([])
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'qr'>('card')
  const [isProcessing, setIsProcessing] = useState(false)
  const [time, setTime] = useState(new Date())
  const [search, setSearch] = useState('')
  const [activeSession, setActiveSession] = useState(initialSession)
  
  // Shift & Drawer state
  const [shiftAmount, setShiftAmount] = useState('0')
  const [showShiftModal, setShowShiftModal] = useState(!initialSession)
  
  const [drawerAction, setDrawerAction] = useState<'drop' | 'payout' | null>(null)
  const [drawerAmount, setDrawerAmount] = useState('')
  const [drawerNotes, setDrawerNotes] = useState('')
  
  const [showDrawerLog, setShowDrawerLog] = useState(false)
  const [drawerEvents, setDrawerEvents] = useState<any[]>([])
  
  const [showEndOfDay, setShowEndOfDay] = useState(false)
  const [shiftSummary, setShiftSummary] = useState<any>(null)
  
  const [receiptHtml, setReceiptHtml] = useState<string | null>(null)
  const [isScanningCamera, setIsScanningCamera] = useState(false)
  const [manualScanInput, setManualScanInput] = useState('')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Camera stream access hook
  useEffect(() => {
    if (isScanningCamera) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play().catch(err => console.error("Video play failed:", err))
          }
        })
        .catch(err => {
          console.error("Camera access failed:", err)
          toast.error("Could not access camera.")
        })
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [isScanningCamera])

  // Barcode detection hook
  useEffect(() => {
    let active = true
    let detector: any = null

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ['code_128', 'ean_13', 'qr_code', 'upc_a'] })
      } catch (e) {
        console.warn("BarcodeDetector formats unsupported:", e)
      }
    }

    const scanFrame = async () => {
      if (!active || !isScanningCamera || !videoRef.current || !detector) return
      
      try {
        const barcodes = await detector.detect(videoRef.current)
        if (barcodes.length > 0) {
          const barcodeValue = barcodes[0].rawValue
          const matched = initialCatalogItems.find(item => item.sku === barcodeValue)
          if (matched) {
            addToCart(matched)
            toast.success(`Scanned: ${matched.title}`)
            setIsScanningCamera(false)
            return
          }
        }
      } catch (err) {
        // Ignore detection errors during frame drops
      }

      if (active) {
        requestAnimationFrame(scanFrame)
      }
    }

    if (isScanningCamera && detector) {
      setTimeout(() => {
        requestAnimationFrame(scanFrame)
      }, 1000)
    }

    return () => {
      active = false
    }
  }, [isScanningCamera, initialCatalogItems])

  // Global hardware barcode scanner input interceptor
  useEffect(() => {
    let buffer = ''
    let lastKeyTime = Date.now()

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'
      if (isInput && target.id === 'pos-search') return

      const currentTime = Date.now()
      if (currentTime - lastKeyTime > 50) {
        buffer = ''
      }
      lastKeyTime = currentTime

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          e.preventDefault()
          const matchedItem = initialCatalogItems.find(item => item.sku === buffer)
          if (matchedItem) {
            addToCart(matchedItem)
            toast.success(`Scanned: ${matchedItem.title}`)
          } else {
            toast.error(`No item found for SKU: ${buffer}`)
          }
          buffer = ''
        }
      } else if (e.key.length === 1) {
        buffer += e.key
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [initialCatalogItems, cart])

  const visibleProducts = initialCatalogItems.filter(p =>
    p.isVisible && p.title.toLowerCase().includes(search.toLowerCase())
  )

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { id: item.id, title: item.title, price: Number(item.basePrice), qty: 1 }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, qty: c.qty + delta } : c)
      return updated.filter(c => c.qty > 0)
    })
  }

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const tax = total * 0.1
  const grandTotal = total + tax

  const processPayment = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return }
    setIsProcessing(true)
    
    const res = await processPosPayment(tenantId, initialTerminal.id, cart, paymentMethod, grandTotal, baseCurrency)
    setIsProcessing(false)
    
    if (res.success) {
      toast.success(`Payment of ${formatCurrency(grandTotal, baseCurrency)} processed via ${paymentMethod.toUpperCase()}`)
      setCart([])
      
      const receiptRes = await generateReceipt(tenantId, res.order.id)
      if (receiptRes.success) setReceiptHtml(receiptRes.receiptHtml)
    } else {
      toast.error(res.error || 'Failed to process payment')
    }
  }

  const handleOpenShift = async () => {
    setIsProcessing(true)
    const res = await openSession(tenantId, initialTerminal.id, userId, parseFloat(shiftAmount) || 0)
    setIsProcessing(false)
    if (res.success) {
      setActiveSession(res.session)
      setShowShiftModal(false)
      toast.success('Shift opened successfully')
    } else toast.error(res.error)
  }

  const handlePrepareCloseShift = async () => {
    if (!activeSession) return
    setIsProcessing(true)
    const res = await getEndOfDayReport(tenantId, activeSession.id)
    setIsProcessing(false)
    if (res.success) {
      setShiftSummary(res.report)
      setShowEndOfDay(true)
    } else {
      toast.error(res.error)
    }
  }

  const handleConfirmCloseShift = async () => {
    if (!activeSession) return
    setIsProcessing(true)
    const res = await closeCashDrawerSession(tenantId, activeSession.id, parseFloat(shiftAmount) || 0, userId, 'End of shift')
    setIsProcessing(false)
    if (res.success) {
      setActiveSession(null)
      setShowEndOfDay(false)
      setShowShiftModal(true)
      setShiftAmount('0')
      toast.success('Shift closed successfully')
    } else toast.error(res.error)
  }

  const handleOpenCashDrawer = async () => {
    if (!activeSession) { toast.error('No active session'); return }
    const res = await openCashDrawer(tenantId, activeSession.id, userId, 'Manual open')
    if (res.success) toast.success('Cash drawer opened')
    else toast.error(res.error)
  }

  const handleDrawerAction = async () => {
    if (!activeSession || !drawerAction) return
    const amt = parseFloat(drawerAmount)
    if (isNaN(amt) || amt <= 0) { toast.error('Invalid amount'); return }
    
    setIsProcessing(true)
    const res = drawerAction === 'drop' 
      ? await recordCashDrop(tenantId, activeSession.id, amt, drawerNotes, userId)
      : await recordCashPayout(tenantId, activeSession.id, amt, drawerNotes, userId)
      
    setIsProcessing(false)
    if (res.success) {
      toast.success(`Cash ${drawerAction} recorded`)
      setDrawerAction(null)
      setDrawerAmount('')
      setDrawerNotes('')
    } else toast.error(res.error)
  }

  const loadDrawerEvents = async () => {
    if (!activeSession) return
    const res = await getCashDrawerEvents(tenantId, activeSession.id)
    if (res.success) {
      setDrawerEvents(res.events)
      setShowDrawerLog(true)
    } else toast.error(res.error)
  }
  
  const exportCsv = () => {
    if (!shiftSummary) return
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Metric,Amount\n"
      + `Total Orders,${shiftSummary.orderCount}\n`
      + `Total Revenue,${shiftSummary.totalRevenue}\n`
      + `Cash Sales,${shiftSummary.cashRevenue}\n`
      + `Card Sales,${shiftSummary.cardRevenue}\n`
      + `Opening Float,${shiftSummary.openingFloat}\n`
      + `Cash Drops,${shiftSummary.cashDrops}\n`
      + `Cash Payouts,${shiftSummary.cashPayouts}\n`
      + `Expected Drawer,${shiftSummary.expectedDrawer}\n`
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "end_of_day_report.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (showShiftModal && !activeSession) {
    return (
      <div className="h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-800">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center">
              <Monitor className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{initialTerminal?.terminalName || 'Terminal'}</h2>
              <p className="text-gray-400 text-sm">Status: Opening Shift</p>
            </div>
          </div>
          
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Opening Float (Register Balance)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <input 
                  type="number" 
                  value={shiftAmount}
                  onChange={e => setShiftAmount(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-8 pr-4 text-white font-medium focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleOpenShift}
            disabled={isProcessing}
            className="w-full btn btn-primary py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
          >
            {isProcessing ? 'Processing...' : 'Open Shift'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-950 pos-grid">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* POS Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Monitor className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{initialTerminal?.terminalName || 'Main Register'}</p>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-gray-400 text-xs">Session Active</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-400 text-xs">
            {/* Drawer Actions */}
            <div className="flex bg-gray-800 rounded-lg overflow-hidden border border-gray-700 mr-2">
              <button disabled={!activeSession} onClick={handleOpenCashDrawer} className="px-3 py-1.5 hover:bg-gray-700 disabled:opacity-50 border-r border-gray-700" title="Open Drawer">
                <Monitor className="w-3.5 h-3.5 text-emerald-400" />
              </button>
              <button disabled={!activeSession} onClick={() => setDrawerAction('drop')} className="px-3 py-1.5 hover:bg-gray-700 disabled:opacity-50 border-r border-gray-700 flex items-center gap-1" title="Cash Drop">
                <ArrowDownCircle className="w-3.5 h-3.5 text-blue-400" /> Drop
              </button>
              <button disabled={!activeSession} onClick={() => setDrawerAction('payout')} className="px-3 py-1.5 hover:bg-gray-700 disabled:opacity-50 border-r border-gray-700 flex items-center gap-1" title="Cash Payout">
                <ArrowUpCircle className="w-3.5 h-3.5 text-amber-400" /> Payout
              </button>
              <button disabled={!activeSession} onClick={loadDrawerEvents} className="px-3 py-1.5 hover:bg-gray-700 disabled:opacity-50" title="Drawer Log">
                <LayoutList className="w-3.5 h-3.5 text-gray-300" />
              </button>
            </div>
            
            <button onClick={handlePrepareCloseShift} className="text-emerald-400 hover:text-emerald-300 underline font-medium mr-2 border-r border-gray-800 pr-4">Close Shift</button>
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>Online</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-mono">{time.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 bg-gray-900/50 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="pos-search"
              className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={() => setIsScanningCamera(true)}
            className="px-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-gray-300 flex items-center gap-2 text-sm transition"
            title="Scan barcode/QR code via camera or gun"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Scan</span>
          </button>
        </div>

        {/* Products */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-3">
            {visibleProducts.map(product => (
              <button
                key={product.id}
                id={`pos-product-${product.id}`}
                onClick={() => addToCart(product)}
                className="pos-tile text-left bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col items-center hover:border-emerald-500 transition-colors"
              >
                <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center mb-2">
                  <ShoppingCart className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-white text-xs font-medium line-clamp-2 text-center leading-tight">{product.title}</p>
                <p className="text-emerald-400 text-sm font-bold mt-1">{formatCurrency(Number(product.basePrice), baseCurrency)}</p>
              </button>
            ))}
            {visibleProducts.length === 0 && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
                <p className="text-gray-500">No products found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-80 flex flex-col bg-gray-900 border-l border-gray-800">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-gray-400" />
            <span className="text-white font-semibold text-sm">Cart</span>
            {cart.length > 0 && (
              <span className="w-5 h-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center">
                {cart.reduce((s, c) => s + c.qty, 0)}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-red-400 hover:text-red-300 transition-colors">Clear</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart className="w-10 h-10 text-gray-700 mb-2" />
              <p className="text-gray-500 text-sm">Cart is empty</p>
              <p className="text-gray-600 text-xs mt-1">Tap a product to add</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-gray-800 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white text-xs font-medium leading-tight flex-1">{item.title}</p>
                  <button onClick={() => setCart(prev => prev.filter(c => c.id !== item.id))} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors">
                      <Minus className="w-3 h-3 text-white" />
                    </button>
                    <span className="text-white text-sm font-bold w-6 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors">
                      <Plus className="w-3 h-3 text-white" />
                    </button>
                  </div>
                  <p className="text-emerald-400 font-bold text-sm">{formatCurrency(item.price * item.qty, baseCurrency)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-gray-800 p-4 space-y-3">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span>{formatCurrency(total, baseCurrency)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Tax (10%)</span>
              <span>{formatCurrency(tax, baseCurrency)}</span>
            </div>
            <div className="flex justify-between text-white font-bold text-base pt-1 border-t border-gray-700">
              <span>Total</span>
              <span>{formatCurrency(grandTotal, baseCurrency)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {([
              { key: 'card' as const, icon: CreditCard, label: 'Card' },
              { key: 'cash' as const, icon: Banknote, label: 'Cash' },
              { key: 'qr' as const, icon: QrCode, label: 'QR' },
            ]).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                id={`pos-payment-${key}`}
                onClick={() => setPaymentMethod(key)}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all text-xs font-medium',
                  paymentMethod === key
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <button
            id="pos-charge-btn"
            onClick={processPayment}
            disabled={isProcessing || cart.length === 0}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </div>
            ) : (
              <>Charge {formatCurrency(grandTotal, baseCurrency)}</>
            )}
          </button>
        </div>
      </div>

      {/* Drawer Action Modal */}
      {drawerAction && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4 capitalize">Cash {drawerAction}</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount</label>
                <input type="number" value={drawerAmount} onChange={e => setDrawerAmount(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Notes</label>
                <input type="text" value={drawerNotes} onChange={e => setDrawerNotes(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" placeholder="Optional notes" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDrawerAction(null)} className="btn btn-secondary flex-1 border-gray-700 text-gray-300">Cancel</button>
              <button onClick={handleDrawerAction} disabled={isProcessing} className="btn btn-primary flex-1 bg-emerald-600 hover:bg-emerald-700 border-0 text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Log Modal */}
      {showDrawerLog && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4">Cash Drawer Log</h3>
            <div className="max-h-96 overflow-y-auto mb-6">
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-gray-800">
                  <tr>
                    <th className="px-4 py-2">Time</th>
                    <th className="px-4 py-2">Event</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {drawerEvents.map(ev => (
                    <tr key={ev.id} className="border-b border-gray-800">
                      <td className="px-4 py-2 whitespace-nowrap">{new Date(ev.createdAt).toLocaleTimeString()}</td>
                      <td className="px-4 py-2 font-mono text-xs">{ev.eventType}</td>
                      <td className="px-4 py-2">{ev.amount ? formatCurrency(Number(ev.amount), baseCurrency) : '-'}</td>
                      <td className="px-4 py-2 max-w-[200px] truncate">{ev.notes || '-'}</td>
                    </tr>
                  ))}
                  {drawerEvents.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-500">No events found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <button onClick={() => setShowDrawerLog(false)} className="btn btn-secondary w-full border-gray-700 text-gray-300">Close</button>
          </div>
        </div>
      )}

      {/* End of Day Modal */}
      {showEndOfDay && shiftSummary && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">End of Day Report</h3>
              <button onClick={exportCsv} className="text-gray-400 hover:text-white" title="Export CSV"><Download className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-2 text-sm text-gray-300 mb-6">
              <div className="flex justify-between"><span>Total Orders:</span> <span className="font-semibold text-white">{shiftSummary.orderCount}</span></div>
              <div className="flex justify-between"><span>Total Revenue:</span> <span className="font-semibold text-white">{formatCurrency(shiftSummary.totalRevenue, baseCurrency)}</span></div>
              <div className="border-t border-gray-800 my-2 pt-2 flex justify-between"><span>Card Sales:</span> <span className="font-semibold text-white">{formatCurrency(shiftSummary.cardRevenue, baseCurrency)}</span></div>
              <div className="flex justify-between text-emerald-400"><span>Cash Sales:</span> <span>+{formatCurrency(shiftSummary.cashRevenue, baseCurrency)}</span></div>
              
              <div className="border-t border-gray-800 my-2 pt-2 flex justify-between"><span>Opening Float:</span> <span className="font-semibold text-white">{formatCurrency(shiftSummary.openingFloat, baseCurrency)}</span></div>
              <div className="flex justify-between text-blue-400"><span>Cash Drops:</span> <span>-{formatCurrency(shiftSummary.cashDrops, baseCurrency)}</span></div>
              <div className="flex justify-between text-amber-400"><span>Cash Payouts:</span> <span>-{formatCurrency(shiftSummary.cashPayouts, baseCurrency)}</span></div>
              
              <div className="border-t border-gray-800 my-2 pt-2 flex justify-between font-bold text-white bg-gray-800/50 p-2 rounded">
                <span>Expected Drawer:</span> 
                <span>{formatCurrency(shiftSummary.expectedDrawer, baseCurrency)}</span>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-800">
                <label className="block text-xs font-medium text-gray-400 mb-2">Counted Closing Balance</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input type="number" value={shiftAmount} onChange={e => setShiftAmount(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 pl-7 text-white" />
                </div>
                {parseFloat(shiftAmount || '0') !== shiftSummary.expectedDrawer && (
                  <p className="text-xs text-amber-500 mt-2">
                    Variance: {formatCurrency(parseFloat(shiftAmount || '0') - shiftSummary.expectedDrawer, baseCurrency)}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => setShowEndOfDay(false)} className="btn btn-secondary flex-1 border-gray-700 text-gray-300">Cancel</button>
              <button onClick={handleConfirmCloseShift} disabled={isProcessing} className="btn btn-primary flex-1 bg-red-600 hover:bg-red-700 border-0 text-white">Confirm Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptHtml && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 flex flex-col items-center">
            <div className="w-full max-h-[60vh] overflow-y-auto mb-6 border border-gray-200 p-2" dangerouslySetInnerHTML={{__html: receiptHtml}} />
            <div className="flex gap-3 w-full">
              <button onClick={() => setReceiptHtml(null)} className="btn btn-secondary flex-1 border-gray-300 text-gray-700">Close</button>
              <button onClick={() => {
                const w = window.open(); 
                if(w) { w.document.write(receiptHtml); w.print(); w.close(); }
              }} className="btn btn-primary flex-1 bg-emerald-600 border-0 hover:bg-emerald-700 text-white">Print</button>
            </div>
          </div>
        </div>
      )}

      {isScanningCamera && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-950">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400 animate-pulse" />
                Barcode / SKU Scanner
              </h3>
              <button 
                onClick={() => setIsScanningCamera(false)} 
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 flex flex-col items-center">
              {/* Webcam Viewport */}
              <div className="w-full h-48 bg-black rounded-xl border border-gray-800 flex flex-col items-center justify-center relative overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <div className="absolute inset-0 border-2 border-emerald-500/30 m-8 rounded-lg animate-pulse pointer-events-none" />
                <div className="absolute h-0.5 w-3/4 bg-emerald-500 top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 animate-[bounce_2s_infinite] pointer-events-none shadow-[0_0_8px_#10B981]" />
              </div>
              
              <div className="w-full text-center">
                <p className="text-xs text-gray-400">Position scanner gun or enter SKU below manually if needed</p>
              </div>

              <div className="w-full">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Manual SKU / Code Input</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type or scan SKU code..."
                    value={manualScanInput}
                    onChange={(e) => setManualScanInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const matched = initialCatalogItems.find(item => item.sku === manualScanInput);
                        if (matched) {
                          addToCart(matched);
                          toast.success(`Scanned: ${matched.title}`);
                          setManualScanInput('');
                          setIsScanningCamera(false);
                        } else {
                          toast.error(`No item found for SKU: ${manualScanInput}`);
                        }
                      }
                    }}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const matched = initialCatalogItems.find(item => item.sku === manualScanInput);
                      if (matched) {
                        addToCart(matched);
                        toast.success(`Scanned: ${matched.title}`);
                        setManualScanInput('');
                        setIsScanningCamera(false);
                      } else {
                        toast.error(`No item found for SKU: ${manualScanInput}`);
                      }
                    }}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-800 bg-gray-950 flex justify-end">
              <button 
                onClick={() => setIsScanningCamera(false)} 
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition text-sm font-medium"
              >
                Close Scanner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
