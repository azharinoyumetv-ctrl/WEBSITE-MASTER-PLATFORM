'use client'

import { useState } from 'react'
import { ShoppingCart, CheckCircle, Package, ArrowRight, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { createOrder } from '@/lib/actions/ecommerce'

export function CheckoutClient({ tenantId, items, checkoutNonce }: { tenantId: string, items: any[], checkoutNonce?: string }) {
  const [cart, setCart] = useState<{item: any, quantity: number}[]>([])
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(p => p.item.id === item.id)
      if (existing) {
        return prev.map(p => p.item.id === item.id ? { ...p, quantity: p.quantity + 1 } : p)
      }
      return [...prev, { item, quantity: 1 }]
    })
    toast.success('Added to cart')
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(p => p.item.id !== id))
  }

  const total = cart.reduce((sum, {item, quantity}) => sum + (Number(item.basePrice) * quantity), 0)

  const handleCheckout = async () => {
    if (!email) return toast.error('Please enter your email')
    if (cart.length === 0) return toast.error('Cart is empty')

    setIsProcessing(true)
    const res = await createOrder(tenantId, {
      email,
      items: cart.map(c => ({ id: c.item.id, quantity: c.quantity }))
    })
    setIsProcessing(false)
    
    if (res.success) {
      setStep(3) // Success
    } else {
      toast.error(res.error || 'Checkout failed')
    }
  }

  if (step === 3) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Order Confirmed!</h2>
        <p className="text-slate-500 mb-6">We have received your order and sent a receipt to {email}.</p>
        <button onClick={() => window.location.href = '/'} className="btn btn-primary">Return to Store</button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Products */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-xl font-semibold mb-4">Available Products</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.filter(i => i.isVisible).map(item => (
            <div key={item.id} className="card p-4 flex flex-col">
              <div className="w-full h-40 bg-slate-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {item.imageUrls?.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrls[0]} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <h4 className="font-semibold text-slate-900 line-clamp-1">{item.title}</h4>
              <p className="text-indigo-600 font-bold my-1">{formatCurrency(Number(item.basePrice))}</p>
              <div className="mt-auto pt-3">
                <button onClick={() => addToCart(item)} className="btn btn-secondary w-full">Add to Cart</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart */}
      <div className="lg:col-span-1">
        <div className="card p-6 sticky top-6">
          <h3 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5" />
            Your Cart
          </h3>
          
          {cart.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">Your cart is empty</p>
          ) : (
            <div className="space-y-4 mb-6">
              {cart.map(({item, quantity}) => (
                <div key={item.id} className="flex justify-between items-start text-sm">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-slate-500">Qty: {quantity} &times; {formatCurrency(Number(item.basePrice))}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCurrency(Number(item.basePrice) * quantity)}</span>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-4 mt-4 flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          {step === 1 ? (
            <button 
              onClick={() => setStep(2)} 
              disabled={cart.length === 0}
              className="btn btn-primary w-full"
            >
              Proceed to Checkout <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          ) : (
            <div className="space-y-4 animate-scale-in">
              <div className="border-t border-slate-100 pt-4">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="you@example.com" 
                  className="form-input" 
                />
              </div>
              <button 
                onClick={handleCheckout} 
                disabled={isProcessing}
                className="btn btn-primary w-full"
              >
                {isProcessing ? 'Processing...' : `Pay ${formatCurrency(total)}`}
              </button>
              <button onClick={() => setStep(1)} className="btn btn-secondary w-full">Back to Cart</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
