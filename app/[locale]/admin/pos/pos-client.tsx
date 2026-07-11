'use client'

import { useState, useEffect } from 'react'
import { Monitor, ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, Search, Wifi, WifiOff, Clock } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { processPosPayment, openSession, closeSession, generateReceipt } from '@/lib/actions/pos'

export function PosClient({ initialTerminal, initialCatalogItems, initialSession, tenantId, userId, baseCurrency = 'USD' }: { initialTerminal: any, initialCatalogItems: any[], initialSession: any, tenantId: string, userId: string, baseCurrency?: string }) {
  const [cart, setCart] = useState<Array<{id: string; title: string; price: number; qty: number}>>([])
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'qr'>('card')
  const [isProcessing, setIsProcessing] = useState(false)
  const [time, setTime] = useState(new Date())
  const [search, setSearch] = useState('')
  const [activeSession, setActiveSession] = useState(initialSession)
  const [shiftAmount, setShiftAmount] = useState('0')
  const [showShiftModal, setShowShiftModal] = useState(!initialSession)
  const [receiptHtml, setReceiptHtml] = useState<string | null>(null)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

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
      
      // Generate receipt
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

  const handleCloseShift = async () => {
    if(!activeSession) return
    setIsProcessing(true)
    const res = await closeSession(tenantId, activeSession.id, userId, parseFloat(shiftAmount) || 0)
    setIsProcessing(false)
    if (res.success) {
      setActiveSession(null)
      setShowShiftModal(true)
      setShiftAmount('0')
      toast.success('Shift closed successfully')
    } else toast.error(res.error)
  }

  if (showShiftModal) {
    return (
      <div className="h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-800">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center">
              <Monitor className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{initialTerminal?.terminalName || 'Terminal'}</h2>
              <p className="text-gray-400 text-sm">Status: {activeSession ? 'Closing Shift' : 'Opening Shift'}</p>
            </div>
          </div>
          
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {activeSession ? 'Closing Register Balance' : 'Opening Register Balance'}
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
            onClick={activeSession ? handleCloseShift : handleOpenShift}
            disabled={isProcessing}
            className="w-full btn btn-primary py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
          >
            {isProcessing ? 'Processing...' : activeSession ? 'Close Shift' : 'Open Shift'}
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
            <button onClick={() => { setShiftAmount('0'); setShowShiftModal(true); }} className="text-emerald-400 hover:text-emerald-300 underline font-medium">Close Shift</button>
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
        <div className="px-4 py-3 bg-gray-900/50">
          <div className="relative">
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
        {/* Cart header */}
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

        {/* Cart items */}
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

        {/* Totals & Payment */}
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

          {/* Payment method */}
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

      {/* Receipt Modal */}
      {receiptHtml && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 flex flex-col items-center">
            <div className="w-full max-h-[60vh] overflow-y-auto mb-6 border border-gray-200 p-2" dangerouslySetInnerHTML={{__html: receiptHtml}} />
            <div className="flex gap-3 w-full">
              <button onClick={() => setReceiptHtml(null)} className="btn btn-secondary flex-1">Close</button>
              <button onClick={() => {
                const w = window.open(); 
                if(w) { w.document.write(receiptHtml); w.print(); w.close(); }
              }} className="btn btn-primary flex-1 bg-emerald-600 border-0 hover:bg-emerald-700">Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
